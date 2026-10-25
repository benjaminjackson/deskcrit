import { describe, expect, it } from "vitest";
import type { FixtureLabel } from "./labels.ts";
import {
  AGREEMENT_FLOOR,
  type FixtureVerdicts,
  findSingleModel,
  measureCoverage,
  scoreAgreement,
  scoreFixtureTests,
  type Verdict,
  verdictAgrees,
} from "./score.ts";

/** Build the verdicts of one fixture image from a plain object of full criterion id to verdict. */
function verdictsOf(entries: Record<string, Verdict>): FixtureVerdicts {
  return new Map(Object.entries(entries));
}

describe("verdictAgrees", () => {
  it("agrees on a defect when the verdict is fail or warn, and not on pass or uncertain", () => {
    expect(verdictAgrees(true, "fail")).toBe(true);
    expect(verdictAgrees(true, "warn")).toBe(true);
    expect(verdictAgrees(true, "pass")).toBe(false);
    expect(verdictAgrees(true, "uncertain")).toBe(false);
  });

  it("agrees on a clean design when the verdict is pass or uncertain, and not on fail or warn", () => {
    expect(verdictAgrees(false, "pass")).toBe(true);
    expect(verdictAgrees(false, "uncertain")).toBe(true);
    expect(verdictAgrees(false, "fail")).toBe(false);
    expect(verdictAgrees(false, "warn")).toBe(false);
  });
});

describe("scoreFixtureTests", () => {
  const criteria = [
    {
      criterion: "typography/faint-body-text",
      id: "faint-body-text",
      positive: ["fixtures/faint.positive.png"],
      negative: ["fixtures/faint.negative.png"],
    },
  ];

  it("marks fired positives and quiet negatives as agreeing, uncertain negatives included", () => {
    const verdictsByFixture = new Map([
      [
        "fixtures/faint.positive.png",
        verdictsOf({ "typography/faint-body-text": "warn" }),
      ],
      [
        "fixtures/faint.negative.png",
        verdictsOf({ "typography/faint-body-text": "uncertain" }),
      ],
    ]);
    const rows = scoreFixtureTests(criteria, verdictsByFixture);
    expect(rows).toEqual([
      {
        criterion: "typography/faint-body-text",
        fixture: "fixtures/faint.positive.png",
        kind: "positive",
        verdict: "warn",
        outcome: "fired",
        agrees: true,
      },
      {
        criterion: "typography/faint-body-text",
        fixture: "fixtures/faint.negative.png",
        kind: "negative",
        verdict: "uncertain",
        outcome: "quiet",
        agrees: true,
      },
    ]);
  });

  it("marks an uncertain positive and a fired negative as disagreeing", () => {
    const verdictsByFixture = new Map([
      [
        "fixtures/faint.positive.png",
        verdictsOf({ "typography/faint-body-text": "uncertain" }),
      ],
      [
        "fixtures/faint.negative.png",
        verdictsOf({ "typography/faint-body-text": "fail" }),
      ],
    ]);
    const rows = scoreFixtureTests(criteria, verdictsByFixture);
    expect(rows.map((row) => row.agrees)).toEqual([false, false]);
    expect(rows.map((row) => row.outcome)).toEqual(["quiet", "fired"]);
  });

  it("counts a criterion that was not asked as a disagreement with outcome not asked", () => {
    const verdictsByFixture = new Map([
      ["fixtures/faint.positive.png", verdictsOf({})],
      [
        "fixtures/faint.negative.png",
        verdictsOf({ "typography/faint-body-text": "pass" }),
      ],
    ]);
    const rows = scoreFixtureTests(criteria, verdictsByFixture);
    expect(rows[0]).toEqual({
      criterion: "typography/faint-body-text",
      fixture: "fixtures/faint.positive.png",
      kind: "positive",
      verdict: null,
      outcome: "not asked",
      agrees: false,
    });
    expect(rows[1]?.agrees).toBe(true);
  });
});

