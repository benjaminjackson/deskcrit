// The wobble check (EV-6, NFR-5, OQ-10). Run once each time the pinned model version changes. It
// runs the built `crit report --json` bundle 5 times as a child process on one image with the 17
// M-1 spike questions (pack.yaml), then prints how far each question's option probabilities and
// reported confidence moved between runs. It imports no stage code (AC-6, CS-21).
//
// Usage: node evals/wobble/run-wobble.ts
// Exit 0 when the default min_confidence (0.5) sits above the largest confidence movement, 1 when
// it does not, and 2 when the check could not run (no TYPESAFE_API_KEY, no bundle, a crit failure).
// It asks TypeSafe 5 times, so it needs the key and is never part of npm run ci.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import { parseDocument } from "yaml";
import {
  measureQuestionMovement,
  type Observation,
  type QuestionMovement,
  summarizeWobble,
} from "./movement.ts";

const WOBBLE_DIRECTORY = import.meta.dirname;
const REPOSITORY_DIRECTORY = resolve(WOBBLE_DIRECTORY, "..", "..");
const CRIT_BUNDLE_PATH = join(REPOSITORY_DIRECTORY, "dist", "crit.js");
const REPORT_SCHEMA_PATH = join(
  REPOSITORY_DIRECTORY,
  "schemas",
  "report.schema.json",
);
const IMAGE_PATH = join(WOBBLE_DIRECTORY, "slice.png");

/** How many times crit is run on the image (EV-6). */
const RUN_COUNT = 5;

/** The model id FR-22 forbids a pin to, because it changes under the user (NFR-6). */
const FLOATING_MODEL_ID = "jev-latest";

const EXIT_CODE_HOLDS = 0;
const EXIT_CODE_DOES_NOT_HOLD = 1;
const EXIT_CODE_COULD_NOT_RUN = 2;

/** The report fields the check reads. Ajv checks the whole document against the schema first. */
type ReportDocument = {
  readonly model: string;
  readonly findings: readonly {
    readonly criterion: string;
    readonly distribution: Readonly<Record<string, number>>;
    readonly confidence: number | null;
  }[];
  readonly usage: { readonly cost_usd: number | null };
};

/**
 * Run the check and set the exit code. Output is written once at the end, so a stopped run prints
 * no partial numbers (EV-6, FR-24).
 */
function main(): void {
  try {
    const output = runCheck();
    process.stdout.write(output.text);
    process.exitCode = output.exitCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`wobble check stopped: ${message}\n`);
    process.exitCode = EXIT_CODE_COULD_NOT_RUN;
  }
}

/**
 * Refuse a missing key before any network call, run crit 5 times, measure the movement of each
 * question, and return the text to print with its exit code (EV-6, OQ-10).
 */
function runCheck(): { text: string; exitCode: number } {
  const key = process.env.TYPESAFE_API_KEY;
  if (key === undefined || key === "") {
    throw new Error(
      "TYPESAFE_API_KEY is not set. The check asks TypeSafe 5 times and needs the key; no request was sent.",
    );
  }
  if (!existsSync(CRIT_BUNDLE_PATH)) {
    throw new Error(
      `${CRIT_BUNDLE_PATH} does not exist; run npm run build first`,
    );
  }
  const pinnedModel = readPinnedModel();
  const validateReport = compileReportValidator();

  // Observations by criterion id, one entry per run, in the order the runs happened.
  const observationsByQuestion = new Map<string, Observation[]>();
  let totalCostUsd: number | null = 0;
  for (let runNumber = 1; runNumber <= RUN_COUNT; runNumber += 1) {
    const report = runCritOnce(runNumber, validateReport);
    if (report.model !== pinnedModel) {
      throw new Error(
        `run ${String(runNumber)} used ${report.model}, not the pinned ${pinnedModel}`,
      );
    }
    if (totalCostUsd !== null && report.usage.cost_usd !== null) {
      totalCostUsd += report.usage.cost_usd;
    } else {
      totalCostUsd = null;
    }
    for (const finding of report.findings) {
      let observations = observationsByQuestion.get(finding.criterion);
      if (observations === undefined) {
        observations = [];
        observationsByQuestion.set(finding.criterion, observations);
      }
      observations.push({
        distribution: finding.distribution,
        confidence: finding.confidence,
      });
    }
  }

  const movements: QuestionMovement[] = [];
  for (const [question, observations] of observationsByQuestion) {
    if (observations.length !== RUN_COUNT) {
      throw new Error(
        `${question} was answered in ${String(observations.length)} of ${String(RUN_COUNT)} runs`,
      );
    }
    movements.push(measureQuestionMovement(question, observations));
  }
  if (movements.length === 0) {
    throw new Error(
      "crit reported no findings, so there is nothing to compare",
    );
  }
  const summary = summarizeWobble(movements);

  const lines: string[] = [];
  lines.push(
    `Wobble check (EV-6): ${String(RUN_COUNT)} runs, model ${pinnedModel}, ${String(movements.length)} questions, image evals/wobble/slice.png`,
  );
  lines.push("");
  lines.push("question                        probability  confidence");
  for (const movement of movements) {
    const confidenceText =
      movement.confidenceMovement === null
        ? "none (noul)"
        : movement.confidenceMovement.toFixed(2);
    lines.push(
      `${movement.question.padEnd(32)}${movement.probabilityMovement.toFixed(2).padEnd(13)}${confidenceText}`,
    );
  }
  lines.push("");
  lines.push(
    `Largest movement of any option probability: ${summary.largestProbabilityMovement.toFixed(2)}`,
  );
  lines.push(
    `Largest movement of reported confidence: ${summary.largestConfidenceMovement.toFixed(2)}`,
  );
  const verdictWord = summary.minConfidenceSitsAbove ? "yes" : "NO";
  lines.push(
    `Default min_confidence ${summary.minConfidence.toFixed(2)} sits above the largest confidence movement: ${verdictWord}`,
  );
  const costText =
    totalCostUsd === null ? "unknown" : `$${totalCostUsd.toFixed(5)}`;
  lines.push(`Cost of the ${String(RUN_COUNT)} runs: ${costText}`);

  const exitCode = summary.minConfidenceSitsAbove
    ? EXIT_CODE_HOLDS
    : EXIT_CODE_DOES_NOT_HOLD;
  return { text: `${lines.join("\n")}\n`, exitCode };
}

