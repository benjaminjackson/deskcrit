// Unit tests of the picker evaluation (FR-83, EV-15). A stub function stands in for the `claude`
// child process, so no model is asked (CS-21, CS-22). Tests use the real 30 labeled pairs and the
// skill's real contact-sheet.mjs, and work in their own temporary runs folder.

import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readLabeledPairs } from "../agreement/compare-labels.ts";
import { afterFirst } from "./compare.ts";
import {
  buildPickerRequest,
  type PickerOptions,
  parsePickerChoice,
  pickerFocus,
  pickerPreference,
  readOldCompareFigure,
  runPicker,
} from "./picker.ts";
import type { ClaudeRunner } from "./run-critic.ts";

const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const REPOSITORY_ROOT = join(import.meta.dirname, "..", "..");
const SKILL_DIRECTORY = join(
  REPOSITORY_ROOT,
  "plugin",
  "skills",
  "design-critic",
);
const SCRIPT = join(SKILL_DIRECTORY, "scripts", "contact-sheet.mjs");
const PAIRS = readLabeledPairs(
  "labels.json",
  readFileSync(
    join(REPOSITORY_ROOT, "evals", "compare-pairs", "labels.json"),
    "utf8",
  ),
);

/** A successful result in the shape `claude -p --output-format json` prints. */
function successStdout(crit: string): string {
  return JSON.stringify({
    type: "result",
    subtype: "success",
    is_error: false,
    result: crit,
    session_id: "session-1",
    num_turns: 3,
    usage: {},
    total_cost_usd: 0.5,
    modelUsage: { "claude-opus-test": {} },
  });
}

/** Answers every picker run with the given last line and counts the runs. */
function stub(lastLine: string) {
  let calls = 0;
  const runner: ClaudeRunner = async (args) => {
    if (args[0] === "--version") {
      return { stdout: "9.9.9\n", stderr: "", exitCode: 0 };
    }
    calls += 1;
    return {
      stdout: successStdout(`Tile 1 is clearer.\n\n${lastLine}`),
      stderr: "",
      exitCode: 0,
    };
  };
  return { runner, calls: () => calls };
}

const throwingRunner: ClaudeRunner = async () => {
  throw new Error("replay must not start claude");
};

function makeOptions(runner: ClaudeRunner): PickerOptions {
  const root = mkdtempSync(join(tmpdir(), "critic-picker-test-"));
  return {
    repositoryDirectory: REPOSITORY_ROOT,
    runsDirectory: join(root, "runs"),
    skillDirectory: SKILL_DIRECTORY,
    contactSheetScript: SCRIPT,
    runClaude: runner,
  };
}

describe("parsePickerChoice and pickerPreference", () => {
  it("reads a best tile and a tie, with markdown marks and a trailing period", () => {
    expect(parsePickerChoice("x\nBest: tile 2")).toEqual({
      state: "best",
      tile: 2,
    });
    expect(parsePickerChoice("x\n**Best: tile 1**.")).toEqual({
      state: "best",
      tile: 1,
    });
    expect(parsePickerChoice("x\n`Best: tie tile 1, tile 2`")).toEqual({
      state: "tie",
      tiles: [1, 2],
    });
  });

  it("reads only the last non-empty line and never guesses", () => {
    expect(parsePickerChoice("Best: tile 1\nA closing remark.").state).toBe(
      "invalid",
    );
    expect(parsePickerChoice("Tile 1 wins.").state).toBe("invalid");
    expect(parsePickerChoice("x\nBest: tile one").state).toBe("invalid");
  });

  it("maps tiles to after, before, or same by which image is tile 1", () => {
    const tileOne = { state: "best", tile: 1 } as const;
    const tileTwo = { state: "best", tile: 2 } as const;
    expect(pickerPreference(tileOne, true)).toBe("after");
    expect(pickerPreference(tileOne, false)).toBe("before");
    expect(pickerPreference(tileTwo, true)).toBe("before");
    expect(pickerPreference(tileTwo, false)).toBe("after");
    expect(pickerPreference({ state: "tie", tiles: [1, 2] }, true)).toBe(
      "same",
    );
    expect(pickerPreference({ state: "best", tile: 3 }, true)).toBeNull();
    expect(pickerPreference({ state: "invalid" }, true)).toBeNull();
  });
});

describe("buildPickerRequest", () => {
  it("puts the sheet first and the versions in the order compare.ts uses", () => {
    const pair = PAIRS[0];
    if (pair === undefined) {
      throw new Error("no pairs");
    }
    const request = buildPickerRequest(pair, REPOSITORY_ROOT, SCRIPT);
    const after = join(REPOSITORY_ROOT, pair.after);
    const before = join(REPOSITORY_ROOT, pair.before);
    const versions = afterFirst(pair.pair_id)
      ? [after, before]
      : [before, after];
    expect(request.imagePaths.slice(1)).toEqual(versions);
    expect(request.imagePaths[0]).toMatch(/sheet\.png$/);
    expect(request.focus).toBe(pickerFocus());
    expect(pickerFocus()).toContain("agents/picker.md");
    expect(pickerFocus()).not.toMatch(/before|after/i);
  });
});

describe("readOldCompareFigure", () => {
  it("reads the distinct scored cells of the SCORES.md row", () => {
    const text =
      "| Compare: agrees with the preference | 24 of 30 | 24 of 30 | not scored |\n";
    expect(readOldCompareFigure(text)).toBe("24 of 30");
    expect(readOldCompareFigure("nothing")).toBe("unknown");
  });
});

describe("runPicker", () => {
  it("runs once per pair, saves the runs, and replays them with no child process", async () => {
    const { runner, calls } = stub("Best: tile 1");
    const options = makeOptions(runner);
    const live = await runPicker(["--skill-commit", COMMIT], options);
    expect(live.exitCode).toBe(0);
    expect(calls()).toBe(PAIRS.length);
    expect(live.text).toContain("agrees with the preference:");
    expect(live.text).toContain(
      "old compare path (EV-15, SCORES.md): 24 of 30",
    );
    const replay = await runPicker(["--replay", "--skill-commit", COMMIT], {
      ...options,
      runClaude: throwingRunner,
    });
    expect(replay.exitCode).toBe(0);
    expect(replay.text).toContain("agrees with the preference:");
  }, 120000);

  it("counts ties, and names and leaves out a run with no Best line", async () => {
    const tie = await runPicker(
      ["--skill-commit", COMMIT],
      makeOptions(stub("Best: tie tile 1, tile 2").runner),
    );
    expect(tie.text).toMatch(/ties on the \d+ pairs preferred "same": \d+/);
    const bad = await runPicker(
      ["--skill-commit", COMMIT],
      makeOptions(stub("Tile 1 is better.").runner),
    );
    expect(bad.exitCode).toBe(0);
    expect(bad.text).toContain("left out, no valid Best line:");
  }, 120000);

  it("exits 2 in replay when a run is missing", async () => {
    const output = await runPicker(
      ["--replay", "--skill-commit", COMMIT],
      makeOptions(throwingRunner),
    );
    expect(output.exitCode).toBe(2);
    expect(output.errorText).toContain(`for ${PAIRS.length} pairs`);
  }, 120000);
});
