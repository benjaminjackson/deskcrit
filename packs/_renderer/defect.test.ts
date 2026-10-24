import { expect, test } from "vitest";
import {
  buildPairEvidence,
  contrastRatio,
  type DefectDeclaration,
  describeRangeMismatch,
  type ElementSnapshot,
  findDeclarationProblems,
  isPropertyDeclared,
  type PageSnapshot,
  parseCssColour,
  parseDefectDeclaration,
  parseGuidelineRanges,
  templateCriterionId,
} from "./defect.js";

/** Builds a page of <html>, <body>, and one <p> with text, with the given styles on the <p>. */
function pageWithParagraph(
  paragraphStyles: Record<string, string>,
  textEdgeDistance: number | null = 80,
): PageSnapshot {
  const elements: ElementSnapshot[] = [
    {
      path: "html",
      parentIndex: null,
      isSvg: false,
      hasOwnText: false,
      styles: { "background-color": "rgba(0, 0, 0, 0)" },
    },
    {
      path: "html/body[1]",
      parentIndex: 0,
      isSvg: false,
      hasOwnText: false,
      styles: { "background-color": "rgb(255, 255, 255)" },
    },
    {
      path: "html/body[1]/p[0]",
      parentIndex: 1,
      isSvg: false,
      hasOwnText: true,
      styles: {
        color: "rgb(17, 17, 17)",
        "font-size": "16px",
        "text-align": "start",
        ...paragraphStyles,
      },
    },
  ];
  return { elements, textEdgeDistance };
}

/** Runs the whole verify check on a pair built from two pages. */
function problemsFor(
  declaration: DefectDeclaration,
  positive: PageSnapshot,
  negative: PageSnapshot,
): string[] {
  const evidence = buildPairEvidence(positive, negative);
  return findDeclarationProblems(
    declaration,
    "x.positive.png",
    evidence.positive,
    "x.negative.png",
    evidence.negative,
  );
}

const FAINT_TEXT: DefectDeclaration = {
  properties: ["color"],
  range: { measure: "contrast-ratio", from: 2.5, to: 4.4 },
};

test("passes a pair whose positive is inside the range and whose negative is outside it", () => {
  // #9ca3af on white is 2.54:1; #111111 on white is 18.88:1.
  const problems = problemsFor(
    FAINT_TEXT,
    pageWithParagraph({ color: "rgb(156, 163, 175)" }),
    pageWithParagraph({}),
  );
  expect(problems).toEqual([]);
});

test("fails a positive fixture outside its declared range", () => {
  // #e5e7eb on white is 1.24:1, paler than any real page sets text.
  const problems = problemsFor(
    FAINT_TEXT,
    pageWithParagraph({ color: "rgb(229, 231, 235)" }),
    pageWithParagraph({}),
  );
  expect(problems).toHaveLength(1);
  expect(problems[0]).toContain("x.positive.png: contrast-ratio 1.24");
  expect(problems[0]).toContain("outside the declared range");
});

test("fails a negative fixture inside the declared defect range", () => {
  // #9ca3af on white is 2.54:1 and #6b7280 on white is 4.83:1, so the
  // negative here is the faint one, inside the range.
  const problems = problemsFor(
    FAINT_TEXT,
    pageWithParagraph({ color: "rgb(107, 114, 128)" }),
    pageWithParagraph({ color: "rgb(156, 163, 175)" }),
  );
  expect(problems.join("\n")).toContain(
    "x.negative.png: contrast-ratio 2.54 is inside the declared defect range",
  );
});

test("fails a pair that differs in a property the declaration does not list", () => {
  const problems = problemsFor(
    FAINT_TEXT,
    pageWithParagraph({ color: "rgb(156, 163, 175)", "font-size": "11px" }),
    pageWithParagraph({}),
  );
  expect(problems).toHaveLength(1);
  expect(problems[0]).toContain(
    'differ in font-size, which the declaration does not list: html/body[1]/p[0] is "11px" on and "16px" off',
  );
});

test("fails a pair whose two sides have different elements", () => {
  const positive = pageWithParagraph({ color: "rgb(156, 163, 175)" });
  const negative = pageWithParagraph({});
  negative.elements.push({
    path: "html/body[1]/h2[1]",
    parentIndex: 1,
    isSvg: false,
    hasOwnText: true,
    styles: {},
  });
  const problems = problemsFor(FAINT_TEXT, positive, negative);
  expect(problems).toHaveLength(1);
  expect(problems[0]).toContain("have different elements");
});

test("fails a declared range when the defect changes nothing it can measure", () => {
  const problems = problemsFor(
    FAINT_TEXT,
    pageWithParagraph({ "text-align": "center" }),
    pageWithParagraph({}),
  );
  expect(problems.join("\n")).toContain(
    "found no contrast-ratio that the defect changes",
  );
});

test("checks no range when the declaration says the range is not measured", () => {
  const problems = problemsFor(
    { properties: ["text-align"], range: null },
    pageWithParagraph({ "text-align": "center" }),
    pageWithParagraph({}),
  );
  expect(problems).toEqual([]);
});

test("measures the edge distance of the whole page on each side", () => {
  const problems = problemsFor(
    {
      properties: ["margin"],
      range: { measure: "edge-distance", from: 0, to: 8 },
    },
    pageWithParagraph({ "margin-left": "0px" }, 12),
    pageWithParagraph({ "margin-left": "64px" }, 64),
  );
  expect(problems).toEqual([
    "x.positive.png: edge-distance 12 is outside the declared range 0 to 8 (FR-54 rule 2)",
  ]);
});

