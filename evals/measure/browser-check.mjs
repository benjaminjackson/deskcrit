// The browser test of measure.mjs (PRD FR-79). It measures two committed pages with the real
// script and Chromium and checks what each must give:
//   known-values.html: 16 px Inter, 40 characters per line within 2, contrast 21 and 4.48, three
//   cases with no contrast number, a hidden block left out, a 120 x 40 px button, light mode, and
//   the desktop violations list: exactly #gray, #long, #pair-a, and #pair-b, with the exempt cases out.
//   hard-cases.html: the cases from the review of crit-0a0.1, listed at the top of that page.
// It measures known-values.html with --width 768,1024 and checks that it writes w768.png and
// w1024.png and a facts.json with only those two viewports, which validates against the schema.
// With --dark (FR-85, crit-9w5.4) it checks dark-media.html (dark through the system setting),
// dark-toggle.html (dark through a "Dark mode" button), known-values.html (no dark mode, so no
// -dark.png and a note), and still-moving.html (a ticking clock and a "Theme" link: no dark mode,
// and the link is not followed), and dark-covered.html (a covered "Dark mode" button whose click
// times out: still exit 0, found_by none, and a note that the check failed), and pulse.html (a
// button whose color pulses, with no dark mode: found_by none); dark-media and
// dark-toggle are compared with their committed .facts.json.
// It measures hash-slides.html#2 and checks that only the heading of slide 2 is measured and that
// source keeps the hash (FR-82, crit-3wg).
// It measures hash-scroll.html#2, a deck whose hash only scrolls, and checks that only slide 2 is
// measured, in a 1280 x 800 px screenshot with boxes in the slide's pixels, and that hash-scroll.html#9,
// whose hash names no element, measures the whole page with a note.
// It also serves pages from a local HTTP server to check that a 404 is refused with one line, that
// a redirect is recorded, and that a page that does not open gives one line. Then it compares the
// parts of each facts.json that do not depend on the machine with the committed
// <page>.facts.json, which `npm run ci` checks against the schema with no browser.
//
// Usage, from the repository root, after `npm --prefix packs ci` and `npm --prefix packs run setup`:
//   npm --prefix packs run check:measure              exits 0 when every check passes, 1 when one fails
//   npm --prefix packs run check:measure -- --update  a person rewrites the two .facts.json files, then reviews the diff
// An agent never runs --update to make the check pass.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
// Ajv comes from the repository's own node_modules, which `npm ci` at the root installs.
import { Ajv2020 } from "ajv/dist/2020.js";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const measureScript = "plugin/skills/design-critic/scripts/measure.mjs";
const failures = [];

const validateFacts = new Ajv2020({ allErrors: true }).compile(
  JSON.parse(
    readFileSync(join(repositoryRoot, "schemas/facts.schema.json"), "utf8"),
  ),
);

/** Records a failure when the condition is false. */
function check(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

/**
 * Runs measure.mjs on a page into a new temp folder, with any extra flags, and resolves with its
 * exit code, its output lines, and the folder. It runs the child without blocking, so the HTTP
 * server in this process can answer the child's browser.
 */
function runMeasureScript(page, extraFlags = []) {
  const outputFolder = mkdtempSync(join(tmpdir(), "measure-browser-check-"));
  return new Promise((resolveRun) => {
    const child = spawn(
      process.execPath,
      [measureScript, page, "--out", outputFolder, ...extraFlags],
      { cwd: repositoryRoot },
    );
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.on("close", (exitCode) => {
      const lines = output.split("\n").filter((line) => line !== "");
      resolveRun({ exitCode, lines, outputFolder });
    });
  });
}

/** Measures a committed page, with any extra flags, and returns its facts and the text of its facts.json. */
async function measureCommittedPage(page, extraFlags = []) {
  const run = await runMeasureScript(page, extraFlags);
  if (run.exitCode !== 0) {
    throw new Error(
      `measure.mjs exited ${run.exitCode} on ${page}: ${run.lines.join(" | ")}`,
    );
  }
  const factsText = readFileSync(join(run.outputFolder, "facts.json"), "utf8");
  return {
    facts: JSON.parse(factsText),
    factsText,
    outputFolder: run.outputFolder,
  };
}

/** Returns the text block with this selector in the named viewport of a facts document, or undefined. */
function findBlock(facts, viewportName, selector) {
  const viewport = facts.viewports.find((item) => item.name === viewportName);
  return viewport?.text_blocks.find((block) => block.selector === selector);
}

/** Checks that a block's contrast is null with the given note. */
function checkNotMeasurable(facts, selector, note) {
  const block = findBlock(facts, "desktop", selector);
  check(
    block?.contrast === null,
    `${selector} contrast ${block?.contrast}, expected null`,
  );
  check(
    block?.contrast_note === note,
    `${selector} contrast_note ${block?.contrast_note}, expected ${note}`,
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
      color_scheme: viewport.color_scheme,
      blocks,
      type_sizes: viewport.type_sizes,
      text_colors: viewport.text_colors,
      targets: viewport.targets,
      violations: viewport.violations,
    });
  }
  return {
    version: document.version,
    color_scheme: document.color_scheme,
    dark_mode: document.dark_mode,
    texts: document.texts,
    viewports,
  };
}

