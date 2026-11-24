// The threshold evaluation (crit-576.13, PRD FR-79 and EV-14). It asks whether the measured facts
// file, with its `violations` list, harms the critic's call where a number and the eye disagree,
// and checks that the critic uses the facts near a numeric rule. There are three kinds of case:
//
// - exempt: a value under a rule's number that WCAG exempts (text in a disabled control, text in a
//   logo, large text between 3:1 and 4.5:1). The right call is no defect. Does a number make the
//   critic flag it?
// - harm: a page the numbers pass but the eye fails (text over a photo the file cannot measure,
//   thin light text at a passing ratio, targets over 24 px jammed together). The right call is a
//   defect. Does the critic still call it?
// - near: one pair per rule, just past and just inside the number. A check that the critic uses
//   the facts.
//
// CASES below is the one list of cases. render-thresholds.ts renders each one with measure.mjs and
// writes its image, facts file, and measured value into evals/critic/thresholds/; manifest.json
// records them. For each image the critic runs RUNS_PER_IMAGE times with the image alone and
// RUNS_PER_IMAGE times with the image and its facts file, at the same skill commit. A judge reads
// each crit and says whether it calls the case's defect present, absent, uncertain, or does not
// mention it, and where the crit raises it. Its prompt names the defect in words and never a value
// or a rule's number. A second judge question reads the number the crit states, if any.
//
// Live mode runs the critic and the judge, so `npm run ci` never runs it (CS-21); a person starts it
// by hand. Replay mode (--replay) reads the saved crits and answers and starts no child process.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { formatTable } from "../support/format-table.ts";
import { runPooled } from "./compare.ts";
import { DETECTION_SYSTEM } from "./detect.ts";
import {
  ensureJudgeAnswer,
  JUDGE_MODEL,
  type JudgeQuestion,
  readJudgeAnswer,
} from "./judge.ts";
import { rankedFindings } from "./repeat.ts";
import {
  type ClaudeRunner,
  type CritRequest,
  currentRunIdentity,
  ensureCrits,
  isRecord,
  readSavedCrits,
  requestKeyOf,
  runClaudeProcess,
  type SavedCrit,
  skillCommit,
} from "./run-critic.ts";

const REPOSITORY_DIRECTORY = resolve(import.meta.dirname, "..", "..");
const EXIT_CODE_COULD_NOT_RUN = 2;

/** How many critic runs or judge calls run at once in live mode. */
const MAX_PARALLEL_CALLS = 4;

/** How many crits each image gets in each condition, so a difference can be read against run-to-run noise. */
export const RUNS_PER_IMAGE = 3;

/** The folder of the pages, images, facts files, and manifest, relative to the repository root. */
export const THRESHOLDS_FOLDER = join("evals", "critic", "thresholds");

/** The judge question names, saved with each answer. */
const DETECTION_QUESTION_NAME = "threshold-detection";
const NUMBER_QUESTION_NAME = "threshold-number";

/** The kinds of case, in the order the tables print them. */
export type CaseKind = "exempt" | "harm" | "near";
export const CASE_KINDS: readonly CaseKind[] = ["exempt", "harm", "near"];

/** Whether the critic got the image alone or the image and its facts file. */
export type Condition = "image" | "facts";
export const CONDITIONS: readonly Condition[] = ["image", "facts"];

/** The defects the judge asks about. */
export type DefectId =
  | "text-contrast"
  | "thin-text"
  | "line-length"
  | "target-size"
  | "crowded-targets";

/** How the judges name a defect: a title and a question for the detection judge, a quantity for the number judge. None holds a number. */
export type Defect = {
  readonly title: string;
  readonly judgeRule: string;
  readonly quantity: string;
};

export const DEFECTS: Readonly<Record<DefectId, Defect>> = {
  "text-contrast": {
    title: "Text too low in contrast against what lies behind it",
    judgeRule:
      "Is some of the text drawn so close in color or tone to what lies behind it that it is hard to read?",
    quantity:
      "the contrast ratio between a text color and its background, written as a ratio such as N:1 or as a plain number. If the critique states this for more than one text, give the lowest.",
  },
  "thin-text": {
    title: "Text too thin or faint to read comfortably",
    judgeRule:
      "Is some of the text drawn with strokes so thin, so small, or so light that it is hard to read?",
    quantity:
      "the contrast ratio between a text color and its background, written as a ratio such as N:1 or as a plain number. If the critique states this for more than one text, give the lowest.",
  },
  "line-length": {
    title: "Lines of paragraph text too long",
    judgeRule:
      "Do the lines of paragraph text run so long that the eye may lose its place on the way back to the start of the next line?",
    quantity:
      "the number of characters per line in the paragraph text. If the critique states more than one such figure, give the highest.",
  },
  "target-size": {
    title: "Controls too small to click or tap",
    judgeRule:
      "Are some buttons, icon buttons, or other controls that people click or tap too small to hit reliably?",
    quantity:
      "the size in pixels of a button, icon button, or other control that people click or tap; when the critique gives a width and a height, the smaller of the two. If it states more than one such size, give the smallest.",
  },
  "crowded-targets": {
    title: "Controls too small or too close together to hit reliably",
    judgeRule:
      "Are some buttons or other controls so small or so close together that people may hit the wrong one?",
    quantity:
      "the size in pixels of a button, icon button, or other control that people click or tap; when the critique gives a width and a height, the smaller of the two. If it states more than one such size, give the smallest.",
  },
};

/** The lowest and highest value an image's measured value may have, both included. */
export type Band = readonly [number, number];

/** Where a case's measured value comes from: the facts file, or the pixels behind the text in the screenshot. */
export type MeasuredFrom = "facts" | "screenshot";

/** One case: one image, what it is for, how to render it, and what its facts file must show. */
export type CaseSpec = {
  /** The image id; never shown to the critic. */
  readonly id: string;
  readonly kind: CaseKind;
  /** A short name of the case, shown in the tables. */
  readonly label: string;
  readonly defect: DefectId;
  /** What a correct crit says about the defect. */
  readonly expected: "present" | "absent";
  /** The template, relative to the thresholds folder. */
  readonly template: string;
  /** The CSS custom properties the template is rendered with. */
  readonly settings: Readonly<Record<string, string>>;
  readonly measuredFrom: MeasuredFrom;
  /** The band the measured value must fall in, chosen by this evaluation (crit-576.13). */
  readonly band: Band;
  /** Reads the measured value from the facts viewport; undefined for a value read from the screenshot. */
  readonly measure: ((viewport: Record<string, unknown>) => number) | undefined;
  /** Returns the problems with the facts viewport for this case, or none. */
  readonly checkFacts: (viewport: Record<string, unknown>) => string[];
};

