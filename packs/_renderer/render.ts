// The fixture renderer (OQ-17). It turns each criterion template under
// packs/<pack>/templates/ into a positive and a negative PNG under
// packs/<pack>/fixtures/. It is a development tool for pack authors: it lives
// in its own package under packs/, and nothing in the deskcrit package imports
// it, so crit keeps no browser dependency (NFR-3, NG-1, NG-8).
//
// Usage, from the repository root:
//   npm --prefix packs run render -- _example   renders and writes the PNGs
//   npm --prefix packs run check -- _example    renders and compares bytes with the committed PNGs
//   npm --prefix packs run verify -- _example   checks hashes in rendered.json, with no browser

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { type Browser, chromium, type Page } from "playwright";
import {
  buildRenderJobs,
  checkFixtureSize,
  compareCodeUnits,
  formatAttributionEntry,
  listCriterionIds,
  listSourcePaths,
  type RenderJob,
  type RenderRecord,
  stylesheetPathFor,
} from "./jobs.ts";

/** The packs/ folder. Every path in rendered.json and ATTRIBUTION.md is relative to it. */
const PACKS_FOLDER = dirname(dirname(fileURLToPath(import.meta.url)));

/** The shared files every template loads; a change to any of them changes every render (OQ-17). */
const SHARED_RENDERER_FOLDER = "_renderer";

/**
 * Lists the shared renderer files that a template can load: base.css, base.js,
 * and every font, in a fixed order (OQ-17, CS-18).
 */
function listSharedRendererPaths(): string[] {
  const sharedPaths = [
    `${SHARED_RENDERER_FOLDER}/base.css`,
    `${SHARED_RENDERER_FOLDER}/base.js`,
  ];
  const fontFileNames = readdirSync(
    join(PACKS_FOLDER, SHARED_RENDERER_FOLDER, "fonts"),
  );
  fontFileNames.sort(compareCodeUnits);
  for (const fontFileName of fontFileNames) {
    if (fontFileName.endsWith(".woff2")) {
      sharedPaths.push(`${SHARED_RENDERER_FOLDER}/fonts/${fontFileName}`);
    }
  }
  return sharedPaths;
}

/** Returns the hex SHA-256 of some bytes, used to record sources and PNGs in rendered.json (OQ-17). */
function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Hashes each source file that decides how a template renders, keyed by its path under packs/ (OQ-17). */
function hashSources(job: RenderJob): Record<string, string> {
  const templateStylesheetExists = existsSync(
    join(PACKS_FOLDER, stylesheetPathFor(job.templatePath)),
  );
  const sourcePaths = listSourcePaths(
    job.templatePath,
    templateStylesheetExists,
    listSharedRendererPaths(),
  );
  const sourceHashes: Record<string, string> = {};
  for (const sourcePath of sourcePaths) {
    sourceHashes[sourcePath] = hashBytes(
      readFileSync(join(PACKS_FOLDER, sourcePath)),
    );
  }
  return sourceHashes;
}

/**
 * Reads the pack license from the "Pack license:" line at the top of the pack's
 * fixtures/ATTRIBUTION.md, because every pack declares a license and every
 * rendered fixture is licensed under it (FR-54).
 */
function readPackLicense(packFolder: string): string {
  const attributionPath = join(
    PACKS_FOLDER,
    packFolder,
    "fixtures",
    "ATTRIBUTION.md",
  );
  if (!existsSync(attributionPath)) {
    throw new Error(
      `${attributionPath} is missing; it must start with a "Pack license:" line (FR-54)`,
    );
  }
  for (const line of readFileSync(attributionPath, "utf8").split("\n")) {
    if (line.startsWith("Pack license: ")) {
      return line.slice("Pack license: ".length).trim();
    }
  }
  throw new Error(`${attributionPath} has no "Pack license:" line (FR-54)`);
}

/**
 * Starts a headless Chromium with font hinting and subpixel text turned off,
 * so the same machine draws the same pixels on every run (OQ-17).
 */
async function launchBrowser(): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: ["--font-render-hinting=none", "--disable-lcd-text"],
  });
}

/**
 * Says whether a request URL is a file inside the packs/ folder of the
 * repository. Every other URL, including a file elsewhere on the disk such as
 * a system font, is refused, so a fixture depends only on files in the
 * repository (OQ-17, FR-54).
 */
function isFileInRepository(requestUrl: string): boolean {
  if (!requestUrl.startsWith("file://")) {
    return false;
  }
  const requestPath = fileURLToPath(requestUrl);
  const pathFromPacksFolder = relative(PACKS_FOLDER, requestPath);
  const leavesPacksFolder =
    pathFromPacksFolder === ".." || pathFromPacksFolder.startsWith(`..${sep}`);
  if (leavesPacksFolder || isAbsolute(pathFromPacksFolder)) {
    return false;
  }
  return true;
}

