// Pure helpers for the fixture renderer. Nothing here touches the file system,
// the network, or Playwright, so the unit tests run without a browser
// (OQ-17, CS-22). render.ts does all the input and output.

import type { DefectEvidence } from "./defect.js";

/** Which side of a fixture pair to render: "on" draws the defect, "off" does not (OQ-17). */
export type DefectSwitch = "on" | "off";

/** The viewport size, in CSS pixels, of one rendered fixture. */
export type Viewport = { width: number; height: number };

/** What the renderer needs to make one PNG. Paths are relative to the packs/ folder. */
export type RenderJob = {
  templatePath: string;
  defect: DefectSwitch;
  outputPath: string;
  viewport: Viewport;
  deviceScaleFactor: number;
};

/** One line of fixtures/rendered.json: how one PNG was made, for regeneration and drift checks (FR-54). */
export type RenderRecord = {
  fixture: string;
  template: string;
  defect: DefectSwitch;
  png_sha256: string;
  source_sha256: Record<string, string>;
  viewport: Viewport;
  device_scale_factor: number;
  browser_version: string;
  /** The computed-style comparison and measurements that verify checks against the defect declaration (FR-54 rules 2 and 3). */
  defect_evidence?: DefectEvidence;
};

/**
 * The default fixture viewport, for a template with no crit-viewport meta tag.
 * Both sides fall inside the 280 to 1568 pixel limit (FR-7, JC-1), so prepare
 * sends a fixture without resizing it, and the page is never taller than the
 * viewport, which keeps tall pages out (OQ-1).
 */
export const FIXTURE_VIEWPORT: Viewport = { width: 1280, height: 800 };

/** The smallest and largest side, in pixels, that prepare accepts without resizing (FR-7). */
export const MINIMUM_VIEWPORT_SIDE = 280;
export const MAXIMUM_VIEWPORT_SIDE = 1568;

/** Device scale factor 1 keeps the PNG at the viewport size; 2 would make prepare downscale it (FR-8). */
export const FIXTURE_DEVICE_SCALE_FACTOR = 1;

/** The largest fixture file FR-54 allows: 2 MB, counted as 2 x 1024 x 1024 bytes. */
export const MAXIMUM_FIXTURE_BYTES = 2 * 1024 * 1024;

/** The rights basis line for a rendered template, word for word from FR-54's first basis. */
export const OWN_WORK_RIGHTS_BASIS = "own work licensed under the pack license";

/**
 * Compares two strings by their UTF-16 code units, so the order is the same on
 * every machine and never depends on the locale (CS-18).
 */
