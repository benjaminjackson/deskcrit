#!/usr/bin/env node
// Checks a work order (PRD FR-80) for what its JSON Schema, schemas/work-order.schema.json, cannot
// check: that the ranked entries match the prose crit's ranked list one to one by rank, and that
// every pixel box comes from something real, the facts file or a crop, and is never invented. When
// the work order has `images`, the screenshots of one page at several viewports, it also checks each
// image and that each box lies inside the image of its viewport (crit-9w5.6). The
// work-order agent (agents/work-order.md) runs it on the file it wrote and fixes each problem it
// prints. It uses only Node's own modules, so the installed plugin needs no install step.
//
// Usage:
//   node work-order.mjs WORK_ORDER.json
//
// The work order names the crit file, the image, and the facts file; the script reads them.
// It prints `ok` when the work order passes, or one line per problem.
//
// Exit codes: 0 when it passes, 1 when it has a problem, 2 for a wrong command line or a work order
// it cannot read.

import { readFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const EXIT_PROBLEMS = 1;
const EXIT_WRONG_USE = 2;

const USAGE = "usage: node work-order.mjs WORK_ORDER.json";

/** The fields every finding must have; schemas/work-order.schema.json lists the same (a test checks it). */
export const FINDING_FIELDS = [
  "id",
  "rank",
  "kind",
  "title",
  "location",
  "viewer_experience",
  "current",
  "target",
  "fix_direction",
  "source",
  "closed_when",
];

/**
 * Returns the number of ranked items in the crit: the lines that start with a number and a period
 * at column 0, from the "What would move it most" heading, or the "Breaks" heading of a set
 * critic's crit (FR-82), up to the next line that starts with `**`. Returns undefined when the crit
 * has neither heading.
 */
export function countRankedItems(critText) {
  const lines = critText.split(/\r?\n/);
  let inSection = false;
  let found = false;
  let count = 0;
  for (const line of lines) {
    if (line.startsWith("**")) {
      // A curly apostrophe or a trailing period or colon may follow the heading words.
      inSection =
        line.startsWith("**What would move it most") ||
        line.startsWith("**Breaks");
      if (inSection) {
        found = true;
      }
      continue;
    }
    if (inSection && /^\d+\.\s/.test(line)) {
      count += 1;
    }
  }
  return found ? count : undefined;
}

/** Returns [width, height] of a PNG from its header, or undefined when the bytes are not a PNG. */
export function pngSize(bytes) {
  const signature = "89504e470d0a1a0a";
  if (bytes.length < 24 || bytes.subarray(0, 8).toString("hex") !== signature) {
    return undefined;
  }
  // The IHDR chunk starts at byte 8; its width and height are the 4-byte numbers at 16 and 20.
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

/** Returns true when two boxes [x, y, width, height] are equal. */
function sameBox(first, second) {
  return (
    Array.isArray(first) &&
    Array.isArray(second) &&
    first.length === 4 &&
    second.length === 4 &&
    first.every((value, index) => value === second[index])
  );
}

/**
 * Returns every box the facts file gives for a selector in one viewport: from the text blocks,
 * the targets, and the violations.
 */
function factsBoxes(viewport, selector) {
  const lists = [viewport.text_blocks, viewport.targets, viewport.violations];
  const boxes = [];
  for (const list of lists) {
    for (const entry of Array.isArray(list) ? list : []) {
      if (entry.selector === selector) {
        boxes.push(entry.box);
      }
    }
  }
  return boxes;
}

/**
 * Checks one finding's location and returns its problems. `readFile` reads a file as bytes and
 * returns undefined when it cannot.
 */
function checkLocation(finding, image, facts, readFile) {
  const problems = [];
  const label = `finding ${finding.id}`;
  const location = finding.location ?? {};
  const box = location.box;
  if (Array.isArray(box)) {
    const [x, y, width, height] = box;
    const inside =
      x >= 0 &&
      y >= 0 &&
      width > 0 &&
      height > 0 &&
      x + width <= image.width &&
      y + height <= image.height;
    if (!inside) {
      problems.push(
        `${label}: box ${JSON.stringify(box)} is not inside the image`,
      );
    }
  }
  if (location.box_source === "facts") {
    const viewport = facts?.viewports?.find(
      (candidate) => candidate.name === location.viewport,
    );
    if (viewport === undefined) {
      problems.push(
        `${label}: box_source is facts, but the facts file has no viewport ${location.viewport}`,
      );
    } else {
      const boxes = factsBoxes(viewport, location.selector);
      if (boxes.length === 0) {
        problems.push(
          `${label}: the facts file has no selector ${location.selector} in ${location.viewport}`,
        );
      } else if (!boxes.some((candidate) => sameBox(candidate, box))) {
        problems.push(
          `${label}: box ${JSON.stringify(box)} is not the facts box of ${location.selector}, ${JSON.stringify(boxes[0])}`,
        );
      }
    }
  }
  if (location.box_source === "crop") {
    const viewport = facts?.viewports?.find(
      (candidate) => candidate.name === location.viewport,
    );
    const cropName = basename(String(location.crop));
    const factsCrop = viewport?.crops?.find((crop) => crop.file === cropName);
    if (factsCrop !== undefined) {
      if (!sameBox(factsCrop.box, box)) {
        problems.push(
          `${label}: box ${JSON.stringify(box)} is not the facts box of crop ${cropName}, ${JSON.stringify(factsCrop.box)}`,
        );
      }
    } else {
      // A crop that crop.mjs wrote is the box it was given, clamped to the image, at full size.
      const cropBytes = readFile(location.crop);
      const size = cropBytes === undefined ? undefined : pngSize(cropBytes);
      if (size === undefined) {
        problems.push(`${label}: cannot read the crop ${location.crop}`);
      } else if (
        !Array.isArray(box) ||
        size[0] !== box[2] ||
        size[1] !== box[3]
      ) {
        problems.push(
          `${label}: the crop ${location.crop} is ${size[0]} x ${size[1]} px, not the size of box ${JSON.stringify(box)}`,
        );
      }
    }
  }
  return problems;
}

/**
 * Checks a parsed work order against the crit text, the image size, and the parsed facts file
 * (or undefined), and returns the problems. An empty list means it passes.
 */
export function checkWorkOrder(
  workOrder,
  critText,
  imageSize,
  facts,
  readFile,
) {
  const problems = [];
  const findings = Array.isArray(workOrder?.findings) ? workOrder.findings : [];
  if (!Array.isArray(workOrder?.findings)) {
    problems.push("findings is not a list");
  }
  const image = workOrder?.image ?? {};
  const hasImages = Array.isArray(workOrder?.images);
  // With images, checkViewports checks every image, the first one included, so a wrong size of
  // image gives one problem line, not two.
  if (!hasImages) {
    if (imageSize === undefined) {
      problems.push(`cannot read the image ${image.path} as a PNG`);
    } else if (image.width !== imageSize[0] || image.height !== imageSize[1]) {
      problems.push(
        `image is ${imageSize[0]} x ${imageSize[1]} px, but the work order says ${image.width} x ${image.height}`,
      );
    }
  }
  const seenIds = new Set();
  for (const finding of findings) {
    const missing = FINDING_FIELDS.filter((field) => !(field in finding));
    if (missing.length > 0) {
      problems.push(`finding ${finding.id}: missing ${missing.join(", ")}`);
    }
    if (seenIds.has(finding.id)) {
      problems.push(`finding ${finding.id}: the id is used twice`);
    }
    seenIds.add(finding.id);
  }
  const ranks = findings.map((finding) => finding.rank);
  const rankedCount = ranks.filter((rank) => rank !== null).length;
  const expectedRanks = Array.from(
    { length: rankedCount },
    (_, index) => index + 1,
  );
  const rankedFirst = ranks.slice(0, rankedCount);
  if (!sameList(rankedFirst, expectedRanks)) {
    problems.push(
      `the ranked findings must come first with ranks 1 to ${rankedCount} in order; the ranks are ${JSON.stringify(ranks)}`,
    );
  }
  const critCount = countRankedItems(critText);
  if (critCount === undefined) {
    problems.push(
      'the crit has no "What would move it most" or "Breaks" heading',
    );
  } else if (critCount !== rankedCount) {
    problems.push(
      `the crit ranks ${critCount} findings, but the work order ranks ${rankedCount}`,
    );
  }
  if (hasImages) {
    problems.push(...checkViewports(workOrder, findings, facts, readFile));
    return problems;
  }
  for (const finding of findings) {
    if (finding.location?.viewports !== undefined) {
      problems.push(
        `finding ${finding.id}: has location.viewports, but the work order has no images`,
      );
    }
  }
  if (imageSize !== undefined) {
    const imageBox = { width: imageSize[0], height: imageSize[1] };
    for (const finding of findings) {
      problems.push(...checkLocation(finding, imageBox, facts, readFile));
    }
  }
  return problems;
}

/**
 * Checks a work order that has an `images` list, the screenshots of one page at several viewports
 * that the critic judged in one crit (FR-85, crit-9w5.6), and returns the problems. Each image must
 * be the size it says, the images must be the facts file viewports in the same order, each named
 * once, and a facts file must exist; each finding names the viewports it applies
 * to, its `location.viewport` is one of them, and its box lies inside that viewport's image.
 */
function checkViewports(workOrder, findings, facts, readFile) {
  const problems = [];
  const images = workOrder.images;
  const first = images[0] ?? {};
  const image = workOrder.image ?? {};
  if (
    first.path !== image.path ||
    first.width !== image.width ||
    first.height !== image.height
  ) {
    problems.push("image is not the first entry of images");
  }
  // The size of each viewport's image, by viewport name, as read from the PNG file.
  const sizes = new Map();
  for (const entry of images) {
    const bytes = readFile(entry.path);
    const size = bytes === undefined ? undefined : pngSize(bytes);
    if (size === undefined) {
      problems.push(`cannot read the image ${entry.path} as a PNG`);
    } else if (entry.width !== size[0] || entry.height !== size[1]) {
      problems.push(
        `image ${entry.path} is ${size[0]} x ${size[1]} px, but the work order says ${entry.width} x ${entry.height}`,
      );
    } else {
      sizes.set(entry.viewport, { width: size[0], height: size[1] });
    }
  }
  const imageNames = images.map((entry) => entry.viewport);
  const names = new Set(imageNames);
  for (const name of names) {
    const count = imageNames.filter((candidate) => candidate === name).length;
    if (count > 1) {
      problems.push(`viewport ${name} is in images twice`);
    }
  }
  if (facts === undefined) {
    problems.push("images needs a facts file, but facts_file is null");
  } else {
    // The images must be the facts file viewports, in the same order, because the critic got the
    // screenshots in that order.
    const factsNames = (facts.viewports ?? []).map((viewport) => viewport.name);
    if (!sameList(imageNames, factsNames)) {
      problems.push(
        `the viewports of images are ${imageNames.join(", ")}, but the facts file has ${factsNames.join(", ")}`,
      );
    }
  }
  for (const finding of findings) {
    const label = `finding ${finding.id}`;
    const location = finding.location ?? {};
    const viewports = location.viewports;
    if (!Array.isArray(viewports)) {
      problems.push(`${label}: has no location.viewports`);
      continue;
    }
    for (const name of viewports) {
      if (!names.has(name)) {
        problems.push(`${label}: viewport ${name} is not in images`);
      }
    }
    if (location.viewport !== null && !viewports.includes(location.viewport)) {
      problems.push(
        `${label}: location.viewport ${location.viewport} is not in location.viewports`,
      );
      continue;
    }
    // The box is in the pixels of the image of location.viewport, or of the first image when the
    // finding has no viewport.
    const boxImage = sizes.get(location.viewport ?? first.viewport);
    if (boxImage !== undefined) {
      problems.push(...checkLocation(finding, boxImage, facts, readFile));
    }
  }
  return problems;
}

/** Returns true when two lists hold the same values in the same order. */
function sameList(first, second) {
  return (
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  );
}

/** Reads a file as bytes, or returns undefined when it cannot. */
function readBytes(path) {
  try {
    return readFileSync(path);
  } catch {
    return undefined;
  }
}

/** Runs the command line and returns the lines to print and the exit code. */
export function run(commandArguments) {
  if (commandArguments.length !== 1 || commandArguments[0].startsWith("-")) {
    return { lines: [USAGE], exitCode: EXIT_WRONG_USE };
  }
  const workOrderPath = resolve(commandArguments[0]);
  let workOrder;
  try {
    workOrder = JSON.parse(readFileSync(workOrderPath, "utf8"));
  } catch (error) {
    return {
      lines: [`cannot read the work order: ${error.message}`],
      exitCode: EXIT_WRONG_USE,
    };
  }
  // Relative paths in the work order are read from the work order's folder.
  const folder = dirname(workOrderPath);
  const critBytes = readBytes(resolve(folder, String(workOrder.crit_file)));
  if (critBytes === undefined) {
    return {
      lines: [`cannot read the crit file ${workOrder.crit_file}`],
      exitCode: EXIT_WRONG_USE,
    };
  }
  const imageBytes = readBytes(resolve(folder, String(workOrder.image?.path)));
  const imageSize = imageBytes === undefined ? undefined : pngSize(imageBytes);
  let facts;
  if (typeof workOrder.facts_file === "string") {
    const factsBytes = readBytes(resolve(folder, workOrder.facts_file));
    if (factsBytes === undefined) {
      return {
        lines: [`cannot read the facts file ${workOrder.facts_file}`],
        exitCode: EXIT_WRONG_USE,
      };
    }
    facts = JSON.parse(factsBytes.toString("utf8"));
  }
  const problems = checkWorkOrder(
    workOrder,
    critBytes.toString("utf8"),
    imageSize,
    facts,
    (path) => readBytes(resolve(folder, String(path))),
  );
  if (problems.length > 0) {
    return { lines: problems, exitCode: EXIT_PROBLEMS };
  }
  return { lines: ["ok"], exitCode: 0 };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { lines, exitCode } = run(process.argv.slice(2));
  process.stdout.write(`${lines.join("\n")}\n`);
  process.exitCode = exitCode;
}
