import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  decodePng,
  encodeCrop,
  planCrops,
  splitLength,
} from "../plugin/skills/design-critic/scripts/crop.mjs";

const repositoryRoot = join(import.meta.dirname, "..");
const cropScript = join(
  repositoryRoot,
  "plugin/skills/design-critic/scripts/crop.mjs",
);
const tallImage = join(repositoryRoot, "evals/wobble/slice.png");

/** Returns a new empty folder in the system temp folder for one test. */
function newFolder(): string {
  return mkdtempSync(join(tmpdir(), "design-critic-crop-test-"));
}

/** Returns the CRC-32 of the bytes, written here apart from the script so the test checks it. */
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crc ^ byte;
    for (let bit = 0; bit < 8; bit++) {
      const lowBit = crc & 1;
      // `>>>` is an unsigned right shift, so crc stays a positive 32-bit number.
      crc = crc >>> 1;
      if (lowBit === 1) {
        crc = crc ^ 0xedb88320;
      }
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Returns one PNG chunk with its length and CRC. */
function chunk(type: string, data: Uint8Array): Buffer {
  const typeAndData = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

/** The Paeth predictor of the PNG standard, written here apart from the script. */
function paeth(left: number, above: number, upperLeft: number): number {
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
 * Builds a PNG from raw rows. Row n uses filter type n % 5, so every filter type is in the file
 * and the script must undo each one.
 */
function buildPng(options: {
  width: number;
  bitDepth: number;
  colorType: number;
  channels: number;
  rows: Uint8Array[];
  extraChunks?: Buffer[];
}): Buffer {
  const bitsPerPixel = options.channels * options.bitDepth;
  const filterDistance = Math.max(1, Math.ceil(bitsPerPixel / 8));
  const header = Buffer.alloc(13);
  header.writeUInt32BE(options.width, 0);
  header.writeUInt32BE(options.rows.length, 4);
  header[8] = options.bitDepth;
  header[9] = options.colorType;
  const filtered: Buffer[] = [];
  let previous: Uint8Array = new Uint8Array(options.rows[0]?.length ?? 0);
  options.rows.forEach((row, rowIndex) => {
    const filterType = rowIndex % 5;
    const out = new Uint8Array(row.length);
    for (let index = 0; index < row.length; index++) {
      const left =
        index >= filterDistance ? (row[index - filterDistance] ?? 0) : 0;
      const above = previous[index] ?? 0;
      const upperLeft =
        index >= filterDistance ? (previous[index - filterDistance] ?? 0) : 0;
      const predictors = [
        0,
        left,
        above,
        Math.floor((left + above) / 2),
        paeth(left, above, upperLeft),
      ];
      out[index] = ((row[index] ?? 0) - (predictors[filterType] ?? 0)) & 0xff;
    }
    filtered.push(Buffer.from([filterType]), Buffer.from(out));
    previous = row;
  });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    ...(options.extraChunks ?? []),
    chunk("IDAT", deflateSync(Buffer.concat(filtered))),
    chunk("IEND", new Uint8Array()),
  ]);
}

/** Reads the value of pixel x in a row of packed samples, as a list of its bytes or its bits. */
function pixelAt(row: Uint8Array, bitsPerPixel: number, x: number): number[] {
  if (bitsPerPixel % 8 === 0) {
    const bytesPerPixel = bitsPerPixel / 8;
    return Array.from(row.slice(x * bytesPerPixel, (x + 1) * bytesPerPixel));
  }
  const bit = x * bitsPerPixel;
  const byte = row[Math.floor(bit / 8)] ?? 0;
  const shift = 8 - bitsPerPixel - (bit % 8);
  return [(byte >> shift) & ((1 << bitsPerPixel) - 1)];
}

/** Lists the chunk types of a PNG file in order. */
function chunkTypes(bytes: Buffer): string[] {
  const types: string[] = [];
  let offset = 8;
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    types.push(bytes.toString("latin1", offset + 4, offset + 8));
    offset = offset + 12 + length;
  }
  return types;
}

