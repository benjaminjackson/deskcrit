#!/usr/bin/env node
// Lays several PNG screens out as one numbered PNG contact sheet, so a critic can judge a set of
// screens side by side (FR-83, draft) and name each one by its tile number.
//
// Usage:
//   node contact-sheet.mjs SCREEN.png... --out FOLDER [--columns N]
//
// It writes `sheet.png` and `tiles.json` into FOLDER (made when missing). `tiles.json` maps each
// tile number, counted from 1 in the order of the command line, to the absolute path of its screen
// and to the box the screen fills on the sheet, in pixels, below its number. Each screen is scaled to the same tile
// width with its aspect ratio kept, and a screen taller than the tile height limit is cut off at
// the bottom, so the tile shows the top of the screen. The number is drawn in a band above the tile
// with a built-in pixel font on a dark plate, so no font file is needed. It uses only Node's own
// modules, so the installed plugin needs no install step; it reuses the PNG reader of crop.mjs.
//
// Exit codes: 0 when it wrote the sheet, 2 for a wrong command line, too many screens, or a screen
// it cannot read as a PNG. On code 2 it prints exactly one line.

import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { decodePng } from "./crop.mjs";

// Set by the crit-j8y.1 spike (spike/contact-sheet/RESULTS.md); smaller tiles are untested.
/** The width of each tile, in pixels of the sheet. */
export const TILE_WIDTH = 640;

// Set by the crit-j8y.1 spike (spike/contact-sheet/RESULTS.md); smaller tiles are untested.
// The spike tested only 5 and 6 tiles; 12 is an untested limit that keeps a sheet from growing without end.
/** The largest number of screens one sheet holds. */
export const MAX_TILES = 12;

// Set by the crit-j8y.1 spike (spike/contact-sheet/RESULTS.md); smaller tiles are untested.
/** The number of tiles in one row when --columns is not given. */
export const DEFAULT_COLUMNS = 2;

// Set by the crit-j8y.1 spike (spike/contact-sheet/RESULTS.md); smaller tiles are untested.
/** The empty space between tiles, and around the edge of the sheet, in pixels. */
export const GUTTER = 24;

// Set by the crit-j8y.1 spike (spike/contact-sheet/RESULTS.md); smaller tiles are untested.
// The spike used only one-screen tiles (640 x 400), so this limit for taller screens is untested.
/** A tile is never taller than its width times this, so a long page shows only its top. */
export const MAX_TILE_HEIGHT_PER_WIDTH = 1.5;

/** The size of one pixel of the built-in digit font, in sheet pixels, so a digit is 20 x 28 px. */
const DIGIT_SCALE = 4;

/** The height of the band above each tile that holds its number, in sheet pixels. */
export const BAND_HEIGHT = 44;

/** The space between the number and the edge of its plate, in sheet pixels. */
const PLATE_PADDING = 8;

/** The color of the empty space of the sheet. */
const BACKGROUND = [128, 128, 128];

/** The color of the plate behind a number, and the color of the number. */
const PLATE_COLOR = [0, 0, 0];
const DIGIT_COLOR = [255, 255, 255];

export const EXIT_USAGE = 2;

const USAGE =
  "usage: node contact-sheet.mjs SCREEN.png... --out FOLDER [--columns N]";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** The digits 0 to 9 as 5 columns by 7 rows; each string is one row, and 1 is an inked pixel. */
const DIGIT_FONT = [
  ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
];

/** An error whose message says why the script cannot make the sheet; the script prints it as one line. */
export class SheetRefusal extends Error {}

/** The lookup table for the CRC-32 that every PNG chunk ends with (PNG standard, annex D). */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index++) {
    let value = index;
    for (let bit = 0; bit < 8; bit++) {
      if (value & 1) {
        // `>>>` is an unsigned right shift, so the value stays a positive 32-bit number.
        value = 0xedb88320 ^ (value >>> 1);
      } else {
        value = value >>> 1;
      }
    }
    table[index] = value;
  }
  return table;
})();

/**
 * Returns the CRC-32 of the bytes, as the PNG standard computes it over a chunk's type and data.
 *
 * @param {Uint8Array} bytes
 * @returns {number}
 */
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/**
 * Returns one PNG chunk: length, type, data, and CRC.
 *
 * @param {string} type
 * @param {Uint8Array} data
 */
