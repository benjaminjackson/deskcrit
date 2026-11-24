#!/usr/bin/env node
// Writes the Jev evidence file for one image (PRD FR-78): the criteria that Jev fired on, each
// with its title and Jev's probability, and nothing about the criteria that stayed quiet. A fire
// is evidence that a defect is present; Jev staying quiet is not evidence of anything, so a quiet
// criterion is never named. SKILL.md step 2 runs this script before it starts the critic.
//
// Usage:
//   node jev-evidence.mjs IMAGE [--out FILE]
//   node jev-evidence.mjs --report REPORT.json [--out FILE]
//
// With IMAGE, the script runs `crit report IMAGE --json` in the current folder, so a `.crit.yaml`
// there picks the packs, and with none crit uses every bundled pack. It does this only when the
// TYPESAFE_API_KEY variable is set and `crit` (or `npx --no-install deskcrit`) runs; it checks only
// whether the variable is set and never reads its value. With --report it reads a saved
// `crit report --json` document instead and runs nothing; the tests and the evaluations use it.
//
// When at least one criterion fired, it writes the evidence file (to --out, or to a new folder in
// the system temp folder) and prints the file's absolute path. In every other case (no key, no
// crit, crit could not run, or nothing fired) it prints nothing and exits 0, so the caller's prompt
// stays exactly as it is without Jev. A reason goes to stderr. It uses only Node's own modules, so
// the installed plugin needs no install step.
//
// Exit codes: 0 in every case above, 2 for a wrong command line or a report it cannot read.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const EXIT_WRONG_USE = 2;

const USAGE =
  "usage: node jev-evidence.mjs IMAGE [--out FILE] | --report REPORT.json [--out FILE]";

/** The first line of the evidence file: the label the critic reads each fire under. */
export const EVIDENCE_HEADING =
  "Jev evidence: high-confidence present; you set the location, severity, and rank.";

/**
 * Returns Jev's probability that the defect is present for one finding. Every first-party
 * question is a yes-or-no question where true is the defect (PRD JC-5), so it is the probability
 * of true; a finding without one gives its confidence, or undefined when it has neither.
 */
export function defectProbability(finding) {
  const distribution = finding.distribution ?? {};
  if (typeof distribution.true === "number") {
    return distribution.true;
  }
  if (typeof finding.confidence === "number") {
    return finding.confidence;
  }
  return undefined;
}

/** Returns the findings of a report that fired, verdict fail or warn, in report order. */
export function firedFindings(report) {
  const findings = Array.isArray(report?.findings) ? report.findings : [];
  return findings.filter(
    (finding) => finding.verdict === "fail" || finding.verdict === "warn",
  );
}

/**
 * Returns the evidence file text for a report: the heading, then one line per fired criterion
 * with its title and probability. Returns an empty string when nothing fired, so the caller writes
 * no file. A quiet criterion never appears.
 */
export function evidenceText(report) {
  const fired = firedFindings(report);
  if (fired.length === 0) {
    return "";
  }
  const lines = [EVIDENCE_HEADING];
  for (const finding of fired) {
    const probability = defectProbability(finding);
    const probabilityText =
      probability === undefined
        ? "Jev's probability not given"
        : `Jev's probability ${probability.toFixed(2)}`;
    lines.push(`- ${finding.title} (${probabilityText})`);
  }
  return `${lines.join("\n")}\n`;
}

/** Returns true when the variable is set to a non-empty value; its value is never kept or shown. */
export function keyIsSet() {
  const value = process.env.TYPESAFE_API_KEY;
  return value !== undefined && value !== "";
}

/**
 * Returns the command that runs crit, as [program, ...leading arguments]: `crit` when it runs,
 * else `npx --no-install deskcrit` when that runs, else undefined.
 */
function findCrit() {
  const candidates = [["crit"], ["npx", "--no-install", "deskcrit"]];
  for (const candidate of candidates) {
    const [program, ...leading] = candidate;
    const check = spawnSync(program, [...leading, "--version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (check.status === 0) {
      return candidate;
    }
  }
  return undefined;
}

/**
 * Runs `crit report IMAGE --json` and returns the parsed report, or undefined with a reason on
 * stderr. Each reason starts with scriptName, so jev-recheck.mjs can share this function.
 */
export function runCritReport(imagePath, scriptName = "jev-evidence") {
  const crit = findCrit();
  if (crit === undefined) {
    process.stderr.write(
      `${scriptName}: crit does not run here; no evidence\n`,
    );
    return undefined;
  }
  const [program, ...leading] = crit;
  // The environment passes through unchanged, so crit reads the key itself.
  const run = spawnSync(
    program,
    [...leading, "report", resolve(imagePath), "--json"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  if (run.status !== 0) {
    const firstLine = (run.stderr ?? "").split("\n")[0];
    process.stderr.write(
      `${scriptName}: crit report could not run (${firstLine}); no evidence\n`,
    );
    return undefined;
  }
  try {
    return JSON.parse(run.stdout);
  } catch {
    process.stderr.write(`${scriptName}: crit printed no JSON; no evidence\n`);
    return undefined;
  }
}

/** Parses the command line, gets a report, and writes the evidence file when anything fired. */
function main() {
  let parsed;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      options: {
        report: { type: "string" },
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
  const reportPath = parsed.values.report;
  const oneSource =
    (reportPath === undefined && positionals.length === 1) ||
    (reportPath !== undefined && positionals.length === 0);
  if (!oneSource) {
    process.stderr.write(`${USAGE}\n`);
    return EXIT_WRONG_USE;
  }

  let report;
  if (reportPath !== undefined) {
    try {
      report = JSON.parse(readFileSync(reportPath, "utf8"));
    } catch (error) {
      process.stderr.write(
        `jev-evidence: cannot read ${reportPath}: ${error.message}\n`,
      );
      return EXIT_WRONG_USE;
    }
  } else {
    if (!keyIsSet()) {
      process.stderr.write(
        "jev-evidence: TYPESAFE_API_KEY is not set; no evidence\n",
      );
      return 0;
    }
    report = runCritReport(positionals[0]);
    if (report === undefined) {
      return 0;
    }
  }

  const text = evidenceText(report);
  if (text === "") {
    process.stderr.write("jev-evidence: nothing fired; no evidence\n");
    return 0;
  }
  const outPath =
    parsed.values.out === undefined
      ? join(mkdtempSync(join(tmpdir(), "jev-evidence-")), "jev-evidence.txt")
      : resolve(parsed.values.out);
  writeFileSync(outPath, text);
  process.stdout.write(`${outPath}\n`);
  return 0;
}

// Run only when node starts this file, not when a test imports it.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
