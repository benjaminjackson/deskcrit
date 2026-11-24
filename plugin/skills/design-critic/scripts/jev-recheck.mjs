#!/usr/bin/env node
// Writes the Jev recheck file for one round of the fix loop (PRD FR-78, FR-82). It reads the Jev
// evidence file of the before image, which lists only the criteria Jev fired on, asks Jev about the
// after image, and says for each of those criteria whether it still fires. It names no other
// criterion: a criterion that fires only on the after image is left out, and a quiet criterion is
// never evidence. The crit-loop skill runs it after a fix and gives the file to the recheck critic.
//
// The rules, in code so that no skill text computes them:
// - A criterion that still fires (verdict fail or warn) on the after image means the fix failed.
// - A criterion that no longer fires counts as "stopped firing" only when Jev's probability fell by
//   MIN_PROBABILITY_FALL or more. Run-to-run movement is 0.08 (EV-6), so 0.3 is well outside noise.
//   For a finding about degree or geometry it also needs the new measured facts file to agree; the
//   recheck critic checks that, because only the work order says which findings those are.
//
// Usage:
//   node jev-recheck.mjs BEFORE_EVIDENCE AFTER_IMAGE [--out FILE]
//   node jev-recheck.mjs BEFORE_EVIDENCE --after-report REPORT.json [--out FILE]
//
// With AFTER_IMAGE it runs `crit report AFTER_IMAGE --json` in the current folder, but only when the
// TYPESAFE_API_KEY variable is set and crit runs, as jev-evidence.mjs does. With --after-report it
// reads a saved report instead and runs nothing; the tests use it. When the evidence file names at
// least one criterion, it writes the recheck file (to --out, or to a new folder in the system temp
// folder) and prints its absolute path. In every other case it prints nothing and exits 0, so the
// loop goes on without Jev. It uses only Node's own modules.
//
// Exit codes: 0 in every case above, 2 for a wrong command line or a file it cannot read.

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  defectProbability,
  firedFindings,
  keyIsSet,
  runCritReport,
} from "./jev-evidence.mjs";

const EXIT_WRONG_USE = 2;

const USAGE =
  "usage: node jev-recheck.mjs BEFORE_EVIDENCE AFTER_IMAGE [--out FILE] | BEFORE_EVIDENCE --after-report REPORT.json [--out FILE]";

/** How far Jev's probability must fall before a criterion counts as stopped firing (FR-78). */
export const MIN_PROBABILITY_FALL = 0.3;

/** The first line of the recheck file. */
export const RECHECK_HEADING =
  'Jev recheck: only the criteria Jev fired on in the before image. "Still fires" means the fix failed. "Stopped firing" counts for a finding about degree or geometry only when the new measured facts file agrees.';

/**
 * Reads the lines of a Jev evidence file that jev-evidence.mjs wrote, and returns one entry per
 * fired criterion: its title and its probability, or undefined when the file gave none.
 */
