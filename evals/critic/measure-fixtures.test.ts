// Tests of the facts files for the detection sample (FR-79, EV-14). They read the committed files
// and run the pure functions of measure-fixtures.ts; no browser starts.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { factsPathFor, selectCriteria } from "./detect.ts";
import {
  findRenderedRecord,
  keepFixtureViewport,
  NEUTRAL_SOURCE,
} from "./measure-fixtures.ts";

const REPOSITORY_DIRECTORY = join(import.meta.dirname, "..", "..");

/** Compiles schemas/facts.schema.json with Ajv for draft 2020-12. */
function compileFactsValidator() {
  const ajv = new Ajv2020({ allErrors: true });
  return ajv.compile(
    JSON.parse(
      readFileSync(
        join(REPOSITORY_DIRECTORY, "schemas", "facts.schema.json"),
        "utf8",
      ),
    ),
  );
}

describe("the committed facts files", () => {
  it("exist for every image of the live detection sample, validate, and never name the fixture", () => {
    const validate = compileFactsValidator();
    const { selected } = selectCriteria(REPOSITORY_DIRECTORY, 1);
    let checked = 0;
    for (const entry of selected) {
      if (entry.criterion.group !== "live") {
        continue;
      }
      for (const scoredImage of entry.scored) {
        const factsPath = factsPathFor(REPOSITORY_DIRECTORY, scoredImage.image);
        expect(existsSync(factsPath), factsPath).toBe(true);
        const text = readFileSync(factsPath, "utf8");
        const facts = JSON.parse(text);
        expect(validate(facts), JSON.stringify(validate.errors)).toBe(true);
        expect(facts.source).toBe(NEUTRAL_SOURCE);
        expect(facts.viewports).toHaveLength(1);
        expect(text).not.toContain(entry.criterion.id);
        expect(text).not.toMatch(/positive|negative|defect|templates/);
        checked += 1;
      }
    }
    expect(checked).toBe(74);
  });
});

describe("findRenderedRecord", () => {
  it("returns the template, switch, and viewport of a fixture and throws on a missing one", () => {
    const list = [
      {
        fixture: "a.positive.png",
        template: "p/templates/a.html",
        defect: "on",
        viewport: { width: 390, height: 844 },
      },
    ];
    expect(findRenderedRecord(list, "a.positive.png")).toEqual({
      fixture: "a.positive.png",
      template: "p/templates/a.html",
      defect: "on",
      viewport: { width: 390, height: 844 },
    });
    expect(() => findRenderedRecord(list, "b.png")).toThrow(/no record/);
  });
});

describe("keepFixtureViewport", () => {
  const facts = {
    version: 1,
    source: "http://127.0.0.1:1/p/templates/a.html?defect=on",
    color_scheme: "light",
    notes: [],
    texts: { "#a": "desktop text", "#b": "phone text" },
    viewports: [
      {
        name: "desktop",
        width: 1280,
        height: 800,
        page_width: 1280,
        page_height: 812,
        text_blocks: [{ selector: "#a" }],
      },
      {
        name: "phone",
        width: 390,
        height: 844,
        page_width: 390,
        page_height: 844,
        text_blocks: [{ selector: "#b" }],
      },
    ],
  };

  it("keeps the fixture's viewport and its texts, hides the source, and notes a taller page", () => {
    const kept = keepFixtureViewport(facts, { width: 1280, height: 800 });
    expect(kept.source).toBe(NEUTRAL_SOURCE);
    expect(kept.texts).toEqual({ "#a": "desktop text" });
    expect(kept.viewports).toHaveLength(1);
    expect(kept.notes).toEqual([
      "the page is 812 px tall; the image shows its top 800 px",
    ]);
    const phone = keepFixtureViewport(facts, { width: 390, height: 844 });
    expect(phone.texts).toEqual({ "#b": "phone text" });
    expect(phone.notes).toEqual([]);
  });

  it("throws when no viewport has the fixture's size or the browser was redirected", () => {
    expect(() =>
      keepFixtureViewport(facts, { width: 800, height: 600 }),
    ).toThrow(/0 viewports/);
    expect(() =>
      keepFixtureViewport(
        { ...facts, final_url: "http://elsewhere/" },
        { width: 1280, height: 800 },
      ),
    ).toThrow(/redirected/);
  });
});
