#!/usr/bin/env node
// The code half of the check on ranked findings (PRD FR-81). The refuter agent
// (agents/refuter.md) decides, for each ranked finding of a crit, whether the image shows it; this
// script does the text work around that decision, so the final crit keeps the form that
// agents/critic.md gives it. It uses only Node's own modules, so the installed plugin needs no
// install step.
//
// Usage:
//   node refute.mjs findings CRIT.md --out FINDINGS.md
//       Writes the ranked findings of the crit, numbered as in the crit, to FINDINGS.md: the only
//       part of the crit the refuter reads.
//   node refute.mjs apply CRIT.md VERDICTS.json
//       Prints the crit with each finding the refuter dropped taken out of the ranked list, the
//       rest numbered again from 1, and one line that names the dropped findings. The line goes at
//       the end, before a last `Better:` line when the crit has one.
//
// VERDICTS.json is the refuter's final message: one JSON object, optionally inside a ```json fence,
// {"findings": [{"number": 1, "verdict": "keep" | "drop", "evidence": "..."}]}, with exactly one
// entry for each ranked finding.
//
// Exit codes: 0 when it worked, 1 when the crit or the verdicts are not in the expected form, 2 for a
// wrong command line or a file it cannot read.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const EXIT_BAD_INPUT = 1;
const EXIT_WRONG_USE = 2;

const USAGE = `usage: node refute.mjs findings CRIT.md --out FINDINGS.md
       node refute.mjs apply CRIT.md VERDICTS.json`;

/** The start of the line that names the dropped findings. */
export const DROPPED_LINE_START = "Dropped on a second look:";

/**
 * The section headings agents/critic.md gives a crit. A section ends at the next one of these.
 * evals/critic/repeat.ts reads crits with the same list.
 */
const SECTION_HEADINGS = [
  "First read",
  "What it's for",
  "Verdict",
  "What would move it most",
  "Smaller things",
  "What's working",
  "Couldn't judge from a still",
  "Checklist",
];

const RANKED_HEADING = "What would move it most";

/**
 * Returns the name of the section heading a line starts with, or undefined. It accepts `**Name**`,
 * `**Name.**`, and `**Name:**`, and a curly apostrophe for a straight one.
 */
function sectionHeadingOf(line) {
  const normalized = line.replaceAll("’", "'");
  for (const name of SECTION_HEADINGS) {
    for (const ending of ["**", ".**", ":**"]) {
      if (normalized.startsWith(`**${name}${ending}`)) {
        return name;
      }
    }
  }
  return undefined;
}

/**
 * Splits a crit into the lines before the ranked list, the ranked items, and the lines after it.
 * Each item is { number, lines }: its first line starts with digits, a period, and a space at
 * column 0, and an indented, blank, or other line after it continues it. It throws when the crit
 * has no ranked heading or has it twice, when text comes before the first item, when a line in the
 * list starts with `**`, or when the items are not numbered 1, 2, 3 and so on.
 */
export function splitRankedList(critText) {
  const lines = critText.split("\n");
  const headingIndexes = [];
  lines.forEach((line, index) => {
    if (sectionHeadingOf(line) === RANKED_HEADING) {
      headingIndexes.push(index);
    }
  });
  if (headingIndexes.length === 0) {
    throw new Error(`the crit has no "${RANKED_HEADING}" heading`);
  }
  if (headingIndexes.length > 1) {
    throw new Error(`the heading "${RANKED_HEADING}" appears twice`);
  }
  const headingIndex = headingIndexes[0];
  let endIndex = lines.length;
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    if (sectionHeadingOf(lines[index]) !== undefined) {
      endIndex = index;
      break;
    }
  }
  const before = lines.slice(0, headingIndex + 1);
  const after = lines.slice(endIndex);
  const leading = [];
  const items = [];
  for (const line of lines.slice(headingIndex + 1, endIndex)) {
    if (line.startsWith("**")) {
      throw new Error(
        `unknown heading in the ranked list: "${line.trim().slice(0, 60)}"`,
      );
    }
    const match = /^(\d+)\.\s/.exec(line);
    if (match !== null) {
      items.push({ number: Number(match[1]), lines: [line] });
      continue;
    }
    const current = items[items.length - 1];
    if (current === undefined) {
      if (line.trim() !== "") {
        throw new Error(
          `text before the first ranked item: "${line.trim().slice(0, 60)}"`,
        );
      }
      leading.push(line);
      continue;
    }
    current.lines.push(line);
  }
  items.forEach((item, index) => {
    if (item.number !== index + 1) {
      throw new Error(`ranked item ${index + 1} is numbered ${item.number}`);
    }
  });
  return { before, leading, items, after };
}

