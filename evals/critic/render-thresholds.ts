// Renders the images and facts files of the threshold evaluation (crit-576.13) and writes
// evals/critic/thresholds/manifest.json. For each case in CASES of thresholds.ts it serves the
// repository over a local HTTP server, runs measurePage from the skill's measure.mjs on
// `<template>?--name=value`, which set-vars.js turns into CSS custom properties, and keeps the
// desktop viewport (1280 x 800) with keepFixtureViewport from measure-fixtures.ts, so the facts file
// names no template and no setting. The image is measure.mjs's own desktop screenshot, so the facts
// describe exactly the pixels the critic sees.
//
// For a case measured from the screenshot (text over a photo, where measure.mjs marks contrast not
// measurable), it renders the page again with the text hidden (--o1=0) and takes the median
// contrast between the text color and the pixels behind each text block that the facts mark not
// measurable.
//
// It refuses a case whose measured value falls outside its band or whose facts do not show what the
// case needs (checkFacts), and writes nothing then. It uses the Playwright that packs/ pins, so
// `npm run ci` never runs it. Run `npm --prefix packs ci` and `npm --prefix packs run setup` first,
// then `node evals/critic/render-thresholds.ts`. The committed files are what the saved runs used,
// and their hashes are in the saved run keys. A rerun after crit-y75 changes the violations note and
// may add short-last-line entries, so the committed files stay as they are; do not commit a rerun.

import { createReadStream, existsSync, mkdirSync, mkdtempSync } from "node:fs";
import { copyFile, readFile, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { extname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  contrastRatio,
  formatFactsJson,
  measurePage,
  parseCssColor,
  VIEWPORTS,
} from "../../plugin/skills/design-critic/scripts/measure.mjs";
import { keepFixtureViewport } from "./measure-fixtures.ts";
import {
  CASES,
  type CaseSpec,
  fileSha256,
  inBand,
  onlyViewport,
  THRESHOLDS_FOLDER,
} from "./thresholds.ts";

const REPOSITORY_DIRECTORY = resolve(import.meta.dirname, "..", "..");
const FOLDER = join(REPOSITORY_DIRECTORY, THRESHOLDS_FOLDER);
const VIEWPORT = { width: 1280, height: 800 };

/** The folders the local server may serve, relative to the repository root. */
const SERVED_FOLDERS = [
  join("evals", "critic", "thresholds", "pages"),
  join("packs", "_renderer"),
  join("packs", "art-direction", "photos"),
];

/** The content types the local server sends. */
const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".woff2": "font/woff2",
  ".jpg": "image/jpeg",
};

