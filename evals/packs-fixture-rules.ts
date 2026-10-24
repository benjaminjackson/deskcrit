// The fixture rules of PRD FR-54 that a program can check from the committed files alone
// (crit-q25.4, EV-3). It reads each pack's pack.yaml and fixtures/ folder: the size of every
// fixture file, and one entry in fixtures/ATTRIBUTION.md per fixture image with a rights basis
// from the closed list of four. It is a durable check (CS-21, AC-6), so it reads files only and
// imports nothing from src/. packs/README.md defines the ATTRIBUTION.md entry format.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

/** The largest size of one fixture file, in bytes (FR-54: at most 2 MB). */
export const MAX_FIXTURE_FILE_BYTES = 2 * 1024 * 1024;

/** The file extensions, in lower case, of the fixture files that are images and so need an entry. */
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

/** The nine labels of an ATTRIBUTION.md entry, in the order that packs/README.md sets. */
export const ATTRIBUTION_LABELS = [
  "Rights basis",
  "Source",
  "License",
  "Attribution text",
  "Source URL",
  "Capture date",
  "Viewport",
  "Device scale factor",
  "Browser version",
] as const;

/** One label of an ATTRIBUTION.md entry. */
export type AttributionLabel = (typeof ATTRIBUTION_LABELS)[number];

/** The four rights bases that FR-54 accepts, as short names. */
export type RightsBasis =
  | "own-work"
  | "public-domain"
  | "open-license"
  | "written-permission";

/** The exact rights basis strings of packs/README.md and FR-54, keyed by their short names. */
const RIGHTS_BASIS_TEXTS: Record<RightsBasis, string> = {
  "own-work": "own work licensed under the pack license",
  "public-domain": "public domain with the source named",
  "open-license": "open license that permits redistribution and commercial use",
  "written-permission":
    "written permission from the owner attached to the pull request",
};

/**
 * The licenses that the open-license basis accepts (FR-54), each optionally followed by a version
 * such as "4.0" or "v3.0". "CC BY-NC" does not match "CC BY", because a version must follow a space.
 */
const OPEN_LICENSE_PATTERN =
  /^(CC0|CC BY|CC BY-SA|Open Government Licence|MIT|Apache)( v?\d+(\.\d+)*)?$/;

/** A pull request URL on GitHub, where a written permission is attached (FR-54). */
const PULL_REQUEST_URL_PATTERN =
  /^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/\d+$/;

/** One parsed `## <file>` entry of ATTRIBUTION.md, with the labels it has and what is wrong with its shape. */
export type AttributionEntry = {
  readonly file: string;
  readonly fields: Partial<Record<AttributionLabel, string>>;
  readonly problems: readonly string[];
};

/** A parsed ATTRIBUTION.md: the `Pack license:` value, when the line exists, and the entries. */
export type AttributionFile = {
  readonly packLicense?: string;
  readonly entries: readonly AttributionEntry[];
};

/** One broken fixture rule: the pack folder, the file it is about, and a message that names both. */
export type FixtureProblem = {
  readonly pack: string;
  readonly file: string;
  readonly message: string;
};

/** Compares two strings by code unit, the explicit comparator that CS-18 asks for in place of localeCompare. */
function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

/** Lists the folder names directly under packsRoot, sorted, without node_modules. */
function listSubfolders(packsRoot: string): string[] {
  const folderNames: string[] = [];
  for (const entry of readdirSync(packsRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === "node_modules") {
      continue;
    }
    folderNames.push(entry.name);
  }
  return folderNames.sort(compareText);
}

/** Lists the sorted names of the folders under packsRoot that hold a pack.yaml, the packs that CI validates (FR-53). */
export function listPackDirectories(packsRoot: string): string[] {
  const packNames: string[] = [];
  for (const folderName of listSubfolders(packsRoot)) {
    if (existsSync(join(packsRoot, folderName, "pack.yaml"))) {
      packNames.push(folderName);
    }
  }
  return packNames;
}

/**
 * Lists the sorted names of the folders under packsRoot that hold a fixtures/ folder, including
 * folders whose name starts with "_", because the worked example and the EV-7 fixtures follow FR-54 too.
 */
