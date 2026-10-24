// The `crit gate` command: run the report pipeline, decide the gate with the exported gate
// function, and render one document (FR-40, FR-41, FR-65, section 8.3). It builds the report with
// the same code as `crit report` and calls no gate code other than gate() from the package entry
// point, so the CLI and the library decide the same way. It writes nothing; main.ts writes the text
// and turns `passed` into the exit code (CS-17).

import { gate } from "../index.js";
import type { ReportInputs } from "./read-inputs.js";
import { renderReportJson } from "./render-json.js";
import { renderGateText } from "./render-text.js";
import { type AnswerSource, composeReport } from "./report-command.js";

/** What a gate run gives main.ts: the text for stdout and whether the gate passed (FR-40, section 8.3). */
export type GateOutput = {
  readonly stdoutText: string;
  readonly passed: boolean;
};

/**
 * Run the report pipeline on the inputs, decide the gate under the policy from `.crit.yaml`, and
 * return the gate document as JSON with --json or as the readable gate output without it (FR-31,
 * FR-40, FR-41, FR-42, US-4). Any stage error propagates, so no partial output is returned (FR-24).
 */
export async function runGate(
  inputs: ReportInputs,
  answerSource: AnswerSource,
): Promise<GateOutput> {
  const composed = await composeReport(inputs, answerSource);
  const document = gate(composed.report, inputs.gatePolicy);
  let stdoutText: string;
  if (inputs.json) {
    stdoutText = renderReportJson(document);
  } else {
    stdoutText = renderGateText(document);
  }
  return { stdoutText, passed: document.gate.passed };
}