/** Returns a list field of a viewport as records, or throws when it is not a list (CS-7). */
function readList(
  viewport: Record<string, unknown>,
  field: string,
): Record<string, unknown>[] {
  const list = viewport[field];
  if (!Array.isArray(list)) {
    throw new Error(`the facts viewport has no ${field} list`);
  }
  const records: Record<string, unknown>[] = [];
  for (const item of list) {
    if (!isRecord(item)) {
      throw new Error(`an entry of ${field} is not an object`);
    }
    records.push(item);
  }
  return records;
}

/** Throws when the facts file left out text blocks or targets, because then the extreme value may be missing. */
function requireNothingLeftOut(viewport: Record<string, unknown>): void {
  if (viewport.text_blocks_left_out !== 0 || viewport.targets_left_out !== 0) {
    throw new Error(
      "the facts file left out text blocks or targets, so the page's value may be missing",
    );
  }
}

/** Returns the text block with the lowest measured contrast, skipping blocks with no number. */
export function lowestContrastBlock(
  viewport: Record<string, unknown>,
): Record<string, unknown> {
  requireNothingLeftOut(viewport);
  let lowest: Record<string, unknown> | undefined;
  for (const block of readList(viewport, "text_blocks")) {
    if (typeof block.contrast !== "number") {
      continue;
    }
    if (lowest === undefined || block.contrast < Number(lowest.contrast)) {
      lowest = block;
    }
  }
  if (lowest === undefined) {
    throw new Error("the facts file has no text block with a contrast");
  }
  return lowest;
}

/** The lowest measured contrast of any text block. */
export function lowestContrast(viewport: Record<string, unknown>): number {
  return Number(lowestContrastBlock(viewport).contrast);
}

/** The fewest lines a text block needs to count as paragraph text, as in measure.mjs. */
const PARAGRAPH_MINIMUM_LINES = 3;

/** The most characters per line of any text block of 3 or more lines. */
export function longestParagraphLine(
  viewport: Record<string, unknown>,
): number {
  requireNothingLeftOut(viewport);
  let longest = 0;
  for (const block of readList(viewport, "text_blocks")) {
    if (
      typeof block.lines === "number" &&
      typeof block.characters_per_line === "number" &&
      block.lines >= PARAGRAPH_MINIMUM_LINES
    ) {
      longest = Math.max(longest, block.characters_per_line);
    }
  }
  if (longest === 0) {
    throw new Error("the facts file has no paragraph of 3 or more lines");
  }
  return longest;
}

/** Returns the box [x, y, width, height] of a target; throws when it has none. */
function targetBox(target: Record<string, unknown>): number[] {
  const box = target.box;
  if (
    !Array.isArray(box) ||
    box.length !== 4 ||
    !box.every((value) => typeof value === "number")
  ) {
    throw new Error(`target ${String(target.selector)} has no box`);
  }
  return box;
}

/** The smaller side, in px, of the smallest interactive target. */
export function smallestTargetSide(viewport: Record<string, unknown>): number {
  requireNothingLeftOut(viewport);
  let smallest = Number.POSITIVE_INFINITY;
  for (const target of readList(viewport, "targets")) {
    const box = targetBox(target);
    smallest = Math.min(smallest, box[2] ?? 0, box[3] ?? 0);
  }
  if (smallest === Number.POSITIVE_INFINITY) {
    throw new Error("the facts file has no interactive target");
  }
  return smallest;
}

/** Returns the rule names of the viewport's violations list; an absent list counts as empty. */
export function violationRules(viewport: Record<string, unknown>): string[] {
  if (viewport.violations === undefined) {
    return [];
  }
  return readList(viewport, "violations").map((violation) =>
    String(violation.rule),
  );
}

/** A facts check: the violations list holds exactly these rules, in any order and number. */
function violationsAre(
  expectedRules: readonly string[],
): (viewport: Record<string, unknown>) => string[] {
  return (viewport) => {
    const found = [...new Set(violationRules(viewport))].sort();
    const expected = [...new Set(expectedRules)].sort();
    if (JSON.stringify(found) !== JSON.stringify(expected)) {
      return [
        `violations hold ${JSON.stringify(found)}, expected ${JSON.stringify(expected)}`,
      ];
    }
    return [];
  };
}

/** A facts check: no violation, and the lowest-contrast block carries the given exemption note. */
function exemptLowestBlock(
  exemption: string,
): (viewport: Record<string, unknown>) => string[] {
  return (viewport) => {
    const problems = violationsAre([])(viewport);
    const notes = lowestContrastBlock(viewport).notes;
    const note = `exempt from the contrast minimum: ${exemption}`;
    if (!Array.isArray(notes) || !notes.includes(note)) {
      problems.push(`the lowest-contrast block has no note "${note}"`);
    }
    return problems;
  };
}

/** A facts check: no violation, and the lowest-contrast block is large text (24 px or more). */
function lowestBlockIsLarge(viewport: Record<string, unknown>): string[] {
  const problems = violationsAre([])(viewport);
  const size = lowestContrastBlock(viewport).font_size;
  if (typeof size !== "number" || size < 24) {
    problems.push(
      `the lowest-contrast block is ${String(size)} px, not 24 or more`,
    );
  }
  return problems;
}

/** A facts check: no violation, and the lowest-contrast block is drawn at weight 300 and 14 px or less. */
function lowestBlockIsThin(viewport: Record<string, unknown>): string[] {
  const problems = violationsAre([])(viewport);
  const block = lowestContrastBlock(viewport);
  if (block.font_weight !== 300 || Number(block.font_size) > 14) {
    problems.push(
      `the lowest-contrast block is weight ${String(block.font_weight)} at ${String(block.font_size)} px, not weight 300 at 14 px or less`,
    );
  }
  return problems;
}

