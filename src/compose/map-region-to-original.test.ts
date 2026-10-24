import { describe, expect, test } from "vitest";
import { mapRegionToOriginal } from "./map-region-to-original.js";

// Disposable unit tests (CS-22) for the region map (FR-8, US-1, US-11).

const wholeImage = { scaleFactor: 1, originalTop: 0 };

describe("mapRegionToOriginal", () => {
  test("keeps the region as it is at scale factor 1", () => {
    const region = { x: 120, y: 540, width: 620, height: 180 };
    expect(
      mapRegionToOriginal(region, wholeImage, { width: 1440, height: 900 }),
    ).toEqual(region);
  });

  test("divides by the scale factor of a downscaled image", () => {
    // 3136 px wide scaled to 1568 px gives a scale factor of 0.5.
    const region = { x: 100, y: 50, width: 200, height: 100 };
    expect(
      mapRegionToOriginal(
        region,
        { scaleFactor: 0.5, originalTop: 0 },
        { width: 3136, height: 2000 },
      ),
    ).toEqual({ x: 200, y: 100, width: 400, height: 200 });
  });

  test("cuts a region that reaches into the padding at the original edge", () => {
    // The original is 1000 x 200 and prepare padded the height to 280.
    const region = { x: 10, y: 150, width: 100, height: 100 };
    expect(
      mapRegionToOriginal(region, wholeImage, { width: 1000, height: 200 }),
    ).toEqual({ x: 10, y: 150, width: 100, height: 50 });
  });

  test("gives null for a region that is all in the padding", () => {
    const region = { x: 10, y: 220, width: 100, height: 40 };
    expect(
      mapRegionToOriginal(region, wholeImage, { width: 1000, height: 200 }),
    ).toBeNull();
  });

  test("rounds each edge and stays inside the original", () => {
    // Scale factor 1568 / 3000. The right and bottom edges land past the original before clamping.
    const scaleFactor = 1568 / 3000;
    const result = mapRegionToOriginal(
      { x: 0.4, y: 0.4, width: 1567.9, height: 1000 },
      { scaleFactor, originalTop: 0 },
      { width: 3000, height: 1900 },
    );
    expect(result).toEqual({ x: 1, y: 1, width: 2999, height: 1899 });
  });

  test("adds the top offset of a slice after dividing", () => {
    const region = { x: 10, y: 20, width: 30, height: 40 };
    expect(
      mapRegionToOriginal(
        region,
        { scaleFactor: 0.5, originalTop: 1000 },
        { width: 3136, height: 5000 },
      ),
    ).toEqual({ x: 20, y: 1040, width: 60, height: 80 });
  });

  test("gives null for a region that rounds to no width", () => {
    const region = { x: 10, y: 10, width: 0.2, height: 50 };
    expect(
      mapRegionToOriginal(region, wholeImage, { width: 1000, height: 1000 }),
    ).toBeNull();
  });
});
