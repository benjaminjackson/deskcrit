/*
 * Disposable tests for the M-1 spike answer sheet (crit-oj5.5). They run the
 * real sheet.ts command on temporary fixture files, never on
 * spike/human_answers.csv. Run them with: node --test sheet.test.ts
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// node:test gives `test`, which registers one named test case, and
// `afterEach`, which runs after every test case.
import { afterEach, test } from "node:test";
import { fileURLToPath } from "node:url";
import { ANSWER_COLUMN, formatCsv, parseCsv } from "./csv.ts";

const SCRIPT_PATH = fileURLToPath(new URL("sheet.ts", import.meta.url));

/** The prefix of every temporary folder that a test makes. */
const TEMPORARY_FOLDER_PREFIX = join(tmpdir(), "answer-sheet-test-");

/** The temporary folders made by the current test, deleted after it. */
const temporaryFolders: string[] = [];

/** Three questions, one of each type, in the same shape as spike/questions.yaml (M-1). */
const FIXTURE_QUESTIONS = `
- id: small-text
  domain: typography
  title: Text looks small
  question:
    type: noul
    instructions: Is the text small?
    criteria:
      "true": The text is small.
      "false": The text is fine.
- id: long-lines
  domain: typography
  title: Lines run long
  question:
    type: score
    instructions: How long are the lines?
    levels:
      - Comfortable.
      - Somewhat long.
      - Too long.
- id: density
  domain: layout
  title: Mixed density
  question:
    type: choice
    instructions: How even is the density?
    criteria:
      even: Even.
      "cramped, sparse": Cramped beside sparse, with a "quote".
`;

/** One choice question whose labels are made of digits, listed out of number order (M-1). */
const DIGIT_LABEL_QUESTIONS = `
- id: column-count
  domain: layout
  title: Column count
  question:
    type: choice
    instructions: How many columns?
    criteria:
      "2": Two columns.
      "1": One column.
`;

/** Deletes the temporary folders of the test that just ran (M-1). It deletes only folders with the test prefix, so a wrong path cannot delete anything else. */
afterEach(() => {
  for (const folder of temporaryFolders) {
    if (folder.startsWith(TEMPORARY_FOLDER_PREFIX)) {
      rmSync(folder, { recursive: true, force: true });
    }
  }
  // Setting length to 0 empties the list.
  temporaryFolders.length = 0;
});

/** Makes a temporary folder with the questions file and a blank sheet written by the blank step, and returns both paths (M-1). */
function makeFixture(questionsText = FIXTURE_QUESTIONS): {
  sheetPath: string;
  questionsPath: string;
} {
  const folder = mkdtempSync(TEMPORARY_FOLDER_PREFIX);
  temporaryFolders.push(folder);
  const questionsPath = join(folder, "questions.yaml");
  const sheetPath = join(folder, "human_answers.csv");
  writeFileSync(questionsPath, questionsText);
  const result = runSheet("blank", sheetPath, questionsPath);
  assert.equal(result.status, 0, result.stderr);
  return { sheetPath, questionsPath };
}

/** Runs sheet.ts as a separate Node process and returns its exit code and output (M-1). */
function runSheet(
  commandName: string,
  sheetPath: string,
  questionsPath: string,
): { status: number | null; stdout: string; stderr: string } {
  // process.execPath is the path of the Node program running this test.
  const result = spawnSync(
    process.execPath,
    [SCRIPT_PATH, commandName, sheetPath, questionsPath],
    { encoding: "utf8" },
  );
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

/** Reads the sheet, lets the test change its rows, and writes it back (M-1). `changeRows` is a function that the caller passes in, written as `(rows) => { ... }`. */
function editSheet(
  sheetPath: string,
  changeRows: (rows: string[][]) => void,
): void {
  const rows = parseCsv(readFileSync(sheetPath, "utf8"));
  changeRows(rows);
  writeFileSync(sheetPath, formatCsv(rows));
}

/** Fills every answer in the sheet with the given answers, in row order (M-1). */
function fillAnswers(sheetPath: string, answers: string[]): void {
  editSheet(sheetPath, (rows) => {
    for (let index = 0; index < answers.length; index++) {
      rows[index + 1][ANSWER_COLUMN] = answers[index];
    }
  });
}

/** Reads the answer column of every row after the header (M-1). */
function readAnswers(sheetPath: string): string[] {
  const rows = parseCsv(readFileSync(sheetPath, "utf8"));
  const answers: string[] = [];
  for (const row of rows.slice(1)) {
    answers.push(row[ANSWER_COLUMN]);
  }
  return answers;
}

test("blank writes one row per question with empty answers and numbered options", () => {
  const fixture = makeFixture();
  const rows = parseCsv(readFileSync(fixture.sheetPath, "utf8"));
  assert.equal(rows.length, 4);
  assert.deepEqual(rows[1], [
    "small-text",
    "typography",
    "noul",
    "Text looks small",
    "Is the text small?",
    "1 = true: The text is small. | 2 = false: The text is fine. | 0 = cannot tell",
    "",
    "",
  ]);
  assert.equal(
    rows[2][5],
    "1 = Comfortable. | 2 = Somewhat long. | 3 = Too long. | 0 = cannot tell",
  );
  assert.equal(
    rows[3][5],
    '1 = even: Even. | 2 = cramped, sparse: Cramped beside sparse, with a "quote". | 0 = cannot tell',
  );
});

test("blank refuses to overwrite a sheet that exists", () => {
  const fixture = makeFixture();
  const result = runSheet("blank", fixture.sheetPath, fixture.questionsPath);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /exists/);
});

