import { describe, expect, test } from "vitest";
import type {
  Answer,
  ChoiceAnswer,
  NoulAnswer,
  ScoreAnswer,
} from "../shared/answer.js";
import type { Criterion, Predicate } from "../shared/pack.js";
import {
  DEFAULT_MIN_CONFIDENCE,
  decideVerdict,
  readVerdictValue,
} from "./verdict.js";

/** Builds a noul criterion with the given thresholds. */
function noulCriterion(thresholds: Partial<Criterion>): Criterion {
  return {
    id: "typography/faint-body-text",
    title: "Faint body text",
    source: "WCAG 2.2 SC 1.4.3",
    fix: "Darken the body text.",
    question: {
      type: "noul",
      instructions: "Is the body text faint?",
      criteria: { true: "Faint.", false: "Not faint." },
    },
    ...thresholds,
  };
}

/** Builds a three-level score criterion with the given thresholds. */
function scoreCriterion(thresholds: Partial<Criterion>): Criterion {
  return {
    id: "layout/single-focal-point",
    title: "Single focal point",
    source: "Refactoring UI",
    fix: "Make one element dominant.",
    question: {
      type: "score",
      instructions: "How many elements compete for attention?",
      levels: [
        "One clear focal point.",
        "Two compete.",
        "Three or more compete.",
      ],
    },
    ...thresholds,
  };
}

/** Builds a choice criterion with the given options, in that order, and thresholds. */
function choiceCriterion(
  options: readonly string[],
  thresholds: Partial<Criterion>,
): Criterion {
  const listedOptions = [];
  for (const option of options) {
    listedOptions.push({ option, description: `Option ${option}.` });
  }
  return {
    id: "layout/alignment",
    title: "Alignment",
    source: "Refactoring UI",
    fix: "Align the text to one edge.",
    question: {
      type: "choice",
      instructions: "How is the text aligned?",
      criteria: listedOptions,
    },
    ...thresholds,
  };
}

/** Builds a noul answer with the given probability of true. */
function noulAnswer(probabilityOfTrue: number): NoulAnswer {
  return {
    question_id: "typography/faint-body-text",
    model: "jev-test",
    type: "noul",
    distribution: { true: probabilityOfTrue, false: 1 - probabilityOfTrue },
    confidence: null,
  };
}

/** Builds a score answer from a distribution keyed by level index. */
function scoreAnswer(
  distribution: Record<string, number>,
  confidence = 0.9,
): ScoreAnswer {
  return {
    question_id: "layout/single-focal-point",
    model: "jev-test",
    type: "score",
    distribution,
    confidence,
  };
}

/** Builds a choice answer from a distribution keyed by option name. */
function choiceAnswer(
  distribution: Record<string, number>,
  confidence = 0.9,
): ChoiceAnswer {
  return {
    question_id: "layout/alignment",
    model: "jev-test",
    type: "choice",
    distribution,
    confidence,
  };
}

/** Builds a score answer whose most probable level is the given index, out of three levels. */
function scoreAnswerAtLevel(levelIndex: number, confidence = 0.9): ScoreAnswer {
  const distribution: Record<string, number> = { "0": 0.1, "1": 0.1, "2": 0.1 };
  distribution[String(levelIndex)] = 0.8;
  return scoreAnswer(distribution, confidence);
}

describe("the example table under FR-25", () => {
  const faintBodyText = noulCriterion({
    fail_when: { probability_at_least: 0.7 },
  });
  const singleFocalPoint = scoreCriterion({
    pass_when: { level_at_most: 0 },
    warn_when: { level_at_most: 1 },
  });

  test("faint-body-text with probability of true 0.8 gives fail", () => {
    expect(decideVerdict(faintBodyText, noulAnswer(0.8))).toBe("fail");
  });

  test("faint-body-text with probability of true 0.3 gives pass", () => {
    expect(decideVerdict(faintBodyText, noulAnswer(0.3))).toBe("pass");
  });

  test("faint-body-text with probability of true 0.5 gives uncertain", () => {
    expect(decideVerdict(faintBodyText, noulAnswer(0.5))).toBe("uncertain");
  });

  test("single-focal-point with most probable level 0 gives pass", () => {
    expect(decideVerdict(singleFocalPoint, scoreAnswerAtLevel(0))).toBe("pass");
  });

  test("single-focal-point with most probable level 1 gives warn", () => {
    expect(decideVerdict(singleFocalPoint, scoreAnswerAtLevel(1))).toBe("warn");
  });

  test("single-focal-point with most probable level 2 gives fail", () => {
    expect(decideVerdict(singleFocalPoint, scoreAnswerAtLevel(2))).toBe("fail");
  });
});

