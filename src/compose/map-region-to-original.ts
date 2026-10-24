// Maps a Box answer's region from pixels of the prepared image back to pixels of the original
// image (FR-8, US-1, US-11).

import type { Region } from "../shared/answer.js";

/**
 * How the prepared image sits on the original: prepare multiplied the original by `scaleFactor`
 * and placed it at the top-left, so no offset is needed (FR-8).
 */
export type PreparedFrame = {
  readonly scaleFactor: number;
};

/** The size of the original image in pixels. */
export type OriginalSize = {
  readonly width: number;
  readonly height: number;
};

/**
 * Returns the region in whole pixels of the original image, or null when nothing of it is left
 * inside the original (FR-8, US-11). It divides by the scale factor, then clamps each edge to the original's bounds, so a region that reaches into prepare's padding is cut
 * at the image edge. Then it rounds each edge, so the rounded rectangle stays inside the bounds.
 */
export function mapRegionToOriginal(
  region: Region,
  frame: PreparedFrame,
  original: OriginalSize,
): Region | null {
  const scaleFactor = frame.scaleFactor;
  const left = region.x / scaleFactor;
  const top = region.y / scaleFactor;
  const right = (region.x + region.width) / scaleFactor;
  const bottom = (region.y + region.height) / scaleFactor;

  const roundedLeft = Math.round(clamp(left, 0, original.width));
  const roundedTop = Math.round(clamp(top, 0, original.height));
  const roundedRight = Math.round(clamp(right, 0, original.width));
  const roundedBottom = Math.round(clamp(bottom, 0, original.height));

  const width = roundedRight - roundedLeft;
  const height = roundedBottom - roundedTop;
  // The schema needs a width and height above 0, so an empty rectangle is no region.
  if (width <= 0 || height <= 0) {
    return null;
  }
  return { x: roundedLeft, y: roundedTop, width, height };
}

/** Returns the value moved inside the range from lowest to highest (FR-8). */
function clamp(value: number, lowest: number, highest: number): number {
  if (value < lowest) {
    return lowest;
  }
  if (value > highest) {
    return highest;
  }
  return value;
}
