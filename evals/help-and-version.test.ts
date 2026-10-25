// The durable check of `crit --version` and the help texts (FR-75, FR-76, CS-21). It runs the built
// bundle, dist/crit.js, as a child process with only PATH in the environment and imports nothing
// from src/, so it still holds if crit is rewritten in another language (AC-6). The golden cases
// help-* in evals/golden/cases/ store the exact help bytes. This file checks what a stored file
// cannot: the version line, whose commit id changes with each commit, and that every example in the
// help is a command line the parser accepts.
//
// The example check follows evals/plugin-skill.test.ts. Each example line is run with each image
// name swapped for a path that does not exist, in a new empty working directory with no .crit.yaml.
// The bundle checks the command line before it reads the image, so a good line stops on the missing
// image (exit 2, "cannot read image"), and a line with an unknown flag stops on a usage error
// instead. A packs line has no image, so its directory is swapped for a missing one, and a good line
// stops on "no such pack directory". No line reaches TypeSafe.

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import { runCritBundle } from "./support/run-crit-bundle.js";

/** A new empty working directory, so crit finds no .crit.yaml (FR-51). */
const WORKING_DIRECTORY = mkdtempSync(join(tmpdir(), "crit-help-"));

/** A folder that never exists, so each image or pack path under it cannot be read. */
const MISSING_FOLDER = join(WORKING_DIRECTORY, "does-not-exist");

/** Only PATH, so no TYPESAFE_API_KEY reaches crit and help is shown to need no key (CS-21, FR-76). */
const ENVIRONMENT = { PATH: process.env.PATH ?? "" };

/** The command lines that print a help text, by name (FR-76). */
const HELP_COMMAND_LINES: Record<string, readonly string[]> = {
  "top-level": ["--help"],
  report: ["report", "--help"],
  compare: ["compare", "--help"],
  gate: ["gate", "--help"],
  "packs validate": ["packs", "validate", "--help"],
  "packs test": ["packs", "test", "--help"],
};

afterAll(() => {
  rmSync(WORKING_DIRECTORY, { recursive: true, force: true });
});

/** Runs the bundle with these arguments in the empty working directory. */
async function runCrit(critArguments: readonly string[]) {
  return runCritBundle(critArguments, ENVIRONMENT, WORKING_DIRECTORY);
}

/**
 * Returns the example command lines of one help text: each line after the "Examples:" line that
 * starts with "crit ", without its indent (FR-76).
 */
function listExampleLines(helpText: string): string[] {
  const exampleLines: string[] = [];
  let insideExamples = false;
  for (const line of helpText.split("\n")) {
    if (line === "Examples:") {
      insideExamples = true;
      continue;
    }
    const trimmedLine = line.trim();
    if (insideExamples && trimmedLine.startsWith("crit ")) {
      exampleLines.push(trimmedLine);
    }
  }
  return exampleLines;
}

/**
 * Runs one example line with each image name swapped for a missing path. For a packs line, the
 * directory after "validate" or "test" is swapped instead.
 */
async function runWithMissingInputs(commandLine: string) {
  const words = commandLine.split(" ").slice(1);
  const isPacksLine = words[0] === "packs";
  const critArguments: string[] = [];
  for (const [index, word] of words.entries()) {
    const isImage = word.endsWith(".png");
    const isPackDirectory = isPacksLine && index === 2;
    if (isImage || isPackDirectory) {
      critArguments.push(join(MISSING_FOLDER, word));
    } else {
      critArguments.push(word);
    }
  }
  return runCrit(critArguments);
}

/** Returns the error text that a good example line stops on, which depends on its command. */
function expectedErrorText(commandLine: string): string {
  if (commandLine.startsWith("crit packs ")) {
    return "no such pack directory";
  }
  return "cannot read image";
}

/**
 * Each test here starts crit as a child process several times, and the Flags list check about
 * fifty times, so on a busy machine a test needs more than the default 30 seconds. vi.setConfig
 * sets the timeout for every test in this file.
 */