/** A facts check: no violation, and at least two targets touch or overlap. */
function targetsTouch(viewport: Record<string, unknown>): string[] {
  const problems = violationsAre([])(viewport);
  const boxes = readList(viewport, "targets").map(targetBox);
  let touching = false;
  boxes.forEach((first, index) => {
    for (const second of boxes.slice(index + 1)) {
      const [x1 = 0, y1 = 0, w1 = 0, h1 = 0] = first;
      const [x2 = 0, y2 = 0, w2 = 0, h2 = 0] = second;
      const gapX = Math.max(x2 - (x1 + w1), x1 - (x2 + w2));
      const gapY = Math.max(y2 - (y1 + h1), y1 - (y2 + h2));
      if (gapX <= 0 && gapY <= 0) {
        touching = true;
      }
    }
  });
  if (!touching) {
    problems.push("no two targets touch");
  }
  return problems;
}

/** A facts check: no violation, and some text block's contrast is marked not measurable. */
function someTextNotMeasurable(viewport: Record<string, unknown>): string[] {
  const problems = violationsAre([])(viewport);
  const unmeasured = readList(viewport, "text_blocks").filter(
    (block) =>
      block.contrast === null &&
      typeof block.contrast_note === "string" &&
      block.contrast_note.startsWith("not measurable"),
  );
  if (unmeasured.length === 0) {
    problems.push("no text block is marked not measurable");
  }
  return problems;
}

/**
 * The cases. The bands, the number of cases, and which cases exist are this evaluation's own
 * choice (crit-576.13), not rules from the PRD. Each near band sits about 10 to 20 percent from
 * the rule's number, far outside measure.mjs's rounding.
 */
export const CASES: readonly CaseSpec[] = [
  {
    id: "exempt-disabled-text",
    kind: "exempt",
    label: "disabled button text",
    defect: "text-contrast",
    expected: "absent",
    template: "pages/exempt-disabled.html",
    settings: { "--c1": "#a3a3a3" },
    measuredFrom: "facts",
    band: [1.8, 3.0],
    measure: lowestContrast,
    checkFacts: exemptLowestBlock("disabled control"),
  },
  {
    id: "exempt-logo",
    kind: "exempt",
    label: "logo text",
    defect: "text-contrast",
    expected: "absent",
    template: "pages/exempt-logo.html",
    settings: { "--c1": "#a8b4bf" },
    measuredFrom: "facts",
    band: [1.8, 3.0],
    measure: lowestContrast,
    checkFacts: exemptLowestBlock("logo or image"),
  },
  {
    id: "exempt-large-text",
    kind: "exempt",
    label: "large text, 3 to 4.5",
    defect: "text-contrast",
    expected: "absent",
    template: "pages/exempt-large-text.html",
    settings: { "--c1": "#7d858d" },
    measuredFrom: "facts",
    band: [3.3, 4.2],
    measure: lowestContrast,
    checkFacts: lowestBlockIsLarge,
  },
  {
    id: "harm-photo-text",
    kind: "harm",
    label: "text over a photo",
    defect: "text-contrast",
    expected: "present",
    template: "pages/harm-photo-text.html",
    settings: { "--c1": "rgb(255, 255, 255)" },
    measuredFrom: "screenshot",
    band: [1, 2.5],
    measure: undefined,
    checkFacts: someTextNotMeasurable,
  },
  {
    id: "harm-thin-text",
    kind: "harm",
    label: "thin light text",
    defect: "thin-text",
    expected: "present",
    template: "pages/harm-thin-text.html",
    settings: { "--c1": "#727272" },
    measuredFrom: "facts",
    band: [4.5, 5.2],
    measure: lowestContrast,
    checkFacts: lowestBlockIsThin,
  },
  {
    id: "harm-jammed-targets",
    kind: "harm",
    label: "jammed targets over 24 px",
    defect: "crowded-targets",
    expected: "present",
    template: "pages/harm-jammed-targets.html",
    settings: { "--s1": "25px" },
    measuredFrom: "facts",
    band: [24, 27],
    measure: smallestTargetSide,
    checkFacts: targetsTouch,
  },
  {
    id: "text-contrast-near-fail",
    kind: "near",
    label: "text contrast",
    defect: "text-contrast",
    expected: "present",
    template: "pages/text-contrast-1.html",
    settings: { "--c1": "#818181" },
    measuredFrom: "facts",
    band: [3.7, 4.1],
    measure: lowestContrast,
    checkFacts: violationsAre(["text-contrast"]),
  },
  {
    id: "text-contrast-near-pass",
    kind: "near",
    label: "text contrast",
    defect: "text-contrast",
    expected: "absent",
    template: "pages/text-contrast-1.html",
    settings: { "--c1": "#6d6d6d" },
    measuredFrom: "facts",
    band: [5.0, 5.6],
    measure: lowestContrast,
    checkFacts: violationsAre([]),
  },
  {
    id: "line-length-near-fail",
    kind: "near",
    label: "line length",
    defect: "line-length",
    expected: "present",
    template: "pages/line-length-1.html",
    settings: { "--w1": "700px" },
    measuredFrom: "facts",
    band: [84, 95],
    measure: longestParagraphLine,
    checkFacts: violationsAre(["line-length"]),
  },
  {
    id: "line-length-near-pass",
    kind: "near",
    label: "line length",
    defect: "line-length",
    expected: "absent",
    template: "pages/line-length-1.html",
    settings: { "--w1": "530px" },
    measuredFrom: "facts",
    band: [60, 70],
    measure: longestParagraphLine,
    checkFacts: violationsAre([]),
  },
  {
    id: "target-size-near-fail",
    kind: "near",
    label: "target size",
    defect: "target-size",
    expected: "present",
    template: "pages/target-size-1.html",
    settings: { "--s1": "20px" },
    measuredFrom: "facts",
    band: [19, 21],
    measure: smallestTargetSide,
    checkFacts: violationsAre(["target-size"]),
  },
  {
    id: "target-size-near-pass",
    kind: "near",
    label: "target size",
    defect: "target-size",
    expected: "absent",
    template: "pages/target-size-1.html",
    settings: { "--s1": "28px" },
    measuredFrom: "facts",
    band: [27, 30],
    measure: smallestTargetSide,
    checkFacts: violationsAre([]),
  },
];

/** Returns the case with an id; throws for an unknown id (CS-7). */
export function caseById(id: string): CaseSpec {
  const spec = CASES.find((candidate) => candidate.id === id);
  if (spec === undefined) {
    throw new Error(`unknown case ${id}`);
  }
  return spec;
}

