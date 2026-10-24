// Disposable unit tests (CS-22) for the readable renderer (FR-28, FR-32, FR-33, FR-34, US-2, NFR-5).

import { describe, expect, test } from "vitest";
import type { Finding, Report } from "../compose/report.js";
import { prdExampleReport } from "./prd-example-report.fixture.js";
import { renderReportText } from "./render-text.js";

/** The PRD example's two findings, by verdict, for building reports with other verdicts. */
const failFinding: Finding =
  prdExampleReport.findings[0] ?? fail("missing fail finding");
const warnFinding: Finding =
  prdExampleReport.findings[1] ?? fail("missing warn finding");

/** Throws, so a missing fixture finding stops the test file at once. */
function fail(message: string): never {
  throw new Error(message);
}

/** Returns the PRD example report with its findings replaced by the given ones. */
function reportWithFindings(findings: readonly Finding[]): Report {
  return { ...prdExampleReport, findings };
}

/** Returns the last line of the text, leaving out the trailing newline. */
function lastLine(text: string): string {
  const lines = text.trimEnd().split("\n");
  return lines[lines.length - 1] ?? "";
}

/** One finding of each verdict, given in the order compose sorts them (FR-28). */
const findingsOfEveryVerdict: readonly Finding[] = [
  { ...failFinding, criterion: "pack/b-fail", title: "Second fail" },
  { ...failFinding, criterion: "pack/a-fail", title: "First fail" },
  { ...warnFinding, criterion: "pack/warn", title: "A warn" },
  {
    ...warnFinding,
    criterion: "pack/uncertain",
    title: "An uncertain",
    verdict: "uncertain",
  },
  { ...warnFinding, criterion: "pack/pass", title: "A pass", verdict: "pass" },
];

describe("renderReportText", () => {
  test("shows each finding's title, verdict, confidence, source, and fix", () => {
    const text = renderReportText(prdExampleReport);
    for (const finding of prdExampleReport.findings) {
      expect(text).toContain(finding.title);
      expect(text).toContain(`Criterion: ${finding.criterion}`);
      expect(text).toContain(`Verdict: ${finding.verdict}`);
      expect(text).toContain(`Source: ${finding.source}`);
      expect(text).toContain(`Fix: ${finding.fix}`);
    }
    expect(text).toContain("Confidence: 0.72");
  });

  test("prints no confidence for a finding whose confidence is null", () => {
    const text = renderReportText(reportWithFindings([failFinding]));
    expect(text).not.toContain("Confidence");
    expect(text).not.toContain("null");
  });

  test("prints a link line only when the link is not null", () => {
    const withLink = renderReportText(reportWithFindings([failFinding]));
    expect(withLink).toContain(`Link: ${failFinding.link}`);
    const withoutLink = renderReportText(reportWithFindings([warnFinding]));
    expect(withoutLink).not.toContain("Link");
    expect(withoutLink).not.toContain("null");
  });

  test("groups findings fail, warn, uncertain, pass and keeps compose's order in a group", () => {
    const text = renderReportText(reportWithFindings(findingsOfEveryVerdict));
    const headingPositions = [
      text.indexOf("Fail (2)"),
      text.indexOf("Warn (1)"),
      text.indexOf("Uncertain (1)"),
      text.indexOf("Pass (1)"),
    ];
    for (const position of headingPositions) {
      expect(position).toBeGreaterThanOrEqual(0);
    }
    const sortedPositions = [...headingPositions].sort(
      (left, right) => left - right,
    );
    expect(headingPositions).toEqual(sortedPositions);
    expect(text.indexOf("Second fail")).toBeLessThan(
      text.indexOf("First fail"),
    );
    expect(text.indexOf("First fail")).toBeLessThan(text.indexOf("Warn (1)"));
  });

  test("leaves out a group with no findings", () => {
    const text = renderReportText(prdExampleReport);
    expect(text).not.toContain("Uncertain (");
    expect(text).not.toContain("Pass (");
  });

  test("is plain text: no escape codes, and every verdict is a word", () => {
    const text = renderReportText(reportWithFindings(findingsOfEveryVerdict));
    expect(text).not.toContain("\u001b");
    for (const verdict of ["fail", "warn", "uncertain", "pass"]) {
      expect(text).toContain(`Verdict: ${verdict}`);
    }
  });

  test("ends with requests, input tokens, cost, latency, and the report's model id", () => {
    const report: Report = {
      ...prdExampleReport,
      model: "jev-top-level-model",
    };
    const text = renderReportText(report);
    expect(text.endsWith("\n")).toBe(true);
    expect(lastLine(text)).toBe(
      "Requests: 1, input tokens: 41250, cost: $0.001700, latency: 1840 ms, model: jev-top-level-model",
    );
  });

  test("keeps a small cost from rounding to zero", () => {
    const report: Report = {
      ...prdExampleReport,
      usage: { ...prdExampleReport.usage, cost_usd: 0.00018 },
    };
    expect(lastLine(renderReportText(report))).toContain("cost: $0.000180");
  });

  test("says unknown when input tokens and cost are null", () => {
    const report: Report = {
      ...prdExampleReport,
      usage: { ...prdExampleReport.usage, input_tokens: null, cost_usd: null },
    };
    expect(lastLine(renderReportText(report))).toBe(
      "Requests: 1, input tokens: unknown, cost: unknown, latency: 1840 ms, model: jev-1.14.0",
    );
  });

  test("prints a report and the usage line when there are no findings", () => {
    const text = renderReportText(reportWithFindings([]));
    expect(text).toContain("No findings");
    expect(lastLine(text)).toContain("Requests: 1");
    expect(lastLine(text)).toContain("model: jev-1.14.0");
  });

  test("shows neither skipped criteria nor regions", () => {
    const text = renderReportText(prdExampleReport);
    expect(text).not.toContain("layout/reflow-at-320");
    expect(text).not.toContain("540");
  });

  test("adds no claim of conformance or measurement", () => {
    const text = renderReportText(reportWithFindings(findingsOfEveryVerdict));
    for (const word of [/complian/i, /conform/i, /measured/i, /passes WCAG/i]) {
      expect(text).not.toMatch(word);
    }
  });

  test("gives the same text for the same report", () => {
    const report = reportWithFindings(findingsOfEveryVerdict);
    expect(renderReportText(report)).toBe(renderReportText(report));
  });
});
