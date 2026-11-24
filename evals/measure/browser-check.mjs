// The browser test of measure.mjs (PRD FR-79). It measures two committed pages with the real
// script and Chromium and checks what each must give:
//   known-values.html: 16 px Inter, 40 characters per line within 2, contrast 21 and 4.48, three
//   cases with no contrast number, a hidden block left out, a 120 x 40 px button, light mode, and
//   the desktop violations list: exactly #gray, #long, #pair-a, and #pair-b, with the exempt cases out.
//   hard-cases.html: the cases from the review of crit-0a0.1, listed at the top of that page.
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
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const measureScript = "plugin/skills/design-critic/scripts/measure.mjs";
const failures = [];

/** Records a failure when the condition is false. */
function check(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

/**
 * Runs measure.mjs on a page into a new temp folder, and resolves with its exit code, its output
 * lines, and the folder. It runs the child without blocking, so the HTTP server in this process
 * can answer the child's browser.
 */
function runMeasureScript(page) {
  const outputFolder = mkdtempSync(join(tmpdir(), "measure-browser-check-"));
  return new Promise((resolveRun) => {
    const child = spawn(
      process.execPath,
      [measureScript, page, "--out", outputFolder],
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

/** Measures a committed page, and returns its facts and the text of its facts.json. */
async function measureCommittedPage(page) {
  const run = await runMeasureScript(page);
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