describe("min_confidence for choice and score (FR-27, OQ-10)", () => {
  test("the default is 0.5", () => {
    expect(DEFAULT_MIN_CONFIDENCE).toBe(0.5);
  });

  test("US-9: min_confidence 0.6 with confidence 0.5 gives uncertain even when fail_when matches", () => {
    const criterion = scoreCriterion({
      fail_when: { level_at_least: 2 },
      min_confidence: 0.6,
    });
    const answer = scoreAnswerAtLevel(2, 0.5);
    const answerBefore = structuredClone(answer);
    expect(decideVerdict(criterion, answer)).toBe("uncertain");
    expect(answer).toEqual(answerBefore);
  });

  test("confidence equal to min_confidence goes on to the predicates", () => {
    const criterion = scoreCriterion({
      fail_when: { level_at_least: 2 },
      min_confidence: 0.6,
    });
    expect(decideVerdict(criterion, scoreAnswerAtLevel(2, 0.6))).toBe("fail");
  });

  test("with no min_confidence, confidence 0.49 gives uncertain and 0.5 does not", () => {
    const criterion = choiceCriterion(["left", "centre"], {
      pass_when: { option_is: "left" },
    });
    expect(
      decideVerdict(criterion, choiceAnswer({ left: 0.9, centre: 0.1 }, 0.49)),
    ).toBe("uncertain");
    expect(
      decideVerdict(criterion, choiceAnswer({ left: 0.9, centre: 0.1 }, 0.5)),
    ).toBe("pass");
  });

  test("a low-confidence answer is uncertain even when pass_when would match", () => {
    const criterion = scoreCriterion({ pass_when: { level_at_most: 0 } });
    expect(decideVerdict(criterion, scoreAnswerAtLevel(0, 0.2))).toBe(
      "uncertain",
    );
  });
});

describe("the noul uncertain band (step 1, OQ-21)", () => {
  const criterion = noulCriterion({ fail_when: { probability_at_least: 0.6 } });

  test("0.65 with fail_when probability_at_least 0.6 gives uncertain", () => {
    expect(decideVerdict(criterion, noulAnswer(0.65))).toBe("uncertain");
  });

  test("0.3 is outside the band", () => {
    expect(decideVerdict(criterion, noulAnswer(0.3))).toBe("pass");
  });

  test("0.7 is outside the band", () => {
    expect(decideVerdict(criterion, noulAnswer(0.7))).toBe("fail");
  });

  test("just inside each end is uncertain", () => {
    expect(decideVerdict(criterion, noulAnswer(0.30001))).toBe("uncertain");
    expect(decideVerdict(criterion, noulAnswer(0.69999))).toBe("uncertain");
  });
});

describe("each predicate at its boundary (FR-25 predicate table)", () => {
  /** Returns the verdict for a criterion whose only predicate is the given fail_when. */
  function failVerdict(
    baseCriterion: Criterion,
    predicate: Predicate,
    answer: Answer,
  ) {
    return decideVerdict({ ...baseCriterion, fail_when: predicate }, answer);
  }
  const noul = noulCriterion({});
  const score = scoreCriterion({});
  const choice = choiceCriterion(["left", "centre", "right"], {});

  test("probability_at_least matches at and above n, not below", () => {
    const predicate = { probability_at_least: 0.8 };
    expect(failVerdict(noul, predicate, noulAnswer(0.8))).toBe("fail");
    expect(failVerdict(noul, predicate, noulAnswer(0.9))).toBe("fail");
    expect(failVerdict(noul, predicate, noulAnswer(0.79))).toBe("pass");
  });

  test("probability_at_most matches at and below n, not above", () => {
    const predicate = { probability_at_most: 0.2 };
    expect(failVerdict(noul, predicate, noulAnswer(0.2))).toBe("fail");
    expect(failVerdict(noul, predicate, noulAnswer(0.1))).toBe("fail");
    expect(failVerdict(noul, predicate, noulAnswer(0.21))).toBe("pass");
  });

  test("level_at_most matches at and below i, not above", () => {
    const predicate = { level_at_most: 1 };
    expect(failVerdict(score, predicate, scoreAnswerAtLevel(1))).toBe("fail");
    expect(failVerdict(score, predicate, scoreAnswerAtLevel(0))).toBe("fail");
    expect(failVerdict(score, predicate, scoreAnswerAtLevel(2))).toBe("pass");
  });

  test("level_at_least matches at and above i, not below", () => {
    const predicate = { level_at_least: 1 };
    expect(failVerdict(score, predicate, scoreAnswerAtLevel(1))).toBe("fail");
    expect(failVerdict(score, predicate, scoreAnswerAtLevel(2))).toBe("fail");
    expect(failVerdict(score, predicate, scoreAnswerAtLevel(0))).toBe("pass");
  });

  test("option_is matches only the named option", () => {
    const predicate = { option_is: "centre" };
    expect(
      failVerdict(
        choice,
        predicate,
        choiceAnswer({ left: 0.1, centre: 0.8, right: 0.1 }),
      ),
    ).toBe("fail");
    expect(
      failVerdict(
        choice,
        predicate,
        choiceAnswer({ left: 0.8, centre: 0.1, right: 0.1 }),
      ),
    ).toBe("pass");
  });

  test("option_in matches any of the named options", () => {
    const predicate = { option_in: ["centre", "right"] };
    expect(
      failVerdict(
        choice,
        predicate,
        choiceAnswer({ left: 0.1, centre: 0.1, right: 0.8 }),
      ),
    ).toBe("fail");
    expect(
      failVerdict(
        choice,
        predicate,
        choiceAnswer({ left: 0.8, centre: 0.1, right: 0.1 }),
      ),
    ).toBe("pass");
  });
});

