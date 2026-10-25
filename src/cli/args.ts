// Argument parsing for `crit report`, `crit compare`, `crit gate`, `crit packs validate`, `crit packs test`, `--help`, and `--version` (FR-40, FR-42, FR-49, FR-50, FR-60, FR-75, FR-76). It turns argv into typed values with Node's own
// parser and turns every bad argument into CouldNotRunError, so the run exits with code 2 (FR-4,
// CS-3, CS-16). It reads no file; read-inputs.ts does that.

import { parseArgs } from "node:util";
import { CouldNotRunError } from "../shared/could-not-run-error.js";
import type { Context } from "../shared/state.js";

/** The usage line that a could-not-run message ends with when the command line is wrong (FR-60). */
export const REPORT_USAGE =
  "usage: crit report <image> [--pack <dir>...] [--context <key=value>...] [--facts <file>] [--json] [--save-answers <file>] [--answers <file>]";

/** The usage line for `crit compare`: the options of report, with a before and an after image (FR-42, FR-60). */
export const COMPARE_USAGE =
  "usage: crit compare <before> <after> [--pack <dir>...] [--context <key=value>...] [--facts <file>] [--json] [--save-answers <file>] [--answers <file>]";

/** The usage line for `crit gate`: the options of report except --save-answers (FR-40, FR-60). */
export const GATE_USAGE =
  "usage: crit gate <image> [--pack <dir>...] [--context <key=value>...] [--facts <file>] [--json] [--answers <file>]";

/** The usage line for `crit packs validate` (FR-49, FR-60). */
export const PACKS_VALIDATE_USAGE = "usage: crit packs validate <dir>";

/** The usage line for `crit packs test` (FR-50, FR-60). */
export const PACKS_TEST_USAGE = "usage: crit packs test <dir>";

/** Every usage line, for an error that does not know which command was meant (FR-60). */
export const USAGE = `${REPORT_USAGE}\n${COMPARE_USAGE}\n${GATE_USAGE}\n${PACKS_VALIDATE_USAGE}\n${PACKS_TEST_USAGE}`;

/** The context keys FR-2 allows. Any other key stops the run (OQ-25 c). */
export const CONTEXT_KEYS = ["purpose", "audience", "platform"] as const;

/** One allowed context key. */
type ContextKey = (typeof CONTEXT_KEYS)[number];

/** The two commands that run the report pipeline on one image (FR-40, FR-60). */
export type ReportCommandName = "report" | "gate";

/** The three commands that run the report pipeline: on one image, or on two for compare (FR-35, FR-40, FR-60). */
type ImageCommandName = ReportCommandName | "compare";

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

/**
 * What the `crit compare` command line asks for: the options of report, with a before and an after
 * image in place of the one image (FR-35, FR-42, FR-60). `Omit` is the report type without imagePath.
 */
export type CompareArguments = Omit<ReportArguments, "imagePath"> & {
  readonly beforePath: string;
  readonly afterPath: string;
};

/** The command a command line asks for, with its arguments (FR-60). */
export type Command =
  | { readonly command: "report"; readonly args: ReportArguments }
  | { readonly command: "compare"; readonly args: CompareArguments }
  | { readonly command: "gate"; readonly args: ReportArguments }
  | { readonly command: "packs-validate"; readonly directory: string }
  | { readonly command: "packs-test"; readonly directory: string }
  | { readonly command: "help"; readonly topic: HelpTopic }
  | { readonly command: "version" };

/** Which help text `--help` asks for: the top-level help or the help of one command (FR-76). */
export type HelpTopic =
  | "top-level"
  | "report"
  | "compare"
  | "gate"
  | "packs-validate"
  | "packs-test";

