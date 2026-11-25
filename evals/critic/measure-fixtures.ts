// Makes the measured facts file (PRD FR-79) of each image in the detection sample of the live
// criteria (EV-14), so `detect.ts --facts` can give the critic the facts of the page each image
// shows. For each image it reads the image's record in packs/<pack>/fixtures/rendered.json, serves
// packs/ over a local HTTP server, and runs measurePage from the skill's measure.mjs on
// `<template>?defect=on` or `?defect=off`, the same switch the fixture renderer sets (packs/README.md,
// packs/_renderer/base.js). It checks that the measured screenshot at the fixture's viewport has
// the same pixels as the committed fixture, so the facts describe exactly the page in the image,
// keeps only that viewport, and writes the result to evals/critic/facts/<pack>/<name>.facts.json.
//
// The facts file reaches the critic, so it must not name the fixture: `source` becomes the neutral
// `page.html`, and the template URL, which holds the criterion id and the defect switch, is dropped.
//
// It renders pages with the Playwright that packs/ pins, so `npm run ci` never runs it. Run
// `npm --prefix packs ci` and `npm --prefix packs run setup` first, then
// `node evals/critic/measure-fixtures.ts`. It writes every file again each time it runs; the
// committed files are what the saved runs used, and their hashes are in the saved run keys. They
// were written before measure.mjs wrote a violations list and its note, and keepFixtureViewport
// keeps both, so a rerun after crit-576.13 and crit-y75 adds the note and the list, which may hold
// short-last-line entries. The committed files stay as they are; do not commit a rerun.

