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
import { runPacksValidate } from "./packs-validate-command.js";
import {
  type ReportInputs,
  readApiKey,
  readReportInputs,
} from "./read-inputs.js";
import { type AnswerSource, runReport } from "./report-command.js";

/** Exit code 0: the command ran (FR-43). */
const EXIT_CODE_RAN = 0;

/** Exit code 1: the command ran and found a fault, such as an invalid pack (FR-43, FR-49). */
const EXIT_CODE_FAILED = 1;

/** Exit code 2: the command could not run (FR-43). */
const EXIT_CODE_COULD_NOT_RUN = 2;

/** Makes the adapter from the key and the pinned model. Tests pass one that returns the stub (FR-64). */
export type CreateAdapter = (
  options: TypeSafeAdapterOptions,
) => TypeSafeAdapter;

/**
 * Run the command argv names. `crit packs validate <dir>` checks one pack, reads no key, and exits
 * 0 for a valid pack and 1 for an invalid one (FR-49, FR-60, US-6). `crit report`: parse argv, read the inputs, and run the stages. Without --answers it checks
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
    const reportArguments = command.args;
    const inputs = await readReportInputs(reportArguments, workingDirectory);
    const answerSource = chooseAnswerSource(inputs, environment, createAdapter);
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
  const apiKey = readApiKey(environment);
  const options: { apiKey: string; model?: string } = { apiKey };
  if (inputs.model !== undefined) {
    options.model = inputs.model;
  }
  return { kind: "ask", adapter: createAdapterSafely(createAdapter, options) };
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