test("cannot measure contrast on text over a background image", () => {
  const positive = pageWithParagraph({ color: "rgb(156, 163, 175)" });
  const body = positive.elements[1];
  if (body !== undefined) {
    body.styles["background-image"] = "linear-gradient(red, blue)";
  }
  const problems = problemsFor(FAINT_TEXT, positive, pageWithParagraph({}));
  expect(problems.join("\n")).toContain("could not measure contrast-ratio");
});

test("paints a see-through background over its ancestors before measuring contrast", () => {
  // Black at alpha 0.5 over white is rgb(127.5, 127.5, 127.5); white text on it is 3.98:1.
  const positive = pageWithParagraph({
    color: "rgb(255, 255, 255)",
    "background-color": "rgba(0, 0, 0, 0.5)",
  });
  const evidence = buildPairEvidence(positive, pageWithParagraph({}));
  expect(evidence.positive.measured["contrast-ratio"]).toEqual([3.98]);
});

test("counts derived and logical property names as part of a declared property", () => {
  expect(isPropertyDeclared("margin-inline-start", ["margin-left"])).toBe(true);
  expect(isPropertyDeclared("margin-left", ["margin"])).toBe(true);
  expect(isPropertyDeclared("inline-size", ["width"])).toBe(true);
  expect(
    isPropertyDeclared("border-start-start-radius", ["border-top-left-radius"]),
  ).toBe(true);
  expect(isPropertyDeclared("border-top-color", ["color"])).toBe(true);
  expect(
    isPropertyDeclared("-webkit-text-decorations-in-effect", [
      "text-decoration",
    ]),
  ).toBe(true);
  expect(isPropertyDeclared("font-size", ["font"])).toBe(true);
  expect(isPropertyDeclared("font-size", ["color"])).toBe(false);
  expect(isPropertyDeclared("width", ["color"])).toBe(false);
});

test("computes the WCAG contrast ratio of known colour pairs", () => {
  const white = parseCssColour("rgb(255, 255, 255)");
  const grey = parseCssColour("rgb(119, 119, 119)");
  const black = parseCssColour("rgb(0, 0, 0)");
  if (white === null || grey === null || black === null) {
    throw new Error("the test colours did not parse");
  }
  expect(contrastRatio(black, white)).toBe(21);
  expect(contrastRatio(grey, white)).toBe(4.48);
  expect(parseCssColour("color(srgb 1 0 0)")).toBeNull();
  expect(parseCssColour("rgba(0, 0, 0, 0.25)")?.alpha).toBe(0.25);
});

test("maps a numbered template to its criterion id", () => {
  expect(templateCriterionId("text-reads-faint--3")).toBe("text-reads-faint");
  expect(templateCriterionId("text-reads-faint")).toBe("text-reads-faint");
});

test("refuses a declaration with a missing field, an unknown field, or a reversed range", () => {
  expect(() =>
    parseDefectDeclaration('{"range": null}', "a.defect.json"),
  ).toThrow("properties must be a list");
  expect(() =>
    parseDefectDeclaration(
      '{"properties": ["color"], "range": null, "note": "x"}',
      "a.defect.json",
    ),
  ).toThrow("unknown field note");
  expect(() =>
    parseDefectDeclaration(
      '{"properties": ["color"], "range": {"measure": "contrast-ratio", "from": 4, "to": 2}}',
      "a.defect.json",
    ),
  ).toThrow("from not above to");
  expect(() =>
    parseDefectDeclaration(
      '{"properties": ["color"], "range": {"measure": "x-height", "from": 1, "to": 2}}',
      "a.defect.json",
    ),
  ).toThrow("range.measure must be one of");
});

test("reads both forms of a GUIDELINES.md Defect range line", () => {
  const markdown = [
    "### Text does not read as faint",
    "- **Defect range:** `text-reads-faint`: contrast ratio from 2.5 to 4.4.",
    "- **Defect range:** `content-touches-page-edge`: edge distance from 0 to 8 px.",
    "- **Defect range:** `wall-of-text`: not measured. One block many lines long.",
  ].join("\n");
  const ranges = parseGuidelineRanges(markdown);
  expect(ranges.get("text-reads-faint")).toEqual({
    measure: "contrast-ratio",
    from: 2.5,
    to: 4.4,
  });
  expect(ranges.get("content-touches-page-edge")).toEqual({
    measure: "edge-distance",
    from: 0,
    to: 8,
  });
  expect(ranges.get("wall-of-text")).toBeNull();
});

test("refuses a Defect range line in neither form, and an id given twice", () => {
  expect(() =>
    parseGuidelineRanges(
      "- **Defect range:** `text-reads-faint`: contrast from 2.5 to 4.4",
    ),
  ).toThrow("line 1");
  expect(() =>
    parseGuidelineRanges(
      [
        "- **Defect range:** `a`: not measured. Words.",
        "- **Defect range:** `a`: not measured. Words.",
      ].join("\n"),
    ),
  ).toThrow("second Defect range line");
});

test("says how a GUIDELINES.md range and a declared range differ", () => {
  expect(
    describeRangeMismatch(
      "text-reads-faint",
      { measure: "contrast-ratio", from: 2.5, to: 4.4 },
      { measure: "contrast-ratio", from: 2.5, to: 4.4 },
    ),
  ).toBeNull();
  expect(
    describeRangeMismatch(
      "text-reads-faint",
      { measure: "contrast-ratio", from: 2.5, to: 4.4 },
      { measure: "contrast-ratio", from: 1.5, to: 4.4 },
    ),
  ).toBe(
    "text-reads-faint: GUIDELINES.md says contrast-ratio 2.5 to 4.4, but its .defect.json says contrast-ratio 1.5 to 4.4",
  );
});