function writeChunk(type, data) {
  const typeAndData = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

/**
 * Encodes 8-bit RGB pixels as a PNG file, every row stored with filter type 0 (None).
 *
 * @param {Uint8Array} pixels width * height * 3 bytes
 * @param {number} width
 * @param {number} height
 * @returns {Buffer}
 */
export function encodeRgbPng(pixels, width, height) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bit depth
  header[9] = 2; // color type 2: RGB
  const rowLength = width * 3;
  const filtered = Buffer.alloc(height * (rowLength + 1));
  for (let row = 0; row < height; row++) {
    const target = row * (rowLength + 1);
    filtered[target] = 0;
    filtered.set(
      pixels.subarray(row * rowLength, (row + 1) * rowLength),
      target + 1,
    );
  }
  return Buffer.concat([
    PNG_SIGNATURE,
    writeChunk("IHDR", header),
    writeChunk("IDAT", deflateSync(filtered)),
    writeChunk("IEND", new Uint8Array()),
  ]);
}

/**
 * Turns a decoded PNG of any color type into 8-bit RGB. Transparent pixels are laid over white,
 * and a 16-bit sample keeps its high byte.
 *
 * @param {ReturnType<typeof decodePng>} decoded
 * @returns {{ pixels: Uint8Array, width: number, height: number }}
 */
export function toRgb(decoded) {
  const { header, rows, keptChunks } = decoded;
  const { width, height, colorType, bitDepth } = header;
  const step = bitDepth / 8; // bytes per sample
  const palette = keptChunks.find((chunk) => chunk.type === "PLTE");
  const pixels = new Uint8Array(width * height * 3);
  for (let y = 0; y < height; y++) {
    const row = rows[y] ?? new Uint8Array();
    for (let x = 0; x < width; x++) {
      let red = 0;
      let green = 0;
      let blue = 0;
      let alpha = 255;
      if (colorType === 0 || colorType === 4) {
        const channels = colorType === 0 ? 1 : 2;
        const base = x * channels * step;
        red = row[base] ?? 0;
        green = red;
        blue = red;
        if (colorType === 4) {
          alpha = row[base + step] ?? 255;
        }
      } else if (colorType === 2 || colorType === 6) {
        const channels = colorType === 2 ? 3 : 4;
        const base = x * channels * step;
        red = row[base] ?? 0;
        green = row[base + step] ?? 0;
        blue = row[base + 2 * step] ?? 0;
        if (colorType === 6) {
          alpha = row[base + 3 * step] ?? 255;
        }
      } else {
        const index = row[x] ?? 0;
        red = palette?.data[index * 3] ?? 0;
        green = palette?.data[index * 3 + 1] ?? 0;
        blue = palette?.data[index * 3 + 2] ?? 0;
      }
      const target = (y * width + x) * 3;
      pixels[target] = Math.round((red * alpha + 255 * (255 - alpha)) / 255);
      pixels[target + 1] = Math.round(
        (green * alpha + 255 * (255 - alpha)) / 255,
      );
      pixels[target + 2] = Math.round(
        (blue * alpha + 255 * (255 - alpha)) / 255,
      );
    }
  }
  return { pixels, width, height };
}

/**
 * Returns the size of a tile for a screen of the given size: the tile width, and the screen's
 * height scaled to that width, at most MAX_TILE_HEIGHT_PER_WIDTH times the width.
 *
 * @param {number} screenWidth
 * @param {number} screenHeight
 * @returns {{ width: number, height: number }}
 */
export function planTileSize(screenWidth, screenHeight) {
  const scaledHeight = Math.max(
    1,
    Math.round((screenHeight * TILE_WIDTH) / screenWidth),
  );
  const limit = Math.round(TILE_WIDTH * MAX_TILE_HEIGHT_PER_WIDTH);
  return { width: TILE_WIDTH, height: Math.min(scaledHeight, limit) };
}

/**
 * Paints one screen into the sheet at the tile box, scaled to the tile width from the top of the
 * screen. Each tile pixel is the average of the screen pixels it covers, so thin lines stay visible
 * when the screen shrinks; when the screen is narrower than the tile, pixels repeat.
 *
 * @param {Uint8Array} sheet
 * @param {number} sheetWidth
 * @param {{ pixels: Uint8Array, width: number, height: number }} screen
 * @param {{ x: number, y: number, width: number, height: number }} box
 */
