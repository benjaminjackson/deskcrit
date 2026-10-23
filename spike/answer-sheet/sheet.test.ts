/*
 * Disposable tests for the M-1 spike answer sheet (crit-oj5.5). They run the
 * real sheet.ts command on temporary fixture files, never on
 * spike/human_answers.csv. Run them with: node --test sheet.test.ts
 */

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// node:test gives `test`, which registers one named test case.
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { formatCsv, parseCsv } from "./sheet.ts";

const SCRIPT_PATH = fileURLToPath(new URL("sheet.ts", import.meta.url));

/** Three questions, one of each type, in the same shape as spike/questions.yaml. */
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

/** Makes a temporary folder with the fixture questions and a blank sheet written by the blank step. Returns both paths. */
function makeFixture(): { sheetPath: string; questionsPath: string } {
  const folder = mkdtempSync(join(tmpdir(), "answer-sheet-test-"));
  const questionsPath = join(folder, "questions.yaml");
  const sheetPath = join(folder, "human_answers.csv");
  writeFileSync(questionsPath, FIXTURE_QUESTIONS);
  const result = runSheet("blank", sheetPath, questionsPath);
  assert.equal(result.status, 0, result.stderr);
  return { sheetPath, questionsPath };
}

/** Runs sheet.ts as a separate Node process and returns its exit code and output. */
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

/** Reads the sheet, lets the test change its rows, and writes it back. `changeRows` is a function that the caller passes in, written as `(rows) => { ... }`. */
function editSheet(
  sheetPath: string,
  changeRows: (rows: string[][]) => void,
): void {
  const rows = parseCsv(readFileSync(sheetPath, "utf8"));
  changeRows(rows);
  writeFileSync(sheetPath, formatCsv(rows));
}

/** Fills every answer in the sheet with the given answers, in row order. */
function fillAnswers(sheetPath: string, answers: string[]): void {
  editSheet(sheetPath, (rows) => {
    for (let index = 0; index < answers.length; index++) {
      rows[index + 1][6] = answers[index];
    }
  });
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
  assert.equal(result.status, 1);
  assert.match(result.stderr, /exists/);
});

test("check rejects an empty answer", () => {
  const fixture = makeFixture();
  fillAnswers(fixture.sheetPath, ["1", "  ", "2"]);
  const result = runSheet("check", fixture.sheetPath, fixture.questionsPath);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /row 3 \(long-lines\): human_answer is empty/);
});

test("check rejects an answer that matches no option", () => {
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

test("check rewrites numbers into option text and accepts exact option text", () => {
  const fixture = makeFixture();
  fillAnswers(fixture.sheetPath, ["2", " 0 ", "cramped, sparse"]);
  const result = runSheet("check", fixture.sheetPath, fixture.questionsPath);
  assert.equal(result.status, 0, result.stderr);
  const rows = parseCsv(readFileSync(fixture.sheetPath, "utf8"));
  assert.equal(rows[1][6], "false");
  assert.equal(rows[2][6], "cannot tell");
  assert.equal(rows[3][6], "cramped, sparse");

  fillAnswers(fixture.sheetPath, ["true", "3", "1"]);
  const secondResult = runSheet(
    "check",
    fixture.sheetPath,
    fixture.questionsPath,
  );
  assert.equal(secondResult.status, 0, secondResult.stderr);
  const secondRows = parseCsv(readFileSync(fixture.sheetPath, "utf8"));
  assert.equal(secondRows[1][6], "true");
  assert.equal(secondRows[2][6], "Too long.");
  assert.equal(secondRows[3][6], "even");

  const thirdResult = runSheet(
    "check",
    fixture.sheetPath,
    fixture.questionsPath,
  );
  assert.equal(thirdResult.status, 0, thirdResult.stderr);
  assert.match(thirdResult.stdout, /unchanged/);
});

test("check reads a sheet saved by a spreadsheet app with Windows line endings", () => {
  const fixture = makeFixture();
  fillAnswers(fixture.sheetPath, ["1", "1", "1"]);
  const unixText = readFileSync(fixture.sheetPath, "utf8");
  writeFileSync(fixture.sheetPath, `﻿${unixText.replaceAll("\n", "\r\n")}`);
  const result = runSheet("check", fixture.sheetPath, fixture.questionsPath);
  assert.equal(result.status, 0, result.stderr);
});
