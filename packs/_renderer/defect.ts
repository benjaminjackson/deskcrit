// Pure helpers for the blind fixture rules 2 and 3 in PRD FR-54 (crit-cy8.38).
// Rule 2: each criterion declares the realistic range of its defect, and a
// positive fixture must sit inside it while a negative fixture sits outside it.
// Rule 3: the two sides of a pair differ only in the properties the defect
// declares. render.ts collects a snapshot of every element's computed style in
// the browser; the functions here compare and measure those snapshots, and
// check them against the declaration. Nothing here touches the file system,
// the network, or Playwright, so the unit tests run without a browser (CS-22).

/** The three things the renderer can measure on a fixture. */
export type DefectMeasure = "font-size" | "contrast-ratio" | "edge-distance";

/** The measures in the order they are listed in messages and in GUIDELINES.md. */
export const DEFECT_MEASURES: DefectMeasure[] = [
  "font-size",
  "contrast-ratio",
  "edge-distance",
];

/** The words GUIDELINES.md uses for each measure, and the unit it writes after the numbers. */
const GUIDELINE_MEASURE_WORDS: Record<
  DefectMeasure,
  { words: string; unit: string }
> = {
  "font-size": { words: "font size", unit: " px" },
  "contrast-ratio": { words: "contrast ratio", unit: "" },
  "edge-distance": { words: "edge distance", unit: " px" },
};

/** A measured range, both ends included. */
export type DefectRange = { measure: DefectMeasure; from: number; to: number };

/**
 * One criterion's packs/<pack>/templates/<criterion-id>.defect.json: the CSS
 * properties the defect changes, and its realistic range when the renderer can
 * measure it, or null when it cannot (FR-54 rules 2 and 3).
 */
export type DefectDeclaration = {
  properties: string[];
  range: DefectRange | null;
};

/** One element of a rendered page, as render.ts reads it from the browser. */
export type ElementSnapshot = {
  /** The tag names from <html> down, each with its index among its parent's children, such as "html/body[1]/main[0]". */
  path: string;
  /** The index of the parent element in the same snapshot, or null for <html>. */
  parentIndex: number | null;
  /** True for an SVG element, whose text colour is its fill and not its color. */
  isSvg: boolean;
  /** True when the element is inside <body> and holds a text node that is not only white space. */
  hasOwnText: boolean;
  /** Every computed style property of the element, by name. */
  styles: Record<string, string>;
};

/** A whole rendered page, as render.ts reads it from the browser. */
export type PageSnapshot = {
  elements: ElementSnapshot[];
  /** The smallest distance in CSS pixels from any line of text to an edge of the page, or null when the page has no text. */
  textEdgeDistance: number | null;
};

/** One computed style property that differs between the two sides of a pair, with the first element where it differs. */
export type PropertyDifference = {
  property: string;
  element: string;
  positive: string;
  negative: string;
};

/** What rendered.json records for each fixture, so verify can check rules 2 and 3 with no browser. */
export type DefectEvidence = {
  /** False when the two sides have different elements, so their styles cannot be compared. */
  dom_shapes_match: boolean;
  /** Each property that differs between the two sides, once, sorted by name. The same list on both records of a pair. */
  differing_properties: PropertyDifference[];
  /** This side's measured values. A null contrast ratio is text the renderer could not measure, such as text on an image. */
  measured: {
    "font-size": number[];
    "contrast-ratio": (number | null)[];
    "edge-distance": number[];
  };
};

/**
 * Properties whose default value is currentColor, so they change with `color`.
 * When a declaration lists `color`, a change in these is part of the same
 * defect.
 */
const CURRENT_COLOR_PROPERTIES = new Set([
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "border-block-start-color",
  "border-block-end-color",
  "border-inline-start-color",
  "border-inline-end-color",
  "outline-color",
  "column-rule-color",
  "text-decoration-color",
  "text-emphasis-color",
  "row-rule-color",
  "caret-color",
  "-webkit-text-fill-color",
  "-webkit-text-stroke-color",
]);