describe("splitLength and planCrops", () => {
  it("cuts a 1280 x 1520 screenshot into two crops of one 1280 x 800 screen that overlap by 80 rows", () => {
    expect(planCrops(1280, 1520)).toEqual([
      { x: 0, y: 0, width: 1280, height: 800 },
      { x: 0, y: 720, width: 1280, height: 800 },
    ]);
  });

  it("gives no crops for an image that fits one view", () => {
    expect(planCrops(1280, 800)).toEqual([]);
    expect(planCrops(1280, 1280)).toEqual([]);
    expect(planCrops(1600, 1000)).toEqual([]);
    expect(planCrops(410, 700)).toEqual([]);
  });

  it("keeps crops at least 800 px tall for a narrow phone screenshot", () => {
    expect(planCrops(410, 1248)).toEqual([
      { x: 0, y: 0, width: 410, height: 800 },
      { x: 0, y: 448, width: 410, height: 800 },
    ]);
  });

  it("cuts an image wider than 1600 px into columns as well as rows", () => {
    expect(planCrops(2000, 1250)).toEqual([
      { x: 0, y: 0, width: 1600, height: 1000 },
      { x: 400, y: 0, width: 1600, height: 1000 },
      { x: 0, y: 250, width: 1600, height: 1000 },
      { x: 400, y: 250, width: 1600, height: 1000 },
    ]);
    expect(planCrops(2560, 900)).toEqual([
      { x: 0, y: 0, width: 1600, height: 900 },
      { x: 960, y: 0, width: 1600, height: 900 },
    ]);
  });

  it("covers every pixel with crops inside the image that overlap their neighbors", () => {
    for (const [width, height] of [
      [1280, 9000],
      [390, 2532],
      [1600, 1601],
      [3000, 5000],
    ] as const) {
      const crops = planCrops(width, height);
      for (const crop of crops) {
        expect(crop.x).toBeGreaterThanOrEqual(0);
        expect(crop.y).toBeGreaterThanOrEqual(0);
        expect(crop.x + crop.width).toBeLessThanOrEqual(width);
        expect(crop.y + crop.height).toBeLessThanOrEqual(height);
        expect(crop.width).toBeLessThanOrEqual(1600);
      }
      const rows = splitLength(height, crops[0]?.height ?? 0, 1);
      expect(rows[0]?.start).toBe(0);
      expect((rows.at(-1)?.start ?? 0) + (rows.at(-1)?.length ?? 0)).toBe(
        height,
      );
      for (let index = 1; index < rows.length; index++) {
        const before = rows[index - 1];
        expect(rows[index]?.start).toBeLessThan(
          (before?.start ?? 0) + (before?.length ?? 0),
        );
      }
    }
  });
});

describe("decodePng and encodeCrop", () => {
  const cases = [
    { colorType: 0, channels: 1, bitDepth: 1 },
    { colorType: 0, channels: 1, bitDepth: 2 },
    { colorType: 0, channels: 1, bitDepth: 4 },
    { colorType: 0, channels: 1, bitDepth: 8 },
    { colorType: 0, channels: 1, bitDepth: 16 },
    { colorType: 2, channels: 3, bitDepth: 8 },
    { colorType: 2, channels: 3, bitDepth: 16 },
    { colorType: 3, channels: 1, bitDepth: 1 },
    { colorType: 3, channels: 1, bitDepth: 2 },
    { colorType: 3, channels: 1, bitDepth: 4 },
    { colorType: 3, channels: 1, bitDepth: 8 },
    { colorType: 4, channels: 2, bitDepth: 8 },
    { colorType: 4, channels: 2, bitDepth: 16 },
    { colorType: 6, channels: 4, bitDepth: 8 },
    { colorType: 6, channels: 4, bitDepth: 16 },
  ];

  for (const testCase of cases) {
    it(`crops color type ${testCase.colorType} at ${testCase.bitDepth} bits with every filter type and the same pixels`, () => {
      const width = 13;
      const height = 11;
      const bitsPerPixel = testCase.channels * testCase.bitDepth;
      const rowLength = Math.ceil((width * bitsPerPixel) / 8);
      const rows: Uint8Array[] = [];
      for (let rowIndex = 0; rowIndex < height; rowIndex++) {
        const row = new Uint8Array(rowLength);
        for (let index = 0; index < rowLength; index++) {
          row[index] = (rowIndex * 37 + index * 101 + 7) & 0xff;
        }
        rows.push(row);
      }
      // Clear the padding bits after the last pixel, which a PNG writer leaves at zero.
      const paddingBits = rowLength * 8 - width * bitsPerPixel;
      for (const row of rows) {
        row[rowLength - 1] =
          ((row[rowLength - 1] ?? 0) >> paddingBits) << paddingBits;
      }
      const palette = chunk("PLTE", Buffer.alloc(256 * 3, 9));
      const transparency = chunk("tRNS", Buffer.from([0, 128, 255]));
      const extraChunks =
        testCase.colorType === 3
          ? [
              chunk("gAMA", Buffer.from([0, 0, 177, 143])),
              palette,
              transparency,
            ]
          : [chunk("gAMA", Buffer.from([0, 0, 177, 143]))];
      const png = buildPng({ ...testCase, width, rows, extraChunks });

      const decoded = decodePng(png);
      expect(decoded.rows.map((row) => Array.from(row))).toEqual(
        rows.map((row) => Array.from(row)),
      );

      const crop = { x: 3, y: 2, width: 7, height: 6 };
      const cropBytes = encodeCrop(decoded, crop);
      const reread = decodePng(cropBytes);
      expect(reread.header.width).toBe(7);
      expect(reread.header.height).toBe(6);
      expect(reread.header.bitDepth).toBe(testCase.bitDepth);
      expect(reread.header.colorType).toBe(testCase.colorType);
      for (let y = 0; y < crop.height; y++) {
        for (let x = 0; x < crop.width; x++) {
          const expected = pixelAt(
            rows[crop.y + y] ?? new Uint8Array(),
            bitsPerPixel,
            crop.x + x,
          );
          const actual = pixelAt(
            reread.rows[y] ?? new Uint8Array(),
            bitsPerPixel,
            x,
          );
          expect(actual).toEqual(expected);
        }
      }
      const expectedTypes =
        testCase.colorType === 3
          ? ["IHDR", "gAMA", "PLTE", "tRNS", "IDAT", "IEND"]
          : ["IHDR", "gAMA", "IDAT", "IEND"];
      expect(chunkTypes(cropBytes)).toEqual(expectedTypes);
    });
  }

  it("gives the same pixels as sharp for a crop of a committed screenshot", async () => {
    const decoded = decodePng(readFileSync(tallImage));
    const crop = { x: 100, y: 700, width: 900, height: 400 };
    const ourCrop = await sharp(encodeCrop(decoded, crop)).raw().toBuffer();
    const sharpCrop = await sharp(tallImage)
      .extract({
        left: crop.x,
        top: crop.y,
        width: crop.width,
        height: crop.height,
      })
      .raw()
      .toBuffer();
    expect(ourCrop.equals(sharpCrop)).toBe(true);
  });
});

