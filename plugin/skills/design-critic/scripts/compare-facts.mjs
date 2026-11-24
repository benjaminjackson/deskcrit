#!/usr/bin/env node
// Compares the measured facts files (FR-79) of the pages of one set and writes the differences
// across pages as numbers (FR-84): the main content left edge, the width of the main text block,
// the type sizes in use, and the text colors in use. A value that every page shares is not a
// difference. Pages are numbered from 1 in the order of the arguments, like the tiles of the
// contact sheet. Node's own modules only, so the installed plugin needs no install step.
import { readFileSync, writeFileSync } from "node:fs";

export const EXIT_USAGE = 2;
export const USAGE =
  "usage: node compare-facts.mjs FACTS.json FACTS.json ... --out FILE [--viewport desktop|phone|tablet|widescreen|wN, each with an optional -dark]";

/**
 * The viewport names this script compares. It mirrors the `viewports[].name` rule of
 * schemas/facts.schema.json (FR-85): the four default names and w<N> for a width given with
 * --width, each with an optional `-dark` suffix for the dark entry that --dark writes.
 */
const VIEWPORT_NAME =
  /^(desktop|phone|tablet|widescreen|w[1-9][0-9]{2,3})(-dark)?$/;

/** Two edges or widths within this many px are the same value, as in measure.mjs left_edges. */
const SAME_WITHIN_PX = 1;

/**
 * Finds the first text block of a viewport that satisfies a test, for the selector and box.
 * @returns {{ selector: string | null, box: number[] | null }}
 */
function findBlock(viewport, test) {
  const block = viewport.text_blocks.find(test);
  return { selector: block?.selector ?? null, box: block?.box ?? null };
}

/** The left edge that the most text blocks share; on a tie the smallest x. */
function mainLeftEdge(viewport) {
  let best = null;
  for (const edge of viewport.left_edges) {
    if (best === null || edge.blocks > best.blocks) best = edge;
  }
  return best?.x ?? null;
}

/** The text block that holds the most characters (lines times characters per line), or null. */
function mainTextBlock(viewport) {
  let best = null;
  let bestSize = 0;
  for (const block of viewport.text_blocks) {
    const size = block.lines * (block.characters_per_line ?? 0);
    if (size > bestSize) {
      best = block;
      bestSize = size;
    }
  }
  return best;
}

/**
 * Builds the differences across pages.
 * @param {{ file: string, viewport: object }[]} pages in tile order
 * @returns {object[]}
 */
export function compareViewports(pages) {
  const differences = [];
  const entry = (index, value, found = { selector: null, box: null }) => ({
    page: index + 1,
    file: pages[index].file,
    value,
    selector: found.selector,
    box: found.box,
  });

  // Content left edge: the edge most blocks share on each page.
  const edges = pages.map((page) => mainLeftEdge(page.viewport));
  const knownEdges = edges.filter((edge) => edge !== null);
  if (
    Math.max(...knownEdges) - Math.min(...knownEdges) > SAME_WITHIN_PX ||
    knownEdges.length < pages.length
  ) {
    differences.push({
      kind: "left_edge",
      what: "x of the left edge that most text blocks share, in px",
      pages: pages.map((page, index) =>
        entry(
          index,
          edges[index],
          findBlock(page.viewport, (block) => block.box[0] === edges[index]),
        ),
      ),
    });
  }

  // Content width: the width of the text block with the most text.
  const blocks = pages.map((page) => mainTextBlock(page.viewport));
  const widths = blocks.map((block) => block?.box[2] ?? null);
  const knownWidths = widths.filter((width) => width !== null);
  if (
    Math.max(...knownWidths) - Math.min(...knownWidths) > SAME_WITHIN_PX ||
    knownWidths.length < pages.length
  ) {
    differences.push({
      kind: "content_width",
      what: "width of the text block with the most text, in px",
      pages: pages.map((_, index) =>
        entry(index, widths[index], {
          selector: blocks[index]?.selector ?? null,
          box: blocks[index]?.box ?? null,
        }),
      ),
    });
  }

  // Type sizes and colors: one difference per value that some page uses and another does not.
  const sizeSets = pages.map(
    (page) => new Set(page.viewport.type_sizes.map((row) => row.size)),
  );
  const allSizes = [...new Set(sizeSets.flatMap((set) => [...set]))].sort(
    (a, b) => b - a,
  );
  for (const size of allSizes) {
    if (sizeSets.every((set) => set.has(size))) continue;
    differences.push({
      kind: "type_size",
      what: `font size ${size} px is used on some pages and not on others`,
      pages: pages.map((page, index) =>
        sizeSets[index].has(size)
          ? entry(
              index,
              size,
              findBlock(page.viewport, (block) => block.font_size === size),
            )
          : entry(index, null),
      ),
    });
  }

  const colorSets = pages.map(
    (page) => new Set(page.viewport.text_colors.map((row) => row.color)),
  );
  const allColors = [...new Set(colorSets.flatMap((set) => [...set]))].sort();
  for (const color of allColors) {
    if (colorSets.every((set) => set.has(color))) continue;
    differences.push({
      kind: "text_color",
      what: `text color ${color} is used on some pages and not on others`,
      pages: pages.map((page, index) => {
        if (!colorSets[index].has(color)) return entry(index, null);
        const row = page.viewport.text_colors.find(
          (candidate) => candidate.color === color,
        );
        return entry(
          index,
          color,
          findBlock(page.viewport, (block) => block.selector === row.example),
        );
      }),
    });
  }
  return differences;
}

/** Reads the arguments, compares, writes the file. Returns the exit code. */
export function runCompare(argv) {
  const files = [];
  let outFile = null;
  let viewportName = "desktop";
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--out") {
      index += 1;
      outFile = argv[index] ?? null;
    } else if (argv[index] === "--viewport") {
      index += 1;
      viewportName = argv[index] ?? "";
    } else {
      files.push(argv[index]);
    }
  }
  if (files.length < 2 || !outFile || !VIEWPORT_NAME.test(viewportName)) {
    console.error(USAGE);
    return EXIT_USAGE;
  }
  const pages = [];
  for (const file of files) {
    let facts;
    try {
      facts = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      console.error(USAGE);
      return EXIT_USAGE;
    }
    const viewport = facts?.viewports?.find(
      (candidate) => candidate.name === viewportName,
    );
    if (!viewport) {
      console.error(`${USAGE} (no viewport ${viewportName} in ${file})`);
      return EXIT_USAGE;
    }
    pages.push({ file, viewport });
  }
  const result = {
    version: 1,
    viewport: viewportName,
    pages: pages.map((page, index) => ({ page: index + 1, file: page.file })),
    differences: compareViewports(pages),
  };
  writeFileSync(outFile, `${JSON.stringify(result, null, 2)}\n`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = runCompare(process.argv.slice(2));
}
