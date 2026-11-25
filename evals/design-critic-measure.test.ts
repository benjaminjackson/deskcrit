import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import {
  clusterValues,
  colorsDiffer,
  compositeColor,
  contrastRatio,
  darkViewportName,
  dropMovingColors,
  EXIT_CANNOT_MEASURE,
  EXIT_TOOL_MISSING,
  EXIT_USAGE,
  findCheckoutPacksAnchor,
  findMainStyle,
  findViolations,
  formatFactsJson,
  guardDarkMode,
  isLargeText,
  isThemeControlName,
  measureContrast,
  measureLines,
  nameDrawnFont,
  nameFromAriaSnapshot,
  parseCssColor,
  planScreenCrops,
  readCommandLine,
  resolveBackground,
  runMeasure,
  shiftRawToSlide,
  slideIdOf,
  summarizeDarkMode,
  toPageUrl,
  VIEWPORTS,
  widthViewports,
  withoutHash,
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
    expect(measureLines(rects)).toEqual({
      lines: 3,
      charactersPerLine: 39,
      shortLastLine: null,
    });
  });

  it("keeps a taller inline character on its line", () => {
    const rects = [
      characterOnLine(0),
      { top: -4, bottom: 28 },
      characterOnLine(0),
    ];
    expect(measureLines(rects)).toEqual({
      lines: 1,
      charactersPerLine: 3,
      shortLastLine: null,
    });
  });

  it("gives no characters per line when nothing is drawn", () => {
    expect(measureLines([])).toEqual({
      lines: 0,
      charactersPerLine: null,
      shortLastLine: null,
    });
  });

  /**
   * Returns one rectangle per character of `text` on the line at `top`, with each space marked.
   * With `breakBefore`, a forced line break comes before the first character.
   */
  function wordsOnLine(
    top: number,
    text: string,
    options: { breakBefore?: boolean } = {},
  ) {
    const rects = [];
    for (let index = 0; index < text.length; index++) {
      rects.push({
        top,
        bottom: top + 24,
        space: (text[index] ?? "").trim() === "",
        breakBefore: index === 0 && options.breakBefore === true,
      });
    }
    return rects;
  }

  /** Returns the shortLastLine that measureLines gives for the drawn lines. */
  function shortLastLineOf(lines: ReturnType<typeof wordsOnLine>[]) {
    return measureLines(lines.flat()).shortLastLine;
  }

  it("reports one word alone on the last line under a line of two words or more (FR-79, crit-y75)", () => {
    expect(
      shortLastLineOf([wordsOnLine(0, "ab cd ef "), wordsOnLine(24, "gh.")]),
    ).toBe(1);
    // A non-breaking space separates words too.
    expect(
      shortLastLineOf([wordsOnLine(0, "ab\u00a0cd"), wordsOnLine(24, "gh.")]),
    ).toBe(1);
  });

  it("counts a word after a source newline the browser drew as a space (crit-y75)", () => {
    const lastLine = wordsOnLine(24, "andmore.");
    // The source reads "and\nmore."; the skipped newline marks "m" as the start of a word.
    const firstOfSecondWord = lastLine[3];
    if (firstOfSecondWord !== undefined) {
      Object.assign(firstOfSecondWord, { spaceBefore: true });
    }
    expect(shortLastLineOf([wordsOnLine(0, "ab cd ef "), lastLine])).toBeNull();
  });

  it("reports no short last line for two words, one line, a forced break, or one word above", () => {
    expect(
      shortLastLineOf([wordsOnLine(0, "ab cd ef "), wordsOnLine(24, "gh ij")]),
    ).toBeNull();
    expect(
      shortLastLineOf([wordsOnLine(0, "ab cd ef "), wordsOnLine(24, "gh ij.")]),
    ).toBeNull();
    expect(shortLastLineOf([wordsOnLine(0, "gh")])).toBeNull();
    expect(
      shortLastLineOf([
        wordsOnLine(0, "ab cd ef"),
        wordsOnLine(24, "gh.", { breakBefore: true }),
      ]),
    ).toBeNull();
    expect(
      shortLastLineOf([wordsOnLine(0, "abcdef"), wordsOnLine(24, "gh.")]),
    ).toBeNull();
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

  it("the committed samples of every page validate against schemas/facts.schema.json", () => {
    for (const path of [
      "evals/measure/known-values.facts.json",
      "evals/measure/hard-cases.facts.json",
      "evals/measure/dark-media.facts.json",
      "evals/measure/dark-toggle.facts.json",
    ]) {
      const valid = validate(readJson(path));
      expect(validate.errors ?? []).toEqual([]);
      expect(valid).toBe(true);
    }
  });

  it("the schema accepts the default viewport names and w<N>, and rejects any other name", () => {
    /** Returns whether the sample validates with its first viewport renamed. */
    function validatesWithName(name: string): boolean {
      // JSON.parse returns `any`, so the copy can be changed without a cast.
      const copy = JSON.parse(
        readFileSync(
          join(repositoryRoot, "evals/measure/known-values.facts.json"),
          "utf8",
        ),
      );
      copy.viewports[0].name = name;
      return validate(copy);
    }
    for (const name of [
      "desktop",
      "phone",
      "tablet",
      "widescreen",
      "w768",
      "w3840",
      "desktop-dark",
      "widescreen-dark",
      "w768-dark",
    ]) {
      expect(validatesWithName(name), name).toBe(true);
    }
    for (const name of [
      "mobile",
      "wide",
      "w",
      "w12a",
      "W768",
      "w0768",
      "mobile-dark",
      "desktop-dim",
      "dark",
    ]) {
      expect(validatesWithName(name), name).toBe(false);
    }
  });

  it("the schema accepts the rule short-last-line and rejects a rule it does not name (crit-y75)", () => {
    /** Returns whether the sample validates with its first violation given another rule. */
    function validatesWithRule(rule: string): boolean {
      // JSON.parse returns `any`, so the copy can be changed without a cast.
      const copy = JSON.parse(
        readFileSync(
          join(repositoryRoot, "evals/measure/known-values.facts.json"),
          "utf8",
        ),
      );
      copy.viewports[0].violations[0].rule = rule;
      return validate(copy);
    }
    expect(validatesWithRule("short-last-line")).toBe(true);
    expect(validatesWithRule("widow")).toBe(false);
  });

  it("the schema checks the dark-mode fields that --dark writes", () => {
    /** Returns a fresh copy of the dark-toggle sample, which JSON.parse gives as `any`. */
    function darkSample() {
      return JSON.parse(
        readFileSync(
          join(repositoryRoot, "evals/measure/dark-toggle.facts.json"),
          "utf8",
        ),
      );
    }
    const withDim = darkSample();
    withDim.viewports[1].color_scheme = "dim";
    expect(validate(withDim)).toBe(false);
    const withExtraKey = darkSample();
    withExtraKey.dark_mode.reason = "extra";
    expect(validate(withExtraKey)).toBe(false);
    const withMaybe = darkSample();
    withMaybe.dark_mode = { found_by: "maybe" };
    expect(validate(withMaybe)).toBe(false);
    const withNone = darkSample();
    withNone.dark_mode = { found_by: "none" };
    expect(validate(withNone)).toBe(true);
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

describe("viewports", () => {
  it("renders four default viewports, desktop first", () => {
    expect(VIEWPORTS).toEqual([
      { name: "desktop", width: 1280, height: 800 },
      { name: "phone", width: 390, height: 844 },
      { name: "tablet", width: 768, height: 1024 },
      { name: "widescreen", width: 1920, height: 1080 },
    ]);
  });

  it("makes one 800 px tall viewport per --width item, in the order given", () => {
    expect(widthViewports("768,1024")).toEqual([
      { name: "w768", width: 768, height: 800 },
      { name: "w1024", width: 1024, height: 800 },
    ]);
    expect(widthViewports("200,3840")).toHaveLength(2);
  });
});

describe("dark mode", () => {
  it("names a theme control only by the whole words dark, light, theme, or appearance", () => {
    for (const name of [
      "Dark mode",
      "Toggle theme",
      "Appearance",
      "Switch to light",
    ]) {
      expect(isThemeControlName(name), name).toBe(true);
    }
    for (const name of ["Highlights", "Lightbox", "Flight", "Darkroom"]) {
      expect(isThemeControlName(name), name).toBe(false);
    }
  });

  it("finds a difference only in a value both color probes hold", () => {
    const light = { "body color": "rgb(0, 0, 0)", "#gone color": null };
    expect(
      colorsDiffer(light, {
        "body color": "rgb(0, 0, 0)",
        "#gone color": "rgb(1, 1, 1)",
      }),
    ).toBe(false);
    expect(
      colorsDiffer(light, {
        "body color": "rgb(255, 255, 255)",
        "#gone color": null,
      }),
    ).toBe(true);
    expect(
      colorsDiffer(
        { "img 0 currentSrc": "a.png" },
        { "img 0 currentSrc": "a-dark.png" },
      ),
    ).toBe(true);
  });

  it("reads a control's accessible name from its ARIA snapshot", () => {
    expect(nameFromAriaSnapshot('- button "Dark mode"')).toBe("Dark mode");
    expect(nameFromAriaSnapshot('- switch "Night \\"dark\\" theme"')).toBe(
      'Night "dark" theme',
    );
    expect(
      nameFromAriaSnapshot(
        '- checkbox "Use dark appearance"\n- text: Use dark appearance',
      ),
    ).toBe("Use dark appearance");
    expect(nameFromAriaSnapshot("- text: Light")).toBe("Light");
    expect(nameFromAriaSnapshot("")).toBeNull();
  });

  it("turns a failed dark-mode check into no dark mode with the reason", async () => {
    const failed = await guardDarkMode("desktop", async () => {
      throw new Error("locator.click: Timeout 2000ms exceeded.\nCall log:");
    });
    expect(failed).toEqual({
      result: {
        name: "desktop",
        foundBy: "none",
        reason:
          "the dark-mode check failed: locator.click: Timeout 2000ms exceeded.",
      },
      measured: null,
      finalUrl: null,
      failed: true,
    });
    const found = await guardDarkMode("phone", async () => ({
      result: { name: "phone", foundBy: "system_setting" },
      measured: null,
      finalUrl: "file:///page.html",
    }));
    expect(found.failed).toBe(false);
    expect(found.result.foundBy).toBe("system_setting");
  });

  it("drops the colors that changed between two light reads", () => {
    const first = {
      "body background-color": "rgb(255, 255, 255)",
      "button background-color": "rgb(0, 85, 204)",
      "#gone color": null,
    };
    const second = {
      "body background-color": "rgb(255, 255, 255)",
      "button background-color": "rgb(40, 120, 240)",
      "#gone color": null,
    };
    expect(dropMovingColors(first, second)).toEqual({
      "body background-color": "rgb(255, 255, 255)",
      "#gone color": null,
    });
    // The moving button alone no longer reads as a dark mode.
    const dark = { ...first, "button background-color": "rgb(51, 136, 255)" };
    expect(colorsDiffer(dropMovingColors(first, second), dark)).toBe(false);
    expect(colorsDiffer(first, dark)).toBe(true);
  });

  it("names a dark entry <name>-dark", () => {
    expect(darkViewportName("desktop")).toBe("desktop-dark");
    expect(darkViewportName("w768")).toBe("w768-dark");
  });

  it("puts the system setting over a toggle, and a toggle over none", () => {
    const control = { name: "Dark mode", selector: "#theme" };
    expect(
      summarizeDarkMode([
        { name: "desktop", foundBy: "toggle", control },
        { name: "phone", foundBy: "system_setting" },
      ]).darkMode,
    ).toEqual({ found_by: "system_setting" });
    expect(
      summarizeDarkMode([
        { name: "desktop", foundBy: "toggle", control },
        { name: "phone", foundBy: "none", reason: "no control is visible" },
      ]).darkMode,
    ).toEqual({ found_by: "toggle", control });
    const none = summarizeDarkMode([
      { name: "desktop", foundBy: "none", reason: "no change" },
      { name: "phone", foundBy: "none", reason: "no change" },
    ]);
    expect(none.darkMode).toEqual({ found_by: "none" });
    expect(none.notes).toEqual([
      "--dark: no dark mode was found, so no -dark entry is written: no change",
    ]);
    expect(none.viewportNotes.size).toBe(0);
  });

  it("gives a viewport without a dark entry a note when other viewports have one", () => {
    const summary = summarizeDarkMode([
      {
        name: "desktop",
        foundBy: "toggle",
        control: { name: "Dark mode", selector: "#theme" },
      },
      {
        name: "phone",
        foundBy: "none",
        reason: "the theme control is not visible",
      },
    ]);
    expect(summary.notes).toEqual([]);
    expect(summary.viewportNotes.get("phone")).toBe(
      "--dark: no dark entry for this viewport, though other viewports have one: the theme control is not visible",
    );
    expect(summary.viewportNotes.has("desktop")).toBe(false);
  });
});

describe("readCommandLine", () => {
  /** Returns the names of the viewports a command line picks, or null when it is wrong. */
  function pickedNames(flags: string[]): string[] | null {
    const commandLine = readCommandLine(["page.html", ...flags]);
    if (commandLine === null) {
      return null;
    }
    const names = [];
    for (const viewport of commandLine.viewportList) {
      names.push(viewport.name);
    }
    return names;
  }

  it("picks all four named viewports when no viewport flag is given", () => {
    expect(pickedNames([])).toEqual([
      "desktop",
      "phone",
      "tablet",
      "widescreen",
    ]);
    expect(pickedNames(["--out", "folder"])).toEqual([
      "desktop",
      "phone",
      "tablet",
      "widescreen",
    ]);
  });

  it("picks only the flagged viewports, in the default order", () => {
    expect(pickedNames(["--phone", "--widescreen"])).toEqual([
      "phone",
      "widescreen",
    ]);
    expect(pickedNames(["--tablet", "--out", "folder", "--desktop"])).toEqual([
      "desktop",
      "tablet",
    ]);
  });

  it("puts the named viewports before the --width ones", () => {
    expect(pickedNames(["--width", "1024,768", "--desktop"])).toEqual([
      "desktop",
      "w1024",
      "w768",
    ]);
    expect(pickedNames(["--width", "768"])).toEqual(["w768"]);
  });

  it("refuses a value that looks like a flag, an unknown flag, and two pages", () => {
    expect(readCommandLine(["page.html", "--out", "--phone"])).toBeNull();
    expect(readCommandLine(["page.html", "--wide"])).toBeNull();
    expect(readCommandLine(["page.html", "other.html"])).toBeNull();
    expect(readCommandLine(["--phone"])).toBeNull();
  });

  it("reads --dark anywhere on the line, and only once", () => {
    expect(readCommandLine(["page.html"])?.dark).toBe(false);
    expect(readCommandLine(["--dark", "page.html"])?.dark).toBe(true);
    expect(
      readCommandLine(["page.html", "--phone", "--dark", "--out", "f"])?.dark,
    ).toBe(true);
    expect(
      readCommandLine(["page.html", "--width", "768", "--dark"])?.dark,
    ).toBe(true);
    expect(readCommandLine(["page.html", "--dark", "--dark"])).toBeNull();
  });

  it("keeps the page and the output folder", () => {
    expect(
      readCommandLine(["page.html", "--phone", "--out", "folder"]),
    ).toMatchObject({
      pageArgument: "page.html",
      folderArgument: "folder",
    });
  });
});

describe("runMeasure", () => {
  it("prints the usage line and exits 2 for a wrong command line", async () => {
    const result = await runMeasure([], repositoryRoot);
    expect(result.exitCode).toBe(EXIT_USAGE);
    expect(result.lines).toHaveLength(1);
  });

  it.each(["0", "199", "3841", "12a", "768,768", "768,", "0768", ""])(
    "prints the usage line and exits 2 for --width %j",
    async (widths) => {
      const result = await runMeasure(
        ["evals/measure/known-values.html", "--width", widths],
        repositoryRoot,
      );
      expect(result.exitCode).toBe(EXIT_USAGE);
      expect(result.lines).toHaveLength(1);
      expect(result.lines[0]).toMatch(/^usage: /);
    },
  );

  it("prints the usage line and exits 2 for a flag given twice or without its value", async () => {
    for (const commandArguments of [
      ["evals/measure/known-values.html", "--phone", "--phone"],
      [
        "evals/measure/known-values.html",
        "--widescreen",
        "--tablet",
        "--widescreen",
      ],
      ["evals/measure/known-values.html", "--wide"],
      ["evals/measure/known-values.html", "--width", "768", "--width", "1024"],
      ["evals/measure/known-values.html", "--out", "a", "--out", "b"],
      ["evals/measure/known-values.html", "--width"],
    ]) {
      const result = await runMeasure(commandArguments, repositoryRoot);
      expect(result.exitCode).toBe(EXIT_USAGE);
      expect(result.lines).toHaveLength(1);
    }
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
    expect(result.exitCode).toBe(EXIT_CANNOT_MEASURE);
    expect(result.lines).toEqual([
      "cannot measure: the file evals/measure/no-such-page.html does not exist",
    ]);
  });

  it("exits 4 with one line that names the install commands when Playwright is missing", async () => {
    // A copy of the scripts in a new folder has no packs/ beside it, as in an installed plugin, and
    // the empty working folder has no project that holds playwright.
    const installFolder = mkdtempSync(join(tmpdir(), "measure-missing-tool-"));
    const scriptsCopy = join(
      installFolder,
      "plugin/skills/design-critic/scripts",
    );
    cpSync(
      join(repositoryRoot, "plugin/skills/design-critic/scripts"),
      scriptsCopy,
      { recursive: true },
    );
    const workingFolder = mkdtempSync(join(tmpdir(), "measure-empty-project-"));
    const pageFile = join(workingFolder, "page.html");
    writeFileSync(pageFile, "<p>x</p>");
    const copy = await import(join(scriptsCopy, "measure.mjs"));
    const result = await copy.runMeasure(
      [pageFile, "--out", join(workingFolder, "out")],
      workingFolder,
    );
    expect(result.exitCode).toBe(EXIT_TOOL_MISSING);
    expect(result.exitCode).toBe(4);
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0]).toMatch(/^cannot measure: /);
    expect(result.lines[0]).toContain("npm install --save-exact playwright@");
    expect(result.lines[0]).toContain("npx playwright install chromium");
  });

  it("names the Playwright version that packs/package.json pins", () => {
    const pinned = JSON.parse(
      readFileSync(join(repositoryRoot, "packs/package.json"), "utf8"),
    ).devDependencies.playwright;
    const script = readFileSync(
      join(repositoryRoot, "plugin/skills/design-critic/scripts/measure.mjs"),
      "utf8",
    );
    expect(script).toContain(`playwright@${pinned}`);
  });
});

describe("findViolations", () => {
  /** Returns a text block with the fields findViolations reads. */
  function block(
    selector: string,
    fields: {
      contrast?: number | null;
      fontSize?: number;
      fontWeight?: number;
      lines?: number;
      charactersPerLine?: number | null;
    },
  ) {
    return {
      selector,
      box: [0, 0, 100, 20],
      font_size: fields.fontSize ?? 16,
      font_weight: fields.fontWeight ?? 400,
      lines: fields.lines ?? 1,
      characters_per_line: fields.charactersPerLine ?? 20,
      contrast: fields.contrast ?? 21,
    };
  }

  /** Returns a target with a box [x, y, width, height]. */
  function target(selector: string, box: number[]) {
    return { selector, box };
  }

  /** Returns `rule selector value` for each violation, so a test reads in one line. */
  function names(
    violations: { rule: string; selector: string; value: number }[],
  ) {
    return violations.map(
      (violation) =>
        `${violation.rule} ${violation.selector} ${violation.value}`,
    );
  }

  it("counts 24 px, and 18.66 px at weight 700, as large text, and nothing smaller", () => {
    expect(isLargeText(24, 400)).toBe(true);
    expect(isLargeText(18.66, 700)).toBe(true);
    expect(isLargeText(18.66, 400)).toBe(false);
    expect(isLargeText(23.9, 600)).toBe(false);
  });

  it("flags normal text under 4.5 and large text under 3, and passes the limits themselves", () => {
    const blocks = [
      block("#normal-low", { contrast: 4.49 }),
      block("#normal-at", { contrast: 4.5 }),
      block("#large-between", { contrast: 3.6, fontSize: 24 }),
      block("#large-low", { contrast: 2.9, fontSize: 24 }),
      block("#unmeasured", { contrast: null }),
    ];
    const found = findViolations(
      blocks,
      blocks.map(() => null),
      [],
      [],
    );
    expect(names(found)).toEqual([
      "text-contrast #normal-low 4.49",
      "large-text-contrast #large-low 2.9",
    ]);
    expect(found[0]).toMatchObject({
      guideline: "Text contrast (minimum)",
      threshold: 4.5,
      box: [0, 0, 100, 20],
    });
  });

  it("leaves out text with an exemption", () => {
    const blocks = [
      block("#logo", { contrast: 1.9 }),
      block("#off", { contrast: 2 }),
    ];
    const found = findViolations(
      blocks,
      ["logo or image", "disabled control"],
      [],
      [],
    );
    expect(found).toEqual([]);
  });

  it("flags lines over 75 characters only in blocks of 3 or more lines", () => {
    const blocks = [
      block("#long", { lines: 3, charactersPerLine: 76 }),
      block("#at", { lines: 5, charactersPerLine: 75 }),
      block("#two-lines", { lines: 2, charactersPerLine: 120 }),
    ];
    const found = findViolations(
      blocks,
      blocks.map(() => null),
      [],
      [],
    );
    expect(names(found)).toEqual(["line-length #long 76"]);
  });

  it("flags a short last line, and leaves out a block with an exemption (FR-79, crit-y75)", () => {
    const blocks = [
      block("#widow", { lines: 2 }),
      block("#logo-widow", { lines: 2 }),
      block("#none", { lines: 2 }),
    ];
    const found = findViolations(
      blocks,
      [null, "logo or image", null],
      [],
      [],
      [1, 1, null],
    );
    expect(names(found)).toEqual(["short-last-line #widow 1"]);
    expect(found[0]).toMatchObject({
      guideline: "Widows, orphans, and runts",
      threshold: 2,
    });
  });

  it("flags small targets whose 24 px circles touch, and passes one with room or an exemption", () => {
    const targets = [
      target("#a", [0, 0, 16, 16]),
      target("#b", [18, 0, 16, 16]),
      target("#lone", [200, 200, 16, 16]),
      target("#big", [0, 100, 24, 24]),
      target("#near-big", [0, 125, 20, 20]),
      target("#inline", [300, 300, 30, 10]),
    ];
    const exemptions = [null, null, null, null, null, "inline link in text"];
    const found = findViolations([], [], targets, exemptions);
    expect(names(found)).toEqual([
      "target-size #a 16",
      "target-size #b 16",
      "target-size #near-big 20",
    ]);
    expect(found[0]).toMatchObject({
      guideline: "Target size (minimum)",
      threshold: 24,
    });
  });

  it("passes two small targets whose centers are exactly 24 px apart", () => {
    const targets = [
      target("#a", [0, 0, 20, 20]),
      target("#b", [24, 0, 20, 20]),
    ];
    expect(findViolations([], [], targets, [null, null])).toEqual([]);
  });
});

describe("toPageUrl (FR-82, crit-3wg)", () => {
  // A deck is one HTML file, and its hash picks the slide, so a local path keeps its hash.
  const folder = mkdtempSync(join(tmpdir(), "measure-page-url-"));
  const deckPath = join(folder, "deck.html");
  writeFileSync(deckPath, "<!doctype html><title>deck</title>");

  it("adds the hash of a local path to the file URL", () => {
    expect(toPageUrl(`${deckPath}#3`)).toBe(
      `${pathToFileURL(deckPath).href}#3`,
    );
  });

  it("leaves a local path with no hash as before", () => {
    expect(toPageUrl(deckPath)).toBe(pathToFileURL(deckPath).href);
  });

  it("leaves an http URL with a hash as given", () => {
    expect(toPageUrl("https://example.com/deck#3")).toBe(
      "https://example.com/deck#3",
    );
  });

  it("opens a file whose name holds # as that file", () => {
    const oddPath = join(folder, "odd#name.html");
    writeFileSync(oddPath, "<!doctype html><title>odd</title>");
    expect(toPageUrl(oddPath)).toBe(pathToFileURL(oddPath).href);
  });

  it("refuses a path whose file does not exist, with or without a hash", () => {
    expect(() => toPageUrl(join(folder, "missing.html#2"))).toThrow(
      "does not exist",
    );
  });
});

describe("findCheckoutPacksAnchor", () => {
  /** Makes plugin/skills/design-critic/scripts/ under a new temp folder and returns both paths. */
  function makeScriptFolder(): { root: string; scriptFolder: string } {
    const root = mkdtempSync(join(tmpdir(), "measure-checkout-"));
    const scriptFolder = join(
      root,
      "plugin",
      "skills",
      "design-critic",
      "scripts",
    );
    mkdirSync(scriptFolder, { recursive: true });
    return { root, scriptFolder };
  }

  it("names packs/package.json when GUIDELINES.md and packs/package.json are at the root", () => {
    const { root, scriptFolder } = makeScriptFolder();
    writeFileSync(join(root, "GUIDELINES.md"), "# Guidelines\n");
    mkdirSync(join(root, "packs"));
    writeFileSync(join(root, "packs", "package.json"), "{}\n");
    expect(findCheckoutPacksAnchor(scriptFolder)).toBe(
      join(root, "packs", "package.json"),
    );
  });

  it("returns null for an installed copy with packs/package.json but no GUIDELINES.md above it", () => {
    const { root, scriptFolder } = makeScriptFolder();
    mkdirSync(join(root, "packs"));
    writeFileSync(join(root, "packs", "package.json"), "{}\n");
    expect(findCheckoutPacksAnchor(scriptFolder)).toBeNull();
  });

  it("returns null when GUIDELINES.md is at the root but packs/package.json is not", () => {
    const { root, scriptFolder } = makeScriptFolder();
    writeFileSync(join(root, "GUIDELINES.md"), "# Guidelines\n");
    expect(findCheckoutPacksAnchor(scriptFolder)).toBeNull();
  });
});

describe("measure.mjs in a copy of the plugin", () => {
  /** The message the stub Playwright throws when the script asks it to start Chromium. */
  const STUB_MESSAGE = "stub playwright above the copy";

  /**
   * Copies the design-critic scripts into a new temp folder, and puts packs/package.json and a
   * stub playwright package in packs/node_modules/ of that folder, above the copy. It returns the
   * folder, the copied script, and a separate working folder that holds a page.
   */
  function makeCopyWithPacksAbove(): {
    root: string;
    script: string;
    workingFolder: string;
  } {
    const root = mkdtempSync(join(tmpdir(), "measure-copy-"));
    const scriptFolder = join(
      root,
      "plugin",
      "skills",
      "design-critic",
      "scripts",
    );
    cpSync(
      join(repositoryRoot, "plugin", "skills", "design-critic", "scripts"),
      scriptFolder,
      { recursive: true },
    );
    const stubFolder = join(root, "packs", "node_modules", "playwright");
    mkdirSync(stubFolder, { recursive: true });
    writeFileSync(join(root, "packs", "package.json"), "{}\n");
    writeFileSync(
      join(stubFolder, "package.json"),
      '{ "name": "playwright", "main": "index.js" }\n',
    );
    // The stub fails at once when the script starts Chromium, so its message shows that the
    // script loaded it.
    writeFileSync(
      join(stubFolder, "index.js"),
      `module.exports = { chromium: { launch: async () => { throw new Error(${JSON.stringify(STUB_MESSAGE)}); } } };\n`,
    );
    const workingFolder = mkdtempSync(join(tmpdir(), "measure-work-"));
    writeFileSync(join(workingFolder, "page.html"), "<p>Hello</p>\n");
    return {
      root,
      script: join(scriptFolder, "measure.mjs"),
      workingFolder,
    };
  }

  /** Runs the copied script on page.html in the working folder and returns its exit code and output. */
  function runCopiedScript(
    script: string,
    workingFolder: string,
  ): { exitCode: number | null; output: string } {
    const result = spawnSync(
      process.execPath,
      [script, "page.html", "--out", join(workingFolder, "out"), "--desktop"],
      { cwd: workingFolder, encoding: "utf8" },
    );
    return { exitCode: result.status, output: result.stdout + result.stderr };
  }

  it("loads no Playwright from packs/ above the copy when no GUIDELINES.md is there", () => {
    const { script, workingFolder } = makeCopyWithPacksAbove();
    const result = runCopiedScript(script, workingFolder);
    expect(result.exitCode).toBe(EXIT_TOOL_MISSING);
    expect(result.output).toContain("Playwright is not installed");
    expect(result.output).not.toContain(STUB_MESSAGE);
  });

  it("loads the Playwright in packs/ when GUIDELINES.md marks a deskcrit checkout", () => {
    const { root, script, workingFolder } = makeCopyWithPacksAbove();
    writeFileSync(join(root, "GUIDELINES.md"), "# Guidelines\n");
    const result = runCopiedScript(script, workingFolder);
    expect(result.output).toContain(STUB_MESSAGE);
  });
});

describe("the slide a hash picks (FR-79, FR-82, crit-3wg)", () => {
  it("reads the slide id from the hash of a file URL", () => {
    expect(slideIdOf("file:///tmp/deck.html#3")).toBe("3");
    expect(slideIdOf("file:///tmp/deck.html#slide%20two")).toBe("slide two");
  });

  it("gives no slide id for an http URL or a file URL with no hash", () => {
    expect(slideIdOf("https://example.com/deck#3")).toBe(null);
    expect(slideIdOf("file:///tmp/deck.html")).toBe(null);
    expect(slideIdOf("file:///tmp/deck.html#")).toBe(null);
  });

  it("compares URLs without their hash", () => {
    expect(withoutHash("file:///tmp/deck.html#3")).toBe(
      "file:///tmp/deck.html",
    );
    expect(withoutHash("https://example.com/a")).toBe("https://example.com/a");
  });

  it("moves boxes and left edges into the pixels of the clipped screenshot", () => {
    const raw = {
      blocks: [
        { box: { x: 160, y: 960, width: 1040, height: 60 }, textLeft: 160 },
        { box: { x: 40, y: 40, width: 10, height: 10 }, textLeft: null },
      ],
      targets: [{ box: { x: 200, y: 1500, width: 120, height: 40 } }],
      pageWidth: 1360,
      pageHeight: 2480,
    };
    shiftRawToSlide(raw, { x: 40, y: 840, width: 1280, height: 800 });
    expect(raw.blocks[0]?.box).toEqual({
      x: 120,
      y: 120,
      width: 1040,
      height: 60,
    });
    expect(raw.blocks[0]?.textLeft).toBe(120);
    expect(raw.blocks[1]?.textLeft).toBe(null);
    expect(raw.targets[0]?.box).toEqual({
      x: 160,
      y: 660,
      width: 120,
      height: 40,
    });
    expect([raw.pageWidth, raw.pageHeight]).toEqual([1280, 800]);
  });
});
