import { describe, expect, it } from "vitest";
import {
  LABEL_FILE_HEADER,
  type LabelPackCheck,
  readLabels,
} from "./labels.ts";

const FILE_NAME = "labels/typography.csv";

const PACK: LabelPackCheck = {
  criterionIds: new Set(["faint-body-text"]),
  fixtures: new Set([
    "fixtures/faint.positive.png",
    "fixtures/faint.negative.png",
  ]),
};

describe("readLabels", () => {
  it("reads yes, no, and cannot tell rows, with or without a final newline", () => {
    const text = [
      LABEL_FILE_HEADER,
      "fixtures/faint.positive.png,faint-body-text,yes",
      "fixtures/faint.negative.png,faint-body-text,cannot tell",
    ].join("\n");
    const expected = [
      {
        fixture: "fixtures/faint.positive.png",
        criterion: "faint-body-text",
        defect_present: "yes",
      },
      {
        fixture: "fixtures/faint.negative.png",
        criterion: "faint-body-text",
        defect_present: "cannot tell",
      },
    ];
    expect(readLabels(FILE_NAME, text, PACK)).toEqual(expected);
    expect(readLabels(FILE_NAME, `${text}\n`, PACK)).toEqual(expected);
  });

  it("rejects a file without the header, naming the file and line 1", () => {
    expect(() => readLabels(FILE_NAME, "fixture,criterion\n", PACK)).toThrow(
      "labels/typography.csv line 1: the header must be fixture,criterion,defect_present",
    );
  });

  it("rejects a bad label, naming the file and the line", () => {
    const text = `${LABEL_FILE_HEADER}\nfixtures/faint.positive.png,faint-body-text,yes\nfixtures/faint.negative.png,faint-body-text,maybe\n`;
    expect(() => readLabels(FILE_NAME, text, PACK)).toThrow(
      'labels/typography.csv line 3: defect_present must be yes, no, or cannot tell, not "maybe"',
    );
  });

  it("rejects a row with the wrong number of fields, an empty field, or a quote", () => {
    expect(() =>
      readLabels(
        FILE_NAME,
        `${LABEL_FILE_HEADER}\nfixtures/faint.positive.png,yes\n`,
        PACK,
      ),
    ).toThrow("labels/typography.csv line 2: expected 3 fields");
    expect(() =>
      readLabels(
        FILE_NAME,
        `${LABEL_FILE_HEADER}\n,faint-body-text,yes\n`,
        PACK,
      ),
    ).toThrow(
      "labels/typography.csv line 2: fixture and criterion must not be empty",
    );
    expect(() =>
      readLabels(
        FILE_NAME,
        `${LABEL_FILE_HEADER}\n"fixtures/faint.positive.png",faint-body-text,yes\n`,
        PACK,
      ),
    ).toThrow("labels/typography.csv line 2: quotes are not supported");
  });

  it("rejects a fixture and criterion pair labeled twice", () => {
    const text = `${LABEL_FILE_HEADER}\nfixtures/faint.positive.png,faint-body-text,yes\nfixtures/faint.positive.png,faint-body-text,no\n`;
    expect(() => readLabels(FILE_NAME, text, PACK)).toThrow(
      "labels/typography.csv line 3: fixtures/faint.positive.png and faint-body-text are already labeled",
    );
  });

  it("rejects a criterion or fixture the pack does not have, and skips that check with no pack", () => {
    const unknownCriterion = `${LABEL_FILE_HEADER}\nfixtures/faint.positive.png,no-such-criterion,yes\n`;
    const unknownFixture = `${LABEL_FILE_HEADER}\nfixtures/other.png,faint-body-text,yes\n`;
    expect(() => readLabels(FILE_NAME, unknownCriterion, PACK)).toThrow(
      "labels/typography.csv line 2: the pack has no criterion no-such-criterion",
    );
    expect(() => readLabels(FILE_NAME, unknownFixture, PACK)).toThrow(
      "labels/typography.csv line 2: the pack lists no fixture fixtures/other.png",
    );
    expect(readLabels(FILE_NAME, unknownFixture, undefined)).toHaveLength(1);
  });
});
