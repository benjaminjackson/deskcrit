// Renders each screen of the contact-sheet spike (crit-j8y.1) at 1280 x 800 px into
// images/<set>/screen-N.png, and lays each set out as one numbered contact sheet,
// images/<set>/sheet.png: two tiles per row, each tile the screen at half scale (640 x 400 px),
// with its number in a band above it.
// It needs `npm ci` (sharp) and `npm --prefix packs ci` plus `npm --prefix packs run setup` (Playwright).
// Usage: node spike/contact-sheet/render.mjs
import { mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const SPIKE_DIRECTORY = import.meta.dirname;
const SETS_DIRECTORY = join(SPIKE_DIRECTORY, "sets");
const IMAGES_DIRECTORY = join(SPIKE_DIRECTORY, "images");

const SCREEN_WIDTH = 1280;
const SCREEN_HEIGHT = 800;
const TILE_WIDTH = 640;
const TILE_HEIGHT = 400;
const COLUMNS = 2;
const GAP = 24;
const LABEL_HEIGHT = 44;

// packs/ has its own node_modules, so import Playwright from there by its file path.
const playwrightUrl = new URL("../../packs/node_modules/playwright/index.mjs", import.meta.url);
const { chromium } = await import(playwrightUrl.href);

/** Returns the SVG of one tile's number band, so sharp can draw the number above the tile. */
function labelSvg(tileNumber) {
  return Buffer.from(
    `<svg width="${TILE_WIDTH}" height="${LABEL_HEIGHT}" xmlns="http://www.w3.org/2000/svg">` +
      `<text x="0" y="32" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="700" fill="#111">${tileNumber}</text>` +
      `</svg>`,
  );
}

/** Lays the screens of one set out as one contact sheet PNG with a number above each tile. */
async function writeSheet(screenPaths, sheetPath) {
  const rows = Math.ceil(screenPaths.length / COLUMNS);
  const sheetWidth = GAP + COLUMNS * (TILE_WIDTH + GAP);
  const sheetHeight = GAP + rows * (LABEL_HEIGHT + TILE_HEIGHT + GAP);
  const layers = [];
  for (let index = 0; index < screenPaths.length; index++) {
    const column = index % COLUMNS;
    const row = Math.floor(index / COLUMNS);
    const left = GAP + column * (TILE_WIDTH + GAP);
    const top = GAP + row * (LABEL_HEIGHT + TILE_HEIGHT + GAP);
    const tile = await sharp(screenPaths[index]).resize(TILE_WIDTH, TILE_HEIGHT).png().toBuffer();
    layers.push({ input: labelSvg(index + 1), left, top });
    // A thin gray frame around each tile, so the tile edge is clear on the white sheet.
    const framed = await sharp(tile).extend({ top: 1, bottom: 1, left: 1, right: 1, background: "#999999" }).toBuffer();
    layers.push({ input: framed, left: left - 1, top: top + LABEL_HEIGHT - 1 });
  }
  await sharp({ create: { width: sheetWidth, height: sheetHeight, channels: 3, background: "#ffffff" } })
    .composite(layers)
    .png()
    .toFile(sheetPath);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } });
const setNames = readdirSync(SETS_DIRECTORY, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
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
  await writeSheet(screenPaths, join(outputDirectory, "sheet.png"));
  console.log(`wrote ${setName}: ${screenPaths.length} screens and sheet.png`);
}
await browser.close();