/** Compares a page's stable parts with its committed sample, or rewrites the sample under --update. */
function compareWithSample(page, measured) {
  const samplePath = join(
    repositoryRoot,
    page.replace(/\.html$/, ".facts.json"),
  );
  if (process.argv.includes("--update")) {
    writeFileSync(samplePath, measured.factsText);
    console.log(`wrote ${samplePath}`);
    return;
  }
  const sample = JSON.parse(readFileSync(samplePath, "utf8"));
  check(
    JSON.stringify(stableParts(measured.facts)) ===
      JSON.stringify(stableParts(sample)),
    `the stable parts differ from ${samplePath}; compare it with ${join(measured.outputFolder, "facts.json")}`,
  );
}

// The known-values page.
const known = await measureCommittedPage("evals/measure/known-values.html");
const body = findBlock(known.facts, "desktop", "#body");
check(body !== undefined, "#body is not listed");
check(
  body?.font_size === 16,
  `#body font_size ${body?.font_size}, expected 16`,
);
check(
  body?.font_family === "Inter",
  `#body font_family ${body?.font_family}, expected Inter`,
);
check(body?.lines === 4, `#body lines ${body?.lines}, expected 4`);
check(
  Math.abs((body?.characters_per_line ?? 0) - 40) <= 2,
  `#body characters_per_line ${body?.characters_per_line}, expected 40 within 2`,
);
check(body?.contrast === 21, `#body contrast ${body?.contrast}, expected 21`);
check(
  body?.line_height === 24,
  `#body line_height ${body?.line_height}, expected 24`,
);
const gray = findBlock(known.facts, "desktop", "#gray");
check(
  gray?.contrast === 4.48,
  `#gray contrast ${gray?.contrast}, expected 4.48`,
);
checkNotMeasurable(
  known.facts,
  "#on-gradient",
  "not measurable: background image",
);
checkNotMeasurable(
  known.facts,
  "#covered",
  "not measurable: covered by another element",
);
checkNotMeasurable(
  known.facts,
  "#faded",
  "not measurable: opacity, filter, or blend mode",
);
check(
  findBlock(known.facts, "desktop", "#hidden") === undefined,
  "#hidden is listed, but it is not displayed",
);
for (const viewport of known.facts.viewports) {
  const button = viewport.targets.find(
    (target) => target.selector === "#action",
  );
  check(
    button?.box[2] === 120 && button?.box[3] === 40,
    `${viewport.name} #action box ${JSON.stringify(button?.box)}, expected 120 x 40`,
  );
}
check(known.facts.color_scheme === "light", "color_scheme is not light");
// The violations list of the desktop viewport (crit-576.13): exactly these rules and selectors.
const knownDesktop = known.facts.viewports.find(
  (viewport) => viewport.name === "desktop",
);
const violationNames = (knownDesktop?.violations ?? []).map(
  (violation) => `${violation.rule} ${violation.selector} ${violation.value}`,
);
const expectedViolations = [
  "text-contrast #gray 4.48",
  "line-length #long 90",
  "target-size #pair-a 16",
  "target-size #pair-b 16",
];
check(
  JSON.stringify(violationNames) === JSON.stringify(expectedViolations),
  `desktop violations ${JSON.stringify(violationNames)}, expected ${JSON.stringify(expectedViolations)}`,
);
compareWithSample("evals/measure/known-values.html", known);

