// Unit tests of the critic runner (EV-14 to EV-20). Each test passes a plain stub function in
// place of the `claude` child process, as the compare agreement script's test does, so no model
// is asked (CS-21, CS-22). Each test works in its own temporary folder.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildClaudeArguments,
  type ClaudeRunner,
  CRITIC_PROMPT_TEMPLATE,
  ensureCrits,
  parseClaudeResult,
  readSavedCrits,
  skillCommit,
} from "./run-critic.ts";

const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const RUNNER_FILE = join(import.meta.dirname, "run-critic.ts");

/** A successful result in the shape `claude -p --output-format json` prints. */
function successStdout(crit: string): string {
  return JSON.stringify({
    type: "result",
    subtype: "success",
    is_error: false,
    result: crit,
    session_id: "session-1",
    num_turns: 3,
    usage: { input_tokens: 10, output_tokens: 20 },
    total_cost_usd: 0.5,
    modelUsage: { "claude-opus-test": {} },
  });
}

/** Records every call and answers --version and crit calls with fixed text. */
function recordingStub(stdout = successStdout("A crit.")) {
  const calls: { args: readonly string[]; cwd: string; images: string[] }[] =
    [];
  const runner: ClaudeRunner = async (args, _environment, cwd) => {
    calls.push({ args, cwd, images: readdirSync(cwd) });
    if (args[0] === "--version") {
      return { stdout: "9.9.9 (Claude Code)\n", stderr: "", exitCode: 0 };
    }
    return { stdout, stderr: "", exitCode: 0 };
  };
  const critCalls = () => calls.filter((call) => call.args[0] !== "--version");
  return { calls, critCalls, runner };
}

/** Makes a temporary folder with a runs folder and one image whose name carries an answer. */
function setUp() {
  const root = mkdtempSync(join(tmpdir(), "run-critic-test-"));
  const imagePath = join(root, "heading-indistinct.positive.png");
  writeFileSync(imagePath, "fake image bytes");
  const runsDirectory = join(root, "runs");
  return { root, imagePath, runsDirectory };
}

/** Returns the options for ensureCrits with a fixed commit and the given runner. */
function options(runsDirectory: string, runner: ClaudeRunner) {
  return {
    runsDirectory,
    skillDirectory: "/skill",
    skillCommit: COMMIT,
    runClaude: runner,
  };
}

