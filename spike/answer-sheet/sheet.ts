/*
 * M-1 spike answer sheet (beads crit-oj5.5, PRD M-1). Disposable: this
 * script exists only for the spike and may be deleted after it.
 *
 * Benjamin Jackson answers the twenty questions in spike/questions.yaml by
 * looking at spike/screenshot.png, before he sees any Jev answer. This script
 * has two steps:
 *
 *   node spike/answer-sheet/sheet.ts blank [sheet.csv] [questions.yaml]
 *     Writes a blank sheet. It refuses to overwrite a sheet that exists, so
 *     it can never erase answers.
 *
 *   node spike/answer-sheet/sheet.ts check [sheet.csv] [questions.yaml]
 *     Checks a filled sheet against the questions. If every row passes, it
 *     rewrites each answer given as a number into the option text, and writes
 *     the sheet back to the same file. If any row fails, it prints every
 *     problem, changes nothing, and exits with code 1.
 *
 * The sheet path defaults to spike/human_answers.csv and the questions path
 * to spike/questions.yaml.
 *
 * Sheet format: CSV with a header row, every field in double quotes, and one
 * row per question in the order of spike/questions.yaml. The columns are:
 *
 *   question_id    the question id
 *   domain         the pack the question belongs to
 *   type           noul, score, or choice
 *   question_text  the question title
 *   instructions   the question text that Jev gets
 *   options        the numbered options, separated by " | "
 *   human_answer   empty in the blank sheet; Benjamin fills it in
 *   human_notes    empty in the blank sheet; optional free text
 *
 * Options are numbered from 1 in the order of the YAML file. Number 0 is
 * always "cannot tell" and is a valid answer. The option text, which is what
 * the check step writes back, is:
 *
 *   noul    "true" or "false". The options cell shows the criterion after a
 *           colon, for example "1 = true: The text is too small. | ...".
 *   score   the full text of the level. Option 1 is level index 0, the best
 *           state, because 0 is taken by "cannot tell".
 *   choice  the option label, for example "even". The options cell shows
 *           the criterion after a colon.
 *
 * An answer may be the number or the exact option text. Spaces around the
 * answer are ignored.
 */

// Node's built-in modules for files and paths. The "node:" prefix names a
// module that ships with Node, not one installed from npm.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

/** The columns of the sheet, in order. */
export const COLUMN_NAMES = [
  "question_id",
  "domain",
  "type",
  "question_text",
  "instructions",
  "options",
  "human_answer",
  "human_notes",
];

/** The number of columns that must match spike/questions.yaml word for word. */
const FIXED_COLUMN_COUNT = 6;

/** The position of the human_answer column. */
const ANSWER_COLUMN = 6;

/** The text and number of the answer that means "cannot tell". */
const CANNOT_TELL_TEXT = "cannot tell";
const CANNOT_TELL_NUMBER = 0;

// A `type` names the shape of an object. It is erased when Node runs the
// file and is there only for the reader. A `?` after a field name means the
// field can be missing.
/** One question as it is written in spike/questions.yaml. */
type SpikeQuestion = {
  id: string;
  domain: string;
  title: string;
  question: {
    type: string;
    instructions: string;
    criteria?: Record<string, string>;
    levels?: string[];
  };
};

/** One numbered answer option. `text` is what the check step writes back. */
type AnswerOption = {
  number: number;
  text: string;
  description: string;
};

/** Reads and parses the questions file. */
export function readQuestions(questionsPath: string): SpikeQuestion[] {
  const fileText = readFileSync(questionsPath, "utf8");
  // `as SpikeQuestion[]` tells the reader the shape to expect. It checks
  // nothing when the script runs.
  return parseYaml(fileText) as SpikeQuestion[];
}

/** Lists the answer options of one question, numbered from 1 in YAML order, with "cannot tell" as 0 at the end. */
export function listAnswerOptions(question: SpikeQuestion): AnswerOption[] {
  const options: AnswerOption[] = [];
  const questionType = question.question.type;
  if (questionType === "noul" || questionType === "choice") {
    const criteria = question.question.criteria;
    if (criteria === undefined) {
      throw new Error(`question ${question.id} has no criteria`);
    }
    // Object.entries gives the [key, value] pairs in the order the YAML file
    // lists them.
    // `description` alone, inside the object below, is short for
    // `description: description`.
    for (const [label, description] of Object.entries(criteria)) {
      options.push({ number: options.length + 1, text: label, description });
    }
  } else if (questionType === "score") {
    const levels = question.question.levels;
    if (levels === undefined) {
      throw new Error(`question ${question.id} has no levels`);
    }
    for (const levelText of levels) {
      options.push({
        number: options.length + 1,
        text: levelText,
        description: "",
      });
    }
  } else {
    throw new Error(
      `question ${question.id} has an unknown type: ${questionType}`,
    );
  }
  options.push({
    number: CANNOT_TELL_NUMBER,
    text: CANNOT_TELL_TEXT,
    description: "",
  });
  return options;
}