function paintScreen(sheet, sheetWidth, screen, box) {
  const ratio = screen.width / box.width; // screen pixels per tile pixel
  for (let tileY = 0; tileY < box.height; tileY++) {
    const top = Math.min(screen.height - 1, Math.floor(tileY * ratio));
    const bottom = Math.min(
      screen.height,
      Math.max(top + 1, Math.floor((tileY + 1) * ratio)),
    );
    for (let tileX = 0; tileX < box.width; tileX++) {
      const left = Math.min(screen.width - 1, Math.floor(tileX * ratio));
      const right = Math.min(
        screen.width,
        Math.max(left + 1, Math.floor((tileX + 1) * ratio)),
      );
      let redSum = 0;
      let greenSum = 0;
      let blueSum = 0;
      for (let sourceY = top; sourceY < bottom; sourceY++) {
        for (let sourceX = left; sourceX < right; sourceX++) {
          const source = (sourceY * screen.width + sourceX) * 3;
          redSum += screen.pixels[source] ?? 0;
          greenSum += screen.pixels[source + 1] ?? 0;
          blueSum += screen.pixels[source + 2] ?? 0;
        }
      }
      const count = (bottom - top) * (right - left);
      const target = ((box.y + tileY) * sheetWidth + box.x + tileX) * 3;
      sheet[target] = Math.round(redSum / count);
      sheet[target + 1] = Math.round(greenSum / count);
      sheet[target + 2] = Math.round(blueSum / count);
    }
  }
}

/**
 * Fills a rectangle of the sheet with one color.
 *
 * @param {Uint8Array} sheet
 * @param {number} sheetWidth
 * @param {{ x: number, y: number, width: number, height: number }} box
 * @param {number[]} color
 */
function fillRectangle(sheet, sheetWidth, box, color) {
  for (let y = box.y; y < box.y + box.height; y++) {
    for (let x = box.x; x < box.x + box.width; x++) {
      const target = (y * sheetWidth + x) * 3;
      sheet[target] = color[0] ?? 0;
      sheet[target + 1] = color[1] ?? 0;
      sheet[target + 2] = color[2] ?? 0;
    }
  }
}

/**
 * Draws a tile number in the band above a tile: white pixel digits on a black plate at the left.
 *
 * @param {Uint8Array} sheet
 * @param {number} sheetWidth
 * @param {{ x: number, y: number }} corner the top left corner of the band
 * @param {number} number
 */
function paintNumber(sheet, sheetWidth, corner, number) {
  const digits = String(number).split("");
  const digitWidth = 5 * DIGIT_SCALE;
  const digitGap = DIGIT_SCALE;
  const textWidth = digits.length * digitWidth + (digits.length - 1) * digitGap;
  fillRectangle(
    sheet,
    sheetWidth,
    {
      x: corner.x,
      y: corner.y,
      width: textWidth + 2 * PLATE_PADDING,
      height: BAND_HEIGHT,
    },
    PLATE_COLOR,
  );
  digits.forEach((digit, position) => {
    const glyph = DIGIT_FONT[Number(digit)] ?? [];
    const originX =
      corner.x + PLATE_PADDING + position * (digitWidth + digitGap);
    const originY = corner.y + PLATE_PADDING;
    glyph.forEach((glyphRow, glyphY) => {
      glyphRow.split("").forEach((ink, glyphX) => {
        if (ink !== "1") {
          return;
        }
        fillRectangle(
          sheet,
          sheetWidth,
          {
            x: originX + glyphX * DIGIT_SCALE,
            y: originY + glyphY * DIGIT_SCALE,
            width: DIGIT_SCALE,
            height: DIGIT_SCALE,
          },
          DIGIT_COLOR,
        );
      });
    });
  });
}

/**
 * Reads the command line into the screen paths, the output folder, and the column count. It throws
 * a SheetRefusal for a wrong command line or too many screens.
 *
 * @param {string[]} commandArguments
 * @returns {{ screens: string[], outputFolder: string, columns: number }}
 */
export function parseCommandLine(commandArguments) {
  const screens = [];
  let outputFolder;
  let columns = DEFAULT_COLUMNS;
  for (let index = 0; index < commandArguments.length; index++) {
    const argument = commandArguments[index] ?? "";
    if (argument === "--out") {
      index += 1;
      outputFolder = commandArguments[index];
    } else if (argument === "--columns") {
      index += 1;
      const text = commandArguments[index] ?? "";
      if (!/^[1-9][0-9]*$/.test(text)) {
        throw new SheetRefusal(USAGE);
      }
      columns = Number(text);
    } else if (argument.startsWith("--")) {
      throw new SheetRefusal(USAGE);
    } else {
      screens.push(argument);
    }
  }
  if (
    outputFolder === undefined ||
    outputFolder === "" ||
    screens.length === 0
  ) {
    throw new SheetRefusal(USAGE);
  }
  if (screens.length > MAX_TILES) {
    throw new SheetRefusal(
      `too many screens: ${screens.length} given, at most ${MAX_TILES} fit on one sheet`,
    );
  }
  return { screens, outputFolder, columns };
}