// The hard-cases page.
const hard = await measureCommittedPage("evals/measure/hard-cases.html");
const linkHeading = findBlock(hard.facts, "desktop", "#link-heading");
check(
  linkHeading?.color === "#bbbbbb",
  `#link-heading color ${linkHeading?.color}, expected #bbbbbb`,
);
check(
  linkHeading?.contrast !== undefined &&
    linkHeading.contrast !== null &&
    linkHeading.contrast < 2,
  `#link-heading contrast ${linkHeading?.contrast}, expected about 1.9`,
);
const mixed = findBlock(hard.facts, "desktop", "#mixed");
check(
  mixed?.notes?.includes(
    "mixed sizes: font_size is the size of most characters",
  ) === true &&
    mixed?.notes?.includes(
      "mixed colors: color is the color of most characters",
    ) === true,
  `#mixed notes ${JSON.stringify(mixed?.notes)}, expected mixed sizes and colors`,
);
check(
  mixed?.contrast !== undefined &&
    mixed.contrast !== null &&
    mixed.contrast < 3,
  `#mixed contrast ${mixed?.contrast}, expected the light span's contrast, below 3`,
);
const brand = findBlock(hard.facts, "desktop", "#brand");
check(
  brand?.font_family === "Brand",
  `#brand font_family ${brand?.font_family}, expected Brand`,
);
check(
  brand?.notes === undefined,
  `#brand notes ${JSON.stringify(brand?.notes)}, expected none`,
);
const missing = findBlock(hard.facts, "desktop", "#missing");
check(
  missing?.notes?.includes(
    "first declared family Missing is not the one drawn",
  ) === true,
  `#missing notes ${JSON.stringify(missing?.notes)}, expected the note that Missing is not drawn`,
);
check(
  !Object.values(hard.facts.texts).some((text) =>
    text.includes("SVG axis label"),
  ),
  "the SVG text is listed, but SVG text is left out",
);
checkNotMeasurable(
  hard.facts,
  "#under-scrim",
  "not measurable: covered by another element",
);
checkNotMeasurable(
  hard.facts,
  "#on-pseudo",
  "not measurable: pseudo-element background",
);
checkNotMeasurable(
  hard.facts,
  "#on-faded-sibling",
  "not measurable: opacity, filter, or blend mode",
);
for (const hiddenSelector of ["a.sr-only", "#off-page", "#clip-path"]) {
  check(
    hard.facts.texts[hiddenSelector] === undefined,
    `${hiddenSelector} is listed, but it is hidden`,
  );
}
check(
  hard.facts.texts["#aria-hidden"] !== undefined,
  "#aria-hidden is drawn but not listed",
);
check(
  hard.facts.texts["#address"] ===
    "Line one of an address Line two of an address Line three",
  `#address snippet ${JSON.stringify(hard.facts.texts["#address"])}, expected lines joined by a space`,
);
const hardDesktop = hard.facts.viewports[0];
check(
  hardDesktop.text_blocks.some((block) => block.selector === "#last-heading"),
  "#last-heading is not listed, but headings come first",
);
check(
  hardDesktop.text_blocks_left_out > 0,
  `text_blocks_left_out ${hardDesktop.text_blocks_left_out}, expected more than 0`,
);
check(
  hardDesktop.left_edges.every((edge) => edge.blocks >= 2),
  "a left edge with fewer than 2 blocks is listed",
);
compareWithSample("evals/measure/hard-cases.html", hard);

// A local path with a hash picks one slide of a deck (FR-82, crit-3wg): hash-slides.html#2 shows
// only the heading of slide 2, and source records the path with its hash.
const slideTwo = await measureCommittedPage(
  "evals/measure/hash-slides.html#2",
  ["--desktop"],
);
const slideTwoSelectors = slideTwo.facts.viewports[0].text_blocks.map(
  (block) => block.selector,
);
check(
  JSON.stringify(slideTwoSelectors) === JSON.stringify(["#heading-two"]),
  `hash-slides.html#2 gave text blocks ${JSON.stringify(slideTwoSelectors)}, expected ["#heading-two"]`,
);
check(
  slideTwo.facts.source === "evals/measure/hash-slides.html#2",
  `hash-slides.html#2 recorded source ${slideTwo.facts.source}`,
);
check(
  validateFacts(slideTwo.facts),
  `the hash-slides.html#2 facts.json does not validate: ${JSON.stringify(validateFacts.errors)}`,
);

