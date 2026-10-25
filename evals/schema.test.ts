// EV-2, the durable schema check for `crit report --json`, `crit compare --json`, and `crit gate --json` (CS-21, AC-6).
// It runs every golden case that writes a report and validates the stdout it gets against
// schemas/report.schema.json, every golden case that writes a compare document against
// schemas/compare.schema.json, and every golden case that writes a gate document against
// schemas/gate.schema.json, with Ajv, a maintained validator (CS-3). Negative cases prove each
// validator is applied. It imports nothing from src/.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import {
  type GoldenCase,
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

// The gate schema refers to the report schema by the id report.schema.json, so Ajv loads the
// report schema under that id first.
const gateSchema: object = JSON.parse(
  readFileSync(join(REPOSITORY_ROOT, "schemas", "gate.schema.json"), "utf8"),
);
const gateAjv = new Ajv2020({ allErrors: true });
gateAjv.addSchema(reportSchema, "report.schema.json");
const validateGate = gateAjv.compile(gateSchema);

// The compare schema refers to the report schema by the same id, so it gets its own Ajv with the
// report schema loaded first, as the gate schema does.
const compareSchema: object = JSON.parse(
  readFileSync(join(REPOSITORY_ROOT, "schemas", "compare.schema.json"), "utf8"),
);
const compareAjv = new Ajv2020({ allErrors: true });
compareAjv.addSchema(reportSchema, "report.schema.json");
const validateCompare = compareAjv.compile(compareSchema);

/** Read the stored exit code of one golden case, as text without the newline. */
function readExpectedExitCode(goldenCase: GoldenCase): string {
  return readFileSync(
    join(goldenCase.directory, "expected.exit-code"),
    "utf8",
  ).trim();
}

/** The `crit report` golden cases that run with --json and exit 0, so their stdout is one report document. */
const reportCases = readGoldenCases().filter((goldenCase) => {
  if (goldenCase.arguments[0] !== "report" || !isJsonCase(goldenCase)) {
    return false;
  }
  return readExpectedExitCode(goldenCase) === "0";
});

/** The `crit gate` golden cases that run with --json and exit 0 or 1, so their stdout is one gate document. */
const gateCases = readGoldenCases().filter((goldenCase) => {
  if (goldenCase.arguments[0] !== "gate" || !isJsonCase(goldenCase)) {
    return false;
  }
  const exitCode = readExpectedExitCode(goldenCase);
  return exitCode === "0" || exitCode === "1";
});

/** The `crit compare` golden cases that run with --json and exit 0, so their stdout is one compare document. */
const compareCases = readGoldenCases().filter((goldenCase) => {
  if (goldenCase.arguments[0] !== "compare" || !isJsonCase(goldenCase)) {
    return false;
  }
  return readExpectedExitCode(goldenCase) === "0";
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

describe("EV-2: every gate document the golden cases write is valid (section 8.3)", () => {
  it("has gate cases to validate", () => {
    expect(gateCases.length).toBeGreaterThan(0);
  });

  for (const goldenCase of gateCases) {
    it(`${goldenCase.name}: stdout validates against schemas/gate.schema.json (US-4)`, () => {
      const result = runCrit(goldenCase.arguments, goldenCase.workingDirectory);
      const document: unknown = JSON.parse(result.stdout);
      const isValid = validateGate(document);
      expect(validateGate.errors ?? []).toEqual([]);
      expect(isValid).toBe(true);
    });
  }

  it("fails a gate document with the gate field removed", () => {
    const goldenCase = gateCases[0];
    if (goldenCase === undefined) {
      throw new Error("No gate case to copy");
    }
    const document = JSON.parse(
      runCrit(goldenCase.arguments, goldenCase.workingDirectory).stdout,
    );
    expect(validateGate(document)).toBe(true);
    delete document.gate;
    expect(validateGate(document)).toBe(false);
  });
});

describe("EV-2: every compare document the golden cases write is valid (section 8.2)", () => {
  it("has compare cases to validate", () => {
    expect(compareCases.length).toBeGreaterThan(0);
  });

  for (const goldenCase of compareCases) {
    it(`${goldenCase.name}: stdout validates against schemas/compare.schema.json (US-3)`, () => {
      const result = runCrit(goldenCase.arguments, goldenCase.workingDirectory);
      expect(result.exitCode).toBe(0);
      const document: unknown = JSON.parse(result.stdout);
      const isValid = validateCompare(document);
      expect(validateCompare.errors ?? []).toEqual([]);
      expect(isValid).toBe(true);
    });
  }

  /** Run the first compare case and return its document, for the tests that change one field. */
  function firstCompareDocument() {
    const goldenCase = compareCases[0];
    if (goldenCase === undefined) {
      throw new Error("No compare case to copy");
    }
    const document = JSON.parse(
      runCrit(goldenCase.arguments, goldenCase.workingDirectory).stdout,
    );
    expect(validateCompare(document)).toBe(true);
    return document;
  }

  it("fails a compare document whose change is not one of better, worse, same, or uncertain (FR-36)", () => {
    const document = firstCompareDocument();
    document.changes[0].change = "improved";
    expect(validateCompare(document)).toBe(false);
  });

  // crit compare always writes skipped: [] (the FR-36 note in docs/PRD.md), so the two tests
  // below put a skipped entry into a real document to check that part of the schema.
  it("passes a compare document with one skipped entry that names its run and reason (FR-36, section 8.2)", () => {
    const document = firstCompareDocument();
    document.skipped = [
      {
        criterion: "compare/content-fills-viewport",
        run: "after",
        reason:
          "requires facts.viewport_width, which the facts file does not have",
      },
    ];
    expect(validateCompare(document)).toBe(true);
  });

  it("fails a compare document with a skipped entry whose run is not before or after (section 8.2)", () => {
    const document = firstCompareDocument();
    document.skipped = [
      {
        criterion: "compare/content-fills-viewport",
        run: "both",
        reason:
          "requires facts.viewport_width, which the facts file does not have",
      },
    ];
    expect(validateCompare(document)).toBe(false);
  });

  it("fails a compare document whose before report still has its own usage (section 8.2)", () => {
    const document = firstCompareDocument();
    document.before.usage = document.usage;
    expect(validateCompare(document)).toBe(false);
  });
});
