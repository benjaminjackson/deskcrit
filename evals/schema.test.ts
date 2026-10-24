// EV-2, the durable schema check for `crit report --json` (CS-21, AC-6). It runs every golden
// case that writes a report and validates the stdout it gets against schemas/report.schema.json
// with Ajv, a maintained validator (CS-3). A negative case proves the validator is applied. It
// imports nothing from src/.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import {
  isJsonCase,
  REPOSITORY_ROOT,
  readGoldenCases,
  runCrit,
} from "./support/run-crit.js";

// JSON.parse returns the type "any", which TypeScript lets us store as "object" without a cast.
const reportSchema: object = JSON.parse(
  readFileSync(join(REPOSITORY_ROOT, "schemas", "report.schema.json"), "utf8"),
);
const validateReport = new Ajv2020({ allErrors: true }).compile(reportSchema);

/** The golden cases that run with --json and exit 0, so their stdout is one report document. */
const reportCases = readGoldenCases().filter((goldenCase) => {
  if (!isJsonCase(goldenCase)) {
    return false;
  }
  const expectedExitCode = readFileSync(
    join(goldenCase.directory, "expected.exit-code"),
    "utf8",
  );
  return expectedExitCode.trim() === "0";
});

describe("EV-2: every report the golden cases write is valid", () => {
  it("has at least one report case to validate", () => {
    expect(reportCases.length).toBeGreaterThan(0);
  });

  for (const goldenCase of reportCases) {
    it(`${goldenCase.name}: stdout validates against schemas/report.schema.json (US-1)`, () => {
      const result = runCrit(goldenCase.arguments);
      expect(result.exitCode).toBe(0);
      const report: unknown = JSON.parse(result.stdout);
      const isValid = validateReport(report);
      expect(validateReport.errors ?? []).toEqual([]);
      expect(isValid).toBe(true);
    });
  }
});

describe("EV-2: the validator rejects a broken report", () => {
  it("fails a report with the required field schema_version removed", () => {
    const goldenCase = reportCases[0];
    if (goldenCase === undefined) {
      throw new Error("No report case to copy");
    }
    const report = JSON.parse(runCrit(goldenCase.arguments).stdout);
    expect(validateReport(report)).toBe(true);
    delete report.schema_version;
    expect(validateReport(report)).toBe(false);
  });

  it("fails a report with the required field verdict removed from a finding", () => {
    const goldenCase = reportCases[0];
    if (goldenCase === undefined) {
      throw new Error("No report case to copy");
    }
    const report = JSON.parse(runCrit(goldenCase.arguments).stdout);
    delete report.findings[0].verdict;
    expect(validateReport(report)).toBe(false);
  });
});
