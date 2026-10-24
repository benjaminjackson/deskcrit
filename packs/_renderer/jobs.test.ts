import { expect, test } from "vitest";
import {
  buildRenderJobs,
  checkFixtureSize,
  formatAttributionEntry,
  listCriterionIds,
  listSourcePaths,
  MAXIMUM_FIXTURE_BYTES,
  parseTemplateViewport,
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

const PHONE_TEMPLATE_PATH = "pack/templates/phone-rule.html";

/** Wraps a head fragment in a minimal template page. */
function templateWithHead(headHtml: string): string {
  return `<!doctype html><html><head>${headHtml}</head><body></body></html>`;
}

test("gives a template with no crit-viewport tag the default 1280x800 viewport", () => {
  const viewport = parseTemplateViewport(
    templateWithHead('<meta charset="utf-8">'),
    PHONE_TEMPLATE_PATH,
  );
  expect(viewport).toEqual({ width: 1280, height: 800 });
});

test("reads a 390x844 viewport from the crit-viewport tag", () => {
  const viewport = parseTemplateViewport(
    templateWithHead('<meta name="crit-viewport" content="390x844">'),
    PHONE_TEMPLATE_PATH,
  );
  expect(viewport).toEqual({ width: 390, height: 844 });
});

test("refuses a malformed, too small, too large, or repeated crit-viewport tag and names the template", () => {
  const badHeads = [
    '<meta name="crit-viewport" content="390 by 844">',
    '<meta name="crit-viewport" content="390x844.5">',
    '<meta name="crit-viewport" content="279x844">',
    '<meta name="crit-viewport" content="390x1569">',
    '<meta name="crit-viewport" content="390x844"><meta name="crit-viewport" content="390x844">',
  ];
  for (const badHead of badHeads) {
    expect(() =>
      parseTemplateViewport(templateWithHead(badHead), PHONE_TEMPLATE_PATH),
    ).toThrow(/pack\/templates\/phone-rule\.html/);
  }
});

test("gives both jobs of a pair the viewport that viewportFor returns", () => {
  const jobs = buildRenderJobs("pack", ["phone-rule"], () => ({
    width: 390,
    height: 844,
  }));
  expect(jobs).toHaveLength(2);
  expect(jobs[0]?.viewport).toEqual({ width: 390, height: 844 });
  expect(jobs[1]?.viewport).toEqual({ width: 390, height: 844 });
});

test("writes the template's own viewport in the attribution entry", () => {
  const record: RenderRecord = {
    fixture: "phone-rule.positive.png",
    template: PHONE_TEMPLATE_PATH,
    defect: "on",
    png_sha256: "0",
    source_sha256: {},
    viewport: { width: 390, height: 844 },
    device_scale_factor: 1,
    browser_version: "153.0.8010.12",
  };
  expect(formatAttributionEntry(record, "MIT")).toContain(
    "- Viewport: 390x844\n",
  );
});

test("ignores a crit-viewport tag inside an HTML comment", () => {
  const viewport = parseTemplateViewport(
    templateWithHead('<!-- <meta name="crit-viewport" content="390x844"> -->'),
    PHONE_TEMPLATE_PATH,
  );
  expect(viewport).toEqual({ width: 1280, height: 800 });
});

test("does not read data-name or data-content as the crit-viewport attributes", () => {
  const dataNameHead = '<meta data-name="crit-viewport" content="390x844">';
  expect(() =>
    parseTemplateViewport(templateWithHead(dataNameHead), PHONE_TEMPLATE_PATH),
  ).toThrow(/pack\/templates\/phone-rule\.html/);
  const dataContentHead = '<meta name="crit-viewport" data-content="390x844">';
  expect(() =>
    parseTemplateViewport(
      templateWithHead(dataContentHead),
      PHONE_TEMPLATE_PATH,
    ),
  ).toThrow(/pack\/templates\/phone-rule\.html/);
});

test("refuses a crit-viewport mention that is not a well-formed tag and names the template", () => {
  const unquotedHead = '<meta name=crit-viewport content="390x844">';
  expect(() =>
    parseTemplateViewport(templateWithHead(unquotedHead), PHONE_TEMPLATE_PATH),
  ).toThrow(/pack\/templates\/phone-rule\.html/);
});
