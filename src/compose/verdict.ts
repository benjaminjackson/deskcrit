// The verdict rule from docs/PRD.md section 7.5, "Verdict rule for FR-25". Code decides every
// verdict from the answer's distribution and the criterion's thresholds, so the model never picks
// one and the same answer always gives the same verdict (FR-25, FR-27, NFR-5).

import type { Answer } from "../shared/answer.js";
import type { Criterion, Predicate } from "../shared/pack.js";

/**
 * The confidence below which a choice or score answer is uncertain, when the criterion does not
 * set `min_confidence`. Decided 2026-10-24 (OQ-10). It does not apply to noul answers, which have
 * no confidence (FR-20).
 */
export const DEFAULT_MIN_CONFIDENCE = 0.5;

/**
 * A noul probability of true above this value and below NOUL_UNCERTAIN_BAND_UPPER is uncertain.
 * The value itself is outside the band (verdict rule step 1, OQ-21).
 */
const NOUL_UNCERTAIN_BAND_LOWER = 0.3;

/**
 * A noul probability of true below this value and above NOUL_UNCERTAIN_BAND_LOWER is uncertain.
 * The value itself is outside the band (verdict rule step 1, OQ-21).
 */
const NOUL_UNCERTAIN_BAND_UPPER = 0.7;

/** The four verdicts a finding can have, with the wire names (FR-25, FR-27, CS-8). */
export type Verdict = "pass" | "warn" | "fail" | "uncertain";

/**
 * The one value the verdict rule compares (FR-25 step 2): the probability of true for noul, the
 * index of the most probable level for score, and the most probable option for choice.
 */
export type VerdictValue =
  | { readonly type: "noul"; readonly probabilityOfTrue: number }
  | { readonly type: "score"; readonly levelIndex: number }
  | { readonly type: "choice"; readonly option: string };

/**
 * Reads the value that step 2 of the verdict rule names (FR-25 step 2). Compare reads the same
 * value (FR-36). A tie goes to the lower level index or the option listed first, so the loops run
 * over the criterion's levels and options and never over the distribution's own key order.
 */
export function readVerdictValue(
  criterion: Criterion,
  answer: Answer,
): VerdictValue {
  const question = criterion.question;
  switch (answer.type) {
    case "noul": {
      if (question.type !== "noul") {
        throw mismatchError(criterion, answer);
      }
      return { type: "noul", probabilityOfTrue: answer.distribution.true };
    }
    case "score": {
      if (question.type !== "score") {
        throw mismatchError(criterion, answer);
      }
      let bestLevelIndex = -1;
      let bestProbability = -1;
      for (
        let levelIndex = 0;
        levelIndex < question.levels.length;
        levelIndex++
      ) {
        const probability = answer.distribution[String(levelIndex)];
        if (probability === undefined) {
          throw new Error(
            `Score answer for criterion "${criterion.id}" has no probability for level ${levelIndex}.`,
          );
        }
        // Strictly greater, so on a tie the earlier (lower) level keeps the lead.
        if (probability > bestProbability) {
          bestLevelIndex = levelIndex;
          bestProbability = probability;
        }
      }
      if (bestLevelIndex === -1) {
        throw new Error(`Criterion "${criterion.id}" has no levels.`);
      }
      return { type: "score", levelIndex: bestLevelIndex };
    }
    case "choice": {
      if (question.type !== "choice") {
        throw mismatchError(criterion, answer);
      }
      let bestOption: string | undefined;
      let bestProbability = -1;
      for (const listedOption of question.criteria) {
        const probability = answer.distribution[listedOption.option];
        if (probability === undefined) {
          throw new Error(
            `Choice answer for criterion "${criterion.id}" has no probability for option "${listedOption.option}".`,
          );
        }
        // Strictly greater, so on a tie the option listed first keeps the lead.
        if (probability > bestProbability) {
          bestOption = listedOption.option;
          bestProbability = probability;
        }
      }
      if (bestOption === undefined) {
        throw new Error(`Criterion "${criterion.id}" has no options.`);
      }
      return { type: "choice", option: bestOption };
    }
    case "box": {
      throw new Error(
        `Criterion "${criterion.id}" got a box answer, but the verdict rule reads only text answers.`,
      );
    }
    default: {
      // `never` is the type with no values. If a new answer type is added and not handled above,
      // this line stops compiling (CS-9).
      const unhandledAnswer: never = answer;
      throw new Error(
        `Unknown answer type: ${JSON.stringify(unhandledAnswer)}`,
      );
    }
  }
}

/**
 * Decides the verdict for one criterion from its text answer, by steps 1 to 4 of the verdict rule
 * (FR-25, FR-27, OQ-10, OQ-21). It does not change the answer or the criterion.
 */