/**
 * Parse argv into one command. A line that starts with `packs` is `crit packs validate` or
 * `crit packs test`, a line that starts with `gate` is `crit gate`, a line that starts with
 * `compare` is `crit compare`, and every other line goes to the `crit report` parser, which
 * rejects an unknown command (FR-40, FR-49, FR-50, FR-60). Before any of that, `--help` or `-h`
 * anywhere asks for help and wins over every other check (FR-76), and `crit --version` alone asks
 * for the version line (FR-75).
 */
export function parseCommand(argv: readonly string[]): Command {
  if (asksForHelp(argv)) {
    return { command: "help", topic: chooseHelpTopic(argv) };
  }
  if (argv.length === 1 && argv[0] === "--version") {
    return { command: "version" };
  }
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
  if (argv[0] === "compare") {
    return { command: "compare", args: parseCompareArguments(argv) };
  }
  return { command: "report", args: parseReportArguments(argv) };
}

/**
 * Return true when the command line holds `--help` or `-h` before any `--`, so help wins over every
 * other check, even a missing image (FR-76). After `--`, every argument is a positional.
 */
function asksForHelp(argv: readonly string[]): boolean {
  for (const argument of argv) {
    if (argument === "--") {
      return false;
    }
    if (argument === "--help" || argument === "-h") {
      return true;
    }
  }
  return false;
}

/**
 * Return the help topic of a command line that asks for help: the command it starts with, or the
 * top-level help when it starts with no known command (FR-76).
 */
function chooseHelpTopic(argv: readonly string[]): HelpTopic {
  const command = argv[0];
  if (command === "report" || command === "compare" || command === "gate") {
    return command;
  }
  if (command === "packs" && argv[1] === "validate") {
    return "packs-validate";
  }
  if (command === "packs" && argv[1] === "test") {
    return "packs-test";
  }
  return "top-level";
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
      const text = describeParseArgsError(error, argv, []);
      throw new CouldNotRunError(`${text}\n${subcommandUsage}`);
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
  const parsed = parseImageCommandLine(argv, commandName, usage);
  const imagePath = parsed.imagePaths[0];
  if (imagePath === undefined) {
    throw new CouldNotRunError(`no image given\n${usage}`);
  }
  rejectExtraImages(parsed.imagePaths, 1, usage);
  return { imagePath, ...readImageCommandOptions(parsed.values) };
}

/**
 * Parse argv for `crit compare <before> <after>` with the options of report (FR-42, FR-60). A
 * missing before or after image, a third image, or any error parseReportArguments reports throws
 * CouldNotRunError (FR-4, CS-16).
 */
export function parseCompareArguments(
  argv: readonly string[],
): CompareArguments {
  const parsed = parseImageCommandLine(argv, "compare", COMPARE_USAGE);
  const beforePath = parsed.imagePaths[0];
  if (beforePath === undefined) {
    throw new CouldNotRunError(`no before image given\n${COMPARE_USAGE}`);
  }
  const afterPath = parsed.imagePaths[1];
  if (afterPath === undefined) {
    throw new CouldNotRunError(`no after image given\n${COMPARE_USAGE}`);
  }
  rejectExtraImages(parsed.imagePaths, 2, COMPARE_USAGE);
  return { beforePath, afterPath, ...readImageCommandOptions(parsed.values) };
}

/** The options of a report, compare, or gate command line, without its image paths (FR-60). */
type ImageCommandOptions = Omit<ReportArguments, "imagePath">;

/** The image paths a command line gave, in order, and its flag values as parseArgs read them (FR-60). */
type ParsedImageCommandLine = {
  readonly imagePaths: readonly string[];
  readonly values: ParsedReportLine["values"];
};

/**
 * Parse the flags and positionals shared by report, compare, and gate, check the command name, and
 * return the image paths and the flag values. The caller checks how many image paths there are,
 * because compare takes two and the others take one, before it reads the --context pairs, so a
 * missing image is reported first (FR-4, FR-60, CS-16).
 */
