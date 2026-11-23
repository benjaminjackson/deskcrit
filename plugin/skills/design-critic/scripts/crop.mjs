#!/usr/bin/env node
// Cuts a PNG into full-resolution crops, each about one screen tall, so the design critic can Read
// a full-page screenshot in sections that Read does not shrink.
//
// Usage: node crop.mjs IMAGE [OUT_DIR]
//
// It prints the image size, then one line per crop with its path and the pixel rows and columns
// it covers. Without OUT_DIR it writes the crops into a new folder in the system temp folder.
// It uses only Node's own modules, so the installed plugin needs no install step: it reads the
// PNG chunks, inflates the image data with node:zlib, undoes the row filters, and writes each crop
// as a new PNG whose rows all use filter type 0 (None).
//
// Exit codes: 0 when it ran (with crops or with none), 2 for a wrong command line, 3 when the file
// is not a PNG it can crop (another format, or an interlaced PNG), 4 when the PNG is broken.
// On codes 3 and 4 it prints exactly one line that starts with "cannot crop:".

import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync, inflateSync } from "node:zlib";

/** Images wider than this many pixels are also cut into columns (critic.md step 1). */
export const MAX_CROP_WIDTH = 1600;

/** A crop is one screen tall: its height is its width times 10/16, the shape of a laptop screen. */
export const SCREEN_HEIGHT_PER_WIDTH = 10 / 16;

/** A crop is never shorter than 800 px, the height of a 1280 x 800 screen, so a narrow phone screenshot is not cut into slivers. */
export const MIN_CROP_HEIGHT = 800;

/** Neighboring crops share this part of a crop's length, so an element on a cut line is whole in one crop. */
export const OVERLAP_FRACTION = 0.1;

export const EXIT_USAGE = 2;
export const EXIT_UNSUPPORTED = 3;
export const EXIT_BROKEN = 4;

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** The chunks copied into each crop, in their original order. Each one still holds for a crop of the image. */
const KEPT_CHUNK_TYPES = new Set([
  "PLTE",
  "tRNS",
  "gAMA",
  "cHRM",
  "sRGB",
  "iCCP",
  "sBIT",
  "bKGD",
  "pHYs",
  "cICP",
  "mDCV",
  "cLLI",
]);

/** The critical chunks this script understands. A file with any other critical chunk is refused. */
const KNOWN_CRITICAL_CHUNK_TYPES = new Set(["IHDR", "PLTE", "IDAT", "IEND"]);

/** Samples per pixel for each PNG color type, and the bit depths the PNG standard allows for it. */
const COLOR_TYPES = new Map([
  [0, { channels: 1, bitDepths: [1, 2, 4, 8, 16] }],
  [2, { channels: 3, bitDepths: [8, 16] }],
  [3, { channels: 1, bitDepths: [1, 2, 4, 8] }],
  [4, { channels: 2, bitDepths: [8, 16] }],
  [6, { channels: 4, bitDepths: [8, 16] }],
]);

/** An error that says why the script could not crop, and which exit code that gives. */
export class CropRefusal extends Error {
  /**
   * @param {string} message the reason, which the script prints after "cannot crop: "
   * @param {number} exitCode EXIT_UNSUPPORTED or EXIT_BROKEN
   */
  constructor(message, exitCode) {
    super(message);
    this.exitCode = exitCode;
  }
}

/**
 * Splits a length of `total` pixels into pieces of `pieceLength` that overlap by `overlap` pixels.
 * The last piece ends at the end, so it may overlap the one before it by more. When the whole
 * length fits in one piece, it returns one piece of the whole length.
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
  pieces.push({ start: total - pieceLength, length: pieceLength });
  return pieces;
}

/**
 * Returns the crops for an image of the given size, top to bottom and then left to right within
 * a row. An image no wider than MAX_CROP_WIDTH and no taller than its width gets no crops, because
 * the critic reads it whole. Otherwise the image is cut into columns no wider than MAX_CROP_WIDTH
 * and rows one screen tall for that column width, with neighbors overlapping by OVERLAP_FRACTION.
 * When that gives one crop of the whole image, it returns none, because the crop would add nothing.
 *
 * @param {number} width
 * @param {number} height
 * @returns {{ x: number, y: number, width: number, height: number }[]}
 */
