// The human label file for EV-5: evals/agreement/labels/<pack>.csv, written only by Benjamin
// Jackson. The harness and every agent only read it. This module holds the one function that
// checks it (CS-7). It reads no file: run-agreement.ts reads the text and passes it here.

/** A human label's answer: the defect is present, absent, or the labeller cannot tell (EV-5). */
export type DefectPresent = "yes" | "no" | "cannot tell";

/**
 * One row of a label file: a fixture path relative to the pack directory, as the pack's
 * `fixtures` field writes it, the bare criterion id, and the label. Field names are the file's
 * column names (CS-10).
 */
export type FixtureLabel = {
  readonly fixture: string;
  readonly criterion: string;
  readonly defect_present: DefectPresent;
};

/** The header line every label file starts with, in this order (EV-5). */
export const LABEL_FILE_HEADER = "fixture,criterion,defect_present";

/**
 * The pack facts a label file is checked against: the criterion ids and every fixture path the
 * pack lists. Absent when only the coverage count is needed and the pack was not loaded.
 */
export type LabelPackCheck = {
  readonly criterionIds: ReadonlySet<string>;
  readonly fixtures: ReadonlySet<string>;
};

/**
 * Read and check the text of one label file. It rejects a missing header, a row without exactly
 * three fields, an empty field, a quote, a label other than yes, no, or cannot tell, a repeated
 * fixture and criterion pair, and, when `pack` is given, a criterion or fixture the pack does not
 * have. Each message names the file and the line (EV-5, CS-7).
 */
export function readLabels(
  fileName: string,
  csvText: string,
  pack: LabelPackCheck | undefined,
): FixtureLabel[] {
  const lines = csvText.split(/\r?\n/);
  // A file that ends with a newline gives one empty string after the last line; drop only that.
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  if (lines[0] !== LABEL_FILE_HEADER) {
    throw new Error(
      `${fileName} line 1: the header must be ${LABEL_FILE_HEADER}`,
    );
  }
  const labels: FixtureLabel[] = [];
  const seenPairs = new Set<string>();
  for (let index = 1; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const where = `${fileName} line ${lineNumber}`;
    const line = lines[index] ?? "";
    if (line.includes('"')) {
      throw new Error(`${where}: quotes are not supported`);
    }
    const fields = line.split(",");
    if (fields.length !== 3) {
      throw new Error(
        `${where}: expected 3 fields (${LABEL_FILE_HEADER}), found ${fields.length}`,
      );
    }
    const fixture = (fields[0] ?? "").trim();
    const criterion = (fields[1] ?? "").trim();
    const defectPresentText = (fields[2] ?? "").trim();
    if (fixture === "" || criterion === "") {
      throw new Error(`${where}: fixture and criterion must not be empty`);
    }
    const defectPresent = checkDefectPresent(where, defectPresentText);
    const pair = `${fixture},${criterion}`;
    if (seenPairs.has(pair)) {
      throw new Error(
        `${where}: ${fixture} and ${criterion} are already labelled`,
      );
    }
    seenPairs.add(pair);
    if (pack !== undefined) {
      if (!pack.criterionIds.has(criterion)) {
        throw new Error(`${where}: the pack has no criterion ${criterion}`);
      }
      if (!pack.fixtures.has(fixture)) {
        throw new Error(`${where}: the pack lists no fixture ${fixture}`);
      }
    }
    labels.push({ fixture, criterion, defect_present: defectPresent });
  }
  return labels;
}

/** Check that a label is yes, no, or cannot tell, and name the line when it is not (EV-5). */
function checkDefectPresent(where: string, text: string): DefectPresent {
  if (text === "yes" || text === "no" || text === "cannot tell") {
    return text;
  }
  throw new Error(
    `${where}: defect_present must be yes, no, or cannot tell, not "${text}"`,
  );
}
