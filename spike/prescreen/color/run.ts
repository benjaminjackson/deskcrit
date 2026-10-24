// The crit-q25.17 color pack pre-screen runner. It renders the page pairs in pages.ts at 1280 x 800
// px and device pixel ratio 1, asks Jev every question in questions.json about each image in one
// request (as crit asks a whole pack at once), keeps each raw response, and writes summary.csv and
// verdicts.csv. This is a disposable spike, not an EV-4 run and not a fixture set. It reuses the
// request builder and the response check in spike/request.ts, and borrows Playwright from the
// packs renderer's own package, because Playwright is never a dependency of deskcrit (OQ-17).
//
// Usage, from the repository root, after `npm --prefix spike ci` and `npm --prefix packs ci`:
//   node spike/prescreen/color/run.ts render    writes images/*.png and images/images.json
//   node spike/prescreen/color/run.ts live      live and paid; needs TYPESAFE_API_KEY; 28 requests
//   node spike/prescreen/color/run.ts summary   reads results/*.json, writes summary.csv and verdicts.csv

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { image, TypeSafeClient } from "@typesafe-ai/sdk";
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
const FONTS_FOLDER = new URL("../../../packs/_renderer/fonts/", import.meta.url);

/** The page size every image is rendered at. */
const VIEWPORT = { width: 1280, height: 800 };

/** Stop the live run when one request costs more than this many US dollars. */
const COST_LIMIT_PER_REQUEST_USD = 0.002;

/** One image the spike asks about: its file, its pair, its candidate, and its side of the pair. */
type SpikeImage = {
  file: string;
  candidate: string;
  pair: string;
  kind: "positive" | "negative";
};

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

/** Render both sides of every pair and save the screenshots and the image list. */
async function render(): Promise<void> {
  // createRequire loads a CommonJS package from another folder's node_modules: here the packs
  // renderer's pinned Playwright.
  const requireFromPacks = createRequire(new URL("../../../packs/package.json", import.meta.url));
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
    for (const [kind, defect] of sides) {
      await page.setContent(await inlineFonts(pair.html(defect)), { waitUntil: "load" });
      await page.evaluate("document.fonts.ready");
      const file = `${pair.candidate}.${pair.name}.${kind}.png`;
      await page.screenshot({ path: new URL(file, IMAGES).pathname });
      images.push({ file, candidate: pair.candidate, pair: pair.name, kind });
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
    questions.push({ id: entry.id, type: "noul", instructions: entry.instructions, criteria: entry.criteria });
  }
  return questions;
}

/** Read the list of images that render wrote. */
async function readImages(): Promise<SpikeImage[]> {
  return JSON.parse(await readFile(new URL("images.json", IMAGES), "utf8")) as SpikeImage[];
}

/** Ask every question about every image, one request per image, and keep each raw response. */
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
    // The wx flag refuses to overwrite a result file that already exists, so there is one run only.
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

/**
 * The brief's verdict rule: KEEP when both positives are 0.7 or higher and both negatives 0.3 or
 * lower; CUT when a positive is below 0.5 or a negative above 0.5; BORDERLINE otherwise.
 */
function verdict(positives: number[], negatives: number[]): string {
  const anyPositiveLow = positives.some((probability) => probability < 0.5);
  const anyNegativeHigh = negatives.some((probability) => probability > 0.5);
  if (anyPositiveLow || anyNegativeHigh) {
    return "CUT";
  }
  const allPositivesHigh = positives.every((probability) => probability >= 0.7);
  const allNegativesLow = negatives.every((probability) => probability <= 0.3);
  if (allPositivesHigh && allNegativesLow) {
    return "KEEP";
  }
  return "BORDERLINE";
}

/**
 * Read every result file and write summary.csv, one row per image with the true probability of
 * that image's own candidate question, and verdicts.csv, one row per candidate.
 */
async function summary(): Promise<void> {
  const questions = await readQuestions();
  const summaryRows: string[] = ["candidate,image,kind,true_probability"];
  const verdictRows: string[] = ["candidate,positive_1,positive_2,negative_1,negative_2,verdict"];
  let totalCost = 0;
  const byCandidate = new Map<string, { positives: number[]; negatives: number[] }>();
  for (const spikeImage of await readImages()) {
    const resultFile = new URL(spikeImage.file.replace(/\.png$/, ".json"), RESULTS);
    const saved = JSON.parse(await readFile(resultFile, "utf8")) as { response: unknown };
    const parsed = parseResponse(saved.response, questions);
    totalCost += computeCostUsd(parsed.input_tokens) ?? 0;
    const answer = parsed.questions.find((record) => record.id === spikeImage.candidate);
    const probabilityTrue = answer?.distribution.true ?? Number.NaN;
    summaryRows.push([spikeImage.candidate, spikeImage.file, spikeImage.kind, probabilityTrue.toFixed(3)].join(","));
    let entry = byCandidate.get(spikeImage.candidate);
    if (entry === undefined) {
      entry = { positives: [], negatives: [] };
      byCandidate.set(spikeImage.candidate, entry);
    }
    if (spikeImage.kind === "positive") {
      entry.positives.push(probabilityTrue);
    } else {
      entry.negatives.push(probabilityTrue);
    }
  }
  for (const [candidate, entry] of byCandidate) {
    const numbers = [...entry.positives, ...entry.negatives].map((probability) => probability.toFixed(3));
    verdictRows.push([candidate, ...numbers, verdict(entry.positives, entry.negatives)].join(","));
  }
  await writeFile(new URL("summary.csv", FOLDER), `${summaryRows.join("\n")}\n`);
  await writeFile(new URL("verdicts.csv", FOLDER), `${verdictRows.join("\n")}\n`);
  console.log(summaryRows.join("\n"));
  console.log(verdictRows.join("\n"));
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
  console.error("usage: node spike/prescreen/color/run.ts render | live | summary");
  process.exit(2);
}