export function decideVerdict(criterion: Criterion, answer: Answer): Verdict {
  // Read the value first, so that a box answer or an answer that does not fit the question type
  // throws even when step 1 would give uncertain.
  const value = readVerdictValue(criterion, answer);

  if (isUncertain(criterion, answer)) {
    return "uncertain";
  }

  if (criterion.pass_when !== undefined) {
    if (predicateMatches(criterion, criterion.pass_when, value)) {
      return "pass";
    }
  }
  if (criterion.warn_when !== undefined) {
    if (predicateMatches(criterion, criterion.warn_when, value)) {
      return "warn";
    }
  }
  if (criterion.fail_when !== undefined) {
    if (predicateMatches(criterion, criterion.fail_when, value)) {
      return "fail";
    }
  }

  if (criterion.pass_when !== undefined) {
    return "fail";
  }
  return "pass";
}

/**
 * Applies step 1 of the verdict rule: a choice or score answer below min_confidence is uncertain
 * (FR-27, OQ-10), and a noul probability of true strictly between 0.3 and 0.7 is uncertain (OQ-21).
 */
function isUncertain(criterion: Criterion, answer: Answer): boolean {
  switch (answer.type) {
    case "noul": {
      const probabilityOfTrue = answer.distribution.true;
      return (
        probabilityOfTrue > NOUL_UNCERTAIN_BAND_LOWER &&
        probabilityOfTrue < NOUL_UNCERTAIN_BAND_UPPER
      );
    }
    case "score":
    case "choice": {
      // `??` uses the right side only when the left side is undefined or null.
      const minConfidence = criterion.min_confidence ?? DEFAULT_MIN_CONFIDENCE;
      return answer.confidence < minConfidence;
    }
    case "box": {
      throw new Error(
        `Criterion "${criterion.id}" got a box answer, but the verdict rule reads only text answers.`,
      );
    }
    default: {
      const unhandledAnswer: never = answer;
      throw new Error(
        `Unknown answer type: ${JSON.stringify(unhandledAnswer)}`,
      );
    }
  }
}

/**
 * Checks one predicate against the value from step 2, with inclusive bounds (FR-25 predicate
 * table). A predicate that does not fit the value's type means the loader let a bad pack through,
 * so it throws a plain Error (CS-16).
 */
function predicateMatches(
  criterion: Criterion,
  predicate: Predicate,
  value: VerdictValue,
): boolean {
  // `"key" in predicate` tells TypeScript which of the one-key predicate shapes this is.
  if ("probability_at_least" in predicate) {
    return (
      readProbabilityOfTrue(criterion, value) >= predicate.probability_at_least
    );
  }
  if ("probability_at_most" in predicate) {
    return (
      readProbabilityOfTrue(criterion, value) <= predicate.probability_at_most
    );
  }
  if ("level_at_most" in predicate) {
    return readLevelIndex(criterion, value) <= predicate.level_at_most;
  }
  if ("level_at_least" in predicate) {
    return readLevelIndex(criterion, value) >= predicate.level_at_least;
  }
  if ("option_is" in predicate) {
    return readOption(criterion, value) === predicate.option_is;
  }
  if ("option_in" in predicate) {
    return predicate.option_in.includes(readOption(criterion, value));
  }
  const unhandledPredicate: never = predicate;
  throw new Error(`Unknown predicate: ${JSON.stringify(unhandledPredicate)}`);
}

/** Returns the probability of true from a noul value, for the probability predicates (FR-25). */
function readProbabilityOfTrue(
  criterion: Criterion,
  value: VerdictValue,
): number {
  if (value.type !== "noul") {
    throw predicateMismatchError(criterion, value);
  }
  return value.probabilityOfTrue;
}

/** Returns the most probable level index from a score value, for the level predicates (FR-25). */
function readLevelIndex(criterion: Criterion, value: VerdictValue): number {
  if (value.type !== "score") {
    throw predicateMismatchError(criterion, value);
  }
  return value.levelIndex;
}

/** Returns the most probable option from a choice value, for the option predicates (FR-25). */
function readOption(criterion: Criterion, value: VerdictValue): string {
  if (value.type !== "choice") {
    throw predicateMismatchError(criterion, value);
  }
  return value.option;
}

/** Builds the error for an answer whose type differs from its criterion's question type (FR-25). */
function mismatchError(criterion: Criterion, answer: Answer): Error {
  return new Error(
    `Criterion "${criterion.id}" asks a ${criterion.question.type} question but got a ${answer.type} answer.`,
  );
}

/** Builds the error for a predicate that does not fit the question type, which the loader rejects (FR-25). */
function predicateMismatchError(
  criterion: Criterion,
  value: VerdictValue,
): Error {
  return new Error(
    `Criterion "${criterion.id}" has a predicate that does not fit its ${value.type} question.`,
  );
}