/**
 * Logical names and the physical name each one means in the
 * left-to-right, top-to-bottom writing mode of every fixture. Chromium reports
 * both names, so `margin-left` in a declaration also covers
 * `margin-inline-start`.
 */
const LOGICAL_SIDES: [string, string][] = [
  ["start-start", "top-left"],
  ["start-end", "top-right"],
  ["end-start", "bottom-left"],
  ["end-end", "bottom-right"],
  ["inline-start", "left"],
  ["inline-end", "right"],
  ["block-start", "top"],
  ["block-end", "bottom"],
  ["inline-size", "width"],
  ["block-size", "height"],
];

/**
 * Properties that Chromium reports but derives from another property, so a
 * change in the second one shows up in the first one too.
 */
const DERIVED_PROPERTIES: Record<string, string> = {
  "-webkit-text-decorations-in-effect": "text-decoration-line",
};

/** Returns the criterion id of a template id: "text-reads-faint--3" belongs to "text-reads-faint". */
export function templateCriterionId(templateId: string): string {
  return templateId.replace(/--\d+$/, "");
}

/** Returns the path, under packs/, of a criterion's defect declaration. */
export function declarationPathFor(
  packFolder: string,
  criterionId: string,
): string {
  return `${packFolder}/templates/${criterionId}.defect.json`;
}

/** Says whether a value is one of the three measure names. */
function isDefectMeasure(value: unknown): value is DefectMeasure {
  return (
    value === "font-size" ||
    value === "contrast-ratio" ||
    value === "edge-distance"
  );
}

/**
 * Parses and checks the text of a .defect.json file. It throws with the file
 * name when a field is missing or has the wrong type, because a declaration
 * that cannot be read would let verify pass a pair it never checked.
 */
export function parseDefectDeclaration(
  text: string,
  where: string,
): DefectDeclaration {
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(`${where}: must be a JSON object`);
  }
  const record = parsed as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (key !== "properties" && key !== "range") {
      throw new Error(`${where}: unknown field ${key}`);
    }
  }
  const properties = record.properties;
  if (
    !Array.isArray(properties) ||
    properties.length === 0 ||
    !properties.every((property) => typeof property === "string")
  ) {
    throw new Error(
      `${where}: properties must be a list of one or more CSS property names`,
    );
  }
  const range = record.range;
  if (range === null) {
    return { properties, range: null };
  }
  if (typeof range !== "object" || range === undefined) {
    throw new Error(`${where}: range must be an object or null`);
  }
  const rangeRecord = range as Record<string, unknown>;
  const measure = rangeRecord.measure;
  const from = rangeRecord.from;
  const to = rangeRecord.to;
  if (!isDefectMeasure(measure)) {
    throw new Error(
      `${where}: range.measure must be one of ${DEFECT_MEASURES.join(", ")}`,
    );
  }
  if (typeof from !== "number" || typeof to !== "number" || from > to) {
    throw new Error(
      `${where}: range.from and range.to must be numbers with from not above to`,
    );
  }
  return { properties, range: { measure, from, to } };
}

/**
 * Compares the computed styles of the two sides of a pair, element by element
 * in document order. It returns each property that differs once, with the
 * first element where it differs, sorted by property name. When the two pages
 * do not have the same elements, it says so and compares nothing (FR-54 rule 3).
 */
