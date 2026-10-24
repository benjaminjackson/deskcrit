import sharp, { type Sharp } from "sharp";
import { CouldNotRunError } from "../shared/could-not-run-error.js";

/**
 * The shortest side TypeSafe accepts, in pixels. A shorter side is padded up
 * to this length (JC-1, NFR-7, FR-7, FR-8).
 */
export const MIN_SIDE_PIXELS = 280;

/**
 * The longest side TypeSafe accepts, in pixels. A longer side is scaled down
 * to exactly this length (JC-1, NFR-7, FR-7, FR-8). With both sides at most
 * 1568, the area is at most 2,458,624 pixels, which is TypeSafe's area limit.
 */
export const MAX_SIDE_PIXELS = 1568;

/** The image formats prepare accepts and writes (FR-5, NFR-7). */
export type ImageFormat = "png" | "jpeg";

/**
 * The image prepare returns, ready to send to TypeSafe (FR-7, FR-8, NFR-7).
 * Compose maps a Box region back to the original image by dividing its
 * coordinates by scaleFactor. The page sits at the top-left, so no offset is
 * needed (FR-8, US-11).
 */
export type PreparedImage = {
  /** The encoded image, with no metadata (FR-6). */
  bytes: Uint8Array;
  /** The same format as the input: PNG stays PNG and JPEG stays JPEG. */
  format: ImageFormat;
  /** The width of the prepared image, padding included. */
  width: number;
  /** The height of the prepared image, padding included. */
  height: number;
  /** The width of the input after it was turned upright. */
  originalWidth: number;
  /** The height of the input after it was turned upright. */
  originalHeight: number;
  /**
   * Prepared pixels divided by original pixels, measured on the long side.
   * It is 1 when the image was not scaled down. The short side is rounded to
   * a whole pixel, so on that axis the ratio is off by at most half a pixel.
   */
  scaleFactor: number;
  /** True when a side was padded up to MIN_SIDE_PIXELS (FR-8). */
  padded: boolean;
};

/** The upright, sRGB pixels of the input, one byte per channel. */
type UprightPixels = {
  pixels: Uint8Array;
  width: number;
  height: number;
  channels: 1 | 2 | 3 | 4;
};

/** The size of the page after any downscale, before padding. */
type FittedSize = {
  width: number;
  height: number;
  scaleFactor: number;
};

const INVALID_IMAGE_MESSAGE = "the image is not a valid PNG or JPEG";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];

/** The quality for JPEG output, fixed so the bytes never change (FR-10). */
const JPEG_QUALITY = 90;

/**
 * Turns the bytes of one PNG or JPEG into an image TypeSafe accepts: upright,
 * in sRGB, with no metadata, each side from 280 to 1568 pixels, in the input's
 * format. The same bytes always give the same output bytes, and the input is
 * not changed (FR-5, FR-6, FR-7, FR-8, FR-10, NFR-7, US-11).
 */
export async function prepareImage(
  imageBytes: Uint8Array,
): Promise<PreparedImage> {
  const format = detectFormat(imageBytes);
  const upright = await decodeUpright(imageBytes);
  const fitted = fitWithinLimits(upright.width, upright.height);
  const finalWidth = Math.max(fitted.width, MIN_SIDE_PIXELS);
  const finalHeight = Math.max(fitted.height, MIN_SIDE_PIXELS);
  const padded = finalWidth > fitted.width || finalHeight > fitted.height;

  let pipeline = sharp(upright.pixels, {
    raw: {
      width: upright.width,
      height: upright.height,
      channels: upright.channels,
    },
  });
  if (fitted.scaleFactor !== 1) {
    // fit "fill" makes sharp use the exact sizes computed above, so the
    // rounding rule lives in fitWithinLimits and not inside sharp.
    pipeline = pipeline.resize({
      width: fitted.width,
      height: fitted.height,
      fit: "fill",
      kernel: "lanczos3",
    });
  }
  if (padded) {
    pipeline = pipeline.extend({
      top: 0,
      left: 0,
      right: finalWidth - fitted.width,
      bottom: finalHeight - fitted.height,
      background: readTopLeftColour(upright),
    });
  }
  const encoded = await encodeImage(pipeline, format);

  return {
    bytes: new Uint8Array(encoded),
    format,
    width: finalWidth,
    height: finalHeight,
    originalWidth: upright.width,
    originalHeight: upright.height,
    scaleFactor: fitted.scaleFactor,
    padded,
  };
}

/**
 * Reads the format from the first bytes of the file, because prepare gets
 * bytes and no file name to trust. Anything that is not PNG or JPEG, such as
 * GIF, WebP, SVG, or empty input, throws before any decoder runs (FR-5, CS-16).
 */
