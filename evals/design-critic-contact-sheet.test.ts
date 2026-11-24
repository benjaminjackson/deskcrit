import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const script = join(
  import.meta.dirname,
  "..",
  "plugin/skills/design-critic/scripts/contact-sheet.mjs",
);

// The script's temporary defaults (crit-j8y.3); a test of the sheet size must change with them.
const TILE_WIDTH = 640;
const GUTTER = 24;
const MAX_TILE_HEIGHT = 960;
const BAND = 44;

/** Returns a new empty folder in the system temp folder for one test. */
function newFolder(): string {
  return mkdtempSync(join(tmpdir(), "design-critic-contact-sheet-test-"));
}

/** Writes a solid-color PNG of the given size and returns its path. */
async function writeScreen(
  folder: string,
  name: string,
  width: number,
  height: number,
  color: { r: number; g: number; b: number },
): Promise<string> {
  const path = join(folder, name);
  await sharp({
    create: { width, height, channels: 3, background: color },
  })
    .png()
    .toFile(path);
  return path;
}

/** Runs the script as a child process and returns its exit code and output lines. */
function runScript(commandArguments: string[]) {
  const result = spawnSync("node", [script, ...commandArguments], {
    encoding: "utf8",
  });
  return {
    status: result.status,
    lines: result.stdout.split("\n").filter((line) => line !== ""),
  };
}

