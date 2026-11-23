// The browser test of measure.mjs (PRD FR-79). It measures evals/measure/known-values.html with
// the real script and Chromium, checks the known values (16 px Inter, 40 characters per line within
// 2, contrast 21 and 4.48, the three cases with no contrast number, the hidden block left out, the
// 120 x 40 px button), and compares the parts that do not depend on the machine with the committed
// known-values.facts.json, which `npm run ci` checks against the schema with no browser.
//
// Usage, from the repository root, after `npm --prefix packs ci` and `npm --prefix packs run setup`:
//   npm --prefix packs run check:measure              exits 0 when every check passes, 1 when one fails
//   npm --prefix packs run check:measure -- --update  a person rewrites known-values.facts.json, then reviews the diff
// An agent never runs --update to make the check pass.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const samplePath = join(
  repositoryRoot,
  "evals/measure/known-values.facts.json",
);
const outputFolder = mkdtempSync(join(tmpdir(), "measure-browser-check-"));

execFileSync(
  process.execPath,
  [
    "plugin/skills/design-critic/scripts/measure.mjs",
    "evals/measure/known-values.html",
    "--out",
    outputFolder,
  ],
  { cwd: repositoryRoot, stdio: "inherit" },
);
const factsText = readFileSync(join(outputFolder, "facts.json"), "utf8");
const facts = JSON.parse(factsText);

if (process.argv.includes("--update")) {
  writeFileSync(samplePath, factsText);
  console.log(`wrote ${samplePath}`);
  process.exit(0);
}

const failures = [];

/** Records a failure when the condition is false. */
function check(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

/** Returns the text block with this selector in the named viewport, or undefined. */
function findBlock(viewportName, selector) {
  const viewport = facts.viewports.find((item) => item.name === viewportName);
  return viewport?.text_blocks.find((block) => block.selector === selector);
}

const body = findBlock("desktop", "#body");
check(body !== undefined, "#body is not listed");
if (body !== undefined) {
  check(
    body.font_size === 16,
    `#body font_size ${body.font_size}, expected 16`,
  );
  check(
    body.font_family === "Inter",
    `#body font_family ${body.font_family}, expected Inter`,
  );
  check(body.lines === 4, `#body lines ${body.lines}, expected 4`);
  check(
    Math.abs(body.characters_per_line - 40) <= 2,
    `#body characters_per_line ${body.characters_per_line}, expected 40 within 2`,
  );
  check(body.contrast === 21, `#body contrast ${body.contrast}, expected 21`);
  check(
    body.line_height === 24,
    `#body line_height ${body.line_height}, expected 24`,
  );
}
const gray = findBlock("desktop", "#gray");
check(
  gray?.contrast === 4.48,
  `#gray contrast ${gray?.contrast}, expected 4.48`,
);
const expectedNotes = {
  "#on-gradient": "not measurable: background image",
  "#covered": "not measurable: covered by another element",
  "#faded": "not measurable: opacity, filter, or blend mode",
};
for (const [selector, note] of Object.entries(expectedNotes)) {
  const block = findBlock("desktop", selector);
  check(
    block?.contrast === null,
    `${selector} contrast ${block?.contrast}, expected null`,
  );
  check(
    block?.contrast_note === note,
    `${selector} contrast_note ${block?.contrast_note}, expected ${note}`,
  );
}
check(
  findBlock("desktop", "#hidden") === undefined,
  "#hidden is listed, but it is not displayed",
);
for (const viewport of facts.viewports) {
  const button = viewport.targets.find(
    (target) => target.selector === "#action",
  );
  check(
    button?.box[2] === 120 && button?.box[3] === 40,
    `${viewport.name} #action box ${JSON.stringify(button?.box)}, expected 120 x 40`,
  );
}

/** Keeps the measured values that do not depend on the machine's text drawing, for the comparison with the sample. */
function stableParts(document) {
  const viewports = [];
  for (const viewport of document.viewports) {
    const blocks = [];
    for (const block of viewport.text_blocks) {
      blocks.push({
        selector: block.selector,
        font_family: block.font_family,
        font_size: block.font_size,
        font_weight: block.font_weight,
        line_height: block.line_height,
        color: block.color,
        contrast: block.contrast,
        contrast_note: block.contrast_note,
      });
    }
    viewports.push({
      name: viewport.name,
      blocks,
      type_sizes: viewport.type_sizes,
      text_colors: viewport.text_colors,
      background_colors: viewport.background_colors,
      targets: viewport.targets,
    });
  }
  return { version: document.version, texts: document.texts, viewports };
}

const sample = JSON.parse(readFileSync(samplePath, "utf8"));
const measuredStable = JSON.stringify(stableParts(facts));
const sampleStable = JSON.stringify(stableParts(sample));
check(
  measuredStable === sampleStable,
  `the stable parts differ from ${samplePath}; compare it with ${join(outputFolder, "facts.json")}`,
);

if (failures.length > 0) {
  for (const failure of failures) {
    console.log(`FAIL ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log("measure browser check passed");
}
