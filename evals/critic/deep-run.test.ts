// Disposable unit tests of the deep-mode runner (deep-run.ts). A stub stands in for `claude`, so
// no model is asked.

import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CallLimiter,
  currentDeepRunIdentity,
  DIRECTOR_PROMPT_TEMPLATE,
  deepRequestKey,
  deepRequestKeyOf,
  ensureDeepCrits,
  SECTION_CRITIC_PROMPT_TEMPLATE,
  SECTION_IDS,
} from "./deep-run.ts";
import {
  type ClaudeRunner,
  currentRunIdentity,
  readSavedCrits,
  requestKeyOf,
} from "./run-critic.ts";

const COMMIT = "c".repeat(40);
const REPOSITORY_ROOT = join(import.meta.dirname, "..", "..");
const SKILL_FOLDER = join(REPOSITORY_ROOT, "plugin", "skills", "design-critic");

/** A successful result in the shape `claude -p --output-format json` prints. */
function successStdout(text: string, cost = 0.5): string {
  return JSON.stringify({
    type: "result",
    subtype: "success",
    is_error: false,
    result: text,
    session_id: "session-1",
    num_turns: 3,
    usage: { input_tokens: 10, output_tokens: 20 },
    total_cost_usd: cost,
    modelUsage: { "claude-opus-test": {} },
  });
}

/** The prompt of a call: the last argument. */
function promptOf(args: readonly string[]): string {
  return args.at(-1) ?? "";
}

/**
 * Records every call. A section critic answers with a report naming its section, and the director
 * answers with a crit that quotes the files in its work folder, so a test can see what it got.
 */
function recordingStub() {
  const calls: { args: readonly string[]; cwd: string; files: string[] }[] = [];
  const runner: ClaudeRunner = async (args, _environment, cwd) => {
    calls.push({ args, cwd, files: readdirSync(cwd).sort() });
    if (args[0] === "--version") {
      return { stdout: "9.9.9 (Claude Code)\n", stderr: "", exitCode: 0 };
    }
    const prompt = promptOf(args);
    const section = /^Section: (\w+)$/m.exec(prompt)?.[1];
    if (section !== undefined) {
      return {
        stdout: successStdout(`Report of ${section}.`),
        stderr: "",
        exitCode: 0,
      };
    }
    const reportPath = join(cwd, "section-text.md");
    return {
      stdout: successStdout(
        `**Verdict.** The crit. ${readFileSync(reportPath, "utf8")}`,
      ),
      stderr: "",
      exitCode: 0,
    };
  };
  const agentCalls = () => calls.filter((call) => call.args[0] !== "--version");
  return { calls, agentCalls, runner };
}

/** Makes a temporary folder with a runs folder and one image whose name carries an answer. */
function setUp() {
  const root = mkdtempSync(join(tmpdir(), "deep-run-test-"));
  const imagePath = join(root, "heading-indistinct.positive.png");
  writeFileSync(imagePath, "fake image bytes");
  return { root, imagePath, runsDirectory: join(root, "runs") };
}

/** Returns the options for ensureDeepCrits with a fixed commit and the given runner. */
function options(runsDirectory: string, runner: ClaudeRunner) {
  return {
    runsDirectory,
    skillDirectory: "/skill",
    skillCommit: COMMIT,
    runClaude: runner,
  };
}

