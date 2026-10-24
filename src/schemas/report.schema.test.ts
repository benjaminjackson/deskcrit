import { readFileSync } from "node:fs";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

// A disposable unit test (CS-22) for schemas/report.schema.json. It sits in
// src/ because Vitest only runs src/**/*.test.ts. The durable EV-2 check that
// validates real CLI output against this schema belongs to crit-cy8.14.

const schemaText = readFileSync(
  new URL("../../schemas/report.schema.json", import.meta.url),
  "utf8",
);
// JSON.parse returns the type "any", which TypeScript lets us store as "object"
// without a cast. Ajv checks the shape itself in the first test.
const schema: object = JSON.parse(schemaText);

// The example from docs/PRD.md section 8.1, copied without changes.
// If the PRD example changes, change this copy in the same pull request.
const prdExampleReport = {
  schema_version: "1.0.0",
  mode: "report",
  tool: { name: "deskcrit", version: "0.1.0" },
  image: { path: "home.png", width: 1440, height: 900 },
  context: {
    purpose: "landing page",
    audience: "small business owners",
    platform: "web",
  },
  packs: [{ name: "typography", version: "1.0.0" }],
  model: "jev-1.14.0",
  findings: [
    {
      criterion: "typography/faint-body-text",
      title: "Body text reads as faint",
      verdict: "fail",
      distribution: { true: 0.84, false: 0.16 },
      confidence: null,
      region: { x: 120, y: 540, width: 620, height: 180 },
      source: "W3C, WCAG 2.2, Success Criterion 1.4.3 Contrast (Minimum)",
      link: "https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum",
      fix: "Darken the text or lighten the background. For the exact ratio, run axe-core; WCAG wants 4.5:1 for body text and 3:1 for large text.",
      model: "jev-1.14.0",
    },
    {
      criterion: "typography/single-focal-point",
      title: "One focal point",
      verdict: "warn",
      distribution: { "0": 0.22, "1": 0.63, "2": 0.15 },
      confidence: 0.72,
      region: { x: 80, y: 60, width: 1280, height: 320 },
      source: "Donis A. Dondis, A Primer of Visual Literacy (1973)",
      link: null,
      fix: "Pick the one thing the viewer must see first. Make it larger, higher-contrast, or more isolated, and demote the rest by one step in size or weight.",
      model: "jev-1.14.0",
    },
  ],
  skipped: [
    {
      criterion: "layout/reflow-at-320",
      reason:
        "requires facts.viewport_width, which the facts file does not have",
    },
  ],
  usage: {
    requests: 1,
    input_tokens: 41250,
    cost_usd: 0.0017,
    latency_ms: 1840,
  },
};

const findingFieldNames = [
  "criterion",
  "title",
  "verdict",
  "distribution",
  "confidence",
  "region",
  "source",
  "link",
  "fix",
  "model",
];

// allErrors reports every problem, not only the first. strict makes Ajv
// reject unknown keywords and other schema mistakes instead of ignoring them.
const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateReport = ajv.compile(schema);

/** Returns a deep copy of the PRD example, so each case can break its own copy. */
function copyExampleReport() {
  return structuredClone(prdExampleReport);
}

/** Returns the first finding of a report copy, failing the test if it has none. */
function firstFindingOf(
  report: ReturnType<typeof copyExampleReport>,
): Record<string, unknown> {
  const finding = report.findings[0];
  if (finding === undefined) {
    throw new Error("the example report has no findings");
  }
  return finding;
}

describe("schemas/report.schema.json", () => {
  it("is a valid draft 2020-12 schema", () => {
    expect(ajv.validateSchema(schema)).toBe(true);
  });

  it("accepts the PRD 8.1 example unchanged", () => {
    expect(validateReport(prdExampleReport)).toBe(true);
  });

  it("accepts image.padded set to true", () => {
    const report = copyExampleReport();
    const image = { ...report.image, padded: true };
    expect(validateReport({ ...report, image })).toBe(true);
  });

  it("rejects image.padded set to false", () => {
    const report = copyExampleReport();
    const image = { ...report.image, padded: false };
    expect(validateReport({ ...report, image })).toBe(false);
  });

  it("rejects a mode other than report", () => {
    for (const mode of ["compare", "gate"]) {
      const report = copyExampleReport();
      report.mode = mode;
      expect(validateReport(report)).toBe(false);
    }
  });

  it("rejects a document with any required top-level field missing", () => {
    const topLevelFieldNames = Object.keys(prdExampleReport);
    for (const fieldName of topLevelFieldNames) {
      const report: Record<string, unknown> = copyExampleReport();
      delete report[fieldName];
      expect(validateReport(report), fieldName).toBe(false);
    }
  });

  it("rejects a finding with any one of its ten fields missing", () => {
    for (const fieldName of findingFieldNames) {
      const report = copyExampleReport();
      const finding = firstFindingOf(report);
      delete finding[fieldName];
      expect(validateReport(report), fieldName).toBe(false);
    }
  });

  it("rejects a verdict outside pass, warn, fail, uncertain", () => {
    const report = copyExampleReport();
    firstFindingOf(report).verdict = "ok";
    expect(validateReport(report)).toBe(false);
  });

  it("rejects a confidence above 1", () => {
    const report = copyExampleReport();
    firstFindingOf(report).confidence = 1.2;
    expect(validateReport(report)).toBe(false);
  });

  it("rejects a distribution value above 1", () => {
    const report = copyExampleReport();
    firstFindingOf(report).distribution = { true: 1.5, false: 0 };
    expect(validateReport(report)).toBe(false);
  });

  it("rejects a region without all four of x, y, width, height", () => {
    const report = copyExampleReport();
    firstFindingOf(report).region = { x: 1 };
    expect(validateReport(report)).toBe(false);
  });

  it("accepts a null region, a null link, and a null confidence", () => {
    const report = copyExampleReport();
    const finding = firstFindingOf(report);
    finding.region = null;
    finding.link = null;
    finding.confidence = null;
    expect(validateReport(report)).toBe(true);
  });

  it("accepts empty findings and empty skipped", () => {
    const report = copyExampleReport();
    report.findings = [];
    report.skipped = [];
    expect(validateReport(report)).toBe(true);
  });

  it("accepts null input_tokens and cost_usd when the cost is unknown", () => {
    const report = copyExampleReport();
    const usage = { ...report.usage, input_tokens: null, cost_usd: null };
    expect(validateReport({ ...report, usage })).toBe(true);
  });

  it("rejects a negative cost_usd", () => {
    const report = copyExampleReport();
    const usage = { ...report.usage, cost_usd: -1 };
    expect(validateReport({ ...report, usage })).toBe(false);
  });

  it("rejects a model field inside usage", () => {
    const report = copyExampleReport();
    const usage = { ...report.usage, model: "jev-1.14.0" };
    expect(validateReport({ ...report, usage })).toBe(false);
  });

  it("rejects a schema_version that is not a semantic version", () => {
    const report = copyExampleReport();
    report.schema_version = "1.0";
    expect(validateReport(report)).toBe(false);
  });

  it("rejects an unknown top-level field", () => {
    const report = copyExampleReport();
    expect(validateReport({ ...report, extra: true })).toBe(false);
  });
});
