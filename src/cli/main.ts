// The one place that writes stdout and stderr and sets the exit code (CS-17, FR-43, FR-61).

import type { TypeSafeAdapter } from "../ask/adapter.js";
import {
  createTypeSafeAdapter,
  type TypeSafeAdapterOptions,
} from "../ask/typesafe/adapter.js";
import { CouldNotRunError } from "../shared/could-not-run-error.js";
import { parseReportArguments } from "./args.js";
import { readApiKey, readReportInputs } from "./read-inputs.js";
import { runReport } from "./report-command.js";

/** Exit code 0: the command ran (FR-43). */
const EXIT_CODE_RAN = 0;

/** Exit code 2: the command could not run (FR-43). */
const EXIT_CODE_COULD_NOT_RUN = 2;

/** Makes the adapter from the key and the pinned model. Tests pass one that returns the stub (FR-64). */
export type CreateAdapter = (
  options: TypeSafeAdapterOptions,
) => TypeSafeAdapter;

/**
 * Run `crit report`: parse argv, read the inputs, check the API key, make the adapter, and run the
 * stages. On success it writes the report to stdout once and sets exit code 0, whatever the
 * verdicts. On any error it writes only to stderr and sets exit code 2 (FR-24, FR-43, FR-61,
 * NFR-14, CS-17). It never calls process.exit, which can cut off piped stdout.
 */
export async function main(
  argv: readonly string[],
  environment: Readonly<Record<string, string | undefined>>,
  createAdapter: CreateAdapter = createTypeSafeAdapter,
  workingDirectory: string = process.cwd(),
): Promise<void> {
  try {
    const reportArguments = parseReportArguments(argv);
    const inputs = await readReportInputs(reportArguments, workingDirectory);
    // The key is checked after the packs load, so a run with a bad pack says so even with no key.
    const apiKey = readApiKey(environment);
    const options: { apiKey: string; model?: string } = { apiKey };
    if (inputs.model !== undefined) {
      options.model = inputs.model;
    }
    const adapter = createAdapterSafely(createAdapter, options);
    const output = await runReport(inputs, adapter);
    process.stdout.write(output);
    process.exitCode = EXIT_CODE_RAN;
  } catch (error) {
    process.stderr.write(describeError(error));
    process.exitCode = EXIT_CODE_COULD_NOT_RUN;
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
