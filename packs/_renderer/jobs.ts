// Pure helpers for the fixture renderer. Nothing here touches the file system,
// the network, or Playwright, so the unit tests run without a browser
// (OQ-17, CS-22). render.ts does all the input and output.

/** Which side of a fixture pair to render: "on" draws the defect, "off" does not (OQ-17). */
export type DefectSwitch = "on" | "off";

/** The viewport size, in CSS pixels, of every rendered fixture. */
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
};

/**
 * The fixture viewport. Both sides fall inside the 280 to 1568 pixel limit
 * (FR-7, JC-1), so prepare sends a fixture without resizing it, and the page is
 * never taller than the viewport, which keeps tall pages out (OQ-1).
 */
export const FIXTURE_VIEWPORT: Viewport = { width: 1280, height: 800 };

/** Device scale factor 1 keeps the PNG at 1280x800; 2 would make prepare downscale it (FR-8). */
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
 * Builds the two render jobs, positive then negative, for every criterion
 * template in a pack. Both jobs of a pair use the same template and differ only
 * in the defect switch (OQ-17).
 */
export function buildRenderJobs(
  packFolder: string,
  criterionIds: string[],
): RenderJob[] {
  const jobs: RenderJob[] = [];
  const defectValues: DefectSwitch[] = ["on", "off"];
  for (const criterionId of criterionIds) {
    for (const defect of defectValues) {
      jobs.push({
        templatePath: `${packFolder}/templates/${criterionId}.html`,
        defect,
        outputPath: `${packFolder}/fixtures/${fixtureFileName(criterionId, defect)}`,
        viewport: FIXTURE_VIEWPORT,
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
 * that packs/_renderer/README.md defines and crit-q25.4 parses (FR-54).
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