/** Returns the one viewport of a facts file written by render-thresholds.ts; throws unless there is exactly one. */
export function onlyViewport(facts: unknown): Record<string, unknown> {
  if (!isRecord(facts) || !Array.isArray(facts.viewports)) {
    throw new Error("the facts file has no viewports list");
  }
  const viewport = facts.viewports[0];
  if (facts.viewports.length !== 1 || !isRecord(viewport)) {
    throw new Error(
      `the facts file has ${facts.viewports.length} viewports, not 1`,
    );
  }
  return viewport;
}

/** Returns true when a value lies inside a band, both ends included. */
export function inBand(value: number, band: Band): boolean {
  return value >= band[0] && value <= band[1];
}

/** One image of the manifest: what render-thresholds.ts wrote for one case. */
export type ManifestEntry = {
  readonly id: string;
  readonly kind: CaseKind;
  readonly defect: DefectId;
  readonly expected: "present" | "absent";
  readonly template: string;
  readonly settings: Readonly<Record<string, string>>;
  /** The image, relative to the thresholds folder. */
  readonly image: string;
  readonly image_sha256: string;
  /** The facts file, relative to the thresholds folder. */
  readonly facts: string;
  readonly facts_sha256: string;
  readonly measured_value: number;
  readonly measured_from: MeasuredFrom;
};

/** Returns a non-empty string field of a record, or throws with `where` in the message (CS-7). */
function readString(
  record: Record<string, unknown>,
  field: string,
  where: string,
): string {
  const value = record[field];
  if (typeof value !== "string" || value === "") {
    throw new Error(`${where}: ${field} must be a non-empty string`);
  }
  return value;
}

/** Checks one manifest entry's shape against its case and returns it (CS-7). */
export function parseManifestEntry(value: unknown): ManifestEntry {
  if (!isRecord(value)) {
    throw new Error("manifest.json: an entry is not an object");
  }
  const id = readString(value, "id", "manifest.json");
  const where = `manifest.json entry ${id}`;
  const spec = caseById(id);
  if (typeof value.measured_value !== "number") {
    throw new Error(`${where}: measured_value must be a number`);
  }
  const entry: ManifestEntry = {
    id,
    kind: spec.kind,
    defect: spec.defect,
    expected: spec.expected,
    template: spec.template,
    settings: spec.settings,
    image: readString(value, "image", where),
    image_sha256: readString(value, "image_sha256", where),
    facts: readString(value, "facts", where),
    facts_sha256: readString(value, "facts_sha256", where),
    measured_value: value.measured_value,
    measured_from: spec.measuredFrom,
  };
  // The case fields are written into the manifest for a reader; they must match CASES.
  for (const field of [
    "kind",
    "defect",
    "expected",
    "template",
    "measured_from",
  ] as const) {
    if (value[field] !== entry[field]) {
      throw new Error(`${where}: ${field} differs from CASES`);
    }
  }
  if (JSON.stringify(value.settings) !== JSON.stringify(spec.settings)) {
    throw new Error(`${where}: settings differ from CASES`);
  }
  return entry;
}

/** Reads and checks every entry of evals/critic/thresholds/manifest.json. */
export function readManifest(repositoryDirectory: string): ManifestEntry[] {
  const manifest: unknown = JSON.parse(
    readFileSync(
      join(repositoryDirectory, THRESHOLDS_FOLDER, "manifest.json"),
      "utf8",
    ),
  );
  if (!Array.isArray(manifest)) {
    throw new Error("manifest.json must hold a list");
  }
  return manifest.map(parseManifestEntry);
}

/** Returns the SHA-256 of a file as hex. */
export function fileSha256(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/**
 * Words that would tell the critic which rule or case a page tests. checkManifest looks for them
 * in what the critic reads that the page author chose: the selectors and the quoted text of each
 * facts file, and the class names of each template. The list is this evaluation's own choice.
 */
export const HINT_PATTERN =
  /contrast|wcag|ratio|faint|pale|muted|tiny|small|target|touch|measure|length|\bwide\b|narrow|\blong\b|character|readab|legib|access|a11y|threshold|defect|\bfail|\bpass\b|\bthin\b|\blight\b|crowd|jam|busy|exempt|harm/i;

/** Returns the strings of a facts file that the page author chose: every selector and example, and the texts map. */
export function authoredStrings(facts: unknown): string[] {
  const strings: string[] = [];
  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const item of value) {
        walk(item);
      }
      return;
    }
    if (!isRecord(value)) {
      return;
    }
    for (const [key, field] of Object.entries(value)) {
      if (
        typeof field === "string" &&
        ["selector", "example", "parentSelector"].includes(key)
      ) {
        strings.push(field);
      }
      walk(field);
    }
  };
  walk(facts);
  if (isRecord(facts) && isRecord(facts.texts)) {
    for (const [selector, text] of Object.entries(facts.texts)) {
      strings.push(selector, String(text));
    }
  }
  return strings;
}

/**
 * Checks the manifest against CASES and the files on disk and returns one line per problem (none
 * when all is well): every case has one entry; each file has its recorded SHA-256; a value read
 * from the facts file is the recorded one; the value lies in its band; the facts file shows what
 * the case needs; and no authored string or template class name holds a word from HINT_PATTERN.
 */
export function checkManifest(
  repositoryDirectory: string,
  entries: readonly ManifestEntry[],
): string[] {
  const problems: string[] = [];
  const folder = join(repositoryDirectory, THRESHOLDS_FOLDER);
  const ids = entries.map((entry) => entry.id);
  for (const spec of CASES) {
    const count = ids.filter((id) => id === spec.id).length;
    if (count !== 1) {
      problems.push(`${spec.id}: ${count} manifest entries, not 1`);
    }
  }
  for (const entry of entries) {
    const spec = caseById(entry.id);
    if (fileSha256(join(folder, entry.image)) !== entry.image_sha256) {
      problems.push(`${entry.id}: ${entry.image} has another SHA-256`);
    }
    const factsPath = join(folder, entry.facts);
    if (fileSha256(factsPath) !== entry.facts_sha256) {
      problems.push(`${entry.id}: ${entry.facts} has another SHA-256`);
    }
    const facts: unknown = JSON.parse(readFileSync(factsPath, "utf8"));
    for (const text of authoredStrings(facts)) {
      const hint = HINT_PATTERN.exec(text);
      if (hint !== null) {
        problems.push(
          `${entry.id}: the facts file holds "${hint[0]}" in "${text}"`,
        );
      }
    }
    const viewport = onlyViewport(facts);
    if (spec.measure !== undefined) {
      const measured = spec.measure(viewport);
      if (measured !== entry.measured_value) {
        problems.push(
          `${entry.id}: the facts file gives ${measured}, the manifest ${entry.measured_value}`,
        );
      }
    }
    if (!inBand(entry.measured_value, spec.band)) {
      problems.push(
        `${entry.id}: ${entry.measured_value} is outside the band ${spec.band[0]} to ${spec.band[1]}`,
      );
    }
    for (const problem of spec.checkFacts(viewport)) {
      problems.push(`${entry.id}: ${problem}`);
    }
    const template = readFileSync(join(folder, entry.template), "utf8");
    for (const match of template.matchAll(/class="([^"]*)"/g)) {
      const classHint = HINT_PATTERN.exec(match[1] ?? "");
      if (classHint !== null) {
        problems.push(
          `${entry.id}: ${entry.template} has a class name holding "${classHint[0]}"`,
        );
      }
    }
  }
  return problems;
}

