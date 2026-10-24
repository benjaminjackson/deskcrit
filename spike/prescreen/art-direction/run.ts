// The art-direction pre-screen runner (crit-q25.17). It renders the page pairs in pages.ts at
// 1280 x 800 px and device pixel ratio 1, asks Jev every wording in questions.json about each
// image in one request, and writes summary.csv with the answer to each image's own candidate.
// This is a disposable spike, not an EV-4 run and not a fixture set. It reuses the request
// builder and the response check in spike/request.ts, and borrows Playwright from the packs
// renderer's own package, as spike/text-size/run.ts does (OQ-17).
//
// Usage, from the repository root, after `npm --prefix spike ci` and `npm --prefix packs ci`:
//   node spike/prescreen/art-direction/run.ts render    writes images/*.png and images/images.json
//   node spike/prescreen/art-direction/run.ts live      live and paid; needs TYPESAFE_API_KEY
//   node spike/prescreen/art-direction/run.ts summary   reads results/*.json, writes summary.csv

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
} from "../../request.ts";
import { SPIKE_PAIRS } from "./pages.ts";

const FOLDER = new URL("./", import.meta.url);
const IMAGES = new URL("./images/", import.meta.url);
const RESULTS = new URL("./results/", import.meta.url);
const PHOTOS = new URL("./photos/", import.meta.url);
const FONTS_FOLDER = new URL("../../../packs/_renderer/fonts/", import.meta.url);

/** The page size every image is rendered at. */
const VIEWPORT = { width: 1280, height: 800 };

/** The width of the small copy that the pixelated pages enlarge. */
const SMALL_COPY_WIDTH = 120;

/** Stop the live run when one request costs more than this many US dollars. */
const COST_LIMIT_PER_REQUEST_USD = 0.002;

/** One image the spike asks about, with its candidate and which side of the pair it is. */
type SpikeImage = {
  file: string;
  candidate: string;
  pair: string;
  side: "positive" | "negative";
};

/**
 * Replace each font file name and each photo name in a page with a data URL holding the bytes.
 * A page loaded with setContent has no file origin, so Chromium refuses file URLs.
 */
async function inlineAssets(html: string): Promise<string> {
  let result = html;
  for (const fileName of await readdir(FONTS_FOLDER)) {
    if (!fileName.endsWith(".woff2")) {
      continue;
    }
    const bytes = await readFile(new URL(fileName, FONTS_FOLDER));
    const dataUrl = `data:font/woff2;base64,${bytes.toString("base64")}`;
    result = result.replaceAll(`url("${fileName}")`, `url("${dataUrl}")`);
  }
  for (const fileName of await readdir(PHOTOS)) {
    const name = fileName.replace(/\.jpg$/, "");
    const bytes = await readFile(new URL(fileName, PHOTOS));
    const fullUrl = `data:image/jpeg;base64,${bytes.toString("base64")}`;
    // The small copy is made in memory; the photo file itself is never changed.
    const smallBytes = await sharp(bytes).resize({ width: SMALL_COPY_WIDTH }).jpeg().toBuffer();
    const smallUrl = `data:image/jpeg;base64,${smallBytes.toString("base64")}`;
    result = result.replaceAll(`"photo-small:${name}"`, `"${smallUrl}"`);
    result = result.replaceAll(`"photo:${name}"`, `"${fullUrl}"`);
  }
  return result;
}

/** Render both sides of every pair and save the screenshots. */
async function render(): Promise<void> {
  // createRequire loads a CommonJS package from another folder's node_modules: here the packs
  // renderer's pinned Playwright.
  const requireFromPacks = createRequire(
    new URL("../../../packs/package.json", import.meta.url),
  );
  const { chromium } = requireFromPacks("playwright");
  await mkdir(IMAGES, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const images: SpikeImage[] = [];
  for (const pair of SPIKE_PAIRS) {
    const sides: Array<["positive" | "negative", boolean]> = [
      ["positive", true],
      ["negative", false],
    ];
    for (const [side, defect] of sides) {
      const html = await inlineAssets(pair.html(defect));
      await page.setContent(html, { waitUntil: "load" });
      await page.evaluate("document.fonts.ready");
      const file = `${pair.candidate}.${pair.name}.${side}.png`;
      await page.screenshot({ path: new URL(file, IMAGES).pathname });
      images.push({ file, candidate: pair.candidate, pair: pair.name, side });
      console.log(`wrote ${file}`);
    }
  }
  await browser.close();
  await writeFile(new URL("images.json", IMAGES), `${JSON.stringify(images, null, 2)}\n`);
}

/** Read questions.json as spike questions. The file was committed before any answer was seen. */
async function readQuestions(): Promise<SpikeQuestion[]> {
  const raw = JSON.parse(await readFile(new URL("questions.json", FOLDER), "utf8")) as Array<{
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
  return JSON.parse(await readFile(new URL("images.json", IMAGES), "utf8")) as SpikeImage[];
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
    const bytes = new Uint8Array(await readFile(new URL(spikeImage.file, IMAGES)));
    const size = readPngSize(bytes);
    checkImageSize(size.width, size.height);
    const request = buildRequest(image(bytes), null, questions);
    const raw: unknown = await client.systemOne(request.body, request.options);
    const resultFile = new URL(spikeImage.file.replace(/\.png$/, ".json"), RESULTS);
    // The wx flag refuses to overwrite a result file that already exists, so no image is asked twice.
    await writeFile(
      resultFile,
      `${JSON.stringify({ image: spikeImage, width: size.width, height: size.height, response: raw }, null, 2)}\n`,
      { flag: "wx" },
    );
    const parsed = parseResponse(raw, questions);
    const cost = computeCostUsd(parsed.input_tokens) ?? 0;
    totalCost += cost;
    console.log(`${spikeImage.file}: ${parsed.input_tokens} input tokens, $${cost.toFixed(6)}`);
    if (cost > COST_LIMIT_PER_REQUEST_USD) {
      throw new Error(`request cost $${cost} is over the $${COST_LIMIT_PER_REQUEST_USD} limit; stopping`);
    }
  }
  console.log(`total cost $${totalCost.toFixed(6)}`);
}

/** Read every result file and write one summary.csv row per image, for its own candidate. */
async function summary(): Promise<void> {
  const questions = await readQuestions();
  const rows: string[] = ["candidate,image,kind,true_probability"];
  let totalCost = 0;
  const fileNames = (await readdir(RESULTS)).filter((name) => name.endsWith(".json"));
  fileNames.sort();
  for (const question of questions) {
    for (const fileName of fileNames) {
      const saved = JSON.parse(await readFile(new URL(fileName, RESULTS), "utf8")) as {
        image: SpikeImage;
        response: unknown;
      };
      if (saved.image.candidate !== question.id) {
        continue;
      }
      const parsed = parseResponse(saved.response, questions);
      totalCost += computeCostUsd(parsed.input_tokens) ?? 0;
      const answer = parsed.questions.find((candidate) => candidate.id === question.id);
      const probabilityTrue = answer?.distribution.true ?? Number.NaN;
      rows.push([question.id, saved.image.file, saved.image.side, probabilityTrue.toFixed(3)].join(","));
    }
  }
  await writeFile(new URL("summary.csv", FOLDER), `${rows.join("\n")}\n`);
  console.log(rows.join("\n"));
  console.log(`total cost $${totalCost.toFixed(6)}`);
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
  console.error("usage: node spike/prescreen/art-direction/run.ts render | live | summary");
  process.exit(2);
}