// A deck whose hash only scrolls (crit-3wg): hash-scroll.html#2 measures slide 2 alone, so the
// screenshot is the slide's 1280 x 800 px and the heading box is in the slide's pixels, 120 px from
// its top and left, though the body's 40 px padding puts the slide off the page origin.
const scrollTwo = await measureCommittedPage(
  "evals/measure/hash-scroll.html#2",
  ["--desktop"],
);
const scrollViewport = scrollTwo.facts.viewports[0];
const scrollBlocks = scrollViewport.text_blocks.map((block) => ({
  selector: block.selector,
  box: block.box,
}));
check(
  JSON.stringify(scrollBlocks) ===
    JSON.stringify([{ selector: "#heading-two", box: [120, 120, 1040, 60] }]),
  `hash-scroll.html#2 gave text blocks ${JSON.stringify(scrollBlocks)}, expected #heading-two at [120, 120, 1040, 60]`,
);
check(
  scrollViewport.page_width === 1280 && scrollViewport.page_height === 800,
  `hash-scroll.html#2 gave a page of ${scrollViewport.page_width} x ${scrollViewport.page_height}, expected 1280 x 800`,
);
const scrollPng = readFileSync(join(scrollTwo.outputFolder, "desktop.png"));
// A PNG holds its width and height as 4-byte big-endian numbers at bytes 16 and 20.
const scrollPngSize = [scrollPng.readUInt32BE(16), scrollPng.readUInt32BE(20)];
check(
  scrollPngSize[0] === 1280 && scrollPngSize[1] === 800,
  `hash-scroll.html#2 wrote a ${scrollPngSize.join(" x ")} screenshot, expected 1280 x 800`,
);
check(
  scrollTwo.facts.final_url === undefined,
  `hash-scroll.html#2 recorded final_url ${scrollTwo.facts.final_url}; a hash is not a redirect`,
);
check(
  validateFacts(scrollTwo.facts),
  `the hash-scroll.html#2 facts.json does not validate: ${JSON.stringify(validateFacts.errors)}`,
);

// A hash that names no element measures the whole page, with a note.
const scrollMissing = await measureCommittedPage(
  "evals/measure/hash-scroll.html#9",
  ["--desktop"],
);
const missingViewport = scrollMissing.facts.viewports[0];
check(
  missingViewport.text_blocks.length === 3 &&
    missingViewport.notes.some((note) => note.includes('"9"')),
  `hash-scroll.html#9 gave ${missingViewport.text_blocks.length} text blocks and notes ${JSON.stringify(missingViewport.notes)}, expected 3 and a note on id "9"`,
);

// --width: one viewport per width, named w<N>, and a facts.json that the schema accepts.
const widthRun = await runMeasureScript("evals/measure/known-values.html", [
  "--width",
  "768,1024",
]);
if (widthRun.exitCode === 0) {
  for (const fileName of ["w768.png", "w1024.png"]) {
    check(
      existsSync(join(widthRun.outputFolder, fileName)),
      `--width 768,1024 did not write ${fileName}`,
    );
  }
  const widthFacts = JSON.parse(
    readFileSync(join(widthRun.outputFolder, "facts.json"), "utf8"),
  );
  const widthNames = widthFacts.viewports.map((viewport) => viewport.name);
  check(
    JSON.stringify(widthNames) === JSON.stringify(["w768", "w1024"]),
    `--width 768,1024 gave viewports ${JSON.stringify(widthNames)}, expected ["w768","w1024"]`,
  );
  check(
    validateFacts(widthFacts),
    `the --width 768,1024 facts.json does not validate: ${JSON.stringify(validateFacts.errors)}`,
  );
} else {
  check(
    false,
    `--width 768,1024 gave exit ${widthRun.exitCode}: ${widthRun.lines.join(" | ")}`,
  );
}

// --dark: dark mode through the system setting, through a toggle, and none.
/** Checks that a --dark run's facts.json validates and records how dark mode was found. */
function checkDarkRun(label, measured, foundBy) {
  check(
    validateFacts(measured.facts),
    `${label}: facts.json does not validate: ${JSON.stringify(validateFacts.errors)}`,
  );
  check(
    measured.facts.dark_mode?.found_by === foundBy,
    `${label}: dark_mode ${JSON.stringify(measured.facts.dark_mode)}, expected found_by ${foundBy}`,
  );
  const darkEntry = measured.facts.viewports.find(
    (viewport) => viewport.name === "desktop-dark",
  );
  const darkPng = existsSync(join(measured.outputFolder, "desktop-dark.png"));
  if (foundBy === "none") {
    check(
      darkEntry === undefined && !darkPng,
      `${label}: wrote a desktop-dark entry or desktop-dark.png with no dark mode`,
    );
    check(
      measured.facts.notes.some((note) =>
        note.startsWith("--dark: no dark mode was found"),
      ),
      `${label}: no note says why there is no dark mode: ${JSON.stringify(measured.facts.notes)}`,
    );
  } else {
    check(
      darkEntry?.color_scheme === "dark" && darkPng,
      `${label}: no desktop-dark entry with color_scheme dark, or no desktop-dark.png`,
    );
  }
}

