import { expect, test } from "vitest";
import {
  buildPairEvidence,
  contrastRatio,
  type DefectDeclaration,
  describeRangeMismatch,
  type ElementSnapshot,
  findDeclarationProblems,
  findPackDeclarationProblems,
  firstCleanValue,
  isPropertyDeclared,
  type PageSnapshot,
  parseCssColour,
  parseDefectDeclaration,
  parseGuidelineRanges,
  templateCriterionId,
} from "./defect.js";
import type { RenderRecord } from "./jobs.js";

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
      pseudoStyles: {},
    },
    {
      path: "html/body[1]",
      parentIndex: 0,
      isSvg: false,
      hasOwnText: false,
      styles: { "background-color": "rgb(255, 255, 255)" },
      pseudoStyles: {},
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
      pseudoStyles: {},
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
  range: { measure: "contrast-ratio", from: 2.5, to: 4.4, clean_side: "above" },
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
    "x.negative.png: contrast-ratio 2.54 is not on the clean side of the declared defect range 2.5 to 4.4; a negative fixture must be 4.5 or more",
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
    pseudoStyles: {},
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
      range: { measure: "edge-distance", from: 0, to: 8, clean_side: "above" },
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
  const covers = (property: string, declared: string[]): boolean =>
    isPropertyDeclared({ property }, declared);
  expect(covers("margin-inline-start", ["margin-left"])).toBe(true);
  expect(covers("margin-left", ["margin"])).toBe(true);
  expect(covers("inline-size", ["width"])).toBe(true);
  expect(covers("border-start-start-radius", ["border-top-left-radius"])).toBe(
    true,
  );
  expect(covers("border-top-left-radius", ["border-radius"])).toBe(true);
  expect(covers("border-left-color", ["border-color"])).toBe(true);
  expect(
    covers("-webkit-text-decorations-in-effect", ["text-decoration"]),
  ).toBe(true);
  expect(covers("font-size", ["font"])).toBe(true);
  expect(covers("line-height", ["font"])).toBe(true);
  expect(covers("font-size", ["color"])).toBe(false);
  expect(covers("width", ["color"])).toBe(false);
});

test("expands only the fixed shorthands, so a longhand name covers no other property", () => {
  const covers = (property: string, declared: string[]): boolean =>
    isPropertyDeclared({ property }, declared);
  expect(covers("text-decoration-color", ["text-decoration-line"])).toBe(false);
  expect(covers("font-size-adjust", ["font-size"])).toBe(false);
  expect(covers("border-top-color", ["border-top-width"])).toBe(false);
  expect(covers("background-color", ["margin"])).toBe(false);
});

test("lets a currentColor property through a declared color only where it equals color", () => {
  expect(
    isPropertyDeclared({ property: "border-top-color", follows_color: true }, [
      "color",
    ]),
  ).toBe(true);
  expect(
    isPropertyDeclared({ property: "border-top-color", follows_color: false }, [
      "color",
    ]),
  ).toBe(false);
});

test("fails a border colour set on its own when only color is declared", () => {
  const problems = problemsFor(
    FAINT_TEXT,
    pageWithParagraph({
      color: "rgb(156, 163, 175)",
      "border-top-color": "rgb(255, 0, 0)",
    }),
    pageWithParagraph({ "border-top-color": "rgb(17, 17, 17)" }),
  );
  expect(problems.join("\n")).toContain("differ in border-top-color");
});

test("passes a border colour that only follows color when color is declared", () => {
  const problems = problemsFor(
    FAINT_TEXT,
    pageWithParagraph({
      color: "rgb(156, 163, 175)",
      "border-top-color": "rgb(156, 163, 175)",
    }),
    pageWithParagraph({ "border-top-color": "rgb(17, 17, 17)" }),
  );
  expect(problems).toEqual([]);
});

test("fails a defect drawn only in a pseudo-element that the declaration does not list", () => {
  const positive = pageWithParagraph({ color: "rgb(156, 163, 175)" });
  const negative = pageWithParagraph({});
  const positiveParagraph = positive.elements[2];
  const negativeParagraph = negative.elements[2];
  if (positiveParagraph === undefined || negativeParagraph === undefined) {
    throw new Error("the test page has no paragraph");
  }
  positiveParagraph.pseudoStyles["::first-line"] = {
    color: "rgb(156, 163, 175)",
    opacity: "0.4",
  };
  negativeParagraph.pseudoStyles["::first-line"] = {
    color: "rgb(17, 17, 17)",
    opacity: "1",
  };
  const problems = problemsFor(FAINT_TEXT, positive, negative);
  expect(problems).toHaveLength(1);
  expect(problems[0]).toContain(
    'differ in ::first-line opacity, which the declaration does not list: html/body[1]/p[0]::first-line is "0.4" on and "1" off',
  );
});