export function compareSnapshots(
  positive: PageSnapshot,
  negative: PageSnapshot,
): { domShapesMatch: boolean; differences: PropertyDifference[] } {
  if (positive.elements.length !== negative.elements.length) {
    return { domShapesMatch: false, differences: [] };
  }
  for (let index = 0; index < positive.elements.length; index++) {
    if (positive.elements[index]?.path !== negative.elements[index]?.path) {
      return { domShapesMatch: false, differences: [] };
    }
  }
  const firstDifferenceByProperty = new Map<string, PropertyDifference>();
  for (let index = 0; index < positive.elements.length; index++) {
    const positiveElement = positive.elements[index];
    const negativeElement = negative.elements[index];
    if (positiveElement === undefined || negativeElement === undefined) {
      continue;
    }
    const propertyNames = new Set([
      ...Object.keys(positiveElement.styles),
      ...Object.keys(negativeElement.styles),
    ]);
    for (const property of propertyNames) {
      if (firstDifferenceByProperty.has(property)) {
        continue;
      }
      const positiveValue = positiveElement.styles[property] ?? "";
      const negativeValue = negativeElement.styles[property] ?? "";
      if (positiveValue !== negativeValue) {
        firstDifferenceByProperty.set(property, {
          property,
          element: positiveElement.path,
          positive: positiveValue,
          negative: negativeValue,
        });
      }
    }
  }
  const differences = Array.from(firstDifferenceByProperty.values());
  differences.sort(compareByProperty);
  return { domShapesMatch: true, differences };
}

/** Orders differences by property name, by UTF-16 code units, so the order never depends on the locale (CS-18). */
function compareByProperty(
  left: PropertyDifference,
  right: PropertyDifference,
): number {
  if (left.property < right.property) {
    return -1;
  }
  if (left.property > right.property) {
    return 1;
  }
  return 0;
}

/** A colour with red, green, and blue from 0 to 255 and alpha from 0 to 1. */
export type Colour = {
  red: number;
  green: number;
  blue: number;
  alpha: number;
};

/**
 * Reads a computed colour, which Chromium writes as "rgb(r, g, b)" or
 * "rgba(r, g, b, a)". It returns null for any other form, such as a colour
 * function or "none", so the caller treats the colour as not measurable.
 */
export function parseCssColour(value: string): Colour | null {
  const match =
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/.exec(
      value.trim(),
    );
  if (match === null) {
    return null;
  }
  const alphaText = match[4];
  return {
    red: Number(match[1]),
    green: Number(match[2]),
    blue: Number(match[3]),
    alpha: alphaText === undefined ? 1 : Number(alphaText),
  };
}

/** Paints a colour with alpha over an opaque colour and returns the opaque result. */
function paintOver(top: Colour, bottom: Colour): Colour {
  return {
    red: top.red * top.alpha + bottom.red * (1 - top.alpha),
    green: top.green * top.alpha + bottom.green * (1 - top.alpha),
    blue: top.blue * top.alpha + bottom.blue * (1 - top.alpha),
    alpha: 1,
  };
}