test("check rejects an empty answer", () => {
  const fixture = makeFixture();
  fillAnswers(fixture.sheetPath, ["1", "  ", "2"]);
  const result = runSheet("check", fixture.sheetPath, fixture.questionsPath);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /row 3 \(long-lines\): human_answer is empty/);
});

test("check rejects an answer that matches no option and leaves the file unchanged", () => {
  const fixture = makeFixture();
  fillAnswers(fixture.sheetPath, ["3", "maybe", "Even."]);
  const before = readFileSync(fixture.sheetPath, "utf8");
  const result = runSheet("check", fixture.sheetPath, fixture.questionsPath);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /small-text\): human_answer "3" matches no option/,
  );
  assert.match(
    result.stderr,
    /long-lines\): human_answer "maybe" matches no option/,
  );
  assert.match(
    result.stderr,
    /density\): human_answer "Even." matches no option/,
  );
  assert.equal(readFileSync(fixture.sheetPath, "utf8"), before);
});

test("check rejects too few rows and too many rows", () => {
  const fewer = makeFixture();
  fillAnswers(fewer.sheetPath, ["1", "1", "1"]);
  editSheet(fewer.sheetPath, (rows) => {
    rows.pop();
  });
  const fewerResult = runSheet("check", fewer.sheetPath, fewer.questionsPath);
  assert.equal(fewerResult.status, 1);
  assert.match(
    fewerResult.stderr,
    /sheet has 2 answer rows, but there are 3 questions/,
  );

  const more = makeFixture();
  fillAnswers(more.sheetPath, ["1", "1", "1"]);
  editSheet(more.sheetPath, (rows) => {
    rows.push([...rows[3]]);
  });
  const moreResult = runSheet("check", more.sheetPath, more.questionsPath);
  assert.equal(moreResult.status, 1);
  assert.match(
    moreResult.stderr,
    /sheet has 4 answer rows, but there are 3 questions/,
  );
});

test("check rejects a wrong header and leaves the file unchanged", () => {
  const fixture = makeFixture();
  fillAnswers(fixture.sheetPath, ["1", "1", "1"]);
  editSheet(fixture.sheetPath, (rows) => {
    rows[0][ANSWER_COLUMN] = "answer";
  });
  const before = readFileSync(fixture.sheetPath, "utf8");
  const result = runSheet("check", fixture.sheetPath, fixture.questionsPath);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /header must be/);
  assert.equal(readFileSync(fixture.sheetPath, "utf8"), before);
});

test("check rejects a row with the wrong column count", () => {
  const fixture = makeFixture();
  fillAnswers(fixture.sheetPath, ["1", "1", "1"]);
  editSheet(fixture.sheetPath, (rows) => {
    rows[2].pop();
  });
  const result = runSheet("check", fixture.sheetPath, fixture.questionsPath);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /row 3 \(long-lines\): has 7 columns, expected 8/,
  );
});

test("check rejects an id or wording that differs from the questions file", () => {
  const fixture = makeFixture();
  fillAnswers(fixture.sheetPath, ["1", "1", "1"]);
  editSheet(fixture.sheetPath, (rows) => {
    rows[1][0] = "small-type";
    rows[2][4] = "How long are the lines of text?";
    rows[3][5] = "1 = even | 2 = uneven | 0 = cannot tell";
  });
  const result = runSheet("check", fixture.sheetPath, fixture.questionsPath);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /row 2 \(small-text\): question_id differs/);
  assert.match(result.stderr, /row 3 \(long-lines\): instructions differs/);
  assert.match(result.stderr, /row 4 \(density\): options differs/);
});

