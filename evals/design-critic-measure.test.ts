import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import {
  clusterValues,
  compositeColor,
  contrastRatio,
  EXIT_USAGE,
  findMainStyle,
  formatFactsJson,
  measureContrast,
  measureLines,
  nameDrawnFont,
  parseCssColor,
  planScreenCrops,
  resolveBackground,
  runMeasure,
} from "../plugin/skills/design-critic/scripts/measure.mjs";

// The no-browser checks of the design critic's measure script (PRD FR-79). They run in
// `npm run ci`, which has no Chromium. The browser check, which measures the known-values page
// with the real script, is evals/measure/browser-check.mjs, run by `npm --prefix packs run check:measure`.

const repositoryRoot = join(import.meta.dirname, "..");
const white = { red: 255, green: 255, blue: 255, alpha: 1 };
const black = { red: 0, green: 0, blue: 0, alpha: 1 };

/** Reads and parses a JSON file from the repository. JSON.parse returns `any`, kept as `unknown` here. */
function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(join(repositoryRoot, relativePath), "utf8"));
}

/** Compiles schemas/facts.schema.json with Ajv for draft 2020-12. */
function compileFactsValidator() {
  const ajv = new Ajv2020({ allErrors: true });
  const schema = readJson("schemas/facts.schema.json");
  if (typeof schema !== "object" || schema === null) {
    throw new Error("schemas/facts.schema.json is not a JSON object");
  }
  return ajv.compile(schema);
}

/** Returns one character rectangle on the line whose top is `top`, 24 px tall. */
function characterOnLine(top: number): { top: number; bottom: number } {
  return { top, bottom: top + 24 };
}

describe("contrast", () => {
  it("gives 21 for black on white and 4.48 for #777777 on white (WCAG 2)", () => {
    expect(contrastRatio(black, white)).toBe(21);
    const gray = { red: 0x77, green: 0x77, blue: 0x77, alpha: 1 };
    expect(contrastRatio(gray, white)).toBe(4.48);
    expect(contrastRatio(white, gray)).toBe(4.48);
    expect(contrastRatio(white, white)).toBe(1);
  });

  it("reads the color forms Chromium computes, and refuses others", () => {
    expect(parseCssColor("rgb(119, 119, 119)")).toEqual({
      red: 119,
      green: 119,
      blue: 119,
      alpha: 1,
    });
    expect(parseCssColor("rgba(0, 0, 0, 0.5)")?.alpha).toBe(0.5);
    expect(parseCssColor("oklch(0.5 0.1 200)")).toBeNull();
  });

  it("composites an alpha color over the color under it", () => {
    const halfBlack = { red: 0, green: 0, blue: 0, alpha: 0.5 };
    expect(compositeColor(halfBlack, white)).toEqual({
      red: 127.5,
      green: 127.5,
      blue: 127.5,
      alpha: 1,
    });
  });
});

describe("resolveBackground", () => {
  const transparent = {
    backgroundColor: "rgba(0, 0, 0, 0)",
    hasImage: false,
    replaced: false,
  };

  it("stops at the first opaque layer and composites the alpha layers above it", () => {
    const result = resolveBackground(
      [
        { ...transparent, backgroundColor: "rgba(0, 0, 0, 0.5)" },
        { ...transparent, backgroundColor: "rgb(255, 255, 255)" },
        { ...transparent, backgroundColor: "rgb(255, 0, 0)" },
      ],
      "rgb(0, 0, 255)",
    );
    expect(result).toEqual({
      color: { red: 127.5, green: 127.5, blue: 127.5, alpha: 1 },
    });
  });

  it("falls back to the canvas color, then to white", () => {
    expect(resolveBackground([transparent], "rgb(0, 0, 0)")).toEqual({
      color: black,
    });
    expect(resolveBackground([transparent], "rgba(0, 0, 0, 0)")).toEqual({
      color: white,
    });
  });

  it("refuses a number when an image, a gradient, or a replaced element lies under the text", () => {
    expect(
      resolveBackground([transparent, { ...transparent, hasImage: true }], ""),
    ).toEqual({ reason: "not measurable: background image" });
    expect(resolveBackground([{ ...transparent, replaced: true }], "")).toEqual(
      { reason: "not measurable: background image" },
    );
  });
});

describe("measureContrast", () => {
  const plainSample = {
    found: true,
    covered: false,
    pseudo: false,
    paintEffect: false,
    textFill: false,
    color: "rgb(0, 0, 0)",
    layers: [
      {
        backgroundColor: "rgb(255, 255, 255)",
        hasImage: false,
        replaced: false,
      },
    ],
  };

  it("measures each sampled character's own color over a plain color and keeps the lowest", () => {
    expect(measureContrast({ samples: [plainSample] }, "")).toEqual({
      contrast: 21,
      background: "#ffffff",
    });
    const lightLink = { ...plainSample, color: "rgb(187, 187, 187)" };
    expect(
      measureContrast({ samples: [plainSample, lightLink] }, "").contrast,
    ).toBe(1.92);
  });

  it("gives null with a note for each case one number would get wrong", () => {
    const cases: [Record<string, unknown>, string][] = [
      [{ covered: true }, "not measurable: covered by another element"],
      [{ textFill: true }, "not measurable: image or gradient text fill"],
      [{ pseudo: true }, "not measurable: pseudo-element background"],
      [{ paintEffect: true }, "not measurable: opacity, filter, or blend mode"],
      [{ found: false }, "not measurable: text not found at its own position"],
      [
        { color: "oklch(0.5 0.1 200)" },
        "not measurable: color format oklch(0.5 0.1 200)",
      ],
    ];
    for (const [change, note] of cases) {
      expect(
        measureContrast({ samples: [{ ...plainSample, ...change }] }, ""),
      ).toEqual({ contrast: null, contrast_note: note });
    }
  });
});