test("fails a ::before drawn on one side only unless content is declared", () => {
  const positive = pageWithParagraph({ color: "rgb(156, 163, 175)" });
  const negative = pageWithParagraph({});
  const positiveParagraph = positive.elements[2];
  const negativeParagraph = negative.elements[2];
  if (positiveParagraph === undefined || negativeParagraph === undefined) {
    throw new Error("the test page has no paragraph");
  }
  positiveParagraph.pseudoStyles["::before"] = {
    content: '""',
    "background-color": "rgb(255, 0, 0)",
  };
  negativeParagraph.pseudoStyles["::before"] = null;
  const problems = problemsFor(FAINT_TEXT, positive, negative);
  expect(problems).toHaveLength(1);
  expect(problems[0]).toContain(
    'differ in ::before content, which the declaration does not list: html/body[1]/p[0]::before is "drawn" on and "not drawn" off',
  );
  expect(
    problemsFor(
      { properties: ["color", "::before content"], range: null },
      positive,
      negative,
    ),
  ).toEqual([]);
});

test("ignores a pseudo-element line-height that only follows its font size", () => {
  const positive = pageWithParagraph({ "font-size": "22px" });
  const negative = pageWithParagraph({});
  const positiveParagraph = positive.elements[2];
  const negativeParagraph = negative.elements[2];
  if (positiveParagraph === undefined || negativeParagraph === undefined) {
    throw new Error("the test page has no paragraph");
  }
  positiveParagraph.pseudoStyles["::first-line"] = {
    "font-size": "22px",
    "line-height": "35.2px",
  };
  negativeParagraph.pseudoStyles["::first-line"] = {
    "font-size": "16px",
    "line-height": "25.6px",
  };
  const problems = problemsFor(
    { properties: ["font-size"], range: null },
    positive,
    negative,
  );
  expect(problems).toEqual([]);
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
    "- **Defect range:** `text-reads-faint`: contrast ratio from 2.5 to 4.4, clean above.",
    "- **Defect range:** `content-touches-page-edge`: edge distance from 0 to 8 px, clean below.",
    "- **Defect range:** `wall-of-text`: not measured. One block many lines long.",
  ].join("\n");
  const ranges = parseGuidelineRanges(markdown);
  expect(ranges.get("text-reads-faint")).toEqual({
    measure: "contrast-ratio",
    from: 2.5,
    to: 4.4,
    clean_side: "above",
  });
  expect(ranges.get("content-touches-page-edge")).toEqual({
    measure: "edge-distance",
    from: 0,
    to: 8,
    clean_side: "below",
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
      { measure: "contrast-ratio", from: 2.5, to: 4.4, clean_side: "above" },
      { measure: "contrast-ratio", from: 2.5, to: 4.4, clean_side: "above" },
    ),
  ).toBeNull();
  expect(
    describeRangeMismatch(
      "text-reads-faint",
      { measure: "contrast-ratio", from: 2.5, to: 4.4, clean_side: "above" },
      { measure: "contrast-ratio", from: 1.5, to: 4.4, clean_side: "above" },
    ),
  ).toBe(
    "text-reads-faint: GUIDELINES.md says contrast-ratio 2.5 to 4.4, clean above, but its .defect.json says contrast-ratio 1.5 to 4.4, clean above",
  );
});

test("refuses a declared name that is not a CSS property", () => {
  for (const name of ["text", "", "border-", "colour"]) {
    expect(() =>
      parseDefectDeclaration(
        JSON.stringify({ properties: [name], range: null }),
        "a.defect.json",
      ),
    ).toThrow("is not a CSS property name");
  }
  expect(
    parseDefectDeclaration(
      JSON.stringify({
        properties: ["margin", "border-radius", "--color-text", "text-align"],
        range: null,
      }),
      "a.defect.json",
    ).properties,
  ).toHaveLength(4);
});

test("refuses opacity, filter, transform, zoom, or mix-blend-mode with a font size or contrast range", () => {
  for (const name of [
    "opacity",
    "filter",
    "transform",
    "zoom",
    "mix-blend-mode",
  ]) {
    expect(() =>
      parseDefectDeclaration(
        JSON.stringify({
          properties: ["color", name],
          range: {
            measure: "contrast-ratio",
            from: 2.5,
            to: 4.4,
            clean_side: "above",
          },
        }),
        "a.defect.json",
      ),
    ).toThrow(`lists ${name}, which changes how large or how pale text looks`);
  }
  expect(() =>
    parseDefectDeclaration(
      JSON.stringify({
        properties: ["font-size", "transform"],
        range: { measure: "font-size", from: 11, to: 14, clean_side: "above" },
      }),
      "a.defect.json",
    ),
  ).toThrow("lists transform");
  expect(
    parseDefectDeclaration(
      JSON.stringify({
        properties: ["margin", "transform"],
        range: {
          measure: "edge-distance",
          from: 0,
          to: 8,
          clean_side: "above",
        },
      }),
      "a.defect.json",
    ).range?.measure,
  ).toBe("edge-distance");
});

