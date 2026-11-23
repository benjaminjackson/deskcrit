// Unit tests of the critic compare evaluation (EV-15). Each test passes a plain stub function in
// place of the `claude` child process, so no model is asked (CS-21, CS-22). Live and replay tests
// work in their own temporary runs folder and use the real 30 labeled pairs.

import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readLabeledPairs } from "../agreement/compare-labels.ts";
import {
  afterFirst,
  buildPairRequest,
  COMPARE_FOCUS,
  type CompareOptions,
  formatSummaryLine,
  JEV_FIGURES_LINE,
  parseChoice,
  runCompare,
  toPreference,
} from "./compare.ts";
import type { ClaudeRunner } from "./run-critic.ts";

const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const REPOSITORY_ROOT = join(import.meta.dirname, "..", "..");
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
    usage: { input_tokens: 10, output_tokens: 20 },
    total_cost_usd: 0.5,
    modelUsage: { "claude-opus-test": {} },
  });
}

/** Counts crit calls and answers each with a crit that ends `Better: version 1`. */
function countingStub() {
  let critCalls = 0;
  const runner: ClaudeRunner = async (args) => {
    if (args[0] === "--version") {
      return { stdout: "9.9.9 (Claude Code)\n", stderr: "", exitCode: 0 };
    }
    critCalls += 1;
    return {
      stdout: successStdout("Version 1 is clearer.\n\nBetter: version 1"),
      stderr: "",
      exitCode: 0,
    };
  };
  return { runner, critCallCount: () => critCalls };
}

/** A runner that fails the test if replay ever starts a child process. */
const throwingRunner: ClaudeRunner = async () => {
  throw new Error("replay must not start claude");
};

/** Returns options with a new temporary runs folder and the given runner. */
function makeOptions(runner: ClaudeRunner): CompareOptions {
  const root = mkdtempSync(join(tmpdir(), "critic-compare-test-"));
  return {
    repositoryDirectory: REPOSITORY_ROOT,
    runsDirectory: join(root, "runs"),
    skillDirectory: "/skill",
    runClaude: runner,
  };
}

describe("the order of the images", () => {
  it("shows after first for some pairs and before first for others, and the request follows afterFirst", () => {
    const orders = new Set(PAIRS.map((pair) => afterFirst(pair.pair_id)));
    expect(orders).toEqual(new Set([true, false]));
    for (const pair of PAIRS) {
      const request = buildPairRequest(pair, REPOSITORY_ROOT);
      const after = join(REPOSITORY_ROOT, pair.after);
      const before = join(REPOSITORY_ROOT, pair.before);
      const expected = afterFirst(pair.pair_id)
        ? [after, before]
        : [before, after];
      expect(request.imagePaths).toEqual(expected);
      expect(request.note).toBeUndefined();
      expect(request.focus).toBe(COMPARE_FOCUS);
    }
  });

  it("gives a focus line with no before, after, pair id, or file path", () => {
    expect(COMPARE_FOCUS).not.toMatch(/before/i);
    expect(COMPARE_FOCUS).not.toMatch(/after/i);
    expect(COMPARE_FOCUS).not.toContain("/");
    for (const pair of PAIRS) {
      expect(COMPARE_FOCUS).not.toContain(pair.pair_id);
      expect(COMPARE_FOCUS).not.toContain(pair.before);
      expect(COMPARE_FOCUS).not.toContain(pair.after);
    }
  });
});

