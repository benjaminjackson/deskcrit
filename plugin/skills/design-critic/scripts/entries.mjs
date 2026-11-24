#!/usr/bin/env node
// Prints guideline entries from the design critic's references/*.md by their titles, so one call
// opens every entry that a checklist line names (agents/critic.md step 5).
//
// Usage:
//   node entries.mjs TITLE [TITLE...]
//   node entries.mjs references/ux.md TITLE [references/layout.md TITLE...]
//
// Each TITLE is the text of an entry's `###` heading, as a checklist line quotes it; case and
// extra spaces do not matter. A title is looked up in every reference file, unless an argument
// that ends in `.md` comes before it: then it is looked up in that reference file only, until the
// next `.md` argument. Only the file name of a `.md` argument counts, so the script reads files in
// the skill's references/ folder and nowhere else. It prints each entry in full, from its `###`
// heading to the next one, after a line that names its file. A title that two files hold prints
// both entries. It uses only Node's own modules, so the installed plugin needs no install step.
//
// Exit codes: 0 when every title was found, 2 for a wrong command line or when any title or file
// was not found. It still prints every entry it found, and one `not found:` line for each title it
// did not find.

import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const EXIT_NOT_FOUND = 2;

const USAGE =
  "usage: node entries.mjs [references/FILE.md] TITLE [TITLE...] (quote each title)";

/** The skill's references/ folder, next to this script's scripts/ folder. */
const REFERENCES_FOLDER = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "references",
);

/** Returns the title in the form used for matching: lower case, with runs of spaces made one. */
function normalizeTitle(title) {
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Splits the text of one reference file into its entries. Each entry runs from a `###` heading to
 * the line before the next `###` heading or the end of the file, with trailing blank lines removed.
 *
 * @param {string} text
 * @returns {{ title: string, text: string }[]}
 */
export function parseEntries(text) {
  const entries = [];
  let current = null;
  for (const line of text.split("\n")) {
    if (line.startsWith("### ")) {
      current = { title: line.slice(4).trim(), lines: [line] };
      entries.push(current);
    } else if (current !== null) {
      current.lines.push(line);
    }
  }
  return entries.map((entry) => ({
    title: entry.title,
    text: entry.lines.join("\n").trimEnd(),
  }));
}

/**
 * Looks up the titles in the reference files and returns the lines to print and the exit code.
 * `files` maps a reference file name, such as `ux.md`, to its text, so a test can pass its own.
 *
 * @param {string[]} commandArguments the arguments after the script path
 * @param {Map<string, string>} files
 * @returns {{ exitCode: number, lines: string[] }}
 */
export function findEntries(commandArguments, files) {
  const titleArguments = commandArguments.filter(
    (argument) => !argument.endsWith(".md"),
  );
  if (
    titleArguments.length === 0 ||
    titleArguments.some((title) => title.trim() === "")
  ) {
    return { exitCode: EXIT_NOT_FOUND, lines: [USAGE] };
  }
  const entriesByFile = new Map();
  for (const [fileName, text] of files) {
    entriesByFile.set(fileName, parseEntries(text));
  }
  const lines = [];
  let allFound = true;
  // null means "every reference file"; a `.md` argument narrows the titles after it to one file.
  let onlyFile = null;
  for (const argument of commandArguments) {
    if (argument.endsWith(".md")) {
      onlyFile = basename(argument);
      if (!entriesByFile.has(onlyFile)) {
        lines.push(
          `not found: no reference file ${onlyFile} in references/; use a file a checklist line names.`,
        );
        allFound = false;
      }
      continue;
    }
    const wanted = normalizeTitle(argument);
    let found = false;
    for (const [fileName, entries] of entriesByFile) {
      if (onlyFile !== null && fileName !== onlyFile) {
        continue;
      }
      for (const entry of entries) {
        if (normalizeTitle(entry.title) !== wanted) {
          continue;
        }
        if (lines.length > 0) {
          lines.push("");
        }
        lines.push(`=== references/${fileName}`);
        lines.push(entry.text);
        found = true;
      }
    }
    if (!found) {
      let place = "references/*.md";
      if (onlyFile !== null) {
        place = `references/${onlyFile}`;
      }
      lines.push(
        `not found: no ### entry titled "${argument}" in ${place}; copy the title exactly as the checklist line quotes it.`,
      );
      allFound = false;
    }
  }
  let exitCode = 0;
  if (!allFound) {
    exitCode = EXIT_NOT_FOUND;
  }
  return { exitCode, lines };
}

/** Reads every `.md` file in the references/ folder except checklist.md, by file name. */
export function readReferenceFiles(folder = REFERENCES_FOLDER) {
  const files = new Map();
  if (!existsSync(folder)) {
    return files;
  }
  for (const fileName of readdirSync(folder).sort()) {
    if (fileName.endsWith(".md") && fileName !== "checklist.md") {
      files.set(fileName, readFileSync(join(folder, fileName), "utf8"));
    }
  }
  return files;
}

/** Returns true when Node runs this file as the script, and false when a test imports it. */
function isRunAsScript() {
  const scriptPath = process.argv[1];
  if (scriptPath === undefined) {
    return false;
  }
  // import.meta.url is this module's own file:// URL; realpathSync resolves symbolic links on both sides.
  return (
    realpathSync(scriptPath) === realpathSync(fileURLToPath(import.meta.url))
  );
}

if (isRunAsScript()) {
  const result = findEntries(process.argv.slice(2), readReferenceFiles());
  for (const line of result.lines) {
    console.log(line);
  }
  process.exitCode = result.exitCode;
}
