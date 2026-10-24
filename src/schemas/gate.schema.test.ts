import { readFileSync } from "node:fs";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

// The disposable schema unit test (CS-22) for schemas/gate.schema.json. It checks the schema
// against hand-written gate documents. The durable EV-2 check, which validates real CLI output
// against this schema, is evals/schema.test.ts.

/** Read one schema file from schemas/ and parse it. JSON.parse returns "any", stored as "object". */
function readSchema(fileName: string): object {
  return JSON.parse(
    readFileSync(new URL(`../../schemas/${fileName}`, import.meta.url), "utf8"),
  );
}

/** Compile the gate schema with the report schema loaded under the id its $ref values use. */
function compileGateValidator() {
  const ajv = new Ajv2020({ allErrors: true });
  ajv.addSchema(readSchema("report.schema.json"), "report.schema.json");
  return ajv.compile(readSchema("gate.schema.json"));
}

/** A gate document with one fail finding that blocks the gate (section 8.3). */
function makeGateDocument(): Record<string, unknown> {
  return {
    schema_version: "1.0.0",
    mode: "gate",
    tool: { name: "deskcrit", version: "0.1.0" },
    image: { path: "home.png", width: 1440, height: 900 },
    context: { platform: "web" },
    packs: [{ name: "typography", version: "1.0.0" }],
    model: "jev-1.14.0",
    findings: [
      {
        criterion: "typography/faint-body-text",
        title: "Body text reads as faint",
        verdict: "fail",
        distribution: { true: 0.84, false: 0.16 },
        confidence: null,
        region: null,
        source: "W3C, WCAG 2.2, Success Criterion 1.4.3 Contrast (Minimum)",
        link: null,
        fix: "Darken the text or lighten the background.",
        model: "jev-1.14.0",
      },
    ],
    skipped: [],
    usage: {
      requests: 1,
      input_tokens: 41250,
      cost_usd: 0.0017,
      latency_ms: 1840,
    },
    gate: {
      passed: false,
      policy: { warn_fails_gate: false },
      blocking: ["typography/faint-body-text"],
    },
  };
}

describe("schemas/gate.schema.json", () => {
  const validate = compileGateValidator();

  it("accepts a gate document (section 8.3)", () => {
    const isValid = validate(makeGateDocument());
    expect(validate.errors ?? []).toEqual([]);
    expect(isValid).toBe(true);
  });

  it("rejects a document whose mode is report", () => {
    expect(validate({ ...makeGateDocument(), mode: "report" })).toBe(false);
  });

  it("rejects a document with no gate field", () => {
    const document = makeGateDocument();
    delete document.gate;
    expect(validate(document)).toBe(false);
  });

  it("rejects a policy with a key other than warn_fails_gate (FR-41)", () => {
    const document = makeGateDocument();
    document.gate = {
      passed: true,
      policy: { warn_fails_gate: false, fail_on_uncertain: true },
      blocking: [],
    };
    expect(validate(document)).toBe(false);
  });

  it("rejects a blocking list that names a criterion twice", () => {
    const document = makeGateDocument();
    document.gate = {
      passed: false,
      policy: { warn_fails_gate: false },
      blocking: ["typography/faint-body-text", "typography/faint-body-text"],
    };
    expect(validate(document)).toBe(false);
  });

  it("rejects a gate that passed with a blocking criterion", () => {
    const document = makeGateDocument();
    document.gate = {
      passed: true,
      policy: { warn_fails_gate: false },
      blocking: ["typography/faint-body-text"],
    };
    expect(validate(document)).toBe(false);
  });

  it("rejects a gate that failed with no blocking criterion", () => {
    const document = makeGateDocument();
    document.gate = {
      passed: false,
      policy: { warn_fails_gate: false },
      blocking: [],
    };
    expect(validate(document)).toBe(false);
  });

  it("accepts a gate that passed with nothing blocking", () => {
    const document = makeGateDocument();
    document.gate = {
      passed: true,
      policy: { warn_fails_gate: true },
      blocking: [],
    };
    expect(validate(document)).toBe(true);
  });

  it("checks the report fields through the report schema: a finding without a verdict fails", () => {
    const document = makeGateDocument();
    document.findings = [{ criterion: "typography/faint-body-text" }];
    expect(validate(document)).toBe(false);
  });
});
