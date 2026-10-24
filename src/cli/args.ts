// Argument parsing for `crit report` and `crit packs validate` (FR-49, FR-60). It turns argv into typed values with Node's own
// parser and turns every bad argument into CouldNotRunError, so the run exits with code 2 (FR-4,
// CS-3, CS-16). It reads no file; read-inputs.ts does that.

import { parseArgs } from "node:util";
import { CouldNotRunError } from "../shared/could-not-run-error.js";
import type { Context } from "../shared/state.js";

/** The usage line that a could-not-run message ends with when the command line is wrong (FR-60). */
export const REPORT_USAGE =
  "usage: crit report <image> [--pack <dir>...] [--context <key=value>...] [--facts <file>] [--json] [--save-answers <file>] [--answers <file>]";

/** The usage line for `crit packs validate` (FR-49, FR-60). */
export const PACKS_VALIDATE_USAGE = "usage: crit packs validate <dir>";

/** Every usage line, for an error that does not know which command was meant (FR-60). */
export const USAGE = `${REPORT_USAGE}\n${PACKS_VALIDATE_USAGE}`;

/** The context keys FR-2 allows. Any other key stops the run (OQ-25 c). */
const CONTEXT_KEYS = ["purpose", "audience", "platform"] as const;

/** One allowed context key. */
type ContextKey = (typeof CONTEXT_KEYS)[number];

/** What the `crit report` command line asks for (FR-60). */
export type ReportArguments = {
  readonly imagePath: string;
  readonly packDirectories: readonly string[];
  /** The context given with --context flags only. read-inputs.ts lays it over `.crit.yaml` (FR-2). */
  readonly contextFlags: Context;
  readonly factsPath: string | undefined;
  readonly json: boolean;
  /** Where --save-answers writes the answers file, or undefined when the flag is absent (FR-42). */
  readonly saveAnswersPath: string | undefined;
  /** The answers file --answers names, so the run skips ask, or undefined (FR-42). */
  readonly answersPath: string | undefined;
};

/** The command a command line asks for, with its arguments (FR-60). */
export type Command =
  | { readonly command: "report"; readonly args: ReportArguments }
  | { readonly command: "packs-validate"; readonly directory: string };

/**
 * Parse argv into one command. A line that starts with `packs` is a packs command, and every other
 * line goes to the `crit report` parser, which rejects an unknown command. Only `packs validate`
 * exists so far; `packs test` is an unknown command until crit-q25.2 adds it (FR-49, FR-60).
 */
export function parseCommand(argv: readonly string[]): Command {
  if (argv[0] === "packs") {
    return {
      command: "packs-validate",
      directory: parsePacksValidateArguments(argv),
    };
  }
  return { command: "report", args: parseReportArguments(argv) };
}

/**
 * Parse argv for `crit packs validate <dir>` and return the directory. The command takes no flags,
 * so any flag, a missing or unknown subcommand, a missing directory, or an extra argument throws
 * CouldNotRunError (FR-4, FR-49, FR-60, CS-16).
 */
function parsePacksValidateArguments(argv: readonly string[]): string {
  let positionals: string[];
  try {
    positionals = parseArgs({
      args: [...argv],
      strict: true,
      allowPositionals: true,
      options: {},
    }).positionals;
  } catch (error) {
    if (isParseArgsError(error)) {
      throw new CouldNotRunError(`${error.message}\n${PACKS_VALIDATE_USAGE}`);
    }
    throw error;
  }
  const subcommand = positionals[1];
  if (subcommand === undefined) {
    throw new CouldNotRunError(`no packs command given\n${USAGE}`);
  }
  if (subcommand !== "validate") {
    throw new CouldNotRunError(`unknown command packs ${subcommand}\n${USAGE}`);
  }
  const directory = positionals[2];
  if (directory === undefined) {
    throw new CouldNotRunError(
      `no pack directory given\n${PACKS_VALIDATE_USAGE}`,
    );
  }
  if (positionals.length > 3) {
    const extra = positionals.slice(3).join(" ");
    throw new CouldNotRunError(
      `unexpected argument ${extra}\n${PACKS_VALIDATE_USAGE}`,
    );
  }
  return directory;
}

/**
 * Parse argv for `crit report <image>` with --pack and --context repeated, --facts, --json,
 * --save-answers, and --answers (FR-42, FR-60, OQ-25 e). An unknown flag, a missing value, a wrong command, a missing image, an extra
 * argument, or a bad key=value pair throws CouldNotRunError (FR-4, CS-16).
 */