export function listFixtureFolders(packsRoot: string): string[] {
  const folderNames: string[] = [];
  for (const folderName of listSubfolders(packsRoot)) {
    const fixturesPath = join(packsRoot, folderName, "fixtures");
    if (existsSync(fixturesPath) && statSync(fixturesPath).isDirectory()) {
      folderNames.push(folderName);
    }
  }
  return folderNames;
}

/** Tells whether text is one of the nine entry labels, so a parsed label can be stored under its type. */
function isAttributionLabel(text: string): text is AttributionLabel {
  for (const label of ATTRIBUTION_LABELS) {
    if (label === text) {
      return true;
    }
  }
  return false;
}

/**
 * Checks the labels an entry has against the nine labels of packs/README.md, in order, and returns
 * one problem per missing, unknown, repeated, or out-of-order label (FR-54).
 */
function findLabelProblems(foundLabels: readonly string[]): string[] {
  const problems: string[] = [];
  const knownLabels: AttributionLabel[] = [];
  for (const label of foundLabels) {
    if (!isAttributionLabel(label)) {
      problems.push(`has the unknown label "${label}"`);
      continue;
    }
    if (knownLabels.includes(label)) {
      problems.push(`has the label "${label}" more than once`);
      continue;
    }
    knownLabels.push(label);
  }
  const missingLabels: AttributionLabel[] = [];
  for (const label of ATTRIBUTION_LABELS) {
    if (!knownLabels.includes(label)) {
      missingLabels.push(label);
    }
  }
  for (const label of missingLabels) {
    problems.push(`has no "${label}" line`);
  }
  if (missingLabels.length === 0) {
    for (let index = 0; index < ATTRIBUTION_LABELS.length; index += 1) {
      if (knownLabels[index] !== ATTRIBUTION_LABELS[index]) {
        problems.push(
          `has its labels out of order; the order is ${ATTRIBUTION_LABELS.join(", ")}`,
        );
        break;
      }
    }
  }
  return problems;
}

/**
 * Parses the text of a fixtures/ATTRIBUTION.md: the `Pack license:` line and each `## <file>`
 * entry with its `- Label: value` lines (FR-54, packs/README.md). A missing, unknown, or
 * out-of-order label becomes a problem on the entry and never throws, so one bad entry does not
 * hide the others.
 */
export function parseAttributionFile(markdownText: string): AttributionFile {
  let packLicense: string | undefined;
  const entries: AttributionEntry[] = [];
  let currentFile: string | undefined;
  let currentFields: Partial<Record<AttributionLabel, string>> = {};
  let currentLabels: string[] = [];

  /** Closes the entry that is being read, if any, and adds it to the list. */
  function finishEntry(): void {
    if (currentFile === undefined) {
      return;
    }
    entries.push({
      file: currentFile,
      fields: currentFields,
      problems: findLabelProblems(currentLabels),
    });
  }

  for (const line of markdownText.split("\n")) {
    const trimmedLine = line.trimEnd();
    const headingMatch = /^## (.+)$/.exec(trimmedLine);
    if (headingMatch?.[1] !== undefined) {
      finishEntry();
      currentFile = headingMatch[1].trim();
      currentFields = {};
      currentLabels = [];
      continue;
    }
    if (currentFile === undefined) {
      const licenseMatch = /^Pack license:(.*)$/.exec(trimmedLine);
      if (licenseMatch?.[1] !== undefined && packLicense === undefined) {
        packLicense = licenseMatch[1].trim();
      }
      continue;
    }
    // A label line is "- Label: value"; the value may be empty, which the value checks report.
    const labelMatch = /^- ([^:]+):(.*)$/.exec(trimmedLine);
    if (labelMatch?.[1] === undefined || labelMatch[2] === undefined) {
      continue;
    }
    const label = labelMatch[1].trim();
    currentLabels.push(label);
    if (isAttributionLabel(label) && currentFields[label] === undefined) {
      currentFields[label] = labelMatch[2].trim();
    }
  }
  finishEntry();

  if (packLicense === undefined) {
    return { entries };
  }
  return { packLicense, entries };
}