vi.setConfig({ testTimeout: 300_000 });

/** One flag as a Flags list names it, and whether it takes a value, as in "--pack <dir>". */
type ListedFlag = { readonly name: string; readonly takesValue: boolean };

/**
 * Returns the flags of the Flags section of one help text: each line from "Flags:" to the next blank
 * line names one flag, as in "  --pack <dir>  ...", and may name a short form, as in "  --help, -h".
 */
function listHelpFlags(helpText: string): ListedFlag[] {
  const flags: ListedFlag[] = [];
  let insideFlags = false;
  for (const line of helpText.split("\n")) {
    if (line === "Flags:") {
      insideFlags = true;
      continue;
    }
    if (insideFlags && line === "") {
      break;
    }
    if (!insideFlags) {
      continue;
    }
    // Group 1 is the long flag, group 2 its value placeholder, and group 3 the short form.
    const match = /^ {2}(--[a-z-]+)( <[^>]+>)?(?:, (-[a-z]))?/.exec(line);
    if (match === null || match[1] === undefined) {
      continue;
    }
    flags.push({ name: match[1], takesValue: match[2] !== undefined });
    if (match[3] !== undefined) {
      flags.push({ name: match[3], takesValue: false });
    }
  }
  return flags;
}

/**
 * Returns the flags of a Flags list that the parser rejects and the flags the parser accepts that the
 * list leaves out, each sorted, so a test can expect both to be empty (FR-76).
 */
function compareFlagLists(
  listedFlags: readonly string[],
  acceptedFlags: readonly string[],
): { readonly notAccepted: string[]; readonly notListed: string[] } {
  const notAccepted: string[] = [];
  for (const flag of listedFlags) {
    if (!acceptedFlags.includes(flag)) {
      notAccepted.push(flag);
    }
  }
  const notListed: string[] = [];
  for (const flag of acceptedFlags) {
    if (!listedFlags.includes(flag)) {
      notListed.push(flag);
    }
  }
  notAccepted.sort();
  notListed.sort();
  return { notAccepted, notListed };
}

/**
 * Returns the arguments that run one command with its images or its pack directory missing, so a
 * flag the parser accepts stops on the missing input and an unknown flag stops on a usage error.
 */
function argumentsWithMissingInputs(commandName: string): string[] {
  if (commandName === "compare") {
    return [
      "compare",
      join(MISSING_FOLDER, "before.png"),
      join(MISSING_FOLDER, "after.png"),
    ];
  }
  if (commandName === "report" || commandName === "gate") {
    return [commandName, join(MISSING_FOLDER, "shot.png")];
  }
  // "packs validate" or "packs test".
  return [...commandName.split(" "), join(MISSING_FOLDER, "my-pack")];
}

/**
 * Returns true when the parser of the command accepts the flag: the run does not stop on
 * "unknown option". A flag that takes a value gets one, so a missing value is not mistaken for an
 * unknown flag.
 */
async function parserAcceptsFlag(
  commandName: string,
  flag: ListedFlag,
): Promise<boolean> {
  const critArguments = [...argumentsWithMissingInputs(commandName), flag.name];
  if (flag.takesValue) {
    critArguments.push("platform=web");
  }
  const run = await runCrit(critArguments);
  return !run.stderr.includes("unknown option");
}

describe("crit --version (FR-75)", () => {
  it("prints one line deskcrit <version> <commit> on stdout, nothing on stderr, and exits 0", async () => {
    const run = await runCrit(["--version"]);
    expect(run.exitCode).toBe(0);
    expect(run.stderr).toBe("");
    expect(run.stdout).toMatch(/^deskcrit 0\.0\.0 [0-9a-f]{7,}\n$/);
  });
});

