// The compare agreement script (EV-9, FR-35, FR-37, OQ-9). It runs the built `crit compare --json`
// bundle as a child process on each before-and-after pair in evals/compare-pairs/labels.json, with
// the same three first-party packs and the pinned model for every pair, checks every document
// against schemas/compare.schema.json, and scores each pair's changes against the human
// preference. It imports no stage code (AC-6, CS-21).
//
// Live mode (`npm run test:live:compare`) asks TypeSafe only for the pairs that have no saved
// answers file of the pinned model yet, and saves each with --save-answers as
// evals/compare-pairs/runs/<model>/<pair-id>.answers.json. It never writes a saved file again.
// Replay mode (`npm run eval:compare`) scores every saved file with --answers, needs no key, and
// makes no network call (FR-42).
//
// Usage: node evals/agreement/run-compare.ts [--live]
// It refuses to start while any pair has a null preference, because only Benjamin Jackson writes
// the preferences (EV-5). Exit 0 when the agreement rate is at or above AGREEMENT_FLOOR, 1 when it
// is below, and 2 when the script could not run (FR-24, OQ-9).

import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import type {
  CompareSkipped,
  CompareSummary,
  CriterionChange,
} from "../../src/index.ts";
import { formatTable } from "../support/format-table.ts";
import {
  compileCompareValidator,
  readPinnedModel,
} from "../support/pinned-model-and-schema.ts";
import { type CritRun, runCritBundle } from "../support/run-crit-bundle.ts";
import {
  addUsage,
  type RunUsage,
  type UsageTotals,
} from "../support/usage-totals.ts";
import {
  findUnlabelledPairs,
  type HumanPreference,
  type LabelledPair,
  readLabelledPairs,
} from "./compare-labels.ts";
import {
  type AgreementSummary,
  meetsAgreementFloor,
  type PairScore,
  scorePair,
  summariseAgreement,
} from "./compare-score.ts";
import { AGREEMENT_FLOOR, findSingleModel } from "./score.ts";

const DEFAULT_HARNESS_DIRECTORY = import.meta.dirname;
const REPOSITORY_DIRECTORY = resolve(DEFAULT_HARNESS_DIRECTORY, "..", "..");
const REPORT_SCHEMA_PATH = join(
  REPOSITORY_DIRECTORY,
  "schemas",
  "report.schema.json",
);
const COMPARE_SCHEMA_PATH = join(
  REPOSITORY_DIRECTORY,
  "schemas",
  "compare.schema.json",
);

/** The first-party packs every pair runs with, so every pair has the same packs (FR-35, EV-9). */
const COMPARE_PACK_NAMES: readonly string[] = [
  "basics",
  "layout",
  "typography",
];

const EXIT_CODE_AGREED = 0;
const EXIT_CODE_BELOW_FLOOR = 1;
const EXIT_CODE_COULD_NOT_RUN = 2;

/** The compare document fields the script reads. Ajv checks the whole document against the schema first. */
type CompareDocument = {
  readonly model: string;
  readonly changes: readonly CriterionChange[];
  readonly skipped: readonly CompareSkipped[];
  readonly summary: CompareSummary;
  readonly usage: RunUsage;
};

// The test reads CritRun from this file, so it is re-exported from the shared runner.
export type { CritRun };

/**
 * Runs `crit` with these arguments and environment, in the working directory given. The script
 * runs the built bundle; a test passes a stub runner, so no request reaches TypeSafe.
 */
export type CritRunner = (
  critArguments: readonly string[],
  environment: NodeJS.ProcessEnv,
  workingDirectory: string,
) => Promise<CritRun>;

/** The files the script reads and writes, and how it runs crit. Tests point them at a temporary folder. */
export type CompareHarnessOptions = {
  /** The folder with the .crit.yaml that pins the model; crit runs with it as its working directory. */
  readonly harnessDirectory: string;
  /** The folder that image paths in the label file and the pack names are relative to. */
  readonly repositoryDirectory: string;
  readonly labelsPath: string;
  /** The folder that holds one folder of saved answers files per model id. */
  readonly runsDirectory: string;
  readonly runCrit: CritRunner;
};