/** Returns the text of each ranked finding, without its number, trimmed. */
export function rankedFindingTexts(critText) {
  return splitRankedList(critText).items.map((item) =>
    item.lines
      .join("\n")
      .replace(/^\d+\.\s+/, "")
      .trim(),
  );
}

/** Returns the findings file the refuter reads: each ranked finding with its number, one blank line apart. */
export function findingsFileText(critText) {
  const texts = rankedFindingTexts(critText);
  return `${texts.map((text, index) => `${index + 1}. ${text}`).join("\n\n")}\n`;
}

/**
 * Parses the refuter's final message into its list of verdicts, checked against the number of
 * ranked findings. A ```json fence around the object is allowed, and so is text before or after
 * it: the object runs from the first `{` to the last `}`. It throws when there is no such object,
 * when a number is missing, repeated, or out of range, when a verdict is not keep or drop, or when
 * an entry has no evidence.
 */
export function parseVerdicts(messageText, findingCount) {
  const start = messageText.indexOf("{");
  const end = messageText.lastIndexOf("}");
  if (start === -1 || end < start) {
    throw new Error("the refuter's message holds no JSON object");
  }
  let parsed;
  try {
    parsed = JSON.parse(messageText.slice(start, end + 1));
  } catch (error) {
    throw new Error(`the refuter's JSON does not parse: ${error.message}`);
  }
  if (
    parsed === null ||
    typeof parsed !== "object" ||
    !Array.isArray(parsed.findings)
  ) {
    throw new Error('the refuter\'s JSON has no "findings" list');
  }
  const verdicts = [];
  const seen = new Set();
  for (const entry of parsed.findings) {
    if (entry === null || typeof entry !== "object") {
      throw new Error("a verdict is not an object");
    }
    const number = entry.number;
    if (!Number.isInteger(number) || number < 1 || number > findingCount) {
      throw new Error(
        `verdict number ${String(number)} is not a ranked finding (1 to ${findingCount})`,
      );
    }
    if (seen.has(number)) {
      throw new Error(`finding ${number} has two verdicts`);
    }
    seen.add(number);
    if (entry.verdict !== "keep" && entry.verdict !== "drop") {
      throw new Error(
        `finding ${number} has verdict ${String(entry.verdict)}, not keep or drop`,
      );
    }
    if (typeof entry.evidence !== "string" || entry.evidence.trim() === "") {
      throw new Error(`finding ${number} has no evidence`);
    }
    verdicts.push({
      number,
      verdict: entry.verdict,
      evidence: entry.evidence.trim(),
    });
  }
  for (let number = 1; number <= findingCount; number += 1) {
    if (!seen.has(number)) {
      throw new Error(`finding ${number} has no verdict`);
    }
  }
  verdicts.sort((left, right) => left.number - right.number);
  return verdicts;
}

/**
 * Returns a short name for a finding, from the crit's own words: its bold lead when it starts with
 * one, otherwise the text up to the first colon or period, cut to 100 characters.
 */
export function findingName(findingText) {
  const bold = /^\*\*(.+?)\*\*/.exec(findingText);
  let name = bold === null ? findingText.split(/[:.]\s/)[0] : bold[1];
  name = name
    .replace(/[*`]/g, "")
    .replace(/[.:]+$/, "")
    .trim();
  if (name.length > 100) {
    name = `${name.slice(0, 99).trimEnd()}…`;
  }
  return name;
}

/** Returns true when a line, without Markdown marks, starts with `Better:`, the last line compare asks for. */
function isBetterLine(line) {
  return /^better:/i.test(
    line
      .replace(/^[>#\-*\s]+/, "")
      .replaceAll(/[*_`]/g, "")
      .trim(),
  );
}

