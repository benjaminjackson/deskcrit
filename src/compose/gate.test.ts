// Disposable unit tests (CS-22) for the gate (FR-40, FR-41, FR-63, US-9, section 8.3).

import { describe, expect, it } from "vitest";
import {
  buildGateDocument,
  DEFAULT_GATE_POLICY,
  evaluateGate,
  type GatePolicy,
  gate,
} from "./gate.js";
import type { Finding, Report } from "./report.js";
import type { Verdict } from "./verdict.js";

/** The policy that makes warn verdicts fail the gate (FR-41). */
const WARN_FAILS_POLICY: GatePolicy = { warn_fails_gate: true };

/** Make one finding with this criterion id and verdict, and fixed values for the other fields. */
function makeFinding(criterion: string, verdict: Verdict): Finding {
  return {
    criterion,
    title: `Title of ${criterion}`,
    verdict,
    distribution: { true: 0.5, false: 0.5 },
    confidence: null,
    region: null,
    source: "A source",
    link: null,
    fix: "A fix.",
    model: "jev-1.14.0",
  };
}

/** Make a report that holds these findings in this order. */
function makeReport(findings: readonly Finding[]): Report {
  return {
    schema_version: "1.0.0",
    mode: "report",
    tool: { name: "deskcrit", version: "0.0.0" },
    image: { path: "page.png", width: 1280, height: 800 },
    context: {},
    packs: [{ name: "golden", version: "1.0.0" }],
    model: "jev-1.14.0",
    findings,
    skipped: [],
    usage: { requests: 1, input_tokens: 10, cost_usd: 0.0001, latency_ms: 5 },
  };
}

describe("evaluateGate", () => {
  it("blocks on a fail verdict under the default policy (FR-40)", () => {
    const report = makeReport([makeFinding("a/fails", "fail")]);
    expect(evaluateGate(report, DEFAULT_GATE_POLICY)).toEqual({
      passed: false,
      policy: { warn_fails_gate: false },
      blocking: ["a/fails"],
    });
  });

  it("passes a warn verdict under the default policy (FR-41)", () => {
    const report = makeReport([makeFinding("a/warns", "warn")]);
    const result = evaluateGate(report, DEFAULT_GATE_POLICY);
    expect(result.passed).toBe(true);
    expect(result.blocking).toEqual([]);
  });

  it("blocks on a warn verdict when warn_fails_gate is true (FR-41)", () => {
    const report = makeReport([makeFinding("a/warns", "warn")]);
    expect(evaluateGate(report, WARN_FAILS_POLICY)).toEqual({
      passed: false,
      policy: { warn_fails_gate: true },
      blocking: ["a/warns"],
    });
  });

  it("never blocks on an uncertain verdict under either policy (FR-40, FR-41, US-9)", () => {
    const report = makeReport([makeFinding("a/unsure", "uncertain")]);
    expect(evaluateGate(report, DEFAULT_GATE_POLICY).passed).toBe(true);
    expect(evaluateGate(report, WARN_FAILS_POLICY).passed).toBe(true);
  });

  it("never blocks on a pass verdict under either policy (FR-40)", () => {
    const report = makeReport([makeFinding("a/passes", "pass")]);
    expect(evaluateGate(report, DEFAULT_GATE_POLICY).passed).toBe(true);
    expect(evaluateGate(report, WARN_FAILS_POLICY).passed).toBe(true);
  });

  it("passes a report with no findings", () => {
    expect(evaluateGate(makeReport([]), DEFAULT_GATE_POLICY)).toEqual({
      passed: true,
      policy: { warn_fails_gate: false },
      blocking: [],
    });
  });

  it("lists the blocking criteria in finding order (FR-28)", () => {
    const report = makeReport([
      makeFinding("z/fails", "fail"),
      makeFinding("a/fails", "fail"),
      makeFinding("m/warns", "warn"),
      makeFinding("b/unsure", "uncertain"),
      makeFinding("c/passes", "pass"),
    ]);
    expect(evaluateGate(report, WARN_FAILS_POLICY).blocking).toEqual([
      "z/fails",
      "a/fails",
      "m/warns",
    ]);
  });

  it("echoes the default policy as applied, as a copy (section 8.3)", () => {
    const result = evaluateGate(makeReport([]), DEFAULT_GATE_POLICY);
    expect(result.policy).toEqual({ warn_fails_gate: false });
    expect(result.policy).not.toBe(DEFAULT_GATE_POLICY);
  });
});

describe("gate", () => {
  it("returns the report with mode gate and the gate result, and does not change the report (section 8.3, CS-6)", () => {
    const report = makeReport([
      makeFinding("a/fails", "fail"),
      makeFinding("b/passes", "pass"),
    ]);
    const before = structuredClone(report);
    const document = gate(report, DEFAULT_GATE_POLICY);
    expect(report).toEqual(before);
    expect(document).toEqual({
      ...before,
      mode: "gate",
      gate: {
        passed: false,
        policy: { warn_fails_gate: false },
        blocking: ["a/fails"],
      },
    });
  });

  it("keeps the report's key order and puts gate last", () => {
    const report = makeReport([]);
    const document = buildGateDocument(
      report,
      evaluateGate(report, DEFAULT_GATE_POLICY),
    );
    expect(Object.keys(document)).toEqual([...Object.keys(report), "gate"]);
  });
});