/** Maps the exact rights basis text of an entry to its short name, or undefined when it is not one of the four (FR-54). */
export function readRightsBasis(text: string): RightsBasis | undefined {
  for (const [basis, basisText] of Object.entries(RIGHTS_BASIS_TEXTS)) {
    if (basisText === text && isRightsBasis(basis)) {
      return basis;
    }
  }
  return undefined;
}

/** Tells whether text is one of the four short rights basis names, so Object.entries keys keep their type. */
function isRightsBasis(text: string): text is RightsBasis {
  return (
    text === "own-work" ||
    text === "public-domain" ||
    text === "open-license" ||
    text === "written-permission"
  );
}

/** Tells whether a value is empty or one of the words that mean "nothing here". */
function isBlank(value: string): boolean {
  const lowerValue = value.toLowerCase();
  return (
    lowerValue === "" ||
    lowerValue === "none" ||
    lowerValue === "not applicable"
  );
}

/**
 * Returns the name of the non-commercial or no-derivatives term in a license or basis text, or
 * undefined. FR-54 refuses both terms whatever the rights basis says.
 */
function findRefusedLicenseTerm(text: string): string | undefined {
  if (
    /(^|[^A-Za-z])NC([^A-Za-z]|$)/.test(text) ||
    /noncommercial|non-commercial/i.test(text)
  ) {
    return "NC (non-commercial)";
  }
  if (
    /(^|[^A-Za-z])ND([^A-Za-z]|$)/.test(text) ||
    /noderivatives|no-derivatives/i.test(text)
  ) {
    return "ND (no derivatives)";
  }
  return undefined;
}

/** Escapes the characters that have a meaning in a regular expression, so a folder name matches only itself. */
function escapeForPattern(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Lists every file under a folder, as paths relative to it with "/" between parts, sorted. */
function listFilesUnder(folderPath: string, prefix: string): string[] {
  const filePaths: string[] = [];
  for (const entry of readdirSync(folderPath, { withFileTypes: true })) {
    const relativePath = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      for (const nestedPath of listFilesUnder(
        join(folderPath, entry.name),
        relativePath,
      )) {
        filePaths.push(nestedPath);
      }
      continue;
    }
    filePaths.push(relativePath);
  }
  return filePaths.sort(compareText);
}