/** The options of the real script: evals/agreement, the repository, evals/compare-pairs/, and the built bundle. */
const DEFAULT_OPTIONS: CompareHarnessOptions = {
  harnessDirectory: DEFAULT_HARNESS_DIRECTORY,
  repositoryDirectory: REPOSITORY_DIRECTORY,
  labelsPath: join(
    REPOSITORY_DIRECTORY,
    "evals",
    "compare-pairs",
    "labels.json",
  ),
  runsDirectory: join(REPOSITORY_DIRECTORY, "evals", "compare-pairs", "runs"),
  runCrit: runCritBundle,
};

/** One pair after its run: the pair, its compare document, and its score (EV-9). */
type PairResult = {
  readonly pair: LabelledPair;
  readonly preference: HumanPreference;
  readonly document: CompareDocument;
  readonly score: PairScore;
};

/**
 * Run the script and set the exit code: 2 when any step could not run, 1 when the agreement rate
 * is below the floor, and 0 otherwise. Output is written once at the end, so a stopped run prints
 * no partial score (EV-9, FR-24).
 */
export async function main(
  argv: readonly string[] = process.argv.slice(2),
  options: CompareHarnessOptions = DEFAULT_OPTIONS,
): Promise<void> {
  try {
    const output = await runCompareHarness(argv, options);
    process.stdout.write(output.text);
    process.exitCode = output.exitCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`compare agreement stopped: ${message}\n`);
    process.exitCode = EXIT_CODE_COULD_NOT_RUN;
  }
}

/**
 * Read and check the label file, refuse a null preference, refuse live mode without the key, and
 * refuse a replay with a pair that has no saved answers, all before crit runs. Then run crit
 * compare on every pair, check each document, score it, and return the text to print with its
 * exit code (EV-9, EV-5, EV-2, FR-35, FR-42, CS-21).
 */
export async function runCompareHarness(
  argv: readonly string[],
  options: CompareHarnessOptions,
): Promise<{ text: string; exitCode: number }> {
  const parsed = parseArgs({
    args: [...argv],
    options: { live: { type: "boolean", default: false } },
    strict: true,
    allowPositionals: false,
  });
  const live = parsed.values.live ?? false;
  const pairs = readLabelledPairs(
    basename(options.labelsPath),
    readFileSync(options.labelsPath, "utf8"),
  );
  const unlabelled = findUnlabelledPairs(pairs);
  if (unlabelled.length > 0) {
    throw new Error(
      `${unlabelled.length} pairs have no human preference yet, and only Benjamin Jackson writes them: ${unlabelled.join(", ")}`,
    );
  }
  if (live && !isApiKeyPresent()) {
    throw new Error(
      "TYPESAFE_API_KEY is not set. Live mode asks TypeSafe and needs the key; no request was sent. Use npm run eval:compare to score saved answers with no key.",
    );
  }
  const pinnedModel = readPinnedModel(options.harnessDirectory);
  const modelRunsDirectory = join(options.runsDirectory, pinnedModel);
  if (!live) {
    const missing: string[] = [];
    for (const pair of pairs) {
      if (!existsSync(answersPathFor(modelRunsDirectory, pair))) {
        missing.push(pair.pair_id);
      }
    }
    if (missing.length > 0) {
      throw new Error(
        `no saved answers of ${pinnedModel} for ${missing.length} pairs, so replay cannot score them; run npm run test:live:compare with the key: ${missing.join(", ")}`,
      );
    }
  }
  const validateCompare = compileCompareValidator<CompareDocument>(
    REPORT_SCHEMA_PATH,
    COMPARE_SCHEMA_PATH,
  );
  const usageTotals: UsageTotals = {
    requests: 0,
    input_tokens: 0,
    cost_usd: 0,
    latency_ms: 0,
  };
  const modelIds: string[] = [];
  const results: PairResult[] = [];
  for (const pair of pairs) {
    const document = await runCompareOnPair(
      options,
      modelRunsDirectory,
      pair,
      validateCompare,
    );
    addUsage(usageTotals, document.usage);
    modelIds.push(document.model);
    for (const change of document.changes) {
      modelIds.push(change.model);
    }
    // The null check above refused every null preference, so this branch never runs; it lets
    // TypeScript treat the preference as a HumanPreference below.
    if (pair.preference === null) {
      throw new Error(`pair ${pair.pair_id} has no human preference`);
    }
    const skippedCriteria = document.skipped.map((entry) => entry.criterion);
    let score: PairScore;
    try {
      score = scorePair(
        pair.targets,
        document.changes,
        skippedCriteria,
        pair.preference,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`pair ${pair.pair_id}: ${message}`);
    }
    results.push({ pair, preference: pair.preference, document, score });
  }
  const model = findSingleModel(pinnedModel, modelIds);
  const summary = summariseAgreement(
    results.map((result) => result.score.outcome),
  );
  const sections = [
    formatHeader(live, results.length, model, usageTotals),
    formatPairTable(results),
    formatSummary(summary),
  ];
  const exitCode = meetsAgreementFloor(summary)
    ? EXIT_CODE_AGREED
    : EXIT_CODE_BELOW_FLOOR;
  return { text: `${sections.join("\n\n")}\n`, exitCode };
}

