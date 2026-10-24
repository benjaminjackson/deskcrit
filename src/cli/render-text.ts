// The readable renderer for `crit report` without `--json` (FR-31, FR-32, FR-33, US-2). It is pure:
// it returns one string and the command writes it once (CS-6, CS-17). It uses plain text with no
// colour codes, so it reads the same on any terminal (FR-32). Rounding happens only here (CS-18).
// It prints only the text the pack author wrote and the numbers it was given, and adds no claim of
// conformance or measurement (FR-34, NG-2).

import type { Finding, Report, ReportUsage } from "../compose/report.js";
import type { Verdict } from "../compose/verdict.js";

/** The verdict groups in the order the report shows them, the same order as the sort (FR-28). */
const VERDICT_GROUP_ORDER: readonly Verdict[] = [
  "fail",
  "warn",
  "uncertain",
  "pass",
];

/** Decimal places for a confidence or a probability, such as 0.72 (FR-32). */
const CONFIDENCE_DECIMAL_PLACES = 2;

/**
 * Decimal places for a cost in US dollars. Six places keep a cost such as $0.00018 from
 * rounding to zero (FR-33, PRD R-6).
 */
const COST_DECIMAL_PLACES = 6;

/** What the usage line prints for a value TypeSafe did not report (FR-33, FR-23). */
const UNKNOWN_VALUE_TEXT = "unknown";

/** How far each finding's lines are indented under their group heading. */
const FINDING_INDENT = "  ";

/** Returns the heading word for one verdict group, so a verdict always shows as a word (FR-32, US-2). */
function verdictGroupHeading(verdict: Verdict): string {
  switch (verdict) {
    case "fail": {
      return "Fail";
    }
    case "warn": {
      return "Warn";
    }
    case "uncertain": {
      return "Uncertain";
    }
    case "pass": {
      return "Pass";
    }
    default: {
      // `never` is the type with no values. If a new verdict is added and not handled above,
      // this line stops compiling (CS-9).
      const unhandledVerdict: never = verdict;
      throw new Error(`Unknown verdict: ${JSON.stringify(unhandledVerdict)}`);
    }
  }
}

/**
 * Returns the lines for one finding: title, criterion id, verdict, confidence, source, link, and
 * fix (FR-32). A `noul` finding shows its defect probability where other findings show a confidence, and a
 * null link prints no line (FR-20, FR-26).
 */
function findingLines(finding: Finding): string[] {
  const lines: string[] = [];
  lines.push(`${FINDING_INDENT}${finding.title}`);
  lines.push(`${FINDING_INDENT}Criterion: ${finding.criterion}`);
  lines.push(`${FINDING_INDENT}Verdict: ${finding.verdict}`);
  if (finding.confidence !== null) {
    lines.push(
      `${FINDING_INDENT}Confidence: ${finding.confidence.toFixed(CONFIDENCE_DECIMAL_PLACES)}`,
    );
  } else {
    // A `noul` finding has no confidence, so its line shows the probability of `true`, which is the probability that the defect is present (FR-32).
    const probabilityOfTrue = finding.distribution.true;
    if (probabilityOfTrue !== undefined) {
      lines.push(
        `${FINDING_INDENT}Defect probability: ${probabilityOfTrue.toFixed(CONFIDENCE_DECIMAL_PLACES)}`,
      );
    }
  }
  lines.push(`${FINDING_INDENT}Source: ${finding.source}`);
  if (finding.link !== null) {
    lines.push(`${FINDING_INDENT}Link: ${finding.link}`);
  }
  lines.push(`${FINDING_INDENT}Fix: ${finding.fix}`);
  return lines;
}

/**
 * Returns the Skipped group: a heading with the count and one line per skipped criterion, in the
 * order the report lists them (FR-32). Returns no lines when nothing was skipped.
 */
function skippedGroupLines(skipped: Report["skipped"]): string[] {
  const lines: string[] = [];
  if (skipped.length === 0) {
    return lines;
  }
  lines.push(`Skipped (${skipped.length})`);
  lines.push("");
  for (const skippedCriterion of skipped) {
    lines.push(
      `${FINDING_INDENT}${skippedCriterion.criterion}: ${skippedCriterion.reason}`,
    );
  }
  lines.push("");
  return lines;
}

/** Returns the cost in US dollars with a fixed number of decimals, or "unknown" when it is null (FR-33). */
function formatCost(costInUsDollars: number | null): string {
  if (costInUsDollars === null) {
    return UNKNOWN_VALUE_TEXT;
  }
  return `$${costInUsDollars.toFixed(COST_DECIMAL_PLACES)}`;
}

/** Returns the input token count, or "unknown" when it is null (FR-33). */
function formatInputTokens(inputTokens: number | null): string {
  if (inputTokens === null) {
    return UNKNOWN_VALUE_TEXT;
  }
  return String(inputTokens);
}

/**
 * Returns the last line of the report: requests, input tokens, cost, and latency from usage, and the
 * model id from the report's top-level `model`, because usage holds no model id (FR-33).
 */
function usageLine(usage: ReportUsage, modelId: string): string {
  const parts: string[] = [];
  parts.push(`Requests: ${usage.requests}`);
  parts.push(`input tokens: ${formatInputTokens(usage.input_tokens)}`);
  parts.push(`cost: ${formatCost(usage.cost_usd)}`);
  parts.push(`latency: ${usage.latency_ms.toFixed(0)} ms`);
  parts.push(`model: ${modelId}`);
  return parts.join(", ");
}

/**
 * Turns the report document into the readable report: findings grouped by verdict in the order
 * fail, warn, uncertain, pass, keeping compose's order inside each group, then the Skipped group,
 * and then the usage line,
 * which prints even when there are no findings (FR-28, FR-32, FR-33, US-2, NFR-5).
 */
export function renderReportText(report: Report): string {
  const lines: string[] = [];
  if (report.findings.length === 0) {
    lines.push("No findings: no criterion was asked.");
    lines.push("");
  }
  for (const verdict of VERDICT_GROUP_ORDER) {
    const groupFindings = report.findings.filter(
      (finding) => finding.verdict === verdict,
    );
    if (groupFindings.length === 0) {
      continue;
    }
    lines.push(`${verdictGroupHeading(verdict)} (${groupFindings.length})`);
    lines.push("");
    for (const finding of groupFindings) {
      lines.push(...findingLines(finding));
      lines.push("");
    }
  }
  lines.push(...skippedGroupLines(report.skipped));
  lines.push(usageLine(report.usage, report.model));
  return `${lines.join("\n")}\n`;
}