/** Writes the options of one question as the text of the options cell. */
export function formatOptionsCell(options: AnswerOption[]): string {
  const parts: string[] = [];
  for (const option of options) {
    if (option.description === "") {
      parts.push(`${option.number} = ${option.text}`);
    } else {
      parts.push(`${option.number} = ${option.text}: ${option.description}`);
    }
  }
  return parts.join(" | ");
}

/** Builds the blank sheet row of one question: the six fixed columns, then an empty answer and empty notes. */
export function buildBlankRow(question: SpikeQuestion): string[] {
  const options = listAnswerOptions(question);
  return [
    question.id,
    question.domain,
    question.question.type,
    question.title,
    question.question.instructions,
    formatOptionsCell(options),
    "",
    "",
  ];
}

/** Turns rows into CSV text. Every field is put in double quotes, and a double quote inside a field is doubled. */
export function formatCsv(rows: string[][]): string {
  const lines: string[] = [];
  for (const row of rows) {
    const quotedFields: string[] = [];
    for (const field of row) {
      // replaceAll with a plain string replaces each `"` with `""`.
      quotedFields.push(`"${field.replaceAll('"', '""')}"`);
    }
    lines.push(quotedFields.join(","));
  }
  return `${lines.join("\n")}\n`;
}

/** Parses CSV text into rows. It handles quoted fields with commas, doubled quotes, and line breaks, Windows line endings, and the byte order mark that spreadsheet apps add. Empty lines are dropped. */
export function parseCsv(csvText: string): string[][] {
  let text = csvText;
  if (text.startsWith("﻿")) {
    text = text.slice(1);
  }
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuotes = false;
  let position = 0;
  while (position < text.length) {
    const character = text[position];
    if (insideQuotes) {
      if (character === '"' && text[position + 1] === '"') {
        currentField += '"';
        position += 2;
        continue;
      }
      if (character === '"') {
        insideQuotes = false;
      } else {
        currentField += character;
      }
      position += 1;
      continue;
    }
    if (character === '"') {
      insideQuotes = true;
    } else if (character === ",") {
      currentRow.push(currentField);
      currentField = "";
    } else if (character === "\n" || character === "\r") {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
      if (character === "\r" && text[position + 1] === "\n") {
        position += 1;
      }
    } else {
      currentField += character;
    }
    position += 1;
  }
  if (currentField !== "" || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }
  const nonEmptyRows: string[][] = [];
  for (const row of rows) {
    const isEmptyLine = row.length === 1 && row[0] === "";
    if (!isEmptyLine) {
      nonEmptyRows.push(row);
    }
  }
  return nonEmptyRows;
}

/** Finds the option that an answer names, by number or by exact option text. Returns undefined when no option matches. */
export function findAnswerOption(
  answer: string,
  options: AnswerOption[],
): AnswerOption | undefined {
  // The regular expression /^\d+$/ matches a string made only of digits.
  const isNumber = /^\d+$/.test(answer);
  for (const option of options) {
    if (isNumber && option.number === Number(answer)) {
      return option;
    }
    if (!isNumber && option.text === answer) {
      return option;
    }
  }
  return undefined;
}

