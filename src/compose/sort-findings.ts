// Sorts findings in the order FR-28 sets, so the same findings always come out in the same order
// (FR-28, NFR-5, CS-18).

import type { Finding } from "./report.js";
import type { Verdict } from "./verdict.js";

/** The place of each verdict in the report: fail first, then warn, uncertain, and pass (FR-28, OQ-6). */
const VERDICT_RANK: Readonly<Record<Verdict, number>> = {
  fail: 0,
  warn: 1,
  uncertain: 2,
  pass: 3,
};

/**
 * Returns a new array of the findings in FR-28 order: by verdict, then findings with a confidence
 * from high to low, then noul findings, which have none, then by criterion id (FR-28, OQ-21). It
 * does not change the input array (CS-18).
 */
export function sortFindings(findings: readonly Finding[]): Finding[] {
  const sorted = [...findings];
  sorted.sort(compareFindings);
  return sorted;
}

/** Returns a negative number when `first` goes before `second`, a positive one when after, and 0 when equal (FR-28). */
function compareFindings(first: Finding, second: Finding): number {
  const verdictDifference =
    VERDICT_RANK[first.verdict] - VERDICT_RANK[second.verdict];
  if (verdictDifference !== 0) {
    return verdictDifference;
  }

  const confidenceOrder = compareConfidence(
    first.confidence,
    second.confidence,
  );
  if (confidenceOrder !== 0) {
    return confidenceOrder;
  }

  // Plain < and > compare strings by UTF-16 code unit, the same on every machine. A locale-aware
  // comparison would depend on the machine (CS-18).
  if (first.criterion < second.criterion) {
    return -1;
  }
  if (first.criterion > second.criterion) {
    return 1;
  }
  return 0;
}

/** Orders a confidence before null, and a higher confidence before a lower one (FR-28, OQ-21). */
function compareConfidence(
  first: number | null,
  second: number | null,
): number {
  if (first === null && second === null) {
    return 0;
  }
  if (first === null) {
    return 1;
  }
  if (second === null) {
    return -1;
  }
  return second - first;
}
