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
 * When a step cannot run, for example because a file is missing, the YAML
 * is broken, or a question has an unknown type, it prints a short message
 * and exits with code 2. The blank step also exits with code 2 when the
 * sheet already exists.
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
 * An answer may be the option text, in any case, or the option number. The
 * check tries the text first and the number second, so a choice label made
 * of digits stays the same when the check runs again. Spaces around the
 * answer are ignored.
 *
 * Run `npm ci --prefix spike/answer-sheet` once first, to install `yaml`.
 */

// Node's built-in modules for files and paths. The "node:" prefix names a
// module that ships with Node, not one installed from npm.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";
import { ANSWER_COLUMN, COLUMN_NAMES, formatCsv, parseCsv } from "./csv.ts";

/** The text and number of the answer that means "cannot tell". */
const CANNOT_TELL_TEXT = "cannot tell";
const CANNOT_TELL_NUMBER = 0;

// A `type` names the shape of an object. It is erased when Node runs the
// file and is there only for the reader.
/** One question from spike/questions.yaml, with the fields the sheet uses. */
type SpikeQuestion = {
  id: string;
  domain: string;
  title: string;
  type: string;
  instructions: string;
  // `[string, string][]` is a list of pairs: each pair is a label and its
  // criterion text, in the order the YAML file lists them.
  criteria: [string, string][];
  levels: string[];
};

/** One numbered answer option. `text` is what the check step writes back. */
type AnswerOption = {
  number: number;
  text: string;
  description: string;
};

/** Reads one text field from a YAML mapping, and stops the run with a clear message when it is missing (M-1). */
function readTextField(
  mapping: Map<unknown, unknown>,
  fieldName: string,
  place: string,
): string {
  const value = mapping.get(fieldName);
  if (typeof value !== "string") {
    throw new Error(`${place}: field "${fieldName}" is missing or not text`);
  }
  return value;
}

/** Turns one parsed YAML entry into a SpikeQuestion (M-1). It keeps criteria as a list of pairs so a label made of digits keeps its YAML position. */
function readQuestion(entry: unknown, place: string): SpikeQuestion {
  // `instanceof Map` checks that the YAML entry is a mapping of keys to
  // values.
  if (!(entry instanceof Map)) {
    throw new Error(`${place}: is not a mapping`);
  }
  const id = readTextField(entry, "id", place);
  const questionPlace = `${place} (${id})`;
  const questionMapping = entry.get("question");
  if (!(questionMapping instanceof Map)) {
    throw new Error(`${questionPlace}: field "question" is missing`);
  }
  const criteria: [string, string][] = [];
  const criteriaMapping = questionMapping.get("criteria");
  if (criteriaMapping instanceof Map) {
    for (const [label, description] of criteriaMapping) {
      criteria.push([String(label), String(description)]);
    }
  }
  const levels: string[] = [];
  const levelList = questionMapping.get("levels");
  if (Array.isArray(levelList)) {
    for (const levelText of levelList) {
      levels.push(String(levelText));
    }
  }
  return {
    id,
    domain: readTextField(entry, "domain", questionPlace),
    title: readTextField(entry, "title", questionPlace),
    type: readTextField(questionMapping, "type", questionPlace),
    instructions: readTextField(questionMapping, "instructions", questionPlace),
    criteria,
    levels,
  };
}

/** Reads and parses the questions file, so each sheet row can be built from it (M-1). */
function readQuestions(questionsPath: string): SpikeQuestion[] {
  const fileText = readFileSync(questionsPath, "utf8");
  // mapAsMap makes the YAML library return each mapping as a Map. A Map keeps
  // keys in file order. A plain object would move keys made of digits, such
  // as "2", to the front.
  const parsed = parseYaml(fileText, { mapAsMap: true });
  if (!Array.isArray(parsed)) {
    throw new Error(`${questionsPath} is not a list of questions`);
  }
  const questions: SpikeQuestion[] = [];
  for (let index = 0; index < parsed.length; index++) {
    const place = `${questionsPath} entry ${index + 1}`;
    questions.push(readQuestion(parsed[index], place));
  }
  return questions;
}

