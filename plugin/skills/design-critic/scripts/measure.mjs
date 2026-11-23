#!/usr/bin/env node
// Renders a web page and measures it, so the design critic can state degree as a number ("body
// text is 13 px at 96 characters per line, contrast 3.1:1") and give a location a coding agent can
// act on (a CSS selector and a pixel box), where from an image alone it judges by eye (PRD FR-79).
//
// Usage:
//   node measure.mjs PAGE [--out FOLDER]
//
// PAGE is a local HTML file or an http(s) URL. It writes, into FOLDER or a new folder in the system
// temp folder: desktop.png (1280 px wide) and phone.png (390 px wide), both full-page screenshots
// at device scale factor 1; one-screen crops of each through crop.mjs, named desktop-01.png and so
// on; and facts.json, which schemas/facts.schema.json describes. It prints one line per file.
//
// It uses Playwright, which it never installs. It looks for `playwright` first in the project of
// the working directory, then in packs/ of the deskcrit checkout that holds this script. It opens
// the page in a new browser context with no cookies, follows no link, and runs no script of its own
// in the page other than code that reads layout and styles and scrolls the window.
//
// Exit codes: 0 when it measured, 2 for a wrong command line, 3 when it cannot measure (Playwright
// or its Chromium is missing, the page cannot be opened). On codes 2 and 3 it prints exactly one line.

import { existsSync, mkdirSync, mkdtempSync, realpathSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { decodePng, encodeCrop, OVERLAP_FRACTION } from "./crop.mjs";

/** The version of the facts.json format; schemas/facts.schema.json requires this value. */
export const FACTS_VERSION = 1;

/** The two viewports: a laptop screen and a common phone, both at device scale factor 1. */
export const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "phone", width: 390, height: 844 },
];

/** At most this many text blocks per viewport go into the file, so it fits a critic's context. */
export const MAX_TEXT_BLOCKS = 60;

/** At most this many interactive targets per viewport go into the file. */
export const MAX_TARGETS = 60;

/** The first this many characters of a block's text go into the file, so the reader can tell which block it is. */
export const TEXT_SNIPPET_LENGTH = 60;

/** Characters per line is measured on at most this many characters of a block, so a huge block cannot stall the run. */
export const MAX_MEASURED_CHARACTERS = 1500;

/** How long to wait for the page's load event before measuring what is there. */
const LOAD_TIMEOUT_MS = 30_000;

/** How long to wait for the network to go quiet and for web fonts after the load event. */
const SETTLE_TIMEOUT_MS = 5_000;

export const EXIT_USAGE = 2;
export const EXIT_CANNOT_MEASURE = 3;

const USAGE =
  "usage: node measure.mjs PAGE [--out FOLDER]   (PAGE is an HTML file or an http(s) URL)";

const PLAYWRIGHT_MISSING =
  "Playwright is not installed; run `npm install playwright` and `npx playwright install chromium` in your project, or critique the image alone.";

/** An error whose message says why the script cannot measure; it prints it after "cannot measure: ". */
export class MeasureRefusal extends Error {}

// ---------------------------------------------------------------------------------------------
// Pure functions: color, contrast, lines, and grouping. The tests call these without a browser.
// ---------------------------------------------------------------------------------------------

/**
 * Reads a computed CSS color as Chromium writes it, `rgb(r, g, b)` or `rgba(r, g, b, a)`, into
 * channels of 0 to 255 and an alpha of 0 to 1. It returns null for any other form, such as
 * `oklch(...)` or `color(srgb ...)`, so the caller marks contrast not measurable instead of guessing.
 *
 * @param {string} text
 * @returns {{ red: number, green: number, blue: number, alpha: number } | null}
 */
export function parseCssColor(text) {
  const match =
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/.exec(
      text.trim(),
    );
  if (match === null) {
    return null;
  }
  let alpha = 1;
  const alphaText = match[4];
  if (alphaText !== undefined) {
    if (alphaText.endsWith("%")) {
      alpha = Number.parseFloat(alphaText) / 100;
    } else {
      alpha = Number.parseFloat(alphaText);
    }
  }
  return {
    red: Number(match[1]),
    green: Number(match[2]),
    blue: Number(match[3]),
    alpha,
  };
}

/**
 * Paints a color with alpha over another color ("source over" compositing) and returns the color
 * the eye sees. When the bottom color is opaque, the result is opaque.
 *
 * @param {{ red: number, green: number, blue: number, alpha: number }} top
 * @param {{ red: number, green: number, blue: number, alpha: number }} bottom
 */
export function compositeColor(top, bottom) {
  const alpha = top.alpha + bottom.alpha * (1 - top.alpha);
  if (alpha === 0) {
    return { red: 0, green: 0, blue: 0, alpha: 0 };
  }
  /** Mixes one channel by the two alphas. */
  function mixChannel(topValue, bottomValue) {
    return (
      (topValue * top.alpha + bottomValue * bottom.alpha * (1 - top.alpha)) /
      alpha
    );
  }
  return {
    red: mixChannel(top.red, bottom.red),
    green: mixChannel(top.green, bottom.green),
    blue: mixChannel(top.blue, bottom.blue),
    alpha,
  };
}

/**
 * Returns the WCAG 2 relative luminance of an opaque color: each sRGB channel is linearized, then
 * weighted 0.2126, 0.7152, and 0.0722.
 *
 * @param {{ red: number, green: number, blue: number }} color
 */
export function relativeLuminance(color) {
  /** Turns one 0-255 sRGB channel into linear light, by the WCAG 2 formula. */
  function linearize(value) {
    const fraction = value / 255;
    if (fraction <= 0.04045) {
      return fraction / 12.92;
    }
    return ((fraction + 0.055) / 1.055) ** 2.4;
  }
  return (
    0.2126 * linearize(color.red) +
    0.7152 * linearize(color.green) +
    0.0722 * linearize(color.blue)
  );
}