/** Return the saved answers file of one pair for the pinned model: <runs>/<model>/<pair-id>.answers.json (FR-42). */
function answersPathFor(
  modelRunsDirectory: string,
  pair: LabelledPair,
): string {
  return join(modelRunsDirectory, `${pair.pair_id}.answers.json`);
}

/**
 * Run crit compare on one pair with the three first-party packs and --json, and return the checked
 * document. A pair with a saved answers file is replayed with --answers and no key in crit's
 * environment, so crit cannot reach TypeSafe. A pair without one is asked once with
 * --save-answers, which only live mode reaches, so no saved file is written twice. Any exit code
 * but 0, output that is not JSON, or a document that fails the compare schema stops the script and
 * names the pair (EV-9, EV-2, FR-35, FR-42, FR-43).
 */
async function runCompareOnPair(
  options: CompareHarnessOptions,
  modelRunsDirectory: string,
  pair: LabelledPair,
  validateCompare: ReturnType<typeof compileCompareValidator<CompareDocument>>,
): Promise<CompareDocument> {
  const critArguments = [
    "compare",
    join(options.repositoryDirectory, pair.before),
    join(options.repositoryDirectory, pair.after),
  ];
  for (const packName of COMPARE_PACK_NAMES) {
    critArguments.push(
      "--pack",
      join(options.repositoryDirectory, "packs", packName),
    );
  }
  critArguments.push("--json");
  // A copy of the environment; replay removes the key so crit cannot reach TypeSafe (FR-42).
  const environment = { ...process.env };
  const answersPath = answersPathFor(modelRunsDirectory, pair);
  if (existsSync(answersPath)) {
    critArguments.push("--answers", answersPath);
    delete environment.TYPESAFE_API_KEY;
  } else {
    mkdirSync(modelRunsDirectory, { recursive: true });
    critArguments.push("--save-answers", answersPath);
  }
  const run = await options.runCrit(
    critArguments,
    environment,
    options.harnessDirectory,
  );
  if (run.exitCode !== 0) {
    throw new Error(
      `pair ${pair.pair_id}: crit compare exited ${String(run.exitCode)}: ${run.stderr.trim()}`,
    );
  }
  let document: unknown;
  try {
    document = JSON.parse(run.stdout);
  } catch {
    throw new Error(`pair ${pair.pair_id}: crit compare did not write JSON`);
  }
  if (!validateCompare(document)) {
    const errors = JSON.stringify(validateCompare.errors);
    throw new Error(
      `pair ${pair.pair_id}: the compare document does not match ${COMPARE_SCHEMA_PATH}: ${errors}`,
    );
  }
  return document;
}