describe("readVerdictValue (FR-25 step 2)", () => {
  test("noul reads the probability of true", () => {
    expect(readVerdictValue(noulCriterion({}), noulAnswer(0.8))).toEqual({
      type: "noul",
      probabilityOfTrue: 0.8,
    });
  });

  test("score reads the most probable level, not an expected value", () => {
    const answer = scoreAnswer({ "0": 0.45, "1": 0.1, "2": 0.44 });
    expect(readVerdictValue(scoreCriterion({}), answer)).toEqual({
      type: "score",
      levelIndex: 0,
    });
  });

  test("choice reads the most probable option", () => {
    const criterion = choiceCriterion(["left", "centre", "right"], {});
    const answer = choiceAnswer({ left: 0.2, centre: 0.3, right: 0.5 });
    expect(readVerdictValue(criterion, answer)).toEqual({
      type: "choice",
      option: "right",
    });
  });

  test("a score tie goes to the lower level", () => {
    const answer = scoreAnswer({ "0": 0.4, "1": 0.4, "2": 0.2 });
    expect(readVerdictValue(scoreCriterion({}), answer)).toEqual({
      type: "score",
      levelIndex: 0,
    });
  });

  test("a choice tie goes to the option listed first, whatever the distribution's key order", () => {
    const criterion = choiceCriterion(["right", "left"], {});
    const answer = choiceAnswer({ left: 0.5, right: 0.5 });
    expect(readVerdictValue(criterion, answer)).toEqual({
      type: "choice",
      option: "right",
    });
  });

  test("a choice tie with integer-like option names goes to the option listed first", () => {
    // A JavaScript object lists "1" before "2" whatever order the keys were written in.
    const criterion = choiceCriterion(["2", "1"], {});
    const answer = choiceAnswer({ "1": 0.5, "2": 0.5 });
    expect(readVerdictValue(criterion, answer)).toEqual({
      type: "choice",
      option: "2",
    });
  });

  test("a missing level or option throws", () => {
    expect(() =>
      readVerdictValue(scoreCriterion({}), scoreAnswer({ "0": 0.5, "1": 0.5 })),
    ).toThrow(/level 2/);
    const criterion = choiceCriterion(["left", "centre"], {});
    expect(() =>
      readVerdictValue(criterion, choiceAnswer({ left: 1 })),
    ).toThrow(/centre/);
  });
});

describe("order of checks and fallback (FR-25 steps 3 and 4)", () => {
  test("pass_when beats warn_when when both match", () => {
    const criterion = scoreCriterion({
      pass_when: { level_at_most: 1 },
      warn_when: { level_at_most: 1 },
    });
    expect(decideVerdict(criterion, scoreAnswerAtLevel(1))).toBe("pass");
  });

  test("warn_when beats fail_when when both match", () => {
    const criterion = scoreCriterion({
      warn_when: { level_at_least: 1 },
      fail_when: { level_at_least: 1 },
    });
    expect(decideVerdict(criterion, scoreAnswerAtLevel(2))).toBe("warn");
  });

  test("a criterion with only warn_when gets warn or pass, never fail (FR-56)", () => {
    const criterion = scoreCriterion({ warn_when: { level_at_least: 1 } });
    expect(decideVerdict(criterion, scoreAnswerAtLevel(0))).toBe("pass");
    expect(decideVerdict(criterion, scoreAnswerAtLevel(1))).toBe("warn");
    expect(decideVerdict(criterion, scoreAnswerAtLevel(2))).toBe("warn");
  });
});

describe("determinism and inputs", () => {
  test("the same criterion and answer give the same verdict on every call (NFR-5)", () => {
    const criterion = scoreCriterion({
      pass_when: { level_at_most: 0 },
      warn_when: { level_at_most: 1 },
    });
    const answer = scoreAnswerAtLevel(1);
    const verdicts = new Set<string>();
    for (let call = 0; call < 50; call++) {
      verdicts.add(decideVerdict(criterion, answer));
    }
    expect([...verdicts]).toEqual(["warn"]);
  });

  test("a box answer throws a plain Error", () => {
    const answer: Answer = {
      question_id: "layout/alignment#box",
      model: "jev-test",
      type: "box",
      region: { x: 0, y: 0, width: 10, height: 10 },
      confidence: null,
    };
    expect(() => decideVerdict(noulCriterion({}), answer)).toThrow(
      /box answer/,
    );
  });

  test("an answer whose type differs from the question type throws", () => {
    expect(() => decideVerdict(scoreCriterion({}), noulAnswer(0.9))).toThrow(
      /score question/,
    );
  });

  test("a predicate that does not fit the question type throws", () => {
    const criterion = noulCriterion({ fail_when: { level_at_least: 1 } });
    expect(() => decideVerdict(criterion, noulAnswer(0.9))).toThrow(
      /does not fit/,
    );
  });
});
