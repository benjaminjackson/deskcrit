// The accessibility pre-screen runner (crit-q25.17), copied from the crit-cy8.37 text-size spike.
// It renders the twelve page pairs in pages.ts at 1280 x 800 px and device pixel ratio 1, asks
// Jev each image's own candidate question in one request per image, and writes summary.csv.
// This is a disposable exploration spike, not an EV-4 run. It reuses the request builder and the
// response check in spike/request.ts, and borrows Playwright from the packs renderer's own
// package, because Playwright is a fixture tool and never a dependency of deskcrit (OQ-17).
//
// Usage, from the repository root, after `npm --prefix spike ci` and `npm --prefix packs ci`:
//   node spike/prescreen/accessibility/run.ts render    writes images/*.png and images/images.json
//   node spike/prescreen/accessibility/run.ts live      live and paid; needs TYPESAFE_API_KEY; 24 requests
//   node spike/prescreen/accessibility/run.ts summary   reads results/*.json and writes summary.csv

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
import { PRESCREEN_PAGES } from "./pages.ts";

const FOLDER = new URL("./", import.meta.url);
const IMAGES = new URL("./images/", import.meta.url);
const RESULTS = new URL("./results/", import.meta.url);
const FONTS_FOLDER = new URL("../../../packs/_renderer/fonts/", import.meta.url);

/** The page size every image is rendered at. */
const VIEWPORT = { width: 1280, height: 800 };

/** Stop the live run when one request costs more than this many US dollars. */
const COST_LIMIT_PER_REQUEST_USD = 0.002;

/** One image the spike asks about, with its candidate and which side of the pair it is. */
type SpikeImage = {
  file: string;
  candidate: string;
  page: string;
  side: "positive" | "negative";
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
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const images: SpikeImage[] = [];
  for (const prescreenPage of PRESCREEN_PAGES) {
    const sides: Array<["positive" | "negative", boolean]> = [
      ["positive", true],
      ["negative", false],
    ];
    for (const [side, defect] of sides) {
      const html = await inlineFonts(prescreenPage.html(defect));
      await page.setContent(html, { waitUntil: "load" });
      await page.evaluate("document.fonts.ready");
      const file = `${prescreenPage.name}.${side}.png`;
      await page.screenshot({ path: new URL(file, IMAGES).pathname });
      images.push({
        file,
        candidate: prescreenPage.candidate,
        page: prescreenPage.name,
        side,
      });
      console.log(`wrote ${file}`);
    }
  }
  await browser.close();
  await writeFile(
    new URL("images.json", IMAGES),
    `${JSON.stringify(images, null, 2)}\n`,
  );
}

/** Read questions.json as spike questions. The file was committed before any answer was seen. */
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

/** Return the one question whose id is the image's candidate. */
function questionFor(
  questions: SpikeQuestion[],
  candidate: string,
): SpikeQuestion {
  const question = questions.find((entry) => entry.id === candidate);
  if (question === undefined) {
    throw new Error(`questions.json has no question for ${candidate}`);
  }
  return question;
}

/** Read the list of images that render wrote. */
async function readImages(): Promise<SpikeImage[]> {
  return JSON.parse(
    await readFile(new URL("images.json", IMAGES), "utf8"),
  ) as SpikeImage[];
}

/** Ask each image its candidate's question, one request per image, and keep each raw response. */
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
    const imageQuestions = [questionFor(questions, spikeImage.candidate)];
    const bytes = new Uint8Array(
      await readFile(new URL(spikeImage.file, IMAGES)),
    );
    const size = readPngSize(bytes);
    checkImageSize(size.width, size.height);
    const request = buildRequest(image(bytes), null, imageQuestions);
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
    const parsed = parseResponse(raw, imageQuestions);
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

/**
 * Decide one candidate's verdict from its two positive and two negative probabilities: KEEP when
 * both positives are 0.7 or more and both negatives 0.3 or less, CUT when a positive is under 0.5
 * or a negative over 0.5, and BORDERLINE otherwise.
 */
function verdict(positives: number[], negatives: number[]): string {
  for (const probability of positives) {
    if (probability < 0.5) {
      return "CUT";
    }
  }
  for (const probability of negatives) {
    if (probability > 0.5) {
      return "CUT";
    }
  }
  let keep = true;
  for (const probability of positives) {
    if (probability < 0.7) {
      keep = false;
    }
  }
  for (const probability of negatives) {
    if (probability > 0.3) {
      keep = false;
    }
  }
  if (keep) {
    return "KEEP";
  }
  return "BORDERLINE";
}

/** Read every result file, write summary.csv, and print each candidate's verdict and the cost. */
async function summary(): Promise<void> {
  const questions = await readQuestions();
  const rows: string[] = ["candidate,image,kind,true_probability"];
  const images = await readImages();
  let totalCost = 0;
  for (const question of questions) {
    const positives: number[] = [];
    const negatives: number[] = [];
    for (const spikeImage of images) {
      if (spikeImage.candidate !== question.id) {
        continue;
      }
      const saved = JSON.parse(
        await readFile(
          new URL(spikeImage.file.replace(/\.png$/, ".json"), RESULTS),
          "utf8",
        ),
      ) as { response: unknown };
      const parsed = parseResponse(saved.response, [question]);
      totalCost += computeCostUsd(parsed.input_tokens) ?? 0;
      const probabilityTrue = parsed.questions[0].distribution.true ?? Number.NaN;
      if (spikeImage.side === "positive") {
        positives.push(probabilityTrue);
      } else {
        negatives.push(probabilityTrue);
      }
      rows.push(
        [question.id, spikeImage.file, spikeImage.side, probabilityTrue.toFixed(3)].join(","),
      );
    }
    console.log(
      `${question.id}: positives ${positives.map((value) => value.toFixed(3)).join(" ")}, negatives ${negatives.map((value) => value.toFixed(3)).join(" ")}: ${verdict(positives, negatives)}`,
    );
  }
  await writeFile(new URL("summary.csv", FOLDER), `${rows.join("\n")}\n`);
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
  console.error(
    "usage: node spike/prescreen/accessibility/run.ts render | live | summary",
  );
  process.exit(2);
}
