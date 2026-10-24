import sharp from "sharp";
import { describe, expect, test } from "vitest";
import { CouldNotRunError } from "../shared/could-not-run-error.js";
import {
  MAX_SIDE_PIXELS,
  MIN_SCALE_FACTOR,
  MIN_SIDE_PIXELS,
  prepareImage,
} from "./prepare.js";

const GREY = { r: 128, g: 128, b: 128, alpha: 1 };
const TOP_LEFT_RED = { r: 200, g: 10, b: 20, alpha: 1 };

/** Makes a PNG of one flat colour, for tests that only care about size. */
async function makeFlatPng(width: number, height: number): Promise<Uint8Array> {
  const buffer = await sharp({
    create: { width, height, channels: 3, background: GREY },
  })
    .png()
    .toBuffer();
  return new Uint8Array(buffer);
}

/** Makes a JPEG of one flat colour, for tests that only care about size. */
async function makeFlatJpeg(
  width: number,
  height: number,
): Promise<Uint8Array> {
  const buffer = await sharp({
    create: { width, height, channels: 3, background: GREY },
  })
    .jpeg()
    .toBuffer();
  return new Uint8Array(buffer);
}

/**
 * Makes a grey PNG whose top-left 4 by 4 block is red, so a test can tell
 * the padding colour came from the top-left pixel and not from the rest.
 */
async function makePngWithRedCorner(
  width: number,
  height: number,
): Promise<Uint8Array> {
  const corner = await sharp({
    create: { width: 4, height: 4, channels: 3, background: TOP_LEFT_RED },
  })
    .png()
    .toBuffer();
  const buffer = await sharp({
    create: { width, height, channels: 3, background: GREY },
  })
    .composite([{ input: corner, top: 0, left: 0 }])
    .png()
    .toBuffer();
  // composite adds an alpha channel, so a second pass removes it to give an
  // opaque RGB PNG like a normal screenshot.
  const opaque = await sharp(buffer).removeAlpha().png().toBuffer();
  return new Uint8Array(opaque);
}

/** Reads the colour of one pixel of an encoded image as [r, g, b, ...]. */
async function readPixel(
  imageBytes: Uint8Array,
  x: number,
  y: number,
): Promise<number[]> {
  const result = await sharp(imageBytes)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const channels = result.info.channels;
  const start = (y * result.info.width + x) * channels;
  return Array.from(result.data.subarray(start, start + channels));
}

describe("validation (FR-5)", () => {
  test("accepts a PNG and keeps the PNG format", async () => {
    const prepared = await prepareImage(await makeFlatPng(400, 300));
    expect(prepared.format).toBe("png");
    expect((await sharp(prepared.bytes).metadata()).format).toBe("png");
  });

  test("accepts a JPEG and keeps the JPEG format", async () => {
    const prepared = await prepareImage(await makeFlatJpeg(400, 300));
    expect(prepared.format).toBe("jpeg");
    expect((await sharp(prepared.bytes).metadata()).format).toBe("jpeg");
  });

  test("rejects empty input", async () => {
    await expect(prepareImage(new Uint8Array(0))).rejects.toBeInstanceOf(
      CouldNotRunError,
    );
  });

  test("rejects bytes that are not an image", async () => {
    const notAnImage = new TextEncoder().encode("this is not a picture");
    await expect(prepareImage(notAnImage)).rejects.toBeInstanceOf(
      CouldNotRunError,
    );
  });

  test("rejects a truncated JPEG", async () => {
    const jpeg = await makeFlatJpeg(400, 300);
    const truncated = jpeg.slice(0, Math.floor(jpeg.length / 2));
    await expect(prepareImage(truncated)).rejects.toBeInstanceOf(
      CouldNotRunError,
    );
  });

  test("rejects a truncated PNG", async () => {
    const png = await makePngWithRedCorner(400, 300);
    const truncated = png.slice(0, Math.floor(png.length / 2));
    await expect(prepareImage(truncated)).rejects.toBeInstanceOf(
      CouldNotRunError,
    );
  });

  test("rejects a GIF", async () => {
    const gif = await sharp({
      create: { width: 400, height: 300, channels: 3, background: GREY },
    })
      .gif()
      .toBuffer();
    await expect(prepareImage(new Uint8Array(gif))).rejects.toBeInstanceOf(
      CouldNotRunError,
    );
  });

  test("rejects a WebP", async () => {
    const webp = await sharp({
      create: { width: 400, height: 300, channels: 3, background: GREY },
    })
      .webp()
      .toBuffer();
    await expect(prepareImage(new Uint8Array(webp))).rejects.toBeInstanceOf(
      CouldNotRunError,
    );
  });

  test("the error message says the input is not a valid PNG or JPEG", async () => {
    await expect(prepareImage(new Uint8Array(0))).rejects.toThrow(
      "the image is not a valid PNG or JPEG",
    );
  });
});