describe("crit --help (FR-76)", () => {
  it("prints the same text for --help and -h, with nothing on stderr and exit 0", async () => {
    const longRun = await runCrit(["--help"]);
    const shortRun = await runCrit(["-h"]);
    expect(longRun.exitCode).toBe(0);
    expect(longRun.stderr).toBe("");
    expect(shortRun).toEqual(longRun);
  });

  it("names every command, the exit codes, --json, TYPESAFE_API_KEY, .crit.yaml, and command help", async () => {
    const helpText = (await runCrit(["--help"])).stdout;
    const requiredTexts = [
      "report",
      "compare",
      "gate",
      "packs validate",
      "packs test",
      "0  pass",
      "1  fail",
      "2  could not run",
      "--json",
      "TYPESAFE_API_KEY",
      ".crit.yaml",
      "crit <command> --help",
      "stderr",
    ];
    for (const requiredText of requiredTexts) {
      expect(helpText).toContain(requiredText);
    }
  });

  for (const [name, commandLine] of Object.entries(HELP_COMMAND_LINES)) {
    it(`${name}: is plain text with no color codes, and gives the same bytes on a second run`, async () => {
      const firstRun = await runCrit(commandLine);
      const secondRun = await runCrit(commandLine);
      expect(firstRun.exitCode).toBe(0);
      expect(secondRun).toEqual(firstRun);
      // An ANSI color code starts with the escape character, code 27.
      expect(firstRun.stdout).not.toContain("\u001b");
    });
  }

  it("gives each command's help its usage line and exit codes", async () => {
    for (const [name, commandLine] of Object.entries(HELP_COMMAND_LINES)) {
      if (name === "top-level") {
        continue;
      }
      const helpText = (await runCrit(commandLine)).stdout;
      expect(helpText.startsWith(`usage: crit ${name}`)).toBe(true);
      expect(helpText).toContain("Exit codes:");
      expect(helpText).toContain("2  could not run.");
    }
  });

  it("prints the usage lines that an error prints when it does not know the command", async () => {
    const errorRun = await runCrit([]);
    expect(errorRun.exitCode).toBe(2);
    const usageLines = errorRun.stderr
      .split("\n")
      .filter((line) => line.startsWith("usage: "));
    expect(usageLines.length).toBe(5);
    const helpText = (await runCrit(["--help"])).stdout;
    expect(helpText).toContain(usageLines.join("\n"));
  });

  it("prints help, not an error, when --help comes after a missing image", async () => {
    const run = await runCrit(["report", "missing.png", "--help"]);
    expect(run.exitCode).toBe(0);
    expect(run.stderr).toBe("");
    expect(run.stdout.startsWith("usage: crit report")).toBe(true);
  });
});

