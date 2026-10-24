// Disposable unit tests (CS-22) for the JSON renderer (FR-31, CS-18). The durable schema and
// golden-output checks that run the real CLI belong to crit-cy8.14.

import { readFileSync } from "node:fs";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, test } from "vitest";
import { prdExampleReport } from "./prd-example-report.fixture.js";
import { renderReportJson } from "./render-json.js";

const schemaText = readFileSync(
  new URL("../../schemas/report.schema.json", import.meta.url),
  "utf8",
);
// JSON.parse returns the type "any", which TypeScript lets us store as "object" without a cast.
const schema: object = JSON.parse(schemaText);
const ajv = new Ajv2020({ allErrors: true, strict: true });
const validateReport = ajv.compile(schema);

describe("renderReportJson", () => {
  test("writes a document that matches schemas/report.schema.json", () => {
    const parsed: unknown = JSON.parse(renderReportJson(prdExampleReport));
    expect(validateReport(parsed), JSON.stringify(validateReport.errors)).toBe(
      true,
    );
  });

  test("parses back to a value equal to the input, numbers unrounded", () => {
    const parsed: unknown = JSON.parse(renderReportJson(prdExampleReport));
    expect(parsed).toEqual(prdExampleReport);
    expect(renderReportJson(prdExampleReport)).toContain('"cost_usd": 0.0017');
    expect(renderReportJson(prdExampleReport)).toContain('"true": 0.84');
  });

  test("keeps the key order of the input", () => {
    const parsed: object = JSON.parse(renderReportJson(prdExampleReport));
    expect(Object.keys(parsed)).toEqual(Object.keys(prdExampleReport));
  });

  test("indents by two spaces and ends with one newline", () => {
    const output = renderReportJson(prdExampleReport);
    expect(output.startsWith('{\n  "schema_version": "1.0.0",')).toBe(true);
    expect(output.endsWith("}\n")).toBe(true);
    expect(output.endsWith("\n\n")).toBe(false);
  });

  test("gives the same text for the same report", () => {
    expect(renderReportJson(prdExampleReport)).toBe(
      renderReportJson(prdExampleReport),
    );
  });
});