function parseImageCommandLine(
  argv: readonly string[],
  commandName: ImageCommandName,
  usage: string,
): ParsedImageCommandLine {
  let parsed: ParsedReportLine;
  try {
    parsed = parseWithNode(argv, commandName);
  } catch (error) {
    if (isParseArgsError(error)) {
      let knownOptionNames = Object.keys(REPORT_OPTIONS);
      if (commandName === "gate") {
        knownOptionNames = Object.keys(SHARED_REPORT_OPTIONS);
      }
      const text = describeParseArgsError(error, argv, knownOptionNames);
      throw new CouldNotRunError(`${text}\n${usage}`);
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
  return { imagePaths: positionals.slice(1), values: parsed.values };
}

/**
 * Turn the flag values into the options of the command, with the defaults for flags not given,
 * and check each --context pair (FR-2, FR-60, OQ-25 c).
 */
function readImageCommandOptions(
  values: ParsedReportLine["values"],
): ImageCommandOptions {
  // `??` gives the right-hand value when the left is undefined, here when a flag was not given.
  const packDirectories = values.pack ?? [];
  const contextPairs = values.context ?? [];
  return {
    packDirectories,
    contextFlags: parseContextPairs(contextPairs),
    factsPath: values.facts,
    json: values.json ?? false,
    saveAnswersPath: values.saveAnswers,
    answersPath: values.answers,
  };
}

/**
 * Throw CouldNotRunError when the command line gave more image paths than the command takes. The
 * usual cause is a --context value with a space split into two words, so the message says so (FR-4).
 */
function rejectExtraImages(
  imagePaths: readonly string[],
  imageCount: number,
  usage: string,
): void {
  if (imagePaths.length > imageCount) {
    const extra = imagePaths.slice(imageCount).join(" ");
    throw new CouldNotRunError(
      `unexpected argument ${extra}; give each --context pair its own flag\n${usage}`,
    );
  }
}

/** The options that both `crit report` and `crit gate` take (FR-60). */
const SHARED_REPORT_OPTIONS = {
  pack: { type: "string", multiple: true },
  context: { type: "string", multiple: true },
  facts: { type: "string" },
  json: { type: "boolean" },
  answers: { type: "string" },
} as const;

/** The options of `crit report` and `crit compare`: the shared ones plus --save-answers (FR-42, FR-60). */
const REPORT_OPTIONS = {
  ...SHARED_REPORT_OPTIONS,
  "save-answers": { type: "string" },
} as const;

/**
 * One flag or positional as parseArgs saw it, so a repeated flag can be counted. NonNullable drops
 * the undefined that the general parseArgs type allows, and [number] is the type of one list item.
 */
type ParsedToken = NonNullable<ReturnType<typeof parseArgs>["tokens"]>[number];

/** The parsed command line of report, compare, or gate, in one shape for every command. */
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
  commandName: ImageCommandName,
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
 * Return crit's own text for a parseArgs error. For an unknown option it names the first flag in
 * argv that is not one of the command's options, as in "unknown option --color", so stderr does
 * not carry Node's wording, which can change between Node releases (FR-4, FR-60, NFR-1). Any other
 * parseArgs error, or an unknown option that cannot be found in argv, keeps Node's message.
 */
function describeParseArgsError(
  error: Error,
  argv: readonly string[],
  knownOptionNames: readonly string[],
): string {
  if (Reflect.get(error, "code") !== "ERR_PARSE_ARGS_UNKNOWN_OPTION") {
    return error.message;
  }
  for (const argument of argv) {
    if (argument === "--") {
      break;
    }
    if (argument.startsWith("--")) {
      // A long flag may carry its value after "=", as in --pack=dir.
      const flag = argument.split("=")[0] ?? argument;
      if (!knownOptionNames.includes(flag.slice(2))) {
        return `unknown option ${flag}`;
      }
      continue;
    }
    if (argument.startsWith("-") && argument.length > 1) {
      // No command has a one-letter flag, so any short flag is unknown.
      return `unknown option -${argument[1]}`;
    }
  }
  return error.message;
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
