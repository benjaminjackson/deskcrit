import { expect, test } from "vitest";
import {
  buildRenderJobs,
  checkFixtureSize,
  formatAttributionEntry,
  listCriterionIds,
  listSourcePaths,
  MAXIMUM_FIXTURE_BYTES,
  type RenderRecord,
} from "./jobs.js";

test("finds only .html templates and sorts their ids by code unit, not by locale", () => {
  const criterionIds = listCriterionIds([
    "b-rule.html",
    "b-rule.css",
    "a-rule.html",
    "Z-rule.html",
    "notes.txt",
  ]);
  expect(criterionIds).toEqual(["Z-rule", "a-rule", "b-rule"]);
});

test("builds a positive and a negative job per template that differ only in the defect switch", () => {
  const jobs = buildRenderJobs("_example", ["example-contrast"]);
  expect(jobs).toHaveLength(2);
  expect(jobs[0]).toEqual({
    templatePath: "_example/templates/example-contrast.html",
    defect: "on",
    outputPath: "_example/fixtures/example-contrast.positive.png",
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  expect(jobs[1]?.defect).toBe("off");
  expect(jobs[1]?.outputPath).toBe(
    "_example/fixtures/example-contrast.negative.png",
  );
  expect(jobs[1]?.templatePath).toBe(jobs[0]?.templatePath);
});

test("keeps the fixture viewport inside the 280 to 1568 pixel image limit", () => {
  const job = buildRenderJobs("pack", ["rule"])[0];
  expect(job).toBeDefined();
  const longestSide =
    Math.max(job?.viewport.width ?? 0, job?.viewport.height ?? 0) *
    (job?.deviceScaleFactor ?? 0);
  const shortestSide =
    Math.min(job?.viewport.width ?? 0, job?.viewport.height ?? 0) *
    (job?.deviceScaleFactor ?? 0);
  expect(longestSide).toBeLessThanOrEqual(1568);
  expect(shortestSide).toBeGreaterThanOrEqual(280);
});

test("refuses a PNG over 2 MB and names the file", () => {
  expect(() =>
    checkFixtureSize(
      "pack/fixtures/big.positive.png",
      MAXIMUM_FIXTURE_BYTES + 1,
    ),
  ).toThrow(/pack\/fixtures\/big\.positive\.png/);
  expect(() =>
    checkFixtureSize("pack/fixtures/ok.positive.png", MAXIMUM_FIXTURE_BYTES),
  ).not.toThrow();
});

test("lists the template, its stylesheet when present, and the shared files, sorted", () => {
  const shared = ["_renderer/base.css", "_renderer/base.js"];
  expect(listSourcePaths("pack/templates/rule.html", true, shared)).toEqual([
    "_renderer/base.css",
    "_renderer/base.js",
    "pack/templates/rule.css",
    "pack/templates/rule.html",
  ]);
  expect(
    listSourcePaths("pack/templates/rule.html", false, shared),
  ).not.toContain("pack/templates/rule.css");
});

test("writes an attribution entry with every label in the documented order", () => {
  const record: RenderRecord = {
    fixture: "rule.positive.png",
    template: "pack/templates/rule.html",
    defect: "on",
    png_sha256: "0",
    source_sha256: {},
    viewport: { width: 1280, height: 800 },
    device_scale_factor: 1,
    browser_version: "153.0.8010.12",
  };
  expect(formatAttributionEntry(record, "MIT")).toBe(
    [
      "## rule.positive.png",
      "",
      "- Rights basis: own work licensed under the pack license",
      "- Source: packs/pack/templates/rule.html, defect=on",
      "- License: MIT",
      "- Attribution text: none",
      "- Source URL: not applicable",
      "- Capture date: not applicable",
      "- Viewport: 1280x800",
      "- Device scale factor: 1",
      "- Browser version: 153.0.8010.12",
      "",
    ].join("\n"),
  );
});