const knownDark = await measureCommittedPage(
  "evals/measure/known-values.html",
  ["--dark"],
);
checkDarkRun("known-values --dark", knownDark, "none");
const darkMedia = await measureCommittedPage("evals/measure/dark-media.html", [
  "--dark",
]);
checkDarkRun("dark-media --dark", darkMedia, "system_setting");
compareWithSample("evals/measure/dark-media.html", darkMedia);
const darkToggle = await measureCommittedPage(
  "evals/measure/dark-toggle.html",
  ["--dark"],
);
checkDarkRun("dark-toggle --dark", darkToggle, "toggle");
check(
  /dark mode/i.test(darkToggle.facts.dark_mode?.control?.name ?? ""),
  `dark-toggle --dark: control ${JSON.stringify(darkToggle.facts.dark_mode?.control)}, expected a name matching /dark mode/i`,
);
compareWithSample("evals/measure/dark-toggle.html", darkToggle);
const stillMoving = await measureCommittedPage(
  "evals/measure/still-moving.html",
  ["--dark"],
);
checkDarkRun("still-moving --dark", stillMoving, "none");
check(
  stillMoving.facts.final_url === undefined &&
    !stillMoving.factsText.includes("followed"),
  "still-moving --dark: the Theme link was followed",
);

const darkCovered = await measureCommittedPage(
  "evals/measure/dark-covered.html",
  ["--dark"],
);
checkDarkRun("dark-covered --dark", darkCovered, "none");
check(
  darkCovered.facts.notes.some((note) =>
    note.includes("the dark-mode check failed"),
  ),
  `dark-covered --dark: no note says the dark-mode check failed: ${JSON.stringify(darkCovered.facts.notes)}`,
);

const pulse = await measureCommittedPage("evals/measure/pulse.html", [
  "--desktop",
  "--dark",
]);
checkDarkRun("pulse --dark", pulse, "none");

// HTTP: a 404, a redirect, and a page that does not open.
const server = createServer((request, response) => {
  if (request.url === "/redirect") {
    response.writeHead(302, { location: "/page" });
    response.end();
  } else if (request.url === "/page") {
    response.writeHead(200, { "content-type": "text/html" });
    response.end("<!doctype html><p>Served page</p>");
  } else {
    response.writeHead(404, { "content-type": "text/html" });
    response.end("<!doctype html><p>Not found</p>");
  }
});
// Listening on port 0 makes the system pick a free port.
await new Promise((resolveListen) =>
  server.listen(0, "127.0.0.1", resolveListen),
);
const address = server.address();
const origin = `http://127.0.0.1:${typeof address === "object" && address !== null ? address.port : 0}`;
const notFound = await runMeasureScript(`${origin}/missing`);
check(
  notFound.exitCode === 3 && notFound.lines.length === 1,
  `a 404 page gave exit ${notFound.exitCode} and ${JSON.stringify(notFound.lines)}, expected exit 3 and one line`,
);
const redirected = await runMeasureScript(`${origin}/redirect`);
if (redirected.exitCode === 0) {
  const redirectedFacts = JSON.parse(
    readFileSync(join(redirected.outputFolder, "facts.json"), "utf8"),
  );
  check(
    redirectedFacts.final_url === `${origin}/page` &&
      redirectedFacts.notes.length === 2 &&
      redirectedFacts.notes[1].startsWith("the browser ended on"),
    `a redirect gave final_url ${redirectedFacts.final_url} and notes ${JSON.stringify(redirectedFacts.notes)}`,
  );
} else {
  check(
    false,
    `a redirect gave exit ${redirected.exitCode}: ${redirected.lines.join(" | ")}`,
  );
}
server.close();
const refused = await runMeasureScript("http://127.0.0.1:1/");
check(
  refused.exitCode === 3 && refused.lines.length === 1,
  `a page that does not open gave exit ${refused.exitCode} and ${JSON.stringify(refused.lines)}, expected exit 3 and one line`,
);

if (failures.length > 0) {
  for (const failure of failures) {
    console.log(`FAIL ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log("measure browser check passed");
}