test("check rewrites numbers into option text and accepts option text in any case", () => {
  const fixture = makeFixture();
  fillAnswers(fixture.sheetPath, ["2", " 0 ", "Cramped, Sparse"]);
  const result = runSheet("check", fixture.sheetPath, fixture.questionsPath);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readAnswers(fixture.sheetPath), [
    "false",
    "cannot tell",
    "cramped, sparse",
  ]);

  fillAnswers(fixture.sheetPath, ["TRUE", "3", "1"]);
  const secondResult = runSheet(
    "check",
    fixture.sheetPath,
    fixture.questionsPath,
  );
  assert.equal(secondResult.status, 0, secondResult.stderr);
  assert.deepEqual(readAnswers(fixture.sheetPath), [
    "true",
    "Too long.",
    "even",
  ]);

  const passedText = readFileSync(fixture.sheetPath, "utf8");
  const thirdResult = runSheet(
    "check",
    fixture.sheetPath,
    fixture.questionsPath,
  );
  assert.equal(thirdResult.status, 0, thirdResult.stderr);
  assert.equal(readFileSync(fixture.sheetPath, "utf8"), passedText);
});

test("check keeps a choice label made of digits when it runs again", () => {
  const fixture = makeFixture(DIGIT_LABEL_QUESTIONS);
  const rows = parseCsv(readFileSync(fixture.sheetPath, "utf8"));
  assert.equal(
    rows[1][5],
    "1 = 2: Two columns. | 2 = 1: One column. | 0 = cannot tell",
  );
  fillAnswers(fixture.sheetPath, ["2"]);
  const firstResult = runSheet(
    "check",
    fixture.sheetPath,
    fixture.questionsPath,
  );
  assert.equal(firstResult.status, 0, firstResult.stderr);
  assert.deepEqual(readAnswers(fixture.sheetPath), ["2"]);
  const secondResult = runSheet(
    "check",
    fixture.sheetPath,
    fixture.questionsPath,
  );
  assert.equal(secondResult.status, 0, secondResult.stderr);
  assert.deepEqual(readAnswers(fixture.sheetPath), ["2"]);
});

test("check reads a sheet saved with Windows line endings, including inside a quoted field", () => {
  const fixture = makeFixture();
  const notesColumn = ANSWER_COLUMN + 1;
  fillAnswers(fixture.sheetPath, ["1", "1", "1"]);
  editSheet(fixture.sheetPath, (rows) => {
    rows[1][notesColumn] = "first line\nsecond line";
  });
  const unixText = readFileSync(fixture.sheetPath, "utf8");
  writeFileSync(fixture.sheetPath, `﻿${unixText.replaceAll("\n", "\r\n")}`);
  const result = runSheet("check", fixture.sheetPath, fixture.questionsPath);
  assert.equal(result.status, 0, result.stderr);
  const rows = parseCsv(readFileSync(fixture.sheetPath, "utf8"));
  assert.equal(rows[1][notesColumn], "first line\nsecond line");
});

test("check exits with code 2 and a short message when it cannot run", () => {
  const fixture = makeFixture();
  const missingSheetPath = `${fixture.sheetPath}.missing`;
  const missingResult = runSheet(
    "check",
    missingSheetPath,
    fixture.questionsPath,
  );
  assert.equal(missingResult.status, 2);
  assert.match(missingResult.stderr, /^could not run: .*no such file/);
  assert.doesNotMatch(missingResult.stderr, /\n\s+at /);

  writeFileSync(fixture.questionsPath, "- id: [broken\n");
  const brokenResult = runSheet(
    "check",
    fixture.sheetPath,
    fixture.questionsPath,
  );
  assert.equal(brokenResult.status, 2);
  assert.match(brokenResult.stderr, /^could not run: /);

  writeFileSync(
    fixture.questionsPath,
    FIXTURE_QUESTIONS.replace("type: score", "type: ranking"),
  );
  const unknownResult = runSheet(
    "check",
    fixture.sheetPath,
    fixture.questionsPath,
  );
  assert.equal(unknownResult.status, 2);
  assert.match(unknownResult.stderr, /unknown type: ranking/);
});