/** Read the model id pinned in evals/wobble/.crit.yaml and refuse a missing id or jev-latest (FR-22, NFR-6). */
function readPinnedModel(): string {
  const critYamlPath = join(WOBBLE_DIRECTORY, ".crit.yaml");
  const document = parseDocument(readFileSync(critYamlPath, "utf8"), {
    schema: "core",
    uniqueKeys: true,
  });
  if (document.errors.length > 0) {
    throw new Error(`${critYamlPath}: not valid YAML`);
  }
  const parsed: unknown = document.toJS();
  if (typeof parsed !== "object" || parsed === null || !("model" in parsed)) {
    throw new Error(`${critYamlPath} must pin a model id`);
  }
  const model = parsed.model;
  if (
    typeof model !== "string" ||
    model === "" ||
    model === FLOATING_MODEL_ID
  ) {
    throw new Error(
      `${critYamlPath} must pin an exact model id, never ${FLOATING_MODEL_ID}`,
    );
  }
  return model;
}

/** Compile the report schema with Ajv's draft 2020-12 validator, as a type guard for ReportDocument (EV-2, CS-7). */
function compileReportValidator() {
  const schema: unknown = JSON.parse(readFileSync(REPORT_SCHEMA_PATH, "utf8"));
  if (typeof schema !== "object" || schema === null) {
    throw new Error(`${REPORT_SCHEMA_PATH} is not a JSON object`);
  }
  const ajv = new Ajv2020({ allErrors: true });
  return ajv.compile<ReportDocument>(schema);
}

/**
 * Run the built crit bundle once as a child process with evals/wobble/ as its working directory,
 * so crit reads evals/wobble/.crit.yaml, and return the report after checking it against the
 * report schema. Any exit code but 0 and 1 stops the check (FR-24, EV-2). This is the only
 * function that starts a process (AC-6).
 */
function runCritOnce(
  runNumber: number,
  validateReport: ReturnType<typeof compileReportValidator>,
): ReportDocument {
  const result = spawnSync(
    process.execPath,
    [
      CRIT_BUNDLE_PATH,
      "report",
      IMAGE_PATH,
      "--pack",
      WOBBLE_DIRECTORY,
      "--json",
    ],
    {
      cwd: WOBBLE_DIRECTORY,
      env: { ...process.env },
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  if (result.error !== undefined) {
    throw new Error(`crit could not start: ${result.error.message}`);
  }
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(
      `run ${String(runNumber)}: crit exited ${String(result.status)}: ${result.stderr.trim()}`,
    );
  }
  let document: unknown;
  try {
    document = JSON.parse(result.stdout);
  } catch {
    throw new Error(`run ${String(runNumber)}: crit did not write JSON`);
  }
  if (!validateReport(document)) {
    const errors = JSON.stringify(validateReport.errors);
    throw new Error(
      `run ${String(runNumber)}: the report does not match ${REPORT_SCHEMA_PATH}: ${errors}`,
    );
  }
  return document;
}

main();
