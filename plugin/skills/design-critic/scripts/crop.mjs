#!/usr/bin/env node
// Cuts a PNG into full-resolution crops, so the design critic can Read a full-page screenshot in
// sections that Read does not shrink, or look closely at one region of it.
//
// Usage:
//   node crop.mjs IMAGE                          crops about one screen tall, top to bottom
//   node crop.mjs IMAGE --box x,y,width,height   one crop of that box, in pixels of the image
//
// It prints the image size, then one line per crop with its path and the pixel rows and columns
// it covers. It always writes into a new folder in the system temp folder, so it never writes
// anywhere else. It uses only Node's own modules, so the installed plugin needs no install step:
// it reads the PNG chunks, inflates the image data with node:zlib, undoes the row filters, and
// writes each crop as a new PNG whose rows all use filter type 0 (None).
//
// Exit codes: 0 when it ran (with crops or with none), 2 for a wrong command line, 3 when it
// cannot crop (another format, an interlaced PNG, fewer than 8 bits per sample, a broken file, an
// empty box, or a file system error). On codes 2 and 3 it prints exactly one line.

import {
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";

/** Images wider than this many pixels are cut into columns; narrower ones get full-width crops. */
export const MAX_FULL_WIDTH = 3200;

/** The width of each column when an image is cut into columns. */
export const COLUMN_WIDTH = 1600;

/** A crop is one screen tall: its height is its width times 10/16, the shape of a laptop screen. */
export const SCREEN_HEIGHT_PER_WIDTH = 10 / 16;

/** A crop is never shorter than 800 px, the height of a 1280 x 800 screen, so a narrow phone screenshot is not cut into slivers. */
export const MIN_CROP_HEIGHT = 800;

/** Neighboring crops share this part of a crop's length, so an element on a cut line is whole in one crop. */
export const OVERLAP_FRACTION = 0.1;

export const EXIT_USAGE = 2;
export const EXIT_REFUSED = 3;

const USAGE = "usage: node crop.mjs IMAGE [--box x,y,width,height]";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** The chunks copied into each crop, in their original order: the palette, transparency, and color space. */
const KEPT_CHUNK_TYPES = new Set([
  "PLTE",
  "tRNS",
  "sRGB",
  "gAMA",
  "cHRM",
  "iCCP",
]);

/** Samples per pixel for each PNG color type, and the bit depths of 8 or more that the PNG standard allows for it. */
const COLOR_TYPES = new Map([
  [0, { channels: 1, bitDepths: [8, 16] }],
  [2, { channels: 3, bitDepths: [8, 16] }],
  [3, { channels: 1, bitDepths: [8] }],
  [4, { channels: 2, bitDepths: [8, 16] }],
  [6, { channels: 4, bitDepths: [8, 16] }],
]);

/** An error whose message says why the script cannot crop; the script prints it after "cannot crop: ". */
export class CropRefusal extends Error {}

/**
 * Splits a length of `total` pixels into pieces of `pieceLength` that overlap by `overlap` pixels.
 * The last piece ends at the end. When the last piece would start less than half a step after the
 * one before it, it would be a near copy of that piece, so the piece before it is stretched to the
 * end instead. When the whole length fits in one piece, it returns one piece of the whole length.
 *
 * @param {number} total
 * @param {number} pieceLength
 * @param {number} overlap
 * @returns {{ start: number, length: number }[]}
 */
export function splitLength(total, pieceLength, overlap) {
  if (total <= pieceLength) {
    return [{ start: 0, length: total }];
  }
  const step = pieceLength - overlap;
  const pieces = [];
  let start = 0;
  while (start + pieceLength < total) {
    pieces.push({ start, length: pieceLength });
    start += step;
  }
  const lastStart = total - pieceLength;
  const previous = pieces[pieces.length - 1];
  if (previous !== undefined && lastStart - previous.start < step / 2) {
    previous.length = total - previous.start;
  } else {
    pieces.push({ start: lastStart, length: pieceLength });
  }
  return pieces;
}

/**
 * Returns the crops for an image of the given size, top to bottom and then left to right within
 * a row. An image up to MAX_FULL_WIDTH wide gets full-width crops; a wider one is cut into columns
 * COLUMN_WIDTH wide. Rows are one screen tall for the crop width, at least MIN_CROP_HEIGHT, and
 * neighbors overlap by OVERLAP_FRACTION. When that gives one crop of the whole image, it returns
 * none, because the critic reads that image whole.
 *
 * @param {number} width
 * @param {number} height
 * @returns {{ x: number, y: number, width: number, height: number }[]}
 */
export function planCrops(width, height) {
  let columnWidth = width;
  if (width > MAX_FULL_WIDTH) {
    columnWidth = COLUMN_WIDTH;
  }
  const columns = splitLength(
    width,
    columnWidth,
    Math.round(columnWidth * OVERLAP_FRACTION),
  );
  const rowHeight = Math.max(
    MIN_CROP_HEIGHT,
    Math.round(columnWidth * SCREEN_HEIGHT_PER_WIDTH),
  );
  const rows = splitLength(
    height,
    rowHeight,
    Math.round(rowHeight * OVERLAP_FRACTION),
  );
  if (rows.length === 1 && columns.length === 1) {
    return [];
  }
  const crops = [];
  for (const row of rows) {
    for (const column of columns) {
      crops.push({
        x: column.start,
        y: row.start,
        width: column.length,
        height: row.length,
      });
    }
  }
  return crops;
}

/**
 * Reads a box given as "x,y,width,height" and clamps it to the image. It returns null when the
 * text is not four whole numbers, and throws a CropRefusal when the box holds no pixel of the image.
 *
 * @param {string} text
 * @param {number} imageWidth
 * @param {number} imageHeight
 * @returns {{ x: number, y: number, width: number, height: number } | null}
 */
export function parseBox(text, imageWidth, imageHeight) {
  if (!/^\d+,\d+,\d+,\d+$/.test(text)) {
    return null;
  }
  const [x, y, width, height] = text.split(",").map(Number);
  const left = Math.min(x ?? 0, imageWidth);
  const top = Math.min(y ?? 0, imageHeight);
  const right = Math.min((x ?? 0) + (width ?? 0), imageWidth);
  const bottom = Math.min((y ?? 0) + (height ?? 0), imageHeight);
  if (right <= left || bottom <= top) {
    throw new CropRefusal(
      `the box ${text} holds no pixel of the ${imageWidth} x ${imageHeight} px image`,
    );
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** The table for the CRC-32 that every PNG chunk ends with (PNG standard, annex D). */
const CRC_TABLE = buildCrcTable();

/** Builds the 256-entry lookup table for CRC-32. */
function buildCrcTable() {
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
}

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
 * Splits a PNG file into its chunks, up to and including IEND.
 *
 * @param {Buffer} bytes
 * @returns {{ type: string, data: Buffer }[]}
 */
function readChunks(bytes) {
  const isPng = bytes.length >= 8 && bytes.subarray(0, 8).equals(PNG_SIGNATURE);
  if (!isPng) {
    throw new CropRefusal("the file is not a PNG");
  }
  const chunks = [];
  let offset = 8;
  while (true) {
    if (offset + 12 > bytes.length) {
      throw new CropRefusal("the PNG is broken: it ends before its IEND chunk");
    }
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("latin1", offset + 4, offset + 8);
    const end = offset + 12 + length;
    if (end > bytes.length) {
      throw new CropRefusal(
        `the PNG is broken: its ${type} chunk runs past the end of the file`,
      );
    }
    chunks.push({
      type,
      data: bytes.subarray(offset + 8, offset + 8 + length),
    });
    offset = end;
    if (type === "IEND") {
      return chunks;
    }
  }
}

/**
 * Reads and checks the IHDR chunk, which must come first.
 *
 * @param {{ type: string, data: Buffer }[]} chunks
 */
function readHeader(chunks) {
  const first = chunks[0];
  if (
    first === undefined ||
    first.type !== "IHDR" ||
    first.data.length !== 13
  ) {
    throw new CropRefusal(
      "the PNG is broken: it does not start with a valid IHDR chunk",
    );
  }
  const header = {
    width: first.data.readUInt32BE(0),
    height: first.data.readUInt32BE(4),
    bitDepth: first.data[8] ?? 0,
    colorType: first.data[9] ?? 0,
    compressionMethod: first.data[10] ?? 0,
    filterMethod: first.data[11] ?? 0,
    interlaceMethod: first.data[12] ?? 0,
  };
  if (header.bitDepth < 8) {
    throw new CropRefusal(
      `the PNG uses ${header.bitDepth} bits per sample, which this script does not crop`,
    );
  }
  if (header.interlaceMethod === 1) {
    throw new CropRefusal(
      "the PNG is interlaced, which this script does not crop",
    );
  }
  const colorType = COLOR_TYPES.get(header.colorType);
  const validDepth = colorType?.bitDepths.includes(header.bitDepth) ?? false;
  const valid =
    header.width > 0 &&
    header.height > 0 &&
    validDepth &&
    header.compressionMethod === 0 &&
    header.filterMethod === 0 &&
    header.interlaceMethod === 0;
  if (!valid || colorType === undefined) {
    throw new CropRefusal(
      "the PNG is broken: its IHDR chunk holds values the PNG standard does not allow",
    );
  }
  return { ...header, channels: colorType.channels };
}

/**
 * Returns the Paeth predictor of the PNG standard: whichever of left, above, and upper left is
 * closest to left + above - upper left.
 *
 * @param {number} left
 * @param {number} above
 * @param {number} upperLeft
 */
function paethPredictor(left, above, upperLeft) {
  const estimate = left + above - upperLeft;
  const distanceLeft = Math.abs(estimate - left);
  const distanceAbove = Math.abs(estimate - above);
  const distanceUpperLeft = Math.abs(estimate - upperLeft);
  if (distanceLeft <= distanceAbove && distanceLeft <= distanceUpperLeft) {
    return left;
  }
  if (distanceAbove <= distanceUpperLeft) {
    return above;
  }
  return upperLeft;
}

/**
 * Undoes the row filters of inflated PNG image data and returns one byte array per row, without
 * the filter byte. `bytesPerPixel` is the byte distance to the "left" byte (PNG standard, section 9.2).
 *
 * @param {Buffer} data
 * @param {number} height
 * @param {number} rowLength bytes per row, without the filter byte
 * @param {number} bytesPerPixel
 * @returns {Uint8Array[]}
 */
export function unfilterRows(data, height, rowLength, bytesPerPixel) {
  const rows = [];
  let previous = new Uint8Array(rowLength);
  for (let rowIndex = 0; rowIndex < height; rowIndex++) {
    const start = rowIndex * (rowLength + 1);
    const filterType = data[start];
    const row = Uint8Array.from(
      data.subarray(start + 1, start + 1 + rowLength),
    );
    for (let index = 0; index < rowLength; index++) {
      const left =
        index >= bytesPerPixel ? (row[index - bytesPerPixel] ?? 0) : 0;
      const above = previous[index] ?? 0;
      const upperLeft =
        index >= bytesPerPixel ? (previous[index - bytesPerPixel] ?? 0) : 0;
      let predictor = 0;
      if (filterType === 1) {
        predictor = left;
      } else if (filterType === 2) {
        predictor = above;
      } else if (filterType === 3) {
        predictor = Math.floor((left + above) / 2);
      } else if (filterType === 4) {
        predictor = paethPredictor(left, above, upperLeft);
      } else if (filterType !== 0) {
        throw new CropRefusal(
          `the PNG is broken: row ${rowIndex} has filter type ${filterType}`,
        );
      }
      // `& 0xff` keeps the sum to one byte, as the PNG standard's modulo 256 does.
      row[index] = ((row[index] ?? 0) + predictor) & 0xff;
    }
    rows.push(row);
    previous = row;
  }
  return rows;
}

/**
 * Decodes a non-interlaced PNG of 8 or 16 bits per sample into its header, the chunks to copy into
 * each crop, and its rows of raw pixel bytes. It throws a CropRefusal for anything it cannot crop.
 *
 * @param {Buffer} bytes the whole file
 */
export function decodePng(bytes) {
  const chunks = readChunks(bytes);
  const header = readHeader(chunks);
  const firstImageDataIndex = chunks.findIndex(
    (chunk) => chunk.type === "IDAT",
  );
  if (firstImageDataIndex === -1) {
    throw new CropRefusal("the PNG is broken: it has no IDAT chunk");
  }
  if (
    header.colorType === 3 &&
    !chunks.some((chunk) => chunk.type === "PLTE")
  ) {
    throw new CropRefusal(
      "the PNG is broken: it uses a palette but has no PLTE chunk",
    );
  }
  const keptChunks = chunks
    .slice(0, firstImageDataIndex)
    .filter((chunk) => KEPT_CHUNK_TYPES.has(chunk.type));
  const compressed = Buffer.concat(
    chunks.filter((chunk) => chunk.type === "IDAT").map((chunk) => chunk.data),
  );
  let inflated;
  try {
    inflated = inflateSync(compressed);
  } catch {
    throw new CropRefusal("the PNG is broken: its image data does not inflate");
  }
  const bytesPerPixel = (header.channels * header.bitDepth) / 8;
  const rowLength = header.width * bytesPerPixel;
  if (inflated.length < header.height * (rowLength + 1)) {
    throw new CropRefusal(
      "the PNG is broken: its image data is shorter than its size needs",
    );
  }
  const rows = unfilterRows(inflated, header.height, rowLength, bytesPerPixel);
  return { header, bytesPerPixel, keptChunks, rows };
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
 * Encodes one crop of a decoded PNG as a new PNG file, with the same bit depth and color type, the
 * kept chunks, and every row stored with filter type 0.
 *
 * @param {ReturnType<typeof decodePng>} decoded
 * @param {{ x: number, y: number, width: number, height: number }} crop
 * @returns {Buffer}
 */
export function encodeCrop(decoded, crop) {
  const { header, bytesPerPixel, keptChunks, rows } = decoded;
  const imageHeader = Buffer.alloc(13);
  imageHeader.writeUInt32BE(crop.width, 0);
  imageHeader.writeUInt32BE(crop.height, 4);
  imageHeader[8] = header.bitDepth;
  imageHeader[9] = header.colorType;
  const filteredRows = [];
  for (let rowIndex = crop.y; rowIndex < crop.y + crop.height; rowIndex++) {
    const row = rows[rowIndex] ?? new Uint8Array();
    filteredRows.push(Buffer.from([0]));
    filteredRows.push(
      row.slice(crop.x * bytesPerPixel, (crop.x + crop.width) * bytesPerPixel),
    );
  }
  return Buffer.concat([
    PNG_SIGNATURE,
    writeChunk("IHDR", imageHeader),
    ...keptChunks.map((chunk) => writeChunk(chunk.type, chunk.data)),
    writeChunk("IDAT", deflateSync(Buffer.concat(filteredRows))),
    writeChunk("IEND", new Uint8Array()),
  ]);
}

/**
 * Reads the command line, the image, and writes the crops. It returns the lines to print and
 * throws a CropRefusal or a file system error when it cannot crop.
 *
 * @param {string[]} commandArguments the arguments after the script path
 * @returns {{ exitCode: number, lines: string[] }}
 */
function cropImage(commandArguments) {
  const [imagePath, flag, boxText, ...extra] = commandArguments;
  const boxGiven = flag === "--box" && boxText !== undefined;
  const wellFormed =
    imagePath !== undefined &&
    extra.length === 0 &&
    (flag === undefined || boxGiven);
  if (!wellFormed) {
    return { exitCode: EXIT_USAGE, lines: [USAGE] };
  }
  const decoded = decodePng(readFileSync(imagePath));
  const { width, height } = decoded.header;
  let crops = planCrops(width, height);
  if (boxGiven) {
    const box = parseBox(boxText, width, height);
    if (box === null) {
      return { exitCode: EXIT_USAGE, lines: [USAGE] };
    }
    crops = [box];
  }
  const lines = [`image ${imagePath}: ${width} x ${height} px`];
  if (crops.length === 0) {
    lines.push(
      "no crops: the image fits in one view at full resolution, so Read it whole.",
    );
    return { exitCode: 0, lines };
  }
  const folder = mkdtempSync(join(tmpdir(), "design-critic-crops-"));
  const stem = basename(imagePath, extname(imagePath));
  crops.forEach((crop, index) => {
    const number = String(index + 1).padStart(2, "0");
    const cropPath = join(folder, `${stem}-${number}.png`);
    writeFileSync(cropPath, encodeCrop(decoded, crop));
    const lastRow = crop.y + crop.height - 1;
    const lastColumn = crop.x + crop.width - 1;
    lines.push(
      `crop ${cropPath}: rows ${crop.y}-${lastRow}, columns ${crop.x}-${lastColumn}`,
    );
  });
  return { exitCode: 0, lines };
}

/**
 * Runs the command and returns the lines to print and the exit code. A refusal or a file system
 * error becomes one "cannot crop:" line and exit code 3. It writes nothing to the terminal itself,
 * so a test can call it.
 *
 * @param {string[]} commandArguments the arguments after the script path
 * @returns {{ exitCode: number, lines: string[] }}
 */
export function runCrop(commandArguments) {
  try {
    return cropImage(commandArguments);
  } catch (error) {
    let reason = String(error);
    if (error instanceof Error) {
      reason = error.message;
    }
    return {
      exitCode: EXIT_REFUSED,
      lines: [`cannot crop: ${reason}; Read the whole image instead.`],
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
  const result = runCrop(process.argv.slice(2));
  for (const line of result.lines) {
    console.log(line);
  }
  process.exitCode = result.exitCode;
}
