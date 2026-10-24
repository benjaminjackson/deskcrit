// Shared helpers for the durable evaluations (CS-21, AC-6). They run the built bundle as a child
// process and read the golden cases from disk. They import nothing from src/, so a rewrite of crit
// in another language must still pass the tests that use them. They import only node: modules, so
// evals/support/write-expected.mjs can load this file with Node's own TypeScript support.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** The repository root, found from this file's place in evals/support/. */
export const REPOSITORY_ROOT = fileURLToPath(
  new URL("../../", import.meta.url),
);

/** The built bundle the tests run. `npm test` builds it first through the pretest script. */
const BUNDLE_PATH = join(REPOSITORY_ROOT, "dist", "crit.js");

/** The folder every golden case runs from, so the relative paths in case.json and in the output stay fixed. */
export const GOLDEN_DIRECTORY = join(REPOSITORY_ROOT, "evals", "golden");

/** The folder that holds one sub-folder for each golden case (EV-1). */
const CASES_DIRECTORY = join(GOLDEN_DIRECTORY, "cases");

/** The report fields that EV-1 leaves out of the comparison, and only these. */
const VOLATILE_FIELD_PATHS: readonly (readonly [string, string])[] = [
  ["usage", "latency_ms"],
  ["tool", "version"],
];

/** What one run of the bundle wrote and the exit code it set, or what a golden case stores as expected (EV-1). */
type CritOutput = {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
};

/** One golden case: its arguments from case.json and the outputs a person approved (EV-1). */
export type GoldenCase = {
  readonly name: string;
  readonly directory: string;
  readonly description: string;
  readonly arguments: readonly string[];
};

/**
 * Run the built crit bundle with these arguments and return its stdout, stderr, and exit code
 * (CS-21). The child environment holds only PATH, so a TYPESAFE_API_KEY on the developer machine
 * cannot reach the child and cause a network call (FR-42). A missing bundle throws an error that
 * says to build it, so no test passes or skips without it.
 */
export function runCrit(commandArguments: readonly string[]): CritOutput {
  if (!existsSync(BUNDLE_PATH)) {
    throw new Error(
      `The bundle ${BUNDLE_PATH} does not exist. Run "npm run build" first; "npm test" does this for you.`,
    );
  }
  const childEnvironment: Record<string, string> = {};
  const path = process.env.PATH;
  if (path !== undefined) {
    childEnvironment.PATH = path;
  }
  const result = spawnSync(
    process.execPath,
    [BUNDLE_PATH, ...commandArguments],
    {
      cwd: GOLDEN_DIRECTORY,
      env: childEnvironment,
      encoding: "utf8",
    },
  );
  if (result.error !== undefined) {
    throw result.error;
  }
  if (result.status === null) {
    throw new Error(`crit stopped on signal ${String(result.signal)}`);
  }
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.status,
  };
}

/**
 * Read every golden case folder under evals/golden/cases/, sorted by name so the order does not
 * depend on the file system (CS-18). Each folder must hold a case.json with a description and a
 * list of string arguments.
 */
export function readGoldenCases(): GoldenCase[] {
  const names = readdirSync(CASES_DIRECTORY, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  names.sort(compareText);
  const goldenCases: GoldenCase[] = [];
  for (const name of names) {
    const directory = join(CASES_DIRECTORY, name);
    const caseFile: unknown = JSON.parse(
      readFileSync(join(directory, "case.json"), "utf8"),
    );
    goldenCases.push(readCaseFile(caseFile, name, directory));
  }
  return goldenCases;
}

/** Check the shape of one parsed case.json and return it as a GoldenCase, or throw naming the case. */
function readCaseFile(
  caseFile: unknown,
  name: string,
  directory: string,
): GoldenCase {
  if (typeof caseFile !== "object" || caseFile === null) {
    throw new Error(`${name}/case.json must hold a JSON object`);
  }
  const description: unknown = Reflect.get(caseFile, "description");
  const commandArguments: unknown = Reflect.get(caseFile, "arguments");
  if (typeof description !== "string") {
    throw new Error(`${name}/case.json: description must be a string`);
  }
  if (!Array.isArray(commandArguments)) {
    throw new Error(`${name}/case.json: arguments must be a list`);
  }
  const textArguments: string[] = [];
  for (const argument of commandArguments) {
    if (typeof argument !== "string") {
      throw new Error(`${name}/case.json: every argument must be a string`);
    }
    textArguments.push(argument);
  }
  return { name, directory, description, arguments: textArguments };
}

/** Read the stored expected stdout, stderr, and exit code of one golden case (EV-1). */
export function readExpectedOutput(goldenCase: GoldenCase): CritOutput {
  const stdout = readFileSync(
    join(goldenCase.directory, "expected.stdout"),
    "utf8",
  );
  const stderr = readFileSync(
    join(goldenCase.directory, "expected.stderr"),
    "utf8",
  );
  const exitCodeText = readFileSync(
    join(goldenCase.directory, "expected.exit-code"),
    "utf8",
  );
  return { stdout, stderr, exitCode: Number.parseInt(exitCodeText, 10) };
}

/** Return true when the case runs with --json, so its stdout is compared as a JSON document. */
export function isJsonCase(goldenCase: GoldenCase): boolean {
  return goldenCase.arguments.includes("--json");
}

/**
 * Parse a report JSON document, remove usage.latency_ms and tool.version, and serialise it with
 * keys sorted at every level, so two runs compare equal when only those fields differ (EV-1).
 */
export function normaliseReportJson(reportText: string): string {
  const report: unknown = JSON.parse(reportText);
  if (typeof report !== "object" || report === null) {
    throw new Error("The report is not a JSON object");
  }
  for (const [parentKey, childKey] of VOLATILE_FIELD_PATHS) {
    const parent: unknown = Reflect.get(report, parentKey);
    if (typeof parent === "object" && parent !== null) {
      Reflect.deleteProperty(parent, childKey);
    }
  }
  return JSON.stringify(sortKeys(report), null, 2);
}

/**
 * Return a copy of a JSON value with the keys of every object in sorted order. JSON.stringify
 * writes keys in insertion order, so sorting them here makes key order not matter (EV-1).
 */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    const sortedItems: unknown[] = [];
    for (const item of value) {
      sortedItems.push(sortKeys(item));
    }
    return sortedItems;
  }
  if (typeof value === "object" && value !== null) {
    const keys = Object.keys(value);
    keys.sort(compareText);
    const sortedObject: Record<string, unknown> = {};
    for (const key of keys) {
      sortedObject[key] = sortKeys(Reflect.get(value, key));
    }
    return sortedObject;
  }
  return value;
}

/** Compare two strings by UTF-16 code unit, not by locale, so the order is the same on every machine (CS-18). */
function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}