/** Builds one rendered.json record for findPackDeclarationProblems. */
function renderRecord(
  template: string,
  defect: "on" | "off",
  evidence: RenderRecord["defect_evidence"],
): RenderRecord {
  const side = defect === "on" ? "positive" : "negative";
  const fixture = `${template.slice(template.lastIndexOf("/") + 1, -".html".length)}.${side}.png`;
  return {
    fixture,
    template,
    defect,
    png_sha256: "0",
    source_sha256: {},
    viewport: { width: 1280, height: 800 },
    device_scale_factor: 1,
    browser_version: "test",
    defect_evidence: evidence,
  };
}

test("names a criterion with no .defect.json and a pair with no defect evidence", () => {
  const evidence = buildPairEvidence(
    pageWithParagraph({ color: "rgb(156, 163, 175)" }),
    pageWithParagraph({}),
  );
  const records = [
    renderRecord("pack/templates/faint.html", "on", evidence.positive),
    renderRecord("pack/templates/faint.html", "off", evidence.negative),
    renderRecord("pack/templates/faint--2.html", "on", undefined),
    renderRecord("pack/templates/faint--2.html", "off", undefined),
    renderRecord("pack/templates/undeclared.html", "on", evidence.positive),
    renderRecord("pack/templates/undeclared.html", "off", evidence.negative),
    renderRecord("pack/templates/lonely.html", "on", evidence.positive),
  ];
  const problems = findPackDeclarationProblems(
    "pack",
    records,
    (criterionId) =>
      criterionId === "faint" || criterionId === "lonely" ? FAINT_TEXT : null,
  );
  expect(problems).toEqual([
    "pack/templates/faint--2.html: rendered.json has no defect evidence; render the pack again (FR-54 rules 2 and 3)",
    "pack/templates/undeclared.html: pack/templates/undeclared.defect.json is missing (FR-54 rule 2)",
    "pack/templates/lonely.html: rendered.json does not hold both a positive and a negative fixture",
  ]);
});

test("fails a negative fainter than every positive, below the range", () => {
  // #e5e7eb on white is 1.24:1: outside the range, but on its faint side.
  const problems = problemsFor(
    FAINT_TEXT,
    pageWithParagraph({ color: "rgb(156, 163, 175)" }),
    pageWithParagraph({ color: "rgb(229, 231, 235)" }),
  );
  expect(problems).toEqual([
    "x.negative.png: contrast-ratio 1.24 is not on the clean side of the declared defect range 2.5 to 4.4; a negative fixture must be 4.5 or more (FR-54 rule 2)",
  ]);
});

test("fails a negative just past the range edge but short of the first clean value", () => {
  // #787878 on white is 4.42:1 and #767676 is 4.54:1.
  const positive = pageWithParagraph({ color: "rgb(156, 163, 175)" });
  const tooClose = problemsFor(
    FAINT_TEXT,
    positive,
    pageWithParagraph({ color: "rgb(120, 120, 120)" }),
  );
  expect(tooClose.join("\n")).toContain(
    "x.negative.png: contrast-ratio 4.42 is not on the clean side",
  );
  const clean = problemsFor(
    FAINT_TEXT,
    positive,
    pageWithParagraph({ color: "rgb(118, 118, 118)" }),
  );
  expect(clean).toEqual([]);
});

test("checks a range whose clean side is below it", () => {
  const tooLarge = {
    properties: ["font-size"],
    range: {
      measure: "font-size" as const,
      from: 40,
      to: 64,
      clean_side: "below" as const,
    },
  };
  expect(
    problemsFor(
      tooLarge,
      pageWithParagraph({ "font-size": "48px" }),
      pageWithParagraph({ "font-size": "18px" }),
    ),
  ).toEqual([]);
  expect(
    problemsFor(
      tooLarge,
      pageWithParagraph({ "font-size": "48px" }),
      pageWithParagraph({ "font-size": "72px" }),
    ),
  ).toEqual([
    "x.negative.png: font-size 72 is not on the clean side of the declared defect range 40 to 64; a negative fixture must be 39 or less (FR-54 rule 2)",
  ]);
});

