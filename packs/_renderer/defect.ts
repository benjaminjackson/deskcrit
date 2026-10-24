// Pure helpers for the blind fixture rules 2 and 3 in PRD FR-54 (crit-cy8.38).
// Rule 2: each criterion declares the realistic range of its defect, and a
// positive fixture must sit inside it while a negative fixture sits outside it.
// Rule 3: the two sides of a pair differ only in the properties the defect
// declares. render.ts collects a snapshot of every element's computed style in
// the browser; the functions here compare and measure those snapshots, and
// check them against the declaration. Nothing here touches the file system,
// the network, or Playwright, so the unit tests run without a browser (CS-22).

// css-properties.json lists every longhand property name that the pinned
// Chromium reports, so a declaration can be checked with no browser. It says
// how it was made; make it again when Playwright is upgraded.
import cssProperties from "./css-properties.json" with { type: "json" };
import type { RenderRecord } from "./jobs.js";

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
/**
 * Which side of a range is free of the defect: "above" when larger values are
 * clean (more contrast, more space to the edge), "below" when smaller ones are.
 */
export type CleanSide = "above" | "below";

/**
 * A measured range, both ends included, and the side of it that is free of
 * the defect. A negative fixture must sit on the clean side, one step past the
 * range at the precision the range is written in (FR-54 rule 2).
 */
export type DefectRange = {
  measure: DefectMeasure;
  from: number;
  to: number;
  clean_side: CleanSide;
};

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
  /**
   * The computed styles of the element's pseudo-elements, keyed by name such
   * as "::before", so a defect drawn in a pseudo-element is compared too. A
   * pseudo-element that draws nothing on this side is null.
   */
  pseudoStyles: Record<string, Record<string, string> | null>;
  /** The element's own text nodes joined in order, not trimmed, so a change of words between the two sides shows. */
  text: string;
  /** The element's attributes by name, except data-defect on <html>, which is the one thing the defect switch sets. */
  attributes: Record<string, string>;
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
  /**
   * True when the property follows currentColor and, on each side, its value
   * equals that side's `color`. Only then does a declared `color` cover it.
   */
  follows_color?: boolean;
  /**
   * For an "attribute <name>" difference, the side that does not have the
   * attribute at all. Its value is then recorded as "", so a missing
   * attribute cannot be mistaken for one whose value is any given string.
   */
  absent_on?: "positive" | "negative";
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

/** The four physical sides and the four logical sides of a box. */
const BOX_SIDES =
  "(top|right|bottom|left|block-start|block-end|inline-start|inline-end)";

/** The four physical corners and the four logical corners of a box. */
const BOX_CORNERS =
  "(top-left|top-right|bottom-left|bottom-right|start-start|start-end|end-start|end-end)";

/**
 * The shorthands a declaration may use, each with the longhand names it
 * covers. Only these expand: any other declared name covers only itself, so
 * a name such as "text" or "border-" cannot match many properties by accident.
 */
const SHORTHANDS: Record<string, RegExp> = {
  margin: new RegExp(`^margin-${BOX_SIDES}$`),
  padding: new RegExp(`^padding-${BOX_SIDES}$`),
  inset: /^(top|right|bottom|left|inset-(block|inline)-(start|end))$/,
  gap: /^(row-gap|column-gap)$/,
  border: new RegExp(`^border-${BOX_SIDES}-(width|style|color)$`),
  "border-top": /^border-(top|block-start)-(width|style|color)$/,
  "border-right": /^border-(right|inline-end)-(width|style|color)$/,
  "border-bottom": /^border-(bottom|block-end)-(width|style|color)$/,
  "border-left": /^border-(left|inline-start)-(width|style|color)$/,
  "border-width": new RegExp(`^border-${BOX_SIDES}-width$`),
  "border-style": new RegExp(`^border-${BOX_SIDES}-style$`),
  "border-color": new RegExp(`^border-${BOX_SIDES}-color$`),
  "border-radius": new RegExp(`^border-${BOX_CORNERS}-radius$`),
  "border-image": /^border-image-(source|slice|width|outset|repeat)$/,
  background:
    /^background-(color|image|position-x|position-y|size|repeat|attachment|origin|clip|blend-mode)$/,
  font: /^(font-(family|size|style|weight|stretch|variant-.+|feature-settings|kerning|optical-sizing|size-adjust|variation-settings|palette|synthesis-.+)|line-height)$/,
  "text-decoration":
    /^(text-decoration-(line|style|color|thickness)|-webkit-text-decorations-in-effect)$/,
  outline: /^outline-(color|style|width)$/,
  "list-style": /^list-style-(type|position|image)$/,
  flex: /^flex-(grow|shrink|basis)$/,
  columns: /^column-(width|count)$/,
  "column-rule": /^column-rule-(color|style|width)$/,
};