/**
 * Opens a page with every setting that can change the pixels fixed, and with
 * every request that is not a file in the repository refused. A refused request
 * is recorded so the render fails and names it (OQ-17, FR-54).
 */
async function openFixedPage(
  browser: Browser,
  job: RenderJob,
  refusedUrls: string[],
): Promise<Page> {
  const context = await browser.newContext({
    viewport: job.viewport,
    deviceScaleFactor: job.deviceScaleFactor,
    locale: "en-US",
    timezoneId: "UTC",
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  await context.route("**/*", async (route) => {
    const requestUrl = route.request().url();
    if (isFileInRepository(requestUrl)) {
      await route.continue();
    } else {
      refusedUrls.push(requestUrl);
      await route.abort();
    }
  });
  // context.route does not see WebSockets, so they need their own handler.
  // Closing the socket without connecting to the server sends nothing out.
  await context.routeWebSocket(/.*/, async (webSocketRoute) => {
    refusedUrls.push(webSocketRoute.url());
    await webSocketRoute.close();
  });
  return context.newPage();
}

/**
 * Fails when any element was drawn with a font installed on this machine
 * instead of a font file from the repository. A family name such as Arial
 * reaches a system font without any request, so the request guard cannot
 * catch it; Chromium's DevTools protocol reports the fonts each element
 * actually used (OQ-17, FR-54).
 */
async function checkOnlyRepositoryFontsDrawn(
  page: Page,
  job: RenderJob,
): Promise<void> {
  const session = await page.context().newCDPSession(page);
  await session.send("DOM.enable");
  await session.send("CSS.enable");
  const documentResult = await session.send("DOM.getDocument", {
    depth: -1,
    pierce: true,
  });
  const systemFontNames = new Set<string>();
  const nodesToVisit = [documentResult.root];
  while (nodesToVisit.length > 0) {
    const node = nodesToVisit.pop();
    if (node === undefined) {
      break;
    }
    // nodeType 1 is an element. Only elements can be asked which fonts they used.
    if (node.nodeType === 1) {
      const fontResult = await session.send("CSS.getPlatformFontsForNode", {
        nodeId: node.nodeId,
      });
      for (const fontUsage of fontResult.fonts) {
        if (!fontUsage.isCustomFont) {
          systemFontNames.add(fontUsage.familyName);
        }
      }
    }
    for (const childNode of node.children ?? []) {
      nodesToVisit.push(childNode);
    }
  }
  await session.detach();
  if (systemFontNames.size > 0) {
    const sortedNames = Array.from(systemFontNames).sort(compareCodeUnits);
    throw new Error(
      `${job.templatePath} drew text with fonts installed on this machine, not from the repository: ${sortedNames.join(", ")}`,
    );
  }
}

/**
 * Renders one template side to PNG bytes. It loads every declared font face
 * from the repository and fails if one does not load, so no system font can
 * stand in silently, and it fails if the page asked for anything off the disk
 * (OQ-17, FR-54).
 */
async function renderFixture(
  browser: Browser,
  job: RenderJob,
): Promise<Uint8Array> {
  const refusedUrls: string[] = [];
  const page = await openFixedPage(browser, job, refusedUrls);
  const templateUrl = pathToFileURL(join(PACKS_FOLDER, job.templatePath));
  templateUrl.searchParams.set("defect", job.defect);
  await page.goto(templateUrl.href, { waitUntil: "load" });
  // This function runs inside the page, not in Node. It asks the page to load
  // every @font-face it declares; the promise rejects if a font file is missing.
  try {
    await page.evaluate(async () => {
      const fontFaces = Array.from(document.fonts);
      await Promise.all(fontFaces.map((fontFace) => fontFace.load()));
      await document.fonts.ready;
    });
  } catch (fontError) {
    throw new Error(
      `${job.templatePath}: a declared font did not load from the repository (${String(fontError)})`,
    );
  }
  await checkOnlyRepositoryFontsDrawn(page, job);
  const pngBytes = await page.screenshot({
    animations: "disabled",
    caret: "hide",
    scale: "css",
  });
  await page.context().close();
  if (refusedUrls.length > 0) {
    throw new Error(
      `${job.templatePath} asked for files outside the repository: ${refusedUrls.join(", ")}`,
    );
  }
  return pngBytes;
}

/** Turns the command-line pack name into the jobs for every template in that pack, in sorted order (OQ-17, CS-18). */
function readPackJobs(packFolder: string): RenderJob[] {
  const templateFolderFileNames = readdirSync(
    join(PACKS_FOLDER, packFolder, "templates"),
  );
  const criterionIds = listCriterionIds(templateFolderFileNames);
  if (criterionIds.length === 0) {
    throw new Error(`${packFolder}/templates has no .html templates`);
  }
  return buildRenderJobs(packFolder, criterionIds);
}

/**
 * Renders every template of a pack on both sides, writes the PNGs and
 * fixtures/rendered.json, and prints one ATTRIBUTION.md entry per PNG for the
 * person to paste and review (OQ-17, FR-54, AC-5).
 */
async function renderPack(packFolder: string): Promise<void> {
  const packLicense = readPackLicense(packFolder);
  const jobs = readPackJobs(packFolder);
  const browser = await launchBrowser();
  const records: RenderRecord[] = [];
  try {
    for (const job of jobs) {
      const pngBytes = await renderFixture(browser, job);
      checkFixtureSize(job.outputPath, pngBytes.byteLength);
      writeFileSync(join(PACKS_FOLDER, job.outputPath), pngBytes);
      records.push({
        fixture: job.outputPath.slice(job.outputPath.lastIndexOf("/") + 1),
        template: job.templatePath,
        defect: job.defect,
        png_sha256: hashBytes(pngBytes),
        source_sha256: hashSources(job),
        viewport: job.viewport,
        device_scale_factor: job.deviceScaleFactor,
        browser_version: browser.version(),
      });
    }
  } finally {
    await browser.close();
  }
  const renderedJsonPath = join(
    PACKS_FOLDER,
    packFolder,
    "fixtures",
    "rendered.json",
  );
  writeFileSync(renderedJsonPath, `${JSON.stringify(records, null, 2)}\n`);
  for (const record of records) {
    process.stdout.write(`${formatAttributionEntry(record, packLicense)}\n`);
  }
}

/**
 * Renders every template again in memory and compares the bytes with the
 * committed PNGs. It only means something on the browser build that
 * rendered.json records, because other machines draw slightly different pixels
 * (OQ-17).
 */
async function checkPack(packFolder: string): Promise<boolean> {
  const jobs = readPackJobs(packFolder);
  const browser = await launchBrowser();
  let allMatch = true;
  try {
    for (const job of jobs) {
      const pngBytes = await renderFixture(browser, job);
      const committedBytes = readFileSync(join(PACKS_FOLDER, job.outputPath));
      if (Buffer.compare(Buffer.from(pngBytes), committedBytes) === 0) {
        process.stdout.write(`same bytes: ${job.outputPath}\n`);
      } else {
        process.stdout.write(`different bytes: ${job.outputPath}\n`);
        allMatch = false;
      }
    }
  } finally {
    await browser.close();
  }
  return allMatch;
}

/**
 * Reads rendered.json as a list of render records. The file is written only by
 * renderPack and reviewed by a person, so it is checked only for being a list.
 */
function readRenderRecords(packFolder: string): RenderRecord[] {
  const renderedJsonPath = join(
    PACKS_FOLDER,
    packFolder,
    "fixtures",
    "rendered.json",
  );
  const parsedValue: unknown = JSON.parse(
    readFileSync(renderedJsonPath, "utf8"),
  );
  if (!Array.isArray(parsedValue)) {
    throw new Error(`${renderedJsonPath} is not a list of render records`);
  }
  return parsedValue as RenderRecord[];
}

/**
 * Checks, with no browser, that every committed PNG and every source file still
 * has the hash rendered.json recorded. A mismatch means a template changed
 * without a new render, or a PNG was edited by hand (OQ-17).
 */
function verifyPack(packFolder: string): boolean {
  const records = readRenderRecords(packFolder);
  let allMatch = true;
  for (const record of records) {
    const pngPath = `${packFolder}/fixtures/${record.fixture}`;
    if (
      hashBytes(readFileSync(join(PACKS_FOLDER, pngPath))) !== record.png_sha256
    ) {
      process.stdout.write(`changed since render: ${pngPath}\n`);
      allMatch = false;
    }
    for (const [sourcePath, recordedHash] of Object.entries(
      record.source_sha256,
    )) {
      if (
        hashBytes(readFileSync(join(PACKS_FOLDER, sourcePath))) !== recordedHash
      ) {
        process.stdout.write(
          `changed since render: ${sourcePath} (used by ${record.fixture})\n`,
        );
        allMatch = false;
      }
    }
  }
  if (allMatch) {
    process.stdout.write(
      `all ${records.length} fixtures match rendered.json\n`,
    );
  }
  return allMatch;
}

/** Reads the mode and the pack folder from the command line, runs the mode, and sets the exit code. */
async function runRenderer(argumentList: string[]): Promise<void> {
  const mode = argumentList[0];
  const packFolder = argumentList[1];
  if (packFolder === undefined) {
    process.stderr.write(
      "usage: render.ts render|check|verify <pack folder under packs/>\n",
    );
    process.exitCode = 2;
    return;
  }
  if (mode === "render") {
    await renderPack(packFolder);
  } else if (mode === "check") {
    if (!(await checkPack(packFolder))) {
      process.exitCode = 1;
    }
  } else if (mode === "verify") {
    if (!verifyPack(packFolder)) {
      process.exitCode = 1;
    }
  } else {
    process.stderr.write(
      `unknown mode ${mode}; use render, check, or verify\n`,
    );
    process.exitCode = 2;
  }
}

await runRenderer(process.argv.slice(2));