/** What one crit says about the defect. "uncertain" is a crit that calls it borderline or asks for it to be measured. */
export type DefectCall = "present" | "absent" | "uncertain" | "not_mentioned";
const DEFECT_CALLS: readonly DefectCall[] = [
  "present",
  "absent",
  "uncertain",
  "not_mentioned",
];

/** Where a crit raises the defect. */
export type WhereRaised =
  | "ranked"
  | "smaller_things"
  | "elsewhere"
  | "not_raised";
const WHERE_RAISED: readonly WhereRaised[] = [
  "ranked",
  "smaller_things",
  "elsewhere",
  "not_raised",
];

/** The JSON Schema of the detection answer. `reason` comes first, so the judge reasons before it answers. */
export const THRESHOLD_DETECTION_SCHEMA = {
  type: "object",
  properties: {
    reason: { type: "string" },
    says_defect: { enum: DEFECT_CALLS },
    where_raised: { enum: WHERE_RAISED },
  },
  required: ["reason", "says_defect", "where_raised"],
  additionalProperties: false,
} as const;

/** The checked detection answer for one crit. */
export type ThresholdDetectionAnswer = {
  readonly reason: string;
  readonly says_defect: DefectCall;
  readonly where_raised: WhereRaised;
};

/** Checks a detection answer and returns it; throws when its shape is wrong (CS-7). */
export function parseThresholdDetectionAnswer(
  value: unknown,
): ThresholdDetectionAnswer {
  const wrongShape = new Error(
    `the threshold detection answer has the wrong shape: ${JSON.stringify(value)}`,
  );
  if (!isRecord(value) || typeof value.reason !== "string") {
    throw wrongShape;
  }
  // find returns the first allowed value equal to the answer's, or undefined when none is.
  const saysDefect = DEFECT_CALLS.find((call) => call === value.says_defect);
  const whereRaised = WHERE_RAISED.find(
    (place) => place === value.where_raised,
  );
  if (saysDefect === undefined || whereRaised === undefined) {
    throw wrongShape;
  }
  return {
    reason: value.reason,
    says_defect: saysDefect,
    where_raised: whereRaised,
  };
}

/**
 * Returns the detection question for one crit. It is the prompt of detect.ts with a fourth answer,
 * uncertain, and a second field that says where the crit raises the defect. It names the defect in
 * words and holds no number, id, or file name.
 */
export function buildThresholdDetectionQuestion(
  defect: Defect,
  critKey: string,
  saved: SavedCrit,
): JudgeQuestion {
  const prompt = `Possible defect: ${defect.title}
What it looks like, as a question about the design: ${defect.judgeRule}
The design may or may not have this defect.

Critique:
${saved.crit}

Anywhere in the critique, in any section, does it say that this defect is present in the design, say that it is absent or that this aspect is fine, say that it is borderline or cannot be judged without measuring it, or not mention it? A defect that is plainly the same one in other words counts. A different problem in the same area, or a general remark about the topic, is not_mentioned. Answer present, absent, uncertain or not_mentioned.

Then say where the critique raises this defect as a problem: ranked when it is one of the numbered findings under "What would move it most", smaller_things when it is under "Smaller things", elsewhere when it is only in another part of the critique, and not_raised when the critique does not raise it as a problem.`;
  return {
    name: DETECTION_QUESTION_NAME,
    system: DETECTION_SYSTEM,
    prompt,
    schema: THRESHOLD_DETECTION_SCHEMA,
    crits: [{ key: critKey, run: saved.runNumber }],
  };
}

/** The JSON Schema of the number answer. `reason` comes first. */
export const NUMBER_SCHEMA = {
  type: "object",
  properties: {
    reason: { type: "string" },
    states_number: { type: "boolean" },
    value: { type: "number" },
  },
  required: ["reason", "states_number", "value"],
  additionalProperties: false,
} as const;

/** The checked number answer for one crit. */
export type NumberAnswer = {
  readonly reason: string;
  readonly states_number: boolean;
  readonly value: number;
};

/** Checks a number answer and returns it; throws when its shape is wrong (CS-7). */
export function parseNumberAnswer(value: unknown): NumberAnswer {
  if (
    !isRecord(value) ||
    typeof value.reason !== "string" ||
    typeof value.states_number !== "boolean" ||
    typeof value.value !== "number"
  ) {
    throw new Error(
      `the number judge answer has the wrong shape: ${JSON.stringify(value)}`,
    );
  }
  return {
    reason: value.reason,
    states_number: value.states_number,
    value: value.value,
  };
}

/** Returns the number question for one crit. The prompt names the quantity in words and never a rule's number. */
export function buildNumberQuestion(
  defect: Defect,
  critKey: string,
  saved: SavedCrit,
): JudgeQuestion {
  const prompt = `Quantity: ${defect.quantity}

Critique:
${saved.crit}

Does the critique state a number for this quantity as a value of the design it critiques? A number given only as a requirement, a guideline, or a goal does not count. If it gives a range or an approximate figure, give the middle of the range or the figure. Answer states_number true and the value, or states_number false and value 0.`;
  return {
    name: NUMBER_QUESTION_NAME,
    system: DETECTION_SYSTEM,
    prompt,
    schema: NUMBER_SCHEMA,
    crits: [{ key: critKey, run: saved.runNumber }],
  };
}

/** Returns true when a case's measured value comes from the facts file, so a stated number can be scored against it. */
function hasNumberTruth(entry: ManifestEntry): boolean {
  return entry.measured_from === "facts";
}

