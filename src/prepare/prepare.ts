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
 * One full-width slice of the page, ready to send to TypeSafe (FR-70). Compose
 * maps a Box region on the slice back to the original image by dividing its
 * coordinates by scaleFactor and then adding originalTop to y (FR-72).
 */
export type PreparedSlice = {
  /** The position of the slice, counted from 0 at the top (FR-70). */
  index: number;
  /** The encoded slice, with no metadata, in the page's format (FR-6). */
  bytes: Uint8Array;
  /** The width of the prepared slice, padding included. */
  width: number;
  /** The height of the prepared slice, padding included. */
  height: number;
  /** The top edge of the slice, in pixels of the upright original image. */
  originalTop: number;
  /** The height of the slice, in pixels of the upright original image. */
  originalHeight: number;
  /**
   * Prepared pixels divided by original pixels, measured on the width. It is
   * 1 when the width was not scaled down.
   */
  scaleFactor: number;
  /** True when a side was padded up to MIN_SIDE_PIXELS (FR-8). */
  padded: boolean;
};

/**
 * The image prepare returns, ready to send to TypeSafe (FR-7, FR-8, FR-70,
 * NFR-7). The top-level fields describe the downscaled whole page. Compose
 * maps a Box region on it back to the original image by dividing its
 * coordinates by scaleFactor. The page sits at the top-left, so no offset is
 * needed (FR-8, US-11). The slices list holds the cut page (FR-70). When the
 * page needs no cut, it holds one slice that is the whole page.
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
  /**
   * The slices from top to bottom (FR-70). A page that needs no cut has one
   * slice with the same bytes, size, scale factor, and padding as the page.
   */
  slices: PreparedSlice[];
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

/** One encoded image and its final size, padding included. */
type RenderedImage = {
  bytes: Uint8Array;
  width: number;
  height: number;
  padded: boolean;
};

/** Where one slice sits in the upright original image, in its pixels. */
type SliceBounds = {
  originalTop: number;
  originalHeight: number;
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
  const page = await renderImage(upright, fitted, upright, format);

  const sliceScale = fitWidthWithinLimit(upright.width);
  const sliceBoundsList = planSlices(upright.height, sliceScale.scaleFactor);
  const slices: PreparedSlice[] = [];
  if (sliceBoundsList.length === 1) {
    // No cut: the whole page is the only slice, so its output stays exactly
    // what it was before slicing existed (FR-70).
    slices.push({
      index: 0,
      bytes: page.bytes,
      width: page.width,
      height: page.height,
      originalTop: 0,
      originalHeight: upright.height,
      scaleFactor: fitted.scaleFactor,
      padded: page.padded,
    });
  } else {
    for (let index = 0; index < sliceBoundsList.length; index++) {
      const bounds = sliceBoundsList[index];
      if (bounds === undefined) {
        throw new Error(`prepare lost slice ${index}`);
      }
      const slice = await prepareSlice(upright, bounds, sliceScale, format);
      slices.push({ index, ...slice });
    }
  }

  return {
    bytes: page.bytes,
    format,
    width: page.width,
    height: page.height,
    originalWidth: upright.width,
    originalHeight: upright.height,
    scaleFactor: fitted.scaleFactor,
    padded: page.padded,
    slices,
  };
}

/**
 * Scales the pixels to the fitted size, pads a side under MIN_SIDE_PIXELS
 * with the page's top-left colour at the bottom and right, and encodes the
 * result. The page and every slice go through this one function, so they
 * share one resize, padding, and encoder rule (FR-7, FR-8, FR-10, FR-70).
 */
async function renderImage(
  source: UprightPixels,
  fitted: FittedSize,
  page: UprightPixels,
  format: ImageFormat,
): Promise<RenderedImage> {
  const finalWidth = Math.max(fitted.width, MIN_SIDE_PIXELS);
  const finalHeight = Math.max(fitted.height, MIN_SIDE_PIXELS);
  const padded = finalWidth > fitted.width || finalHeight > fitted.height;

  let pipeline = sharp(source.pixels, {
    raw: {
      width: source.width,
      height: source.height,
      channels: source.channels,
    },
  });
  if (fitted.width !== source.width || fitted.height !== source.height) {
    // fit "fill" makes sharp use the exact sizes computed by the caller, so
    // the rounding rule lives in this file and not inside sharp.
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
      background: readTopLeftColour(page),
    });
  }
  const encoded = await encodeImage(pipeline, format);
  return {
    bytes: new Uint8Array(encoded),
    width: finalWidth,
    height: finalHeight,
    padded,
  };
}