describe("parseChoice and toPreference", () => {
  it("reads each of the three last lines, also in bold or backticks", () => {
    expect(parseChoice("Text.\nBetter: version 1")).toBe("version 1");
    expect(parseChoice("Text.\nBetter: version 2\n")).toBe("version 2");
    expect(parseChoice("Text.\nBetter: same")).toBe("same");
    expect(parseChoice("Text.\n**Better: version 2**")).toBe("version 2");
    expect(parseChoice("Text.\n`Better: same`")).toBe("same");
  });

  it("returns undecided with no line or with two lines that disagree", () => {
    expect(parseChoice("Version 1 is better.")).toBe("undecided");
    expect(parseChoice("Better: version 1\nBetter: version 2")).toBe(
      "undecided",
    );
  });

  it("maps the versions to after or before in both orders", () => {
    expect(toPreference("version 1", true)).toBe("after");
    expect(toPreference("version 2", true)).toBe("before");
    expect(toPreference("version 1", false)).toBe("before");
    expect(toPreference("version 2", false)).toBe("after");
    expect(toPreference("same", true)).toBe("same");
    expect(toPreference("undecided", false)).toBe("undecided");
  });

  it("formats the summary line with undecided counted as not agreeing", () => {
    expect(
      formatSummaryLine(["agreed", "disagreed", "undecided", "agreed"]),
    ).toBe("agreed 2, disagreed 1, undecided 1, rate 0.500");
    expect(JEV_FIGURES_LINE).toBe(
      "Jev: 0.500 first run, 0.467 after the respelling, 0.867 after FR-37 changed (FR-37 was chosen after these 30 pairs had been seen)",
    );
  });
});

describe("runCompare", () => {
  it("runs live once per pair, starts nothing on a second live run, and replays without a child process", async () => {
    const stub = countingStub();
    const options = makeOptions(stub.runner);
    const first = await runCompare(["--skill-commit", COMMIT], options);
    expect(first.exitCode).toBe(0);
    expect(stub.critCallCount()).toBe(PAIRS.length);
    expect(readdirSync(join(options.runsDirectory, COMMIT))).toHaveLength(
      PAIRS.length,
    );
    const second = await runCompare(["--skill-commit", COMMIT], options);
    expect(second.exitCode).toBe(0);
    expect(stub.critCallCount()).toBe(PAIRS.length);

    const replay = await runCompare(["--replay", "--skill-commit", COMMIT], {
      ...options,
      runClaude: throwingRunner,
    });
    expect(replay.exitCode).toBe(0);
    for (const pair of PAIRS) {
      expect(replay.text).toContain(pair.pair_id);
    }
    // Every crit says version 1, so a pair agrees when version 1 is the image the person preferred.
    let agreed = 0;
    for (const pair of PAIRS) {
      const versionOne = afterFirst(pair.pair_id) ? "after" : "before";
      if (versionOne === pair.preference) {
        agreed += 1;
      }
    }
    const disagreed = PAIRS.length - agreed;
    const rate = (agreed / PAIRS.length).toFixed(3);
    expect(replay.text).toContain(
      `agreed ${agreed}, disagreed ${disagreed}, undecided 0, rate ${rate}`,
    );
    expect(replay.text).toContain(JEV_FIGURES_LINE);
    const tableLines = replay.text
      .split("\n")
      .filter((line) =>
        PAIRS.some((pair) => line.startsWith(`${pair.pair_id} `)),
      );
    expect(tableLines).toHaveLength(PAIRS.length);

    const [removedKey] = readdirSync(join(options.runsDirectory, COMMIT));
    rmSync(join(options.runsDirectory, COMMIT, removedKey as string), {
      recursive: true,
    });
    const partial = await runCompare(["--replay", "--skill-commit", COMMIT], {
      ...options,
      runClaude: throwingRunner,
    });
    expect(partial.exitCode).toBe(2);
    expect(partial.errorText).toContain(`key ${removedKey}`);
    expect(partial.errorText).toContain("for 1 pair;");
    expect(partial.text).toContain("missing");
  });

  it("exits 2 on a replay with an empty runs folder and starts no child process", async () => {
    const options = makeOptions(throwingRunner);
    const output = await runCompare(
      ["--replay", "--skill-commit", COMMIT],
      options,
    );
    expect(output.exitCode).toBe(2);
    expect(output.errorText).toContain(`for ${PAIRS.length} pairs`);
    for (const pair of PAIRS) {
      expect(output.errorText).toContain(pair.pair_id);
    }
  });
});
