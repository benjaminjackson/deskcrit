// The crit-cy8.37 text-size spike runner. It renders the five page pairs in pages.ts at 1280 x 800
// px and device pixel ratio 1, crops the paragraphs of each page at their native pixels, asks Jev
// the wordings in questions.json about each image in one request, and writes summary.csv.
// This is a disposable exploration spike, not an EV-4 run. It reuses the request builder and the
// response check in spike/request.ts. It borrows Playwright from the packs renderer's own
// package, because Playwright is a fixture tool and never a dependency of deskcrit (OQ-17).
//
// Usage, from the repository root, after `npm --prefix spike ci` and `npm --prefix packs ci`:
//   node spike/text-size/run.ts render    writes images/*.png and images/images.json
//   node spike/text-size/run.ts live      live and paid; needs TYPESAFE_API_KEY; 20 requests
//   node spike/text-size/run.ts summary   reads results/*.json and writes summary.csv

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { image, TypeSafeClient } from "@typesafe-ai/sdk";
import sharp from "sharp";
import {
  buildRequest,
  checkImageSize,
  computeCostUsd,
  PINNED_MODEL,
  parseResponse,
  readPngSize,
  type SpikeQuestion,
} from "../request.ts";
import { DEFECT_BODY_PX, SPIKE_PAGES } from "./pages.ts";

const FOLDER = new URL("./", import.meta.url);
const IMAGES = new URL("./images/", import.meta.url);
const RESULTS = new URL("./results/", import.meta.url);
const FONTS_FOLDER = new URL("../../packs/_renderer/fonts/", import.meta.url);

/** The page size every image is rendered at. */
const VIEWPORT = { width: 1280, height: 800 };

/** TypeSafe refuses an image side under 280 px, so a crop grows to at least this size. */
const CROP_SIDE_MIN = 280;

/** Stop the live run when one request costs more than this many US dollars. */
const COST_LIMIT_PER_REQUEST_USD = 0.002;

/** A box in page pixels. */
type Box = { left: number; top: number; width: number; height: number };

/** One image the spike asks about, with which side of the pair it is. */
type SpikeImage = {
  file: string;
  page: string;
  side: "positive" | "negative";
  kind: "page" | "crop";
  body_px: number;
};

/** Grow a box to at least CROP_SIDE_MIN on each side, keep it inside the page, and round it. */
function growBox(box: Box): Box {
  let left = Math.floor(box.left) - 8;
  let top = Math.floor(box.top) - 8;
  let width = Math.ceil(box.width) + 16;
  let height = Math.ceil(box.height) + 16;
  if (width < CROP_SIDE_MIN) {
    left -= Math.ceil((CROP_SIDE_MIN - width) / 2);
    width = CROP_SIDE_MIN;
  }
  if (height < CROP_SIDE_MIN) {
    top -= Math.ceil((CROP_SIDE_MIN - height) / 2);
    height = CROP_SIDE_MIN;
  }
  left = Math.max(0, Math.min(left, VIEWPORT.width - width));
  top = Math.max(0, Math.min(top, VIEWPORT.height - height));
  width = Math.min(width, VIEWPORT.width - left);
  height = Math.min(height, VIEWPORT.height - top);
  return { left, top, width, height };
}

/**
 * Replace each font file name in a page's CSS with a data URL holding the file's bytes. A page
 * loaded with setContent has no file origin, so Chromium refuses to load fonts from file URLs.
 */
async function inlineFonts(html: string): Promise<string> {
  let result = html;
  for (const fileName of await readdir(FONTS_FOLDER)) {
    if (!fileName.endsWith(".woff2")) {
      continue;
    }
    const bytes = await readFile(new URL(fileName, FONTS_FOLDER));
    const dataUrl = `data:font/woff2;base64,${bytes.toString("base64")}`;
    result = result.replaceAll(`url("${fileName}")`, `url("${dataUrl}")`);
  }
  return result;
}

