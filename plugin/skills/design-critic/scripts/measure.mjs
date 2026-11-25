#!/usr/bin/env node
// Renders a web page and measures it, so the design critic can state degree as a number ("body
// text is 13 px at 96 characters per line, contrast 3.1:1") and give a location a coding agent can
// act on (a CSS selector and a pixel box), where from an image alone it judges by eye (PRD FR-79).
//
// Usage:
//   node measure.mjs PAGE [--out FOLDER] [--desktop] [--phone] [--tablet] [--widescreen] [--width N[,N...]] [--dark]
//
// PAGE is a local HTML file or an http(s) URL. It writes, into FOLDER or a new folder in the system
// temp folder: desktop.png (1280 px wide), phone.png (390 px wide), tablet.png (768 px wide), and
// widescreen.png (1920 px wide), all full-page screenshots at device scale factor 1; one-screen
// crops of each through crop.mjs, named desktop-01.png and so on; and facts.json, which
// schemas/facts.schema.json describes. It prints one line per file. The flags --desktop, --phone,
// --tablet, and --widescreen each pick that one viewport, and --width adds one viewport per width,
// each 800 px tall and named w<N>, so --width 768 writes w768.png. Each N is a whole number from
// 200 to 3840. With any of these flags it renders only the viewports they pick: the named ones
// first, in the order desktop, phone, tablet, widescreen, then the w<N> ones in the order given.
// With none of them it renders all four named viewports.
//
// Without --dark it renders in light mode only. With --dark it also checks each viewport for a dark
// mode (PRD FR-85): first whether the page's computed colors change when the system asks for dark,
// then, if not, whether a visible control named dark, light, theme, or appearance makes the page
// darker. When one does, it writes a dark entry named <name>-dark right after the light one, with
// <name>-dark.png and its crops, and facts.json records how it found dark mode; when none does, a
// note says so.
//
// It uses Playwright, which it never installs. It looks for `playwright` first in the project of
// the working directory, then, only when this script runs from a deskcrit checkout (GUIDELINES.md
// and packs/package.json at the root four levels above this folder), in that checkout's packs/. An
// installed copy of the plugin loads no package from a folder above itself. It opens
// the page in a new browser context with no cookies, follows no link, and runs no script of its own
// in the page other than code that reads layout and styles and scrolls the window. Only with --dark
// does it click anything: at most two theme controls per viewport, never a link, a submit button,
// or a control inside a form, each in a fresh context.
//
// Exit codes: 0 when it measured, 2 for a wrong command line, 3 when it cannot measure because the
// page cannot be opened (404, redirect, does not load), 4 when Playwright or its Chromium is missing.
// On codes 2, 3, and 4 it prints exactly one line. On code 4 the line names the install commands.

import { existsSync, mkdirSync, mkdtempSync, realpathSync } from "node:fs";
import { readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import {
  decodePng,
  encodeCrop,
  OVERLAP_FRACTION,
  splitLength,
} from "./crop.mjs";

/** The version of the facts.json format; schemas/facts.schema.json requires this value. */
export const FACTS_VERSION = 1;

/**
 * The default viewports, all at device scale factor 1: a laptop screen, a common phone, a tablet
 * held upright, and a large desktop screen (FR-79, FR-85). Desktop is first only in this default
 * order; with the flags that pick viewports or with --width it may not be, so a reader of facts.json
 * finds a viewport by its name and never by its position.
 */
export const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "widescreen", width: 1920, height: 1080 },
];

/** The narrowest and widest width that --width accepts, in CSS pixels. */
const MIN_WIDTH = 200;
const MAX_WIDTH = 3840;

/** The height of each viewport that --width asks for, in CSS pixels. */
const WIDTH_VIEWPORT_HEIGHT = 800;

/** At most this many text blocks per viewport go into the file, so it fits a critic's context. */
export const MAX_TEXT_BLOCKS = 60;

/** At most this many interactive targets per viewport go into the file. */
export const MAX_TARGETS = 60;

/** The first this many characters of a block's text go into the file, so the reader can tell which block it is. */
export const TEXT_SNIPPET_LENGTH = 60;

/** Characters per line is measured on at most this many characters of a block, so a huge block cannot stall the run. */
export const MAX_MEASURED_CHARACTERS = 1500;

/** The color scheme the page is rendered in; a page with a dark mode is measured in its light mode, and in its dark mode too only with --dark. */
const COLOR_SCHEME = "light";

/** A theme control's name holds one of these whole words; "Highlights", "Lightbox", and "Flight" do not match. */
const THEME_CONTROL_PATTERN = /\b(dark|light|theme|appearance)\b/i;

/** The roles a theme control may have; a link is never one of them. */
const THEME_CONTROL_ROLES = [
  "button",
  "switch",
  "checkbox",
  "menuitem",
  "radio",
];

/** How long to wait between the two reads of the light colors; a color that changes in this time is animated, not themed. */
const LIGHT_REREAD_DELAY_MS = 500;

/** How long to wait, after a click on a theme control or a dark load, for the network and for transitions. */
const THEME_SETTLE_TIMEOUT_MS = 2_000;

/** How long to wait for the page's load event before measuring what is there. */
const LOAD_TIMEOUT_MS = 30_000;

/** How long to wait for the network to go quiet and for web fonts after the load event. */
const SETTLE_TIMEOUT_MS = 5_000;

export const EXIT_USAGE = 2;
export const EXIT_CANNOT_MEASURE = 3;
export const EXIT_TOOL_MISSING = 4;

const USAGE =
  "usage: node measure.mjs PAGE [--out FOLDER] [--desktop] [--phone] [--tablet] [--widescreen] [--width N[,N...]] [--dark]   (PAGE is an HTML file or an http(s) URL; each flag at most once; each N a whole number from 200 to 3840)";

// The version is the one that packs/package.json pins. Keep the two the same.
const PLAYWRIGHT_MISSING =
  "Playwright is not installed; to install it in your project, run `npm install --save-exact playwright@1.63.0` and `npx playwright install chromium`, or critique the image alone.";

/** An error whose message says why the script cannot measure; it prints it after "cannot measure: ". */
export class MeasureRefusal extends Error {}

/** A refusal because Playwright or its Chromium is missing; runMeasure turns it into exit code 4. */
export class ToolMissingRefusal extends MeasureRefusal {}

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
 * Writes a computed CSS color as #rrggbb or #rrggbbaa, or keeps the browser's text when it is in a
 * form parseCssColor does not read, such as oklch().
 *
 * @param {string} colorText
 */
export function toHexColor(colorText) {
  const color = parseCssColor(colorText);
  if (color === null) {
    return colorText;
  }
  return formatHexColor(color);
}

/**
 * Works out the contrast of one text block from what the browser read at up to three of its
 * characters. Each sampled character's own color (from the element that draws it) is composited
 * over the background painted under it, and the lowest ratio is kept. It returns `contrast: null`
 * with a reason whenever one number would be wrong.
 *
 * @param {{ samples: object[] }} rawBlock the block as the browser read it
 * @param {string} canvasColor
 * @returns {{ contrast: number | null, contrast_note?: string, background?: string }}
 */