/** Lists the answer options of one question, numbered from 1 in YAML order, with "cannot tell" as 0 at the end (M-1). */
function listAnswerOptions(question: SpikeQuestion): AnswerOption[] {
  const options: AnswerOption[] = [];
  if (question.type === "noul" || question.type === "choice") {
    if (question.criteria.length === 0) {
      throw new Error(`question ${question.id} has no criteria`);
    }
    for (const [label, description] of question.criteria) {
      options.push({
        number: options.length + 1,
        text: label,
        description: description,
      });
    }
  } else if (question.type === "score") {
    if (question.levels.length === 0) {
      throw new Error(`question ${question.id} has no levels`);
    }
    for (const levelText of question.levels) {
      options.push({
        number: options.length + 1,
        text: levelText,
        description: "",
      });
    }
  } else {
    throw new Error(
      `question ${question.id} has an unknown type: ${question.type}`,
    );
  }
  options.push({
    number: CANNOT_TELL_NUMBER,
    text: CANNOT_TELL_TEXT,
    description: "",
  });
  return options;
}

/** Writes the options of one question as the text of the options cell, so Benjamin sees every number and its meaning (M-1). */
function formatOptionsCell(options: AnswerOption[]): string {
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

/** Builds the blank sheet row of one question: the fixed columns, then an empty answer and empty notes (M-1). */
function buildBlankRow(question: SpikeQuestion): string[] {
  const options = listAnswerOptions(question);
  return [
    question.id,
    question.domain,
    question.type,
    question.title,
    question.instructions,
    formatOptionsCell(options),
    "",
    "",
  ];
}

/** Finds the option that an answer names, first by option text in any case and then by number (M-1). Returns undefined when no option matches. */
function findAnswerOption(
  answer: string,
  options: AnswerOption[],
): AnswerOption | undefined {
  const lowerCaseAnswer = answer.toLowerCase();
  for (const option of options) {
    if (option.text.toLowerCase() === lowerCaseAnswer) {
      return option;
    }
  }
  // The regular expression /^\d+$/ matches a string made only of digits.
  if (!/^\d+$/.test(answer)) {
    return undefined;
  }
  for (const option of options) {
    if (option.number === Number(answer)) {
      return option;
    }
  }
  return undefined;
}

/** Checks a sheet against the questions and returns the problems, plus the rows with each answer rewritten into its option text (M-1). Write the rows only when there are no problems. */
function checkSheet(
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
    for (let column = 0; column < ANSWER_COLUMN; column++) {
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
          `${rowLabel}: human_answer "${answer}" matches no option; use a number from the options column or its text`,
        );
      } else {
        canonicalRow[ANSWER_COLUMN] = option.text;
      }
    }
    canonicalRows.push(canonicalRow);
  }
  return { problems, canonicalRows };
}

/** Writes the blank sheet and returns the exit code (M-1). It refuses with code 2 when the sheet file exists, so it never erases answers. */
function writeBlankSheet(sheetPath: string, questionsPath: string): number {
  if (existsSync(sheetPath)) {
    console.error(
      `${sheetPath} exists; delete it first if you really want a blank sheet`,
    );
    return 2;
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

/** Runs the check step on the sheet file and returns the exit code (M-1). When it passes, it writes the sheet back with every answer as option text. */
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
  writeFileSync(sheetPath, formatCsv(result.canonicalRows));
  console.log(
    `passed: ${questions.length} answers; wrote ${sheetPath} with option text`,
  );
  return 0;
}

/** Reads the command line and runs the blank or check step (M-1). An error that stops a step prints a short message and gives exit code 2. */
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
  try {
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
  } catch (error) {
    // `error instanceof Error` checks that the thrown value has a message.
    // Printing only the message keeps the stack trace out of the output.
    if (error instanceof Error) {
      console.error(`could not run: ${error.message}`);
    } else {
      console.error(`could not run: ${String(error)}`);
    }
    process.exitCode = 2;
  }
}

main();
