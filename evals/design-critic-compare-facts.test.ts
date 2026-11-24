import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { runCompare } from "../plugin/skills/design-critic/scripts/compare-facts.mjs";

// Checks the script that compares measured facts files across the pages of a set (PRD FR-84).
// It uses small hand-written facts files, so it needs no browser.

const repositoryRoot = join(import.meta.dirname, "..");
const schema = JSON.parse(
  readFileSync(join(repositoryRoot, "schemas/facts-diff.schema.json"), "utf8"),
);
const validate = new Ajv2020({ strict: true, allowUnionTypes: true }).compile(
  schema,
);

/** A one-viewport facts file with one body block, one heading, and the given edge, width, size, color. */
function makeFacts(options: {
  edge: number;
  width: number;
  bodySize: number;
  bodyColor: string;
}) {
  return {
    viewports: [
      {
        name: "desktop",
        left_edges: [{ x: options.edge, blocks: 2 }],
        type_sizes: [
          { size: 32, blocks: 1, characters: 10 },
          { size: options.bodySize, blocks: 1, characters: 200 },
        ],
        text_colors: [
          {
            color: options.bodyColor,
            blocks: 2,
            characters: 210,
            example: "#body",
          },
        ],
        text_blocks: [
          {
            selector: "#title",
            box: [options.edge, 40, options.width, 40],
            font_size: 32,
            lines: 1,
            characters_per_line: 10,
          },
          {
            selector: "#body",
            box: [options.edge, 100, options.width, 96],
            font_size: options.bodySize,
            lines: 4,
            characters_per_line: 50,
          },
        ],
      },
    ],
  };
}

/** Writes the facts objects to files, runs the script, and returns the exit code and the output. */
function compare(factsList: object[], extraArguments: string[] = []) {
  const folder = mkdtempSync(join(tmpdir(), "compare-facts-"));
  const files = factsList.map((facts, index) => {
    const file = join(folder, `page-${index + 1}.facts.json`);
    writeFileSync(file, JSON.stringify(facts));
    return file;
  });
  const outFile = join(folder, "diff.json");
  const code = runCompare([...files, "--out", outFile, ...extraArguments]);
  const output = code === 0 ? JSON.parse(readFileSync(outFile, "utf8")) : null;
  return { code, output };
}

const base = { edge: 40, width: 600, bodySize: 16, bodyColor: "#222222" };

describe("compare-facts.mjs", () => {
  it("writes no difference for pages that share every value", () => {
    const { code, output } = compare([
      makeFacts(base),
      makeFacts(base),
      makeFacts(base),
    ]);
    expect(code).toBe(0);
    expect(validate(output)).toBe(true);
    expect(output.differences).toEqual([]);
  });

  it("names the page whose content left edge moved, with selector and box", () => {
    const { output } = compare([
      makeFacts(base),
      makeFacts(base),
      makeFacts({ ...base, edge: 72 }),
    ]);
    expect(validate(output)).toBe(true);
    const edge = output.differences.find(
      (difference: { kind: string }) => difference.kind === "left_edge",
    );
    expect(edge.pages.map((page: { value: number }) => page.value)).toEqual([
      40, 40, 72,
    ]);
    expect(edge.pages[2]).toMatchObject({
      page: 3,
      selector: "#title",
      box: [72, 40, 600, 40],
    });
  });

  it("reports a changed content width", () => {
    const { output } = compare([
      makeFacts(base),
      makeFacts({ ...base, width: 900 }),
    ]);
    const width = output.differences.find(
      (difference: { kind: string }) => difference.kind === "content_width",
    );
    expect(width.pages.map((page: { value: number }) => page.value)).toEqual([
      600, 900,
    ]);
    expect(width.pages[1].selector).toBe("#body");
  });

  it("reports a type size and a text color that one page does not share", () => {
    const { output } = compare([
      makeFacts(base),
      makeFacts({ ...base, bodySize: 14, bodyColor: "#777777" }),
    ]);
    expect(validate(output)).toBe(true);
    const kinds = output.differences.map(
      (difference: { kind: string }) => difference.kind,
    );
    expect(kinds).toContain("type_size");
    expect(kinds).toContain("text_color");
    const size = output.differences.find(
      (difference: { kind: string; what: string }) =>
        difference.kind === "type_size" && difference.what.includes("14"),
    );
    expect(size.pages[0].value).toBeNull();
    expect(size.pages[1].value).toBe(14);
  });

  it("exits 2 on bad input", () => {
    expect(runCompare([])).toBe(2);
    expect(runCompare(["only-one.json", "--out", "x.json"])).toBe(2);
    expect(
      runCompare(["missing-1.json", "missing-2.json", "--out", "x.json"]),
    ).toBe(2);
  });

  it("compares the committed measure facts files without error", () => {
    const known = join(repositoryRoot, "evals/measure/known-values.facts.json");
    const hard = join(repositoryRoot, "evals/measure/hard-cases.facts.json");
    const outFile = join(
      mkdtempSync(join(tmpdir(), "compare-facts-")),
      "diff.json",
    );
    expect(runCompare([known, hard, "--out", outFile])).toBe(0);
    expect(validate(JSON.parse(readFileSync(outFile, "utf8")))).toBe(true);
  });
});
