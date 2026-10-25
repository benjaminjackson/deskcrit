// Takes one 1280 x 800 screenshot of an HTML file with the Playwright that packs/ pins, so that the
// before and after pictures of the EV-10 loop test are taken the same way and not by the agent.
// Usage: node evals/loop-test/screenshot.mjs <page.html> <out.png>
// It needs `npm --prefix packs ci` and `npm --prefix packs run setup` first.
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [pagePath, outputPath] = process.argv.slice(2);
if (pagePath === undefined || outputPath === undefined) {
  console.error("usage: node evals/loop-test/screenshot.mjs <page.html> <out.png>");
  process.exit(2);
}

// packs/ has its own node_modules, so import Playwright from there by its file path.
const playwrightUrl = new URL("../../packs/node_modules/playwright/index.mjs", import.meta.url);
const { chromium } = await import(playwrightUrl.href);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(pathToFileURL(resolve(pagePath)).href);
await page.screenshot({ path: outputPath });
await browser.close();
console.log(`wrote ${outputPath}`);