describe("rotation and metadata (FR-6, NFR-7)", () => {
  test("turns a JPEG with orientation 6 upright and removes its EXIF", async () => {
    const rotatedJpeg = await sharp({
      create: { width: 400, height: 300, channels: 3, background: GREY },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const inputMetadata = await sharp(rotatedJpeg).metadata();
    expect(inputMetadata.orientation).toBe(6);

    const prepared = await prepareImage(new Uint8Array(rotatedJpeg));
    expect(prepared.originalWidth).toBe(300);
    expect(prepared.originalHeight).toBe(400);
    expect(prepared.width).toBe(300);
    expect(prepared.height).toBe(400);

    const outputMetadata = await sharp(prepared.bytes).metadata();
    expect(outputMetadata.width).toBe(300);
    expect(outputMetadata.height).toBe(400);
    expect(outputMetadata.exif).toBeUndefined();
    expect(outputMetadata.orientation).toBeUndefined();
  });

  test("removes an embedded colour profile and XMP from a PNG", async () => {
    const pngWithMetadata = await sharp({
      create: { width: 400, height: 300, channels: 3, background: GREY },
    })
      .png()
      .withMetadata({ icc: "p3" })
      .withXmp('<x:xmpmeta xmlns:x="adobe:ns:meta/"></x:xmpmeta>')
      .toBuffer();
    const inputMetadata = await sharp(pngWithMetadata).metadata();
    expect(inputMetadata.icc).toBeDefined();
    expect(inputMetadata.xmp).toBeDefined();

    const prepared = await prepareImage(new Uint8Array(pngWithMetadata));
    const outputMetadata = await sharp(prepared.bytes).metadata();
    expect(outputMetadata.icc).toBeUndefined();
    expect(outputMetadata.xmp).toBeUndefined();
    expect(outputMetadata.exif).toBeUndefined();
  });
});

describe("resize and scale factor (FR-7, FR-8)", () => {
  test("scales a 3000 by 2000 image down so the long side is 1568", async () => {
    const prepared = await prepareImage(await makeFlatPng(3000, 2000));
    expect(prepared.width).toBe(MAX_SIDE_PIXELS);
    expect(prepared.height).toBe(1045);
    expect(prepared.originalWidth).toBe(3000);
    expect(prepared.originalHeight).toBe(2000);
    expect(prepared.scaleFactor).toBe(1568 / 3000);
    expect(prepared.padded).toBe(false);
    const metadata = await sharp(prepared.bytes).metadata();
    expect(metadata.width).toBe(1568);
    expect(metadata.height).toBe(1045);
  });

  test("scales a 1440 by 2800 page down to 806 by 1568 with no padding", async () => {
    const prepared = await prepareImage(await makeFlatJpeg(1440, 2800));
    expect(prepared.width).toBe(806);
    expect(prepared.height).toBe(MAX_SIDE_PIXELS);
    expect(prepared.scaleFactor).toBe(1568 / 2800);
    expect(prepared.padded).toBe(false);
  });

  test("leaves an image that is already in range at its size", async () => {
    const prepared = await prepareImage(await makeFlatPng(1000, 800));
    expect(prepared.width).toBe(1000);
    expect(prepared.height).toBe(800);
    expect(prepared.scaleFactor).toBe(1);
    expect(prepared.padded).toBe(false);
  });

  test("dividing a prepared coordinate by the scale factor gives the original coordinate (US-11)", async () => {
    const prepared = await prepareImage(await makeFlatPng(3136, 1000));
    expect(prepared.scaleFactor).toBe(0.5);
    expect(prepared.width / prepared.scaleFactor).toBe(prepared.originalWidth);
  });
});

describe("padding (FR-8)", () => {
  test("pads a 1568 by 100 strip to a height of 280 with the top-left colour", async () => {
    const prepared = await prepareImage(await makePngWithRedCorner(1568, 100));
    expect(prepared.width).toBe(1568);
    expect(prepared.height).toBe(MIN_SIDE_PIXELS);
    expect(prepared.scaleFactor).toBe(1);
    expect(prepared.padded).toBe(true);
    // The page stays at the top-left, so its red corner is still there.
    expect(await readPixel(prepared.bytes, 0, 0)).toEqual([200, 10, 20]);
    // A pixel of the page that is not in the corner stays grey.
    expect(await readPixel(prepared.bytes, 1000, 50)).toEqual([128, 128, 128]);
    // The padding below the page has the top-left colour.
    expect(await readPixel(prepared.bytes, 1567, 279)).toEqual([200, 10, 20]);
    expect(await readPixel(prepared.bytes, 1000, 150)).toEqual([200, 10, 20]);
  });

  test("scales a 3000 by 100 strip down and then pads its height", async () => {
    const prepared = await prepareImage(await makeFlatPng(3000, 100));
    expect(prepared.width).toBe(1568);
    expect(prepared.height).toBe(MIN_SIDE_PIXELS);
    expect(prepared.scaleFactor).toBe(1568 / 3000);
    expect(prepared.padded).toBe(true);
  });

  test("pads both sides of a 100 by 100 image to 280 and does not scale it up", async () => {
    const prepared = await prepareImage(await makePngWithRedCorner(100, 100));
    expect(prepared.width).toBe(MIN_SIDE_PIXELS);
    expect(prepared.height).toBe(MIN_SIDE_PIXELS);
    expect(prepared.scaleFactor).toBe(1);
    expect(prepared.padded).toBe(true);
    expect(await readPixel(prepared.bytes, 50, 50)).toEqual([128, 128, 128]);
    expect(await readPixel(prepared.bytes, 279, 279)).toEqual([200, 10, 20]);
  });

  test("pads a transparent PNG with the top-left colour and alpha", async () => {
    const transparentPng = await sharp({
      create: {
        width: 600,
        height: 100,
        channels: 4,
        background: { r: 0, g: 0, b: 255, alpha: 0 },
      },
    })
      .png()
      .toBuffer();
    const prepared = await prepareImage(new Uint8Array(transparentPng));
    expect(prepared.padded).toBe(true);
    expect(await readPixel(prepared.bytes, 599, 279)).toEqual([0, 0, 255, 0]);
  });
});

describe("output limits (NFR-7, JC-1)", () => {
  const sizes = [
    [3000, 2000],
    [1440, 2800],
    [1568, 100],
    [100, 100],
    [10, 3000],
    [1000, 800],
  ];
  for (const [width = 0, height = 0] of sizes) {
    test(`a ${width} by ${height} image comes out with each side from 280 to 1568`, async () => {
      const prepared = await prepareImage(await makeFlatPng(width, height));
      const metadata = await sharp(prepared.bytes).metadata();
      expect(metadata.width).toBe(prepared.width);
      expect(metadata.height).toBe(prepared.height);
      for (const side of [prepared.width, prepared.height]) {
        expect(side).toBeGreaterThanOrEqual(MIN_SIDE_PIXELS);
        expect(side).toBeLessThanOrEqual(MAX_SIDE_PIXELS);
      }
    });
  }
});

describe("determinism (FR-10, NFR-5)", () => {
  test("the same PNG gives byte-identical output twice", async () => {
    const input = await makePngWithRedCorner(3000, 120);
    const first = await prepareImage(input);
    const second = await prepareImage(input);
    expect(Buffer.compare(first.bytes, second.bytes)).toBe(0);
    expect(first).toEqual(second);
  });

  test("the same JPEG gives byte-identical output twice", async () => {
    const input = await makeFlatJpeg(2400, 1800);
    const first = await prepareImage(input);
    const second = await prepareImage(input);
    expect(Buffer.compare(first.bytes, second.bytes)).toBe(0);
  });

  test("does not change the input bytes", async () => {
    const input = await makePngWithRedCorner(3000, 120);
    const copy = input.slice();
    await prepareImage(input);
    expect(Buffer.compare(input, copy)).toBe(0);
  });
});

describe("refusing an image that would shrink below half size (FR-73)", () => {
  test("refuses a 1440 by 8000 page and asks for the page in parts", async () => {
    const input = await makeFlatPng(1440, 8000);
    const attempt = prepareImage(input);
    await expect(attempt).rejects.toBeInstanceOf(CouldNotRunError);
    await expect(prepareImage(input)).rejects.toThrow(
      /would shrink below half size.*send the page in parts/,
    );
  });

  test("prepares a 2880 by 1800 retina screen as one image at half size or more", async () => {
    const prepared = await prepareImage(await makeFlatPng(2880, 1800));
    expect(prepared.scaleFactor).toBe(1568 / 2880);
    expect(prepared.scaleFactor).toBeGreaterThanOrEqual(MIN_SCALE_FACTOR);
    expect(prepared.width).toBe(MAX_SIDE_PIXELS);
    expect(prepared.height).toBe(980);
    // The exact key list shows the result carries one image and nothing else.
    expect(Object.keys(prepared).sort()).toEqual([
      "bytes",
      "format",
      "height",
      "originalHeight",
      "originalWidth",
      "padded",
      "scaleFactor",
      "width",
    ]);
  });

  test("keeps a 1280 by 800 image at scale factor 1", async () => {
    const prepared = await prepareImage(await makeFlatPng(1280, 800));
    expect(prepared.scaleFactor).toBe(1);
    expect(prepared.width).toBe(1280);
    expect(prepared.height).toBe(800);
  });

  test("accepts an image at exactly half size and refuses one just below", async () => {
    const atHalf = await prepareImage(await makeFlatPng(3136, 1000));
    expect(atHalf.scaleFactor).toBe(MIN_SCALE_FACTOR);
    await expect(
      prepareImage(await makeFlatPng(3137, 1000)),
    ).rejects.toBeInstanceOf(CouldNotRunError);
  });
});