export function planCrops(width, height) {
  if (width <= MAX_CROP_WIDTH && height <= width) {
    return [];
  }
  const columnWidth = Math.min(width, MAX_CROP_WIDTH);
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
 * Splits a PNG file into its chunks and checks each chunk's length and CRC. It stops at IEND.
 *
 * @param {Buffer} bytes
 * @returns {{ type: string, data: Buffer }[]}
 */
function readChunks(bytes) {
  const isPng = bytes.length >= 8 && bytes.subarray(0, 8).equals(PNG_SIGNATURE);
  if (!isPng) {
    throw new CropRefusal("the file is not a PNG", EXIT_UNSUPPORTED);
  }
  const chunks = [];
  let offset = 8;
  while (true) {
    if (offset + 12 > bytes.length) {
      throw new CropRefusal(
        "the PNG is broken: it ends before its IEND chunk",
        EXIT_BROKEN,
      );
    }
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString("latin1", offset + 4, offset + 8);
    const end = offset + 12 + length;
    if (end > bytes.length) {
      throw new CropRefusal(
        `the PNG is broken: its ${type} chunk runs past the end of the file`,
        EXIT_BROKEN,
      );
    }
    const storedCrc = bytes.readUInt32BE(offset + 8 + length);
    const computedCrc = crc32(bytes.subarray(offset + 4, offset + 8 + length));
    if (storedCrc !== computedCrc) {
      throw new CropRefusal(
        `the PNG is broken: its ${type} chunk fails its CRC check`,
        EXIT_BROKEN,
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
      EXIT_BROKEN,
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
  const colorType = COLOR_TYPES.get(header.colorType);
  const validDepth = colorType?.bitDepths.includes(header.bitDepth) ?? false;
  const valid =
    header.width > 0 &&
    header.height > 0 &&
    validDepth &&
    header.compressionMethod === 0 &&
    header.filterMethod === 0 &&
    (header.interlaceMethod === 0 || header.interlaceMethod === 1);
  if (!valid || colorType === undefined) {
    throw new CropRefusal(
      "the PNG is broken: its IHDR chunk holds values the PNG standard does not allow",
      EXIT_BROKEN,
    );
  }
  if (header.interlaceMethod === 1) {
    throw new CropRefusal(
      "the PNG is interlaced, which this script does not crop",
      EXIT_UNSUPPORTED,
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
 * the filter byte. `filterBytesPerPixel` is the byte distance to the "left" byte: the bytes per
 * complete pixel, rounded up to 1 for bit depths under 8 (PNG standard, section 9.2).
 *
 * @param {Buffer} data
 * @param {number} height
 * @param {number} rowLength bytes per row, without the filter byte
 * @param {number} filterBytesPerPixel
 * @returns {Uint8Array[]}
 */
export function unfilterRows(data, height, rowLength, filterBytesPerPixel) {
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
        index >= filterBytesPerPixel
          ? (row[index - filterBytesPerPixel] ?? 0)
          : 0;
      const above = previous[index] ?? 0;
      const upperLeft =
        index >= filterBytesPerPixel
          ? (previous[index - filterBytesPerPixel] ?? 0)
          : 0;
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
          EXIT_BROKEN,
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
 * Decodes a non-interlaced PNG into its header, the chunks to copy into each crop, and its rows
 * of raw pixel bytes. It throws a CropRefusal for anything it cannot crop.
 *
 * @param {Buffer} bytes the whole file
 */
export function decodePng(bytes) {
  const chunks = readChunks(bytes);
  const header = readHeader(chunks);
  for (const chunk of chunks) {
    const isCritical = chunk.type[0] === chunk.type[0]?.toUpperCase();
    if (isCritical && !KNOWN_CRITICAL_CHUNK_TYPES.has(chunk.type)) {
      throw new CropRefusal(
        `the PNG has a critical chunk ${chunk.type} that this script does not know`,
        EXIT_UNSUPPORTED,
      );
    }
  }
  const firstImageDataIndex = chunks.findIndex(
    (chunk) => chunk.type === "IDAT",
  );
  if (firstImageDataIndex === -1) {
    throw new CropRefusal(
      "the PNG is broken: it has no IDAT chunk",
      EXIT_BROKEN,
    );
  }
  if (
    header.colorType === 3 &&
    !chunks.some((chunk) => chunk.type === "PLTE")
  ) {
    throw new CropRefusal(
      "the PNG is broken: it uses a palette but has no PLTE chunk",
      EXIT_BROKEN,
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
    throw new CropRefusal(
      "the PNG is broken: its image data does not inflate",
      EXIT_BROKEN,
    );
  }
  const bitsPerPixel = header.channels * header.bitDepth;
  const rowLength = Math.ceil((header.width * bitsPerPixel) / 8);
  if (inflated.length < header.height * (rowLength + 1)) {
    throw new CropRefusal(
      "the PNG is broken: its image data is shorter than its size needs",
      EXIT_BROKEN,
    );
  }
  const filterBytesPerPixel = Math.max(1, Math.ceil(bitsPerPixel / 8));
  const rows = unfilterRows(
    inflated,
    header.height,
    rowLength,
    filterBytesPerPixel,
  );
  return { header, bitsPerPixel, keptChunks, rows };
}

/**
 * Copies the pixels from column `x` to `x + width - 1` of one row into a new row. Pixels of 8 or
 * more bits are whole bytes and are copied as bytes. Pixels of 1, 2, or 4 bits are copied one by
 * one, most significant bits first, as PNG packs them.
 *
 * @param {Uint8Array} row
 * @param {number} bitsPerPixel
 * @param {number} x
 * @param {number} width
 * @returns {Uint8Array}
 */
export function sliceRow(row, bitsPerPixel, x, width) {
  if (bitsPerPixel % 8 === 0) {
    const bytesPerPixel = bitsPerPixel / 8;
    return row.slice(x * bytesPerPixel, (x + width) * bytesPerPixel);
  }
  const slice = new Uint8Array(Math.ceil((width * bitsPerPixel) / 8));
  const mask = (1 << bitsPerPixel) - 1;
  for (let pixel = 0; pixel < width; pixel++) {
    const sourceBit = (x + pixel) * bitsPerPixel;
    const sourceShift = 8 - bitsPerPixel - (sourceBit % 8);
    const value = ((row[Math.floor(sourceBit / 8)] ?? 0) >> sourceShift) & mask;
    const targetBit = pixel * bitsPerPixel;
    const targetShift = 8 - bitsPerPixel - (targetBit % 8);
    const targetIndex = Math.floor(targetBit / 8);
    slice[targetIndex] = (slice[targetIndex] ?? 0) | (value << targetShift);
  }
  return slice;
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
  const { header, bitsPerPixel, keptChunks, rows } = decoded;
  const imageHeader = Buffer.alloc(13);
  imageHeader.writeUInt32BE(crop.width, 0);
  imageHeader.writeUInt32BE(crop.height, 4);
  imageHeader[8] = header.bitDepth;
  imageHeader[9] = header.colorType;
  imageHeader[10] = 0;
  imageHeader[11] = 0;
  imageHeader[12] = 0;
  const filteredRows = [];
  for (let rowIndex = crop.y; rowIndex < crop.y + crop.height; rowIndex++) {
    filteredRows.push(Buffer.from([0]));
    filteredRows.push(
      sliceRow(
        rows[rowIndex] ?? new Uint8Array(),
        bitsPerPixel,
        crop.x,
        crop.width,
      ),
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
 * Runs the command: reads the image, writes its crops, and returns the lines to print and the
 * exit code. It writes nothing to the terminal itself, so a test can call it.
 *
 * @param {string[]} commandArguments the arguments after the script path
 * @returns {{ exitCode: number, lines: string[] }}
 */
export function runCrop(commandArguments) {
  const [imagePath, outputDirectory, ...extra] = commandArguments;
  if (imagePath === undefined || extra.length > 0) {
    return {
      exitCode: EXIT_USAGE,
      lines: ["usage: node crop.mjs IMAGE [OUT_DIR]"],
    };
  }
  let decoded;
  try {
    decoded = decodePng(readFileSync(imagePath));
  } catch (error) {
    if (error instanceof CropRefusal) {
      return {
        exitCode: error.exitCode,
        lines: [`cannot crop: ${error.message}; Read the whole image instead.`],
      };
    }
    if (error instanceof Error && "code" in error) {
      return {
        exitCode: EXIT_USAGE,
        lines: [`cannot crop: cannot read ${imagePath} (${error.code}).`],
      };
    }
    throw error;
  }
  const { width, height } = decoded.header;
  const lines = [`image ${imagePath}: ${width} x ${height} px`];
  const crops = planCrops(width, height);
  if (crops.length === 0) {
    lines.push(
      "no crops: the image fits in one view at full resolution, so Read it whole.",
    );
    return { exitCode: 0, lines };
  }
  let folder = outputDirectory;
  if (folder === undefined) {
    folder = mkdtempSync(join(tmpdir(), "design-critic-crops-"));
  } else {
    mkdirSync(folder, { recursive: true });
  }
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