/**
 * Properties that change how large or how pale text looks without changing
 * its font-size or color. A declaration that measures font size or contrast
 * ratio must not list them, because the measure would then miss part of the
 * defect.
 */
const PROPERTIES_THAT_HIDE_SIZE_OR_CONTRAST = [
  "opacity",
  "filter",
  "backdrop-filter",
  "transform",
  "scale",
  "zoom",
  "mix-blend-mode",
];

/** The pseudo-elements render.ts compares, in the form a declaration names them. */
const PSEUDO_ELEMENT_NAMES = [
  "::before",
  "::after",
  "::first-line",
  "::first-letter",
  "::marker",
  "::placeholder",
];

/**
 * Splits a property key into its pseudo-element and its property:
 * "::first-line color" gives "::first-line" and "color", and "color" gives
 * "" and "color".
 */
export function splitPseudoKey(key: string): {
  pseudo: string;
  property: string;
} {
  const match = /^(::[a-z-]+) (.+)$/.exec(key);
  if (match === null) {
    return { pseudo: "", property: key };
  }
  return { pseudo: match[1] ?? "", property: match[2] ?? "" };
}

/**
 * Says whether a declared name is valid: a CSS property name, or one of the
 * compared pseudo-elements, a space, and a CSS property name, such as
 * "::first-line color".
 */
function isKnownDeclaredName(name: string): boolean {
  const { pseudo, property } = splitPseudoKey(name);
  if (pseudo !== "" && !PSEUDO_ELEMENT_NAMES.includes(pseudo)) {
    return false;
  }
  return isKnownCssProperty(property);
}

/** Says whether a name is a real CSS property: a longhand Chromium reports, a shorthand above, or a custom property. */
export function isKnownCssProperty(name: string): boolean {
  if (/^--[A-Za-z0-9_-]+$/.test(name)) {
    return true;
  }
  if (SHORTHANDS[name] !== undefined) {
    return true;
  }
  return CSS_LONGHAND_PROPERTIES.has(name);
}