/** Checks a sheet against the questions. Returns the list of problems, and the rows with each answer rewritten into its option text. The rows are only safe to write when there are no problems. */
export function checkSheet(
  sheetRows: string[][],
  questions: SpikeQuestion[],
): { problems: string[]; canonicalRows: string[][] } {
  const problems: string[] = [];
  const canonicalRows: string[][] = [];
  // `??` gives the right side when the left side is missing.
  const header = sheetRows[0] ?? [];
  if (header.join(",") !== COLUMN_NAMES.join(",")) {
    problems.push(`header must be: ${COLUMN_NAMES.join(",")}`);
  }
  canonicalRows.push(header);
  const dataRows = sheetRows.slice(1);
  if (dataRows.length !== questions.length) {
    problems.push(
      `sheet has ${dataRows.length} answer rows, but there are ${questions.length} questions`,
    );
  }
  const comparedRowCount = Math.min(dataRows.length, questions.length);
  for (let index = 0; index < comparedRowCount; index++) {
    const row = dataRows[index];
    const question = questions[index];
    const rowLabel = `row ${index + 2} (${question.id})`;
    if (row.length !== COLUMN_NAMES.length) {
      problems.push(
        `${rowLabel}: has ${row.length} columns, expected ${COLUMN_NAMES.length}`,
      );
      canonicalRows.push(row);
      continue;
    }
    const expectedRow = buildBlankRow(question);
    for (let column = 0; column < FIXED_COLUMN_COUNT; column++) {
      if (row[column] !== expectedRow[column]) {
        problems.push(
          `${rowLabel}: ${COLUMN_NAMES[column]} differs from spike/questions.yaml; expected "${expectedRow[column]}", found "${row[column]}"`,
        );
      }
    }
    const answer = row[ANSWER_COLUMN].trim();
    // `[...row]` makes a copy of the row, so the rewrite does not change
    // the input.
    const canonicalRow = [...row];
    if (answer === "") {
      problems.push(`${rowLabel}: human_answer is empty`);
    } else {
      const options = listAnswerOptions(question);
      const option = findAnswerOption(answer, options);
      if (option === undefined) {
        problems.push(
          `${rowLabel}: human_answer "${answer}" matches no option; use a number from the options column or its exact text`,
        );
      } else {
        canonicalRow[ANSWER_COLUMN] = option.text;
      }
    }
    canonicalRows.push(canonicalRow);
  }
  return { problems, canonicalRows };
}

/** Writes the blank sheet. It refuses when the sheet file exists, so it never erases answers. Returns the exit code. */
function writeBlankSheet(sheetPath: string, questionsPath: string): number {
  if (existsSync(sheetPath)) {
    console.error(
      `${sheetPath} exists; delete it first if you really want a blank sheet`,
    );
    return 1;
  }
  const questions = readQuestions(questionsPath);
  const rows: string[][] = [COLUMN_NAMES];
  for (const question of questions) {
    rows.push(buildBlankRow(question));
  }
  writeFileSync(sheetPath, formatCsv(rows));
  console.log(`wrote ${sheetPath} with ${questions.length} blank answers`);
  return 0;
}

/** Runs the check step on the sheet file. When it passes, it writes the sheet back with every answer as option text. Returns the exit code. */
function runCheck(sheetPath: string, questionsPath: string): number {
  const questions = readQuestions(questionsPath);
  const sheetText = readFileSync(sheetPath, "utf8");
  const result = checkSheet(parseCsv(sheetText), questions);
  if (result.problems.length > 0) {
    for (const problem of result.problems) {
      console.error(problem);
    }
    console.error(
      `rejected: ${result.problems.length} problems in ${sheetPath}; the file is unchanged`,
    );
    return 1;
  }
  const canonicalText = formatCsv(result.canonicalRows);
  if (canonicalText !== sheetText) {
    writeFileSync(sheetPath, canonicalText);
    console.log(
      `passed: ${questions.length} answers; rewrote ${sheetPath} with option text`,
    );
  } else {
    console.log(`passed: ${questions.length} answers; ${sheetPath} unchanged`);
  }
  return 0;
}

/** Reads the command line and runs the blank or check step. */
function main(): void {
  // process.argv holds [node path, script path, ...arguments].
  const commandName = process.argv[2];
  // fileURLToPath(new URL(..., import.meta.url)) gives a path relative to
  // this script's folder, so the command works from any working directory.
  const defaultSheetPath = fileURLToPath(
    new URL("../human_answers.csv", import.meta.url),
  );
  const defaultQuestionsPath = fileURLToPath(
    new URL("../questions.yaml", import.meta.url),
  );
  const sheetPath = process.argv[3] ?? defaultSheetPath;
  const questionsPath = process.argv[4] ?? defaultQuestionsPath;
  if (commandName === "blank") {
    process.exitCode = writeBlankSheet(sheetPath, questionsPath);
  } else if (commandName === "check") {
    process.exitCode = runCheck(sheetPath, questionsPath);
  } else {
    console.error(
      "usage: node spike/answer-sheet/sheet.ts blank|check [sheet.csv] [questions.yaml]",
    );
    process.exitCode = 2;
  }
}

// import.meta.main is true only when this file is the one Node was asked to
// run, so the test file can import the functions above without running main.
if (import.meta.main) {
  main();
}
