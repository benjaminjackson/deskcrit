// Unit tests of the shared judge (EV-16). Each test passes a plain stub in place of the `claude`
// child process, so no model is asked (CS-21, CS-22). Each test works in its own temporary folder,
// which afterEach removes.

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ensureJudgeAnswer,
  JUDGE_MAX_BUDGET_USD,
  JUDGE_MODEL,
  type JudgeQuestion,
  judgeAnswerPath,
  judgeArguments,
  judgeKey,
  readJudgeAnswer,
} from "./judge.ts";
import type { ClaudeRunner } from "./run-critic.ts";

const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const CLAUDE_VERSION = "2.0.0 (Claude Code)";

const QUESTION: JudgeQuestion = {
  name: "test-question",
  system: "Answer true or false.",
  prompt: "Critique A says the page is fine. Is it about color?",
  schema: {
    type: "object",
    properties: { about_color: { type: "boolean" } },
    required: ["about_color"],
    additionalProperties: false,
  },
  crits: [{ key: "abc", run: 1 }],
};

/** The temp folders this test file made; afterEach removes them. */
const temporaryFolders: string[] = [];

afterEach(() => {
  for (const folder of temporaryFolders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

/** Checks the test answer shape and returns it; throws on any other shape. */
function parseAnswer(value: unknown): { about_color: boolean } {
  if (
    typeof value !== "object" ||
    value === null ||
    typeof (value as Record<string, unknown>).about_color !== "boolean"
  ) {
    throw new Error("wrong answer shape");
  }
  return { about_color: (value as { about_color: boolean }).about_color };
}

/** Returns stdout in the shape `claude -p --output-format json --json-schema` prints. */
function judgeStdout(structuredOutput: unknown, isError = false): string {
  return JSON.stringify({
    type: "result",
    subtype: "success",
    is_error: isError,
    result: "",
    structured_output: structuredOutput,
    total_cost_usd: 0.01,
    modelUsage: { [JUDGE_MODEL]: {} },
    permission_denials: [],
  });
}

/**
 * Returns a stub runner that records each call, answers --version with a fixed line and the given
 * version exit code, and answers the judge call with the given stdout and exit code.
 */
function recordingStub(stdout: string, exitCode = 0, versionExitCode = 0) {
  const calls: { args: readonly string[]; cwd: string }[] = [];
  const runner: ClaudeRunner = async (args, _environment, cwd) => {
    calls.push({ args, cwd });
    if (args[0] === "--version") {
      return { stdout: CLAUDE_VERSION, stderr: "", exitCode: versionExitCode };
    }
    return { stdout, stderr: "", exitCode };
  };
  return { calls, runner };
}

/** Returns the calls that were judge calls, not --version calls. */
function judgeCalls(calls: readonly { args: readonly string[] }[]) {
  return calls.filter((call) => call.args[0] !== "--version");
}

/** Makes a new empty runs folder for one test. */
function newRunsDirectory(): string {
  const folder = mkdtempSync(join(tmpdir(), "crit-judge-test-"));
  temporaryFolders.push(folder);
  return folder;
}

/** Collects every string in a JSON value. */
function collectStrings(value: unknown, into: string[]): string[] {
  if (typeof value === "string") {
    into.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) {
      collectStrings(item, into);
    }
  } else if (typeof value === "object" && value !== null) {
    for (const item of Object.values(value)) {
      collectStrings(item, into);
    }
  }
  return into;
}

describe("judgeArguments", () => {
  it("pins the model, caps the budget, sets the schema, gives no tools, and puts the prompt last", () => {
    const args = judgeArguments(QUESTION);
    expect(args[0]).toBe("-p");
    expect(args).toContain("--safe-mode");
    expect(args[args.indexOf("--model") + 1]).toBe("claude-opus-5-5");
    expect(args[args.indexOf("--permission-mode") + 1]).toBe("dontAsk");
    expect(args[args.indexOf("--tools") + 1]).toBe("");
    expect(args[args.indexOf("--max-budget-usd") + 1]).toBe(
      JUDGE_MAX_BUDGET_USD,
    );
    expect(JSON.parse(args[args.indexOf("--json-schema") + 1] ?? "")).toEqual(
      QUESTION.schema,
    );
    expect(args[args.indexOf("--system-prompt") + 1]).toBe(QUESTION.system);
    expect(args.at(-1)).toBe(QUESTION.prompt);
    expect(args.at(-3)).toBe("--system-prompt");
    expect(args).not.toContain("--dangerously-skip-permissions");
  });
});

describe("judgeKey", () => {
  it("changes when the prompt, crit references, model, system text, or schema change", () => {
    const baseKey = judgeKey(QUESTION);
    expect(judgeKey({ ...QUESTION })).toBe(baseKey);
    expect(judgeKey({ ...QUESTION, prompt: `${QUESTION.prompt} ` })).not.toBe(
      baseKey,
    );
    expect(judgeKey({ ...QUESTION, crits: [{ key: "abc", run: 2 }] })).not.toBe(
      baseKey,
    );
    expect(judgeKey(QUESTION, "claude-other-model")).not.toBe(baseKey);
    expect(judgeKey({ ...QUESTION, system: `${QUESTION.system} ` })).not.toBe(
      baseKey,
    );
    expect(
      judgeKey({ ...QUESTION, schema: { ...QUESTION.schema, title: "x" } }),
    ).not.toBe(baseKey);
  });
});

describe("ensureJudgeAnswer and readJudgeAnswer", () => {
  it("returns undefined and calls nothing when no answer is saved", () => {
    const runsDirectory = newRunsDirectory();
    expect(
      readJudgeAnswer(QUESTION, parseAnswer, runsDirectory, COMMIT),
    ).toBeUndefined();
  });

  it("saves the answer once, and a second request makes no call and leaves the file unchanged", async () => {
    const runsDirectory = newRunsDirectory();
    // On macOS /var links to /private/var, so tools print the temp folder in either form.
    const temporaryFolder = tmpdir();
    const temporaryForms = [
      temporaryFolder,
      temporaryFolder.replace(/^\/private\/var\//, "/var/"),
      temporaryFolder.replace(/^\/var\//, "/private/var/"),
    ];
    const result = JSON.parse(judgeStdout({ about_color: true }));
    result.permission_denials = [
      {
        tool_name: "Read",
        tool_input: { file_path: `${temporaryForms[1]}/crit-judge-x/a.txt` },
      },
      {
        tool_name: "Read",
        tool_input: { file_path: `${homedir()}/github/crit/package.json` },
      },
    ];
    const stub = recordingStub(JSON.stringify(result));
    const options = {
      runsDirectory,
      skillCommit: COMMIT,
      runClaude: stub.runner,
    };
    const first = await ensureJudgeAnswer(QUESTION, parseAnswer, options);
    expect(first).toEqual({ about_color: true });
    expect(stub.calls).toHaveLength(2);
    expect(stub.calls[0]?.args).toEqual(["--version"]);
    expect(judgeCalls(stub.calls)).toHaveLength(1);
    const workDirectory = stub.calls[1]?.cwd ?? "";
    expect(existsSync(workDirectory)).toBe(false);

    const answerPath = judgeAnswerPath(
      runsDirectory,
      COMMIT,
      judgeKey(QUESTION),
    );
    const bytesBefore = readFileSync(answerPath);
    const second = await ensureJudgeAnswer(QUESTION, parseAnswer, options);
    expect(second).toEqual({ about_color: true });
    expect(stub.calls).toHaveLength(2);
    expect(readFileSync(answerPath).equals(bytesBefore)).toBe(true);
    expect(
      readJudgeAnswer(QUESTION, parseAnswer, runsDirectory, COMMIT),
    ).toEqual({ about_color: true });

    const saved: unknown = JSON.parse(bytesBefore.toString("utf8"));
    expect(saved).toMatchObject({
      model_requested: JUDGE_MODEL,
      model_ids: [JUDGE_MODEL],
      claude_version: CLAUDE_VERSION,
      name: QUESTION.name,
      answer: { about_color: true },
    });
    const strings = collectStrings(saved, []);
    expect(strings.filter((text) => text.startsWith("/"))).toEqual([]);
    const leaks = strings.filter(
      (text) =>
        temporaryForms.some((form) => text.includes(form)) ||
        text.includes(homedir()),
    );
    expect(leaks).toEqual([]);
    expect(strings).toContain("<home>/github/crit/package.json");
  });

  it("returns the saved answer and leaves the file unchanged when another process saved it during the call", async () => {
    const runsDirectory = newRunsDirectory();
    const answerPath = judgeAnswerPath(
      runsDirectory,
      COMMIT,
      judgeKey(QUESTION),
    );
    const savedByOther = `${JSON.stringify({ answer: { about_color: false } })}\n`;
    const runner: ClaudeRunner = async (args) => {
      if (args[0] === "--version") {
        return { stdout: CLAUDE_VERSION, stderr: "", exitCode: 0 };
      }
      // Another process saves its answer while this call runs, so this call's write finds the file.
      mkdirSync(join(runsDirectory, COMMIT, "judge"), { recursive: true });
      writeFileSync(answerPath, savedByOther);
      return {
        stdout: judgeStdout({ about_color: true }),
        stderr: "",
        exitCode: 0,
      };
    };
    const answer = await ensureJudgeAnswer(QUESTION, parseAnswer, {
      runsDirectory,
      skillCommit: COMMIT,
      runClaude: runner,
    });
    expect(answer).toEqual({ about_color: false });
    expect(readFileSync(answerPath, "utf8")).toBe(savedByOther);
  });

  it("throws on a wrong-shaped answer and saves nothing", async () => {
    const runsDirectory = newRunsDirectory();
    const stub = recordingStub(judgeStdout({ about_color: "yes" }));
    await expect(
      ensureJudgeAnswer(QUESTION, parseAnswer, {
        runsDirectory,
        skillCommit: COMMIT,
        runClaude: stub.runner,
      }),
    ).rejects.toThrow("wrong answer shape");
    expect(readdirSync(runsDirectory)).toEqual([]);
  });

  it("throws before the judge call when claude --version fails, and saves nothing", async () => {
    const runsDirectory = newRunsDirectory();
    const stub = recordingStub(judgeStdout({ about_color: true }), 0, 1);
    await expect(
      ensureJudgeAnswer(QUESTION, parseAnswer, {
        runsDirectory,
        skillCommit: COMMIT,
        runClaude: stub.runner,
      }),
    ).rejects.toThrow("claude --version exited with code 1");
    expect(judgeCalls(stub.calls)).toHaveLength(0);
    expect(readdirSync(runsDirectory)).toEqual([]);
  });

  it("throws on a non-zero exit and saves nothing", async () => {
    const runsDirectory = newRunsDirectory();
    const stub = recordingStub(judgeStdout({ about_color: true }), 1);
    await expect(
      ensureJudgeAnswer(QUESTION, parseAnswer, {
        runsDirectory,
        skillCommit: COMMIT,
        runClaude: stub.runner,
      }),
    ).rejects.toThrow("exited with code 1");
    expect(readdirSync(runsDirectory)).toEqual([]);
  });

  it("throws when is_error is true and saves nothing", async () => {
    const runsDirectory = newRunsDirectory();
    const stub = recordingStub(judgeStdout({ about_color: true }, true));
    await expect(
      ensureJudgeAnswer(QUESTION, parseAnswer, {
        runsDirectory,
        skillCommit: COMMIT,
        runClaude: stub.runner,
      }),
    ).rejects.toThrow("is_error");
    expect(readdirSync(runsDirectory)).toEqual([]);
  });
});