/** Say whether TYPESAFE_API_KEY is set, without reading its value into any output (CS-19, NFR-14). */
function isApiKeyPresent(): boolean {
  const key = process.env.TYPESAFE_API_KEY;
  return key !== undefined && key !== "";
}

/**
 * Format the header: the mode, the number of pairs, the model id from the documents' top-level
 * `model`, and the requests, input tokens, cost in US dollars, and latency summed over both runs
 * of every pair (FR-26, FR-33).
 */
function formatHeader(
  live: boolean,
  pairCount: number,
  model: string,
  usage: UsageTotals,
): string {
  const inputTokens =
    usage.input_tokens === null ? "unknown" : String(usage.input_tokens);
  const cost =
    usage.cost_usd === null ? "unknown" : `$${usage.cost_usd.toFixed(5)}`;
  const lines = [
    "Compare agreement (EV-9)",
    `Mode: ${live ? "live (asked TypeSafe for pairs with no saved answers)" : "replay (saved answers, no network call)"}`,
    `Pairs: ${pairCount}`,
    `Packs: ${COMPARE_PACK_NAMES.join(", ")}`,
    `Model: ${model}`,
    `Usage: ${usage.requests} requests, ${inputTokens} input tokens, ${cost}, ${Math.round(usage.latency_ms)} ms`,
  ];
  return lines.join("\n");
}

/**
 * Format one row per pair: its id, targets, preference, the change of each scored criterion, the
 * outcome, and the document's summary counts. For a pair with no target, the change column lists
 * only the criteria whose change is not same (EV-9, FR-39).
 */
function formatPairTable(results: readonly PairResult[]): string {
  const headers = [
    "pair",
    "targets",
    "preference",
    "target change",
    "outcome",
    "better/worse/same/uncertain",
  ];
  const rows: string[][] = [];
  for (const result of results) {
    const targets =
      result.pair.targets.length === 0
        ? "(none)"
        : result.pair.targets.join(", ");
    const summary = result.document.summary;
    const counts = `${summary.improved}/${summary.regressed}/${summary.same}/${summary.uncertain}`;
    rows.push([
      result.pair.pair_id,
      targets,
      result.preference,
      formatScoredChanges(result),
      result.score.outcome,
      counts,
    ]);
  }
  return formatTable(headers, rows);
}

/**
 * Format the scored changes of one pair: each target's change, or for a pair with no target, each
 * criterion that did not come out same, or "all same" when none did (EV-9).
 */
function formatScoredChanges(result: PairResult): string {
  if (result.pair.targets.length > 0) {
    const parts: string[] = [];
    for (const entry of result.score.scored) {
      parts.push(entry.change);
    }
    return parts.join(", ");
  }
  const parts: string[] = [];
  for (const entry of result.score.scored) {
    if (entry.change !== "same") {
      parts.push(`${entry.criterion}: ${entry.change}`);
    }
  }
  if (parts.length === 0) {
    return "all same";
  }
  return parts.join(", ");
}

/**
 * Format the counts of agreed, disagreed, and uncertain pairs, the agreement rate, and whether the
 * rate meets AGREEMENT_FLOOR, the floor OQ-9 set (EV-9, FR-37, OQ-9).
 */
function formatSummary(summary: AgreementSummary): string {
  const rate = summary.rate === null ? "none" : summary.rate.toFixed(3);
  const floorResult = meetsAgreementFloor(summary) ? "met" : "not met";
  const lines = [
    `Agreed: ${summary.agreed}, disagreed: ${summary.disagreed}, uncertain: ${summary.uncertain}, total: ${summary.total}`,
    `Agreement rate: ${rate} (${summary.agreed} of ${summary.total}; uncertain counts as not agreeing)`,
    `Floor: ${AGREEMENT_FLOOR} (OQ-9), ${floorResult}`,
  ];
  return lines.join("\n");
}

// Run only when node starts this file, not when a test imports it.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
