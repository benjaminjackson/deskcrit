// The compare agreement script end to end with a stub runner that returns canned compare
// documents, so crit never runs and no request reaches TypeSafe (EV-9, CS-22). The labels are
// written inside the test into a temporary folder, never read from evals/compare-pairs/.

import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HumanPreference } from "./compare-labels.ts";
import {
  type CompareHarnessOptions,
  type CritRun,
  runCompareHarness,
} from "./run-compare.ts";

/** The repository root, for the golden compare document the stub runner returns. */
const REPOSITORY_ROOT = join(import.meta.dirname, "..", "..");

/**
 * A valid compare document from the golden cases. Its changes are worse for
 * compare/faint-body-text, uncertain for compare/faint-chart-labels, same for compare/line-length,
 * and better for compare/single-focal-point (FR-36, FR-37).
 */
const GOLDEN_COMPARE_STDOUT = readFileSync(
  join(
    REPOSITORY_ROOT,
    "evals",
    "golden",
    "cases",
    "compare-better-json",
    "expected.stdout",
  ),
  "utf8",
);

/** The model the golden document carries, pinned in the test's .crit.yaml. */
const MODEL = "jev-1.14.0";

/** One label entry the test writes: a pair id, its targets, and its preference. */
type TestPair = {
  readonly id: string;
  readonly targets: readonly string[];
  readonly preference: HumanPreference | null;
};

/** One call the stub runner received. */
type RunnerCall = {
  readonly critArguments: readonly string[];
  readonly environment: NodeJS.ProcessEnv;
};

let temporaryDirectory = "";

beforeEach(() => {
  temporaryDirectory = mkdtempSync(join(tmpdir(), "crit-run-compare-"));
  writeFileSync(join(temporaryDirectory, ".crit.yaml"), `model: ${MODEL}\n`);
});

afterEach(() => {
  rmSync(temporaryDirectory, { recursive: true, force: true });
  vi.unstubAllEnvs();
});

/** Build thirty pairs that all target compare/single-focal-point, the first `afterCount` preferring after and the rest before. */
function thirtyPairs(afterCount: number): TestPair[] {
  const pairs: TestPair[] = [];
  for (let index = 1; index <= 30; index += 1) {
    const preference: HumanPreference =
      index <= afterCount ? "after" : "before";
    pairs.push({
      id: `pair-${index}`,
      targets: ["compare/single-focal-point"],
      preference,
    });
  }
  return pairs;
}

/** Write labels.json into the temporary folder and return the options that point at it and at `runCrit`. */
function writeLabels(
  pairs: readonly TestPair[],
  calls: RunnerCall[],
): CompareHarnessOptions {
  const entries = pairs.map((pair) => ({
    pair_id: pair.id,
    before: `images/${pair.id}.before.png`,
    after: `images/${pair.id}.after.png`,
    targets: pair.targets,
    preference: pair.preference,
  }));
  const labelsPath = join(temporaryDirectory, "labels.json");
  writeFileSync(labelsPath, JSON.stringify(entries));
  return {
    harnessDirectory: temporaryDirectory,
    repositoryDirectory: temporaryDirectory,
    labelsPath,
    runsDirectory: join(temporaryDirectory, "runs"),
    runCrit: async (critArguments, environment): Promise<CritRun> => {
      calls.push({ critArguments, environment });
      return { stdout: GOLDEN_COMPARE_STDOUT, stderr: "", exitCode: 0 };
    },
  };
}

/** Write an empty saved answers file for each pair, so the script replays them. */
function writeSavedAnswers(pairs: readonly TestPair[]): void {
  const modelDirectory = join(temporaryDirectory, "runs", MODEL);
  mkdirSync(modelDirectory, { recursive: true });
  for (const pair of pairs) {
    writeFileSync(join(modelDirectory, `${pair.id}.answers.json`), "{}");
  }
}