/**
 * Returns the WCAG 2 contrast ratio of two opaque colors, (lighter + 0.05) / (darker + 0.05),
 * rounded to two decimals: 21 for black on white, 4.48 for #777777 on white.
 *
 * @param {{ red: number, green: number, blue: number }} first
 * @param {{ red: number, green: number, blue: number }} second
 */
export function contrastRatio(first, second) {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

/**
 * Writes a color as #rrggbb, or #rrggbbaa when it is not opaque.
 *
 * @param {{ red: number, green: number, blue: number, alpha: number }} color
 */
export function formatHexColor(color) {
  /** Writes one 0-255 value as two hex digits. */
  function toHex(value) {
    return Math.round(value).toString(16).padStart(2, "0");
  }
  let hex = `#${toHex(color.red)}${toHex(color.green)}${toHex(color.blue)}`;
  if (color.alpha < 1) {
    hex += toHex(color.alpha * 255);
  }
  return hex;
}

/**
 * Finds the background behind one point of text from the layers the browser paints there, top
 * first, starting at the element that holds the text. It composites alpha colors until it reaches
 * an opaque one, and falls back to the page canvas color. It returns a reason instead of a color
 * when an image, a gradient, or a replaced element (img, video, canvas, svg) lies on the way,
 * because a single color would then be a wrong number.
 *
 * @param {{ backgroundColor: string, hasImage: boolean, replaced: boolean }[]} layers top first
 * @param {string} canvasColor the color the page canvas shows where no element paints
 * @returns {{ color: { red: number, green: number, blue: number, alpha: number } } | { reason: string }}
 */
export function resolveBackground(layers, canvasColor) {
  const colorsTopFirst = [];
  let reachedOpaque = false;
  for (const layer of layers) {
    if (layer.hasImage || layer.replaced) {
      return { reason: "not measurable: background image" };
    }
    const color = parseCssColor(layer.backgroundColor);
    if (color === null) {
      return {
        reason: `not measurable: color format ${layer.backgroundColor}`,
      };
    }
    if (color.alpha > 0) {
      colorsTopFirst.push(color);
    }
    if (color.alpha >= 1) {
      reachedOpaque = true;
      break;
    }
  }
  let result = { red: 255, green: 255, blue: 255, alpha: 1 };
  if (!reachedOpaque) {
    const canvas = parseCssColor(canvasColor);
    if (canvas !== null && canvas.alpha >= 1) {
      result = canvas;
    }
  }
  // Paint from the bottom up: start from the lowest color and lay each higher one over it.
  for (let index = colorsTopFirst.length - 1; index >= 0; index--) {
    const color = colorsTopFirst[index];
    if (color !== undefined) {
      result = compositeColor(color, result);
    }
  }
  return { color: result };
}

/**
 * Groups the rendered characters of one text block into lines and counts characters per line.
 * Each character is its own rectangle, in document order; a character starts a new line when its
 * vertical center is outside the top and bottom of the line so far. Characters per line is the
 * mean count of every line except the last, because the last line of a paragraph is usually short
 * and would pull the mean down; a one-line block reports its own length.
 *
 * @param {{ top: number, bottom: number }[]} characterRects
 * @returns {{ lines: number, charactersPerLine: number | null }}
 */
export function measureLines(characterRects) {
  const counts = [];
  let lineTop = 0;
  let lineBottom = 0;
  for (const rect of characterRects) {
    const center = (rect.top + rect.bottom) / 2;
    const onCurrentLine =
      counts.length > 0 && center >= lineTop && center <= lineBottom;
    if (onCurrentLine) {
      counts[counts.length - 1] += 1;
      lineTop = Math.min(lineTop, rect.top);
      lineBottom = Math.max(lineBottom, rect.bottom);
    } else {
      counts.push(1);
      lineTop = rect.top;
      lineBottom = rect.bottom;
    }
  }
  if (counts.length === 0) {
    return { lines: 0, charactersPerLine: null };
  }
  if (counts.length === 1) {
    return { lines: 1, charactersPerLine: counts[0] ?? null };
  }
  let total = 0;
  for (const count of counts.slice(0, -1)) {
    total += count;
  }
  const mean = total / (counts.length - 1);
  return {
    lines: counts.length,
    charactersPerLine: Math.round(mean * 10) / 10,
  };
}

/**
 * Groups numbers that lie within `tolerance` of the one before them in sorted order, and returns
 * one entry per group with its smallest value and how many numbers fell in it, sorted by value.
 *
 * @param {number[]} values
 * @param {number} tolerance
 * @returns {{ value: number, count: number }[]}
 */
export function clusterValues(values, tolerance) {
  const sorted = [...values].sort((first, second) => first - second);
  const groups = [];
  let previous = Number.NEGATIVE_INFINITY;
  for (const value of sorted) {
    const last = groups[groups.length - 1];
    if (last !== undefined && value - previous <= tolerance) {
      last.count += 1;
    } else {
      groups.push({ value, count: 1 });
    }
    previous = value;
  }
  return groups;
}

/** Rounds a number to one decimal place. */
function roundToTenth(value) {
  return Math.round(value * 10) / 10;
}

/** Turns a box of fractional pixels into [x, y, width, height] in whole pixels of the screenshot. */
function toPixelBox(box) {
  return [
    Math.round(box.x),
    Math.round(box.y),
    Math.round(box.width),
    Math.round(box.height),
  ];
}

/**
 * Works out the contrast of one text block from what the browser read at up to three points of its
 * text. The text color is composited over the background; the lowest ratio of the points is kept.
 * It returns `contrast: null` with a reason whenever one number would be wrong.
 *
 * @param {object} rawBlock the block as the browser read it
 * @param {string} canvasColor
 * @returns {{ contrast: number | null, contrast_note?: string, background?: string }}
 */
export function measureContrast(rawBlock, canvasColor) {
  if (rawBlock.textFill) {
    return {
      contrast: null,
      contrast_note: "not measurable: image or gradient text fill",
    };
  }
  if (rawBlock.paintEffect !== null) {
    return {
      contrast: null,
      contrast_note: `not measurable: ${rawBlock.paintEffect}`,
    };
  }
  const textColor = parseCssColor(rawBlock.color);
  if (textColor === null) {
    return {
      contrast: null,
      contrast_note: `not measurable: color format ${rawBlock.color}`,
    };
  }
  if (rawBlock.samples.length === 0) {
    return {
      contrast: null,
      contrast_note: "not measurable: no visible character to sample",
    };
  }
  let lowest = null;
  let lowestBackground = null;
  for (const sample of rawBlock.samples) {
    if (!sample.found) {
      return {
        contrast: null,
        contrast_note: "not measurable: text not found at its own position",
      };
    }
    if (sample.covered) {
      return {
        contrast: null,
        contrast_note: "not measurable: covered by another element",
      };
    }
    const background = resolveBackground(sample.layers, canvasColor);
    if ("reason" in background) {
      return { contrast: null, contrast_note: background.reason };
    }
    const seenText = compositeColor(textColor, background.color);
    const ratio = contrastRatio(seenText, background.color);
    if (lowest === null || ratio < lowest) {
      lowest = ratio;
      lowestBackground = background.color;
    }
  }
  const result = { contrast: lowest };
  if (lowestBackground !== null) {
    result.background = formatHexColor(lowestBackground);
  }
  return result;
}

/**
 * Counts values by a key and returns one entry per distinct key, most frequent first, then by key.
 *
 * @template T
 * @param {T[]} items
 * @param {(item: T) => string | number} readKey
 * @returns {{ key: string | number, count: number, first: T }[]}
 */
function countByKey(items, readKey) {
  const counts = new Map();
  for (const item of items) {
    const key = readKey(item);
    const entry = counts.get(key);
    if (entry === undefined) {
      counts.set(key, { key, count: 1, first: item });
    } else {
      entry.count += 1;
    }
  }
  const entries = [...counts.values()];
  entries.sort((first, second) => {
    if (second.count !== first.count) {
      return second.count - first.count;
    }
    return String(first.key) < String(second.key) ? -1 : 1;
  });
  return entries;
}

/**
 * Turns what the browser read in one viewport into that viewport's part of facts.json: the text
 * blocks with their measured values, and the page facts (type sizes, colors, spacing, left edges,
 * and interactive targets). It also returns each block's text snippet, which the file keeps once.
 *
 * @param {object} raw what readPage returned, with each block's rendered font family filled in
 * @returns {{ viewport: object, texts: Map<string, string> }}
 */
export function summarizeViewport(raw) {
  const texts = new Map();
  const textBlocks = [];
  for (const rawBlock of raw.blocks) {
    texts.set(rawBlock.selector, rawBlock.text);
    const lines = measureLines(rawBlock.characterRects);
    const fontSize = roundToTenth(rawBlock.fontSize);
    let lineHeight = null;
    if (rawBlock.lineHeight !== null) {
      lineHeight = roundToTenth(rawBlock.lineHeight);
    }
    const block = {
      selector: rawBlock.selector,
      box: toPixelBox(rawBlock.box),
      font_family: rawBlock.renderedFamily ?? rawBlock.fontFamily,
      font_size: fontSize,
      font_weight: rawBlock.fontWeight,
      line_height: lineHeight,
      line_height_ratio:
        lineHeight === null
          ? null
          : Math.round((lineHeight / fontSize) * 100) / 100,
      lines: lines.lines,
      characters_per_line: lines.charactersPerLine,
      color: rawBlock.colorHex,
      ...measureContrast(rawBlock, raw.canvasColor),
    };
    const notes = [...rawBlock.notes];
    if (rawBlock.renderedFamily === null) {
      notes.push("rendered font unknown: font_family is the declared list");
    } else if (rawBlock.firstDeclaredFamily !== null) {
      const declared = rawBlock.firstDeclaredFamily.toLowerCase();
      const isGeneric = [
        "serif",
        "sans-serif",
        "monospace",
        "cursive",
        "fantasy",
        "system-ui",
      ].includes(declared);
      if (!isGeneric && rawBlock.renderedFamily.toLowerCase() !== declared) {
        notes.push(
          `first declared family ${rawBlock.firstDeclaredFamily} is not the one drawn`,
        );
      }
    }
    if (rawBlock.lineHeight === null) {
      notes.push("line height is normal and the block has one line");
    }
    if (notes.length > 0) {
      block.notes = notes;
    }
    textBlocks.push(block);
  }

  const typeSizes = [];
  const sizeGroups = new Map();
  for (const summary of raw.allBlocks) {
    const size = roundToTenth(summary.fontSize);
    const group = sizeGroups.get(size) ?? { size, blocks: 0, characters: 0 };
    group.blocks += 1;
    group.characters += summary.characters;
    sizeGroups.set(size, group);
  }
  for (const group of sizeGroups.values()) {
    typeSizes.push(group);
  }
  typeSizes.sort((first, second) => second.size - first.size);

  const textColors = [];
  for (const entry of countByKey(
    raw.allBlocks,
    (summary) => summary.colorHex,
  )) {
    textColors.push({
      color: entry.key,
      blocks: entry.count,
      example: entry.first.selector,
    });
  }
  const backgroundColors = [];
  for (const entry of countByKey(raw.backgrounds, (item) => item.colorHex)) {
    backgroundColors.push({
      color: entry.key,
      elements: entry.count,
      example: entry.first.selector,
    });
  }
  const spacing = [];
  for (const entry of countByKey(raw.gaps, (gap) => gap.pixels)) {
    spacing.push({
      px: entry.key,
      count: entry.count,
      example: entry.first.parentSelector,
    });
  }
  spacing.sort((first, second) => first.px - second.px);

  const leftEdges = [];
  const leftValues = [];
  for (const rawBlock of raw.blocks) {
    if (rawBlock.textLeft !== null) {
      leftValues.push(Math.round(rawBlock.textLeft));
    }
  }
  for (const group of clusterValues(leftValues, 1)) {
    let example = null;
    for (const rawBlock of raw.blocks) {
      const left = rawBlock.textLeft;
      if (left !== null && Math.abs(Math.round(left) - group.value) <= 1) {
        example = rawBlock.selector;
        break;
      }
    }
    leftEdges.push({ x: group.value, blocks: group.count, example });
  }

  const targets = [];
  for (const target of raw.targets) {
    targets.push({ selector: target.selector, box: toPixelBox(target.box) });
  }

  const notes = [...raw.notes];
  if (raw.pageWidth > raw.width) {
    notes.push(
      `the page is ${raw.pageWidth} px wide, wider than the ${raw.width} px viewport, so it scrolls sideways`,
    );
  }
  const viewport = {
    name: raw.name,
    width: raw.width,
    height: raw.height,
    page_width: raw.pageWidth,
    page_height: raw.pageHeight,
    notes,
    text_blocks_found: raw.allBlocks.length,
    text_blocks_left_out: raw.allBlocks.length - raw.blocks.length,
    text_blocks: textBlocks,
    type_sizes: typeSizes,
    text_colors: textColors,
    background_colors: backgroundColors,
    spacing,
    left_edges: leftEdges,
    targets,
    targets_left_out: raw.targetsFound - raw.targets.length,
  };
  return { viewport, texts };
}

// ---------------------------------------------------------------------------------------------
// The browser side. readPage runs inside the page through Playwright's page.evaluate, so it must
// not use anything from this module: Playwright sends its source text to the browser.
// ---------------------------------------------------------------------------------------------

/**
 * Reads the page's layout and computed styles: every text block, the backgrounds, the gaps between
 * sibling boxes, and the interactive targets. A text block is an element that is not `display:
 * inline` and holds visible text of its own; text inside inline children (a, strong, span) counts
 * toward it, and text inside a nested block counts toward that block. To sample what lies under
 * the text it scrolls the window and asks the browser which elements are painted at a point,
 * top first; it scrolls back to the top when it is done.
 *
 * @param {{ maxBlocks: number, maxTargets: number, snippetLength: number, maxCharacters: number }} limits
 */
function readPage(limits) {
  const pageHeight = document.documentElement.scrollHeight;
  const pageWidth = document.documentElement.scrollWidth;

  /** Returns a short CSS selector that matches only this element. */
  function buildSelector(element) {
    if (element.id) {
      const idSelector = `#${CSS.escape(element.id)}`;
      if (document.querySelectorAll(idSelector).length === 1) {
        return idSelector;
      }
    }
    const tag = element.localName;
    let part = tag;
    for (const className of [...element.classList].slice(0, 2)) {
      part += `.${CSS.escape(className)}`;
    }
    if (tag === "body" || tag === "html") {
      return tag;
    }
    if (document.querySelectorAll(part).length === 1) {
      return part;
    }
    const parent = element.parentElement;
    if (parent === null) {
      return part;
    }
    const sameTag = [...parent.children].filter(
      (child) => child.localName === tag,
    );
    if (sameTag.length > 1) {
      part += `:nth-of-type(${sameTag.indexOf(element) + 1})`;
    }
    return `${buildSelector(parent)} > ${part}`;
  }

  /** Returns the box of an element in page pixels, which are the screenshot's pixels at scale 1. */
  function pageBox(rect) {
    return {
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height,
    };
  }

  /** Writes a computed rgb() or rgba() color as #rrggbb or #rrggbbaa, or returns it unchanged. */
  function toHex(colorText) {
    const match =
      /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)$/.exec(
        colorText,
      );
    if (match === null) {
      return colorText;
    }
    let hex = "#";
    for (const channel of [match[1], match[2], match[3]]) {
      hex += Math.round(Number(channel)).toString(16).padStart(2, "0");
    }
    if (match[4] !== undefined && Number(match[4]) < 1) {
      hex += Math.round(Number(match[4]) * 255)
        .toString(16)
        .padStart(2, "0");
    }
    return hex;
  }

  /** Says whether a computed background color paints anything (its alpha is above zero). */
  function paintsColor(colorText) {
    return colorText !== "rgba(0, 0, 0, 0)" && colorText !== "transparent";
  }

  /** Returns the nearest element at or above a node whose display is not inline: the block that owns its text. */
  function findOwner(node) {
    let element = node.parentElement;
    while (element !== null) {
      const display = getComputedStyle(element).display;
      if (display !== "inline" && display !== "contents") {
        return element;
      }
      element = element.parentElement;
    }
    return null;
  }

  // Measure layout at the top of the page, so fixed and sticky elements sit where the screenshot shows them.
  window.scrollTo(0, 0);

  const textNodesByOwner = new Map();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode();
  while (textNode !== null) {
    const owner = findOwner(textNode);
    if (owner !== null) {
      const list = textNodesByOwner.get(owner);
      if (textNode.data.trim() !== "") {
        textNodesByOwner.set(owner, [...(list ?? []), textNode]);
      } else if (list !== undefined) {
        // White space between inline children ("Home</a> <a>Features") belongs to the block's text,
        // but it alone never makes an element a text block.
        list.push(textNode);
      }
    }
    textNode = walker.nextNode();
  }

  const candidates = [];
  for (const [owner, nodes] of textNodesByOwner) {
    const visible = owner.checkVisibility({
      opacityProperty: true,
      visibilityProperty: true,
    });
    const rect = owner.getBoundingClientRect();
    if (!visible || rect.width === 0 || rect.height === 0) {
      continue;
    }
    // Leave out a block that an ancestor's overflow hides completely, and note one it hides in part.
    const notes = [];
    let visibleLeft = rect.left;
    let visibleTop = rect.top;
    let visibleRight = rect.right;
    let visibleBottom = rect.bottom;
    let ancestor = owner.parentElement;
    while (ancestor !== null && ancestor !== document.documentElement) {
      const style = getComputedStyle(ancestor);
      if (style.overflowX !== "visible" || style.overflowY !== "visible") {
        const clip = ancestor.getBoundingClientRect();
        visibleLeft = Math.max(visibleLeft, clip.left);
        visibleTop = Math.max(visibleTop, clip.top);
        visibleRight = Math.min(visibleRight, clip.right);
        visibleBottom = Math.min(visibleBottom, clip.bottom);
        const scrolls =
          ancestor.scrollHeight > ancestor.clientHeight + 1 ||
          ancestor.scrollWidth > ancestor.clientWidth + 1;
        if (scrolls && !notes.includes("inside a scrolling container")) {
          notes.push("inside a scrolling container");
        }
      }
      ancestor = ancestor.parentElement;
    }
    if (visibleRight <= visibleLeft || visibleBottom <= visibleTop) {
      continue;
    }
    const visibleArea =
      (visibleRight - visibleLeft) * (visibleBottom - visibleTop);
    if (visibleArea < rect.width * rect.height - 1) {
      notes.push("partly hidden by an ancestor's overflow");
    }
    const style = getComputedStyle(owner);
    let rawText = "";
    for (const node of nodes) {
      rawText += node.data;
    }
    // Collapse each run of white space to one space, as the browser draws it.
    const text = rawText.replace(/\s+/g, " ").trim();
    candidates.push({
      owner,
      nodes,
      notes,
      style,
      text,
      fontSize: Number.parseFloat(style.fontSize),
      colorHex: toHex(style.color),
    });
  }

  // Longest text first, then the larger type; the list in the file is cut after maxBlocks.
  candidates.sort((first, second) => {
    if (second.text.length !== first.text.length) {
      return second.text.length - first.text.length;
    }
    return second.fontSize - first.fontSize;
  });

  const allBlocks = [];
  for (const candidate of candidates) {
    allBlocks.push({
      fontSize: candidate.fontSize,
      characters: candidate.text.length,
      colorHex: candidate.colorHex,
      selector: null,
    });
  }

  const blocks = [];
  const kept = candidates.slice(0, limits.maxBlocks);
  for (const [index, candidate] of kept.entries()) {
    const { owner, style } = candidate;
    const selector = buildSelector(owner);
    const summary = allBlocks[index];
    if (summary !== undefined) {
      summary.selector = selector;
    }
    // One rectangle per drawn character: a Range around each character asks the browser where it drew it.
    const characterRects = [];
    const range = document.createRange();
    let textLeft = null;
    let measured = 0;
    for (const node of candidate.nodes) {
      for (let offset = 0; offset < node.data.length; offset++) {
        if (measured >= limits.maxCharacters) {
          break;
        }
        const character = node.data[offset];
        if (character === "\n" || character === "\r") {
          // A kept line break (white-space: pre or pre-line) ends a line; it is not a character on it.
          continue;
        }
        range.setStart(node, offset);
        range.setEnd(node, offset + 1);
        const rect = range.getBoundingClientRect();
        if (rect.width === 0) {
          // White space that the browser collapsed is not drawn, and its rectangle has no width.
          continue;
        }
        measured += 1;
        characterRects.push({
          top: rect.top + window.scrollY,
          bottom: rect.bottom + window.scrollY,
          centerX: rect.left + window.scrollX + rect.width / 2,
        });
        const left = rect.left + window.scrollX;
        const isLetter = character?.trim() !== "";
        if (isLetter && (textLeft === null || left < textLeft)) {
          textLeft = left;
        }
      }
    }
    if (measured >= limits.maxCharacters) {
      candidate.notes.push(
        `characters per line measured on the first ${limits.maxCharacters} characters`,
      );
    }

    let lineHeight = null;
    if (style.lineHeight !== "normal") {
      lineHeight = Number.parseFloat(style.lineHeight);
    } else {
      // For `line-height: normal`, take the mean distance between the tops of the drawn lines.
      const lineTops = [];
      for (const rect of characterRects) {
        const last = lineTops[lineTops.length - 1];
        if (last === undefined || rect.top - last > 1) {
          lineTops.push(rect.top);
        }
      }
      if (lineTops.length > 1) {
        const first = lineTops[0] ?? 0;
        const final = lineTops[lineTops.length - 1] ?? 0;
        lineHeight = (final - first) / (lineTops.length - 1);
      }
    }

    // Opacity, filters, and blend modes on the block or an ancestor change the drawn colors in ways one ratio cannot hold.
    let paintEffect = null;
    let zoom = 1;
    let element = owner;
    while (element !== null) {
      const elementStyle = getComputedStyle(element);
      const hasEffect =
        Number.parseFloat(elementStyle.opacity) < 1 ||
        elementStyle.filter !== "none" ||
        elementStyle.mixBlendMode !== "normal";
      if (hasEffect && paintEffect === null) {
        paintEffect = "opacity, filter, or blend mode";
      }
      zoom *= Number.parseFloat(elementStyle.zoom) || 1;
      element = element.parentElement;
    }
    if (zoom !== 1) {
      candidate.notes.push(
        `CSS zoom ${zoom}: font_size is the computed size before zoom`,
      );
    }
    const fillColor = style.webkitTextFillColor;
    const textFill =
      style.backgroundClip === "text" ||
      style.webkitBackgroundClip === "text" ||
      (fillColor !== undefined &&
        fillColor !== style.color &&
        !paintsColor(fillColor));

    const declaredFamilies = style.fontFamily.split(",");
    const firstDeclared = declaredFamilies[0]
      ?.trim()
      .replace(/^["']|["']$/g, "");

    blocks.push({
      selector,
      text: candidate.text.slice(0, limits.snippetLength),
      box: pageBox(owner.getBoundingClientRect()),
      fontFamily: style.fontFamily,
      firstDeclaredFamily: firstDeclared ?? null,
      renderedFamily: null,
      fontSize: candidate.fontSize,
      fontWeight: Number(style.fontWeight),
      lineHeight,
      color: style.color,
      colorHex: candidate.colorHex,
      textFill,
      paintEffect,
      characterRects,
      textLeft,
      notes: candidate.notes,
      samples: [],
      owner,
    });
  }

  const backgrounds = [];
  const gaps = [];
  for (const element of document.body.querySelectorAll("*")) {
    const style = getComputedStyle(element);
    if (style.display === "none") {
      continue;
    }
    if (paintsColor(style.backgroundColor) && element.checkVisibility()) {
      backgrounds.push({ element, colorHex: toHex(style.backgroundColor) });
    }
    // The space between consecutive sibling boxes in flow, which holds their margins and the parent's gap.
    const children = [];
    for (const child of element.children) {
      const childStyle = getComputedStyle(child);
      const inFlow =
        childStyle.position !== "absolute" && childStyle.position !== "fixed";
      const childRect = child.getBoundingClientRect();
      if (inFlow && childRect.width > 0 && childRect.height > 0) {
        children.push(childRect);
      }
    }
    for (let index = 1; index < children.length; index++) {
      const previous = children[index - 1];
      const current = children[index];
      if (previous === undefined || current === undefined) {
        continue;
      }
      let gap = null;
      if (current.top >= previous.bottom - 0.5) {
        gap = current.top - previous.bottom;
      } else if (current.left >= previous.right - 0.5) {
        gap = current.left - previous.right;
      }
      if (gap !== null && Math.round(gap) >= 1) {
        gaps.push({ pixels: Math.round(gap), parent: element });
      }
    }
  }
  const selectorCache = new Map();
  /** Builds a selector once per element, because the page facts name the same parents many times. */
  function cachedSelector(element) {
    let selector = selectorCache.get(element);
    if (selector === undefined) {
      selector = buildSelector(element);
      selectorCache.set(element, selector);
    }
    return selector;
  }
  // Only the first element of each value is named in the file, so build those selectors only.
  const namedBackgrounds = new Set();
  const backgroundsOut = [];
  for (const item of backgrounds) {
    let selector = null;
    if (!namedBackgrounds.has(item.colorHex)) {
      namedBackgrounds.add(item.colorHex);
      selector = cachedSelector(item.element);
    }
    backgroundsOut.push({ colorHex: item.colorHex, selector });
  }
  const namedGaps = new Set();
  const gapsOut = [];
  for (const gap of gaps) {
    let parentSelector = null;
    if (!namedGaps.has(gap.pixels)) {
      namedGaps.add(gap.pixels);
      parentSelector = cachedSelector(gap.parent);
    }
    gapsOut.push({ pixels: gap.pixels, parentSelector });
  }

  const targetElements = [];
  for (const element of document.querySelectorAll(
    "a, button, input, select, textarea, [role=button], [onclick]",
  )) {
    const rect = element.getBoundingClientRect();
    const visible = element.checkVisibility({
      opacityProperty: true,
      visibilityProperty: true,
    });
    if (visible && rect.width > 0 && rect.height > 0) {
      targetElements.push(element);
    }
  }
  const targets = [];
  for (const element of targetElements.slice(0, limits.maxTargets)) {
    targets.push({
      selector: cachedSelector(element),
      box: pageBox(element.getBoundingClientRect()),
    });
  }

  // Sample what is painted under up to three characters of each block: the first, the middle, and the last.
  const replacedTags = new Set([
    "img",
    "video",
    "canvas",
    "svg",
    "iframe",
    "object",
    "embed",
    "picture",
  ]);
  for (const block of blocks) {
    const rects = block.characterRects;
    const picks = new Set([0, Math.floor(rects.length / 2), rects.length - 1]);
    for (const pick of picks) {
      const rect = rects[pick];
      if (rect === undefined) {
        continue;
      }
      const pageX = rect.centerX;
      const pageY = (rect.top + rect.bottom) / 2;
      window.scrollTo(
        Math.max(0, pageX - window.innerWidth / 2),
        Math.max(0, pageY - window.innerHeight / 2),
      );
      const stack = document.elementsFromPoint(
        pageX - window.scrollX,
        pageY - window.scrollY,
      );
      const firstOwnIndex = stack.findIndex(
        (element) => element === block.owner || block.owner.contains(element),
      );
      if (firstOwnIndex === -1 || !stack.includes(block.owner)) {
        block.samples.push({ found: false, covered: false, layers: [] });
        continue;
      }
      let covered = false;
      for (const element of stack.slice(0, firstOwnIndex)) {
        const style = getComputedStyle(element);
        const paints =
          paintsColor(style.backgroundColor) ||
          style.backgroundImage !== "none" ||
          replacedTags.has(element.localName);
        if (paints) {
          covered = true;
        }
      }
      const layers = [];
      for (const element of stack.slice(firstOwnIndex)) {
        const style = getComputedStyle(element);
        layers.push({
          backgroundColor: style.backgroundColor,
          hasImage: style.backgroundImage !== "none",
          replaced:
            replacedTags.has(element.localName) &&
            element !== block.owner &&
            !block.owner.contains(element),
        });
      }
      block.samples.push({ found: true, covered, layers });
    }
  }
  window.scrollTo(0, 0);

  // Where no element paints, the browser shows the root's background, or the body's when the root has none.
  let canvasColor = getComputedStyle(document.documentElement).backgroundColor;
  if (!paintsColor(canvasColor)) {
    canvasColor = getComputedStyle(document.body).backgroundColor;
  }

  for (const block of blocks) {
    // The element itself cannot leave the browser; the selector names it.
    delete block.owner;
  }
  return {
    pageHeight,
    pageWidth,
    canvasColor,
    blocks,
    allBlocks,
    backgrounds: backgroundsOut,
    gaps: gapsOut,
    targets,
    targetsFound: targetElements.length,
  };
}

// ---------------------------------------------------------------------------------------------
// The Node side: find Playwright, open the page, take the screenshots, and write the files.
// ---------------------------------------------------------------------------------------------

/**
 * Loads the `playwright` package without installing it: first from the project in the working
 * directory, then from packs/ of the deskcrit checkout that holds this script. It returns null when
 * neither has it.
 *
 * @param {string} workingDirectory
 */
export function loadPlaywright(workingDirectory) {
  const scriptFolder = fileURLToPath(new URL(".", import.meta.url));
  const searchFrom = [
    join(workingDirectory, "package.json"),
    join(scriptFolder, "../../../../packs/package.json"),
  ];
  for (const anchor of searchFrom) {
    try {
      // createRequire gives a `require` that loads packages as if from the anchor file's folder.
      // Playwright is a CommonJS package, so `require` gives its exports directly.
      return createRequire(anchor)("playwright");
    } catch {
      // Not found from this folder; try the next.
    }
  }
  return null;
}

/** Turns the PAGE argument into a URL: an http(s) URL as given, anything else as a local file. */
function toPageUrl(pageArgument) {
  if (/^https?:\/\//i.test(pageArgument)) {
    return pageArgument;
  }
  const filePath = resolve(pageArgument);
  if (!existsSync(filePath)) {
    throw new MeasureRefusal(`the file ${pageArgument} does not exist`);
  }
  return pathToFileURL(filePath).href;
}

/**
 * Opens the page in one viewport and waits for it to settle: the load event, a quiet network, and
 * web fonts, each with a time limit. A page that never settles is still measured, and the returned
 * notes say what did not finish.
 */
async function openPage(browser, viewport, pageUrl) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const notes = [];
  try {
    await page.goto(pageUrl, { waitUntil: "load", timeout: LOAD_TIMEOUT_MS });
  } catch (error) {
    if (!(error instanceof Error) || error.name !== "TimeoutError") {
      await context.close();
      throw new MeasureRefusal(`the page did not open: ${String(error)}`);
    }
    notes.push(
      `the page did not finish loading within ${LOAD_TIMEOUT_MS / 1000} s; measured what was there`,
    );
  }
  try {
    await page.waitForLoadState("networkidle", { timeout: SETTLE_TIMEOUT_MS });
  } catch {
    notes.push(
      `the network did not go quiet within ${SETTLE_TIMEOUT_MS / 1000} s; measured what was there`,
    );
  }
  const fontsReady = await page.evaluate(
    (timeout) =>
      // Promise.race settles with whichever promise settles first: the fonts or the timer.
      Promise.race([
        document.fonts.ready.then(() => true),
        new Promise((resolveTimer) =>
          setTimeout(() => resolveTimer(false), timeout),
        ),
      ]),
    SETTLE_TIMEOUT_MS,
  );
  if (!fontsReady) {
    notes.push(
      `web fonts were still loading after ${SETTLE_TIMEOUT_MS / 1000} s`,
    );
  }
  const failedFonts = await page.evaluate(() => {
    const families = new Set();
    for (const face of document.fonts) {
      if (face.status === "error") {
        families.add(face.family.replace(/^["']|["']$/g, ""));
      }
    }
    return [...families];
  });
  for (const family of failedFonts) {
    notes.push(
      `web font ${family} failed to load; text that names it is drawn in a fallback font`,
    );
  }
  return { context, page, notes };
}

/**
 * Asks Chromium, through its DevTools protocol, which font it drew most of each block's text in,
 * and fills in `renderedFamily`. It leaves the value null when the browser cannot say.
 */
async function readRenderedFamilies(page, blocks) {
  const session = await page.context().newCDPSession(page);
  await session.send("DOM.enable");
  await session.send("CSS.enable");
  const { root } = await session.send("DOM.getDocument", { depth: 0 });
  for (const block of blocks) {
    try {
      const { nodeId } = await session.send("DOM.querySelector", {
        nodeId: root.nodeId,
        selector: block.selector,
      });
      const { fonts } = await session.send("CSS.getPlatformFontsForNode", {
        nodeId,
      });
      let best = null;
      for (const font of fonts) {
        if (best === null || font.glyphCount > best.glyphCount) {
          best = font;
        }
      }
      if (best !== null) {
        block.renderedFamily = best.familyName;
      }
    } catch {
      // The browser could not say; the declared list stands, with a note.
    }
  }
  await session.detach();
}

/**
 * Plans the one-screen crops of a full-page screenshot: full width, one viewport tall, top to
 * bottom, neighbors sharing crop.mjs's OVERLAP_FRACTION, the last one ending at the bottom of the
 * page. The first crop is always what shows before any scroll; a page no taller than the screen
 * gets that one crop only.
 *
 * @param {number} pageWidth
 * @param {number} pageHeight
 * @param {number} screenHeight
 * @returns {{ x: number, y: number, width: number, height: number }[]}
 */
export function planScreenCrops(pageWidth, pageHeight, screenHeight) {
  if (pageHeight <= screenHeight) {
    return [{ x: 0, y: 0, width: pageWidth, height: pageHeight }];
  }
  const step = screenHeight - Math.round(screenHeight * OVERLAP_FRACTION);
  const crops = [];
  let top = 0;
  while (top + screenHeight < pageHeight) {
    crops.push({ x: 0, y: top, width: pageWidth, height: screenHeight });
    top += step;
  }
  crops.push({
    x: 0,
    y: pageHeight - screenHeight,
    width: pageWidth,
    height: screenHeight,
  });
  return crops;
}

/**
 * Writes the screenshot's one-screen crops with crop.mjs's PNG decoder and encoder, named
 * `<viewport>-01.png` and so on, and returns each file name with its box.
 */
async function writeCrops(outputFolder, viewport, screenshotPath) {
  const decoded = decodePng(await readFile(screenshotPath));
  const crops = [];
  const plan = planScreenCrops(
    decoded.header.width,
    decoded.header.height,
    viewport.height,
  );
  for (const [index, crop] of plan.entries()) {
    const fileName = `${viewport.name}-${String(index + 1).padStart(2, "0")}.png`;
    await writeFile(join(outputFolder, fileName), encodeCrop(decoded, crop));
    crops.push({
      file: fileName,
      box: [crop.x, crop.y, crop.width, crop.height],
    });
  }
  return crops;
}

/**
 * Writes facts.json text: pretty at the top levels and one line per list item further down, so
 * the file stays small for the critic's context and each text block or target reads as one line.
 *
 * @param {unknown} value
 * @param {number} depth how deep the value sits; at depth 4 and below it is written on one line
 * @returns {string}
 */
export function formatFactsJson(value, depth = 0) {
  if (depth >= 4 || value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  const indent = "  ".repeat(depth + 1);
  const closingIndent = "  ".repeat(depth);
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return "[]";
    }
    const items = [];
    for (const item of value) {
      items.push(`${indent}${formatFactsJson(item, depth + 1)}`);
    }
    return `[\n${items.join(",\n")}\n${closingIndent}]`;
  }
  const entries = [];
  for (const [key, entryValue] of Object.entries(value)) {
    entries.push(
      `${indent}${JSON.stringify(key)}: ${formatFactsJson(entryValue, depth + 1)}`,
    );
  }
  if (entries.length === 0) {
    return "{}";
  }
  return `{\n${entries.join(",\n")}\n${closingIndent}}`;
}

/**
 * Measures the page in both viewports and writes the screenshots, crops, and facts.json. It returns
 * the lines to print. It throws a MeasureRefusal when it cannot measure.
 *
 * @param {string} pageArgument
 * @param {string} outputFolder
 * @param {string} workingDirectory
 */
export async function measurePage(
  pageArgument,
  outputFolder,
  workingDirectory,
) {
  const pageUrl = toPageUrl(pageArgument);
  const playwright = loadPlaywright(workingDirectory);
  if (playwright === null) {
    throw new MeasureRefusal(PLAYWRIGHT_MISSING);
  }
  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: true });
  } catch (error) {
    const firstLine = String(error).split("\n")[0];
    throw new MeasureRefusal(
      `Chromium did not start (${firstLine}); run \`npx playwright install chromium\`, or critique the image alone.`,
    );
  }
  const lines = [];
  const texts = {};
  const viewports = [];
  try {
    for (const viewport of VIEWPORTS) {
      const { context, page, notes } = await openPage(
        browser,
        viewport,
        pageUrl,
      );
      const screenshotName = `${viewport.name}.png`;
      const screenshotPath = join(outputFolder, screenshotName);
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        animations: "disabled",
      });
      lines.push(`screenshot ${screenshotPath}`);
      const crops = await writeCrops(outputFolder, viewport, screenshotPath);
      for (const crop of crops) {
        lines.push(`crop ${join(outputFolder, crop.file)}`);
      }
      const raw = await page.evaluate(readPage, {
        maxBlocks: MAX_TEXT_BLOCKS,
        maxTargets: MAX_TARGETS,
        snippetLength: TEXT_SNIPPET_LENGTH,
        maxCharacters: MAX_MEASURED_CHARACTERS,
      });
      await readRenderedFamilies(page, raw.blocks);
      await context.close();
      const summary = summarizeViewport({
        ...raw,
        name: viewport.name,
        width: viewport.width,
        height: viewport.height,
        notes,
      });
      for (const [selector, text] of summary.texts) {
        texts[selector] = text;
      }
      viewports.push({
        ...summary.viewport,
        screenshot: screenshotName,
        crops,
      });
    }
  } finally {
    await browser.close();
  }
  const facts = {
    version: FACTS_VERSION,
    source: pageArgument,
    texts,
    viewports,
  };
  const factsPath = join(outputFolder, "facts.json");
  await writeFile(factsPath, `${formatFactsJson(facts)}\n`);
  lines.push(`facts ${factsPath}`);
  return lines;
}

