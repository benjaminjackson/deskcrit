// Unit tests of the set evaluation (EV-21). A stub function stands in for the `claude` child process,
// so no model is asked (CS-21, CS-22). Each test works in its own temporary sets and runs folders.

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { ClaudeRunner } from "./run-critic.ts";
import {
  buildSetJudgeQuestion,
  buildSetRequest,
  parseBreaksLine,
  parseSetAnswers,
  runSets,
  type SetsOptions,
  setFocus,
} from "./sets.ts";

const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const REAL_SETS = join(import.meta.dirname, "..", "sets");

/** A successful `claude -p` result with a crit, or with a structured judge answer. */
function successStdout(crit: string, structured?: unknown): string {
  return JSON.stringify({
    type: "result",
    subtype: "success",
    is_error: false,
    result: crit,
    structured_output: structured,
    session_id: "session-1",
    num_turns: 3,
    usage: {},
    total_cost_usd: 0.5,
    modelUsage: { "claude-opus-test": {} },
  });
}

/**
 * Makes two tiny sets: set-01 has a break at tile 2 of kind "palette", set-02 is clean. The files
 * hold plain text under PNG names, because only their bytes are hashed.
 */
function makeSets(): { setsDirectory: string; skillDirectory: string } {
  const root = mkdtempSync(join(tmpdir(), "critic-sets-test-"));
  const setsDirectory = join(root, "sets");
  for (const name of ["set-01", "set-02"]) {
    mkdirSync(join(setsDirectory, name), { recursive: true });
    for (const file of ["sheet", "screen-1", "screen-2", "screen-3"]) {
      writeFileSync(
        join(setsDirectory, name, `${file}.png`),
        `${name} ${file}`,
      );
    }
  }
  writeFileSync(
    join(setsDirectory, "answers.json"),
    JSON.stringify([
      {
        set: "set-01",
        break_screen: "screen-2.html",
        tile: 2,
        kind: "palette",
      },
      { set: "set-02", break_screen: null, tile: null, kind: null },
    ]),
  );
  const skillDirectory = join(root, "skill");
  mkdirSync(join(skillDirectory, "agents"), { recursive: true });
  writeFileSync(join(skillDirectory, "agents", "set-critic.md"), "stub");
  return { setsDirectory, skillDirectory };
}

/** Reads the text of the first image copied into a critic work folder. */
function findSheetText(workingDirectory: string): string {
  for (const name of readdirSync(workingDirectory)) {
    if (name.startsWith("image-1")) {
      return readFileSync(join(workingDirectory, name), "utf8");
    }
  }
  throw new Error(`no image-1 in ${workingDirectory}`);
}

/** Returns a runner that answers each set crit by the first image name in the prompt, and each judge call with the given verdict. */
function stubRunner(
  critLines: Record<string, string>,
  verdict: string,
): { runner: ClaudeRunner; calls: () => number } {
  let calls = 0;
  const runner: ClaudeRunner = async (args, _environment, workingDirectory) => {
    if (args[0] === "--version") {
      return { stdout: "9.9.9\n", stderr: "", exitCode: 0 };
    }
    calls += 1;
    const joined = args.join(" ");
    if (joined.includes("--json-schema")) {
      return {
        stdout: successStdout("", { reason: "stub", verdict }),
        stderr: "",
        exitCode: 0,
      };
    }
    // The runner copies the images into the work folder; the first one is the sheet, whose bytes name the set.
    const sheetText = findSheetText(workingDirectory);
    const setName = sheetText.startsWith("set-01") ? "set-01" : "set-02";
    return {
      stdout: successStdout(`Crit text.\n\n${critLines[setName]}`),
      stderr: "",
      exitCode: 0,
    };
  };
  return { runner, calls: () => calls };
}

function options(
  made: ReturnType<typeof makeSets>,
  runner: ClaudeRunner,
): SetsOptions {
  return {
    setsDirectory: made.setsDirectory,
    runsDirectory: join(made.setsDirectory, "..", "runs"),
    skillDirectory: made.skillDirectory,
    runClaude: runner,
  };
}

const throwingRunner: ClaudeRunner = async () => {
  throw new Error("replay must not start claude");
};

describe("parseBreaksLine", () => {
  it("reads none, one tile, and several tiles", () => {
    expect(parseBreaksLine("x\nBreaks: none")).toEqual({ state: "none" });
    expect(parseBreaksLine("x\nBreaks: tile 3")).toEqual({
      state: "tiles",
      tiles: [3],
    });
    expect(parseBreaksLine("x\nBreaks: tile 2, tile 5")).toEqual({
      state: "tiles",
      tiles: [2, 5],
    });
  });

  it("strips markdown marks and a trailing period", () => {
    expect(parseBreaksLine("x\n**Breaks: tile 4**.")).toEqual({
      state: "tiles",
      tiles: [4],
    });
    expect(parseBreaksLine("x\n`Breaks: none`")).toEqual({ state: "none" });
  });

  it("names a missing line and a malformed line and never guesses", () => {
    expect(parseBreaksLine("Tile 3 breaks the pattern.")).toEqual({
      state: "missing",
    });
    expect(parseBreaksLine("x\nBreaks: tile 2 and tile 5").state).toBe(
      "malformed",
    );
    expect(parseBreaksLine("x\nBreaks: the third one").state).toBe("malformed");
    expect(parseBreaksLine("Breaks: none\nA closing remark.").state).toBe(
      "missing",
    );
  });
});