describe("scoreAgreement", () => {
  /** Ten labels on one criterion: five defects and five clean designs. */
  function tenLabels(): FixtureLabel[] {
    const labels: FixtureLabel[] = [];
    for (let index = 1; index <= 5; index += 1) {
      labels.push({
        fixture: `fixtures/p${index}.png`,
        criterion: "faint-body-text",
        defect_present: "yes",
      });
      labels.push({
        fixture: `fixtures/n${index}.png`,
        criterion: "faint-body-text",
        defect_present: "no",
      });
    }
    return labels;
  }

  it("meets the floor at exactly 0.8, with uncertain counted on its own and never as pass", () => {
    const verdictsByFixture = new Map<string, FixtureVerdicts>();
    const positiveVerdicts: Verdict[] = [
      "fail",
      "fail",
      "warn",
      "fail",
      "pass",
    ];
    const negativeVerdicts: Verdict[] = [
      "pass",
      "pass",
      "uncertain",
      "pass",
      "fail",
    ];
    for (let index = 1; index <= 5; index += 1) {
      verdictsByFixture.set(
        `fixtures/p${index}.png`,
        verdictsOf({
          "typography/faint-body-text": positiveVerdicts[index - 1] ?? "pass",
        }),
      );
      verdictsByFixture.set(
        `fixtures/n${index}.png`,
        verdictsOf({
          "typography/faint-body-text": negativeVerdicts[index - 1] ?? "pass",
        }),
      );
    }
    const results = scoreAgreement(
      "typography",
      ["faint-body-text"],
      tenLabels(),
      verdictsByFixture,
    );
    expect(results).toEqual([
      {
        criterion: "typography/faint-body-text",
        labeled: 10,
        agreed: 8,
        agreement: 0.8,
        uncertain: 1,
        cannot_tell: 0,
        not_asked: 0,
        meets_floor: true,
      },
    ]);
    expect(AGREEMENT_FLOOR).toBe(0.8);
  });

  it("falls below the floor at 7 of 10, and counts an uncertain defect as a miss", () => {
    const verdictsByFixture = new Map<string, FixtureVerdicts>();
    const positiveVerdicts: Verdict[] = [
      "fail",
      "fail",
      "uncertain",
      "fail",
      "pass",
    ];
    for (let index = 1; index <= 5; index += 1) {
      verdictsByFixture.set(
        `fixtures/p${index}.png`,
        verdictsOf({
          "typography/faint-body-text": positiveVerdicts[index - 1] ?? "pass",
        }),
      );
      verdictsByFixture.set(
        `fixtures/n${index}.png`,
        verdictsOf({
          "typography/faint-body-text": index === 5 ? "warn" : "pass",
        }),
      );
    }
    const results = scoreAgreement(
      "typography",
      ["faint-body-text"],
      tenLabels(),
      verdictsByFixture,
    );
    expect(results[0]?.agreed).toBe(7);
    expect(results[0]?.uncertain).toBe(1);
    expect(results[0]?.meets_floor).toBe(false);
  });

  it("leaves out and counts cannot tell labels and labels whose criterion was not asked", () => {
    const labels: FixtureLabel[] = [
      {
        fixture: "fixtures/a.png",
        criterion: "faint-body-text",
        defect_present: "yes",
      },
      {
        fixture: "fixtures/b.png",
        criterion: "faint-body-text",
        defect_present: "cannot tell",
      },
      {
        fixture: "fixtures/c.png",
        criterion: "faint-body-text",
        defect_present: "no",
      },
    ];
    const verdictsByFixture = new Map([
      ["fixtures/a.png", verdictsOf({ "typography/faint-body-text": "fail" })],
      ["fixtures/b.png", verdictsOf({ "typography/faint-body-text": "fail" })],
      ["fixtures/c.png", verdictsOf({})],
    ]);
    const results = scoreAgreement(
      "typography",
      ["faint-body-text"],
      labels,
      verdictsByFixture,
    );
    expect(results[0]).toEqual({
      criterion: "typography/faint-body-text",
      labeled: 1,
      agreed: 1,
      agreement: 1,
      uncertain: 0,
      cannot_tell: 1,
      not_asked: 1,
      meets_floor: true,
    });
  });

  it("gives null agreement and null meets_floor to a criterion with no scored labels", () => {
    const results = scoreAgreement("typography", ["unlabeled"], [], new Map());
    expect(results[0]?.agreement).toBeNull();
    expect(results[0]?.meets_floor).toBeNull();
  });
});

describe("measureCoverage", () => {
  /** Labels for `count` distinct designs, each with one yes label. */
  function designs(count: number): FixtureLabel[] {
    const labels: FixtureLabel[] = [];
    for (let index = 0; index < count; index += 1) {
      labels.push({
        fixture: `fixtures/${index}.png`,
        criterion: "some-criterion",
        defect_present: "yes",
      });
    }
    return labels;
  }

  it("does not meet the minimum with two domains, even past 100 designs", () => {
    const coverage = measureCoverage(
      new Map([
        ["typography", designs(80)],
        ["layout", designs(80)],
      ]),
    );
    expect(coverage.total_designs).toBe(160);
    expect(coverage.domains_with_designs).toBe(2);
    expect(coverage.minimum_met).toBe(false);
  });

  it("does not meet the minimum with seven domains and 99 designs, and meets it at 100", () => {
    const domains = [
      "typography",
      "layout",
      "color",
      "accessibility",
      "ux",
      "dataviz",
    ];
    const labelsByDomain = new Map<string, FixtureLabel[]>();
    for (const domain of domains) {
      labelsByDomain.set(domain, designs(15));
    }
    labelsByDomain.set("art-direction", designs(9));
    expect(measureCoverage(labelsByDomain).total_designs).toBe(99);
    expect(measureCoverage(labelsByDomain).minimum_met).toBe(false);
    labelsByDomain.set("art-direction", designs(10));
    expect(measureCoverage(labelsByDomain).minimum_met).toBe(true);
  });

  it("counts a design once across criteria, and counts a design with only cannot tell as none", () => {
    const labels: FixtureLabel[] = [
      { fixture: "fixtures/a.png", criterion: "one", defect_present: "yes" },
      { fixture: "fixtures/a.png", criterion: "two", defect_present: "no" },
      {
        fixture: "fixtures/b.png",
        criterion: "one",
        defect_present: "cannot tell",
      },
    ];
    const coverage = measureCoverage(new Map([["typography", labels]]));
    expect(coverage.domains[0]).toEqual({
      domain: "typography",
      designs: 1,
      cannot_tell: 1,
    });
  });
});

describe("findSingleModel", () => {
  it("returns the pinned model when every id matches it", () => {
    expect(findSingleModel("jev-1.14.0", ["jev-1.14.0", "jev-1.14.0"])).toBe(
      "jev-1.14.0",
    );
  });

  it("refuses a run whose ids differ from the pinned model", () => {
    expect(() =>
      findSingleModel("jev-1.14.0", ["jev-1.14.0", "jev-1.15.0"]),
    ).toThrow(
      "the run carries model jev-1.15.0, but .crit.yaml pins jev-1.14.0",
    );
  });
});
