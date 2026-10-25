// The question text a criterion is asked, as a SHA-256, and the two files that keep it next to the
// saved answers (EV-4 rule 5, R-4, crit-q25.23). A pair of a fixture and a criterion counts as
// scored only for the question it was asked, so a reworded criterion can be asked again under its
// own id. The record file next to each answers file maps each criterion that file answers to the
// hash of its question; the asked list holds every question a live run with that model asked.
// crit's answers file does not change (OQ-26, AC-2). It does no I/O; run-agreement.ts reads and
// writes the files.

import { createHash } from "node:crypto";

/** The criterion fields that make up the question crit sends (src/build/build.ts). */
const QUESTION_FIELDS: readonly string[] = [
  "question",
  "locate",
  "locate_instructions",
];

/** One line of the asked list: a question hash and the criterion (`<pack>/<id>`) it was asked for. */
export type AskedQuestionHash = {
  readonly questionSha256: string;
  readonly criterion: string;
};

/**
 * Return the SHA-256 of a criterion's question: its `question`, `locate`, and `locate_instructions`
 * fields from the parsed pack.yaml, as JSON with sorted keys and with an absent field left out.
 * Thresholds, the fix hint, the title, and the source are left out, because build does not send
 * them, so a change to them is not a new question.
 */
export function hashCriterionQuestion(criterion: object): string {
  const questionFields: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(criterion)) {
    if (QUESTION_FIELDS.includes(field)) {
      questionFields[field] = value;
    }
  }
  return createHash("sha256")
    .update(formatCanonicalJson(questionFields))
    .digest("hex");
}

/**
 * Return a value as JSON text with the keys of every object sorted and undefined fields left out,
 * so the same question always gives the same text, whatever order pack.yaml wrote its keys in.
 */
export function formatCanonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    const items: string[] = [];
    for (const item of value) {
      items.push(formatCanonicalJson(item));
    }
    return `[${items.join(",")}]`;
  }
  if (typeof value === "object" && value !== null) {
    const fields = Object.entries(value);
    // Keys sort the same by code unit in every locale (CS-18).
    fields.sort((left, right) => compareCodeUnits(left[0], right[0]));
    const entries: string[] = [];
    for (const [key, fieldValue] of fields) {
      if (fieldValue === undefined) {
        continue;
      }
      entries.push(`${JSON.stringify(key)}:${formatCanonicalJson(fieldValue)}`);
    }
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

/** Compare two strings by code unit, the same in every locale (CS-18). */
function compareCodeUnits(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

/**
 * Return the name of the record file that sits next to an answers file: `<image>.answers.json`
 * gets `<image>.answers.questions.json`, and `<image>.answers-N.json` gets
 * `<image>.answers-N.questions.json`.
 */
export function recordFileNameFor(answersFileName: string): string {
  const suffix = ".json";
  if (!answersFileName.endsWith(suffix)) {
    throw new Error(`${answersFileName} is not an answers file name`);
  }
  return `${answersFileName.slice(0, -suffix.length)}.questions${suffix}`;
}

/**
 * Read the text of a record file: a JSON object from each criterion id (`<pack>/<id>`) to the
 * 64-character lowercase hex SHA-256 of the question it was asked. Throw on any other shape,
 * because a damaged record could count an answer to an old question as current (CS-7).
 */
export function parseQuestionRecord(text: string): Map<string, string> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("the question record is not JSON");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("the question record is not a JSON object");
  }
  const hashByCriterion = new Map<string, string>();
  for (const [criterion, questionSha256] of Object.entries(parsed)) {
    if (typeof questionSha256 !== "string" || !isSha256(questionSha256)) {
      throw new Error(
        `the question record has a value for ${criterion} that is not a SHA-256`,
      );
    }
    hashByCriterion.set(criterion, questionSha256);
  }
  return hashByCriterion;
}

/** Return the text of a record file for these criteria and hashes: sorted keys, one per line. */
export function formatQuestionRecord(
  hashByCriterion: ReadonlyMap<string, string>,
): string {
  const record: Record<string, string> = {};
  // Criterion ids sort the same by code unit in every locale (CS-18).
  const criteria = [...hashByCriterion.keys()].sort();
  for (const criterion of criteria) {
    record[criterion] = hashByCriterion.get(criterion) ?? "";
  }
  return `${JSON.stringify(record, null, 2)}\n`;
}

/**
 * Read the text of an asked list: one line `<sha256> <pack>/<id>` per question asked. Blank lines
 * are ignored. Throw on any other line, because a damaged list could let a second rewording
 * through (R-4).
 */
export function parseAskedQuestionHashes(text: string): AskedQuestionHash[] {
  const asked: AskedQuestionHash[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") {
      continue;
    }
    const match = /^([0-9a-f]{64}) ([^\s/]+\/[^\s]+)$/.exec(trimmed);
    if (match === null) {
      throw new Error(
        `the asked question list has a line that is not "<sha256> <pack>/<id>": ${trimmed}`,
      );
    }
    asked.push({
      questionSha256: match[1] ?? "",
      criterion: match[2] ?? "",
    });
  }
  return asked;
}

/**
 * Return the text of an asked list that holds every line of both lists, sorted, once each. A live
 * run calls it with the questions it is about to ask, so the list only grows.
 */
export function formatAskedQuestionHashes(
  previous: readonly AskedQuestionHash[],
  added: readonly AskedQuestionHash[],
): string {
  const lines = new Set<string>();
  for (const entry of previous) {
    lines.add(`${entry.questionSha256} ${entry.criterion}`);
  }
  for (const entry of added) {
    lines.add(`${entry.questionSha256} ${entry.criterion}`);
  }
  // Hex strings and ids sort the same by code unit in every locale (CS-18).
  const sorted = [...lines].sort();
  return sorted.map((line) => `${line}\n`).join("");
}

/** Say whether a string is a 64-character lowercase hex SHA-256. */
function isSha256(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}
