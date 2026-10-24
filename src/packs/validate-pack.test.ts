// Disposable unit tests for the pure checks behind `crit packs validate` (FR-49, US-6, CS-22).

import { describe, expect, it } from "vitest";
import { validatePackText } from "./validate-pack.js";

/** One criterion's YAML, with the fixtures block given as already-indented lines. */
function writeCriterion(id: string, fixturesLines: string[]): string {
  const lines = [
    `  - id: ${id}`,
    "    title: Body text is too faint to read",
    "    source: Matthew Butterick, Practical Typography",
    "    question:",
    "      type: noul",
    "      instructions: Is the body text in the image at image faint?",
    "      criteria:",
    "        true: The body text is faint.",
    "        false: The body text is dark enough.",
    "    fail_when:",
    "      probability_at_least: 0.7",
    "    fix: Darken the body text.",
    ...fixturesLines,
  ];
  return lines.join("\n");
}

/** A pack's YAML text with the given criteria. */
function writePack(criteria: string[]): string {
  return [
    "name: test",
    "version: 1.0.0",
    "title: Test pack",
    "license: MIT",
    "criteria:",
    ...criteria,
    "",
  ].join("\n");
}

/** A fixtures block with one positive and one negative path. */
const bothFixtures = [
  "    fixtures:",
  "      positive:",
  "        - fixtures/a.positive.png",
  "      negative:",
  "        - fixtures/a.negative.png",
];

/** The files the CLI would find in a pack directory that holds both fixtures. */
const existingFiles = new Set([
  "pack.yaml",
  "fixtures/a.positive.png",
  "fixtures/a.negative.png",
]);

describe("validatePackText", () => {
  it("accepts a pack whose fixtures all exist", () => {
    const result = validatePackText(
      writePack([writeCriterion("faint", bothFixtures)]),
      existingFiles,
    );
    expect(result.phase).toBe("ok");
    expect(result.problems).toEqual([]);
    expect(result.pack?.name).toBe("test");
  });

  it("accepts ./ and repeated slashes in a fixture path", () => {
    const fixtures = [
      "    fixtures:",
      "      positive:",
      "        - ./fixtures//a.positive.png",
      "      negative:",
      "        - fixtures/./a.negative.png",
    ];
    const result = validatePackText(
      writePack([writeCriterion("faint", fixtures)]),
      existingFiles,
    );
    expect(result.phase).toBe("ok");
  });

  it("reports a criterion with no fixtures field twice, positive first", () => {
    const result = validatePackText(
      writePack([writeCriterion("faint", [])]),
      existingFiles,
    );
    expect(result.phase).toBe("fixtures");
    expect(result.problems.map((problem) => problem.field)).toEqual([
      "fixtures.positive",
      "fixtures.negative",
    ]);
    expect(result.problems[0]?.criterion).toBe("faint");
  });

  it("reports a criterion with only positives", () => {
    const fixtures = [
      "    fixtures:",
      "      positive:",
      "        - fixtures/a.positive.png",
    ];
    const result = validatePackText(
      writePack([writeCriterion("faint", fixtures)]),
      existingFiles,
    );
    expect(result.problems).toEqual([
      {
        criterion: "faint",
        field: "fixtures.negative",
        message:
          "the criterion has no negative fixture; crit packs validate needs at least one",
      },
    ]);
  });

  it("reports a criterion with only negatives, and an empty positive list", () => {
    const fixtures = [
      "    fixtures:",
      "      positive: []",
      "      negative:",
      "        - fixtures/a.negative.png",
    ];
    const result = validatePackText(
      writePack([writeCriterion("faint", fixtures)]),
      existingFiles,
    );
    expect(result.problems.map((problem) => problem.field)).toEqual([
      "fixtures.positive",
    ]);
  });

  it("reports a missing file and paths that leave the pack, in criterion order", () => {
    const outside = [
      "    fixtures:",
      "      positive:",
      "        - ../other/a.png",
      "        - /etc/passwd",
      "      negative:",
      "        - fixtures/missing.png",
    ];
    const result = validatePackText(
      writePack([
        writeCriterion("second", outside),
        writeCriterion("first", []),
      ]),
      existingFiles,
    );
    const summary = result.problems.map(
      (problem) => `${problem.criterion} ${problem.field}`,
    );
    expect(summary).toEqual([
      "second fixtures.positive.0",
      "second fixtures.positive.1",
      "second fixtures.negative.0",
      "first fixtures.positive",
      "first fixtures.negative",
    ]);
    expect(result.problems[0]?.message).toContain("leaves the pack directory");
    expect(result.problems[2]?.message).toBe(
      "fixtures/missing.png is not a file in the pack directory",
    );
  });

  it("returns the schema phase for an unknown field, and no fixture problems", () => {
    const result = validatePackText(
      writePack([writeCriterion("faint", ["    colour: red"])]),
      existingFiles,
    );
    expect(result.phase).toBe("schema");
    expect(result.pack).toBeUndefined();
    expect(
      result.problems.some((problem) => problem.field.includes("fixtures")),
    ).toBe(false);
  });

  it("reports a pack-level problem with no criterion id", () => {
    const text = writePack([writeCriterion("faint", bothFixtures)]).replace(
      "license: MIT\n",
      "",
    );
    const result = validatePackText(text, existingFiles);
    expect(result.phase).toBe("schema");
    expect(result.problems[0]?.criterion).toBeUndefined();
  });

  it("returns the yaml phase for a custom tag", () => {
    const text = writePack([writeCriterion("faint", bothFixtures)]).replace(
      "title: Test pack",
      "title: !foo Test pack",
    );
    expect(validatePackText(text, existingFiles).phase).toBe("yaml");
  });

  it("returns the yaml phase for a duplicate key", () => {
    const text = `name: a\n${writePack([writeCriterion("faint", bothFixtures)])}`;
    expect(validatePackText(text, existingFiles).phase).toBe("yaml");
  });
});
