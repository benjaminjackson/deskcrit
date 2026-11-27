// Unit tests of the critic runner (EV-14 to EV-20). Each test passes a plain stub function in
// place of the `claude` child process, as the compare agreement script's test does, so no model
// is asked (CS-21, CS-22). Each test works in its own temporary folder.

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  BRIEF_LABELS,
  buildClaudeArguments,
  buildPrompt,
  type ClaudeRunner,
  CRITIC_MODEL,
  CRITIC_PROMPT_TEMPLATE,
  currentRunIdentity,
  ensureCrits,
  FACTS_PROMPT_LINE,
  parseBriefText,
  parseClaudeResult,
  readSavedCrits,
  requestKey,
  skillCommit,
} from "./run-critic.ts";

const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const RUNNER_FILE = join(import.meta.dirname, "run-critic.ts");
const REPOSITORY_ROOT = join(import.meta.dirname, "..", "..");

/** Runs git in a folder with a fixed identity, so the test needs no git configuration. */
function git(directory: string, args: string[]): string {
  return execFileSync(
    "git",
    ["-c", "user.name=test", "-c", "user.email=test@example.com", ...args],
    { cwd: directory, encoding: "utf8" },
  ).trim();
}

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
    expect(metadata.isolation_flag).toBe("--safe-mode");
    expect(JSON.parse(metadata.settings)).toEqual({
      permissions: { blockReadsOutsideWorkingDirectories: true },
    });
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

  it("holds no absolute path, for an image inside or outside the repository and in permission_denials", async () => {
    const { root, imagePath, runsDirectory } = setUp();
    // On macOS /var links to /private/var, so tools print the temp folder in either form.
    const temporaryFolder = tmpdir();
    const temporaryForms = [
      temporaryFolder,
      temporaryFolder.replace(/^\/private\/var\//, "/var/"),
      temporaryFolder.replace(/^\/var\//, "/private/var/"),
    ];
    const result = JSON.parse(successStdout("A crit."));
    result.permission_denials = [
      {
        tool_name: "Bash",
        tool_input: {
          command: `cd ${temporaryForms[1]}/crit-critic-x; node /skill/scripts/crop.mjs image-1.png`,
        },
      },
      {
        tool_name: "Read",
        tool_input: { file_path: `${temporaryForms[2]}/tmp.a/1.png` },
      },
      {
        tool_name: "Read",
        tool_input: { file_path: `${homedir()}/github/crit/package.json` },
      },
    ];
    const stub = recordingStub(JSON.stringify(result));
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
    // A temp folder path leaks when it is followed by a slash or ends the text. A plain
    // includes() is wrong on Linux, where the temp folder is /tmp and the correct result
    // "<temp>/tmp.a/1.png" holds "/tmp" as the start of a file name (crit-1y1).
    const leaks = strings.filter(
      (text) =>
        temporaryForms.some(
          (form) => text.includes(`${form}/`) || text.endsWith(form),
        ) || text.includes(homedir()),
    );
    expect(leaks).toEqual([]);
    expect(strings).toContain("<home>/github/crit/package.json");
    expect(strings).toContain("<temp>/tmp.a/1.png");
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

describe("--runs-dir", () => {
  it("makes run save into, and replay read from, the named folder instead of the default", async () => {
    const { root, imagePath, runsDirectory } = setUp();
    const skillDirectory = join(root, "skill");
    mkdirSync(join(skillDirectory, "agents"), { recursive: true });
    writeFileSync(join(skillDirectory, "SKILL.md"), "skill");
    writeFileSync(join(skillDirectory, "agents", "critic.md"), "critic");
    git(skillDirectory, ["init", "-q"]);
    git(skillDirectory, ["add", "."]);
    git(skillDirectory, ["commit", "-q", "-m", "skill"]);
    const commit = git(skillDirectory, ["rev-parse", "HEAD"]);
    const privateRunsDirectory = join(root, "private-runs");
    const stub = recordingStub(successStdout("A private crit."));
    const { runCriticCommand } = await import("./run-critic.ts");
    const commandOptions = {
      runsDirectory,
      defaultSkillDirectory: "/no-skill",
      runClaude: stub.runner,
    };
    const run = await runCriticCommand(
      [
        "run",
        "--skill",
        skillDirectory,
        "--runs-dir",
        privateRunsDirectory,
        imagePath,
      ],
      commandOptions,
    );
    expect(run.exitCode).toBe(0);
    expect(readdirSync(privateRunsDirectory)).toEqual([commit]);
    expect(() => readdirSync(runsDirectory)).toThrow();
    const replay = await runCriticCommand(
      [
        "replay",
        "--skill-commit",
        commit,
        "--runs-dir",
        privateRunsDirectory,
        imagePath,
      ],
      commandOptions,
    );
    expect(replay.exitCode).toBe(0);
    expect(replay.text).toContain("A private crit.");
    const defaultReplay = await runCriticCommand(
      ["replay", "--skill-commit", commit, imagePath],
      commandOptions,
    );
    expect(defaultReplay.exitCode).toBe(1);
  });
});

describe("permission denials", () => {
  it("saves the refused calls in the metadata and prints one warning line per call", async () => {
    const { root, imagePath, runsDirectory } = setUp();
    // The run command needs a committed skill folder with SKILL.md and agents/critic.md.
    const skillDirectory = join(root, "skill");
    mkdirSync(join(skillDirectory, "agents"), { recursive: true });
    writeFileSync(join(skillDirectory, "SKILL.md"), "skill");
    writeFileSync(join(skillDirectory, "agents", "critic.md"), "critic");
    git(skillDirectory, ["init", "-q"]);
    git(skillDirectory, ["add", "."]);
    git(skillDirectory, ["commit", "-q", "-m", "skill"]);
    const denial = {
      tool_name: "Read",
      tool_use_id: "toolu_1",
      tool_input: { file_path: "/elsewhere/1.png" },
    };
    const result = JSON.parse(successStdout("A hobbled crit."));
    result.permission_denials = [denial];
    const stub = recordingStub(JSON.stringify(result));
    const { runCriticCommand } = await import("./run-critic.ts");
    const output = await runCriticCommand(
      ["run", "--skill", skillDirectory, imagePath],
      {
        runsDirectory,
        defaultSkillDirectory: "/no-skill",
        runClaude: stub.runner,
      },
    );
    expect(output.exitCode).toBe(0);
    const warnings = output.text
      .split("\n")
      .filter((line) => line.startsWith("warning:"));
    expect(warnings).toEqual([
      'warning: run 1 was refused a Read call: {"file_path":"/elsewhere/1.png"}',
    ]);
    const metadataPath =
      output.text.split("\n")[0]?.split(": ")[1]?.replace(/\.md$/, ".json") ??
      "";
    const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
    expect(metadata.permission_denials).toEqual([denial]);
  });
});

describe("buildClaudeArguments", () => {
  it("holds the planned flags, puts the prompt last, and never skips permissions", () => {
    const args = buildClaudeArguments("/skill", "the prompt");
    expect(args).toEqual([
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
      "Bash(node /skill/scripts/crop.mjs *)",
      "Bash(node /skill/scripts/entries.mjs *)",
      "--permission-prompts",
      "none",
      "--strict-mcp-config",
      "--settings",
      '{"permissions":{"blockReadsOutsideWorkingDirectories":true}}',
      "--add-dir",
      "/skill",
      tmpdir(),
      "--max-budget-usd",
      "5",
      "the prompt",
    ]);
    expect(args).not.toContain("--dangerously-skip-permissions");
    expect(args).not.toContain("--system-prompt");
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
    expect(help).toContain("[--note TEXT] [--facts FILE] IMAGE");
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

describe("a measured facts file", () => {
  it("copies it as facts.json, names that copy on its own line after Image(s), and keys and hashes the run apart", async () => {
    const { root, imagePath, runsDirectory } = setUp();
    const factsPath = join(root, "heading-indistinct.positive.facts.json");
    writeFileSync(factsPath, '{"version":1}\n');
    const stub = recordingStub();
    const withFacts = await ensureCrits(
      { imagePaths: [imagePath], factsPath },
      options(runsDirectory, stub.runner),
    );
    const [critCall] = stub.critCalls();
    expect(critCall?.images).toContain("facts.json");
    const prompt = critCall?.args.at(-1) ?? "";
    expect(prompt).toContain(
      `${join(critCall?.cwd ?? "", "image-1.png")}\nMeasured facts file: ${join(critCall?.cwd ?? "", "facts.json")}\n`,
    );
    expect(prompt).not.toContain(factsPath);
    expect(prompt).not.toContain("positive");
    const metadata = withFacts[0]?.metadata ?? {};
    const request = metadata.request as {
      images: { sha256: string }[];
      facts: { sha256: string; path: string };
    };
    expect(request.facts.path).toBe("heading-indistinct.positive.facts.json");
    expect(metadata.prompt_sha256).toBe(currentRunIdentity(true).prompt_sha256);
    expect(metadata.prompt_sha256).not.toBe(currentRunIdentity().prompt_sha256);
    const imageSha256 = request.images[0]?.sha256 ?? "";
    // The key is not the bare image hash, so the run never lands in the folder of a run without facts.
    expect(withFacts[0]?.critPath).toContain(
      join(
        runsDirectory,
        COMMIT,
        requestKey([imageSha256], undefined, undefined, request.facts.sha256),
      ),
    );
    expect(withFacts[0]?.critPath).not.toContain(
      join(runsDirectory, COMMIT, imageSha256),
    );

    // The same image without facts has no saved run yet, so a new one starts.
    const withoutFacts = await ensureCrits(
      { imagePaths: [imagePath] },
      options(runsDirectory, stub.runner),
    );
    expect(stub.critCalls()).toHaveLength(2);
    expect(withoutFacts[0]?.critPath).toContain(
      join(runsDirectory, COMMIT, imageSha256),
    );
    // Another facts file for the same image is another request.
    writeFileSync(factsPath, '{"version":1,"notes":["other"]}\n');
    await ensureCrits(
      { imagePaths: [imagePath], factsPath },
      options(runsDirectory, stub.runner),
    );
    expect(stub.critCalls()).toHaveLength(3);
  });

  it("keeps the facts line equal to the line step 2 of the skill's SKILL.md says to add", () => {
    const skillText = readFileSync(
      join(REPOSITORY_ROOT, "plugin", "skills", "design-critic", "SKILL.md"),
      "utf8",
    );
    expect(skillText).toContain(`   ${FACTS_PROMPT_LINE}\n`);
  });
});

describe("the committed runs", () => {
  // Every committed run must still replay: each folder name must be the key its saved request
  // gives, and its prompt hash must match a new run of the same kind (with or without facts). A
  // run made before facts existed has no facts in its request, so its key and hash are unchanged.
  const runsDirectory = join(import.meta.dirname, "runs");
  const commits = existsSync(runsDirectory) ? readdirSync(runsDirectory) : [];
  for (const commit of commits) {
    it(`replays every saved run of skill commit ${commit.slice(0, 8)}`, () => {
      const keys = readdirSync(join(runsDirectory, commit)).filter(
        (name) => name !== "judge",
      );
      let checked = 0;
      for (const key of keys) {
        const metadataPath = join(runsDirectory, commit, key, "1.json");
        if (!existsSync(metadataPath)) {
          continue;
        }
        const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
        const factsSha256: string | undefined = metadata.request.facts?.sha256;
        const jevEvidenceSha256: string | undefined =
          metadata.request.jev_evidence?.sha256;
        const briefSha256: string | undefined = metadata.request.brief?.sha256;
        const imageSha256s = metadata.request.images.map(
          (image: { sha256: string }) => image.sha256,
        );
        expect(
          requestKey(
            imageSha256s,
            metadata.request.note ?? undefined,
            metadata.request.focus ?? undefined,
            factsSha256,
            jevEvidenceSha256,
            briefSha256,
          ),
        ).toBe(key);
        expect(
          readSavedCrits(
            runsDirectory,
            commit,
            key,
            currentRunIdentity(
              factsSha256 !== undefined,
              jevEvidenceSha256 !== undefined,
              briefSha256 !== undefined,
            ),
          ).length,
        ).toBeGreaterThan(0);
        checked += 1;
      }
      expect(checked).toBeGreaterThan(0);
    });
  }
});

describe("run --parallel", () => {
  it("starts every image before any one finishes, and prints them in the order given", async () => {
    const { root, runsDirectory } = setUp();
    // The run command needs a committed skill folder with SKILL.md and agents/critic.md.
    const skillDirectory = join(root, "skill");
    mkdirSync(join(skillDirectory, "agents"), { recursive: true });
    writeFileSync(join(skillDirectory, "SKILL.md"), "skill");
    writeFileSync(join(skillDirectory, "agents", "critic.md"), "critic");
    git(skillDirectory, ["init", "-q"]);
    git(skillDirectory, ["add", "."]);
    git(skillDirectory, ["commit", "-q", "-m", "skill"]);
    const firstImage = join(root, "first.png");
    const secondImage = join(root, "second.png");
    writeFileSync(firstImage, "first image bytes");
    writeFileSync(secondImage, "second image bytes");
    // Each crit call waits until both have started, so the test hangs (and times out)
    // if the command runs the images one after another.
    let started = 0;
    let releaseAll: () => void = () => {};
    const bothStarted = new Promise<void>((resolve) => {
      releaseAll = resolve;
    });
    const runner: ClaudeRunner = async (args) => {
      if (args[0] === "--version") {
        return { stdout: "9.9.9 (Claude Code)\n", stderr: "", exitCode: 0 };
      }
      started += 1;
      if (started === 2) {
        releaseAll();
      }
      await bothStarted;
      return { stdout: successStdout("A crit."), stderr: "", exitCode: 0 };
    };
    const { runCriticCommand } = await import("./run-critic.ts");
    const output = await runCriticCommand(
      [
        "run",
        "--skill",
        skillDirectory,
        "--parallel",
        "2",
        firstImage,
        secondImage,
      ],
      { runsDirectory, defaultSkillDirectory: "/no-skill", runClaude: runner },
    );
    expect(output.exitCode).toBe(0);
    const imageLines = output.text
      .split("\n")
      .filter((line) => line.includes(".png: "));
    expect(imageLines[0]).toContain(firstImage);
    expect(imageLines[1]).toContain(secondImage);
  });

  it("refuses a --parallel value that is not a whole number of 1 or more", async () => {
    const { imagePath, runsDirectory } = setUp();
    const { runCriticCommand } = await import("./run-critic.ts");
    await expect(
      runCriticCommand(["run", "--parallel", "0", imagePath], {
        runsDirectory,
        defaultSkillDirectory: "/no-skill",
        runClaude: recordingStub().runner,
      }),
    ).rejects.toThrow("--parallel must be a whole number");
  });
});

describe("a brief file (FR-87)", () => {
  /** Writes a brief file in the test folder and returns its path. */
  function writeBrief(root: string, text: string): string {
    const briefPath = join(root, "brief-sketch.md");
    writeFileSync(briefPath, text);
    return briefPath;
  }

  it("keeps the identity and key of a run without a brief", () => {
    expect(currentRunIdentity(false, false, false)).toEqual(
      currentRunIdentity(),
    );
    expect(requestKey(["abc"], undefined, undefined)).toBe("abc");
    expect(
      requestKey(["abc"], "a note", undefined, "facts", undefined, undefined),
    ).toBe(requestKey(["abc"], "a note", undefined, "facts"));
  });

  it("puts the Brief block in place of the note and focus lines, and keys and hashes the run apart", async () => {
    const { root, imagePath, runsDirectory } = setUp();
    const briefPath = writeBrief(
      root,
      "Stage: rough sketch\n\nAsk: only the layout and hierarchy; type and color are out of scope.\n",
    );
    const stub = recordingStub();
    const withBrief = await ensureCrits(
      { imagePaths: [imagePath], briefPath },
      options(runsDirectory, stub.runner),
    );
    const prompt = stub.critCalls()[0]?.args.at(-1) ?? "";
    expect(prompt).toContain(
      "image-1.png\nBrief:\nStage: rough sketch\nAsk: only the layout and hierarchy; type and color are out of scope.\n\nYou critique only.",
    );
    expect(prompt).not.toContain("What I know about the piece");
    expect(prompt).not.toContain("Any focus the caller asked for");
    const metadata = withBrief[0]?.metadata ?? {};
    const request = metadata.request as {
      images: { sha256: string }[];
      brief: { sha256: string; path: string };
    };
    expect(request.brief.path).toBe("brief-sketch.md");
    expect(metadata.prompt_sha256).toBe(
      currentRunIdentity(false, false, true).prompt_sha256,
    );
    expect(metadata.prompt_sha256).not.toBe(currentRunIdentity().prompt_sha256);
    const imageSha256 = request.images[0]?.sha256 ?? "";
    expect(withBrief[0]?.critPath).toContain(
      join(
        runsDirectory,
        COMMIT,
        requestKey(
          [imageSha256],
          undefined,
          undefined,
          undefined,
          undefined,
          request.brief.sha256,
        ),
      ),
    );
    expect(withBrief[0]?.critPath).not.toContain(
      join(runsDirectory, COMMIT, imageSha256),
    );
    // Another brief for the same image is another request.
    writeBrief(root, "Stage: near final\n");
    await ensureCrits(
      { imagePaths: [imagePath], briefPath },
      options(runsDirectory, stub.runner),
    );
    expect(stub.critCalls()).toHaveLength(2);
  });

  it("refuses a line with an unknown label, a missing file, and a brief with a note", async () => {
    const { root, imagePath, runsDirectory } = setUp();
    const { runCriticCommand } = await import("./run-critic.ts");
    const mainOptions = {
      runsDirectory,
      defaultSkillDirectory: "/no-skill",
      runClaude: recordingStub().runner,
    };
    const badBrief = writeBrief(root, "Job: sign-ups\nGoal: more sign-ups\n");
    await expect(
      runCriticCommand(["run", "--brief", badBrief, imagePath], mainOptions),
    ).rejects.toThrow("Goal: more sign-ups");
    await expect(
      runCriticCommand(
        ["run", "--brief", join(root, "missing.md"), imagePath],
        mainOptions,
      ),
    ).rejects.toThrow(/brief file .*missing\.md does not exist/);
    const goodBrief = writeBrief(root, "Job: sign-ups\n");
    await expect(
      runCriticCommand(
        ["run", "--brief", goodBrief, "--note", "a note", imagePath],
        mainOptions,
      ),
    ).rejects.toThrow("give --brief or --note, not both");
  });

  it("refuses a request with a brief and a focus or a note", async () => {
    const { root, imagePath, runsDirectory } = setUp();
    const briefPath = writeBrief(root, "Job: sign-ups\n");
    const stub = recordingStub();
    await expect(
      ensureCrits(
        { imagePaths: [imagePath], briefPath, focus: "only the chart" },
        options(runsDirectory, stub.runner),
      ),
    ).rejects.toThrow("give the brief alone");
    await expect(
      ensureCrits(
        { imagePaths: [imagePath], briefPath, note: "a note" },
        options(runsDirectory, stub.runner),
      ),
    ).rejects.toThrow("give the brief alone");
    expect(stub.critCalls()).toHaveLength(0);
  });

  it("accepts a first line of Brief:, as crit-loop's brief.md holds it", () => {
    expect(
      parseBriefText("Brief:\nJob: sign-ups\nJob, not: demos\n", "brief.md"),
    ).toBe("Job: sign-ups\nJob, not: demos");
  });

  it("refuses labels out of order", () => {
    expect(() =>
      parseBriefText("Stage: sketch\nJob: sign-ups\n", "brief.md"),
    ).toThrow("out of order");
  });

  it("refuses a repeated label", () => {
    expect(() =>
      parseBriefText("Job: sign-ups\nJob: trials\n", "brief.md"),
    ).toThrow("Job: trials");
  });

  it("refuses a not line that is not right after its field", () => {
    expect(() =>
      parseBriefText(
        "Job: sign-ups\nAudience: studios\nJob, not: demos\n",
        "brief.md",
      ),
    ).toThrow("Job, not: demos");
  });

  it("holds exactly the labels that step 1 of the skill's SKILL.md defines", () => {
    const skillText = readFileSync(
      join(REPOSITORY_ROOT, "plugin", "skills", "design-critic", "SKILL.md"),
      "utf8",
    );
    const stepOne = skillText.slice(
      skillText.indexOf("1. Collect the inputs"),
      skillText.indexOf("\n2. Spawn one agent"),
    );
    // Each field and each "not" half is written as **<Label>**: in step 1.
    const labels = [
      ...stepOne.matchAll(/\*\*([A-Z][a-z ]*(?:, not)?)\*\*:/g),
    ].map((match) => match[1]);
    expect(labels).toEqual([...BRIEF_LABELS]);
  });
});

describe("buildPrompt", () => {
  it("keeps $ patterns in the note, focus, and paths literal", () => {
    const note = "price shown as $' in the hero";
    const focus = "check the $& badge";
    const prompt = buildPrompt(
      "/skill/$`dir",
      ["/work/$'image-1.png"],
      note,
      focus,
      "/work/$&facts.json",
    );
    // The same call with plain text, with each plain value swapped for its "$" twin by
    // split and join, which never reads "$" patterns. A "$'" read as a pattern would paste
    // the rest of the template into the prompt and break the match.
    const plainPrompt = buildPrompt(
      "/skill/dir",
      ["/work/image-1.png"],
      "plain note",
      "plain focus",
      "/work/facts.json",
    );
    const expected = plainPrompt
      .split("plain note")
      .join(note)
      .split("plain focus")
      .join(focus)
      .split("/skill/dir")
      .join("/skill/$`dir")
      .split("/work/image-1.png")
      .join("/work/$'image-1.png")
      .split("/work/facts.json")
      .join("/work/$&facts.json");
    expect(prompt).toBe(expected);
    expect(prompt).toContain(note);
  });
});