test("starts the clean side one step past the edge, at the range's own precision", () => {
  expect(
    firstCleanValue({
      measure: "contrast-ratio",
      from: 2.5,
      to: 4.4,
      clean_side: "above",
    }),
  ).toBe(4.5);
  expect(
    firstCleanValue({
      measure: "contrast-ratio",
      from: 2,
      to: 2.9,
      clean_side: "above",
    }),
  ).toBe(3);
  expect(
    firstCleanValue({
      measure: "edge-distance",
      from: 0,
      to: 8,
      clean_side: "above",
    }),
  ).toBe(9);
  expect(
    firstCleanValue({
      measure: "font-size",
      from: 40,
      to: 64,
      clean_side: "below",
    }),
  ).toBe(39);
});

test("refuses a measured range with no clean side", () => {
  expect(() =>
    parseDefectDeclaration(
      '{"properties": ["color"], "range": {"measure": "contrast-ratio", "from": 2.5, "to": 4.4}}',
      "a.defect.json",
    ),
  ).toThrow('range.clean_side must be "above" or "below"');
  expect(() =>
    parseGuidelineRanges(
      "- **Defect range:** `text-reads-faint`: contrast ratio from 2.5 to 4.4.",
    ),
  ).toThrow("line 1");
});

/** Builds a faint-text pair whose positive also sets the given styles on one pseudo-element of the paragraph. */
function pairWithPseudoStyles(
  pseudoName: string,
  positivePseudo: Record<string, string>,
  negativePseudo: Record<string, string>,
): { positive: PageSnapshot; negative: PageSnapshot } {
  const positive = pageWithParagraph({ color: "rgb(156, 163, 175)" });
  const negative = pageWithParagraph({});
  const positiveParagraph = positive.elements[2];
  const negativeParagraph = negative.elements[2];
  if (positiveParagraph === undefined || negativeParagraph === undefined) {
    throw new Error("the test page has no paragraph");
  }
  positiveParagraph.pseudoStyles[pseudoName] = positivePseudo;
  negativeParagraph.pseudoStyles[pseudoName] = negativePseudo;
  return { positive, negative };
}

for (const pseudoName of ["::first-line", "::first-letter"]) {
  test(`fails a ${pseudoName} colour that a declared element color does not cover`, () => {
    // The positive's first line is near white, which the contrast measure on
    // the paragraph itself never sees.
    const { positive, negative } = pairWithPseudoStyles(
      pseudoName,
      { color: "rgb(242, 242, 242)" },
      { color: "rgb(17, 17, 17)" },
    );
    const problems = problemsFor(FAINT_TEXT, positive, negative);
    expect(problems).toEqual([
      `x.positive.png and x.negative.png differ in ${pseudoName} color, which the declaration does not list: html/body[1]/p[0]${pseudoName} is "rgb(242, 242, 242)" on and "rgb(17, 17, 17)" off (FR-54 rule 3)`,
    ]);
  });

  test(`passes a ${pseudoName} colour that only inherits the element's color`, () => {
    const { positive, negative } = pairWithPseudoStyles(
      pseudoName,
      {
        color: "rgb(156, 163, 175)",
        "border-top-color": "rgb(156, 163, 175)",
      },
      { color: "rgb(17, 17, 17)", "border-top-color": "rgb(17, 17, 17)" },
    );
    expect(problemsFor(FAINT_TEXT, positive, negative)).toEqual([]);
  });
}

test("refuses a pseudo-element name in a declaration with a font size or contrast range", () => {
  for (const measure of ["contrast-ratio", "font-size"]) {
    expect(() =>
      parseDefectDeclaration(
        JSON.stringify({
          properties: ["color", "::first-line color"],
          range: { measure, from: 2.5, to: 4.4, clean_side: "above" },
        }),
        "a.defect.json",
      ),
    ).toThrow(
      "lists ::first-line color, a pseudo-element property, but the renderer measures",
    );
  }
  expect(
    parseDefectDeclaration(
      JSON.stringify({
        properties: ["display", "::marker display", "::first-letter font"],
        range: null,
      }),
      "a.defect.json",
    ).properties,
  ).toHaveLength(3);
  for (const name of ["::after-all color", "::first-line colour"]) {
    expect(() =>
      parseDefectDeclaration(
        JSON.stringify({ properties: [name], range: null }),
        "a.defect.json",
      ),
    ).toThrow("is not a CSS property name");
  }
});

test("covers a pseudo-element difference only with a name for the same pseudo-element", () => {
  expect(
    isPropertyDeclared({ property: "::first-line color" }, ["color"]),
  ).toBe(false);
  expect(
    isPropertyDeclared({ property: "::first-line color" }, [
      "::first-line color",
    ]),
  ).toBe(true);
  expect(
    isPropertyDeclared({ property: "::first-letter font-size" }, [
      "::first-letter font",
    ]),
  ).toBe(true);
  expect(
    isPropertyDeclared({ property: "::first-letter color" }, [
      "::first-line color",
    ]),
  ).toBe(false);
  expect(
    isPropertyDeclared({ property: "color" }, ["::first-line color"]),
  ).toBe(false);
});