/** Returns the crit request of an image in a condition: the image alone, or with its facts file. */
export function critRequestFor(
  repositoryDirectory: string,
  entry: ManifestEntry,
  condition: Condition,
): CritRequest {
  const folder = join(repositoryDirectory, THRESHOLDS_FOLDER);
  const imagePath = join(folder, entry.image);
  if (condition === "image") {
    return { imagePaths: [imagePath] };
  }
  return { imagePaths: [imagePath], factsPath: join(folder, entry.facts) };
}

/** What the judges said about one crit, and how many ranked findings the crit has (undefined when its list cannot be read). */
export type JudgedCrit = {
  readonly detection: ThresholdDetectionAnswer;
  readonly number: NumberAnswer | undefined;
  readonly rankedCount: number | undefined;
};

/** The judged crits of one image in one condition, by run: index 0 is run 1. */
export type ImageResults = {
  readonly entry: ManifestEntry;
  readonly condition: Condition;
  readonly runs: readonly JudgedCrit[];
};

/** Returns the number of ranked findings of a crit, or undefined when its ranked list cannot be read. */
export function countRanked(crit: string): number | undefined {
  try {
    return rankedFindings(crit).length;
  } catch {
    return undefined;
  }
}

/** Returns how a call scores: right, uncertain (counted on its own), or wrong. */
export function scoreCall(
  expected: "present" | "absent",
  call: DefectCall,
): "right" | "uncertain" | "wrong" {
  if (call === "uncertain") {
    return "uncertain";
  }
  if (expected === "present") {
    return call === "present" ? "right" : "wrong";
  }
  return call === "present" ? "wrong" : "right";
}

/** Counts by run: index 0 is run 1. */
export type RunCounts = { hits: number[]; total: number[] };

/** Returns counts of zero for every run. */
function emptyRunCounts(): RunCounts {
  return {
    hits: new Array(RUNS_PER_IMAGE).fill(0),
    total: new Array(RUNS_PER_IMAGE).fill(0),
  };
}

/** Adds one item of one run to the counts. */
function addRun(counts: RunCounts, run: number, hit: boolean): void {
  counts.total[run] = (counts.total[run] ?? 0) + 1;
  if (hit) {
    counts.hits[run] = (counts.hits[run] ?? 0) + 1;
  }
}

/** Formats run counts as `hits/total [run1 run2 run3]`, or `-` when nothing was counted. */
export function formatRunCounts(counts: RunCounts): string {
  const hits = counts.hits.reduce((sum, count) => sum + count, 0);
  const total = counts.total.reduce((sum, count) => sum + count, 0);
  if (total === 0) {
    return "-";
  }
  return `${hits}/${total} [${counts.hits.join(" ")}]`;
}

/** The short letter of a call in the per-image table. */
function callLetter(call: DefectCall): string {
  const letters: Record<DefectCall, string> = {
    present: "P",
    absent: "A",
    uncertain: "U",
    not_mentioned: "N",
  };
  return letters[call];
}

/** Returns a number rounded to two places as text. */
function roundText(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** Returns the median of a non-empty list. */
function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? 0;
  }
  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

/**
 * Builds the report from the judged crits of every image in both conditions: right and uncertain
 * calls per case kind and per image, both-right per near pair, crowd-out, and stated numbers.
 */