describe("ensureCrits", () => {
  it("writes 1.md and 1.json with the prompt hash and the request on the first run", async () => {
    const { imagePath, runsDirectory } = setUp();
    const stub = recordingStub();
    const saved = await ensureCrits(
      { imagePaths: [imagePath] },
      options(runsDirectory, stub.runner),
    );
    expect(saved).toHaveLength(1);
    const first = saved[0];
    expect(first?.critPath.endsWith("/1.md")).toBe(true);
    expect(readFileSync(first?.critPath ?? "", "utf8")).toBe("A crit.");
    const metadata = JSON.parse(
      readFileSync(first?.metadataPath ?? "", "utf8"),
    );
    expect(metadata.prompt_sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(metadata.request.images[0].path).toBe(imagePath);
    expect(metadata.model_ids).toEqual(["claude-opus-test"]);
    expect(metadata.claude_version).toBe("9.9.9 (Claude Code)");
    // A one-image request with no note or focus is keyed by the image's SHA-256.
    expect(first?.critPath).toContain(
      join(runsDirectory, COMMIT, metadata.request.images[0].sha256),
    );
  });

  it("starts no child process and writes nothing on a second run of the same image and commit", async () => {
    const { imagePath, runsDirectory } = setUp();
    const first = recordingStub();
    const [saved] = await ensureCrits(
      { imagePaths: [imagePath] },
      options(runsDirectory, first.runner),
    );
    const critBefore = readFileSync(saved?.critPath ?? "");
    const metadataBefore = readFileSync(saved?.metadataPath ?? "");
    const second = recordingStub(successStdout("A different crit."));
    const again = await ensureCrits(
      { imagePaths: [imagePath] },
      options(runsDirectory, second.runner),
    );
    expect(second.calls).toHaveLength(0);
    expect(again).toHaveLength(1);
    expect(readFileSync(saved?.critPath ?? "")).toEqual(critBefore);
    expect(readFileSync(saved?.metadataPath ?? "")).toEqual(metadataBefore);
  });

  it("starts only the missing runs and leaves run 1 unchanged when runs is 3", async () => {
    const { imagePath, runsDirectory } = setUp();
    const first = recordingStub();
    const [saved] = await ensureCrits(
      { imagePaths: [imagePath] },
      options(runsDirectory, first.runner),
    );
    const critBefore = readFileSync(saved?.critPath ?? "");
    const more = recordingStub(successStdout("Another crit."));
    const all = await ensureCrits(
      { imagePaths: [imagePath] },
      options(runsDirectory, more.runner),
      3,
    );
    expect(more.critCalls()).toHaveLength(2);
    expect(all.map((crit) => crit.runNumber)).toEqual([1, 2, 3]);
    expect(readFileSync(saved?.critPath ?? "")).toEqual(critBefore);
  });

  it("writes the next run as 3 and leaves a stray 2.md with no 2.json untouched", async () => {
    const { imagePath, runsDirectory } = setUp();
    const first = recordingStub();
    const [saved] = await ensureCrits(
      { imagePaths: [imagePath] },
      options(runsDirectory, first.runner),
    );
    const requestDirectory = join(saved?.critPath ?? "", "..");
    const strayPath = join(requestDirectory, "2.md");
    writeFileSync(strayPath, "half-written run");
    const more = recordingStub(successStdout("Run three."));
    const all = await ensureCrits(
      { imagePaths: [imagePath] },
      options(runsDirectory, more.runner),
      2,
    );
    expect(all.map((crit) => crit.runNumber)).toEqual([1, 3]);
    expect(readFileSync(strayPath, "utf8")).toBe("half-written run");
    expect(readFileSync(join(requestDirectory, "3.md"), "utf8")).toBe(
      "Run three.",
    );
  });

  it("copies the image as image-1.png and keeps the original path out of the prompt", async () => {
    const { imagePath, runsDirectory } = setUp();
    const stub = recordingStub();
    await ensureCrits(
      { imagePaths: [imagePath] },
      options(runsDirectory, stub.runner),
    );
    const [critCall] = stub.critCalls();
    expect(critCall?.images).toContain("image-1.png");
    const prompt = critCall?.args.at(-1) ?? "";
    expect(prompt).toContain(join(critCall?.cwd ?? "", "image-1.png"));
    expect(prompt).not.toContain(imagePath);
    expect(prompt).not.toContain("positive");
    expect(prompt).toContain("What I know about the piece: nothing");
    expect(prompt).not.toContain("<Any focus");
  });

  it("writes no file when the child process fails or prints an error result", async () => {
    const { imagePath, runsDirectory } = setUp();
    const failing: ClaudeRunner = async (args) => {
      if (args[0] === "--version") {
        return { stdout: "9.9.9\n", stderr: "", exitCode: 0 };
      }
      return { stdout: "", stderr: "boom", exitCode: 1 };
    };
    await expect(
      ensureCrits({ imagePaths: [imagePath] }, options(runsDirectory, failing)),
    ).rejects.toThrow(/exited with code 1/);
    const errorResult = recordingStub(
      JSON.stringify({
        type: "result",
        subtype: "success",
        is_error: true,
        result: "x",
      }),
    );
    await expect(
      ensureCrits(
        { imagePaths: [imagePath] },
        options(runsDirectory, errorResult.runner),
      ),
    ).rejects.toThrow(/is_error/);
    expect(() => readdirSync(runsDirectory)).toThrow();
  });
});

describe("readSavedCrits", () => {
  it("returns the saved crits and cannot start a child process", async () => {
    const { imagePath, runsDirectory } = setUp();
    const stub = recordingStub();
    await ensureCrits(
      { imagePaths: [imagePath] },
      options(runsDirectory, stub.runner),
    );
    const key = createHash("sha256")
      .update(readFileSync(imagePath))
      .digest("hex");
    // readSavedCrits takes no runner, so it has no way to start a child process.
    const replayed = readSavedCrits(runsDirectory, COMMIT, key);
    expect(replayed.map((crit) => crit.crit)).toEqual(["A crit."]);
  });

  it("replays through the command line without starting a child process", async () => {
    const { imagePath, runsDirectory } = setUp();
    const stub = recordingStub();
    await ensureCrits(
      { imagePaths: [imagePath] },
      options(runsDirectory, stub.runner),
    );
    const { runCriticCommand } = await import("./run-critic.ts");
    const throwingRunner: ClaudeRunner = async () => {
      throw new Error("replay must not start a child process");
    };
    const output = await runCriticCommand(
      ["replay", "--skill-commit", COMMIT, imagePath],
      {
        runsDirectory,
        defaultSkillDirectory: "/no-skill",
        runClaude: throwingRunner,
      },
    );
    expect(output.exitCode).toBe(0);
    expect(output.text).toContain("A crit.");
    const missing = await runCriticCommand(
      ["replay", "--skill-commit", "f".repeat(40), imagePath],
      {
        runsDirectory,
        defaultSkillDirectory: "/no-skill",
        runClaude: throwingRunner,
      },
    );
    expect(missing.exitCode).toBe(1);
    expect(missing.text).toContain(imagePath);
  });
});

describe("buildClaudeArguments", () => {
  it("holds the planned flags, puts the prompt last, and never skips permissions", () => {
    const withoutKey = buildClaudeArguments("/skill", "the prompt", {});
    expect(withoutKey).toEqual([
      "-p",
      "--safe-mode",
      "--model",
      "opus",
      "--output-format",
      "json",
      "--no-session-persistence",
      "--tools",
      "Read,Bash",
      "--allowedTools",
      "Read",
      "Bash(sips *)",
      "Bash(mktemp *)",
      "--permission-prompts",
      "none",
      "--strict-mcp-config",
      "--add-dir",
      "/skill",
      "--max-budget-usd",
      "5",
      "the prompt",
    ]);
    const withKey = buildClaudeArguments("/skill", "the prompt", {
      ANTHROPIC_API_KEY: "present",
    });
    expect(withKey[1]).toBe("--bare");
    expect(withKey).not.toContain("--safe-mode");
    expect(withKey).not.toContain("--dangerously-skip-permissions");
    expect(withKey).not.toContain("--system-prompt");
  });
});

describe("parseClaudeResult", () => {
  it("returns the crit and metadata of a success result", () => {
    const parsed = parseClaudeResult(successStdout("The crit."));
    expect(parsed.crit).toBe("The crit.");
    expect(parsed.sessionId).toBe("session-1");
    expect(parsed.modelIds).toEqual(["claude-opus-test"]);
  });

  it("rejects bad JSON, is_error true, a non-success subtype, and an empty result", () => {
    expect(() => parseClaudeResult("not json")).toThrow(/not JSON/);
    expect(() =>
      parseClaudeResult(
        JSON.stringify({
          type: "result",
          subtype: "success",
          is_error: true,
          result: "x",
        }),
      ),
    ).toThrow(/is_error/);
    expect(() =>
      parseClaudeResult(
        JSON.stringify({
          type: "result",
          subtype: "error_max_budget_usd",
          is_error: false,
          result: "x",
        }),
      ),
    ).toThrow(/subtype/);
    expect(() =>
      parseClaudeResult(
        JSON.stringify({
          type: "result",
          subtype: "success",
          is_error: false,
          result: "  ",
        }),
      ),
    ).toThrow(/no crit text/);
  });
});

describe("skillCommit", () => {
  /** Runs git in a folder with a fixed identity, so the test needs no git configuration. */
  function git(directory: string, args: string[]): string {
    return execFileSync(
      "git",
      ["-c", "user.name=test", "-c", "user.email=test@example.com", ...args],
      { cwd: directory, encoding: "utf8" },
    ).trim();
  }

  it("returns the last commit that touched the folder and refuses an untracked file", () => {
    const root = mkdtempSync(join(tmpdir(), "run-critic-git-"));
    git(root, ["init", "-q"]);
    const skillDirectory = join(root, "skill");
    mkdirSync(skillDirectory);
    writeFileSync(join(skillDirectory, "SKILL.md"), "skill");
    git(root, ["add", "."]);
    git(root, ["commit", "-q", "-m", "skill"]);
    const skillHead = git(root, ["rev-parse", "HEAD"]);
    writeFileSync(join(root, "other.txt"), "outside the skill");
    git(root, ["add", "."]);
    git(root, ["commit", "-q", "-m", "other"]);
    expect(skillCommit(skillDirectory)).toBe(skillHead);
    writeFileSync(join(skillDirectory, "new.md"), "untracked");
    expect(() => skillCommit(skillDirectory)).toThrow(/untracked/);
    expect(skillCommit(skillDirectory, true)).toBe(skillHead);
  });

  it("refuses a folder outside any git repository", () => {
    const outside = mkdtempSync(join(tmpdir(), "run-critic-nogit-"));
    expect(() => skillCommit(outside)).toThrow(/not in a git repository/);
  });
});

describe("the command line", () => {
  it("exits 0 on --help and names the run and replay modes", () => {
    const help = execFileSync("node", [RUNNER_FILE, "--help"], {
      encoding: "utf8",
    });
    expect(help).toContain("run ");
    expect(help).toContain("replay ");
  });

  it("keeps the prompt template in one constant with the skill's placeholders", () => {
    expect(CRITIC_PROMPT_TEMPLATE).toContain("<skill folder>/agents/critic.md");
  });
});