describe("runCompareHarness", () => {
  it("refuses a null preference, names every such pair, and never runs crit", async () => {
    const pairs = thirtyPairs(30);
    pairs[3] = { ...pairs[3], id: "pair-4", targets: [], preference: null };
    pairs[7] = { ...pairs[7], id: "pair-8", targets: [], preference: null };
    const calls: RunnerCall[] = [];
    const options = writeLabels(pairs, calls);
    await expect(runCompareHarness([], options)).rejects.toThrow(
      "2 pairs have no human preference yet, and only Benjamin Jackson writes them: pair-4, pair-8",
    );
    expect(calls).toHaveLength(0);
  });

  it("refuses live mode with no key and runs nothing", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "");
    const calls: RunnerCall[] = [];
    const options = writeLabels(thirtyPairs(30), calls);
    await expect(runCompareHarness(["--live"], options)).rejects.toThrow(
      "TYPESAFE_API_KEY is not set",
    );
    expect(calls).toHaveLength(0);
  });

  it("refuses a replay with a pair that has no saved answers, before crit runs", async () => {
    const pairs = thirtyPairs(30);
    writeSavedAnswers(pairs.slice(1));
    const calls: RunnerCall[] = [];
    const options = writeLabels(pairs, calls);
    await expect(runCompareHarness([], options)).rejects.toThrow(
      "no saved answers of jev-1.14.0 for 1 pairs, so replay cannot score them; run npm run test:live:compare with the key: pair-1",
    );
    expect(calls).toHaveLength(0);
  });

  it("replays saved answers with no key and exits 0 at the floor", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "test-key");
    const pairs = thirtyPairs(24);
    writeSavedAnswers(pairs);
    const calls: RunnerCall[] = [];
    const options = writeLabels(pairs, calls);
    const output = await runCompareHarness([], options);
    expect(output.exitCode).toBe(0);
    expect(calls).toHaveLength(30);
    const firstCall = calls[0];
    expect(firstCall?.environment.TYPESAFE_API_KEY).toBeUndefined();
    expect(firstCall?.critArguments).toEqual([
      "compare",
      join(temporaryDirectory, "images", "pair-1.before.png"),
      join(temporaryDirectory, "images", "pair-1.after.png"),
      "--pack",
      join(temporaryDirectory, "packs", "basics"),
      "--pack",
      join(temporaryDirectory, "packs", "layout"),
      "--pack",
      join(temporaryDirectory, "packs", "typography"),
      "--json",
      "--answers",
      join(temporaryDirectory, "runs", MODEL, "pair-1.answers.json"),
    ]);
    expect(output.text).toContain("Model: jev-1.14.0");
    expect(output.text).toContain(
      "Agreed: 24, disagreed: 6, uncertain: 0, total: 30",
    );
    expect(output.text).toContain("Agreement rate: 0.800 (24 of 30");
    expect(output.text).toContain("Floor: 0.8 (OQ-9), met");
    const lines = output.text.split("\n");
    expect(lines).toContain(
      "pair-1   compare/single-focal-point  after       better         agree     1/1/1/1",
    );
    expect(lines).toContain(
      "pair-30  compare/single-focal-point  before      better         disagree  1/1/1/1",
    );
  });

  it("exits 1 below the floor", async () => {
    const pairs = thirtyPairs(23);
    writeSavedAnswers(pairs);
    const options = writeLabels(pairs, []);
    const output = await runCompareHarness([], options);
    expect(output.exitCode).toBe(1);
    expect(output.text).toContain("Floor: 0.8 (OQ-9), not met");
  });

  it("lists the changed criteria of a pair with no target, which is uncertain or disagrees", async () => {
    const pairs = thirtyPairs(30);
    pairs[0] = { id: "pair-1", targets: [], preference: "same" };
    writeSavedAnswers(pairs);
    const output = await runCompareHarness([], writeLabels(pairs, []));
    expect(output.text).toContain(
      "compare/faint-body-text: worse, compare/faint-chart-labels: uncertain, compare/single-focal-point: better",
    );
    expect(output.text).toContain(
      "Agreed: 29, disagreed: 1, uncertain: 0, total: 30",
    );
  });

  it("asks live with --save-answers only for a pair with no saved file, and passes the key", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "test-key");
    const pairs = thirtyPairs(30);
    writeSavedAnswers(pairs.slice(1));
    const calls: RunnerCall[] = [];
    const output = await runCompareHarness(
      ["--live"],
      writeLabels(pairs, calls),
    );
    expect(output.exitCode).toBe(0);
    const savingCalls = calls.filter((call) =>
      call.critArguments.includes("--save-answers"),
    );
    expect(savingCalls).toHaveLength(1);
    expect(savingCalls[0]?.critArguments.at(-1)).toBe(
      join(temporaryDirectory, "runs", MODEL, "pair-1.answers.json"),
    );
    expect(savingCalls[0]?.environment.TYPESAFE_API_KEY).toBe("test-key");
  });

  it("stops when crit compare does not exit 0, and when the document fails the compare schema", async () => {
    const pairs = thirtyPairs(30);
    writeSavedAnswers(pairs);
    const failing = writeLabels(pairs, []);
    const failingOptions: CompareHarnessOptions = {
      ...failing,
      runCrit: async () => ({ stdout: "", stderr: "bad", exitCode: 2 }),
    };
    await expect(runCompareHarness([], failingOptions)).rejects.toThrow(
      "pair pair-1: crit compare exited 2: bad",
    );
    const invalidOptions: CompareHarnessOptions = {
      ...failing,
      runCrit: async () => ({
        stdout: JSON.stringify({ mode: "compare" }),
        stderr: "",
        exitCode: 0,
      }),
    };
    await expect(runCompareHarness([], invalidOptions)).rejects.toThrow(
      "pair pair-1: the compare document does not match",
    );
  });

  it("stops when a document carries another model than .crit.yaml pins", async () => {
    writeFileSync(join(temporaryDirectory, ".crit.yaml"), "model: jev-9.9.9\n");
    const pairs = thirtyPairs(30);
    const modelDirectory = join(temporaryDirectory, "runs", "jev-9.9.9");
    mkdirSync(modelDirectory, { recursive: true });
    for (const pair of pairs) {
      writeFileSync(join(modelDirectory, `${pair.id}.answers.json`), "{}");
    }
    await expect(runCompareHarness([], writeLabels(pairs, []))).rejects.toThrow(
      "the run carries model jev-1.14.0, but .crit.yaml pins jev-9.9.9",
    );
  });
});