/**
 * Returns the crit after the refuter's verdicts: each dropped finding taken out of the ranked list,
 * the kept ones numbered again from 1, and, when any was dropped, one line that names each dropped
 * finding with the refuter's evidence. That line goes at the end of the crit, before a last
 * `Better:` line when there is one, so evaluations that read the last line still find it. With no
 * finding dropped, it returns the crit unchanged.
 */
export function applyVerdicts(critText, verdicts) {
  const split = splitRankedList(critText);
  const droppedNumbers = new Set(
    verdicts
      .filter((verdict) => verdict.verdict === "drop")
      .map((verdict) => verdict.number),
  );
  if (droppedNumbers.size === 0) {
    return critText;
  }
  const kept = [];
  const droppedParts = [];
  for (const item of split.items) {
    const text = item.lines
      .join("\n")
      .replace(/^\d+\.\s+/, "")
      .trim();
    if (droppedNumbers.has(item.number)) {
      const evidence = verdicts.find(
        (verdict) => verdict.number === item.number,
      ).evidence;
      droppedParts.push(
        `"${findingName(text)}" (${evidence.replace(/\s+/g, " ")})`,
      );
      continue;
    }
    const newNumber = kept.length + 1;
    const lines = [...item.lines];
    lines[0] = lines[0].replace(/^\d+\./, `${newNumber}.`);
    kept.push(lines);
  }
  // Keep the blank line that ended the last item before the next heading, when it had one.
  const keptLines = kept.flat();
  const lastItemLines = split.items[split.items.length - 1]?.lines ?? [];
  const endedBlank =
    lastItemLines.length > 0 &&
    lastItemLines[lastItemLines.length - 1].trim() === "";
  if (
    endedBlank &&
    (keptLines.length === 0 || keptLines[keptLines.length - 1].trim() !== "")
  ) {
    keptLines.push("");
  }
  const lines = [
    ...split.before,
    ...split.leading,
    ...keptLines,
    ...split.after,
  ];
  const droppedLine = `${DROPPED_LINE_START} ${droppedParts.join("; ")}.`;
  // Trailing blank lines are set aside, so the new line goes after the last text.
  let lastTextIndex = lines.length - 1;
  while (lastTextIndex >= 0 && lines[lastTextIndex].trim() === "") {
    lastTextIndex -= 1;
  }
  const trailing = lines.slice(lastTextIndex + 1);
  const body = lines.slice(0, lastTextIndex + 1);
  const lastLine = body[body.length - 1];
  if (lastLine !== undefined && isBetterLine(lastLine)) {
    body.splice(body.length - 1, 0, droppedLine, "");
  } else {
    body.push("", droppedLine);
  }
  return [...body, ...trailing].join("\n");
}

/** Reads a text file, or exits with the wrong-use code when it cannot. */
function readTextOrExit(path) {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    process.stderr.write(`cannot read ${path}: ${error.message}\n`);
    process.exit(EXIT_WRONG_USE);
  }
}

/** Runs the command line and returns the exit code. */
export function main(argv) {
  const [command, critPath, third, fourth] = argv;
  if (
    command === "findings" &&
    critPath !== undefined &&
    third === "--out" &&
    fourth !== undefined
  ) {
    const critText = readTextOrExit(critPath);
    try {
      writeFileSync(fourth, findingsFileText(critText));
    } catch (error) {
      process.stderr.write(`${error.message}\n`);
      return EXIT_BAD_INPUT;
    }
    process.stdout.write(`${fourth}\n`);
    return 0;
  }
  if (
    command === "apply" &&
    critPath !== undefined &&
    third !== undefined &&
    fourth === undefined
  ) {
    const critText = readTextOrExit(critPath);
    const messageText = readTextOrExit(third);
    try {
      const count = splitRankedList(critText).items.length;
      process.stdout.write(
        applyVerdicts(critText, parseVerdicts(messageText, count)),
      );
    } catch (error) {
      process.stderr.write(`${error.message}\n`);
      return EXIT_BAD_INPUT;
    }
    return 0;
  }
  process.stderr.write(`${USAGE}\n`);
  return EXIT_WRONG_USE;
}

// Run only when node starts this file, not when a test imports it.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
