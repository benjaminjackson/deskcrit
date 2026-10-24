import { describe, expect, test } from "vitest";
import type { Finding } from "./report.js";
import { sortFindings } from "./sort-findings.js";
import type { Verdict } from "./verdict.js";

// Disposable unit tests (CS-22) for the FR-28 order.

/** Builds a finding with only the fields the sort reads set to the given values. */
function finding(
  criterion: string,
  verdict: Verdict,
  confidence: number | null,
): Finding {
  return {
    criterion,
    title: "Title",
    verdict,
    distribution: {},
    confidence,
    region: null,
    source: "Source",
    link: null,
    fix: "Fix",
    model: "jev-1.14.0",
  };
}

/** Returns the criterion ids in order, to compare orders in one line. */
function criteriaOf(findings: readonly Finding[]): string[] {
  return findings.map((each) => each.criterion);
}

describe("sortFindings", () => {
  test("sorts fail, warn, uncertain, pass", () => {
    const sorted = sortFindings([
      finding("a/pass", "pass", 0.9),
      finding("a/uncertain", "uncertain", 0.9),
      finding("a/fail", "fail", 0.9),
      finding("a/warn", "warn", 0.9),
    ]);
    expect(criteriaOf(sorted)).toEqual([
      "a/fail",
      "a/warn",
      "a/uncertain",
      "a/pass",
    ]);
  });

  test("sorts by confidence from high to low within one verdict", () => {
    const sorted = sortFindings([
      finding("a/low", "fail", 0.6),
      finding("a/high", "fail", 0.95),
      finding("a/middle", "fail", 0.8),
    ]);
    expect(criteriaOf(sorted)).toEqual(["a/high", "a/middle", "a/low"]);
  });

  test("puts noul findings after findings with a confidence", () => {
    const sorted = sortFindings([
      finding("a/noul", "fail", null),
      finding("b/low", "fail", 0.1),
      finding("a/noul-other", "warn", null),
    ]);
    expect(criteriaOf(sorted)).toEqual(["b/low", "a/noul", "a/noul-other"]);
  });

  test("breaks a confidence tie by criterion id", () => {
    const sorted = sortFindings([
      finding("layout/b", "warn", 0.7),
      finding("layout/a", "warn", 0.7),
      finding("color/z", "warn", null),
      finding("color/y", "warn", null),
    ]);
    expect(criteriaOf(sorted)).toEqual([
      "layout/a",
      "layout/b",
      "color/y",
      "color/z",
    ]);
  });

  test("compares ids by code unit, so uppercase comes before lowercase", () => {
    // localeCompare would put "a/apple" before "a/Banana"; code-unit order puts "B" (66) before "a" (97).
    const sorted = sortFindings([
      finding("a/apple", "fail", null),
      finding("a/Banana", "fail", null),
    ]);
    expect(criteriaOf(sorted)).toEqual(["a/Banana", "a/apple"]);
  });

  test("leaves the input array unchanged", () => {
    const input = [
      finding("a/pass", "pass", 0.9),
      finding("a/fail", "fail", 0.9),
    ];
    const copy = [...input];
    sortFindings(input);
    expect(input).toEqual(copy);
  });
});
