import { describe, expect, it } from "vitest";
import type { Change, CriterionChange } from "../../src/index.ts";
import {
  expectedChange,
  meetsAgreementFloor,
  scorePair,
  summarizeAgreement,
} from "./compare-score.ts";

/** Build one change entry of a compare document from a criterion id and its change. */
function changeOf(criterion: string, change: Change): CriterionChange {
  return {
    criterion,
    change,
    before: { verdict: "pass", value: 0.1 },
    after: { verdict: "pass", value: 0.1 },
    model: "jev-1.14.0",
  };
}

describe("expectedChange", () => {
  it("maps after to better, before to worse, and same to same", () => {
    expect(expectedChange("after")).toBe("better");
    expect(expectedChange("before")).toBe("worse");
    expect(expectedChange("same")).toBe("same");
  });
});

describe("scorePair", () => {
  const changes = [
    changeOf("layout/ragged-edge", "same"),
    changeOf("typography/heading-indistinct", "better"),
  ];

  it("agrees when the target changed the way the preference expects, whatever other criteria did", () => {
    const score = scorePair(
      ["typography/heading-indistinct"],
      [...changes, changeOf("basics/clipped-text", "worse")],
      [],
      "after",
    );
    expect(score.outcome).toBe("agree");
    expect(score.scored).toEqual([
      { criterion: "typography/heading-indistinct", change: "better" },
    ]);
  });

  it("disagrees when the target changed the other way", () => {
    expect(
      scorePair(["typography/heading-indistinct"], changes, [], "before")
        .outcome,
    ).toBe("disagree");
  });

  it("is uncertain when a target is uncertain and no target disagrees", () => {
    const withUncertain = [
      ...changes,
      changeOf("layout/no-alignment", "uncertain"),
    ];
    expect(
      scorePair(
        ["typography/heading-indistinct", "layout/no-alignment"],
        withUncertain,
        [],
        "after",
      ).outcome,
    ).toBe("uncertain");
  });

  it("disagrees, not uncertain, when one target disagrees and another is uncertain", () => {
    const mixed = [
      changeOf("layout/no-alignment", "uncertain"),
      changeOf("typography/heading-indistinct", "worse"),
    ];
    expect(
      scorePair(
        ["layout/no-alignment", "typography/heading-indistinct"],
        mixed,
        [],
        "after",
      ).outcome,
    ).toBe("disagree");
  });

  it("scores every change of a pair with no target, so one changed criterion on a same pair disagrees", () => {
    expect(
      scorePair([], [changeOf("layout/ragged-edge", "same")], [], "same"),
    ).toEqual({
      outcome: "agree",
      scored: [{ criterion: "layout/ragged-edge", change: "same" }],
    });
    expect(scorePair([], changes, [], "same").outcome).toBe("disagree");
  });

  it("is uncertain for a same pair with no target when a change is uncertain and none is better or worse", () => {
    const changesWithUncertain = [
      changeOf("layout/ragged-edge", "same"),
      changeOf("layout/no-alignment", "uncertain"),
    ];
    expect(scorePair([], changesWithUncertain, [], "same").outcome).toBe(
      "uncertain",
    );
  });

  it("disagrees for a pair with no target and a preference of after, even when every change is same", () => {
    const allSame = [
      changeOf("layout/ragged-edge", "same"),
      changeOf("typography/heading-indistinct", "same"),
    ];
    expect(scorePair([], allSame, [], "after").outcome).toBe("disagree");
  });

  it("disagrees for a pair with no target and a preference of before, even when one change is worse", () => {
    const oneWorse = [
      changeOf("layout/ragged-edge", "same"),
      changeOf("typography/heading-indistinct", "worse"),
    ];
    expect(scorePair([], oneWorse, [], "before").outcome).toBe("disagree");
  });

  it("throws when there is no criterion to score", () => {
    expect(() => scorePair([], [], [], "same")).toThrow(
      "the pair has no criterion to score",
    );
  });

  it("ignores a skipped criterion that is not a target", () => {
    const score = scorePair(
      [],
      [changeOf("layout/ragged-edge", "same")],
      ["basics/clipped-text"],
      "same",
    );
    expect(score.outcome).toBe("agree");
    expect(score.scored).toHaveLength(1);
  });

  it("throws when a target is not in the changes, and says so when it was skipped", () => {
    expect(() => scorePair(["layout/missing"], changes, [], "after")).toThrow(
      "target layout/missing is not in the compare document",
    );
    expect(() =>
      scorePair(["layout/missing"], changes, ["layout/missing"], "after"),
    ).toThrow("target layout/missing was asked in only one run");
  });
});

describe("summarizeAgreement", () => {
  it("counts each outcome and counts uncertain as not agreeing in the rate", () => {
    const summary = summarizeAgreement([
      "agree",
      "agree",
      "agree",
      "uncertain",
      "disagree",
    ]);
    expect(summary).toEqual({
      agreed: 3,
      disagreed: 1,
      uncertain: 1,
      total: 5,
      rate: 0.6,
    });
    expect(meetsAgreementFloor(summary)).toBe(false);
  });

  it("meets the floor at exactly 0.8 and gives no rate for no pairs", () => {
    const atFloor = summarizeAgreement([
      "agree",
      "agree",
      "agree",
      "agree",
      "uncertain",
    ]);
    expect(atFloor.rate).toBe(0.8);
    expect(meetsAgreementFloor(atFloor)).toBe(true);
    const empty = summarizeAgreement([]);
    expect(empty.rate).toBeNull();
    expect(meetsAgreementFloor(empty)).toBe(false);
  });
});
