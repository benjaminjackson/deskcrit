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
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import type { ClaudeRunner } from "./run-critic.ts";
import {
  buildSetJudgeQuestion,
  buildSetRequest,
  buildSheet,
  parseBreaksLine,
  parseSetAnswers,
  runSets,
  type SetsOptions,
  setFocus,
} from "./sets.ts";

const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const REAL_SETS = join(import.meta.dirname, "..", "sets");
const CONTACT_SHEET_SCRIPT = join(
  import.meta.dirname,
  "..",
  "..",
  "plugin",
  "skills",
  "design-critic",
  "scripts",
  "contact-sheet.mjs",
);
const SCREEN_NAMES = ["screen-1", "screen-2", "screen-3"];

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
 * Makes two tiny sets: set-01 has a break at tile 2 (screen-2) of kind "palette", set-02 is clean.
 */
async function makeSets(): Promise<{
  setsDirectory: string;
  skillDirectory: string;
}> {
  const root = mkdtempSync(join(tmpdir(), "critic-sets-test-"));
  const setsDirectory = join(root, "sets");
  for (const name of ["set-01", "set-02"]) {
    mkdirSync(join(setsDirectory, name), { recursive: true });
    // A real, tiny PNG per screen. Its color names the set, so the stub can tell the sets apart.
    for (const file of SCREEN_NAMES) {
      await sharp({
        create: {
          width: 64,
          height: 40,
          channels: 3,
          background: name === "set-01" ? "#ff0000" : "#0000ff",
        },
      })
        .png()
        .toFile(join(setsDirectory, name, `${file}.png`));
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

/** Returns "set-01" when the first screen copied into a critic work folder (image-2) is red, else "set-02". */
async function findSetName(workingDirectory: string): Promise<string> {
  for (const name of readdirSync(workingDirectory)) {
    if (name.startsWith("image-2")) {
      const { data } = await sharp(join(workingDirectory, name))
        .raw()
        .toBuffer({ resolveWithObject: true });
      return data[0] === 255 ? "set-01" : "set-02";
    }
  }
  throw new Error(`no image-2 in ${workingDirectory}`);
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
    // The runner copies the images into the work folder; the first screen's color names the set.
    const setName = await findSetName(workingDirectory);
    return {
      stdout: successStdout(`Crit text.\n\n${critLines[setName]}`),
      stderr: "",
      exitCode: 0,
    };
  };
  return { runner, calls: () => calls };
}

function options(
  made: Awaited<ReturnType<typeof makeSets>>,
  runner: ClaudeRunner,
): SetsOptions {
  return {
    setsDirectory: made.setsDirectory,
    runsDirectory: join(made.setsDirectory, "..", "runs"),
    skillDirectory: made.skillDirectory,
    contactSheetScript: CONTACT_SHEET_SCRIPT,
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
      const sheet = buildSheet(
        join(REAL_SETS, answer.set),
        CONTACT_SHEET_SCRIPT,
      );
      const request = buildSetRequest(
        join(REAL_SETS, answer.set),
        sheet.sheetPath,
      );
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
    const sheet = buildSheet(join(REAL_SETS, "set-01"), CONTACT_SHEET_SCRIPT);
    const request = buildSetRequest(join(REAL_SETS, "set-01"), sheet.sheetPath);
    expect(sheet.screenOfTile.get(4)).toBe("screen-4.png");
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
    const made = await makeSets();
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
    expect(live.text).toContain("right tile named, and no other: 1 of 1");
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

    const empty = await makeSets();
    const missing = await runSets(
      ["--replay", "--skill-commit", COMMIT],
      options(empty, throwingRunner),
    );
    expect(missing.exitCode).toBe(2);
    expect(missing.errorText).toContain("missing crit for set-01");
  });

  it("leaves a crit with a malformed or missing Breaks line out of the counts and names it", async () => {
    const made = await makeSets();
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
    expect(output.text).toContain("right tile named, and no other: 0 of 0");
    expect(output.text).toContain(
      "left out of the counts, no readable Breaks line: set-01, set-02",
    );
    expect(calls()).toBe(2);
  });

  it("stops with a clear line when the contact-sheet script is missing", async () => {
    const made = await makeSets();
    const { runner } = stubRunner({}, "found");
    const failing = {
      ...options(made, runner),
      contactSheetScript: "/nope/contact-sheet.mjs",
    };
    await expect(runSets(["--skill-commit", COMMIT], failing)).rejects.toThrow(
      /contact-sheet script/,
    );
  });

  it("stops a live run with a clear line when agents/set-critic.md is missing from the skill folder", async () => {
    const made = await makeSets();
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
    const made = await makeSets();
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

  it("counts the right tile only when the Breaks line names the planted tile and no other, and lists the extra tiles", async () => {
    const made = await makeSets();
    const { runner } = stubRunner(
      {
        "set-01": "Breaks: tile 2, tile 3",
        "set-02": "Breaks: tile 1, tile 3",
      },
      "found",
    );
    const output = await runSets(
      ["--skill-commit", COMMIT],
      options(made, runner),
    );
    expect(output.exitCode).toBe(0);
    expect(output.text).toContain("extra tiles");
    expect(output.text).toContain("right tile named, and no other: 0 of 1");
    expect(output.text).toContain("false break on a clean set: 1 of 1");
    const rowOf = (set: string) =>
      output.text.split("\n").find((line) => line.startsWith(set)) ?? "";
    // set-01: tile 2 is planted, tile 3 is extra. set-02 is clean, so every named tile is extra.
    expect(rowOf("set-01")).toMatch(/tile 2, tile 3\s+no\s+tile 3\s/);
    expect(rowOf("set-02")).toMatch(/tile 1, tile 3\s+-\s+tile 1, tile 3\s/);
  });

  it("shows no extra tiles when the Breaks line names only the planted tile", async () => {
    const made = await makeSets();
    const { runner } = stubRunner(
      { "set-01": "Breaks: tile 2", "set-02": "Breaks: none" },
      "found",
    );
    const output = await runSets(
      ["--skill-commit", COMMIT],
      options(made, runner),
    );
    const rowOf = (set: string) =>
      output.text.split("\n").find((line) => line.startsWith(set)) ?? "";
    expect(rowOf("set-01")).toMatch(/tile 2\s+yes\s+none\s/);
    expect(rowOf("set-02")).toMatch(/none\s+-\s+none\s/);
    expect(output.text).toContain("right tile named, and no other: 1 of 1");
  });
});