/** The longhand names from css-properties.json, as a set. */
const CSS_LONGHAND_PROPERTIES: ReadonlySet<string> = new Set(
  cssProperties.names,
);

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
  for (const property of properties) {
    if (!isKnownDeclaredName(property)) {
      throw new Error(
        `${where}: "${property}" is not a CSS property name that Chromium reports, a custom property, or a known shorthand, alone or after one of ${PSEUDO_ELEMENT_NAMES.join(", ")} and a space`,
      );
    }
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
  const cleanSide = rangeRecord.clean_side;
  for (const key of Object.keys(rangeRecord)) {
    if (!["measure", "from", "to", "clean_side"].includes(key)) {
      throw new Error(`${where}: unknown field range.${key}`);
    }
  }
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
  if (cleanSide !== "above" && cleanSide !== "below") {
    throw new Error(
      `${where}: range.clean_side must be "above" or "below", the side of the range that is free of the defect`,
    );
  }
  if (measure === "font-size" || measure === "contrast-ratio") {
    for (const property of properties) {
      if (splitPseudoKey(property).pseudo !== "") {
        throw new Error(
          `${where}: lists ${property}, a pseudo-element property, but the renderer measures ${measure} only on an element's own text; draw a measured defect on the element itself`,
        );
      }
      if (PROPERTIES_THAT_HIDE_SIZE_OR_CONTRAST.includes(property)) {
        throw new Error(
          `${where}: lists ${property}, which changes how large or how pale text looks without changing the ${measure} that verify measures; draw the defect with font-size or color instead`,
        );
      }
    }
  }
  return {
    properties,
    range: { measure, from, to, clean_side: cleanSide },
  };
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
    recordDifferences(
      positiveElement.path,
      "",
      positiveElement.styles,
      negativeElement.styles,
      firstDifferenceByProperty,
    );
    const pseudoNames = new Set([
      ...Object.keys(positiveElement.pseudoStyles),
      ...Object.keys(negativeElement.pseudoStyles),
    ]);
    for (const pseudoName of pseudoNames) {
      comparePseudoElement(
        `${positiveElement.path}${pseudoName}`,
        pseudoName,
        { positive: positiveElement.styles, negative: negativeElement.styles },
        positiveElement.pseudoStyles[pseudoName] ?? null,
        negativeElement.pseudoStyles[pseudoName] ?? null,
        firstDifferenceByProperty,
      );
    }
    recordTextAndAttributeDifferences(
      positiveElement,
      negativeElement,
      firstDifferenceByProperty,
    );
  }
  const differences = Array.from(firstDifferenceByProperty.values());
  differences.sort(compareByProperty);
  return { domShapesMatch: true, differences };
}

/** The key of a difference in an element's own text. */
const TEXT_CONTENT_KEY = "text content";

/** The start of the key of a difference in one attribute, such as "attribute d". */
const ATTRIBUTE_KEY_PREFIX = "attribute ";

/**
 * Says whether a difference key names an element's text or one of its
 * attributes, not a style. No declaration can cover such a difference,
 * because every defect is a style change and the defect switch sets only
 * data-defect on <html> (FR-54 rule 3).
 */
export function isTextOrAttributeKey(property: string): boolean {
  if (property === TEXT_CONTENT_KEY) {
    return true;
  }
  return property.startsWith(ATTRIBUTE_KEY_PREFIX);
}

/**
 * Records where one element's own text or attributes differ between the two
 * sides, keyed "text content" or "attribute <name>", once per key with the
 * first element where it differs. A change of words, or of an SVG shape's d,
 * points, or width attribute, is then not hidden behind equal styles. When
 * one side does not have the attribute, absent_on names that side and its
 * value is recorded as "".
 */
function recordTextAndAttributeDifferences(
  positiveElement: ElementSnapshot,
  negativeElement: ElementSnapshot,
  firstDifferenceByProperty: Map<string, PropertyDifference>,
): void {
  if (
    positiveElement.text !== negativeElement.text &&
    !firstDifferenceByProperty.has(TEXT_CONTENT_KEY)
  ) {
    firstDifferenceByProperty.set(TEXT_CONTENT_KEY, {
      property: TEXT_CONTENT_KEY,
      element: positiveElement.path,
      positive: positiveElement.text,
      negative: negativeElement.text,
    });
  }
  const attributeNames = new Set([
    ...Object.keys(positiveElement.attributes),
    ...Object.keys(negativeElement.attributes),
  ]);
  for (const attributeName of attributeNames) {
    const positiveValue = positiveElement.attributes[attributeName];
    const negativeValue = negativeElement.attributes[attributeName];
    if (positiveValue === negativeValue) {
      continue;
    }
    const key = `${ATTRIBUTE_KEY_PREFIX}${attributeName}`;
    if (firstDifferenceByProperty.has(key)) {
      continue;
    }
    const difference: PropertyDifference = {
      property: key,
      element: positiveElement.path,
      positive: positiveValue ?? "",
      negative: negativeValue ?? "",
    };
    if (positiveValue === undefined) {
      difference.absent_on = "positive";
    } else if (negativeValue === undefined) {
      difference.absent_on = "negative";
    }
    firstDifferenceByProperty.set(key, difference);
  }
}