export function parseEvidence(evidenceText) {
  const entries = [];
  for (const line of evidenceText.split(/\r?\n/)) {
    // A line looks like "- Text reads as faint (Jev's probability 0.97)".
    const match =
      /^- (.+) \(Jev's probability (\d+(?:\.\d+)?|not given)\)$/.exec(line);
    if (match === null) {
      continue;
    }
    const probabilityText = match[2];
    let probability;
    if (probabilityText !== "not given") {
      probability = Number(probabilityText);
    }
    entries.push({ title: match[1], probability });
  }
  return entries;
}

/** Formats a probability with two decimals, or "not given". */
function formatProbability(probability) {
  if (probability === undefined) {
    return "not given";
  }
  return probability.toFixed(2);
}

/**
 * Returns the state of one before-fired criterion on the after image: "still fires",
 * "stopped firing", "fell too little", or "no answer". The finding is the after report's finding
 * with the same title, or undefined when the after report has none.
 */
export function recheckState(beforeProbability, afterFinding) {
  if (afterFinding === undefined) {
    return "no answer";
  }
  const stillFires = firedFindings({ findings: [afterFinding] }).length === 1;
  if (stillFires) {
    return "still fires";
  }
  const afterProbability = defectProbability(afterFinding);
  if (beforeProbability === undefined || afterProbability === undefined) {
    return "fell too little";
  }
  // Rounding to two decimals, as the evidence file does, keeps 0.97 - 0.67 from reading as 0.2999.
  const fall = Math.round((beforeProbability - afterProbability) * 100) / 100;
  if (fall >= MIN_PROBABILITY_FALL) {
    return "stopped firing";
  }
  return "fell too little";
}

/** The sentence after each title in the recheck file, by state. */
const STATE_TEXT = {
  "still fires": "still fires; the fix failed",
  "stopped firing": "stopped firing",
  "fell too little": `does not count as stopped firing; the probability did not fall by ${MIN_PROBABILITY_FALL} or more`,
  "no answer": "no answer on the after image",
};

/**
 * Returns the recheck file text for the evidence file text and the after report, or an empty
 * string when the evidence file names no criterion, so the caller writes no file.
 */
export function recheckText(evidenceText, afterReport) {
  const entries = parseEvidence(evidenceText);
  if (entries.length === 0) {
    return "";
  }
  const afterFindings = Array.isArray(afterReport?.findings)
    ? afterReport.findings
    : [];
  const lines = [RECHECK_HEADING];
  for (const entry of entries) {
    const afterFinding = afterFindings.find(
      (finding) => finding.title === entry.title,
    );
    const state = recheckState(entry.probability, afterFinding);
    let afterProbability;
    if (afterFinding !== undefined) {
      afterProbability = defectProbability(afterFinding);
    }
    lines.push(
      `- ${entry.title}: ${STATE_TEXT[state]} (before ${formatProbability(entry.probability)}, after ${formatProbability(afterProbability)})`,
    );
  }
  return `${lines.join("\n")}\n`;
}

/** Reads a file as text, or writes a reason to stderr and returns undefined. */
function readText(path) {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    process.stderr.write(
      `jev-recheck: cannot read ${path}: ${error.message}\n`,
    );
    return undefined;
  }
}

/** Parses the command line, gets the after report, and writes the recheck file. */
function main() {
  let parsed;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      options: {
        "after-report": { type: "string" },
        out: { type: "string" },
      },
      allowPositionals: true,
      strict: true,
    });
  } catch (error) {
    process.stderr.write(`${error.message}\n${USAGE}\n`);
    return EXIT_WRONG_USE;
  }
  const positionals = parsed.positionals;
  const reportPath = parsed.values["after-report"];
  const wellFormed =
    (reportPath === undefined && positionals.length === 2) ||
    (reportPath !== undefined && positionals.length === 1);
  if (!wellFormed) {
    process.stderr.write(`${USAGE}\n`);
    return EXIT_WRONG_USE;
  }

  let afterReport;
  if (reportPath === undefined && !keyIsSet()) {
    process.stderr.write(
      "jev-recheck: TYPESAFE_API_KEY is not set; no recheck\n",
    );
    return 0;
  }
  const evidenceText = readText(positionals[0]);
  if (evidenceText === undefined) {
    return EXIT_WRONG_USE;
  }
  if (reportPath !== undefined) {
    const reportText = readText(reportPath);
    if (reportText === undefined) {
      return EXIT_WRONG_USE;
    }
    try {
      afterReport = JSON.parse(reportText);
    } catch (error) {
      process.stderr.write(
        `jev-recheck: cannot read ${reportPath}: ${error.message}\n`,
      );
      return EXIT_WRONG_USE;
    }
  } else {
    afterReport = runCritReport(positionals[1], "jev-recheck");
    if (afterReport === undefined) {
      return 0;
    }
  }

  const text = recheckText(evidenceText, afterReport);
  if (text === "") {
    process.stderr.write(
      "jev-recheck: the evidence file names no criterion; no recheck\n",
    );
    return 0;
  }
  const outPath =
    parsed.values.out === undefined
      ? join(mkdtempSync(join(tmpdir(), "jev-recheck-")), "jev-recheck.txt")
      : resolve(parsed.values.out);
  writeFileSync(outPath, text);
  process.stdout.write(`${outPath}\n`);
  return 0;
}

// Run only when node starts this file, not when a test imports it.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