describe("ensureDeepCrits", () => {
  it("runs eight section critics and then the director, and saves the director's crit with every report", async () => {
    const { imagePath, runsDirectory } = setUp();
    const stub = recordingStub();
    const saved = await ensureDeepCrits(
      { imagePaths: [imagePath] },
      options(runsDirectory, stub.runner),
    );
    const agentCalls = stub.agentCalls();
    expect(agentCalls).toHaveLength(9);
    const sectionPrompts = agentCalls.slice(0, 8).map((call) => {
      return promptOf(call.args);
    });
    const sections = sectionPrompts.map(
      (prompt) => /^Section: (\w+)$/m.exec(prompt)?.[1],
    );
    expect(sections).toEqual([...SECTION_IDS]);
    for (const prompt of sectionPrompts) {
      expect(prompt).toContain("/skill/agents/section-critic.md");
      expect(prompt).not.toContain("positive");
    }
    // The director runs last, in the same work folder, with the eight reports written there.
    const directorCall = agentCalls[8];
    const directorPrompt = promptOf(directorCall?.args ?? []);
    expect(directorPrompt).toContain("/skill/agents/director.md");
    const reportNames = SECTION_IDS.map((section) => `section-${section}.md`);
    expect(directorPrompt).toContain(
      `Section reports: ${reportNames.map((name) => join(directorCall?.cwd ?? "", name)).join(", ")}\n`,
    );
    expect(directorCall?.files).toEqual(["image-1.png", ...reportNames].sort());
    expect(saved).toHaveLength(1);
    expect(saved[0]?.crit).toBe("**Verdict.** The crit. Report of text.");
    const metadata = saved[0]?.metadata ?? {};
    expect(metadata.mode).toBe("deep");
    expect(metadata.prompt_sha256).toBe(currentDeepRunIdentity().prompt_sha256);
    expect(metadata.total_cost_usd).toBe(4.5);
    const savedSections = metadata.sections as {
      section: string;
      report: string;
    }[];
    expect(savedSections.map((entry) => entry.section)).toEqual([
      ...SECTION_IDS,
    ]);
    expect(savedSections[1]?.report).toBe("Report of hierarchy.");
  });

  it("keys and hashes a deep run apart from a single run of the same image", async () => {
    const { imagePath, runsDirectory } = setUp();
    const stub = recordingStub();
    const [saved] = await ensureDeepCrits(
      { imagePaths: [imagePath] },
      options(runsDirectory, stub.runner),
    );
    const singleKey = requestKeyOf({ imagePaths: [imagePath] });
    const deepKey = deepRequestKeyOf({ imagePaths: [imagePath] });
    expect(deepKey).not.toBe(singleKey);
    expect(saved?.critPath).toContain(join(runsDirectory, COMMIT, deepKey));
    expect(currentDeepRunIdentity().prompt_sha256).not.toBe(
      currentRunIdentity().prompt_sha256,
    );
    // A single-critic replay of the deep folder finds nothing, and a deep replay finds the run.
    expect(readSavedCrits(runsDirectory, COMMIT, deepKey)).toHaveLength(0);
    expect(
      readSavedCrits(runsDirectory, COMMIT, deepKey, currentDeepRunIdentity()),
    ).toHaveLength(1);
    const request = saved?.metadata.request as
      | { images: { sha256: string }[] }
      | undefined;
    const imageSha256 = request?.images[0]?.sha256;
    expect(deepRequestKey([imageSha256 ?? ""], undefined, undefined)).toBe(
      deepKey,
    );
  });

  it("starts no child process on a second call for the same image and commit", async () => {
    const { imagePath, runsDirectory } = setUp();
    await ensureDeepCrits(
      { imagePaths: [imagePath] },
      options(runsDirectory, recordingStub().runner),
    );
    const second = recordingStub();
    const saved = await ensureDeepCrits(
      { imagePaths: [imagePath] },
      options(runsDirectory, second.runner),
    );
    expect(second.calls).toHaveLength(0);
    expect(saved).toHaveLength(1);
  });

  it("gives every child the facts file as facts.json, and keys and hashes the run apart", async () => {
    const { root, imagePath, runsDirectory } = setUp();
    const factsPath = join(root, "heading-indistinct.positive.facts.json");
    writeFileSync(factsPath, '{"version":1}\n');
    const stub = recordingStub();
    const [saved] = await ensureDeepCrits(
      { imagePaths: [imagePath], factsPath },
      options(runsDirectory, stub.runner),
    );
    for (const call of stub.agentCalls()) {
      const factsInWork = join(call.cwd, "facts.json");
      expect(promptOf(call.args)).toContain(
        `${join(call.cwd, "image-1.png")}\nMeasured facts file: ${factsInWork}\n`,
      );
    }
    expect(saved?.metadata.prompt_sha256).toBe(
      currentDeepRunIdentity(true).prompt_sha256,
    );
    expect(deepRequestKeyOf({ imagePaths: [imagePath], factsPath })).not.toBe(
      deepRequestKeyOf({ imagePaths: [imagePath] }),
    );
  });

  it("saves nothing when a section critic fails", async () => {
    const { imagePath, runsDirectory } = setUp();
    const runner: ClaudeRunner = async (args) => {
      if (args[0] === "--version") {
        return { stdout: "9.9.9\n", stderr: "", exitCode: 0 };
      }
      if (promptOf(args).includes("Section: color")) {
        return { stdout: "", stderr: "usage limit reached", exitCode: 1 };
      }
      return { stdout: successStdout("Report."), stderr: "", exitCode: 0 };
    };
    await expect(
      ensureDeepCrits(
        { imagePaths: [imagePath] },
        options(runsDirectory, runner),
      ),
    ).rejects.toThrow(/section critic color: claude exited with code 1/);
    const key = deepRequestKeyOf({ imagePaths: [imagePath] });
    expect(
      readSavedCrits(runsDirectory, COMMIT, key, currentDeepRunIdentity()),
    ).toHaveLength(0);
  });

  it("refuses two images, a focus, and a Jev evidence file", () => {
    const { imagePath } = setUp();
    expect(() =>
      deepRequestKeyOf({ imagePaths: [imagePath, imagePath] }),
    ).toThrow(/one image/);
    expect(() =>
      deepRequestKeyOf({ imagePaths: [imagePath], focus: "the chart" }),
    ).toThrow(/no focus/);
    expect(() =>
      deepRequestKeyOf({ imagePaths: [imagePath], jevEvidencePath: imagePath }),
    ).toThrow(/Jev/);
  });
});

