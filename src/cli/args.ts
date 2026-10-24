// Argument parsing for `crit report`, `crit gate`, `crit packs validate`, and `crit packs test` (FR-40, FR-49, FR-50, FR-60). It turns argv into typed values with Node's own
// parser and turns every bad argument into CouldNotRunError, so the run exits with code 2 (FR-4,
// CS-3, CS-16). It reads no file; read-inputs.ts does that.

import { parseArgs } from "node:util";
import { CouldNotRunError } from "../shared/could-not-run-error.js";
import type { Context } from "../shared/state.js";

/** The usage line that a could-not-run message ends with when the command line is wrong (FR-60). */
export const REPORT_USAGE =
  "usage: crit report <image> [--pack <dir>...] [--context <key=value>...] [--facts <file>] [--json] [--save-answers <file>] [--answers <file>]";

/** The usage line for `crit gate`: the options of report except --save-answers (FR-40, FR-60). */
export const GATE_USAGE =
  "usage: crit gate <image> [--pack <dir>...] [--context <key=value>...] [--facts <file>] [--json] [--answers <file>]";

/** The usage line for `crit packs validate` (FR-49, FR-60). */
export const PACKS_VALIDATE_USAGE = "usage: crit packs validate <dir>";

/** The usage line for `crit packs test` (FR-50, FR-60). */
export const PACKS_TEST_USAGE = "usage: crit packs test <dir>";

/** Every usage line, for an error that does not know which command was meant (FR-60). */
export const USAGE = `${REPORT_USAGE}\n${GATE_USAGE}\n${PACKS_VALIDATE_USAGE}\n${PACKS_TEST_USAGE}`;

/** The context keys FR-2 allows. Any other key stops the run (OQ-25 c). */
const CONTEXT_KEYS = ["purpose", "audience", "platform"] as const;

/** One allowed context key. */
type ContextKey = (typeof CONTEXT_KEYS)[number];

/** The two commands that run the report pipeline on one image (FR-40, FR-60). */
export type ReportCommandName = "report" | "gate";

/** What the `crit report` or `crit gate` command line asks for (FR-60). */
export type ReportArguments = {
  readonly imagePath: string;
  readonly packDirectories: readonly string[];
  /** The context given with --context flags only. read-inputs.ts lays it over `.crit.yaml` (FR-2). */
  readonly contextFlags: Context;
  readonly factsPath: string | undefined;
  readonly json: boolean;
  /** Where --save-answers writes the answers file, or undefined when the flag is absent. Always undefined for gate (FR-42, FR-60). */
  readonly saveAnswersPath: string | undefined;
  /** The answers file --answers names, so the run skips ask, or undefined (FR-42). */
  readonly answersPath: string | undefined;
};

/** The command a command line asks for, with its arguments (FR-60). */
export type Command =
  | { readonly command: "report"; readonly args: ReportArguments }
  | { readonly command: "gate"; readonly args: ReportArguments }
  | { readonly command: "packs-validate"; readonly directory: string }
  | { readonly command: "packs-test"; readonly directory: string };

/**
 * Parse argv into one command. A line that starts with `packs` is `crit packs validate` or
 * `crit packs test`, a line that starts with `gate` is `crit gate`, and every other line goes to
 * the `crit report` parser, which rejects an unknown command (FR-40, FR-49, FR-50, FR-60).
 */
export function parseCommand(argv: readonly string[]): Command {
  if (argv[0] === "packs") {
    const packsCommand = parsePacksArguments(argv);
    if (packsCommand.subcommand === "validate") {
      return {
        command: "packs-validate",
        directory: packsCommand.directory,
      };
    }
    return { command: "packs-test", directory: packsCommand.directory };
  }
  if (argv[0] === "gate") {
    return { command: "gate", args: parseReportArguments(argv, "gate") };
  }
  return { command: "report", args: parseReportArguments(argv) };
}

/** The two packs subcommands and the one directory each takes (FR-49, FR-50). */
type PacksArguments = {
  readonly subcommand: "validate" | "test";
  readonly directory: string;
};

/**
 * Parse argv for `crit packs validate <dir>` or `crit packs test <dir>` and return the subcommand
 * and the directory. Neither command takes a flag, so any flag, a missing or unknown subcommand, a
 * missing directory, or an extra argument throws CouldNotRunError (FR-4, FR-49, FR-50, FR-60, CS-16).
 */
function parsePacksArguments(argv: readonly string[]): PacksArguments {
  // A flag error is reported with the usage line of the subcommand given, when it is known.
  let subcommandUsage = USAGE;
  if (argv[1] === "validate") {
    subcommandUsage = PACKS_VALIDATE_USAGE;
  }
  if (argv[1] === "test") {
    subcommandUsage = PACKS_TEST_USAGE;
  }
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
      throw new CouldNotRunError(`${error.message}\n${subcommandUsage}`);
    }
    throw error;
  }
  const subcommand = positionals[1];
  if (subcommand === undefined) {
    throw new CouldNotRunError(`no packs command given\n${USAGE}`);
  }
  if (subcommand !== "validate" && subcommand !== "test") {
    throw new CouldNotRunError(`unknown command packs ${subcommand}\n${USAGE}`);
  }
  const directory = positionals[2];
  if (directory === undefined) {
    throw new CouldNotRunError(`no pack directory given\n${subcommandUsage}`);
  }
  if (positionals.length > 3) {
    const extra = positionals.slice(3).join(" ");
    throw new CouldNotRunError(
      `unexpected argument ${extra}\n${subcommandUsage}`,
    );
  }
  return { subcommand, directory };
}