/**
 * Properties whose getComputedStyle value on a pseudo-element is a used
 * value worked out from the layout, so it changes whenever anything moves.
 * They are not compared on pseudo-elements. Elements use computedStyleMap,
 * which has no such values, so this list does not apply to them. Reconsider
 * when a defect is drawn by sizing a pseudo-element; then measure it instead.
 */
const PSEUDO_LAYOUT_PROPERTIES = new Set([
  "width",
  "height",
  "inline-size",
  "block-size",
  "transform-origin",
  "perspective-origin",
]);

/**
 * Compares one pseudo-element of an element on the two sides. Every
 * difference is keyed by the pseudo-element's name, such as "::first-line
 * color", so a declaration covers it only when it names it in that form, and
 * a declaration with a measured range cannot (the renderer measures only the
 * element's own text). When the pseudo-element draws on one side only, the
 * difference is keyed by the property that decides whether it draws:
 * "::marker display" (only a list item has a marker) and "<pseudo> content"
 * for the others. When it draws on both sides, its styles are compared like
 * an element's, without the layout properties above and without any value it
 * only inherits from its element: such a value equals the element's own on
 * both sides, and the element's difference is already recorded.
 */
function comparePseudoElement(
  element: string,
  pseudoName: string,
  elementStyles: {
    positive: Record<string, string>;
    negative: Record<string, string>;
  },
  positiveStyles: Record<string, string> | null,
  negativeStyles: Record<string, string> | null,
  firstDifferenceByProperty: Map<string, PropertyDifference>,
): void {
  if (positiveStyles === null && negativeStyles === null) {
    return;
  }
  if (positiveStyles === null || negativeStyles === null) {
    const bareProperty = pseudoName === "::marker" ? "display" : "content";
    const property = `${pseudoName} ${bareProperty}`;
    if (!firstDifferenceByProperty.has(property)) {
      firstDifferenceByProperty.set(property, {
        property,
        element,
        positive: positiveStyles === null ? "not drawn" : "drawn",
        negative: negativeStyles === null ? "not drawn" : "drawn",
      });
    }
    return;
  }
  const positiveCompared: Record<string, string> = {};
  const negativeCompared: Record<string, string> = {};
  for (const [name, value] of Object.entries(positiveStyles)) {
    if (PSEUDO_LAYOUT_PROPERTIES.has(name)) {
      continue;
    }
    if (followsElement(name, positiveStyles, negativeStyles, elementStyles)) {
      continue;
    }
    positiveCompared[name] = value;
    negativeCompared[name] = negativeStyles[name] ?? "";
  }
  for (const [name, value] of Object.entries(negativeStyles)) {
    if (PSEUDO_LAYOUT_PROPERTIES.has(name) || name in positiveCompared) {
      continue;
    }
    if (followsElement(name, positiveStyles, negativeStyles, elementStyles)) {
      continue;
    }
    positiveCompared[name] = positiveStyles[name] ?? "";
    negativeCompared[name] = value;
  }
  // getComputedStyle turns a unitless line-height such as 1.6 into pixels,
  // so it changes whenever font-size does. When the two sides keep the same
  // line-height to font-size ratio, the line-height itself did not change.
  if (
    lineHeightRatio(positiveStyles) !== null &&
    lineHeightRatio(positiveStyles) === lineHeightRatio(negativeStyles)
  ) {
    delete positiveCompared["line-height"];
    delete negativeCompared["line-height"];
  }
  recordDifferences(
    element,
    `${pseudoName} `,
    positiveCompared,
    negativeCompared,
    firstDifferenceByProperty,
  );
}