/**
 * Runs the command and returns the lines to print and the exit code. A refusal or any other error
 * becomes one "cannot measure:" line and exit code 3. It writes nothing to the terminal itself.
 *
 * @param {string[]} commandArguments the arguments after the script path
 * @param {string} workingDirectory
 * @returns {Promise<{ exitCode: number, lines: string[] }>}
 */
export async function runMeasure(commandArguments, workingDirectory) {
  const [pageArgument, flag, folderArgument, ...extra] = commandArguments;
  const folderGiven = flag === "--out" && folderArgument !== undefined;
  const wellFormed =
    pageArgument !== undefined &&
    extra.length === 0 &&
    (flag === undefined || folderGiven);
  if (!wellFormed) {
    return { exitCode: EXIT_USAGE, lines: [USAGE] };
  }
  try {
    // Check the page before making the output folder, so a wrong path leaves nothing behind.
    toPageUrl(pageArgument);
    let outputFolder;
    if (folderGiven) {
      outputFolder = resolve(workingDirectory, folderArgument);
      mkdirSync(outputFolder, { recursive: true });
    } else {
      outputFolder = mkdtempSync(join(tmpdir(), "design-critic-measure-"));
    }
    const lines = await measurePage(
      pageArgument,
      outputFolder,
      workingDirectory,
    );
    return { exitCode: 0, lines };
  } catch (error) {
    let reason = String(error);
    if (error instanceof Error) {
      reason = error.message;
    }
    return {
      exitCode: EXIT_CANNOT_MEASURE,
      lines: [`cannot measure: ${reason}`],
    };
  }
}

/** Returns true when Node runs this file as the script, and false when a test imports it. */
function isRunAsScript() {
  const scriptPath = process.argv[1];
  if (scriptPath === undefined) {
    return false;
  }
  // import.meta.url is this module's own file:// URL; realpathSync resolves symbolic links on both sides.
  return (
    realpathSync(scriptPath) === realpathSync(fileURLToPath(import.meta.url))
  );
}

if (isRunAsScript()) {
  const result = await runMeasure(process.argv.slice(2), process.cwd());
  for (const line of result.lines) {
    console.log(line);
  }
  process.exitCode = result.exitCode;
}