/** Tells whether a fixture file is an image, by its extension, so it needs an ATTRIBUTION.md entry. */
function isImageFile(filePath: string): boolean {
  const lowerPath = filePath.toLowerCase();
  for (const extension of IMAGE_EXTENSIONS) {
    if (lowerPath.endsWith(extension)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks the rights basis and license of one entry against FR-54: fair use, fair dealing, and the
 * NC and ND terms are refused by name, any other unknown basis is refused with the list of four,
 * and each of the four bases has its own requirement.
 */
function findRightsProblems(
  entry: AttributionEntry,
  packLicense: string | undefined,
): string[] {
  const problems: string[] = [];
  const basisText = entry.fields["Rights basis"];
  if (basisText === undefined) {
    return problems;
  }
  const license = entry.fields.License ?? "";
  const lowerBasis = basisText.toLowerCase();
  if (lowerBasis.includes("fair use")) {
    problems.push(
      "claims fair use, which FR-54 does not accept as a rights basis",
    );
    return problems;
  }
  if (lowerBasis.includes("fair dealing")) {
    problems.push(
      "claims fair dealing, which FR-54 does not accept as a rights basis",
    );
    return problems;
  }
  const refusedTerm =
    findRefusedLicenseTerm(license) ?? findRefusedLicenseTerm(basisText);
  if (refusedTerm !== undefined) {
    problems.push(
      `has the license "${license}" with the ${refusedTerm} term, which FR-54 refuses`,
    );
    return problems;
  }
  const basis = readRightsBasis(basisText);
  if (basis === undefined) {
    const allowedTexts = Object.values(RIGHTS_BASIS_TEXTS).map(
      (text) => `"${text}"`,
    );
    problems.push(
      `has the rights basis "${basisText}", which is not one of ${allowedTexts.join(", ")}`,
    );
    return problems;
  }
  const source = entry.fields.Source ?? "";
  switch (basis) {
    case "own-work": {
      if (packLicense !== undefined && license !== packLicense) {
        problems.push(
          `is own work with the license "${license}", which differs from the pack license "${packLicense}"`,
        );
      }
      break;
    }
    case "public-domain": {
      if (isBlank(source)) {
        problems.push(
          "is public domain but its Source does not name the source",
        );
      }
      break;
    }
    case "open-license": {
      if (!OPEN_LICENSE_PATTERN.test(license)) {
        problems.push(
          `has the open license "${license}", which is not CC0, CC BY, CC BY-SA, Open Government Licence, MIT, or Apache`,
        );
      }
      const attributionText = entry.fields["Attribution text"];
      if (attributionText !== undefined && isBlank(attributionText)) {
        problems.push("has an open license but no attribution text");
      }
      break;
    }
    case "written-permission": {
      if (!PULL_REQUEST_URL_PATTERN.test(source)) {
        problems.push(
          `has written permission but its Source "${source}" is not a pull request URL such as https://github.com/<owner>/<repo>/pull/<n>`,
        );
      }
      break;
    }
    default: {
      // TypeScript narrows basis to never here, so a fifth basis added to the type fails the type check (CS-9).
      const unhandledBasis: never = basis;
      throw new Error(`unhandled rights basis ${String(unhandledBasis)}`);
    }
  }
  return problems;
}

/**
 * Checks the capture details of one entry (FR-54). An entry whose Source is a template of this
 * folder is a rendered fixture and needs the viewport, device scale factor, and browser version.
 * Any other entry is a live capture and also needs an http(s) Source URL and a YYYY-MM-DD capture date.
 * A label that is missing is already reported by the parser, so it is skipped here.
 */
function findCaptureProblems(
  entry: AttributionEntry,
  folderName: string,
): string[] {
  const problems: string[] = [];
  const renderedSourcePattern = new RegExp(
    `^packs/${escapeForPattern(folderName)}/templates/[^\\s,]+\\.html, defect=(on|off)$`,
  );
  const source = entry.fields.Source;
  const isRendered = source !== undefined && renderedSourcePattern.test(source);
  if (source !== undefined && !isRendered) {
    const sourceUrl = entry.fields["Source URL"];
    if (sourceUrl !== undefined && !/^https?:\/\/\S+$/.test(sourceUrl)) {
      problems.push(
        `is a live capture but its Source URL "${sourceUrl}" is not an http or https URL`,
      );
    }
    const captureDate = entry.fields["Capture date"];
    if (captureDate !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(captureDate)) {
      problems.push(
        `is a live capture but its Capture date "${captureDate}" is not in the form YYYY-MM-DD`,
      );
    }
  }
  const viewport = entry.fields.Viewport;
  if (viewport !== undefined && !/^\d+x\d+$/.test(viewport)) {
    problems.push(
      `has the Viewport "${viewport}", which is not in the form <width>x<height>`,
    );
  }
  const scaleFactor = entry.fields["Device scale factor"];
  if (scaleFactor !== undefined && !/^\d+(\.\d+)?$/.test(scaleFactor)) {
    problems.push(
      `has the Device scale factor "${scaleFactor}", which is not a number`,
    );
  }
  const browserVersion = entry.fields["Browser version"];
  if (browserVersion !== undefined && isBlank(browserVersion)) {
    problems.push("has no browser version");
  }
  return problems;
}

/**
 * Reads the license field of a pack.yaml and returns it, or a problem text. The YAML enters as
 * unknown (CS-7) and is parsed with the YAML 1.2 core schema and no duplicate keys (CS-4).
 */
function readPackYamlLicense(
  packYamlText: string,
): { license: string } | { problem: string } {
  let document: unknown;
  try {
    document = parse(packYamlText, { schema: "core", uniqueKeys: true });
  } catch {
    return { problem: "is not valid YAML" };
  }
  if (
    typeof document !== "object" ||
    document === null ||
    !("license" in document)
  ) {
    return { problem: "has no license field" };
  }
  const license: unknown = document.license;
  if (typeof license !== "string" || license.trim() === "") {
    return { problem: "has a license field that is not a non-empty string" };
  }
  return { license };
}

/**
 * Checks the FR-54 fixture rules of one folder under packsRoot and returns every broken rule,
 * sorted by message: each fixture file is at most 2 MB; each image has exactly one ATTRIBUTION.md
 * entry and each entry names an existing image; each entry has one of the four rights bases with
 * its requirement and the capture details; and the `Pack license:` line exists and equals the
 * license field of pack.yaml when the folder has one.
 *
 * It cannot check that an image shows no real face, no personal data, and no logged-in state, or
 * that a claimed permission or license is true. The blind review of FR-54 rule 4 covers those.
 */
export function checkPackFixtures(
  packsRoot: string,
  folderName: string,
): FixtureProblem[] {
  const problems: FixtureProblem[] = [];

  /** Adds one problem about a file under fixtures/, in the `<pack>/fixtures/<file>: <text> (FR-54)` form. */
  function addFixtureProblem(file: string, text: string): void {
    problems.push({
      pack: folderName,
      file,
      message: `${folderName}/fixtures/${file}: ${text} (FR-54)`,
    });
  }

  const fixturesPath = join(packsRoot, folderName, "fixtures");
  const fixtureFiles = existsSync(fixturesPath)
    ? listFilesUnder(fixturesPath, "")
    : [];
  const imageFiles: string[] = [];
  for (const file of fixtureFiles) {
    if (file === "ATTRIBUTION.md") {
      continue;
    }
    const sizeInBytes = statSync(join(fixturesPath, file)).size;
    if (sizeInBytes > MAX_FIXTURE_FILE_BYTES) {
      addFixtureProblem(
        file,
        `is ${sizeInBytes} bytes, over the limit of ${MAX_FIXTURE_FILE_BYTES} bytes (2 MB)`,
      );
    }
    if (isImageFile(file)) {
      imageFiles.push(file);
    }
  }

  const attributionPath = join(fixturesPath, "ATTRIBUTION.md");
  let attribution: AttributionFile = { entries: [] };
  if (existsSync(attributionPath)) {
    attribution = parseAttributionFile(readFileSync(attributionPath, "utf8"));
    if (
      attribution.packLicense === undefined ||
      attribution.packLicense === ""
    ) {
      addFixtureProblem("ATTRIBUTION.md", 'has no "Pack license:" line');
    }
  } else {
    addFixtureProblem("ATTRIBUTION.md", "is missing");
  }

  const entryCounts = new Map<string, number>();
  for (const entry of attribution.entries) {
    entryCounts.set(entry.file, (entryCounts.get(entry.file) ?? 0) + 1);
  }
  for (const file of imageFiles) {
    const entryCount = entryCounts.get(file) ?? 0;
    if (entryCount === 0) {
      addFixtureProblem(file, "has no entry in ATTRIBUTION.md");
    }
    if (entryCount > 1) {
      addFixtureProblem(
        file,
        `has ${entryCount} entries in ATTRIBUTION.md, and needs exactly one`,
      );
    }
  }

  for (const entry of attribution.entries) {
    if (!imageFiles.includes(entry.file)) {
      addFixtureProblem(
        entry.file,
        "has an entry in ATTRIBUTION.md but is not an image in fixtures/",
      );
    }
    for (const text of entry.problems) {
      addFixtureProblem(entry.file, `has an ATTRIBUTION.md entry that ${text}`);
    }
    for (const text of findRightsProblems(entry, attribution.packLicense)) {
      addFixtureProblem(entry.file, text);
    }
    for (const text of findCaptureProblems(entry, folderName)) {
      addFixtureProblem(entry.file, text);
    }
  }

  const packYamlPath = join(packsRoot, folderName, "pack.yaml");
  if (existsSync(packYamlPath)) {
    const result = readPackYamlLicense(readFileSync(packYamlPath, "utf8"));
    let packYamlProblem: string | undefined;
    if ("problem" in result) {
      packYamlProblem = result.problem;
    } else if (
      attribution.packLicense !== undefined &&
      result.license !== attribution.packLicense
    ) {
      packYamlProblem = `has the license "${result.license}", which differs from the "Pack license: ${attribution.packLicense}" line of fixtures/ATTRIBUTION.md`;
    }
    if (packYamlProblem !== undefined) {
      problems.push({
        pack: folderName,
        file: "pack.yaml",
        message: `${folderName}/pack.yaml: ${packYamlProblem} (FR-54)`,
      });
    }
  }

  return problems.sort((left, right) =>
    compareText(left.message, right.message),
  );
}