describe("contact-sheet.mjs", () => {
  it("writes a decodable sheet and a tile map for four screens in two columns", async () => {
    const folder = newFolder();
    const red = await writeScreen(folder, "red.png", 320, 200, {
      r: 255,
      g: 0,
      b: 0,
    });
    const green = await writeScreen(folder, "green.png", 1280, 800, {
      r: 0,
      g: 255,
      b: 0,
    });
    const blue = await writeScreen(folder, "blue.png", 390, 3000, {
      r: 0,
      g: 0,
      b: 255,
    });
    const white = await writeScreen(folder, "white.png", 640, 400, {
      r: 255,
      g: 255,
      b: 255,
    });
    const out = join(folder, "out");

    const result = runScript([
      red,
      green,
      blue,
      white,
      "--out",
      out,
      "--columns",
      "2",
    ]);
    expect(result.status).toBe(0);

    const map = JSON.parse(readFileSync(join(out, "tiles.json"), "utf8"));
    expect(map.tiles).toHaveLength(4);
    expect(map.tiles.map((tile: { tile: number }) => tile.tile)).toEqual([
      1, 2, 3, 4,
    ]);
    expect(map.tiles.map((tile: { path: string }) => tile.path)).toEqual([
      red,
      green,
      blue,
      white,
    ]);
    // 320 x 200 scales up to 640 x 400; 1280 x 800 down to 640 x 400; the tall one is cut at 960.
    expect(map.tiles[0].box).toEqual({ x: 24, y: 68, width: 640, height: 400 });
    expect(map.tiles[1].box).toEqual({
      x: 688,
      y: 68,
      width: 640,
      height: 400,
    });
    expect(map.tiles[2].box).toEqual({
      x: 24,
      y: 536,
      width: 640,
      height: MAX_TILE_HEIGHT,
    });
    expect(map.tiles[3].box).toEqual({
      x: 688,
      y: 536,
      width: 640,
      height: 400,
    });

    const expectedWidth = GUTTER + 2 * (TILE_WIDTH + GUTTER);
    const expectedHeight =
      GUTTER + (BAND + 400 + GUTTER) + (BAND + MAX_TILE_HEIGHT + GUTTER);
    expect(map.sheet).toEqual({ width: expectedWidth, height: expectedHeight });

    const metadata = await sharp(join(out, "sheet.png")).metadata();
    expect(metadata.width).toBe(expectedWidth);
    expect(metadata.height).toBe(expectedHeight);

    // Each tile keeps its screen's color.
    const { data, info } = await sharp(join(out, "sheet.png"))
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixelAt = (x: number, y: number) => {
      const offset = (y * info.width + x) * info.channels;
      return [data[offset], data[offset + 1], data[offset + 2]];
    };
    expect(pixelAt(24 + 400, 68 + 300)).toEqual([255, 0, 0]);
    expect(pixelAt(688 + 400, 68 + 300)).toEqual([0, 255, 0]);
    expect(pixelAt(24 + 400, 536 + 800)).toEqual([0, 0, 255]);
    // The gutter is neither tile color.
    expect(pixelAt(5, 5)).toEqual([128, 128, 128]);
  });

  it("draws a white number on a black plate in the band above the tile", async () => {
    const folder = newFolder();
    const white = await writeScreen(folder, "white.png", 640, 400, {
      r: 255,
      g: 255,
      b: 255,
    });
    const out = join(folder, "out");
    expect(runScript([white, "--out", out]).status).toBe(0);

    const { data, info } = await sharp(join(out, "sheet.png"))
      .raw()
      .toBuffer({ resolveWithObject: true });
    const corner = { x: 24, y: 24 };
    let black = 0;
    let bright = 0;
    for (let y = corner.y; y < corner.y + BAND; y++) {
      for (let x = corner.x; x < corner.x + 36; x++) {
        const value = data[(y * info.width + x) * info.channels] ?? 0;
        if (value === 0) {
          black += 1;
        }
        if (value === 255) {
          bright += 1;
        }
      }
    }
    // The plate (black) and the digit "1" (white ink) are both inside the corner box.
    expect(black).toBeGreaterThan(400);
    expect(bright).toBeGreaterThan(40);
  });

  it("defaults to two columns and shrinks to the number of screens", async () => {
    const folder = newFolder();
    const screen = await writeScreen(folder, "a.png", 640, 400, {
      r: 9,
      g: 9,
      b: 9,
    });
    const out = join(folder, "out");
    expect(runScript([screen, screen, "--out", out]).status).toBe(0);
    const twoTiles = JSON.parse(readFileSync(join(out, "tiles.json"), "utf8"));
    expect(twoTiles.sheet.width).toBe(GUTTER + 2 * (TILE_WIDTH + GUTTER));

    const oneOut = join(folder, "one");
    expect(runScript([screen, "--out", oneOut]).status).toBe(0);
    const oneTile = JSON.parse(
      readFileSync(join(oneOut, "tiles.json"), "utf8"),
    );
    expect(oneTile.sheet.width).toBe(GUTTER + (TILE_WIDTH + GUTTER));

    const threeOut = join(folder, "three");
    expect(runScript([screen, screen, screen, "--out", threeOut]).status).toBe(
      0,
    );
    const threeTiles = JSON.parse(
      readFileSync(join(threeOut, "tiles.json"), "utf8"),
    );
    expect(threeTiles.tiles[2].box.x).toBe(24);
    expect(threeTiles.tiles[2].box.y).toBeGreaterThan(
      threeTiles.tiles[0].box.y,
    );
  });

  it("refuses with exit 2 and one line", async () => {
    const folder = newFolder();
    const screen = await writeScreen(folder, "a.png", 64, 40, {
      r: 1,
      g: 2,
      b: 3,
    });
    const notPng = join(folder, "text.png");
    writeFileSync(notPng, "not a png");
    const jpeg = join(folder, "photo.jpg");
    await sharp({
      create: { width: 8, height: 8, channels: 3, background: "#fff" },
    })
      .jpeg()
      .toFile(jpeg);
    const out = join(folder, "out");
    const thirteen = Array.from({ length: 13 }, () => screen);

    const cases: string[][] = [
      [],
      [screen],
      ["--out", out],
      [screen, "--out", out, "--columns", "0"],
      [screen, "--out", out, "--columns", "two"],
      [screen, "--out", out, "--bogus"],
      [...thirteen, "--out", out],
      [notPng, "--out", out],
      [jpeg, "--out", out],
      [join(folder, "missing.png"), "--out", out],
    ];
    for (const commandArguments of cases) {
      const result = runScript(commandArguments);
      expect(result.status, commandArguments.join(" ")).toBe(2);
      expect(result.lines, commandArguments.join(" ")).toHaveLength(1);
    }
    expect(
      runScript([...Array.from({ length: 12 }, () => screen), "--out", out])
        .status,
    ).toBe(0);
  });
});