/**
 * Makes the sheet and the tile map from the command line, and writes both into the output folder.
 * It returns the lines to print and an exit code, and never throws for a bad input.
 *
 * @param {string[]} commandArguments the arguments after the script path
 * @returns {{ exitCode: number, lines: string[] }}
 */
export function runContactSheet(commandArguments) {
  try {
    const {
      screens,
      outputFolder,
      columns: requestedColumns,
    } = parseCommandLine(commandArguments);
    const decodedScreens = screens.map((screenPath) => {
      let bytes;
      try {
        bytes = readFileSync(screenPath);
      } catch {
        throw new SheetRefusal(`cannot read ${screenPath}`);
      }
      try {
        return toRgb(decodePng(bytes));
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new SheetRefusal(`cannot use ${screenPath}: ${reason}`);
      }
    });

    const columns = Math.min(requestedColumns, screens.length);
    const sizes = decodedScreens.map((screen) =>
      planTileSize(screen.width, screen.height),
    );
    const rowCount = Math.ceil(screens.length / columns);
    const rowHeights = [];
    for (let row = 0; row < rowCount; row++) {
      const rowSizes = sizes.slice(row * columns, (row + 1) * columns);
      rowHeights.push(Math.max(...rowSizes.map((size) => size.height)));
    }
    const sheetWidth = GUTTER + columns * (TILE_WIDTH + GUTTER);
    let sheetHeight = GUTTER;
    for (const rowHeight of rowHeights) {
      sheetHeight += BAND_HEIGHT + rowHeight + GUTTER;
    }

    const sheet = new Uint8Array(sheetWidth * sheetHeight * 3);
    fillRectangle(
      sheet,
      sheetWidth,
      { x: 0, y: 0, width: sheetWidth, height: sheetHeight },
      BACKGROUND,
    );
    const tiles = [];
    let rowTop = GUTTER;
    for (let row = 0; row < rowCount; row++) {
      for (let column = 0; column < columns; column++) {
        const tileIndex = row * columns + column;
        const screen = decodedScreens[tileIndex];
        const size = sizes[tileIndex];
        if (screen === undefined || size === undefined) {
          continue;
        }
        const box = {
          x: GUTTER + column * (TILE_WIDTH + GUTTER),
          y: rowTop + BAND_HEIGHT,
          width: size.width,
          height: size.height,
        };
        paintScreen(sheet, sheetWidth, screen, box);
        paintNumber(sheet, sheetWidth, { x: box.x, y: rowTop }, tileIndex + 1);
        tiles.push({
          tile: tileIndex + 1,
          path: resolve(screens[tileIndex] ?? ""),
          box,
        });
      }
      rowTop += BAND_HEIGHT + (rowHeights[row] ?? 0) + GUTTER;
    }

    mkdirSync(outputFolder, { recursive: true });
    const sheetPath = join(resolve(outputFolder), "sheet.png");
    const tilesPath = join(resolve(outputFolder), "tiles.json");
    writeFileSync(sheetPath, encodeRgbPng(sheet, sheetWidth, sheetHeight));
    writeFileSync(
      tilesPath,
      `${JSON.stringify({ sheet: { width: sheetWidth, height: sheetHeight }, tiles }, null, 2)}\n`,
    );
    return {
      exitCode: 0,
      lines: [
        `sheet: ${sheetPath} (${sheetWidth} x ${sheetHeight} px, ${tiles.length} tiles)`,
        `tiles: ${tilesPath}`,
      ],
    };
  } catch (error) {
    if (error instanceof SheetRefusal) {
      return { exitCode: EXIT_USAGE, lines: [error.message] };
    }
    const reason = error instanceof Error ? error.message : String(error);
    return {
      exitCode: EXIT_USAGE,
      lines: [`cannot make the sheet: ${reason}`],
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
  const result = runContactSheet(process.argv.slice(2));
  for (const line of result.lines) {
    console.log(line);
  }
  process.exitCode = result.exitCode;
}
