/*
 * CSV reading and writing for the M-1 spike answer sheet (beads crit-oj5.5,
 * PRD M-1). Disposable. This file runs nothing on its own, so the test can
 * import it without starting the sheet.ts command.
 */

/** The columns of the answer sheet, in order. */
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

/** The position of the human_answer column. The columns before it must match spike/questions.yaml word for word. */
export const ANSWER_COLUMN = COLUMN_NAMES.indexOf("human_answer");

/** Turns rows into CSV text for the answer sheet (M-1). Every field is put in double quotes, and a double quote inside a field is doubled. */
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

/** Parses the answer sheet CSV into rows, and drops empty lines (M-1). It reads quoted fields with commas, quotes or line breaks, Windows line endings, and the byte order mark that spreadsheet apps add. */
export function parseCsv(csvText: string): string[][] {
  let text = csvText;
  // "﻿" is the byte order mark that Excel puts at the start of a file.
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
      if (character === "\r" && text[position + 1] === "\n") {
        currentField += "\n";
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