describe("CallLimiter", () => {
  it("runs at most the limit at once and lets a waiting director go before waiting sections", async () => {
    const limiter = new CallLimiter(2);
    let running = 0;
    let mostRunning = 0;
    const order: string[] = [];
    const releases: (() => void)[] = [];
    /** Starts one call that stays running until the test releases it. */
    const start = (kind: "section" | "director", name: string) =>
      limiter.run(kind, async () => {
        running += 1;
        mostRunning = Math.max(mostRunning, running);
        order.push(name);
        await new Promise<void>((resolveWork) => releases.push(resolveWork));
        running -= 1;
      });
    const all = [
      start("section", "s1"),
      start("section", "s2"),
      start("section", "s3"),
      start("director", "d1"),
    ];
    // Let the first two calls start, then finish one at a time.
    await new Promise((resolveTick) => setImmediate(resolveTick));
    expect(order).toEqual(["s1", "s2"]);
    while (releases.length > 0 || order.length < 4) {
      releases.shift()?.();
      await new Promise((resolveTick) => setImmediate(resolveTick));
    }
    await Promise.all(all);
    expect(mostRunning).toBe(2);
    expect(order).toEqual(["s1", "s2", "d1", "s3"]);
  });
});

describe("the deep-mode prompts", () => {
  /** Returns the fenced block under the numbered step of agents/deep-mode.md, without its indent. */
  function stepBlock(stepNumber: number): string {
    const text = readFileSync(
      join(SKILL_FOLDER, "agents", "deep-mode.md"),
      "utf8",
    );
    const step = text.slice(text.indexOf(`\n${stepNumber}. `));
    const blockStart = step.indexOf("   ```\n") + "   ```\n".length;
    const blockEnd = step.indexOf("\n   ```", blockStart);
    return step
      .slice(blockStart, blockEnd)
      .split("\n")
      .map((line) => line.replace(/^ {3}/, ""))
      .join("\n");
  }

  it("keeps the section critic's prompt equal to step 2 of agents/deep-mode.md", () => {
    expect(stepBlock(2)).toBe(SECTION_CRITIC_PROMPT_TEMPLATE);
  });

  it("keeps the director's prompt equal to step 4 of agents/deep-mode.md", () => {
    expect(stepBlock(4)).toBe(DIRECTOR_PROMPT_TEMPLATE);
  });

  it("has one built checklist file per section in references/", () => {
    for (const section of SECTION_IDS) {
      const text = readFileSync(
        join(SKILL_FOLDER, "references", `checklist-${section}.md`),
        "utf8",
      );
      expect(text.match(/^## /gm)).toHaveLength(1);
    }
  });
});
