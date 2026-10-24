// The one place that writes stdout and stderr and sets the exit code (CS-17, FR-43, FR-61).

import { rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import type { TypeSafeAdapter } from "../ask/adapter.js";
import {
  createTypeSafeAdapter,
  type TypeSafeAdapterOptions,
} from "../ask/typesafe/adapter.js";
import { CouldNotRunError } from "../shared/could-not-run-error.js";
import { parseCommand } from "./args.js";
import { runCompare } from "./compare-command.js";
import { runGate } from "./gate-command.js";
import { runPacksTest } from "./packs-test.js";
import { runPacksValidate } from "./packs-validate-command.js";
import {
  type CompareInputs,
  type ReportInputs,
  readApiKey,
  readCompareInputs,
  readReportInputs,
} from "./read-inputs.js";
import { type AnswerSource, runReport } from "./report-command.js";

/** Exit code 0: the command ran (FR-43). */
const EXIT_CODE_RAN = 0;

/** Exit code 1: the command ran and found a fault, such as a failed gate, an invalid pack, or a fixture that disagreed (FR-40, FR-43, FR-49, FR-50). */
const EXIT_CODE_FAILED = 1;

/** Exit code 2: the command could not run (FR-43). */
const EXIT_CODE_COULD_NOT_RUN = 2;

/** Makes the adapter from the key and the pinned model. Tests pass one that returns the stub (FR-64). */
export type CreateAdapter = (
  options: TypeSafeAdapterOptions,
) => TypeSafeAdapter;

/**
 * Run the command argv names. `crit packs validate <dir>` checks one pack, reads no key, and exits
 * 0 for a valid pack and 1 for an invalid one (FR-49, FR-60, US-6). `crit packs test <dir>` checks
 * every input first, then reads the key and asks Jev about each fixture, and exits 0 when every
 * fixture agrees with its label and 1 when any disagrees (FR-50, FR-53, EV-4). `crit gate` reads the
 * same inputs as report, writes the gate document to stdout once, and exits 0 when the gate passed
 * and 1 when it failed (FR-40, FR-41, section 8.3). `crit compare` reads both images and the
 * inputs they share, runs both reports through one adapter or the two recorded runs of the
 * --answers file, writes the two-run answers file with --save-answers before stdout, and exits 0
 * whenever it ran, even when every change is worse (FR-35, FR-42, FR-43). `crit report`: parse argv, read the inputs, and run the stages. Without --answers it checks
 * the API key and makes the adapter; with --answers it does neither and makes no network call. With
 * --save-answers it writes the answers file before stdout. On success it writes the report to stdout
 * once and sets exit code 0, whatever the verdicts. On any error it writes only to stderr, writes no
 * answers file, and sets exit code 2 (FR-24, FR-42, FR-43, FR-61, NFR-14, CS-17). It never calls
 * process.exit, which can cut off piped stdout.
 */
export async function main(
  argv: readonly string[],
  environment: Readonly<Record<string, string | undefined>>,
  createAdapter: CreateAdapter = createTypeSafeAdapter,
  workingDirectory: string = process.cwd(),
): Promise<void> {
  try {
    const command = parseCommand(argv);
    if (command.command === "packs-validate") {
      const output = await runPacksValidate(
        command.directory,
        workingDirectory,
      );
      process.stdout.write(output.stdoutText);
      process.stderr.write(output.stderrText);
      process.exitCode = output.valid ? EXIT_CODE_RAN : EXIT_CODE_FAILED;
      return;
    }
    if (command.command === "packs-test") {
      const output = await runPacksTest(
        command.directory,
        workingDirectory,
        (model) => makeAdapterFromKey(environment, createAdapter, model),
      );
      process.stdout.write(output.stdoutText);
      process.exitCode = output.anyDisagreement
        ? EXIT_CODE_FAILED
        : EXIT_CODE_RAN;
      return;
    }
    if (command.command === "compare") {
      const compareInputs = await readCompareInputs(
        command.args,
        workingDirectory,
      );
      const sources = chooseCompareAnswerSources(
        compareInputs,
        environment,
        createAdapter,
      );
      const compareOutput = await runCompare(
        compareInputs,
        sources.before,
        sources.after,
      );
      if (command.args.saveAnswersPath !== undefined) {
        await writeAnswersFileText(
          command.args.saveAnswersPath,
          compareOutput.answersFileText,
          workingDirectory,
        );
      }
      process.stdout.write(compareOutput.stdoutText);
      // Compare ran, so it exits 0 whatever the changes are (FR-43).
      process.exitCode = EXIT_CODE_RAN;
      return;
    }
    const reportArguments = command.args;
    const inputs = await readReportInputs(reportArguments, workingDirectory);
    const answerSource = chooseAnswerSource(inputs, environment, createAdapter);
    if (command.command === "gate") {
      const gateOutput = await runGate(inputs, answerSource);
      process.stdout.write(gateOutput.stdoutText);
      process.exitCode = gateOutput.passed ? EXIT_CODE_RAN : EXIT_CODE_FAILED;
      return;
    }
    const output = await runReport(inputs, answerSource);
    if (reportArguments.saveAnswersPath !== undefined) {
      await writeAnswersFileText(
        reportArguments.saveAnswersPath,
        output.answersFileText,
        workingDirectory,
      );
    }
    process.stdout.write(output.stdoutText);
    process.exitCode = EXIT_CODE_RAN;
  } catch (error) {
    process.stderr.write(describeError(error));
    process.exitCode = EXIT_CODE_COULD_NOT_RUN;
  }
}

/**
 * Return the recorded answers when --answers was given, and read no key. Otherwise read the key
 * and make the adapter. The key is checked after the packs load, so a run with a bad pack says so
 * even with no key (FR-22, FR-42, CS-21).
 */
function chooseAnswerSource(
  inputs: ReportInputs,
  environment: Readonly<Record<string, string | undefined>>,
  createAdapter: CreateAdapter,
): AnswerSource {
  if (inputs.recordedAnswers !== undefined) {
    return {
      kind: "recorded",
      recorded: inputs.recordedAnswers,
    };
  }
  return {
    kind: "ask",
    adapter: makeAdapterFromKey(environment, createAdapter, inputs.model),
  };
}

/**
 * Return the answer source of each compare run. With --answers both runs take their recorded run
 * from the file and no key is read. Otherwise one adapter, made from the key once, serves both runs
 * (FR-22, FR-35, FR-42, CS-21).
 */
function chooseCompareAnswerSources(
  inputs: CompareInputs,
  environment: Readonly<Record<string, string | undefined>>,
  createAdapter: CreateAdapter,
): { readonly before: AnswerSource; readonly after: AnswerSource } {
  const beforeRecorded = inputs.before.recordedAnswers;
  const afterRecorded = inputs.after.recordedAnswers;
  if (beforeRecorded !== undefined && afterRecorded !== undefined) {
    return {
      before: { kind: "recorded", recorded: beforeRecorded },
      after: { kind: "recorded", recorded: afterRecorded },
    };
  }
  const adapter = makeAdapterFromKey(
    environment,
    createAdapter,
    inputs.before.model,
  );
  return {
    before: { kind: "ask", adapter },
    after: { kind: "ask", adapter },
  };
}

/**
 * Read the key from the environment and make the adapter for the pinned model, or for the
 * adapter's default model when `model` is undefined (FR-22, NFR-14, CS-19).
 */
function makeAdapterFromKey(
  environment: Readonly<Record<string, string | undefined>>,
  createAdapter: CreateAdapter,
  model: string | undefined,
): TypeSafeAdapter {
  const apiKey = readApiKey(environment);
  const options: { apiKey: string; model?: string } = { apiKey };
  if (model !== undefined) {
    options.model = model;
  }
  return createAdapterSafely(createAdapter, options);
}

/**
 * Write the answers file text to the --save-answers path through a temporary file in the same
 * folder and then rename it over the target, so a failed or partial write never empties an
 * earlier recording at that path. The temporary file shares the folder so the rename stays on one
 * disk. A write or rename error removes the temporary file, stops the run, names the path, and
 * leaves stdout empty (FR-4, FR-42, AC-7).
 */
async function writeAnswersFileText(
  saveAnswersPath: string,
  answersFileText: string,
  workingDirectory: string,
): Promise<void> {
  const targetPath = resolve(workingDirectory, saveAnswersPath);
  const temporaryPath = join(
    dirname(targetPath),
    `.${basename(targetPath)}.${process.pid}.tmp`,
  );
  try {
    await writeFile(temporaryPath, answersFileText);
    await rename(temporaryPath, targetPath);
  } catch {
    // force: true makes a missing temporary file (the write itself failed) not an error.
    await rm(temporaryPath, { force: true }).catch(() => undefined);
    throw new CouldNotRunError(
      `answers file ${saveAnswersPath} cannot be written`,
    );
  }
}

/**
 * Call the adapter factory and turn any error it throws into a CouldNotRunError with fixed text,
 * because an SDK constructor error may repeat the key or the request headers (CS-19, NFR-14).
 */
function createAdapterSafely(
  createAdapter: CreateAdapter,
  options: TypeSafeAdapterOptions,
): TypeSafeAdapter {
  try {
    return createAdapter(options);
  } catch {
    throw new CouldNotRunError("could not set up the TypeSafe client");
  }
}

/**
 * Return the stderr text for an error. A CouldNotRunError gives its message, which names the
 * input. Any other error is a bug, so it gives the stack trace as it is (CS-16, FR-4).
 */
function describeError(error: unknown): string {
  if (error instanceof CouldNotRunError) {
    return `crit: ${error.message}\n`;
  }
  if (error instanceof Error && error.stack !== undefined) {
    return `${error.stack}\n`;
  }
  return `${String(error)}\n`;
}