export function compareCodeUnits(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

/**
 * Picks the template files out of a folder listing and returns their criterion
 * ids in a fixed order, so every run renders the same list in the same order
 * (OQ-17, CS-18).
 */
export function listCriterionIds(templateFolderFileNames: string[]): string[] {
  const criterionIds: string[] = [];
  for (const fileName of templateFolderFileNames) {
    if (fileName.endsWith(".html")) {
      criterionIds.push(fileName.slice(0, -".html".length));
    }
  }
  criterionIds.sort(compareCodeUnits);
  return criterionIds;
}

/**
 * Names the fixture file for one side of a pair. The defect drawn ("on") is the
 * positive fixture, which must trigger the criterion, and "off" is the negative
 * fixture, which must not (FR-54, FR-50).
 */
export function fixtureFileName(
  criterionId: string,
  defect: DefectSwitch,
): string {
  if (defect === "on") {
    return `${criterionId}.positive.png`;
  }
  return `${criterionId}.negative.png`;
}

/**
 * Reads the viewport a template asks for from its
 * `<meta name="crit-viewport" content="<W>x<H>">` tag, so a template can draw a
 * phone screen as well as a desktop one. A template without the tag gets the
 * default 1280x800. It throws, naming the template, for a malformed size, a
 * side outside the 280 to 1568 pixel limit (FR-7), or a second tag, because a
 * guessed size would make a fixture that does not show what its author meant.
 */
export function parseTemplateViewport(
  html: string,
  templatePath: string,
): Viewport {
  // Comments are removed first, so a commented-out tag is not read.
  const htmlWithoutComments = html.replace(/<!--[\s\S]*?-->/g, "");
  // The g flag makes matchAll find every tag, so a duplicate can be refused.
  // The pattern accepts the two attributes in either order and either quote.
  // \s before "name" stops an attribute such as data-name= from matching.
  const metaTagPattern =
    /<meta\b[^>]*\sname\s*=\s*["']crit-viewport["'][^>]*>/gi;
  const metaTags = Array.from(htmlWithoutComments.matchAll(metaTagPattern));
  // Every mention of crit-viewport outside comments must be inside a tag the
  // pattern read. A mention it did not read, such as name=crit-viewport with
  // no quotes, is refused, because ignoring it would silently give 1280x800.
  const mentionCount = Array.from(
    htmlWithoutComments.matchAll(/crit-viewport/gi),
  ).length;
  if (mentionCount !== metaTags.length) {
    throw new Error(
      `${templatePath} mentions crit-viewport outside a well-formed <meta name="crit-viewport" content="<W>x<H>"> tag`,
    );
  }
  if (metaTags.length === 0) {
    return FIXTURE_VIEWPORT;
  }
  if (metaTags.length > 1) {
    throw new Error(
      `${templatePath} has ${metaTags.length} crit-viewport meta tags; it may have only one`,
    );
  }
  const metaTag = metaTags[0]?.[0] ?? "";
  const contentMatch = /\scontent\s*=\s*["']([^"']*)["']/i.exec(metaTag);
  const content = contentMatch?.[1] ?? "";
  const sizeMatch = /^([1-9][0-9]*)x([1-9][0-9]*)$/.exec(content.trim());
  if (sizeMatch === null) {
    throw new Error(
      `${templatePath} has crit-viewport content "${content}"; it must be <width>x<height> in whole pixels, such as 390x844`,
    );
  }
  const width = Number(sizeMatch[1]);
  const height = Number(sizeMatch[2]);
  for (const side of [width, height]) {
    if (side < MINIMUM_VIEWPORT_SIDE || side > MAXIMUM_VIEWPORT_SIDE) {
      throw new Error(
        `${templatePath} asks for a ${width}x${height} viewport; each side must be ${MINIMUM_VIEWPORT_SIDE} to ${MAXIMUM_VIEWPORT_SIDE} pixels (FR-7)`,
      );
    }
  }
  return { width, height };
}

/**
 * Builds the two render jobs, positive then negative, for every criterion
 * template in a pack. Both jobs of a pair use the same template and differ only
 * in the defect switch (OQ-17). viewportFor gives each template's viewport; by
 * default every template gets 1280x800.
 */
export function buildRenderJobs(
  packFolder: string,
  criterionIds: string[],
  viewportFor: (criterionId: string) => Viewport = () => FIXTURE_VIEWPORT,
): RenderJob[] {
  const jobs: RenderJob[] = [];
  const defectValues: DefectSwitch[] = ["on", "off"];
  for (const criterionId of criterionIds) {
    const viewport = viewportFor(criterionId);
    for (const defect of defectValues) {
      jobs.push({
        templatePath: `${packFolder}/templates/${criterionId}.html`,
        defect,
        outputPath: `${packFolder}/fixtures/${fixtureFileName(criterionId, defect)}`,
        viewport,
        deviceScaleFactor: FIXTURE_DEVICE_SCALE_FACTOR,
      });
    }
  }
  return jobs;
}

/**
 * Throws when a rendered PNG is over the FR-54 size limit. The message names the
 * file, so the person running the render knows which template to shrink (FR-54).
 */
export function checkFixtureSize(outputPath: string, byteCount: number): void {
  if (byteCount > MAXIMUM_FIXTURE_BYTES) {
    throw new Error(
      `${outputPath} is ${byteCount} bytes, over the ${MAXIMUM_FIXTURE_BYTES} byte limit for a fixture (FR-54)`,
    );
  }
}

/**
 * Lists the source files whose content decides how a template renders: the
 * template, its stylesheet when there is one, and the shared renderer files and
 * fonts. rendered.json stores a hash of each, so a changed source without a new
 * render can be found without a browser (OQ-17).
 */
export function listSourcePaths(
  templatePath: string,
  templateStylesheetExists: boolean,
  sharedRendererPaths: string[],
): string[] {
  const sourcePaths: string[] = [templatePath];
  if (templateStylesheetExists) {
    sourcePaths.push(stylesheetPathFor(templatePath));
  }
  for (const sharedPath of sharedRendererPaths) {
    sourcePaths.push(sharedPath);
  }
  sourcePaths.sort(compareCodeUnits);
  return sourcePaths;
}

/** Returns the path of a template's own stylesheet, which sits next to it with a .css extension (OQ-17). */
export function stylesheetPathFor(templatePath: string): string {
  return `${templatePath.slice(0, -".html".length)}.css`;
}

/**
 * Writes the fixtures/ATTRIBUTION.md entry for one rendered PNG, in the format
 * that packs/README.md defines and crit-q25.4 parses (FR-54).
 */
export function formatAttributionEntry(
  record: RenderRecord,
  packLicense: string,
): string {
  const lines = [
    `## ${record.fixture}`,
    "",
    `- Rights basis: ${OWN_WORK_RIGHTS_BASIS}`,
    `- Source: packs/${record.template}, defect=${record.defect}`,
    `- License: ${packLicense}`,
    "- Attribution text: none",
    "- Source URL: not applicable",
    "- Capture date: not applicable",
    `- Viewport: ${record.viewport.width}x${record.viewport.height}`,
    `- Device scale factor: ${record.device_scale_factor}`,
    `- Browser version: ${record.browser_version}`,
    "",
  ];
  return lines.join("\n");
}
