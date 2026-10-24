// Disposable unit tests (CS-22) for the readable renderer (FR-28, FR-32, FR-33, FR-34, US-2, NFR-5).

import { describe, expect, test } from "vitest";
import type { CompareReport } from "../compose/compare.js";
import type { Finding, Report } from "../compose/report.js";
import { prdExampleReport } from "./prd-example-report.fixture.js";
import { renderCompareText, renderReportText } from "./render-text.js";

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

  test("shows a Skipped group after Pass with each criterion and its reason", () => {
    const text = renderReportText(reportWithFindings(findingsOfEveryVerdict));
    expect(text).toContain("Skipped (1)");
    expect(text).toContain(
      "  layout/reflow-at-320: requires facts.viewport_width, which the facts file does not have",
    );
    expect(text.indexOf("Skipped (1)")).toBeGreaterThan(
      text.indexOf("Pass (1)"),
    );
    expect(text.indexOf("Skipped (1)")).toBeLessThan(text.indexOf("Requests:"));
  });

  test("lists skipped criteria in the order the report gives them", () => {
    const report: Report = {
      ...prdExampleReport,
      skipped: [
        { criterion: "pack/zeta", reason: "first reason" },
        { criterion: "pack/alpha", reason: "second reason" },
      ],
    };
    const text = renderReportText(report);
    expect(text).toContain("Skipped (2)");
    expect(text.indexOf("pack/zeta: first reason")).toBeLessThan(
      text.indexOf("pack/alpha: second reason"),
    );
  });

  test("shows no Skipped group when nothing was skipped", () => {
    const text = renderReportText({ ...prdExampleReport, skipped: [] });
    expect(text).not.toContain("Skipped");
  });

  test("shows the probability of true on a noul finding and a confidence on a score finding", () => {
    const text = renderReportText(prdExampleReport);
    expect(text).toContain("Defect probability: 0.84");
    expect(text).toContain("Confidence: 0.72");
  });

  test("shows no region", () => {
    const text = renderReportText(prdExampleReport);
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

describe("renderCompareText (FR-32, FR-33, FR-39, US-3)", () => {
  /** The PRD example report without its usage, as a compare document holds each run. */
  const { usage: exampleUsage, ...exampleWithoutUsage } = prdExampleReport;

  /** A compare document of the PRD example against itself, with the given changes and skipped list. */
  function compareDocument(
    changes: CompareReport["changes"],
    skipped: CompareReport["skipped"],
  ): CompareReport {
    return {
      schema_version: "1.0.0",
      mode: "compare",
      tool: prdExampleReport.tool,
      before: exampleWithoutUsage,
      after: exampleWithoutUsage,
      model: prdExampleReport.model,
      changes,
      skipped,
      summary: { improved: 1, regressed: 1, same: 0, uncertain: 0 },
      usage: {
        requests: 2,
        input_tokens: exampleUsage.input_tokens,
        cost_usd: null,
        latency_ms: 3680,
      },
    };
  }

  const betterFocalPoint: CompareReport["changes"][number] = {
    criterion: "typography/single-focal-point",
    change: "better",
    before: { verdict: "warn", value: 1 },
    after: { verdict: "pass", value: 0 },
    model: "jev-1.14.0",
  };
  const worseFaintText: CompareReport["changes"][number] = {
    criterion: "typography/faint-body-text",
    change: "worse",
    before: { verdict: "fail", value: 0.84 },
    after: { verdict: "fail", value: 0.99 },
    model: "jev-1.14.0",
  };

  test("puts Worse before Better, shows each value in words, and ends with the summary and usage lines", () => {
    const text = renderCompareText(
      compareDocument([worseFaintText, betterFocalPoint], []),
    );
    expect(text).toBe(
      [
        "Worse (1)",
        "",
        "  Body text reads as faint",
        "  Criterion: typography/faint-body-text",
        "  Before: fail, defect probability 0.84",
        "  After: fail, defect probability 0.99",
        "",
        "Better (1)",
        "",
        "  One focal point",
        "  Criterion: typography/single-focal-point",
        "  Before: warn, level 1",
        "  After: pass, level 0",
        "",
        "Skipped (1)",
        "",
        "  layout/reflow-at-320: skipped by both runs: requires facts.viewport_width, which the facts file does not have",
        "",
        "Improved: 1, regressed: 1, same: 0, uncertain: 0",
        "Requests: 2, input tokens: 41250, cost: unknown, latency: 3680 ms, model: jev-1.14.0",
        "",
      ].join("\n"),
    );
  });

  test("names the run that skipped a criterion only one run asked, and lists it once", () => {
    const text = renderCompareText(
      compareDocument(
        [],
        [
          {
            criterion: "layout/reflow-at-320",
            run: "after",
            reason:
              "requires facts.viewport_width, which the facts file does not have",
          },
        ],
      ),
    );
    expect(text).toContain(
      "Skipped (1)\n\n  layout/reflow-at-320: skipped by the after run: requires facts.viewport_width",
    );
    expect(text).not.toContain("skipped by both runs");
    expect(
      text.startsWith("No changes: no criterion was asked by both runs."),
    ).toBe(true);
  });

  test("shows a choice value as the option name", () => {
    const text = renderCompareText(
      compareDocument(
        [
          {
            criterion: "typography/single-focal-point",
            change: "same",
            before: { verdict: "pass", value: "comfortable" },
            after: { verdict: "pass", value: "comfortable" },
            model: "jev-1.14.0",
          },
        ],
        [],
      ),
    );
    expect(text).toContain("Same (1)");
    expect(text).toContain("  Before: pass, option comfortable");
  });
});