function detectFormat(imageBytes: Uint8Array): ImageFormat {
  if (startsWith(imageBytes, PNG_SIGNATURE)) {
    return "png";
  }
  if (startsWith(imageBytes, JPEG_SIGNATURE)) {
    return "jpeg";
  }
  throw new CouldNotRunError(INVALID_IMAGE_MESSAGE);
}

/** Says whether the bytes begin with the given signature (FR-5). */
function startsWith(imageBytes: Uint8Array, signature: number[]): boolean {
  if (imageBytes.length < signature.length) {
    return false;
  }
  for (let index = 0; index < signature.length; index++) {
    if (imageBytes[index] !== signature[index]) {
      return false;
    }
  }
  return true;
}

/**
 * Decodes the whole image, turns it upright from its orientation tag, and
 * converts it to sRGB raw pixels. Raw pixels carry no EXIF, ICC profile, or
 * other metadata, so nothing can add metadata back later (FR-5, FR-6, NFR-7).
 * A truncated or corrupt file fails here, because failOn "warning" makes
 * sharp treat a decoder warning as an error.
 */
async function decodeUpright(imageBytes: Uint8Array): Promise<UprightPixels> {
  try {
    const result = await sharp(imageBytes, { failOn: "warning" })
      .autoOrient()
      .toColourspace("srgb")
      .raw({ depth: "uchar" })
      .toBuffer({ resolveWithObject: true });
    return {
      pixels: new Uint8Array(result.data),
      width: result.info.width,
      height: result.info.height,
      channels: result.info.channels,
    };
  } catch {
    throw new CouldNotRunError(INVALID_IMAGE_MESSAGE);
  }
}

/**
 * Works out the page size after the downscale. If the long side is over 1568
 * it becomes exactly 1568 and the short side is scaled by the same factor and
 * rounded to the nearest pixel. A smaller image is never scaled up (FR-7,
 * FR-8).
 */
function fitWithinLimits(width: number, height: number): FittedSize {
  const longSide = Math.max(width, height);
  if (longSide <= MAX_SIDE_PIXELS) {
    return { width, height, scaleFactor: 1 };
  }
  const scaleFactor = MAX_SIDE_PIXELS / longSide;
  if (width >= height) {
    const scaledHeight = Math.max(1, Math.round(height * scaleFactor));
    return { width: MAX_SIDE_PIXELS, height: scaledHeight, scaleFactor };
  }
  const scaledWidth = Math.max(1, Math.round(width * scaleFactor));
  return { width: scaledWidth, height: MAX_SIDE_PIXELS, scaleFactor };
}

/**
 * Reads the colour of the top-left pixel from the upright pixels, before any
 * resize blends it with its neighbours, for use as the flat padding colour.
 * A PNG keeps its alpha, so the padding uses the pixel's alpha too (FR-8).
 */
function readTopLeftColour(upright: UprightPixels): {
  r: number;
  g: number;
  b: number;
  alpha: number;
} {
  const first = upright.pixels[0] ?? 0;
  const second = upright.pixels[1] ?? 0;
  const third = upright.pixels[2] ?? 0;
  const fourth = upright.pixels[3] ?? 255;
  // After the sRGB conversion there are 3 channels (colour) or 4 (colour and
  // alpha). sharp takes the background alpha from 0 to 1, not 0 to 255.
  if (upright.channels === 4) {
    return { r: first, g: second, b: third, alpha: fourth / 255 };
  }
  if (upright.channels === 3) {
    return { r: first, g: second, b: third, alpha: 1 };
  }
  throw new Error(
    `prepare expected 3 or 4 sRGB channels, got ${upright.channels}`,
  );
}

/**
 * Writes the image in the input's format with every encoder setting fixed,
 * so a sharp default cannot change the bytes (FR-10, NFR-5, NFR-7). sharp
 * writes no metadata unless asked, and this code never asks (FR-6).
 */
async function encodeImage(
  pipeline: Sharp,
  format: ImageFormat,
): Promise<Buffer> {
  switch (format) {
    case "png":
      return pipeline
        .png({
          compressionLevel: 9,
          adaptiveFiltering: false,
          palette: false,
          progressive: false,
        })
        .toBuffer();
    case "jpeg":
      return pipeline
        .jpeg({
          quality: JPEG_QUALITY,
          chromaSubsampling: "4:2:0",
          progressive: false,
          mozjpeg: false,
          optimiseCoding: true,
        })
        .toBuffer();
    default: {
      // A variable of type never only compiles when every format above has
      // its own case, so a new format makes the compiler point here (CS-9).
      const unhandled: never = format;
      throw new Error(`prepare cannot encode format ${String(unhandled)}`);
    }
  }
}
