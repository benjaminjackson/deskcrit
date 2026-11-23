// Unit tests of the shared judge (EV-16). Each test passes a plain stub in place of the `claude`
// child process, so no model is asked (CS-21, CS-22). Each test works in its own temporary folder.

import { existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ensureJudgeAnswer,
  JUDGE_MODEL,
  type JudgeQuestion,
  judgeAnswerPath,
  judgeArguments,
  judgeKey,
  readJudgeAnswer,
} from "./judge.ts";
import type { ClaudeRunner } from "./run-critic.ts";

const COMMIT = "0123456789abcdef0123456789abcdef01234567";

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

/** Returns a stub runner that records each call and prints the given stdout and exit code. */
function recordingStub(stdout: string, exitCode = 0) {
  const calls: { args: readonly string[]; cwd: string }[] = [];
  const runner: ClaudeRunner = async (args, _environment, cwd) => {
    calls.push({ args, cwd });
    return { stdout, stderr: "", exitCode };
  };
  return { calls, runner };
}

/** Makes a new empty runs folder for one test. */
function newRunsDirectory(): string {
  return mkdtempSync(join(tmpdir(), "crit-judge-test-"));
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
  it("pins the model, sets the schema, gives no tools, and puts the prompt last", () => {
    const args = judgeArguments(QUESTION);
    expect(args[0]).toBe("-p");
    expect(args).toContain("--safe-mode");
    expect(args[args.indexOf("--model") + 1]).toBe("claude-opus-5-5");
    expect(args[args.indexOf("--permission-mode") + 1]).toBe("dontAsk");
    expect(args[args.indexOf("--tools") + 1]).toBe("");
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
  it("changes when the prompt or the crit references change", () => {
    const baseKey = judgeKey(QUESTION);
    expect(judgeKey({ ...QUESTION })).toBe(baseKey);
    expect(judgeKey({ ...QUESTION, prompt: `${QUESTION.prompt} ` })).not.toBe(
      baseKey,
    );
    expect(judgeKey({ ...QUESTION, crits: [{ key: "abc", run: 2 }] })).not.toBe(
      baseKey,
    );
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
    const stub = recordingStub(judgeStdout({ about_color: true }));
    const options = {
      runsDirectory,
      skillCommit: COMMIT,
      runClaude: stub.runner,
    };
    const first = await ensureJudgeAnswer(QUESTION, parseAnswer, options);
    expect(first).toEqual({ about_color: true });
    expect(stub.calls).toHaveLength(1);
    const workDirectory = stub.calls[0]?.cwd ?? "";
    expect(existsSync(workDirectory)).toBe(false);

    const answerPath = judgeAnswerPath(
      runsDirectory,
      COMMIT,
      judgeKey(QUESTION),
    );
    const bytesBefore = readFileSync(answerPath);
    const second = await ensureJudgeAnswer(QUESTION, parseAnswer, options);
    expect(second).toEqual({ about_color: true });
    expect(stub.calls).toHaveLength(1);
    expect(readFileSync(answerPath).equals(bytesBefore)).toBe(true);
    expect(
      readJudgeAnswer(QUESTION, parseAnswer, runsDirectory, COMMIT),
    ).toEqual({ about_color: true });

    const saved: unknown = JSON.parse(bytesBefore.toString("utf8"));
    expect(saved).toMatchObject({
      model_requested: JUDGE_MODEL,
      model_ids: [JUDGE_MODEL],
      name: QUESTION.name,
      answer: { about_color: true },
      permission_denials: [],
    });
    for (const text of collectStrings(saved, [])) {
      expect(text.startsWith("/")).toBe(false);
    }
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