/** Serves the SERVED_FOLDERS of the repository read-only on a free local port; any other path gets 404. */
function startServer(): Promise<Server> {
  const server = createServer((request, response) => {
    const requestPath = decodeURIComponent(
      new URL(request.url ?? "/", "http://localhost").pathname,
    );
    const filePath = join(REPOSITORY_DIRECTORY, requestPath);
    const fromRoot = relative(REPOSITORY_DIRECTORY, filePath);
    const allowed = SERVED_FOLDERS.some((folder) =>
      fromRoot.startsWith(`${folder}${sep}`),
    );
    if (!allowed || !existsSync(filePath)) {
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

/** Returns the page URL of a case with its settings, and any extra settings, as query parameters. */
function pageUrl(
  port: number,
  spec: CaseSpec,
  extra: Record<string, string> = {},
): string {
  const query = new URLSearchParams({ ...spec.settings, ...extra });
  return `http://127.0.0.1:${port}/${THRESHOLDS_FOLDER}/${spec.template}?${query.toString()}`;
}

/** Measures a page and returns the kept facts and the path of its desktop screenshot, in a new temp folder. */
async function measureOnce(url: string): Promise<{
  facts: Record<string, unknown>;
  screenshot: string;
  folder: string;
}> {
  const folder = mkdtempSync(join(tmpdir(), "crit-thresholds-"));
  // Render only the desktop viewport, the one VIEWPORT keeps.
  const desktopViewports = VIEWPORTS.filter(
    (viewport) => viewport.name === "desktop",
  );
  await measurePage(
    url,
    folder,
    join(REPOSITORY_DIRECTORY, "packs"),
    desktopViewports,
  );
  const facts = JSON.parse(await readFile(join(folder, "facts.json"), "utf8"));
  const kept = keepFixtureViewport(facts, VIEWPORT);
  const viewport = onlyViewport(kept);
  if (viewport.page_height !== VIEWPORT.height) {
    throw new Error(
      `the page is ${String(viewport.page_height)} px tall, not ${VIEWPORT.height}`,
    );
  }
  return {
    facts: kept,
    screenshot: join(folder, String(viewport.screenshot)),
    folder,
  };
}

/**
 * Returns the median contrast between a text color and the pixels of a screenshot inside the boxes
 * given, which come from the text blocks the facts mark not measurable. The screenshot is the page
 * with that text hidden, so each pixel is what lies behind the text.
 */
async function medianBackgroundContrast(
  screenshotPath: string,
  boxes: number[][],
  textColorText: string,
): Promise<number> {
  const textColor = parseCssColor(textColorText);
  if (textColor === null) {
    throw new Error(`cannot read the color ${textColorText}`);
  }
  const image = await sharp(screenshotPath)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const contrasts: number[] = [];
  for (const [left = 0, top = 0, width = 0, height = 0] of boxes) {
    for (let y = top; y < top + height; y += 1) {
      for (let x = left; x < left + width; x += 1) {
        // Three bytes per pixel: red, green, blue.
        const offset = (y * image.info.width + x) * 3;
        const pixel = {
          red: image.data[offset] ?? 0,
          green: image.data[offset + 1] ?? 0,
          blue: image.data[offset + 2] ?? 0,
          alpha: 1,
        };
        contrasts.push(contrastRatio(textColor, pixel));
      }
    }
  }
  if (contrasts.length === 0) {
    throw new Error("no pixel behind the unmeasured text");
  }
  contrasts.sort((first, second) => first - second);
  const middle = contrasts[Math.floor(contrasts.length / 2)] ?? 0;
  return Math.round(middle * 100) / 100;
}

/** Renders and checks one case, writes its image and facts file, and returns its manifest entry. */
async function renderCase(
  spec: CaseSpec,
  port: number,
): Promise<Record<string, unknown>> {
  const shown = await measureOnce(pageUrl(port, spec));
  const folders = [shown.folder];
  try {
    const viewport = onlyViewport(shown.facts);
    let measured: number;
    if (spec.measure !== undefined) {
      measured = spec.measure(viewport);
    } else {
      const boxes: number[][] = [];
      for (const block of viewport.text_blocks as Record<string, unknown>[]) {
        if (block.contrast === null) {
          boxes.push(block.box as number[]);
        }
      }
      const hidden = await measureOnce(pageUrl(port, spec, { "--o1": "0" }));
      folders.push(hidden.folder);
      measured = await medianBackgroundContrast(
        hidden.screenshot,
        boxes,
        spec.settings["--c1"] ?? "",
      );
    }
    const problems = spec.checkFacts(viewport);
    if (!inBand(measured, spec.band)) {
      problems.push(
        `measured ${measured}, outside the band ${spec.band[0]} to ${spec.band[1]}`,
      );
    }
    if (problems.length > 0) {
      throw new Error(problems.join("; "));
    }
    const image = `images/${spec.id}.png`;
    const facts = `facts/${spec.id}.facts.json`;
    mkdirSync(join(FOLDER, "images"), { recursive: true });
    mkdirSync(join(FOLDER, "facts"), { recursive: true });
    await copyFile(shown.screenshot, join(FOLDER, image));
    await writeFile(join(FOLDER, facts), `${formatFactsJson(shown.facts)}\n`);
    return {
      id: spec.id,
      kind: spec.kind,
      defect: spec.defect,
      expected: spec.expected,
      template: spec.template,
      settings: spec.settings,
      image,
      image_sha256: fileSha256(join(FOLDER, image)),
      facts,
      facts_sha256: fileSha256(join(FOLDER, facts)),
      measured_value: measured,
      measured_from: spec.measuredFrom,
    };
  } finally {
    for (const folder of folders) {
      await rm(folder, { recursive: true, force: true });
    }
  }
}

/** Renders every case, one at a time, and writes the manifest only when every case passed. */
export async function main(): Promise<void> {
  const server = await startServer();
  const port = (server.address() as AddressInfo).port;
  const entries: Record<string, unknown>[] = [];
  let failures = 0;
  try {
    for (const spec of CASES) {
      try {
        const entry = await renderCase(spec, port);
        entries.push(entry);
        process.stdout.write(
          `${spec.id}: ${String(entry.measured_value)} (${spec.measuredFrom})\n`,
        );
      } catch (error) {
        failures += 1;
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`refused ${spec.id}: ${message}\n`);
      }
    }
  } finally {
    server.close();
  }
  if (failures > 0) {
    process.stderr.write(`${failures} cases refused; manifest not written\n`);
    process.exitCode = 2;
    return;
  }
  await writeFile(
    join(FOLDER, "manifest.json"),
    `${JSON.stringify(entries, null, 2)}\n`,
  );
  process.stdout.write(`${entries.length} cases written\n`);
}

// Run only when node starts this file, not when a test imports it.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