/** Render every page at both body sizes, save the screenshots, and crop the paragraphs. */
async function render(): Promise<void> {
  // createRequire loads a CommonJS package from another folder's node_modules: here the packs
  // renderer's pinned Playwright.
  const requireFromPacks = createRequire(
    new URL("../../packs/package.json", import.meta.url),
  );
  const { chromium } = requireFromPacks("playwright");
  await mkdir(IMAGES, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const images: SpikeImage[] = [];
  for (const spikePage of SPIKE_PAGES) {
    const sides: Array<["positive" | "negative", number]> = [
      ["positive", DEFECT_BODY_PX],
      ["negative", spikePage.cleanBodyPx],
    ];
    for (const [side, bodyPx] of sides) {
      const html = await inlineFonts(spikePage.html(bodyPx, ""));
      await page.setContent(html, {
        waitUntil: "load",
      });
      await page.evaluate("document.fonts.ready");
      const pageFile = `${spikePage.name}.${side}.png`;
      await page.screenshot({ path: new URL(pageFile, IMAGES).pathname });
      const rawBox: Box | null = await page.locator("#reading").boundingBox();
      if (rawBox === null) {
        throw new Error(`${pageFile}: no #reading element`);
      }
      const box = growBox({
        left: rawBox.x,
        top: rawBox.y,
        width: rawBox.width,
        height: rawBox.height,
      });
      const cropFile = `${spikePage.name}.${side}.crop.png`;
      await sharp(new URL(pageFile, IMAGES).pathname)
        .extract(box)
        .png()
        .toFile(new URL(cropFile, IMAGES).pathname);
      images.push({
        file: pageFile,
        page: spikePage.name,
        side,
        kind: "page",
        body_px: bodyPx,
      });
      images.push({
        file: cropFile,
        page: spikePage.name,
        side,
        kind: "crop",
        body_px: bodyPx,
      });
      console.log(`wrote ${pageFile} and ${cropFile} (${box.width}x${box.height})`);
    }
  }
  await browser.close();
  await writeFile(
    new URL("images.json", IMAGES),
    `${JSON.stringify(images, null, 2)}\n`,
  );
}

/** Read questions.json as spike questions. The file is fixed before any answer is seen. */
async function readQuestions(): Promise<SpikeQuestion[]> {
  const raw = JSON.parse(
    await readFile(new URL("questions.json", FOLDER), "utf8"),
  ) as Array<{
    id: string;
    instructions: string;
    criteria: { true: string; false: string };
  }>;
  const questions: SpikeQuestion[] = [];
  for (const entry of raw) {
    questions.push({
      id: entry.id,
      type: "noul",
      instructions: entry.instructions,
      criteria: entry.criteria,
    });
  }
  return questions;
}

/** Read the list of images that render wrote. */
async function readImages(): Promise<SpikeImage[]> {
  return JSON.parse(
    await readFile(new URL("images.json", IMAGES), "utf8"),
  ) as SpikeImage[];
}

/** Ask every wording about every image, one request per image, and keep each raw response. */
async function live(apiKey: string): Promise<void> {
  const questions = await readQuestions();
  const images = await readImages();
  const client = new TypeSafeClient({
    apiKey,
    baseURL: "https://api.typesafe.ai",
    defaultModel: PINNED_MODEL,
    logLevel: "off",
    timeout: 60_000,
    retry: { maxRetries: 0 },
  });
  await mkdir(RESULTS, { recursive: true });
  let totalCost = 0;
  for (const spikeImage of images) {
    const bytes = new Uint8Array(
      await readFile(new URL(spikeImage.file, IMAGES)),
    );
    const size = readPngSize(bytes);
    checkImageSize(size.width, size.height);
    const request = buildRequest(image(bytes), null, questions);
    const raw: unknown = await client.systemOne(request.body, request.options);
    const resultFile = new URL(
      spikeImage.file.replace(/\.png$/, ".json"),
      RESULTS,
    );
    // The wx flag refuses to overwrite a result file that already exists.
    await writeFile(
      resultFile,
      `${JSON.stringify({ image: spikeImage, width: size.width, height: size.height, response: raw }, null, 2)}\n`,
      { flag: "wx" },
    );
    const parsed = parseResponse(raw, questions);
    const cost = computeCostUsd(parsed.input_tokens) ?? 0;
    totalCost += cost;
    console.log(
      `${spikeImage.file}: ${parsed.input_tokens} input tokens, $${cost.toFixed(6)}`,
    );
    if (cost > COST_LIMIT_PER_REQUEST_USD) {
      throw new Error(
        `request cost $${cost} is over the $${COST_LIMIT_PER_REQUEST_USD} limit; stopping`,
      );
    }
  }
  console.log(`total cost $${totalCost.toFixed(6)}`);
}

/** Read every result file and write one summary.csv row per wording, image kind, and image. */
async function summary(): Promise<void> {
  const questions = await readQuestions();
  const rows: string[] = [
    "question,kind,page,side,body_px,p_true,input_tokens,cost_usd",
  ];
  const fileNames = (await readdir(RESULTS)).filter((name) =>
    name.endsWith(".json"),
  );
  fileNames.sort();
  const records: Array<{
    image: SpikeImage;
    parsed: ReturnType<typeof parseResponse>;
  }> = [];
  for (const fileName of fileNames) {
    const saved = JSON.parse(
      await readFile(new URL(fileName, RESULTS), "utf8"),
    ) as { image: SpikeImage; response: unknown };
    records.push({
      image: saved.image,
      parsed: parseResponse(saved.response, questions),
    });
  }
  for (const question of questions) {
    for (const kind of ["page", "crop"]) {
      for (const record of records) {
        if (record.image.kind !== kind) {
          continue;
        }
        const answer = record.parsed.questions.find(
          (candidate) => candidate.id === question.id,
        );
        const probabilityTrue = answer?.distribution.true ?? Number.NaN;
        const cost = computeCostUsd(record.parsed.input_tokens) ?? 0;
        rows.push(
          [
            question.id,
            kind,
            record.image.page,
            record.image.side,
            record.image.body_px,
            probabilityTrue.toFixed(3),
            record.parsed.input_tokens,
            cost.toFixed(6),
          ].join(","),
        );
      }
    }
  }
  await writeFile(new URL("summary.csv", FOLDER), `${rows.join("\n")}\n`);
  console.log(rows.join("\n"));
}

const command = process.argv[2];
if (command === "render") {
  await render();
} else if (command === "live") {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (apiKey === undefined || apiKey === "") {
    throw new Error("TYPESAFE_API_KEY is not set");
  }
  await live(apiKey);
} else if (command === "summary") {
  await summary();
} else {
  console.error("usage: node spike/text-size/run.ts render | live | summary");
  process.exit(2);
}
