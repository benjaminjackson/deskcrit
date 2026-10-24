import { describe, expect, it } from "vitest";
import {
  DEFAULT_MIN_CONFIDENCE,
  measureQuestionMovement,
  type Observation,
  spread,
  summarizeWobble,
} from "./movement.ts";

/** Build an observation from a plain distribution and confidence. */
function observe(
  distribution: Record<string, number>,
  confidence: number | null,
): Observation {
  return { distribution, confidence };
}

describe("spread", () => {
  it("is the largest value minus the smallest", () => {
    expect(spread([0.4, 0.9, 0.5])).toBeCloseTo(0.5);
  });

  it("is 0 for one value and for no values", () => {
    expect(spread([0.3])).toBe(0);
    expect(spread([])).toBe(0);
  });
});

describe("measureQuestionMovement", () => {
  it("takes the largest spread of any option and the spread of confidence", () => {
    const movement = measureQuestionMovement("choice-question", [
      observe({ a: 0.5, b: 0.3, c: 0.2 }, 0.4),
      observe({ a: 0.6, b: 0.1, c: 0.3 }, 0.7),
      observe({ a: 0.55, b: 0.25, c: 0.2 }, 0.5),
    ]);
    expect(movement.probabilityMovement).toBeCloseTo(0.2);
    expect(movement.confidenceMovement).toBeCloseTo(0.3);
  });

  it("gives a null confidence movement for noul, and the yes probability movement", () => {
    const movement = measureQuestionMovement("noul-question", [
      observe({ true: 0.8, false: 0.2 }, null),
      observe({ true: 0.7, false: 0.3 }, null),
    ]);
    expect(movement.probabilityMovement).toBeCloseTo(0.1);
    expect(movement.confidenceMovement).toBeNull();
  });

  it("refuses runs with different options or a confidence in only some runs", () => {
    expect(() =>
      measureQuestionMovement("q", [
        observe({ a: 1 }, null),
        observe({ b: 1 }, null),
      ]),
    ).toThrow("same options");
    expect(() =>
      measureQuestionMovement("q", [
        observe({ a: 1 }, 0.5),
        observe({ a: 1 }, null),
      ]),
    ).toThrow("only some runs");
    expect(() => measureQuestionMovement("q", [])).toThrow("no runs");
  });
});

describe("summarizeWobble", () => {
  const movements = [
    { question: "a", probabilityMovement: 0.11, confidenceMovement: null },
    { question: "b", probabilityMovement: 0.05, confidenceMovement: 0.22 },
  ];

  it("reports the largest of each and passes when 0.5 sits above the confidence movement", () => {
    const summary = summarizeWobble(movements);
    expect(summary.largestProbabilityMovement).toBeCloseTo(0.11);
    expect(summary.largestConfidenceMovement).toBeCloseTo(0.22);
    expect(summary.minConfidence).toBe(DEFAULT_MIN_CONFIDENCE);
    expect(summary.minConfidenceSitsAbove).toBe(true);
  });

  it("fails when the confidence movement reaches the minimum", () => {
    const reaches = summarizeWobble(
      [{ question: "c", probabilityMovement: 0, confidenceMovement: 0.5 }],
      0.5,
    );
    expect(reaches.minConfidenceSitsAbove).toBe(false);
  });
});