describe("crop.mjs on the command line", () => {
  it("crops a committed screenshot taller than its width into crops as wide as the image", () => {
    const folder = newFolder();
    const output = execFileSync("node", [cropScript, tallImage, folder], {
      encoding: "utf8",
    });
    const lines = output.trim().split("\n");
    expect(lines[0]).toBe(`image ${tallImage}: 1280 x 1520 px`);
    expect(lines.slice(1)).toEqual([
      `crop ${join(folder, "slice-01.png")}: rows 0-799, columns 0-1279`,
      `crop ${join(folder, "slice-02.png")}: rows 720-1519, columns 0-1279`,
    ]);
    const files = readdirSync(folder).sort();
    expect(files).toEqual(["slice-01.png", "slice-02.png"]);
    for (const file of files) {
      const bytes = readFileSync(join(folder, file));
      expect(bytes.readUInt32BE(16)).toBe(1280);
    }
  });

  it("makes its own folder in the system temp folder when no folder is given", () => {
    const output = execFileSync("node", [cropScript, tallImage], {
      encoding: "utf8",
    });
    const cropLines = output.trim().split("\n").slice(1);
    expect(cropLines).toHaveLength(2);
    for (const line of cropLines) {
      expect(line.startsWith(`crop ${tmpdir()}`)).toBe(true);
    }
  });

  it("refuses a JPEG named .png with one line and exit code 3", async () => {
    const folder = newFolder();
    const jpegPath = join(folder, "photo.png");
    writeFileSync(jpegPath, await sharp(tallImage).jpeg().toBuffer());
    const result = spawnSync("node", [cropScript, jpegPath, folder], {
      encoding: "utf8",
    });
    expect(result.status).toBe(3);
    expect(result.stdout).toBe(
      "cannot crop: the file is not a PNG; Read the whole image instead.\n",
    );
  });

  it("refuses an interlaced PNG with one line and exit code 3", async () => {
    const folder = newFolder();
    const interlacedPath = join(folder, "interlaced.png");
    writeFileSync(
      interlacedPath,
      await sharp(tallImage).png({ progressive: true }).toBuffer(),
    );
    const result = spawnSync("node", [cropScript, interlacedPath, folder], {
      encoding: "utf8",
    });
    expect(result.status).toBe(3);
    expect(result.stdout).toBe(
      "cannot crop: the PNG is interlaced, which this script does not crop; Read the whole image instead.\n",
    );
  });

  it("refuses a cut-off PNG with one line and exit code 4", () => {
    const folder = newFolder();
    const brokenPath = join(folder, "broken.png");
    const bytes = readFileSync(tallImage);
    writeFileSync(brokenPath, bytes.subarray(0, Math.floor(bytes.length / 2)));
    const result = spawnSync("node", [cropScript, brokenPath, folder], {
      encoding: "utf8",
    });
    expect(result.status).toBe(4);
    expect(result.stdout.split("\n")).toHaveLength(2);
    expect(result.stdout.startsWith("cannot crop: the PNG is broken:")).toBe(
      true,
    );
  });
});
