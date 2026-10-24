// The gate: decide pass or fail from a finished report's verdicts and the gate policy, and return
// the gate document of docs/PRD.md section 8.3 (FR-40, FR-41, FR-63). It takes a finished report and
// calls no other stage. It is pure: no I/O, no clock, and it never changes the report it is given
// (CS-6, CS-18). The CLI turns `passed` into the exit code in src/cli/main.ts (CS-17).

import type { Report } from "./report.js";

/** The mode of the gate document (section 8.3, CS-15). */
export const GATE_MODE = "gate";

/** The gate policy, in the wire name that `.crit.yaml` and the gate document use (FR-41, CS-10). */
export type GatePolicy = {
  readonly warn_fails_gate: boolean;
};

/** The policy when `.crit.yaml` does not set `warn_fails_gate`: only a fail verdict fails the gate (FR-41). */
export const DEFAULT_GATE_POLICY: GatePolicy = { warn_fails_gate: false };

/** The `gate` field of the gate document: the decision, the policy as applied, and the criteria that caused a failure (section 8.3). */
export type GateResult = {
  readonly passed: boolean;
  readonly policy: GatePolicy;
  readonly blocking: readonly string[];
};

/** The gate document: a report with mode "gate" and one more field, `gate` (section 8.3). */
export type GateReport = Omit<Report, "mode"> & {
  readonly mode: typeof GATE_MODE;
  readonly gate: GateResult;
};

/**
 * Decide the gate from the report's findings. A fail verdict always blocks. A warn verdict blocks
 * only when the policy sets warn_fails_gate. Uncertain and pass never block (FR-40, FR-41, US-9).
 * `blocking` lists the criterion ids in report order, which compose already sorted (FR-28). The
 * policy is copied, so the result records the policy as applied (section 8.3).
 */
export function evaluateGate(report: Report, policy: GatePolicy): GateResult {
  const blocking: string[] = [];
  for (const finding of report.findings) {
    let blocks: boolean;
    switch (finding.verdict) {
      case "fail": {
        blocks = true;
        break;
      }
      case "warn": {
        blocks = policy.warn_fails_gate;
        break;
      }
      case "uncertain": {
        blocks = false;
        break;
      }
      case "pass": {
        blocks = false;
        break;
      }
      default: {
        // `never` is the type with no values. If a new verdict is added and not handled above,
        // this line stops compiling (CS-9).
        const unhandledVerdict: never = finding.verdict;
        throw new Error(`Unknown verdict: ${JSON.stringify(unhandledVerdict)}`);
      }
    }
    if (blocks) {
      blocking.push(finding.criterion);
    }
  }
  return {
    passed: blocking.length === 0,
    policy: { warn_fails_gate: policy.warn_fails_gate },
    blocking,
  };
}

/**
 * Return a new document with the report's fields in their order, mode set to "gate", and the gate
 * result added last. The input report is not changed (section 8.3, CS-6).
 */
export function buildGateDocument(
  report: Report,
  result: GateResult,
): GateReport {
  return { ...report, mode: GATE_MODE, gate: result };
}

/**
 * The exported gate function: decide the gate for a finished report under the policy and return
 * the gate document. It calls no other stage (FR-40, FR-41, FR-63, FR-65).
 */
export function gate(report: Report, policy: GatePolicy): GateReport {
  return buildGateDocument(report, evaluateGate(report, policy));
}
