// Unit tests of the critic runner (EV-14 to EV-20). Each test passes a plain stub function in
// place of the `claude` child process, as the compare agreement script's test does, so no model
// is asked (CS-21, CS-22). Each test works in its own temporary folder.

import { execFileSync } from "node:child_process";
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
  CRITIC_MODEL,
  CRITIC_PROMPT_TEMPLATE,
  ensureCrits,
  parseClaudeResult,
  skillCommit,
} from "./run-critic.ts";

const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const RUNNER_FILE = join(import.meta.dirname, "run-critic.ts");
const REPOSITORY_ROOT = join(import.meta.dirname, "..", "..");

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
    expect(metadata.model_requested).toBe(CRITIC_MODEL);
    expect(metadata.permission_mode).toBe("dontAsk");
    expect(["--bare", "--safe-mode"]).toContain(metadata.isolation_flag);
    // An image outside the repository is saved by its base name, and the skill by its last two
    // segments, so no committed file holds the user's home folder.
    expect(metadata.request.images[0].path).toBe(
      "heading-indistinct.positive.png",
    );
    expect(metadata.skill_directory).toBe("skill");
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

  it("does not count a saved run made another way, and leaves its files untouched", async () => {
    const { imagePath, runsDirectory } = setUp();
    const first = recordingStub();
    const [saved] = await ensureCrits(
      { imagePaths: [imagePath] },
      options(runsDirectory, first.runner),
    );
    const metadataPath = saved?.metadataPath ?? "";
    // Make run 1 look like a run made with the alias "opus", as the first committed run was.
    const oldMetadata = JSON.parse(readFileSync(metadataPath, "utf8"));
    oldMetadata.model_requested = "opus";
    writeFileSync(metadataPath, JSON.stringify(oldMetadata));
    const metadataBefore = readFileSync(metadataPath);
    const second = recordingStub(successStdout("New crit."));
    const current = await ensureCrits(
      { imagePaths: [imagePath] },
      options(runsDirectory, second.runner),
    );
    expect(second.critCalls()).toHaveLength(1);
    expect(current.map((crit) => crit.runNumber)).toEqual([2]);
    expect(readFileSync(metadataPath)).toEqual(metadataBefore);
  });

  it("stops before any run when claude --version fails", async () => {
    const { imagePath, runsDirectory } = setUp();
    let critCalls = 0;
    const brokenVersion: ClaudeRunner = async (args) => {
      if (args[0] === "--version") {
        return { stdout: "", stderr: "not found", exitCode: 127 };
      }
      critCalls += 1;
      return { stdout: successStdout("x"), stderr: "", exitCode: 0 };
    };
    await expect(
      ensureCrits(
        { imagePaths: [imagePath] },
        options(runsDirectory, brokenVersion),
      ),
    ).rejects.toThrow(/--version exited with code 127/);
    expect(critCalls).toBe(0);
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

describe("saved metadata", () => {
  /** Returns every string inside a parsed JSON value. */
  function collectStrings(value: unknown): string[] {
    if (typeof value === "string") {
      return [value];
    }
    if (typeof value === "object" && value !== null) {
      return Object.values(value).flatMap(collectStrings);
    }
    return [];
  }

  it("holds no absolute path, for an image inside or outside the repository", async () => {
    const { root, imagePath, runsDirectory } = setUp();
    const stub = recordingStub();
    const inside = join(import.meta.dirname, "..", "wobble", "slice.png");
    const savedRuns = [
      ...(await ensureCrits(
        { imagePaths: [imagePath] },
        {
          ...options(runsDirectory, stub.runner),
          skillDirectory: join(root, "skills", "design-critic"),
        },
      )),
      ...(await ensureCrits(
        { imagePaths: [inside], note: "a chart page" },
        options(runsDirectory, stub.runner),
      )),
    ];
    const strings = savedRuns.flatMap((saved) =>
      collectStrings(JSON.parse(readFileSync(saved.metadataPath, "utf8"))),
    );
    expect(strings.filter((text) => text.startsWith("/"))).toEqual([]);
    expect(strings).toContain("evals/wobble/slice.png");
    expect(strings).toContain("skills/design-critic");
  });
});

describe("readSavedCrits", () => {
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

  it("replays a run made with a note when --note names the same note", async () => {
    const { imagePath, runsDirectory } = setUp();
    const stub = recordingStub(successStdout("A noted crit."));
    await ensureCrits(
      { imagePaths: [imagePath], note: "a landing page" },
      options(runsDirectory, stub.runner),
    );
    const { runCriticCommand } = await import("./run-critic.ts");
    const throwingRunner: ClaudeRunner = async () => {
      throw new Error("replay must not start a child process");
    };
    const replayOptions = {
      runsDirectory,
      defaultSkillDirectory: "/no-skill",
      runClaude: throwingRunner,
    };
    const withNote = await runCriticCommand(
      [
        "replay",
        "--skill-commit",
        COMMIT,
        "--note",
        "a landing page",
        imagePath,
      ],
      replayOptions,
    );
    expect(withNote.exitCode).toBe(0);
    expect(withNote.text).toContain("A noted crit.");
    const withoutNote = await runCriticCommand(
      ["replay", "--skill-commit", COMMIT, imagePath],
      replayOptions,
    );
    expect(withoutNote.exitCode).toBe(1);
  });
});

describe("buildClaudeArguments", () => {
  it("holds the planned flags, puts the prompt last, and never skips permissions", () => {
    const withoutKey = buildClaudeArguments("/skill", "the prompt", {});
    expect(withoutKey).toEqual([
      "-p",
      "--safe-mode",
      "--model",
      "claude-opus-5-5",
      "--permission-mode",
      "dontAsk",
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
    expect(help).toContain("[--note TEXT] IMAGE");
  });

  it("keeps the prompt template equal to the prompt block in step 2 of the skill's SKILL.md", () => {
    const skillText = readFileSync(
      join(REPOSITORY_ROOT, "plugin", "skills", "design-critic", "SKILL.md"),
      "utf8",
    );
    const stepTwo = skillText.slice(skillText.indexOf("\n2. "));
    const blockStart = stepTwo.indexOf("   ```\n") + "   ```\n".length;
    const blockEnd = stepTwo.indexOf("\n   ```", blockStart);
    // The block is indented three spaces under the list item; remove that indent from each line.
    const block = stepTwo
      .slice(blockStart, blockEnd)
      .split("\n")
      .map((line) => line.replace(/^ {3}/, ""))
      .join("\n");
    expect(block).toBe(CRITIC_PROMPT_TEMPLATE);
  });
});