/** The WCAG 2.2 relative luminance of an opaque colour. */
function relativeLuminance(colour: Colour): number {
  const channels = [colour.red, colour.green, colour.blue].map((channel) => {
    const scaled = channel / 255;
    if (scaled <= 0.04045) {
      return scaled / 12.92;
    }
    return ((scaled + 0.055) / 1.055) ** 2.4;
  });
  const [red = 0, green = 0, blue = 0] = channels;
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/**
 * The WCAG 2.2 contrast ratio of two opaque colours, from 1 to 21, rounded to
 * two decimals so the same page gives the same number on every machine.
 */
export function contrastRatio(first: Colour, second: Colour): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

/** The page colour behind everything, because a fixture page with no background shows white. */
const WHITE: Colour = { red: 255, green: 255, blue: 255, alpha: 1 };

/**
 * Works out the opaque colour behind an element's text: its own background
 * and its ancestors' backgrounds, painted over white. It returns null when a
 * background image or gradient is in the way, because the colour behind the
 * text is then not one colour.
 */
export function backgroundBehind(
  snapshot: PageSnapshot,
  elementIndex: number,
): Colour | null {
  const layers: Colour[] = [];
  let currentIndex: number | null = elementIndex;
  while (currentIndex !== null) {
    const element: ElementSnapshot | undefined =
      snapshot.elements[currentIndex];
    if (element === undefined) {
      break;
    }
    const backgroundImage = element.styles["background-image"] ?? "none";
    if (backgroundImage !== "none") {
      return null;
    }
    const backgroundColour = parseCssColour(
      element.styles["background-color"] ?? "rgba(0, 0, 0, 0)",
    );
    if (backgroundColour !== null && backgroundColour.alpha > 0) {
      layers.push(backgroundColour);
      if (backgroundColour.alpha === 1) {
        break;
      }
    }
    currentIndex = element.parentIndex;
  }
  let result = WHITE;
  for (let layerIndex = layers.length - 1; layerIndex >= 0; layerIndex--) {
    const layer = layers[layerIndex];
    if (layer !== undefined) {
      result = paintOver(layer, result);
    }
  }
  return result;
}

/** The contrast ratio of an element's text with the colour behind it, or null when it cannot be measured. */
function textContrast(
  snapshot: PageSnapshot,
  elementIndex: number,
): number | null {
  const element = snapshot.elements[elementIndex];
  if (element === undefined) {
    return null;
  }
  const textColourValue = element.isSvg
    ? (element.styles.fill ?? "")
    : (element.styles.color ?? "");
  const textColour = parseCssColour(textColourValue);
  const background = backgroundBehind(snapshot, elementIndex);
  if (textColour === null || background === null) {
    return null;
  }
  return contrastRatio(paintOver(textColour, background), background);
}

/** Reads a computed pixel length such as "14px" as a number. */
function readPixels(value: string | undefined): number {
  return Number.parseFloat(value ?? "");
}

/**
 * Measures both sides of a pair. Font size and contrast are measured only on
 * elements with their own text whose value differs between the two sides, so
 * the numbers are those of the text the defect changed. Edge distance is the
 * page's smallest distance from text to an edge. The pair must already have
 * the same elements.
 */
export function measurePair(
  positive: PageSnapshot,
  negative: PageSnapshot,
): {
  positive: DefectEvidence["measured"];
  negative: DefectEvidence["measured"];
} {
  const positiveMeasured: DefectEvidence["measured"] = {
    "font-size": [],
    "contrast-ratio": [],
    "edge-distance": [],
  };
  const negativeMeasured: DefectEvidence["measured"] = {
    "font-size": [],
    "contrast-ratio": [],
    "edge-distance": [],
  };
  for (let index = 0; index < positive.elements.length; index++) {
    const positiveElement = positive.elements[index];
    const negativeElement = negative.elements[index];
    if (positiveElement === undefined || negativeElement === undefined) {
      continue;
    }
    if (!positiveElement.hasOwnText) {
      continue;
    }
    const positiveFontSize = readPixels(positiveElement.styles["font-size"]);
    const negativeFontSize = readPixels(negativeElement.styles["font-size"]);
    if (positiveFontSize !== negativeFontSize) {
      positiveMeasured["font-size"].push(positiveFontSize);
      negativeMeasured["font-size"].push(negativeFontSize);
    }
    const positiveContrast = textContrast(positive, index);
    const negativeContrast = textContrast(negative, index);
    if (positiveContrast !== negativeContrast) {
      positiveMeasured["contrast-ratio"].push(positiveContrast);
      negativeMeasured["contrast-ratio"].push(negativeContrast);
    }
  }
  if (positive.textEdgeDistance !== null) {
    positiveMeasured["edge-distance"].push(positive.textEdgeDistance);
  }
  if (negative.textEdgeDistance !== null) {
    negativeMeasured["edge-distance"].push(negative.textEdgeDistance);
  }
  return { positive: positiveMeasured, negative: negativeMeasured };
}

/**
 * Builds the evidence that rendered.json keeps for each side of a pair. The
 * comparison is the same on both records; the measured values are each side's
 * own.
 */
export function buildPairEvidence(
  positive: PageSnapshot,
  negative: PageSnapshot,
): { positive: DefectEvidence; negative: DefectEvidence } {
  const comparison = compareSnapshots(positive, negative);
  const empty: DefectEvidence["measured"] = {
    "font-size": [],
    "contrast-ratio": [],
    "edge-distance": [],
  };
  let measured = { positive: empty, negative: empty };
  if (comparison.domShapesMatch) {
    measured = measurePair(positive, negative);
  }
  return {
    positive: {
      dom_shapes_match: comparison.domShapesMatch,
      differing_properties: comparison.differences,
      measured: measured.positive,
    },
    negative: {
      dom_shapes_match: comparison.domShapesMatch,
      differing_properties: comparison.differences,
      measured: measured.negative,
    },
  };
}

/**
 * Says whether a property that differs is covered by a declaration. A declared
 * name covers itself, any longer name that starts with it and a hyphen
 * ("margin" covers "margin-left"), the logical name of the same side
 * ("margin-left" covers "margin-inline-start"), and, for `color`, the
 * properties that follow currentColor, and the properties Chromium derives
 * from another one, such as -webkit-text-decorations-in-effect from
 * text-decoration-line.
 */
export function isPropertyDeclared(
  property: string,
  declaredProperties: string[],
): boolean {
  let physicalName = property;
  for (const [logicalSide, physicalSide] of LOGICAL_SIDES) {
    physicalName = physicalName.replace(logicalSide, physicalSide);
  }
  const candidates = [property, physicalName];
  const sourceProperty = DERIVED_PROPERTIES[property];
  if (sourceProperty !== undefined) {
    candidates.push(sourceProperty);
  }
  for (const declared of declaredProperties) {
    for (const candidate of candidates) {
      if (candidate === declared || candidate.startsWith(`${declared}-`)) {
        return true;
      }
    }
    if (declared === "color" && CURRENT_COLOR_PROPERTIES.has(property)) {
      return true;
    }
  }
  return false;
}

/** Says whether a measured value lies inside a range, both ends included. */
function isInside(value: number, range: DefectRange): boolean {
  return value >= range.from && value <= range.to;
}

/**
 * Checks one pair against its declaration and returns every problem as a
 * sentence that names the fixture, or an empty list when the pair passes. The
 * positive must sit inside the declared range and the negative outside it
 * (rule 2), and the two sides must differ only in declared properties (rule 3).
 */
export function findDeclarationProblems(
  declaration: DefectDeclaration,
  positiveFixture: string,
  positive: DefectEvidence,
  negativeFixture: string,
  negative: DefectEvidence,
): string[] {
  const problems: string[] = [];
  if (!positive.dom_shapes_match) {
    problems.push(
      `${positiveFixture} and ${negativeFixture} have different elements, so the defect is not only a style change (FR-54 rule 3)`,
    );
    return problems;
  }
  for (const difference of positive.differing_properties) {
    if (!isPropertyDeclared(difference.property, declaration.properties)) {
      problems.push(
        `${positiveFixture} and ${negativeFixture} differ in ${difference.property}, which the declaration does not list: ${difference.element} is "${difference.positive}" on and "${difference.negative}" off (FR-54 rule 3)`,
      );
    }
  }
  const range = declaration.range;
  if (range === null) {
    return problems;
  }
  const sides: [string, DefectEvidence, boolean][] = [
    [positiveFixture, positive, true],
    [negativeFixture, negative, false],
  ];
  for (const [fixture, evidence, mustBeInside] of sides) {
    const values = evidence.measured[range.measure];
    if (values.length === 0) {
      problems.push(
        `${fixture}: found no ${range.measure} that the defect changes, so the range cannot be checked (FR-54 rule 2)`,
      );
      continue;
    }
    for (const value of values) {
      if (value === null) {
        problems.push(
          `${fixture}: could not measure ${range.measure}, because text sits on a background image or gradient (FR-54 rule 2)`,
        );
        continue;
      }
      if (mustBeInside && !isInside(value, range)) {
        problems.push(
          `${fixture}: ${range.measure} ${value} is outside the declared range ${range.from} to ${range.to} (FR-54 rule 2)`,
        );
      }
      if (!mustBeInside && isInside(value, range)) {
        problems.push(
          `${fixture}: ${range.measure} ${value} is inside the declared defect range ${range.from} to ${range.to}, but a negative fixture must sit outside it (FR-54 rule 2)`,
        );
      }
    }
  }
  return problems;
}

/** What one `Defect range` line in GUIDELINES.md says: a measured range, or not measured. */
export type GuidelineRange = DefectRange | null;

/** The start of every range line in GUIDELINES.md. */
const GUIDELINE_RANGE_PREFIX = "- **Defect range:** ";

/**
 * Reads every `Defect range` line in GUIDELINES.md, keyed by criterion id. A
 * line has one of two fixed forms:
 *
 *   - **Defect range:** `text-reads-faint`: contrast ratio from 2.5 to 4.4.
 *   - **Defect range:** `wall-of-text`: not measured. <words for the range>
 *
 * It throws on a line that starts like a range line but has neither form, or
 * on a criterion id given twice, so a typing slip cannot hide a range.
 */
export function parseGuidelineRanges(
  markdown: string,
): Map<string, GuidelineRange> {
  const ranges = new Map<string, GuidelineRange>();
  const lines = markdown.split("\n");
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex] ?? "";
    if (!line.startsWith(GUIDELINE_RANGE_PREFIX)) {
      continue;
    }
    const rest = line.slice(GUIDELINE_RANGE_PREFIX.length);
    const idMatch = /^`([a-z0-9-]+)`: (.*)$/.exec(rest);
    if (idMatch === null) {
      throw new Error(
        `GUIDELINES.md line ${lineIndex + 1}: a Defect range line must name the criterion id in backticks, then a colon`,
      );
    }
    const criterionId = idMatch[1] ?? "";
    const statement = idMatch[2] ?? "";
    if (ranges.has(criterionId)) {
      throw new Error(
        `GUIDELINES.md line ${lineIndex + 1}: ${criterionId} has a second Defect range line`,
      );
    }
    if (/^not measured\. \S/.test(statement)) {
      ranges.set(criterionId, null);
      continue;
    }
    let parsedRange: DefectRange | null = null;
    for (const measure of DEFECT_MEASURES) {
      const { words, unit } = GUIDELINE_MEASURE_WORDS[measure];
      const pattern = new RegExp(
        `^${words} from (\\d+(?:\\.\\d+)?) to (\\d+(?:\\.\\d+)?)${unit}\\.$`,
      );
      const rangeMatch = pattern.exec(statement);
      if (rangeMatch !== null) {
        parsedRange = {
          measure,
          from: Number(rangeMatch[1]),
          to: Number(rangeMatch[2]),
        };
      }
    }
    if (parsedRange === null) {
      throw new Error(
        `GUIDELINES.md line ${lineIndex + 1}: "${statement}" is not "<measure> from <a> to <b>[ px]." or "not measured. <words>"`,
      );
    }
    ranges.set(criterionId, parsedRange);
  }
  return ranges;
}

/** Says in one sentence how a GUIDELINES.md range and a declared range differ, or returns null when they agree. */
export function describeRangeMismatch(
  criterionId: string,
  guidelineRange: GuidelineRange,
  declaredRange: DefectRange | null,
): string | null {
  const guidelineText =
    guidelineRange === null
      ? "not measured"
      : `${guidelineRange.measure} ${guidelineRange.from} to ${guidelineRange.to}`;
  const declaredText =
    declaredRange === null
      ? "not measured"
      : `${declaredRange.measure} ${declaredRange.from} to ${declaredRange.to}`;
  if (guidelineText === declaredText) {
    return null;
  }
  return `${criterionId}: GUIDELINES.md says ${guidelineText}, but its .defect.json says ${declaredText}`;
}