export function buildReport(
  entries: readonly ManifestEntry[],
  results: ReadonlyMap<string, ImageResults>,
): string {
  const resultsOf = (entry: ManifestEntry, condition: Condition) => {
    const found = results.get(`${condition}|${entry.id}`);
    if (found === undefined) {
      throw new Error(`no results for ${entry.id} with ${condition}`);
    }
    return found;
  };
  const sections: string[] = [];

  // Right and uncertain calls per case kind and condition.
  const kindRows: string[][] = [];
  for (const kind of CASE_KINDS) {
    for (const condition of CONDITIONS) {
      const right = emptyRunCounts();
      const uncertain = emptyRunCounts();
      for (const entry of entries.filter((item) => item.kind === kind)) {
        resultsOf(entry, condition).runs.forEach((judged, run) => {
          const score = scoreCall(entry.expected, judged.detection.says_defect);
          addRun(right, run, score === "right");
          addRun(uncertain, run, score === "uncertain");
        });
      }
      kindRows.push([
        kind,
        condition,
        formatRunCounts(right),
        formatRunCounts(uncertain),
      ]);
    }
  }
  sections.push(
    `calls by case kind: right, and uncertain (not counted as right or wrong); brackets give runs 1 to ${RUNS_PER_IMAGE}\n${formatTable(
      ["kind", "condition", "right", "uncertain"],
      kindRows,
    )}`,
  );

  // Near pairs: both images of the same run right.
  const pairRows: string[][] = [];
  const nearDefects = [
    ...new Set(
      entries
        .filter((entry) => entry.kind === "near")
        .map((entry) => entry.defect),
    ),
  ];
  for (const defect of nearDefects) {
    const fail = entries.find(
      (entry) =>
        entry.kind === "near" &&
        entry.defect === defect &&
        entry.expected === "present",
    );
    const pass = entries.find(
      (entry) =>
        entry.kind === "near" &&
        entry.defect === defect &&
        entry.expected === "absent",
    );
    if (fail === undefined || pass === undefined) {
      continue;
    }
    for (const condition of CONDITIONS) {
      const both = emptyRunCounts();
      const failRuns = resultsOf(fail, condition).runs;
      const passRuns = resultsOf(pass, condition).runs;
      for (let run = 0; run < RUNS_PER_IMAGE; run += 1) {
        const failCall = failRuns[run]?.detection.says_defect;
        const passCall = passRuns[run]?.detection.says_defect;
        const failRight =
          failCall !== undefined && scoreCall("present", failCall) === "right";
        const passRight =
          passCall !== undefined && scoreCall("absent", passCall) === "right";
        addRun(both, run, failRight && passRight);
      }
      pairRows.push([defect, condition, formatRunCounts(both)]);
    }
  }
  sections.push(
    `near pairs: both images right in the same run\n${formatTable(
      ["defect", "condition", "both right"],
      pairRows,
    )}`,
  );

  // Crowd-out: ranked findings not about the case's defect, and where the defect is raised.
  const crowdRows: string[][] = [];
  for (const kind of CASE_KINDS) {
    for (const condition of CONDITIONS) {
      const otherCounts: number[] = [];
      let unreadable = 0;
      const places: Record<WhereRaised, number> = {
        ranked: 0,
        smaller_things: 0,
        elsewhere: 0,
        not_raised: 0,
      };
      for (const entry of entries.filter((item) => item.kind === kind)) {
        for (const judged of resultsOf(entry, condition).runs) {
          places[judged.detection.where_raised] += 1;
          if (judged.rankedCount === undefined) {
            unreadable += 1;
            continue;
          }
          // One ranked finding at most is taken to be about the defect.
          const aboutDefect =
            judged.detection.where_raised === "ranked" ? 1 : 0;
          otherCounts.push(Math.max(judged.rankedCount - aboutDefect, 0));
        }
      }
      const meanOther =
        otherCounts.length === 0
          ? "-"
          : roundText(
              otherCounts.reduce((sum, count) => sum + count, 0) /
                otherCounts.length,
            );
      crowdRows.push([
        kind,
        condition,
        meanOther,
        String(places.ranked),
        String(places.smaller_things),
        String(places.elsewhere),
        String(places.not_raised),
        String(unreadable),
      ]);
    }
  }
  sections.push(
    `crowd-out: mean ranked findings not about the case's defect, and where the crit raises the defect (counts of crits)\n${formatTable(
      [
        "kind",
        "condition",
        "other ranked",
        "ranked",
        "smaller things",
        "elsewhere",
        "not raised",
        "list unreadable",
      ],
      crowdRows,
    )}`,
  );

  // Stated numbers against the measured value, for cases measured from the facts file.
  const numberRows: string[][] = [];
  for (const kind of CASE_KINDS) {
    for (const condition of CONDITIONS) {
      let crits = 0;
      const errors: number[] = [];
      for (const entry of entries.filter(
        (item) => item.kind === kind && hasNumberTruth(item),
      )) {
        for (const judged of resultsOf(entry, condition).runs) {
          crits += 1;
          if (judged.number?.states_number === true) {
            errors.push(Math.abs(judged.number.value - entry.measured_value));
          }
        }
      }
      numberRows.push([
        kind,
        condition,
        `${errors.length}/${crits}`,
        errors.length === 0 ? "-" : roundText(median(errors)),
        errors.length === 0 ? "-" : roundText(Math.max(...errors)),
      ]);
    }
  }
  sections.push(
    `numbers the crits state for the measured quantity (cases measured from the facts file)\n${formatTable(
      [
        "kind",
        "condition",
        "crits stating one",
        "median error",
        "largest error",
      ],
      numberRows,
    )}`,
  );

  // One row per image.
  const imageRows: string[][] = [];
  for (const entry of entries) {
    const row = [entry.id, roundText(entry.measured_value), entry.expected];
    for (const condition of CONDITIONS) {
      const runs = resultsOf(entry, condition).runs;
      row.push(
        runs
          .map((judged) => callLetter(judged.detection.says_defect))
          .join(" "),
      );
    }
    for (const condition of CONDITIONS) {
      const runs = resultsOf(entry, condition).runs;
      row.push(
        runs
          .map((judged) =>
            judged.number?.states_number === true
              ? roundText(judged.number.value)
              : "-",
          )
          .join(" "),
      );
    }
    imageRows.push(row);
  }
  sections.push(
    `per image: calls by run (P present, A absent, U uncertain, N not mentioned) and stated numbers\n${formatTable(
      [
        "image",
        "measured",
        "expected",
        "image calls",
        "facts calls",
        "image numbers",
        "facts numbers",
      ],
      imageRows,
    )}`,
  );
  return `${sections.join("\n\n")}\n`;
}

/** Where the manifest and runs are, which skill to use, how to start `claude`, and where to print progress. */
export type ThresholdsOptions = {
  readonly repositoryDirectory: string;
  readonly runsDirectory: string;
  readonly skillDirectory: string;
  readonly runClaude: ClaudeRunner;
  /** Receives the plan and each failed critic run. main passes a stderr writer; tests may omit it. */
  readonly reportProgress?: (line: string) => void;
};

/** What the command prints on stdout and stderr, and its exit code. */
export type ThresholdsOutput = {
  readonly text: string;
  readonly errorText: string;
  readonly exitCode: number;
};

const HELP_TEXT = `Threshold evaluation (crit-576.13): does the measured facts file, with its violations list,
change the critic's call where a number and the eye disagree?

Usage:
  node evals/critic/thresholds.ts [--replay] [--skill DIR] [--skill-commit SHA]
  node evals/critic/thresholds.ts --help

It reads evals/critic/thresholds/manifest.json. For each image it makes sure there are
${RUNS_PER_IMAGE} crits with the image alone and ${RUNS_PER_IMAGE} with the image and its facts file. For each crit it
asks the judge whether the crit calls the case's defect present, absent, uncertain, or does not
mention it, and where it raises it; and, for cases measured from the facts file, which number it
states. Without --replay it runs at most ${MAX_PARALLEL_CALLS} critic runs or judge calls at once and asks a
model; never run it in npm run ci. A critic run that fails is counted and named on stderr, and
the other runs go on.

Flags:
  --replay              Read saved crits and judge answers only. Starts no child process.
  --skill DIR           The skill folder (default plugin/skills/design-critic).
  --skill-commit SHA    Use the runs of this commit instead of the skill folder's commit.
  --help, -h            Print this help.

A crit is right on an image that should have the defect when it says present, and right on an
image that should not when it says absent or does not mention it. Uncertain is counted on its
own. Each cell is hits/total, then the count of each run in brackets.

Exit codes: 0 the full report printed, 2 could not run or something is missing. There is no floor.
`;