/**
 * Parse argv for `crit report <image>` with --pack and --context repeated, --facts, --json,
 * --save-answers, and --answers, or for `crit gate <image>` with the same options except
 * --save-answers (FR-42, FR-60, OQ-25 e). An unknown flag, which for gate includes --save-answers,
 * a missing value, a wrong command, a missing image, an extra argument, or a bad key=value pair
 * throws CouldNotRunError (FR-4, CS-16).
 */
export function parseReportArguments(
  argv: readonly string[],
  commandName: ReportCommandName = "report",
): ReportArguments {
  let usage = REPORT_USAGE;
  if (commandName === "gate") {
    usage = GATE_USAGE;
  }
  let parsed: ParsedReportLine;
  try {
    parsed = parseWithNode(argv, commandName);
  } catch (error) {
    if (isParseArgsError(error)) {
      throw new CouldNotRunError(`${error.message}\n${usage}`);
    }
    throw error;
  }

  rejectRepeatedFlags(parsed.tokens, ["save-answers", "answers"], usage);
  const positionals = parsed.positionals;
  const command = positionals[0];
  if (command === undefined) {
    throw new CouldNotRunError(`no command given\n${USAGE}`);
  }
  if (command !== commandName) {
    throw new CouldNotRunError(`unknown command ${command}\n${USAGE}`);
  }
  const imagePath = positionals[1];
  if (imagePath === undefined) {
    throw new CouldNotRunError(`no image given\n${usage}`);
  }
  if (positionals.length > 2) {
    const extra = positionals.slice(2).join(" ");
    throw new CouldNotRunError(
      `unexpected argument ${extra}; give each --context pair its own flag\n${usage}`,
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
    saveAnswersPath: parsed.values.saveAnswers,
    answersPath: parsed.values.answers,
  };
}

/** The options that both `crit report` and `crit gate` take (FR-60). */
const SHARED_REPORT_OPTIONS = {
  pack: { type: "string", multiple: true },
  context: { type: "string", multiple: true },
  facts: { type: "string" },
  json: { type: "boolean" },
  answers: { type: "string" },
} as const;

/** The options of `crit report`: the shared ones plus --save-answers (FR-42, FR-60). */
const REPORT_OPTIONS = {
  ...SHARED_REPORT_OPTIONS,
  "save-answers": { type: "string" },
} as const;

/**
 * One flag or positional as parseArgs saw it, so a repeated flag can be counted. NonNullable drops
 * the undefined that the general parseArgs type allows, and [number] is the type of one list item.
 */
type ParsedToken = NonNullable<ReturnType<typeof parseArgs>["tokens"]>[number];

/** The parsed command line of report or gate, in one shape for both commands. */
type ParsedReportLine = {
  readonly values: {
    readonly pack: string[] | undefined;
    readonly context: string[] | undefined;
    readonly facts: string | undefined;
    readonly json: boolean | undefined;
    readonly answers: string | undefined;
    readonly saveAnswers: string | undefined;
  };
  readonly positionals: readonly string[];
  readonly tokens: readonly ParsedToken[];
};

/**
 * Run Node's parseArgs with the options of the command. strict makes an unknown flag an error, so
 * gate, which has no --save-answers option, rejects that flag. multiple lets --pack and --context
 * repeat, and tokens lists each flag as given, so a repeat can be seen (FR-60, CS-3).
 */
function parseWithNode(
  argv: readonly string[],
  commandName: ReportCommandName,
): ParsedReportLine {
  if (commandName === "gate") {
    const parsed = parseArgs({
      args: [...argv],
      strict: true,
      allowPositionals: true,
      options: SHARED_REPORT_OPTIONS,
      tokens: true,
    });
    return {
      values: {
        pack: parsed.values.pack,
        context: parsed.values.context,
        facts: parsed.values.facts,
        json: parsed.values.json,
        answers: parsed.values.answers,
        saveAnswers: undefined,
      },
      positionals: parsed.positionals,
      tokens: parsed.tokens,
    };
  }
  const parsed = parseArgs({
    args: [...argv],
    strict: true,
    allowPositionals: true,
    options: REPORT_OPTIONS,
    tokens: true,
  });
  return {
    values: {
      pack: parsed.values.pack,
      context: parsed.values.context,
      facts: parsed.values.facts,
      json: parsed.values.json,
      answers: parsed.values.answers,
      saveAnswers: parsed.values["save-answers"],
    },
    positionals: parsed.positionals,
    tokens: parsed.tokens,
  };
}

/**
 * Throw CouldNotRunError when one of these flags is given more than once. parseArgs keeps only the
 * last value of a flag, so a repeated --answers would silently drop a file (FR-42, OQ-26).
 */
function rejectRepeatedFlags(
  tokens: readonly ParsedToken[],
  flagNames: readonly string[],
  usage: string,
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
        `--${flagName} is given more than once\n${usage}`,
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