import { createReadStream, existsSync, mkdirSync, mkdtempSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import {
  basename,
  dirname,
  extname,
  join,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  formatFactsJson,
  measurePage,
  VIEWPORTS,
} from "../../plugin/skills/design-critic/scripts/measure.mjs";
import { type FixtureImage, factsPathFor, selectCriteria } from "./detect.ts";
import { isRecord } from "./run-critic.ts";

const REPOSITORY_DIRECTORY = resolve(import.meta.dirname, "..", "..");
const PACKS_DIRECTORY = join(REPOSITORY_DIRECTORY, "packs");

/** The neutral source name written into every facts file, so no file names its fixture. */
export const NEUTRAL_SOURCE = "page.html";

/** The content types the local server sends; a font or stylesheet with the wrong type may not load. */
const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

/**
 * The images whose measured page differs from the committed fixture, each with the exact
 * difference that was looked at and accepted on 2026-11-23, and why the facts still describe the
 * image. Any other difference, or a change in one of these, stops the script.
 */
export const ACCEPTED_DIFFERENCES: Record<
  string,
  { difference: string; reason: string }
> = {
  "packs/accessibility/fixtures/chart-without-text.negative.png": {
    difference:
      "the page is 12 px taller than the fixture; in the top 800 px, no pixel differs",
    reason:
      "with the defect off the legend runs 12 px past the 800 px frame; the fixture renderer takes the viewport only, measure.mjs the full page",
  },
  "packs/accessibility/fixtures/error-without-text.positive.png": {
    difference:
      "15 pixels differ, inside the box from (470, 382) to (472, 421)",
    reason:
      "a 3 px wide strip on the left edge of one text field's border; no measured text size, color, or box changes",
  },
  "packs/accessibility/fixtures/error-without-text.negative.png": {
    difference:
      "15 pixels differ, inside the box from (470, 430) to (472, 469)",
    reason:
      "a 3 px wide strip on the left edge of one text field's border; no measured text size, color, or box changes",
  },
  "packs/accessibility/fixtures/field-label-placeholder-only.negative.png": {
    difference:
      "46 pixels differ, inside the box from (716, 216) to (718, 486)",
    reason:
      "a 3 px wide strip on the left edge of the text fields' borders; no measured text size, color, or box changes",
  },
};

/** The record of one fixture image in rendered.json: its template, defect switch, and viewport. */
export type RenderedRecord = {
  readonly fixture: string;
  readonly template: string;
  readonly defect: "on" | "off";
  readonly viewport: { readonly width: number; readonly height: number };
};

/** Reads packs/<pack>/fixtures/rendered.json and returns the record of one fixture file name. */
export function findRenderedRecord(
  renderedJson: unknown,
  fixtureName: string,
): RenderedRecord {
  if (!Array.isArray(renderedJson)) {
    throw new Error("rendered.json is not a list");
  }
  for (const entry of renderedJson) {
    if (!isRecord(entry) || entry.fixture !== fixtureName) {
      continue;
    }
    const viewport = entry.viewport;
    if (
      typeof entry.template !== "string" ||
      (entry.defect !== "on" && entry.defect !== "off") ||
      !isRecord(viewport) ||
      typeof viewport.width !== "number" ||
      typeof viewport.height !== "number"
    ) {
      throw new Error(
        `rendered.json has a malformed record for ${fixtureName}`,
      );
    }
    return {
      fixture: fixtureName,
      template: entry.template,
      defect: entry.defect,
      viewport: { width: viewport.width, height: viewport.height },
    };
  }
  throw new Error(`rendered.json has no record for ${fixtureName}`);
}

/**
 * Returns the facts for the critic: only the viewport whose size is the fixture's, the text of only
 * the selectors that viewport names, and the neutral source. It throws when no viewport, or more
 * than one, has the fixture's size, or when the measured page is not exactly that size.
 */
export function keepFixtureViewport(
  facts: Record<string, unknown>,
  viewport: { readonly width: number; readonly height: number },
): Record<string, unknown> {
  const viewports = facts.viewports;
  const texts = facts.texts;
  if (!Array.isArray(viewports) || !isRecord(texts)) {
    throw new Error("facts.json has no viewports list or texts map");
  }
  const matching = viewports.filter(
    (entry) =>
      isRecord(entry) &&
      entry.width === viewport.width &&
      entry.height === viewport.height,
  );
  const kept = matching[0];
  if (matching.length !== 1 || !isRecord(kept)) {
    throw new Error(
      `facts.json has ${matching.length} viewports of ${viewport.width}x${viewport.height}, not 1`,
    );
  }
  const pageHeight = kept.page_height;
  if (
    kept.page_width !== viewport.width ||
    typeof pageHeight !== "number" ||
    pageHeight < viewport.height
  ) {
    throw new Error(
      `the measured page is ${String(kept.page_width)}x${String(pageHeight)}, not the fixture's ${viewport.width}x${viewport.height}`,
    );
  }
  const notes = Array.isArray(facts.notes) ? [...facts.notes] : [];
  if (pageHeight > viewport.height) {
    notes.push(
      `the page is ${pageHeight} px tall; the image shows its top ${viewport.height} px`,
    );
  }
  const selectors = new Set<string>();
  for (const listName of ["text_blocks", "targets"]) {
    const list = kept[listName];
    if (!Array.isArray(list)) {
      continue;
    }
    for (const item of list) {
      if (isRecord(item) && typeof item.selector === "string") {
        selectors.add(item.selector);
      }
    }
  }
  const keptTexts: Record<string, unknown> = {};
  for (const [selector, text] of Object.entries(texts)) {
    if (selectors.has(selector)) {
      keptTexts[selector] = text;
    }
  }
  if (facts.final_url !== undefined) {
    throw new Error(
      "the browser was redirected; the facts would name the template URL",
    );
  }
  return {
    ...facts,
    source: NEUTRAL_SOURCE,
    notes,
    texts: keptTexts,
    viewports: [kept],
  };
}

/** Serves packs/ read-only on a free local port; any path outside packs/ gets 404. */
function startPacksServer(): Promise<Server> {
  const server = createServer((request, response) => {
    const requestPath = decodeURIComponent(
      new URL(request.url ?? "/", "http://localhost").pathname,
    );
    const filePath = join(PACKS_DIRECTORY, requestPath);
    const fromPacks = relative(PACKS_DIRECTORY, filePath);
    if (
      fromPacks.startsWith(`..${sep}`) ||
      fromPacks === ".." ||
      !existsSync(filePath)
    ) {
      response.writeHead(404);
      response.end();
      return;
    }
    response.writeHead(200, {
      "content-type":
        CONTENT_TYPES[extname(filePath)] ?? "application/octet-stream",
    });
    createReadStream(filePath).pipe(response);
  });
  return new Promise((resolveServer) => {
    server.listen(0, "127.0.0.1", () => resolveServer(server));
  });
}

/**
 * Compares two images as RGBA pixels and returns undefined when they are the same, or a few words
 * that say how they differ: the sizes, or how many pixels differ and the box around them.
 */
async function describePixelDifference(
  firstPath: string,
  secondPath: string,
): Promise<string | undefined> {
  const second = await sharp(secondPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const firstMetadata = await sharp(firstPath).metadata();
  let prefix = "";
  let firstImage = sharp(firstPath);
  // A full-page screenshot of a page taller than the viewport is taller than the fixture, which
  // shows only the viewport; compare the top of it, and say how much was cut.
  if (
    firstMetadata.width === second.info.width &&
    (firstMetadata.height ?? 0) > second.info.height
  ) {
    prefix = `the page is ${(firstMetadata.height ?? 0) - second.info.height} px taller than the fixture; in the top ${second.info.height} px, `;
    firstImage = firstImage.extract({
      left: 0,
      top: 0,
      width: second.info.width,
      height: second.info.height,
    });
  }
  const first = await firstImage
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const width = first.info.width;
  if (width !== second.info.width || first.info.height !== second.info.height) {
    return `size ${width}x${first.info.height}, fixture ${second.info.width}x${second.info.height}`;
  }
  let differing = 0;
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = 0;
  let bottom = 0;
  // Four bytes per pixel: red, green, blue, alpha.
  for (let offset = 0; offset < first.data.length; offset += 4) {
    if (first.data.readUInt32BE(offset) === second.data.readUInt32BE(offset)) {
      continue;
    }
    differing += 1;
    const pixelIndex = offset / 4;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
  }
  if (differing === 0) {
    return prefix === "" ? undefined : `${prefix}no pixel differs`;
  }
  return `${prefix}${differing} pixels differ, inside the box from (${left}, ${top}) to (${right}, ${bottom})`;
}

/** Measures one fixture image's page and writes its facts file; returns one line to print. */
async function measureFixture(
  image: FixtureImage,
  port: number,
): Promise<string> {
  const fixtureName = basename(image.absolutePath);
  const packDirectory = dirname(dirname(image.absolutePath));
  const record = findRenderedRecord(
    JSON.parse(
      await readFile(join(packDirectory, "fixtures", "rendered.json"), "utf8"),
    ),
    fixtureName,
  );
  const pageUrl = `http://127.0.0.1:${port}/${record.template}?defect=${record.defect}`;
  const outputFolder = mkdtempSync(join(tmpdir(), "crit-measure-fixture-"));
  try {
    // Render only the default viewport of the fixture's size, the one keepFixtureViewport keeps.
    const fixtureViewports = VIEWPORTS.filter(
      (viewport) =>
        viewport.width === record.viewport.width &&
        viewport.height === record.viewport.height,
    );
    await measurePage(pageUrl, outputFolder, PACKS_DIRECTORY, fixtureViewports);
    const facts = JSON.parse(
      await readFile(join(outputFolder, "facts.json"), "utf8"),
    );
    const kept = keepFixtureViewport(facts, record.viewport);
    const keptViewport = (kept.viewports as Record<string, unknown>[])[0];
    const screenshotName = String(keptViewport?.screenshot);
    const difference = await describePixelDifference(
      join(outputFolder, screenshotName),
      image.absolutePath,
    );
    const accepted = ACCEPTED_DIFFERENCES[image.displayPath];
    if (difference !== accepted?.difference) {
      throw new Error(
        `the measured page does not have the fixture's pixels: ${difference ?? "no pixel differs, but a difference was accepted"}`,
      );
    }
    const factsPath = factsPathFor(REPOSITORY_DIRECTORY, image);
    mkdirSync(dirname(factsPath), { recursive: true });
    await writeFile(factsPath, `${formatFactsJson(kept)}\n`);
    return `facts ${relative(REPOSITORY_DIRECTORY, factsPath)} (${record.template}, defect ${record.defect}, ${record.viewport.width}x${record.viewport.height}, ${difference === undefined ? "same pixels" : `accepted difference: ${difference}`})`;
  } finally {
    await rm(outputFolder, { recursive: true, force: true });
  }
}

/** Measures every image of the detection sample of the live criteria, one at a time. */
export async function main(): Promise<void> {
  const { selected } = selectCriteria(REPOSITORY_DIRECTORY, 1);
  const images: FixtureImage[] = [];
  for (const entry of selected) {
    if (entry.criterion.group !== "live") {
      continue;
    }
    for (const scoredImage of entry.scored) {
      images.push(scoredImage.image);
    }
  }
  const server = await startPacksServer();
  const port = (server.address() as AddressInfo).port;
  let failures = 0;
  try {
    for (const image of images) {
      try {
        process.stdout.write(`${await measureFixture(image, port)}\n`);
      } catch (error) {
        failures += 1;
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(
          `cannot measure ${image.displayPath}: ${message}\n`,
        );
      }
    }
  } finally {
    server.close();
  }
  process.stdout.write(
    `${images.length - failures} of ${images.length} images measured\n`,
  );
  process.exitCode = failures === 0 ? 0 : 2;
}

// Run only when node starts this file, not when a test imports it.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