/**
 * Says whether a pseudo-element's property only follows its element on both
 * sides: its value equals the element's own value, or it is a currentColor
 * property equal to the pseudo-element's color while that color equals the
 * element's color. Such a value changes only when the element changes, and
 * the element's own difference is already recorded.
 */
function followsElement(
  name: string,
  positiveStyles: Record<string, string>,
  negativeStyles: Record<string, string>,
  elementStyles: {
    positive: Record<string, string>;
    negative: Record<string, string>;
  },
): boolean {
  const sides: [Record<string, string>, Record<string, string>][] = [
    [positiveStyles, elementStyles.positive],
    [negativeStyles, elementStyles.negative],
  ];
  for (const [pseudoStyles, ownStyles] of sides) {
    const value = pseudoStyles[name];
    if (value === ownStyles[name]) {
      continue;
    }
    const followsColor =
      CURRENT_COLOR_PROPERTIES.has(name) &&
      value === pseudoStyles.color &&
      pseudoStyles.color === ownStyles.color;
    if (!followsColor) {
      return false;
    }
  }
  return true;
}

/** Returns line-height divided by font-size, to three decimals, or null when either is not in pixels. */
function lineHeightRatio(styles: Record<string, string>): number | null {
  const lineHeight = styles["line-height"] ?? "";
  const fontSize = styles["font-size"] ?? "";
  if (!lineHeight.endsWith("px") || !fontSize.endsWith("px")) {
    return null;
  }
  const ratio = Number.parseFloat(lineHeight) / Number.parseFloat(fontSize);
  return Math.round(ratio * 1000) / 1000;
}

/**
 * Adds each property that differs between two style lists to the map, once
 * per property. For a property that follows currentColor, a difference that
 * does not follow `color` replaces one that does, so the one that matters for
 * verify is the one kept.
 */