export function parseReportArguments(argv: readonly string[]): ReportArguments {
  let parsed: ReturnType<typeof parseWithNode>;
  try {
    parsed = parseWithNode(argv);
  } catch (error) {
    if (isParseArgsError(error)) {
      throw new CouldNotRunError(`${error.message}\n${REPORT_USAGE}`);
    }
    throw error;
  }

  rejectRepeatedFlags(parsed.tokens, ["save-answers", "answers"]);
  const positionals = parsed.positionals;
  const command = positionals[0];
  if (command === undefined) {
    throw new CouldNotRunError(`no command given\n${USAGE}`);
  }
  if (command !== "report") {
    throw new CouldNotRunError(`unknown command ${command}\n${USAGE}`);
  }
  const imagePath = positionals[1];
  if (imagePath === undefined) {
    throw new CouldNotRunError(`no image given\n${REPORT_USAGE}`);
  }
  if (positionals.length > 2) {
    const extra = positionals.slice(2).join(" ");
    throw new CouldNotRunError(
      `unexpected argument ${extra}; give each --context pair its own flag\n${REPORT_USAGE}`,
    );
  }

  // `??` gives the right-hand value when the left is undefined, here when a flag was not given.
  const packDirectories = parsed.values.pack ?? [];
  const contextPairs = parsed.values.context ?? [];
  return {
    imagePath,
    packDirectories,
    contextFlags: parseContextPairs(contextPairs),
    factsPath: parsed.values.facts,
    json: parsed.values.json ?? false,
    saveAnswersPath: parsed.values["save-answers"],
    answersPath: parsed.values.answers,
  };
}

/**
 * Run Node's parseArgs with the report options. strict makes an unknown flag an error, multiple
 * lets --pack and --context repeat, and tokens lists each flag as given, so a repeat can be seen
 * (FR-60, CS-3).
 */
function parseWithNode(argv: readonly string[]) {
  return parseArgs({
    args: [...argv],
    strict: true,
    allowPositionals: true,
    options: {
      pack: { type: "string", multiple: true },
      context: { type: "string", multiple: true },
      facts: { type: "string" },
      json: { type: "boolean" },
      "save-answers": { type: "string" },
      answers: { type: "string" },
    },
    tokens: true,
  });
}

/**
 * Throw CouldNotRunError when one of these flags is given more than once. parseArgs keeps only the
 * last value of a flag, so a repeated --answers would silently drop a file (FR-42, OQ-26).
 */
function rejectRepeatedFlags(
  tokens: ReturnType<typeof parseWithNode>["tokens"],
  flagNames: readonly string[],
): void {
  for (const flagName of flagNames) {
    let count = 0;
    for (const token of tokens) {
      if (token.kind === "option" && token.name === flagName) {
        count += 1;
      }
    }
    if (count > 1) {
      throw new CouldNotRunError(
        `--${flagName} is given more than once\n${REPORT_USAGE}`,
      );
    }
  }
}

/**
 * Return true when the error is one parseArgs throws for a bad command line. Those errors carry a
 * `code` that starts with ERR_PARSE_ARGS. This is a type guard: when it returns true, the compiler
 * treats `error` as an Error from then on.
 */
function isParseArgsError(error: unknown): error is Error {
  if (!(error instanceof Error)) {
    return false;
  }
  const code: unknown = Reflect.get(error, "code");
  return typeof code === "string" && code.startsWith("ERR_PARSE_ARGS");
}

/**
 * Turn each --context key=value pair into a context key, split on the first "=" so a value may
 * hold "=" (FR-2). A pair with no "=", an empty key, or a key FR-2 does not name throws
 * CouldNotRunError (OQ-25 c). A later pair for the same key wins.
 */
function parseContextPairs(pairs: readonly string[]): Context {
  const context: { -readonly [key in ContextKey]?: string } = {};
  for (const pair of pairs) {
    const separatorIndex = pair.indexOf("=");
    if (separatorIndex === -1) {
      throw new CouldNotRunError(
        `--context ${pair}: expected key=value, for example --context platform=web`,
      );
    }
    const key = pair.slice(0, separatorIndex);
    const value = pair.slice(separatorIndex + 1);
    if (key === "") {
      throw new CouldNotRunError(`--context ${pair}: the key is empty`);
    }
    if (!isContextKey(key)) {
      throw new CouldNotRunError(
        `--context ${pair}: unknown key ${key}; the keys are ${CONTEXT_KEYS.join(", ")}`,
      );
    }
    context[key] = value;
  }
  return context;
}

/** Return true when the text is one of the context keys FR-2 allows. This is a type guard. */
export function isContextKey(key: string): key is ContextKey {
  for (const allowedKey of CONTEXT_KEYS) {
    if (allowedKey === key) {
      return true;
    }
  }
  return false;
}