describe("the frozen sets", () => {
  it("has 10 sets of 5 or 6 screens, 7 with a break and 3 clean, and names the answer in no screen file", () => {
    const answers = parseSetAnswers(
      readFileSync(join(REAL_SETS, "answers.json"), "utf8"),
    );
    expect(answers).toHaveLength(10);
    expect(answers.filter((answer) => answer.tile !== null)).toHaveLength(7);
    for (const answer of answers) {
      const request = buildSetRequest(join(REAL_SETS, answer.set));
      expect(request.imagePaths.length).toBeGreaterThanOrEqual(6);
      expect(request.imagePaths.length).toBeLessThanOrEqual(7);
      expect(request.imagePaths[0]).toMatch(/sheet\.png$/);
      if (answer.tile !== null) {
        expect(
          existsSync(
            join(REAL_SETS, answer.set, answer.break_screen as string),
          ),
        ).toBe(true);
      }
    }
  });

  it("gives the critic a sheet first and the screens in tile order, with a focus that names no break", () => {
    const request = buildSetRequest(join(REAL_SETS, "set-01"));
    expect(
      request.imagePaths.slice(1).map((path) => path.split("/").pop()),
    ).toEqual([
      "screen-1.png",
      "screen-2.png",
      "screen-3.png",
      "screen-4.png",
      "screen-5.png",
      "screen-6.png",
    ]);
    expect(setFocus(6)).toContain("Images 2 to 7");
    expect(setFocus(6)).not.toMatch(/palette|radius|nav/i);
  });

  it("puts the kind in the judge question and no tile or file name", () => {
    const question = buildSetJudgeQuestion(
      "palette",
      {
        runNumber: 1,
        critPath: "",
        metadataPath: "",
        crit: "Tile 2 differs.\nBreaks: tile 2",
        metadata: {},
      },
      "key",
    );
    expect(question.prompt).toContain("The kind of break is: palette.");
    expect(question.prompt).not.toContain("screen-");
  });
});

describe("runSets", () => {
  it("scores a live run, then a replay with no child process, and a missing crit exits 2", async () => {
    const made = makeSets();
    const { runner, calls } = stubRunner(
      { "set-01": "Breaks: tile 2", "set-02": "Breaks: tile 3" },
      "found",
    );
    const live = await runSets(
      ["--skill-commit", COMMIT],
      options(made, runner),
    );
    expect(live.exitCode).toBe(0);
    expect(live.text).toContain("break found (judge): 1 of 1");
    expect(live.text).toContain("right tile named: 1 of 1");
    expect(live.text).toContain("false break on a clean set: 1 of 1");
    // Two set crits and one judge call (the clean set gets none).
    expect(calls()).toBe(3);

    const replay = await runSets(
      ["--replay", "--skill-commit", COMMIT],
      options(made, throwingRunner),
    );
    expect(replay.exitCode).toBe(0);
    expect(replay.text).toBe(
      live.text.replace(
        "Mode: live",
        "Mode: replay (saved crits, no child process)",
      ),
    );

    const empty = makeSets();
    const missing = await runSets(
      ["--replay", "--skill-commit", COMMIT],
      options(empty, throwingRunner),
    );
    expect(missing.exitCode).toBe(2);
    expect(missing.errorText).toContain("missing crit for set-01");
  });

  it("leaves a crit with a malformed or missing Breaks line out of the counts and names it", async () => {
    const made = makeSets();
    const { runner, calls } = stubRunner(
      { "set-01": "Breaks: tile two", "set-02": "The set is fine." },
      "found",
    );
    const output = await runSets(
      ["--skill-commit", COMMIT],
      options(made, runner),
    );
    expect(output.exitCode).toBe(0);
    expect(output.text).toContain("malformed: Breaks: tile two");
    expect(output.text).toContain("no Breaks line");
    expect(output.text).toContain("right tile named: 0 of 0");
    expect(output.text).toContain(
      "left out of the counts, no readable Breaks line: set-01, set-02",
    );
    expect(calls()).toBe(2);
  });

  it("stops a live run with a clear line when agents/set-critic.md is missing from the skill folder", async () => {
    const made = makeSets();
    const { runner } = stubRunner({}, "found");
    const failing = {
      ...options(made, runner),
      skillDirectory: join(made.skillDirectory, "nope"),
    };
    await expect(runSets(["--skill-commit", COMMIT], failing)).rejects.toThrow(
      /set-critic\.md is missing/,
    );
  });

  it("reports a clean set that the critic leaves alone as no false break", async () => {
    const made = makeSets();
    const { runner } = stubRunner(
      { "set-01": "Breaks: tile 2", "set-02": "Breaks: none" },
      "not_found",
    );
    const output = await runSets(
      ["--skill-commit", COMMIT],
      options(made, runner),
    );
    expect(output.text).toContain("false break on a clean set: 0 of 1");
    expect(output.text).toContain("break found (judge): 0 of 1");
  });
});