/**
 * Cuts one full-width band of rows out of the upright pixels, scales it by
 * the width scale factor, and encodes it. The band is cut in original pixels
 * before the resize, so its top offset is a whole original pixel (FR-70).
 */
async function prepareSlice(
  upright: UprightPixels,
  bounds: SliceBounds,
  sliceScale: FittedSize,
  format: ImageFormat,
): Promise<Omit<PreparedSlice, "index">> {
  const rowLength = upright.width * upright.channels;
  // subarray gives a view of the rows from originalTop to the slice bottom,
  // with no copy, so the input pixels are never changed.
  const bandPixels = upright.pixels.subarray(
    bounds.originalTop * rowLength,
    (bounds.originalTop + bounds.originalHeight) * rowLength,
  );
  const band: UprightPixels = {
    pixels: bandPixels,
    width: upright.width,
    height: bounds.originalHeight,
    channels: upright.channels,
  };
  const fitted: FittedSize = {
    width: sliceScale.width,
    height: scaleSide(bounds.originalHeight, sliceScale.scaleFactor),
    scaleFactor: sliceScale.scaleFactor,
  };
  const rendered = await renderImage(band, fitted, upright, format);
  return {
    bytes: rendered.bytes,
    width: rendered.width,
    height: rendered.height,
    originalTop: bounds.originalTop,
    originalHeight: bounds.originalHeight,
    scaleFactor: sliceScale.scaleFactor,
    padded: rendered.padded,
  };
}

/**
 * Works out the width a slice is scaled to and the scale factor: the width
 * becomes 1568 when it is wider, and is never scaled up (FR-7, FR-70). The
 * height in the result is not used.
 */
function fitWidthWithinLimit(width: number): FittedSize {
  if (width <= MAX_SIDE_PIXELS) {
    return { width, height: 0, scaleFactor: 1 };
  }
  return {
    width: MAX_SIDE_PIXELS,
    height: 0,
    scaleFactor: MAX_SIDE_PIXELS / width,
  };
}

/**
 * Scales one side by the scale factor and rounds it to the nearest whole
 * pixel, never below 1 (FR-7, FR-8).
 */
function scaleSide(length: number, scaleFactor: number): number {
  if (scaleFactor === 1) {
    return length;
  }
  return Math.max(1, Math.round(length * scaleFactor));
}

/**
 * Chooses where to cut the page, in original pixels, using the OQ-22
 * proposed defaults: the height test reads the height after the width is
 * scaled, the cut uses the fewest slices whose scaled height fits in 1568,
 * all slices have one height, and slices do not overlap. When the original
 * height does not divide evenly, the last slice is shorter by the remainder.
 * A page that fits gives one slice (FR-70, OQ-22).
 */
function planSlices(
  originalHeight: number,
  scaleFactor: number,
): SliceBounds[] {
  const scaledHeight = scaleSide(originalHeight, scaleFactor);
  if (scaledHeight <= MAX_SIDE_PIXELS) {
    return [{ originalTop: 0, originalHeight }];
  }
  let sliceCount = Math.ceil(scaledHeight / MAX_SIDE_PIXELS);
  let sliceHeight = Math.ceil(originalHeight / sliceCount);
  // Rounding can push a scaled slice one pixel over the limit, so add a
  // slice until every slice fits.
  while (scaleSide(sliceHeight, scaleFactor) > MAX_SIDE_PIXELS) {
    sliceCount = sliceCount + 1;
    sliceHeight = Math.ceil(originalHeight / sliceCount);
  }
  const boundsList: SliceBounds[] = [];
  for (
    let originalTop = 0;
    originalTop < originalHeight;
    originalTop = originalTop + sliceHeight
  ) {
    const remaining = originalHeight - originalTop;
    boundsList.push({
      originalTop,
      originalHeight: Math.min(sliceHeight, remaining),
    });
  }
  return boundsList;
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
