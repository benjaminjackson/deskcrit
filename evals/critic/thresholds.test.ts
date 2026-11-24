// Unit tests of the threshold evaluation (crit-576.13). The manifest check reads the committed
// pages, images, and facts files with no browser. A plain stub stands in for the `claude` child
// process, for the critic and both judge questions, so no model is asked (CS-21, CS-22). Each live
// test writes runs into its own temporary folder, which afterEach removes, and passes
// --skill-commit, so no test depends on the git state of the skill folder.

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { ClaudeRunner, SavedCrit } from "./run-critic.ts";
import {
  buildNumberQuestion,
  buildThresholdDetectionQuestion,
  CASES,
  checkManifest,
  countRanked,
  DEFECTS,
  parseThresholdDetectionAnswer,
  readManifest,
  runThresholds,
  scoreCall,
} from "./thresholds.ts";

const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const REPOSITORY_DIRECTORY = join(import.meta.dirname, "..", "..");
const SKILL_DIRECTORY = join(
  REPOSITORY_DIRECTORY,
  "plugin",
  "skills",
  "design-critic",
);

/** The temp folders this test file made; afterEach removes them. */
const temporaryFolders: string[] = [];

afterEach(() => {
  for (const folder of temporaryFolders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

/** Makes a new empty temp folder for one test. */
function newFolder(): string {
  const folder = mkdtempSync(join(tmpdir(), "crit-thresholds-test-"));
  temporaryFolders.push(folder);
  return folder;
}

/** A runner that fails the test if anything calls it. */
const throwingRunner: ClaudeRunner = async () => {
  throw new Error("the runner must not be called");
};

/** A crit in the shape critic.md asks for, with two ranked findings. */
const STUB_CRIT = `**Verdict.** Fine.

**What would move it most**

1. The paragraph text looks faint.
2. The heading wraps badly.

**Smaller things**

- None worth more.
`;

/** Returns stdout in the shape a judge call prints, holding the given answer. */
function judgeStdout(answer: unknown): string {
  return JSON.stringify({
    type: "result",
    subtype: "success",
    is_error: false,
    result: JSON.stringify(answer),
    structured_output: answer,
    total_cost_usd: 0.01,
    modelUsage: { "claude-opus-5-5": {} },
    permission_denials: [],
  });
}

/** Returns stdout in the shape a critic call prints, holding the given crit. */
function criticStdout(crit: string): string {
  return JSON.stringify({
    type: "result",
    subtype: "success",
    is_error: false,
    result: crit,
    modelUsage: { "claude-opus-5-5": {} },
  });
}

/** A saved crit for the prompt tests. */
function savedCrit(crit: string): SavedCrit {
  return {
    runNumber: 1,
    critPath: "/fake/1.md",
    metadataPath: "/fake/1.json",
    crit,
    metadata: {},
  };
}

describe("the committed threshold cases", () => {
  it("match CASES, their files, their bands, and their facts, with no topic hint", () => {
    const entries = readManifest(REPOSITORY_DIRECTORY);
    expect(checkManifest(REPOSITORY_DIRECTORY, entries)).toEqual([]);
    expect(entries.map((entry) => entry.id)).toEqual(
      CASES.map((spec) => spec.id),
    );
  });

  it("holds 3 exempt cases that expect no defect, 3 harm cases that expect one, and one near pair per rule", () => {
    const count = (kind: string, expected: string) =>
      CASES.filter((spec) => spec.kind === kind && spec.expected === expected)
        .length;
    expect(count("exempt", "absent")).toBe(3);
    expect(count("harm", "present")).toBe(3);
    expect(count("near", "present")).toBe(3);
    expect(count("near", "absent")).toBe(3);
  });
});

describe("the judge questions", () => {
  it("name each defect in words, with no rule number, case id, or file name", () => {
    for (const [defectId, defect] of Object.entries(DEFECTS)) {
      const crit = savedCrit("A crit.");
      for (const question of [
        buildThresholdDetectionQuestion(defect, "key", crit),
        buildNumberQuestion(defect, "key", crit),
      ]) {
        const promptWithoutCrit = question.prompt.replace("A crit.", "");
        // The rules' numbers: 4.5 and 3 (contrast), 24 (target size), 45 and 75 (line length).
        expect(promptWithoutCrit).not.toMatch(/4\.5|\b3\b|24|45|75/);
        expect(promptWithoutCrit).not.toContain(defectId);
        expect(promptWithoutCrit).not.toMatch(/\.png|\.html|near|exempt|harm/);
      }
    }
  });

  it("accepts uncertain and the four places, and rejects anything else", () => {
    expect(
      parseThresholdDetectionAnswer({
        reason: "r",
        says_defect: "uncertain",
        where_raised: "smaller_things",
      }).says_defect,
    ).toBe("uncertain");
    expect(() =>
      parseThresholdDetectionAnswer({
        reason: "r",
        says_defect: "maybe",
        where_raised: "ranked",
      }),
    ).toThrow();
    expect(() =>
      parseThresholdDetectionAnswer({
        reason: "r",
        says_defect: "present",
        where_raised: "top",
      }),
    ).toThrow();
  });
});

describe("scoring", () => {
  it("counts uncertain on its own, never as right or wrong", () => {
    expect(scoreCall("present", "present")).toBe("right");
    expect(scoreCall("present", "not_mentioned")).toBe("wrong");
    expect(scoreCall("absent", "not_mentioned")).toBe("right");
    expect(scoreCall("absent", "present")).toBe("wrong");
    expect(scoreCall("absent", "uncertain")).toBe("uncertain");
    expect(scoreCall("present", "uncertain")).toBe("uncertain");
  });

  it("counts the ranked findings of a crit, and gives undefined when the list cannot be read", () => {
    expect(countRanked(STUB_CRIT)).toBe(2);
    expect(countRanked("No headings at all.")).toBeUndefined();
  });
});

describe("runThresholds with a stub critic and a stub judge", () => {
  it("makes 3 crits per image and condition, asks the judges, and replays the same report with no call", async () => {
    const runsDirectory = newFolder();
    let criticCalls = 0;
    let detectionCalls = 0;
    let numberCalls = 0;
    const stub: ClaudeRunner = async (args) => {
      if (args[0] === "--version") {
        return { stdout: "2.0.0 (Claude Code)", stderr: "", exitCode: 0 };
      }
      const schemaIndex = args.indexOf("--json-schema");
      if (schemaIndex >= 0) {
        const schema = args[schemaIndex + 1] ?? "";
        if (schema.includes("where_raised")) {
          detectionCalls += 1;
          return {
            stdout: judgeStdout({
              reason: "stub",
              says_defect: "present",
              where_raised: "ranked",
            }),
            stderr: "",
            exitCode: 0,
          };
        }
        numberCalls += 1;
        return {
          stdout: judgeStdout({
            reason: "stub",
            states_number: true,
            value: 4,
          }),
          stderr: "",
          exitCode: 0,
        };
      }
      criticCalls += 1;
      return { stdout: criticStdout(STUB_CRIT), stderr: "", exitCode: 0 };
    };
    const options = {
      repositoryDirectory: REPOSITORY_DIRECTORY,
      runsDirectory,
      skillDirectory: SKILL_DIRECTORY,
      runClaude: stub,
    };
    const live = await runThresholds(["--skill-commit", COMMIT], options);
    expect(live.errorText).toBe("");
    expect(live.exitCode).toBe(0);
    const crits = CASES.length * 2 * 3;
    // The photo case is measured from the screenshot, so its crits get no number question.
    const withNumbers = CASES.filter(
      (spec) => spec.measuredFrom === "facts",
    ).length;
    expect(criticCalls).toBe(crits);
    expect(detectionCalls).toBe(crits);
    expect(numberCalls).toBe(withNumbers * 2 * 3);
    expect(live.text).toContain("calls by case kind");
    expect(live.text).toContain("crowd-out");

    const replayed = await runThresholds(
      ["--replay", "--skill-commit", COMMIT],
      { ...options, runClaude: throwingRunner },
    );
    expect(replayed.exitCode).toBe(0);
    expect(replayed.text).toBe(live.text);
  });

  it("counts a failed critic run, goes on with the others, and exits 2", async () => {
    const runsDirectory = newFolder();
    let criticCalls = 0;
    const stub: ClaudeRunner = async (args) => {
      if (args[0] === "--version") {
        return { stdout: "2.0.0 (Claude Code)", stderr: "", exitCode: 0 };
      }
      if (args.includes("--json-schema")) {
        return {
          stdout: judgeStdout({
            reason: "stub",
            says_defect: "absent",
            where_raised: "not_raised",
            states_number: false,
            value: 0,
          }),
          stderr: "",
          exitCode: 0,
        };
      }
      criticCalls += 1;
      if (criticCalls === 1) {
        return { stdout: "", stderr: "refusal", exitCode: 1 };
      }
      return { stdout: criticStdout(STUB_CRIT), stderr: "", exitCode: 0 };
    };
    const output = await runThresholds(["--skill-commit", COMMIT], {
      repositoryDirectory: REPOSITORY_DIRECTORY,
      runsDirectory,
      skillDirectory: SKILL_DIRECTORY,
      runClaude: stub,
    });
    expect(output.exitCode).toBe(2);
    expect(output.errorText).toMatch(/^critic run failed: /);
    expect(output.errorText).toContain("missing crits: ");
  });

  it("exits 2 on an empty runs folder in replay", async () => {
    const output = await runThresholds(["--replay", "--skill-commit", COMMIT], {
      repositoryDirectory: REPOSITORY_DIRECTORY,
      runsDirectory: newFolder(),
      skillDirectory: SKILL_DIRECTORY,
      runClaude: throwingRunner,
    });
    expect(output.exitCode).toBe(2);
    expect(output.errorText).toContain("missing crits: exempt-disabled-text");
  });
});