function recordDifferences(
  element: string,
  keyPrefix: string,
  positiveStyles: Record<string, string>,
  negativeStyles: Record<string, string>,
  firstDifferenceByProperty: Map<string, PropertyDifference>,
): void {
  const propertyNames = new Set([
    ...Object.keys(positiveStyles),
    ...Object.keys(negativeStyles),
  ]);
  for (const property of propertyNames) {
    const positiveValue = positiveStyles[property] ?? "";
    const negativeValue = negativeStyles[property] ?? "";
    if (positiveValue === negativeValue) {
      continue;
    }
    const key = `${keyPrefix}${property}`;
    const difference: PropertyDifference = {
      property: key,
      element,
      positive: positiveValue,
      negative: negativeValue,
    };
    if (CURRENT_COLOR_PROPERTIES.has(property)) {
      difference.follows_color =
        positiveValue === (positiveStyles.color ?? "") &&
        negativeValue === (negativeStyles.color ?? "");
    }
    const recorded = firstDifferenceByProperty.get(key);
    if (recorded === undefined) {
      firstDifferenceByProperty.set(key, difference);
    } else if (
      recorded.follows_color === true &&
      difference.follows_color === false
    ) {
      firstDifferenceByProperty.set(key, difference);
    }
  }
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
 * name covers itself and the logical name of the same side ("margin-left"
 * covers "margin-inline-start"). A difference in a pseudo-element, keyed such
 * as "::first-line color", is covered only by a declared name for the same
 * pseudo-element, such as "::first-line color" or "::first-line font". A
 * shorthand in SHORTHANDS covers its
 * longhands ("margin" covers "margin-left"). A declared `color` covers a
 * property that follows currentColor only where that property's value equals
 * `color` on both sides. A property Chromium derives from another one, such as
 * -webkit-text-decorations-in-effect from text-decoration-line, is covered by
 * that other one.
 */
export function isPropertyDeclared(
  difference: Pick<PropertyDifference, "property" | "follows_color">,
  declaredProperties: string[],
): boolean {
  const { pseudo, property } = splitPseudoKey(difference.property);
  let physicalName = property;
  for (const [logicalSide, physicalSide] of LOGICAL_SIDES) {
    physicalName = physicalName.replace(logicalSide, physicalSide);
  }
  const candidates = [property, physicalName];
  const sourceProperty = DERIVED_PROPERTIES[property];
  if (sourceProperty !== undefined) {
    candidates.push(sourceProperty);
  }
  for (const declaredName of declaredProperties) {
    // A pseudo-element difference counts only when the declaration names the
    // same pseudo-element, and an element difference only when it names none.
    const declaredParts = splitPseudoKey(declaredName);
    if (declaredParts.pseudo !== pseudo) {
      continue;
    }
    const declared = declaredParts.property;
    const shorthandPattern = SHORTHANDS[declared];
    for (const candidate of candidates) {
      if (candidate === declared) {
        return true;
      }
      // ?.test is skipped, and the result is undefined, when the name is not a shorthand.
      if (shorthandPattern?.test(candidate) === true) {
        return true;
      }
    }
    if (
      declared === "color" &&
      CURRENT_COLOR_PROPERTIES.has(property) &&
      difference.follows_color === true
    ) {
      return true;
    }
  }
  return false;
}

/** Counts the decimal places a number is written with, so 4.4 gives 1 and 8 gives 0. */
function countDecimals(value: number): number {
  const text = String(value);
  const pointIndex = text.indexOf(".");
  if (pointIndex === -1) {
    return 0;
  }
  return text.length - pointIndex - 1;
}

/**
 * Returns the first value on the clean side of a range: one step past the
 * edge, where a step is the smallest unit the range is written in. A contrast
 * range of 2.5 to 4.4 that is clean above starts its clean side at 4.5, the
 * WCAG minimum for body text; an edge distance of 0 to 8 px starts it at 9 px.
 * A value between the edge and that first clean value is too close to the
 * defect to count as free of it (FR-54 rule 2).
 */
export function firstCleanValue(range: DefectRange): number {
  const decimals = Math.max(countDecimals(range.from), countDecimals(range.to));
  const step = 10 ** -decimals;
  const edge =
    range.clean_side === "above" ? range.to + step : range.from - step;
  // Rounding to the range's own precision removes floating point error, such as 4.4 + 0.1 = 4.5000000000000004.
  return Number(edge.toFixed(decimals));
}

/** Says whether a value sits on the clean side of a range, at or past its first clean value. */
function isOnCleanSide(value: number, range: DefectRange): boolean {
  const threshold = firstCleanValue(range);
  if (range.clean_side === "above") {
    return value >= threshold;
  }
  return value <= threshold;
}

/** Says whether a measured value lies inside a range, both ends included. */
function isInside(value: number, range: DefectRange): boolean {
  return value >= range.from && value <= range.to;
}

/**
 * Prints one side's value of a text or attribute difference for a problem
 * message. JSON.stringify quotes the value and escapes newlines and quote
 * marks, so text that spans lines stays on one line. A missing attribute is
 * the bare word absent, with no quotes, so it cannot look like a real value.
 */
function describeSideValue(
  difference: PropertyDifference,
  side: "positive" | "negative",
): string {
  if (difference.absent_on === side) {
    return "absent";
  }
  return JSON.stringify(difference[side]);
}

/**
 * Checks one pair against its declaration and returns every problem as a
 * sentence that names the fixture, or an empty list when the pair passes. The
 * positive must sit inside the declared range and the negative on its clean
 * side (rule 2), and the two sides must differ only in declared properties
 * (rule 3).
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
    if (isTextOrAttributeKey(difference.property)) {
      problems.push(
        `${positiveFixture} and ${negativeFixture} differ in ${difference.property} of ${difference.element}: ${describeSideValue(difference, "positive")} on and ${describeSideValue(difference, "negative")} off; a defect may change only styles, so text and attributes must match (FR-54 rule 3)`,
      );
      continue;
    }
    if (!isPropertyDeclared(difference, declaration.properties)) {
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
      if (!mustBeInside && !isOnCleanSide(value, range)) {
        const comparison = range.clean_side === "above" ? "or more" : "or less";
        problems.push(
          `${fixture}: ${range.measure} ${value} is not on the clean side of the declared defect range ${range.from} to ${range.to}; a negative fixture must be ${firstCleanValue(range)} ${comparison} (FR-54 rule 2)`,
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
 *   - **Defect range:** `text-reads-faint`: contrast ratio from 2.5 to 4.4, clean above.
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
        `^${words} from (\\d+(?:\\.\\d+)?) to (\\d+(?:\\.\\d+)?)${unit}, clean (above|below)\\.$`,
      );
      const rangeMatch = pattern.exec(statement);
      if (rangeMatch !== null) {
        parsedRange = {
          measure,
          from: Number(rangeMatch[1]),
          to: Number(rangeMatch[2]),
          clean_side: rangeMatch[3] === "below" ? "below" : "above",
        };
      }
    }
    if (parsedRange === null) {
      throw new Error(
        `GUIDELINES.md line ${lineIndex + 1}: "${statement}" is not "<measure> from <a> to <b>[ px], clean above|below." or "not measured. <words>"`,
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
      : `${guidelineRange.measure} ${guidelineRange.from} to ${guidelineRange.to}, clean ${guidelineRange.clean_side}`;
  const declaredText =
    declaredRange === null
      ? "not measured"
      : `${declaredRange.measure} ${declaredRange.from} to ${declaredRange.to}, clean ${declaredRange.clean_side}`;
  if (guidelineText === declaredText) {
    return null;
  }
  return `${criterionId}: GUIDELINES.md says ${guidelineText}, but its .defect.json says ${declaredText}`;
}

/**
 * Checks every pair in a pack's rendered.json against its criterion's
 * declaration and returns every problem, or an empty list. It names a pair
 * with a side missing, a criterion with no declaration, and records with no
 * defect evidence. readDeclaration returns null when the criterion has no
 * .defect.json. render.ts verify and the durable test in evals/ both use it
 * (FR-54 rules 2 and 3).
 */
export function findPackDeclarationProblems(
  packFolder: string,
  records: RenderRecord[],
  readDeclaration: (criterionId: string) => DefectDeclaration | null,
): string[] {
  const recordsByTemplate = new Map<
    string,
    { positive?: RenderRecord; negative?: RenderRecord }
  >();
  for (const record of records) {
    const pair = recordsByTemplate.get(record.template) ?? {};
    if (record.defect === "on") {
      pair.positive = record;
    } else {
      pair.negative = record;
    }
    recordsByTemplate.set(record.template, pair);
  }
  const problems: string[] = [];
  for (const [templatePath, pair] of recordsByTemplate) {
    const templateId = templatePath.slice(
      templatePath.lastIndexOf("/") + 1,
      -".html".length,
    );
    const criterionId = templateCriterionId(templateId);
    const declaration = readDeclaration(criterionId);
    if (pair.positive === undefined || pair.negative === undefined) {
      problems.push(
        `${templatePath}: rendered.json does not hold both a positive and a negative fixture`,
      );
    } else if (declaration === null) {
      problems.push(
        `${templatePath}: ${declarationPathFor(packFolder, criterionId)} is missing (FR-54 rule 2)`,
      );
    } else if (
      pair.positive.defect_evidence === undefined ||
      pair.negative.defect_evidence === undefined
    ) {
      problems.push(
        `${templatePath}: rendered.json has no defect evidence; render the pack again (FR-54 rules 2 and 3)`,
      );
    } else {
      problems.push(
        ...findDeclarationProblems(
          declaration,
          pair.positive.fixture,
          pair.positive.defect_evidence,
          pair.negative.fixture,
          pair.negative.defect_evidence,
        ),
      );
    }
  }
  return problems;
}