/** Parses the command line, runs or replays the evaluation, and returns the output and exit code. */
export async function runThresholds(
  argv: readonly string[],
  options: ThresholdsOptions,
): Promise<ThresholdsOutput> {
  const parsed = parseArgs({
    args: [...argv],
    options: {
      replay: { type: "boolean", default: false },
      skill: { type: "string" },
      "skill-commit": { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
    allowPositionals: false,
  });
  if (parsed.values.help === true) {
    return { text: HELP_TEXT, errorText: "", exitCode: 0 };
  }
  const replay = parsed.values.replay === true;
  const skillDirectory = resolve(parsed.values.skill ?? options.skillDirectory);
  // A replay may read runs of a skill folder with uncommitted changes; a live run may not.
  // ?? gives the right side only when --skill-commit is not given.
  const commit =
    parsed.values["skill-commit"] ?? skillCommit(skillDirectory, replay);
  const entries = readManifest(options.repositoryDirectory);

  // Every image in every condition, with its request and request key.
  const items: {
    entry: ManifestEntry;
    condition: Condition;
    request: CritRequest;
    key: string;
  }[] = [];
  for (const condition of CONDITIONS) {
    for (const entry of entries) {
      const request = critRequestFor(
        options.repositoryDirectory,
        entry,
        condition,
      );
      items.push({ entry, condition, request, key: requestKeyOf(request) });
    }
  }
  const savedCritsOf = (item: (typeof items)[number]): SavedCrit[] =>
    readSavedCrits(
      options.runsDirectory,
      commit,
      item.key,
      currentRunIdentity(item.condition === "facts"),
    ).slice(0, RUNS_PER_IMAGE);

  const failedRuns: string[] = [];
  if (!replay) {
    let critsToMake = 0;
    for (const item of items) {
      critsToMake += RUNS_PER_IMAGE - savedCritsOf(item).length;
    }
    options.reportProgress?.(
      `plan: ${items.length} image and condition pairs, ${critsToMake} critic runs to make, then up to 2 judge questions per crit, at most ${MAX_PARALLEL_CALLS} at once`,
    );
    const criticOptions = {
      runsDirectory: options.runsDirectory,
      skillDirectory,
      skillCommit: commit,
      runClaude: options.runClaude,
    };
    // A failed run (a refusal, a usage limit) is recorded and the other runs go on; the run is
    // then missing, so the report exits 2 and a later live run tries it again.
    await runPooled(items, MAX_PARALLEL_CALLS, async (item) => {
      try {
        await ensureCrits(item.request, criticOptions, RUNS_PER_IMAGE);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const line = `critic run failed: ${item.entry.id} with ${item.condition}: ${message.slice(0, 300)}`;
        failedRuns.push(line);
        options.reportProgress?.(line);
      }
    });
  }

  // The judge questions of every saved crit, in item and run order.
  const missing: string[] = [];
  const questions: {
    itemIndex: number;
    saved: SavedCrit;
    detection: JudgeQuestion;
    number: JudgeQuestion | undefined;
  }[] = [];
  items.forEach((item, itemIndex) => {
    const saved = savedCritsOf(item);
    if (saved.length < RUNS_PER_IMAGE) {
      missing.push(
        `missing crits: ${item.entry.id} with ${item.condition}, ${saved.length} of ${RUNS_PER_IMAGE} at skill commit ${commit}`,
      );
    }
    const defect = DEFECTS[item.entry.defect];
    for (const crit of saved) {
      questions.push({
        itemIndex,
        saved: crit,
        detection: buildThresholdDetectionQuestion(defect, item.key, crit),
        number: hasNumberTruth(item.entry)
          ? buildNumberQuestion(defect, item.key, crit)
          : undefined,
      });
    }
  });

  const judgeOptions = {
    runsDirectory: options.runsDirectory,
    skillCommit: commit,
    runClaude: options.runClaude,
  };
  const answerOf = async (
    question: (typeof questions)[number],
  ): Promise<JudgedCrit | undefined> => {
    const rankedCount = countRanked(question.saved.crit);
    if (replay) {
      const detection = readJudgeAnswer(
        question.detection,
        parseThresholdDetectionAnswer,
        options.runsDirectory,
        commit,
      );
      const number =
        question.number === undefined
          ? undefined
          : readJudgeAnswer(
              question.number,
              parseNumberAnswer,
              options.runsDirectory,
              commit,
            );
      if (detection === undefined) {
        return undefined;
      }
      if (question.number !== undefined && number === undefined) {
        return undefined;
      }
      return { detection, number, rankedCount };
    }
    const detection = await ensureJudgeAnswer(
      question.detection,
      parseThresholdDetectionAnswer,
      judgeOptions,
    );
    const number =
      question.number === undefined
        ? undefined
        : await ensureJudgeAnswer(
            question.number,
            parseNumberAnswer,
            judgeOptions,
          );
    return { detection, number, rankedCount };
  };
  const judged = await runPooled(questions, MAX_PARALLEL_CALLS, answerOf);

  const runsByItem: JudgedCrit[][] = items.map(() => []);
  questions.forEach((question, index) => {
    const answer = judged[index];
    const item = items[question.itemIndex];
    if (answer === undefined) {
      missing.push(
        `missing judge answer: ${item?.entry.id} with ${item?.condition}, run ${question.saved.runNumber}`,
      );
      return;
    }
    runsByItem[question.itemIndex]?.push(answer);
  });

  const header = `skill commit ${commit}, judge model ${JUDGE_MODEL}, ${RUNS_PER_IMAGE} runs per image and condition, ${entries.length} images`;
  if (missing.length > 0) {
    const errorLines = [...failedRuns, ...missing];
    if (replay) {
      errorLines.push(
        "Run node evals/critic/thresholds.ts without --replay to make them; it asks a model.",
      );
    }
    return {
      text: `${header}\n`,
      errorText: `${errorLines.join("\n")}\n`,
      exitCode: EXIT_CODE_COULD_NOT_RUN,
    };
  }
  const results = new Map<string, ImageResults>();
  items.forEach((item, index) => {
    results.set(`${item.condition}|${item.entry.id}`, {
      entry: item.entry,
      condition: item.condition,
      runs: runsByItem[index] ?? [],
    });
  });
  const report = buildReport(entries, results);
  const failedText = failedRuns.length > 0 ? `${failedRuns.join("\n")}\n` : "";
  return {
    text: `${header}\n\n${report}`,
    errorText: failedText,
    exitCode: 0,
  };
}

/** Runs the command, writes its output, and sets the exit code: 2 when anything stopped the run. */
export async function main(): Promise<void> {
  try {
    const output = await runThresholds(process.argv.slice(2), {
      repositoryDirectory: REPOSITORY_DIRECTORY,
      runsDirectory: join(import.meta.dirname, "runs"),
      skillDirectory: join(
        REPOSITORY_DIRECTORY,
        "plugin",
        "skills",
        "design-critic",
      ),
      runClaude: runClaudeProcess,
      reportProgress: (line) => {
        process.stderr.write(`${line}\n`);
      },
    });
    process.stdout.write(output.text);
    process.stderr.write(output.errorText);
    process.exitCode = output.exitCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`thresholds stopped: ${message}\n`);
    process.exitCode = EXIT_CODE_COULD_NOT_RUN;
  }
}

// Run only when node starts this file, not when a test imports it.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
