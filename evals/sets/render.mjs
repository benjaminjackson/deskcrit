// Renders each screen of the EV-21 sets (crit-j8y.5) at 1280 x 800 px into evals/sets/<set>/screen-N.png.
// The contact sheet is not made here: evals/critic/sets.ts makes it at run time with the skill's
// scripts/contact-sheet.mjs, so the evaluation tests the product's sheet.
// It needs `npm --prefix packs ci` plus `npm --prefix packs run setup` (Playwright).
// Usage: node evals/sets/render.mjs
import { mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const SPIKE_DIRECTORY = import.meta.dirname;
const SETS_DIRECTORY = SPIKE_DIRECTORY;
const IMAGES_DIRECTORY = SPIKE_DIRECTORY;

const SCREEN_WIDTH = 1280;
const SCREEN_HEIGHT = 800;

// packs/ has its own node_modules, so import Playwright from there by its file path.
const playwrightUrl = new URL("../../packs/node_modules/playwright/index.mjs", import.meta.url);
const { chromium } = await import(playwrightUrl.href);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } });
const setNames = readdirSync(SETS_DIRECTORY, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith("set-"))
  .map((entry) => entry.name)
  .sort();
for (const setName of setNames) {
  const screenNames = readdirSync(join(SETS_DIRECTORY, setName))
    .filter((name) => name.endsWith(".html"))
    .sort();
  const outputDirectory = join(IMAGES_DIRECTORY, setName);
  mkdirSync(outputDirectory, { recursive: true });
  const screenPaths = [];
  for (const screenName of screenNames) {
    const screenPath = join(outputDirectory, screenName.replace(".html", ".png"));
    await page.goto(pathToFileURL(join(SETS_DIRECTORY, setName, screenName)).href);
    await page.screenshot({ path: screenPath });
    screenPaths.push(screenPath);
  }
  console.log(`wrote ${setName}: $`);
}
await browser.close();