describe("the examples in the help (FR-76)", () => {
  it("has an Examples section in every help text", async () => {
    for (const commandLine of Object.values(HELP_COMMAND_LINES)) {
      const helpText = (await runCrit(commandLine)).stdout;
      expect(listExampleLines(helpText).length).toBeGreaterThan(0);
    }
  });

  it("shows the agent loop and the flags FR-76 names, in the top-level help", async () => {
    const examples = listExampleLines((await runCrit(["--help"])).stdout);
    const exampleText = examples.join("\n");
    expect(exampleText).toContain("crit report shot.png --json");
    expect(exampleText).toContain("crit compare before.png after.png --json");
    expect(exampleText).toContain("crit gate shot.png --json");
    expect(exampleText).toContain("--pack ");
    expect(exampleText).toContain("--context ");
    expect(exampleText).toContain("--answers ");
    expect(exampleText).toContain("crit packs validate ");
  });

  it("follows each example with a one-line comment", async () => {
    for (const commandLine of Object.values(HELP_COMMAND_LINES)) {
      const lines = (await runCrit(commandLine)).stdout.split("\n");
      const examplesStart = lines.indexOf("Examples:");
      expect(examplesStart).toBeGreaterThan(-1);
      for (const [index, line] of lines.entries()) {
        // An example line comes after "Examples:" and is indented by two spaces.
        if (index <= examplesStart || !line.startsWith("  crit ")) {
          continue;
        }
        const nextLine = lines[index + 1] ?? "";
        expect(nextLine.trim().startsWith("# ")).toBe(true);
      }
    }
  });

  for (const [name, helpCommandLine] of Object.entries(HELP_COMMAND_LINES)) {
    it(`${name}: every example passes the command-line check`, async () => {
      const helpText = (await runCrit(helpCommandLine)).stdout;
      for (const exampleLine of listExampleLines(helpText)) {
        const run = await runWithMissingInputs(exampleLine);
        expect(run.exitCode, exampleLine).toBe(2);
        expect(run.stderr, exampleLine).toContain(
          expectedErrorText(exampleLine),
        );
        expect(run.stderr, exampleLine).not.toContain("usage:");
      }
    });
  }

  // Lines that are wrong on purpose. Each gives the usage error and not the missing-input error,
  // which shows that the check above can fail.
  const wrongLines = [
    "crit report shot.png --jsn",
    "crit gate shot.png --save-answers saved.json --json",
    "crit compare after.png --json",
    "crit packs validate packs/my-pack --json",
  ];
  for (const wrongLine of wrongLines) {
    it(`fails the command-line check: ${wrongLine}`, async () => {
      const run = await runWithMissingInputs(wrongLine);
      expect(run.exitCode).toBe(2);
      expect(run.stderr).toContain("usage:");
      expect(run.stderr).not.toContain(expectedErrorText(wrongLine));
    });
  }
});

describe("the Flags lists in the help (FR-76)", () => {
  it("names, for each command, exactly the flags its parser accepts", async () => {
    // Every flag that any help text or usage line names is a candidate, so a flag one command
    // accepts and another rejects, such as --save-answers for gate, is tried on every command.
    const candidates = new Map<string, ListedFlag>();
    const listedByCommand = new Map<string, string[]>();
    for (const [name, commandLine] of Object.entries(HELP_COMMAND_LINES)) {
      const helpText = (await runCrit(commandLine)).stdout;
      if (name === "top-level") {
        continue;
      }
      const listedFlags = listHelpFlags(helpText);
      expect(listedFlags.length, name).toBeGreaterThan(0);
      listedByCommand.set(
        name,
        listedFlags.map((flag) => flag.name),
      );
      for (const flag of listedFlags) {
        candidates.set(flag.name, flag);
      }
      const usageLine = helpText.split("\n")[0] ?? "";
      for (const match of usageLine.matchAll(/(--[a-z-]+)( <[^>]+>)?/g)) {
        const flagName = match[1];
        if (flagName !== undefined && !candidates.has(flagName)) {
          candidates.set(flagName, {
            name: flagName,
            takesValue: match[2] !== undefined,
          });
        }
      }
    }
    for (const [commandName, listedFlags] of listedByCommand) {
      const acceptedFlags: string[] = [];
      for (const candidate of candidates.values()) {
        if (await parserAcceptsFlag(commandName, candidate)) {
          acceptedFlags.push(candidate.name);
        }
      }
      expect(compareFlagLists(listedFlags, acceptedFlags), commandName).toEqual(
        {
          notAccepted: [],
          notListed: [],
        },
      );
    }
  });

  it("finds a listed flag the parser rejects and an accepted flag the list leaves out, so the check can fail", async () => {
    const wrongHelpText =
      "Flags:\n  --jsn                  Print JSON.\n  --help, -h             Print this help.\n\n";
    const listedFlags = listHelpFlags(wrongHelpText).map((flag) => flag.name);
    const acceptedFlags: string[] = [];
    for (const flagName of ["--jsn", "--json", "--help", "-h"]) {
      const flag = { name: flagName, takesValue: false };
      if (await parserAcceptsFlag("report", flag)) {
        acceptedFlags.push(flagName);
      }
    }
    expect(compareFlagLists(listedFlags, acceptedFlags)).toEqual({
      notAccepted: ["--jsn"],
      notListed: ["--json"],
    });
  });
});