export function measureContrast(rawBlock, canvasColor) {
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
    if (sample.textFill) {
      return {
        contrast: null,
        contrast_note: "not measurable: image or gradient text fill",
      };
    }
    if (sample.pseudo) {
      return {
        contrast: null,
        contrast_note: "not measurable: pseudo-element background",
      };
    }
    if (sample.paintEffect) {
      return {
        contrast: null,
        contrast_note: "not measurable: opacity, filter, or blend mode",
      };
    }
    const textColor = parseCssColor(sample.color);
    if (textColor === null) {
      return {
        contrast: null,
        contrast_note: `not measurable: color format ${sample.color}`,
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
 * Returns the value of one style property that covers the most characters of a block, and whether
 * the block's characters use more than one value. The runs are the block's text nodes, each with
 * the style of the element that draws it and its count of characters that are not white space.
 *
 * @template {{ characters: number }} Run
 * @param {Run[]} styleRuns
 * @param {(run: Run) => string | number} readValue
 * @returns {{ value: string | number | null, mixed: boolean }}
 */
export function findMainStyle(styleRuns, readValue) {
  const totals = new Map();
  for (const run of styleRuns) {
    const value = readValue(run);
    totals.set(value, (totals.get(value) ?? 0) + run.characters);
  }
  let best = null;
  let bestCount = -1;
  for (const [value, count] of totals) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return { value: best, mixed: totals.size > 1 };
}

/**
 * Counts characters and blocks per value of one style property, over every text block found. A
 * block counts once for each value any of its characters use.
 *
 * @param {{ selector: string | null, styleRuns: object[] }[]} blocks
 * @param {(run: object) => string | number} readValue
 * @returns {Map<string | number, { blocks: number, characters: number, example: string | null }>}
 */
function countStyleValues(blocks, readValue) {
  const groups = new Map();
  for (const block of blocks) {
    const seenInBlock = new Set();
    for (const run of block.styleRuns) {
      const value = readValue(run);
      let group = groups.get(value);
      if (group === undefined) {
        group = { blocks: 0, characters: 0, example: null };
        groups.set(value, group);
      }
      group.characters += run.characters;
      if (!seenInBlock.has(value)) {
        seenInBlock.add(value);
        group.blocks += 1;
      }
      if (group.example === null && block.selector !== null) {
        group.example = block.selector;
      }
    }
  }
  return groups;
}

/** The generic family names of CSS, which name no font of their own. */
const GENERIC_FAMILIES = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "emoji",
  "math",
]);

/**
 * Names the font a block is drawn in and says whether it is not the first declared one. For a web
 * font, the browser reports the name inside the font file, which can differ from the @font-face
 * name the page's CSS uses, so the CSS name of the first declared family that loaded is used.
 *
 * @param {{ renderedFamily: string | null, renderedIsCustom: boolean, declaredFamilies: string[], fontFamily: string }} rawBlock
 * @param {Set<string>} loadedFamilies lower-case @font-face names whose fonts loaded
 * @returns {{ family: string, note: string | null }}
 */
export function nameDrawnFont(rawBlock, loadedFamilies) {
  if (rawBlock.renderedFamily === null) {
    return {
      family: rawBlock.fontFamily,
      note: "rendered font unknown: font_family is the declared list",
    };
  }
  let family = rawBlock.renderedFamily;
  if (rawBlock.renderedIsCustom) {
    const loaded = rawBlock.declaredFamilies.find((declared) =>
      loadedFamilies.has(declared.toLowerCase()),
    );
    if (loaded !== undefined) {
      family = loaded;
    }
  }
  const first = rawBlock.declaredFamilies[0];
  const firstIsNamedFont =
    first !== undefined && !GENERIC_FAMILIES.has(first.toLowerCase());
  if (firstIsNamedFont && family.toLowerCase() !== first.toLowerCase()) {
    return {
      family,
      note: `first declared family ${first} is not the one drawn`,
    };
  }
  return { family, note: null };
}

/**
 * Turns what the browser read in one viewport into that viewport's part of facts.json: the text
 * blocks with their measured values, and the page facts (type sizes, text colors, spacing, left
 * edges, and interactive targets). It also returns each block's text snippet, which the file keeps
 * once. A block whose every sampled character the browser could not find at its own position is
 * left out, because something hides it.
 *
 * @param {object} raw what readPage returned, with each block's rendered font filled in
 * @returns {{ viewport: object, texts: Map<string, string> }}
 */
/** WCAG 2.2 SC 1.4.3: the lowest contrast for normal text, and for large text. */
export const TEXT_CONTRAST_MINIMUM = 4.5;
export const LARGE_TEXT_CONTRAST_MINIMUM = 3;

/** WCAG 2.2 SC 2.5.8: the smallest width and height of a pointer target, in CSS px. */
export const TARGET_SIZE_MINIMUM = 24;

/** Bringhurst 2.1.2: the most characters per line of paragraph text. */
export const LINE_LENGTH_MAXIMUM = 75;

/** A block counts as paragraph text for the line length rule when it has this many lines or more. */
export const PARAGRAPH_MINIMUM_LINES = 3;

/** The GUIDELINES.md entry title of each rule that findViolations checks. */
export const VIOLATION_GUIDELINES = {
  "text-contrast": "Text contrast (minimum)",
  "large-text-contrast": "Text contrast (minimum)",
  "target-size": "Target size (minimum)",
  "line-length": "Line length (measure)",
};

/** The top-level note that says what the violations list covers and what it cannot see. */
export const VIOLATIONS_NOTE =
  "violations lists only text contrast under 4.5:1 (3:1 for large text: 24 px, or 18.66 px bold), targets under 24 px without room around them, and paragraph lines over 75 characters (blocks of 3 or more lines). It leaves out text in a disabled control, in a logo or an image, inline links in text, and small targets whose 24 px circles touch nothing. It cannot see non-text contrast (not measured), contrast marked not measurable, text that is only decoration, unstyled browser controls, and targets that are essential or have an equal control elsewhere; judge those by eye.";

/**
 * Returns true when text counts as large under WCAG: at least 18 pt (24 CSS px), or at least
 * 14 pt (18.66 CSS px) and bold (weight 700 or more).
 *
 * @param {number} fontSize CSS px
 * @param {number} fontWeight
 */
export function isLargeText(fontSize, fontWeight) {
  return fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
}

/** Returns the distance from a point to the nearest point of a box [x, y, width, height]. */
function distanceToBox(pointX, pointY, box) {
  const [left, top, width, height] = box;
  const dx = Math.max(left - pointX, 0, pointX - (left + width));
  const dy = Math.max(top - pointY, 0, pointY - (top + height));
  return Math.hypot(dx, dy);
}

/**
 * Returns the threshold violations of one viewport, checked in code against fixed numbers
 * (FR-79): text contrast, target size, and line length. Each names its rule, the GUIDELINES.md
 * entry, the measured value, the threshold, and the selector and box. It skips text and targets
 * with an exemption the DOM shows. An undersized target passes when a 24 px circle centered on it
 * touches no other target and no other undersized target's circle (WCAG 2.2 SC 2.5.8).
 *
 * @param {{ selector: string, box: number[], font_size: number, font_weight: number, lines: number, characters_per_line: number | null, contrast?: number | null }[]} textBlocks
 * @param {(string | null)[]} blockExemptions the exemption of each text block, at the same index
 * @param {{ selector: string, box: number[] }[]} targets
 * @param {(string | null)[]} targetExemptions the exemption of each target, at the same index
 */
export function findViolations(
  textBlocks,
  blockExemptions,
  targets,
  targetExemptions,
) {
  const violations = [];
  const addViolation = (rule, value, threshold, item) => {
    violations.push({
      rule,
      guideline: VIOLATION_GUIDELINES[rule],
      value,
      threshold,
      selector: item.selector,
      box: item.box,
    });
  };
  textBlocks.forEach((block, index) => {
    const exempt = blockExemptions[index] !== null;
    if (typeof block.contrast === "number" && !exempt) {
      const large = isLargeText(block.font_size, block.font_weight);
      const minimum = large
        ? LARGE_TEXT_CONTRAST_MINIMUM
        : TEXT_CONTRAST_MINIMUM;
      if (block.contrast < minimum) {
        addViolation(
          large ? "large-text-contrast" : "text-contrast",
          block.contrast,
          minimum,
          block,
        );
      }
    }
    if (
      block.lines >= PARAGRAPH_MINIMUM_LINES &&
      typeof block.characters_per_line === "number" &&
      block.characters_per_line > LINE_LENGTH_MAXIMUM
    ) {
      addViolation(
        "line-length",
        block.characters_per_line,
        LINE_LENGTH_MAXIMUM,
        block,
      );
    }
  });
  const radius = TARGET_SIZE_MINIMUM / 2;
  const isUndersized = (target) =>
    target.box[2] < TARGET_SIZE_MINIMUM || target.box[3] < TARGET_SIZE_MINIMUM;
  const centerOf = (target) => [
    target.box[0] + target.box[2] / 2,
    target.box[1] + target.box[3] / 2,
  ];
  targets.forEach((target, index) => {
    if (!isUndersized(target) || targetExemptions[index] !== null) {
      return;
    }
    const [centerX, centerY] = centerOf(target);
    let crowded = false;
    targets.forEach((other, otherIndex) => {
      if (otherIndex === index) {
        return;
      }
      if (isUndersized(other)) {
        const [otherX, otherY] = centerOf(other);
        // Two circles of the same radius overlap when their centers are closer than twice it.
        if (Math.hypot(centerX - otherX, centerY - otherY) < radius * 2) {
          crowded = true;
        }
      } else if (distanceToBox(centerX, centerY, other.box) < radius) {
        crowded = true;
      }
    });
    if (crowded) {
      addViolation(
        "target-size",
        Math.min(target.box[2], target.box[3]),
        TARGET_SIZE_MINIMUM,
        target,
      );
    }
  });
  return violations;
}

export function summarizeViewport(raw) {
  const hiddenSelectors = new Set();
  for (const rawBlock of raw.blocks) {
    const allMissing =
      rawBlock.samples.length > 0 &&
      rawBlock.samples.every((sample) => !sample.found);
    if (allMissing) {
      hiddenSelectors.add(rawBlock.selector);
    }
  }
  const allBlocks = raw.allBlocks.filter(
    (block) => !hiddenSelectors.has(block.selector),
  );
  const loadedFamilies = new Set(
    raw.loadedFontFamilies.map((family) => family.toLowerCase()),
  );

  const texts = new Map();
  const textBlocks = [];
  // The WCAG exemption of each entry of textBlocks, at the same index, or null.
  const blockExemptions = [];
  const listedBlocks = [];
  for (const rawBlock of raw.blocks) {
    if (hiddenSelectors.has(rawBlock.selector)) {
      continue;
    }
    listedBlocks.push(rawBlock);
    texts.set(rawBlock.selector, rawBlock.text);
    const notes = [...rawBlock.notes];
    const size = findMainStyle(rawBlock.styleRuns, (run) =>
      roundToTenth(run.fontSize),
    );
    const weight = findMainStyle(rawBlock.styleRuns, (run) => run.fontWeight);
    const color = findMainStyle(rawBlock.styleRuns, (run) =>
      toHexColor(run.color),
    );
    if (size.mixed) {
      notes.push("mixed sizes: font_size is the size of most characters");
    }
    if (weight.mixed) {
      notes.push("mixed weights: font_weight is the weight of most characters");
    }
    if (color.mixed) {
      notes.push("mixed colors: color is the color of most characters");
    }
    const font = nameDrawnFont(rawBlock, loadedFamilies);
    if (font.note !== null) {
      notes.push(font.note);
    }
    const lines = measureLines(rawBlock.characterRects);
    const fontSize = Number(size.value);
    let lineHeight = null;
    let lineHeightRatio = null;
    if (rawBlock.lineHeight !== null) {
      lineHeight = roundToTenth(rawBlock.lineHeight);
      lineHeightRatio = Math.round((lineHeight / fontSize) * 100) / 100;
    } else {
      notes.push("line height normal, one line");
    }
    const block = {
      selector: rawBlock.selector,
      box: toPixelBox(rawBlock.box),
      font_family: font.family,
      font_size: fontSize,
      font_weight: Number(weight.value),
      line_height: lineHeight,
      line_height_ratio: lineHeightRatio,
      lines: lines.lines,
      characters_per_line: lines.charactersPerLine,
      color: String(color.value),
      ...measureContrast(rawBlock, raw.canvasColor),
    };
    if (rawBlock.exemption) {
      notes.push(`exempt from the contrast minimum: ${rawBlock.exemption}`);
    }
    if (notes.length > 0) {
      block.notes = notes;
    }
    textBlocks.push(block);
    blockExemptions.push(rawBlock.exemption ?? null);
  }

  const typeSizes = [];
  const sizeGroups = countStyleValues(allBlocks, (run) =>
    roundToTenth(run.fontSize),
  );
  for (const [size, group] of sizeGroups) {
    typeSizes.push({
      size,
      blocks: group.blocks,
      characters: group.characters,
    });
  }
  typeSizes.sort((first, second) => second.size - first.size);

  const textColors = [];
  const colorGroups = countStyleValues(allBlocks, (run) =>
    toHexColor(run.color),
  );
  for (const [color, group] of colorGroups) {
    textColors.push({
      color,
      blocks: group.blocks,
      characters: group.characters,
      example: group.example,
    });
  }
  textColors.sort((first, second) => second.characters - first.characters);

  const spacingGroups = new Map();
  for (const gap of raw.gaps) {
    const group = spacingGroups.get(gap.pixels) ?? {
      px: gap.pixels,
      count: 0,
      example: gap.parentSelector,
    };
    group.count += 1;
    spacingGroups.set(gap.pixels, group);
  }
  const spacing = [...spacingGroups.values()];
  spacing.sort((first, second) => first.px - second.px);

  const leftValues = [];
  for (const rawBlock of listedBlocks) {
    if (rawBlock.textLeft !== null) {
      leftValues.push(Math.round(rawBlock.textLeft));
    }
  }
  const leftEdges = [];
  let unsharedEdges = 0;
  for (const group of clusterValues(leftValues, 1)) {
    if (group.count < 2) {
      unsharedEdges += 1;
      continue;
    }
    leftEdges.push({ x: group.value, blocks: group.count });
  }

  const targets = [];
  const targetExemptions = [];
  for (const target of raw.targets) {
    targets.push({ selector: target.selector, box: toPixelBox(target.box) });
    targetExemptions.push(target.exemption ?? null);
  }
  const violations = findViolations(
    textBlocks,
    blockExemptions,
    targets,
    targetExemptions,
  );

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
    text_blocks_found: allBlocks.length,
    text_blocks_left_out: allBlocks.length - textBlocks.length,
    text_blocks: textBlocks,
    type_sizes: typeSizes,
    text_colors: textColors,
    spacing,
    left_edges: leftEdges,
    blocks_on_no_shared_edge: unsharedEdges,
    targets,
    targets_left_out: raw.targetsFound - raw.targets.length,
    violations,
  };
  return { viewport, texts };
}