describe("findMainStyle", () => {
  it("picks the value that covers the most characters and says when values are mixed", () => {
    const runs = [
      { characters: 5, color: "black" },
      { characters: 30, color: "gray" },
    ];
    expect(findMainStyle(runs, (run) => run.color)).toEqual({
      value: "gray",
      mixed: true,
    });
    expect(findMainStyle(runs.slice(0, 1), (run) => run.color)).toEqual({
      value: "black",
      mixed: false,
    });
  });
});

describe("nameDrawnFont", () => {
  const base = {
    renderedFamily: "Source Serif 4",
    renderedIsCustom: true,
    declaredFamilies: ["Brand", "serif"],
    fontFamily: '"Brand", serif',
  };

  it("names a loaded web font by its @font-face name, with no note", () => {
    expect(nameDrawnFont(base, new Set(["brand"]))).toEqual({
      family: "Brand",
      note: null,
    });
  });

  it("notes a first declared family that is not drawn", () => {
    const fallback = {
      ...base,
      renderedFamily: "Georgia",
      renderedIsCustom: false,
      declaredFamilies: ["Missing", "Georgia", "serif"],
    };
    expect(nameDrawnFont(fallback, new Set())).toEqual({
      family: "Georgia",
      note: "first declared family Missing is not the one drawn",
    });
  });
});

describe("measureLines", () => {
  it("counts lines from character rectangles and leaves the short last line out of the mean", () => {
    const rects = [];
    for (let index = 0; index < 40; index++) {
      rects.push(characterOnLine(0));
    }
    for (let index = 0; index < 38; index++) {
      rects.push(characterOnLine(24));
    }
    for (let index = 0; index < 5; index++) {
      rects.push(characterOnLine(48));
    }
    expect(measureLines(rects)).toEqual({ lines: 3, charactersPerLine: 39 });
  });

  it("keeps a taller inline character on its line", () => {
    const rects = [
      characterOnLine(0),
      { top: -4, bottom: 28 },
      characterOnLine(0),
    ];
    expect(measureLines(rects)).toEqual({ lines: 1, charactersPerLine: 3 });
  });

  it("gives no characters per line when nothing is drawn", () => {
    expect(measureLines([])).toEqual({ lines: 0, charactersPerLine: null });
  });
});

describe("clusterValues", () => {
  it("joins values within 1 px into one edge named by the smallest", () => {
    expect(clusterValues([40, 41, 120, 40, 200], 1)).toEqual([
      { value: 40, count: 3 },
      { value: 120, count: 1 },
      { value: 200, count: 1 },
    ]);
  });
});

describe("planScreenCrops", () => {
  it("gives one crop for a page no taller than the screen", () => {
    expect(planScreenCrops(1280, 800, 800)).toEqual([
      { x: 0, y: 0, width: 1280, height: 800 },
    ]);
  });

  it("gives screen-tall crops through crop.mjs's splitLength, the last one stretched to the bottom", () => {
    expect(planScreenCrops(390, 2000, 844)).toEqual([
      { x: 0, y: 0, width: 390, height: 844 },
      { x: 0, y: 760, width: 390, height: 844 },
      { x: 0, y: 1156, width: 390, height: 844 },
    ]);
    expect(planScreenCrops(390, 1900, 844)).toEqual([
      { x: 0, y: 0, width: 390, height: 844 },
      { x: 0, y: 760, width: 390, height: 1140 },
    ]);
  });
});

describe("facts.json", () => {
  const validate = compileFactsValidator();
  const sample = readJson("evals/measure/known-values.facts.json");

  it("the committed samples of both pages validate against schemas/facts.schema.json", () => {
    for (const path of [
      "evals/measure/known-values.facts.json",
      "evals/measure/hard-cases.facts.json",
    ]) {
      const valid = validate(readJson(path));
      expect(validate.errors ?? []).toEqual([]);
      expect(valid).toBe(true);
    }
  });

  it("the schema rejects a file without its version or with an unknown field", () => {
    if (typeof sample !== "object" || sample === null) {
      throw new Error("the sample is not an object");
    }
    const { version: _version, ...withoutVersion } = sample as Record<
      string,
      unknown
    >;
    expect(validate(withoutVersion)).toBe(false);
    expect(validate({ ...sample, extra: true })).toBe(false);
  });

  it("the sample holds the known values of the page", () => {
    const text = readFileSync(
      join(repositoryRoot, "evals/measure/known-values.facts.json"),
      "utf8",
    );
    expect(text).toBe(`${formatFactsJson(JSON.parse(text))}\n`);
    const body = JSON.parse(text).viewports[0].text_blocks.find(
      (block: { selector: string }) => block.selector === "#body",
    );
    expect(body.font_size).toBe(16);
    expect(Math.abs(body.characters_per_line - 40)).toBeLessThanOrEqual(2);
    expect(body.contrast).toBe(21);
  });
});

describe("runMeasure", () => {
  it("prints the usage line and exits 2 for a wrong command line", async () => {
    const result = await runMeasure([], repositoryRoot);
    expect(result.exitCode).toBe(EXIT_USAGE);
    expect(result.lines).toHaveLength(1);
  });

  it("refuses a file that does not exist with one line and exit code 3", async () => {
    const result = await runMeasure(
      [
        "evals/measure/no-such-page.html",
        "--out",
        "/nonexistent-folder-for-test/x",
      ],
      repositoryRoot,
    );
    expect(result.exitCode).toBe(3);
    expect(result.lines).toEqual([
      "cannot measure: the file evals/measure/no-such-page.html does not exist",
    ]);
  });
});