// ---------------------------------------------------------------------------------------------
// The browser side. readPage runs inside the page through Playwright's page.evaluate, so it must
// not use anything from this module: Playwright sends its source text to the browser.
// ---------------------------------------------------------------------------------------------

/**
 * Reads the page's layout and computed styles: every text block, the gaps between stacked sibling
 * blocks, and the interactive targets. A text block is an element that is not `display: inline`
 * and holds visible text of its own; text inside inline children (a, strong, span) counts toward
 * it, and text inside a nested block counts toward that block. SVG text is left out, because SVG
 * draws text with `fill` and transforms that this script does not read. Every color, size, and
 * weight is read from the element that draws each piece of text. To sample what lies under the
 * text it scrolls the window, adds a style tag that makes every element answer hit tests, asks the
 * browser which elements are painted at a point, top first, then removes the tag and scrolls back.
 *
 * @param {{ maxBlocks: number, maxTargets: number, snippetLength: number, maxCharacters: number }} limits
 */
function readPage(limits) {
  const pageHeight = document.documentElement.scrollHeight;
  const pageWidth = document.documentElement.scrollWidth;

  /**
   * Returns the WCAG exemption that the DOM shows for an element, or null: inside a disabled
   * control, or inside a logo or an image (SC 1.4.3). A logo is an element whose class, id, or
   * aria-label holds "logo"; an image is an svg or an element with role="img".
   */
  function exemptionOf(element) {
    if (element.closest(":disabled, [aria-disabled='true']") !== null) {
      return "disabled control";
    }
    const logoOrImage =
      "svg, [role='img'], [class*='logo' i], [id*='logo' i], [aria-label*='logo' i]";
    if (element.closest(logoOrImage) !== null) {
      return "logo or image";
    }
    return null;
  }

  /**
   * Returns the exemption of a text block: the one exemption that every text node of the block
   * shares, such as a logo span inside a paragraph, or else the exemption of the block's owner.
   */
  function blockExemption(entries, owner) {
    const found = [];
    for (const entry of entries) {
      if (entry.textNode !== undefined) {
        found.push(exemptionOf(entry.textNode.parentElement));
      }
    }
    const first = found[0];
    if (
      first !== undefined &&
      first !== null &&
      found.every((value) => value === first)
    ) {
      return first;
    }
    return exemptionOf(owner);
  }

  /**
   * Returns true when a target is a link inside a sentence: drawn inline, with text of its parent
   * outside it. WCAG SC 2.5.8 exempts such targets from the size minimum.
   */
  function isInlineInText(element) {
    if (getComputedStyle(element).display !== "inline") {
      return false;
    }
    const parent = element.parentElement;
    if (parent === null) {
      return false;
    }
    for (const node of parent.childNodes) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== "") {
        return true;
      }
    }
    return false;
  }

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

  /** Says whether a computed background color paints anything (its alpha is above zero). */
  function paintsColor(colorText) {
    return colorText !== "rgba(0, 0, 0, 0)" && colorText !== "transparent";
  }

  /** Returns the nearest element above a node whose display is not inline: the block that owns its text. */
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

  /** Says whether an element changes the colors drawn under or inside it by opacity, a filter, or a blend mode. */
  function hasPaintEffect(element) {
    const style = getComputedStyle(element);
    return (
      Number.parseFloat(style.opacity) < 1 ||
      style.filter !== "none" ||
      style.backdropFilter !== "none" ||
      style.mixBlendMode !== "normal"
    );
  }

  /** Says whether the element's ::before or ::after has content and paints a background. */
  function hasPaintedPseudo(element) {
    for (const pseudo of ["::before", "::after"]) {
      const style = getComputedStyle(element, pseudo);
      const hasContent = style.content !== "none" && style.content !== "normal";
      const paints =
        paintsColor(style.backgroundColor) || style.backgroundImage !== "none";
      if (hasContent && paints) {
        return true;
      }
    }
    return false;
  }

  // Measure layout at the top of the page, so fixed and sticky elements sit where the screenshot shows them.
  window.scrollTo(0, 0);

  // Each owner gets its text nodes in document order, and a { lineBreak: true } entry for each <br>.
  const entriesByOwner = new Map();
  const walker = document.createTreeWalker(
    document.body,
    // The bitwise OR asks the walker for both text nodes and elements.
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
  );
  let node = walker.nextNode();
  while (node !== null) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.localName === "br") {
        const owner = findOwner(node);
        const list = owner === null ? undefined : entriesByOwner.get(owner);
        list?.push({ lineBreak: true });
      }
    } else if (node.parentElement?.closest("svg") == null) {
      const owner = findOwner(node);
      if (owner !== null) {
        const list = entriesByOwner.get(owner);
        if (node.data.trim() !== "") {
          entriesByOwner.set(owner, [...(list ?? []), { textNode: node }]);
        } else if (list !== undefined) {
          // White space between inline children belongs to the block's text, but alone never makes a block.
          list.push({ textNode: node });
        }
      }
    }
    node = walker.nextNode();
  }

  const candidates = [];
  for (const [owner, entries] of entriesByOwner) {
    const visible = owner.checkVisibility({
      opacityProperty: true,
      visibilityProperty: true,
    });
    const rect = owner.getBoundingClientRect();
    const style = getComputedStyle(owner);
    const tooSmall = rect.width <= 1 && rect.height <= 1;
    const outsidePage =
      rect.right + window.scrollX <= 0 ||
      rect.bottom + window.scrollY <= 0 ||
      rect.left + window.scrollX >= pageWidth ||
      rect.top + window.scrollY >= pageHeight;
    const clippedAway = style.clipPath !== "none" || style.clip !== "auto";
    if (!visible || tooSmall || outsidePage || clippedAway) {
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
      const ancestorStyle = getComputedStyle(ancestor);
      const clips =
        ancestorStyle.overflowX !== "visible" ||
        ancestorStyle.overflowY !== "visible";
      if (clips) {
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
    let rawText = "";
    const styleRuns = [];
    for (const entry of entries) {
      if (entry.lineBreak) {
        rawText += " ";
        continue;
      }
      rawText += entry.textNode.data;
      const characters = entry.textNode.data.replace(/\s/g, "").length;
      const parent = entry.textNode.parentElement;
      if (characters > 0 && parent !== null) {
        const textStyle = getComputedStyle(parent);
        styleRuns.push({
          characters,
          color: textStyle.color,
          fontSize: Number.parseFloat(textStyle.fontSize),
          fontWeight: Number(textStyle.fontWeight),
        });
      }
    }
    if (styleRuns.length === 0) {
      continue;
    }
    // Collapse each run of white space to one space, as the browser draws it.
    const text = rawText.replace(/\s+/g, " ").trim();
    const isHeading = /^h[1-6]$/.test(owner.localName);
    candidates.push({
      owner,
      entries,
      notes,
      style,
      text,
      styleRuns,
      isHeading,
    });
  }

  // Headings first, then the other blocks, each in document order; the list is cut after maxBlocks.
  const ordered = [
    ...candidates.filter((candidate) => candidate.isHeading),
    ...candidates.filter((candidate) => !candidate.isHeading),
  ];

  const allBlocks = [];
  for (const candidate of ordered) {
    allBlocks.push({ selector: null, styleRuns: candidate.styleRuns });
  }

  const blocks = [];
  for (const [index, candidate] of ordered
    .slice(0, limits.maxBlocks)
    .entries()) {
    const { owner, style, entries } = candidate;
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
    for (const entry of entries) {
      const textNode = entry.textNode;
      if (textNode === undefined) {
        continue;
      }
      for (let offset = 0; offset < textNode.data.length; offset++) {
        if (measured >= limits.maxCharacters) {
          break;
        }
        const character = textNode.data[offset];
        if (character === "\n" || character === "\r") {
          // A kept line break (white-space: pre or pre-line) ends a line; it is not a character on it.
          continue;
        }
        range.setStart(textNode, offset);
        range.setEnd(textNode, offset + 1);
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
          textElement: textNode.parentElement,
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

    const declaredFamilies = [];
    for (const family of style.fontFamily.split(",")) {
      declaredFamilies.push(family.trim().replace(/^["']|["']$/g, ""));
    }

    blocks.push({
      selector,
      text: candidate.text.slice(0, limits.snippetLength),
      box: pageBox(owner.getBoundingClientRect()),
      fontFamily: style.fontFamily,
      declaredFamilies,
      renderedFamily: null,
      renderedIsCustom: false,
      styleRuns: candidate.styleRuns,
      lineHeight,
      characterRects,
      textLeft,
      notes: candidate.notes,
      exemption: blockExemption(entries, owner),
      samples: [],
      owner,
    });
  }

  // The vertical space between neighboring block-level siblings in flow, which holds their margins and the parent's gap.
  const blockDisplays = new Set([
    "block",
    "flex",
    "grid",
    "table",
    "list-item",
    "flow-root",
  ]);
  const gaps = [];
  for (const element of [
    document.body,
    ...document.body.querySelectorAll("*"),
  ]) {
    if (getComputedStyle(element).display === "none") {
      continue;
    }
    const children = [];
    for (const child of element.children) {
      const childStyle = getComputedStyle(child);
      const inFlow =
        childStyle.position !== "absolute" && childStyle.position !== "fixed";
      const childRect = child.getBoundingClientRect();
      const isBlock = blockDisplays.has(childStyle.display);
      if (inFlow && isBlock && childRect.width > 0 && childRect.height > 0) {
        children.push(childRect);
      }
    }
    for (let index = 1; index < children.length; index++) {
      const previous = children[index - 1];
      const current = children[index];
      if (previous === undefined || current === undefined) {
        continue;
      }
      const stacked = current.top >= previous.bottom - 0.5;
      const gap = Math.round(current.top - previous.bottom);
      if (stacked && gap >= 1) {
        gaps.push({ pixels: gap, parent: element });
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
  // Only the first parent of each distance is named in the file, so build those selectors only.
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
    if (visible && rect.width > 1 && rect.height > 1) {
      targetElements.push(element);
    }
  }
  const targets = [];
  for (const element of targetElements.slice(0, limits.maxTargets)) {
    let exemption = null;
    if (element.matches(":disabled, [aria-disabled='true']")) {
      exemption = "disabled control";
    } else if (isInlineInText(element)) {
      exemption = "inline link in text";
    }
    targets.push({
      selector: cachedSelector(element),
      box: pageBox(element.getBoundingClientRect()),
      exemption,
    });
  }

  // While sampling, every element answers hit tests, so an overlay with pointer-events: none is seen.
  const forceHits = document.createElement("style");
  forceHits.textContent =
    "*, *::before, *::after { pointer-events: auto !important; }";
  document.documentElement.append(forceHits);

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
        block.samples.push({ found: false });
        continue;
      }
      let covered = false;
      for (const element of stack.slice(0, firstOwnIndex)) {
        const style = getComputedStyle(element);
        const paints =
          paintsColor(style.backgroundColor) ||
          style.backgroundImage !== "none" ||
          replacedTags.has(element.localName) ||
          hasPaintedPseudo(element);
        if (paints) {
          covered = true;
        }
      }
      let pseudo = false;
      let paintEffect = false;
      const layers = [];
      for (const element of stack.slice(firstOwnIndex)) {
        const style = getComputedStyle(element);
        if (hasPaintedPseudo(element)) {
          pseudo = true;
        }
        if (hasPaintEffect(element)) {
          paintEffect = true;
        }
        layers.push({
          backgroundColor: style.backgroundColor,
          hasImage: style.backgroundImage !== "none",
          replaced:
            replacedTags.has(element.localName) &&
            element !== block.owner &&
            !block.owner.contains(element),
        });
      }
      // An ancestor's opacity changes the text even where the ancestor's box is not under the point.
      let ancestor = rect.textElement;
      while (ancestor !== null) {
        if (hasPaintEffect(ancestor)) {
          paintEffect = true;
        }
        ancestor = ancestor.parentElement;
      }
      const textStyle = getComputedStyle(rect.textElement);
      const fillColor = textStyle.webkitTextFillColor;
      const textFill =
        textStyle.backgroundClip === "text" ||
        textStyle.webkitBackgroundClip === "text" ||
        (fillColor !== undefined &&
          fillColor !== textStyle.color &&
          !paintsColor(fillColor));
      block.samples.push({
        found: true,
        covered,
        pseudo,
        paintEffect,
        textFill,
        color: textStyle.color,
        layers,
      });
    }
  }
  forceHits.remove();
  window.scrollTo(0, 0);

  // Where no element paints, the browser shows the root's background, or the body's when the root has none.
  let canvasColor = getComputedStyle(document.documentElement).backgroundColor;
  if (!paintsColor(canvasColor)) {
    canvasColor = getComputedStyle(document.body).backgroundColor;
  }

  const loadedFontFamilies = [];
  for (const face of document.fonts) {
    if (face.status === "loaded") {
      loadedFontFamilies.push(face.family.replace(/^["']|["']$/g, ""));
    }
  }

  for (const block of blocks) {
    // Elements cannot leave the browser; the selector names the block.
    delete block.owner;
    for (const rect of block.characterRects) {
      delete rect.textElement;
    }
  }
  return {
    pageHeight,
    pageWidth,
    canvasColor,
    loadedFontFamilies,
    blocks,
    allBlocks,
    gaps: gapsOut,
    targets,
    targetsFound: targetElements.length,
  };
}

// ---------------------------------------------------------------------------------------------
// The Node side: find Playwright, open the page, take the screenshots, and write the files.
// ---------------------------------------------------------------------------------------------

/**
 * Returns the path of packs/package.json in the deskcrit checkout that holds the script folder, or
 * null when the script does not run from a deskcrit checkout. A checkout has GUIDELINES.md and
 * packs/package.json at its root, four levels above the script folder. Reason: an installed copy
 * of the plugin reads nothing it was not given, so it must not load a package from whatever folder
 * sits above it (bd memory inputs-only-given, crit-dh9). A full clone of the repository that a
 * plugin marketplace makes also counts as a checkout, and that is accepted.
 *
 * @param {string} scriptFolder
 * @returns {string | null}
 */
export function findCheckoutPacksAnchor(scriptFolder) {
  const checkoutRoot = resolve(scriptFolder, "../../../..");
  const packsAnchor = join(checkoutRoot, "packs", "package.json");
  const isCheckout =
    existsSync(join(checkoutRoot, "GUIDELINES.md")) && existsSync(packsAnchor);
  if (!isCheckout) {
    return null;
  }
  return packsAnchor;
}

/**
 * Loads the `playwright` package without installing it: first from the project in the working
 * directory, then, only when this script runs from a deskcrit checkout, from that checkout's
 * packs/. It returns null when neither has it.
 *
 * @param {string} workingDirectory
 */
export function loadPlaywright(workingDirectory) {
  const scriptFolder = fileURLToPath(new URL(".", import.meta.url));
  const searchFrom = [join(workingDirectory, "package.json")];
  const packsAnchor = findCheckoutPacksAnchor(scriptFolder);
  if (packsAnchor !== null) {
    searchFrom.push(packsAnchor);
  }
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

/**
 * Turns the PAGE argument into a URL: an http(s) URL as given, anything else as a local file.
 * A local path may end with a hash, such as `deck.html#3`, which picks slide 3 of a deck (FR-82):
 * the hash is split off and added to the file URL as a hash, because pathToFileURL would encode
 * `#` as `%23` and open a file of that name. A path whose whole text names a file that exists is
 * used as it is, so a file with `#` in its name still opens.
 */
export function toPageUrl(pageArgument) {
  if (/^https?:\/\//i.test(pageArgument)) {
    return pageArgument;
  }
  const wholePath = resolve(pageArgument);
  if (existsSync(wholePath)) {
    return pathToFileURL(wholePath).href;
  }
  const hashStart = pageArgument.lastIndexOf("#");
  if (hashStart !== -1) {
    const filePath = resolve(pageArgument.slice(0, hashStart));
    if (existsSync(filePath)) {
      return pathToFileURL(filePath).href + pageArgument.slice(hashStart);
    }
  }
  throw new MeasureRefusal(`the file ${pageArgument} does not exist`);
}

/** Returns the first line of an error's message, so the script prints exactly one line. */
function firstLineOf(error) {
  let message = String(error);
  if (error instanceof Error) {
    message = error.message;
  }
  return message.split("\n")[0] ?? message;
}

/**
 * Opens the page in one viewport, in light mode unless the caller names dark, and waits for it to settle: the load event, a
 * quiet network, and web fonts, each with a time limit. A page that never settles is still
 * measured, and the returned notes say what did not finish. An HTTP error status refuses the page.
 * It also returns the URL the browser ended on, which differs from the one asked after a redirect.
 */
async function openPage(
  browser,
  viewport,
  pageUrl,
  colorScheme = COLOR_SCHEME,
) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    colorScheme,
  });
  const page = await context.newPage();
  const notes = [];
  try {
    const response = await page.goto(pageUrl, {
      waitUntil: "load",
      timeout: LOAD_TIMEOUT_MS,
    });
    // A file:// page has no HTTP status; response is null or reports 0 or 200.
    const status = response?.status() ?? 0;
    if (status >= 400) {
      await context.close();
      throw new MeasureRefusal(`the page answered HTTP ${status}`);
    }
  } catch (error) {
    if (error instanceof MeasureRefusal) {
      throw error;
    }
    if (!(error instanceof Error) || error.name !== "TimeoutError") {
      await context.close();
      throw new MeasureRefusal(`the page did not open: ${firstLineOf(error)}`);
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
  return { context, page, notes, finalUrl: page.url() };
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
        // isCustomFont is true for a web font; its familyName is the name inside the font file.
        block.renderedIsCustom = best.isCustomFont === true;
      }
    } catch {
      // The browser could not say; the declared list stands, with a note.
    }
  }
  await session.detach();
}

/**
 * Plans the one-screen crops of a full-page screenshot with crop.mjs's splitLength: full width,
 * one viewport tall, top to bottom, neighbors sharing crop.mjs's OVERLAP_FRACTION. splitLength
 * stretches the last crop to the bottom of the page rather than add a near copy, so the last crop
 * can be up to one and a half screens tall. The first crop is always what shows before any scroll.
 *
 * @param {number} pageWidth
 * @param {number} pageHeight
 * @param {number} screenHeight
 * @returns {{ x: number, y: number, width: number, height: number }[]}
 */
export function planScreenCrops(pageWidth, pageHeight, screenHeight) {
  const pieces = splitLength(
    pageHeight,
    screenHeight,
    Math.round(screenHeight * OVERLAP_FRACTION),
  );
  const crops = [];
  for (const piece of pieces) {
    crops.push({
      x: 0,
      y: piece.start,
      width: pageWidth,
      height: piece.length,
    });
  }
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
 * Returns one viewport per width in a comma-separated list such as "768,1024", each 800 px tall and
 * named w<N>, in the order given. It returns null when an item is not a whole number written
 * without a leading zero, is outside 200 to 3840, or repeats an earlier item.
 *
 * @param {string} text
 * @returns {{ name: string, width: number, height: number }[] | null}
 */
export function widthViewports(text) {
  const viewports = [];
  for (const item of text.split(",")) {
    if (!/^[1-9][0-9]*$/.test(item)) {
      return null;
    }
    const width = Number(item);
    if (width < MIN_WIDTH || width > MAX_WIDTH) {
      return null;
    }
    if (viewports.some((viewport) => viewport.width === width)) {
      return null;
    }
    viewports.push({
      name: `w${width}`,
      width,
      height: WIDTH_VIEWPORT_HEIGHT,
    });
  }
  return viewports;
}

// ---------------------------------------------------------------------------------------------
// Dark mode, only with --dark (PRD FR-85). The pure functions here are tested without a browser.
// ---------------------------------------------------------------------------------------------

/**
 * Returns true when a control's accessible name or text holds one of the whole words dark, light,
 * theme, or appearance, so the control may switch the page's color scheme.
 *
 * @param {string} name
 * @returns {boolean}
 */
export function isThemeControlName(name) {
  return THEME_CONTROL_PATTERN.test(name);
}

/**
 * Returns true when two color probes (see readColorProbe) differ in any value that both hold. A key
 * that is null on either side, because its element was not found in that load, is left out, so an
 * element that only one load has does not count as a dark mode.
 *
 * @param {Record<string, string | null>} lightProbe
 * @param {Record<string, string | null>} darkProbe
 * @returns {boolean}
 */
export function colorsDiffer(lightProbe, darkProbe) {
  for (const [key, lightValue] of Object.entries(lightProbe)) {
    const darkValue = darkProbe[key];
    if (lightValue === null || darkValue === null || darkValue === undefined) {
      continue;
    }
    if (lightValue !== darkValue) {
      return true;
    }
  }
  return false;
}

/**
 * Returns the first color probe without the keys whose value changed by the second read, a short
 * moment later. Such a color moves on its own (an animation, a carousel, a timer), so a difference
 * from the dark load would say nothing about dark mode, and it is left out of the comparison.
 *
 * @param {Record<string, string | null>} firstRead
 * @param {Record<string, string | null>} secondRead
 * @returns {Record<string, string | null>}
 */
export function dropMovingColors(firstRead, secondRead) {
  const stable = {};
  for (const [key, value] of Object.entries(firstRead)) {
    if (secondRead[key] === value) {
      stable[key] = value;
    }
  }
  return stable;
}

/**
 * Returns the name of a viewport's dark entry, which also names its screenshot and crops.
 *
 * @param {string} name
 * @returns {string}
 */
export function darkViewportName(name) {
  return `${name}-dark`;
}

/**
 * Returns the relative luminance of the page background in a color probe: the body's background
 * over the html element's background over white, the color a browser shows behind the page.
 *
 * @param {Record<string, string | null>} probe
 * @returns {number}
 */
export function pageBackgroundLuminance(probe) {
  let color = { red: 255, green: 255, blue: 255, alpha: 1 };
  for (const key of ["html background-color", "body background-color"]) {
    const layer = parseCssColor(probe[key] ?? "");
    if (layer !== null) {
      color = compositeColor(layer, color);
    }
  }
  return relativeLuminance(color);
}

/**
 * Joins the dark-mode results of the viewports into the top-level dark_mode record and its notes.
 * The system setting wins over a toggle, and a toggle over none. When some viewports have a dark
 * entry and others do not, each viewport without one gets a note with its reason. When none has
 * one, one top-level note gives the reasons.
 *
 * @param {{ name: string, foundBy: "system_setting" | "toggle" | "none", control?: { name: string, selector: string }, reason?: string }[]} results one per light viewport, in order
 * @returns {{ darkMode: { found_by: string, control?: { name: string, selector: string } }, notes: string[], viewportNotes: Map<string, string> }}
 */
export function summarizeDarkMode(results) {
  const viewportNotes = new Map();
  const bySystem = results.some(
    (result) => result.foundBy === "system_setting",
  );
  const byToggle = results.find((result) => result.foundBy === "toggle");
  if (!bySystem && byToggle === undefined) {
    const reasons = [];
    for (const result of results) {
      if (result.reason !== undefined && !reasons.includes(result.reason)) {
        reasons.push(result.reason);
      }
    }
    return {
      darkMode: { found_by: "none" },
      notes: [
        `--dark: no dark mode was found, so no -dark entry is written: ${reasons.join("; ")}`,
      ],
      viewportNotes,
    };
  }
  for (const result of results) {
    if (result.foundBy === "none") {
      viewportNotes.set(
        result.name,
        `--dark: no dark entry for this viewport, though other viewports have one: ${result.reason}`,
      );
    }
  }
  if (bySystem) {
    return {
      darkMode: { found_by: "system_setting" },
      notes: [],
      viewportNotes,
    };
  }
  return {
    darkMode: { found_by: "toggle", control: byToggle.control },
    notes: [],
    viewportNotes,
  };
}

/**
 * Reads a control's accessible name, as the browser computes it, from Playwright's ARIA snapshot of
 * the element: the quoted name on the first line with a role, such as `- checkbox "Dark mode"`, or
 * the text of a `- text:` line for a label that names a control elsewhere. It returns null when the
 * snapshot holds neither.
 *
 * @param {string} snapshot
 * @returns {string | null}
 */
export function nameFromAriaSnapshot(snapshot) {
  for (const line of snapshot.split("\n")) {
    // The name is written as a JSON-style quoted string after the role: `- role "name" [state]`.
    const named = /^\s*- [\w-]+ ("(?:[^"\\]|\\.)*")/.exec(line);
    if (named !== null) {
      return JSON.parse(named[1]);
    }
  }
  for (const line of snapshot.split("\n")) {
    const text = /^\s*- text: (.+)$/.exec(line);
    if (text !== null) {
      return text[1].trim();
    }
  }
  return null;
}

/**
 * Runs one viewport's dark-mode check and turns any error in it, such as a click that times out or
 * a page load that fails, into a result with no dark mode and a note with the reason, so a failed
 * dark-mode check never stops a run whose light entries measured fine. The result has `failed`
 * true, so the caller can remove the files a half-finished dark entry wrote.
 *
 * @param {string} viewportName
 * @param {() => Promise<{ result: { name: string, foundBy: string, control?: { name: string, selector: string }, reason?: string }, measured: object | null, finalUrl: string }>} attempt
 */
export async function guardDarkMode(viewportName, attempt) {
  try {
    return { ...(await attempt()), failed: false };
  } catch (error) {
    return {
      result: {
        name: viewportName,
        foundBy: "none",
        reason: `the dark-mode check failed: ${firstLineOf(error)}`,
      },
      measured: null,
      finalUrl: null,
      failed: true,
    };
  }
}

/**
 * Returns the element id that the hash of a local page URL names, such as "3" for
 * file:///deck.html#3, or null for an http(s) URL or a URL with no hash. The script measures only
 * that element, one slide of a deck (FR-79, FR-82, crit-3wg).
 */
export function slideIdOf(pageUrl) {
  if (!pageUrl.startsWith("file:")) {
    return null;
  }
  const hash = new URL(pageUrl).hash;
  if (hash.length < 2) {
    return null;
  }
  return decodeURIComponent(hash.slice(1));
}

/** Returns a URL without its hash, so the redirect check does not count a slide anchor as a move. */
export function withoutHash(url) {
  const hashStart = url.indexOf("#");
  return hashStart === -1 ? url : url.slice(0, hashStart);
}

/**
 * Moves every box and left edge of a raw page read into the pixels of a screenshot clipped to the
 * slide's box, and sets the page size to the slide size. The read itself is in page pixels. It
 * changes the raw read in place and returns it.
 *
 * @param {{ blocks: { box: { x: number, y: number }, textLeft: number | null }[], targets: { box: { x: number, y: number } }[], pageWidth: number, pageHeight: number }} raw
 * @param {{ x: number, y: number, width: number, height: number }} slideBox the clip, in page pixels
 */
export function shiftRawToSlide(raw, slideBox) {
  for (const block of raw.blocks) {
    block.box = {
      ...block.box,
      x: block.box.x - slideBox.x,
      y: block.box.y - slideBox.y,
    };
    if (block.textLeft !== null) {
      block.textLeft -= slideBox.x;
    }
  }
  for (const target of raw.targets) {
    target.box = {
      ...target.box,
      x: target.box.x - slideBox.x,
      y: target.box.y - slideBox.y,
    };
  }
  raw.pageWidth = slideBox.width;
  raw.pageHeight = slideBox.height;
  return raw;
}

/**
 * Runs in the page: hides every element that is not the element with this id, inside it, or
 * around it, and returns that element's box in page pixels, in whole pixels. It returns null when
 * no element has the id or the element has no size. Hiding the rest keeps the text and targets of
 * other slides out of the facts, and lets a deck whose hash only scrolls show one slide.
 */
function isolateSlide(id) {
  const slide = document.getElementById(id);
  if (slide === null) {
    return null;
  }
  // Check the size before hiding anything, so an anchor with no size leaves the page as it was.
  const sizeRect = slide.getBoundingClientRect();
  if (sizeRect.width < 1 || sizeRect.height < 1) {
    return null;
  }
  for (const element of document.body.querySelectorAll("*")) {
    const keep =
      element === slide || slide.contains(element) || element.contains(slide);
    if (!keep) {
      element.style.setProperty("display", "none", "important");
    }
  }
  const rect = slide.getBoundingClientRect();
  return {
    x: Math.round(rect.left + window.scrollX),
    y: Math.round(rect.top + window.scrollY),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
  };
}

/**
 * Runs inside the page. Reads the computed text and background color of html, body, and each
 * selector given, and the image each img element chose, into one flat object. A selector whose
 * element is missing gives null.
 *
 * @param {string[]} selectors
 */
function readColorProbe(selectors) {
  const probe = {};
  const elements = [
    ["html", document.documentElement],
    ["body", document.body],
  ];
  for (const selector of selectors) {
    let element = null;
    try {
      element = document.querySelector(selector);
    } catch {
      // A selector this page cannot read counts as missing.
    }
    elements.push([selector, element]);
  }
  for (const [key, element] of elements) {
    if (element === null) {
      probe[`${key} color`] = null;
      probe[`${key} background-color`] = null;
      continue;
    }
    const style = getComputedStyle(element);
    probe[`${key} color`] = style.color;
    probe[`${key} background-color`] = style.backgroundColor;
  }
  const images = document.querySelectorAll("img");
  for (let index = 0; index < images.length; index += 1) {
    probe[`img ${index} currentSrc`] = images[index].currentSrc;
  }
  return probe;
}

/**
 * Waits up to THEME_SETTLE_TIMEOUT_MS for the network to go quiet and for every running transition
 * or finite animation to end, so colors are read after a theme change and not halfway through it.
 */
async function waitForThemeToSettle(page) {
  try {
    await page.waitForLoadState("networkidle", {
      timeout: THEME_SETTLE_TIMEOUT_MS,
    });
  } catch {
    // The network is still busy; read the colors anyway.
  }
  await page.evaluate((timeout) => {
    const finishing = [];
    for (const animation of document.getAnimations()) {
      // An animation that repeats forever never finishes, so only finite ones are awaited.
      if (animation.effect?.getComputedTiming().endTime !== Infinity) {
        finishing.push(animation.finished.catch(() => undefined));
      }
    }
    return Promise.race([
      Promise.all(finishing),
      new Promise((resolveTimer) => setTimeout(resolveTimer, timeout)),
    ]);
  }, THEME_SETTLE_TIMEOUT_MS);
}

/**
 * Runs inside the page on one element. Says whether a script may click it as a theme control (not
 * in a link, not a submit button, not inside a form), and gives its name, a CSS selector that finds
 * it, and its place in document order.
 *
 * @param {Element} element
 */
function describeThemeControl(element) {
  const control = element.tagName === "LABEL" ? element.control : element;
  const inForm =
    element.closest("form") !== null ||
    (control !== null &&
      control !== undefined &&
      control.form !== null &&
      control.form !== undefined);
  const inLink = element.closest("a[href]") !== null;
  const type = (element.getAttribute("type") ?? "").toLowerCase();
  const isSubmit =
    (element.tagName === "BUTTON" && type === "submit") ||
    (element.tagName === "INPUT" && (type === "submit" || type === "image"));
  const name = (element.getAttribute("aria-label") ?? element.textContent ?? "")
    .replace(/\s+/g, " ")
    .trim();
  let selector;
  if (
    element.id &&
    document.querySelectorAll(`#${CSS.escape(element.id)}`).length === 1
  ) {
    selector = `#${CSS.escape(element.id)}`;
  } else {
    const steps = [];
    let node = element;
    while (node !== null && node !== document.documentElement) {
      let position = 1;
      let sibling = node.previousElementSibling;
      while (sibling !== null) {
        if (sibling.tagName === node.tagName) {
          position += 1;
        }
        sibling = sibling.previousElementSibling;
      }
      steps.unshift(`${node.tagName.toLowerCase()}:nth-of-type(${position})`);
      node = node.parentElement;
    }
    selector = ["html", ...steps].join(" > ");
  }
  const order = [...document.querySelectorAll("*")].indexOf(element);
  return { clickable: !inForm && !inLink && !isSubmit, name, selector, order };
}

/**
 * Finds the visible theme controls a script may click: elements with a control role whose name is
 * a theme word, and buttons and labels whose text is one. It returns them with their locators,
 * those named dark first, then in document order.
 */
async function findThemeControls(page) {
  const locators = [];
  for (const role of THEME_CONTROL_ROLES) {
    locators.push(page.getByRole(role, { name: THEME_CONTROL_PATTERN }));
  }
  locators.push(
    page
      .locator("button, [role=button], label")
      .filter({ hasText: THEME_CONTROL_PATTERN }),
  );
  const controls = new Map();
  for (const locator of locators) {
    for (const item of await locator.all()) {
      if (!(await item.isVisible())) {
        continue;
      }
      const described = await item.evaluate(describeThemeControl);
      if (!described.clickable || controls.has(described.selector)) {
        continue;
      }
      // The accessible name as the browser computes it, which counts aria-labelledby and <label>;
      // the text the page script read is kept only when the snapshot holds no name.
      let accessibleName = null;
      try {
        accessibleName = nameFromAriaSnapshot(await item.ariaSnapshot());
      } catch {
        // No snapshot; keep the text the page script read.
      }
      controls.set(described.selector, {
        ...described,
        name: accessibleName ?? described.name,
        locator: item,
      });
    }
  }
  const sorted = [...controls.values()];
  sorted.sort((first, second) => {
    const firstDark = /dark/i.test(first.name) ? 0 : 1;
    const secondDark = /dark/i.test(second.name) ? 0 : 1;
    if (firstDark !== secondDark) {
      return firstDark - secondDark;
    }
    return first.order - second.order;
  });
  return sorted;
}

/**
 * Clicks a theme control and reports whether the page is now darker than the light render. It
 * returns "darker", "same", or the address the click moved the page to.
 */
async function clickThemeControl(page, control, selectors, lightLuminance) {
  const addressBefore = page.url();
  await control.locator.click({ timeout: THEME_SETTLE_TIMEOUT_MS });
  await waitForThemeToSettle(page);
  if (page.url() !== addressBefore) {
    return { outcome: "moved", address: page.url() };
  }
  const probe = await page.evaluate(readColorProbe, selectors);
  if (pageBackgroundLuminance(probe) < lightLuminance) {
    return { outcome: "darker" };
  }
  return { outcome: "same" };
}

/**
 * Looks for a dark mode in one viewport and, when it finds one, measures it as that viewport's
 * dark entry. First it loads the page with the system set to dark and compares its colors with the
 * light load's; when a color that does not move on its own differs and the page background is
 * darker, it measures that load. Otherwise it opens a fresh light page,
 * clicks the first theme control, and, when that opened a menu, a newly shown control named dark.
 * A click counts only when the page background is then darker than the light render's.
 *
 * @returns the dark-mode result for summarizeDarkMode, the dark entry or null, its texts, and the URL the browser ended on
 */
async function measureDarkMode(
  browser,
  viewport,
  pageUrl,
  outputFolder,
  lines,
  selectors,
  lightProbe,
  stableLightProbe,
) {
  const entryName = darkViewportName(viewport.name);
  const systemDark = await openPage(browser, viewport, pageUrl, "dark");
  await waitForThemeToSettle(systemDark.page);
  const darkProbe = await systemDark.page.evaluate(readColorProbe, selectors);
  const lightLuminance = pageBackgroundLuminance(lightProbe);
  if (
    colorsDiffer(stableLightProbe, darkProbe) &&
    pageBackgroundLuminance(darkProbe) < lightLuminance
  ) {
    const measured = await measureViewport(
      systemDark.page,
      viewport,
      entryName,
      systemDark.notes,
      outputFolder,
      lines,
    );
    await systemDark.context.close();
    return {
      result: { name: viewport.name, foundBy: "system_setting" },
      measured,
      finalUrl: systemDark.finalUrl,
    };
  }
  await systemDark.context.close();

  const toggled = await openPage(browser, viewport, pageUrl);
  const noDark = (reason) => ({
    result: { name: viewport.name, foundBy: "none", reason },
    measured: null,
    finalUrl: toggled.finalUrl,
  });
  try {
    const controls = await findThemeControls(toggled.page);
    if (controls.length === 0) {
      return noDark(
        "the page does not turn darker when the system asks for dark, and no control named dark, light, theme, or appearance is visible",
      );
    }
    const first = controls[0];
    let clicked = first;
    let click = await clickThemeControl(
      toggled.page,
      first,
      selectors,
      lightLuminance,
    );
    if (click.outcome === "same") {
      // The first click may have opened a menu; a second click is allowed only on a control named
      // dark that was not visible before it.
      const shownBefore = new Set(controls.map((control) => control.selector));
      const shownNow = await findThemeControls(toggled.page);
      const second = shownNow.find(
        (control) =>
          /dark/i.test(control.name) && !shownBefore.has(control.selector),
      );
      if (second !== undefined) {
        clicked = second;
        click = await clickThemeControl(
          toggled.page,
          second,
          selectors,
          lightLuminance,
        );
      }
    }
    if (click.outcome === "moved") {
      return noDark(
        `clicking the control "${clicked.name}" moved the page to ${click.address}, so its dark mode was not measured`,
      );
    }
    if (click.outcome === "same") {
      return noDark(
        `the page does not turn darker when the system asks for dark, and clicking the control "${clicked.name}" did not make the page background darker`,
      );
    }
    const measured = await measureViewport(
      toggled.page,
      viewport,
      entryName,
      toggled.notes,
      outputFolder,
      lines,
    );
    return {
      result: {
        name: viewport.name,
        foundBy: "toggle",
        control: { name: clicked.name, selector: clicked.selector },
      },
      measured,
      finalUrl: toggled.finalUrl,
    };
  } finally {
    await toggled.context.close();
  }
}

/**
 * Measures one open page as one facts entry: writes `<entryName>.png` and its crops, reads the
 * page, and summarizes it. The light entry and the dark entry of a viewport both go through here.
 * It leaves the page open and returns the entry, its texts, and the raw blocks and targets.
 */
async function measureViewport(
  page,
  viewport,
  entryName,
  notes,
  outputFolder,
  lines,
) {
  const screenshotName = `${entryName}.png`;
  const screenshotPath = join(outputFolder, screenshotName);
  // With a slide id from the hash of a local path, measure only that element (crit-3wg).
  let slideBox = null;
  if (viewport.slideId) {
    slideBox = await page.evaluate(isolateSlide, viewport.slideId);
    if (slideBox === null) {
      notes.push(
        `no element with the id "${viewport.slideId}" has a size, so the whole page is measured`,
      );
    } else {
      notes.push(
        `only the element with the id "${viewport.slideId}" is measured, the box [${slideBox.x}, ${slideBox.y}, ${slideBox.width}, ${slideBox.height}] of the page; every box is in the pixels of its screenshot`,
      );
    }
  }
  await page.screenshot({
    path: screenshotPath,
    fullPage: true,
    animations: "disabled",
    ...(slideBox === null ? {} : { clip: slideBox }),
  });
  lines.push(`screenshot ${screenshotPath}`);
  const crops = await writeCrops(
    outputFolder,
    { ...viewport, name: entryName },
    screenshotPath,
  );
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
  if (slideBox !== null) {
    shiftRawToSlide(raw, slideBox);
  }
  const summary = summarizeViewport({
    ...raw,
    name: entryName,
    width: viewport.width,
    height: viewport.height,
    notes,
  });
  return {
    entry: { ...summary.viewport, screenshot: screenshotName, crops },
    texts: summary.texts,
    raw,
  };
}

/**
 * Measures the page in each viewport and writes the screenshots, crops, and facts.json. It returns
 * the lines to print. It throws a MeasureRefusal when it cannot measure.
 *
 * @param {string} pageArgument
 * @param {string} outputFolder
 * @param {string} workingDirectory
 * @param {{ name: string, width: number, height: number }[]} viewportList the viewports to render, in order: any of VIEWPORTS, any from widthViewports, or both; VIEWPORTS when left out
 * @param {boolean} dark true for --dark: also look for a dark mode and measure it (FR-85)
 */
export async function measurePage(
  pageArgument,
  outputFolder,
  workingDirectory,
  viewportList = VIEWPORTS,
  dark = false,
) {
  const pageUrl = toPageUrl(pageArgument);
  const playwright = loadPlaywright(workingDirectory);
  if (playwright === null) {
    throw new ToolMissingRefusal(PLAYWRIGHT_MISSING);
  }
  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: true });
  } catch (error) {
    const firstLine = String(error).split("\n")[0];
    throw new ToolMissingRefusal(
      `Chromium did not start (${firstLine}); run \`npx playwright install chromium\`, or critique the image alone.`,
    );
  }
  const lines = [];
  const texts = {};
  const viewports = [];
  const finalUrls = new Set();
  const darkResults = [];
  try {
    const slideId = slideIdOf(pageUrl);
    for (const listedViewport of viewportList) {
      const viewport = { ...listedViewport, slideId };
      const { context, page, notes, finalUrl } = await openPage(
        browser,
        viewport,
        pageUrl,
      );
      if (withoutHash(finalUrl) !== withoutHash(pageUrl)) {
        finalUrls.add(finalUrl);
      }
      const light = await measureViewport(
        page,
        viewport,
        viewport.name,
        notes,
        outputFolder,
        lines,
      );
      let selectors = [];
      let lightProbe = null;
      let stableLightProbe = null;
      if (dark) {
        // The colors to compare: those of the text blocks and targets this light render found.
        selectors = [
          ...light.raw.blocks.map((block) => block.selector),
          ...light.raw.targets.map((target) => target.selector),
        ];
        lightProbe = await page.evaluate(readColorProbe, selectors);
        await page.waitForTimeout(LIGHT_REREAD_DELAY_MS);
        stableLightProbe = dropMovingColors(
          lightProbe,
          await page.evaluate(readColorProbe, selectors),
        );
      }
      await context.close();
      for (const [selector, text] of light.texts) {
        texts[selector] = text;
      }
      viewports.push(light.entry);
      if (dark) {
        const linesBefore = lines.length;
        const found = await guardDarkMode(viewport.name, () =>
          measureDarkMode(
            browser,
            viewport,
            pageUrl,
            outputFolder,
            lines,
            selectors,
            lightProbe,
            stableLightProbe,
          ),
        );
        if (found.failed) {
          // Remove the screenshot and crops a half-finished dark entry wrote, and their lines.
          for (const line of lines.splice(linesBefore)) {
            await rm(line.slice(line.indexOf(" ") + 1), { force: true });
          }
        }
        darkResults.push(found.result);
        if (
          found.finalUrl !== null &&
          withoutHash(found.finalUrl) !== withoutHash(pageUrl)
        ) {
          finalUrls.add(found.finalUrl);
        }
        if (found.measured !== null) {
          for (const [selector, text] of found.measured.texts) {
            texts[selector] = text;
          }
          viewports.push({ ...found.measured.entry, color_scheme: "dark" });
        }
      }
    }
  } finally {
    await browser.close();
  }
  const facts = {
    version: FACTS_VERSION,
    source: pageArgument,
    color_scheme: COLOR_SCHEME,
  };
  let darkNotes = [];
  if (dark) {
    const summary = summarizeDarkMode(darkResults);
    facts.dark_mode = summary.darkMode;
    darkNotes = summary.notes;
    for (const entry of viewports) {
      const note = summary.viewportNotes.get(entry.name);
      if (note !== undefined) {
        entry.notes.push(note);
      }
    }
  }
  facts.notes = [VIOLATIONS_NOTE];
  if (finalUrls.size > 0) {
    facts.final_url = [...finalUrls].join(" ");
    facts.notes.push(
      `the browser ended on ${facts.final_url}, not on ${pageUrl}; the facts describe the page it ended on`,
    );
  }
  facts.notes.push(...darkNotes);
  facts.texts = texts;
  facts.viewports = viewports;
  const factsPath = join(outputFolder, "facts.json");
  await writeFile(factsPath, `${formatFactsJson(facts)}\n`);
  lines.push(`facts ${factsPath}`);
  return lines;
}

/**
 * Reads the arguments after the script path into the page, the output folder (undefined when
 * --out is not given), the viewports to render, in order, and whether --dark was given. It returns null for a wrong command
 * line: no page, an unknown flag, a flag given twice, a value missing, or a bad --width list.
 *
 * @param {string[]} commandArguments
 * @returns {{ pageArgument: string, folderArgument: string | undefined, viewportList: { name: string, width: number, height: number }[], dark: boolean } | null}
 */
export function readCommandLine(commandArguments) {
  let parsed;
  try {
    // parseArgs from node:util reads the flags. strict makes it throw on an unknown flag, on a
    // missing value, and on a value that looks like a flag, such as `--out --phone`; tokens lists
    // each flag as it was given, so a flag given twice can be found.
    parsed = parseArgs({
      args: commandArguments,
      options: {
        out: { type: "string" },
        width: { type: "string" },
        desktop: { type: "boolean" },
        phone: { type: "boolean" },
        tablet: { type: "boolean" },
        widescreen: { type: "boolean" },
        dark: { type: "boolean" },
      },
      allowPositionals: true,
      strict: true,
      tokens: true,
    });
  } catch {
    return null;
  }
  const { values, positionals, tokens } = parsed;
  if (positionals.length !== 1) {
    return null;
  }
  const pageArgument = positionals[0];
  const pickedNames = new Set();
  const givenFlags = new Set();
  for (const token of tokens) {
    if (token.kind !== "option") {
      continue;
    }
    if (givenFlags.has(token.name)) {
      return null;
    }
    givenFlags.add(token.name);
    if (VIEWPORTS.some((viewport) => viewport.name === token.name)) {
      pickedNames.add(token.name);
    }
  }
  const folderArgument = values.out;
  const widthArgument = values.width;
  let viewportList = VIEWPORTS;
  if (pickedNames.size > 0 || widthArgument !== undefined) {
    // The named viewports keep the order of VIEWPORTS, whatever order their flags came in.
    viewportList = VIEWPORTS.filter((viewport) =>
      pickedNames.has(viewport.name),
    );
    if (widthArgument !== undefined) {
      const widthList = widthViewports(widthArgument);
      if (widthList === null) {
        return null;
      }
      viewportList = [...viewportList, ...widthList];
    }
  }
  return {
    pageArgument,
    folderArgument,
    viewportList,
    dark: values.dark === true,
  };
}

/**
 * Runs the command and returns the lines to print and the exit code. A refusal or any other error
 * becomes one "cannot measure:" line and exit code 3, or exit code 4 when Playwright or Chromium is missing. It writes nothing to the terminal itself.
 *
 * @param {string[]} commandArguments the arguments after the script path
 * @param {string} workingDirectory
 * @returns {Promise<{ exitCode: number, lines: string[] }>}
 */
export async function runMeasure(commandArguments, workingDirectory) {
  const commandLine = readCommandLine(commandArguments);
  if (commandLine === null) {
    return { exitCode: EXIT_USAGE, lines: [USAGE] };
  }
  const { pageArgument, folderArgument, viewportList, dark } = commandLine;
  const folderGiven = folderArgument !== undefined;
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
      viewportList,
      dark,
    );
    return { exitCode: 0, lines };
  } catch (error) {
    return {
      exitCode:
        error instanceof ToolMissingRefusal
          ? EXIT_TOOL_MISSING
          : EXIT_CANNOT_MEASURE,
      lines: [`cannot measure: ${firstLineOf(error)}`],
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
