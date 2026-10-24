// The pure arithmetic of the wobble check (EV-6, NFR-5, OQ-10). It takes plain numbers and does
// no I/O, so the run-wobble.ts script can be rewritten without touching it.

/** The default min_confidence that a choice or score finding must reach (OQ-10). */
export const DEFAULT_MIN_CONFIDENCE = 0.5;

/** What one run of crit reported for one question: each option's probability and the confidence. */
export type Observation = {
  /** Probability of each option, keyed by option name. A noul question has the keys true and false. */
  readonly distribution: Readonly<Record<string, number>>;
  /** The confidence TypeSafe reported, or null for a noul question, which has none (FR-26). */
  readonly confidence: number | null;
};

/** How far one question's numbers moved across the runs (EV-6). */
export type QuestionMovement = {
  readonly question: string;
  /** The largest movement of any option probability. For noul it is the larger spread of the true and false probabilities. */
  readonly probabilityMovement: number;
  /** The movement of reported confidence, or null when no run reported one (noul). */
  readonly confidenceMovement: number | null;
};

/** The largest movements over all questions, and whether the default min_confidence sits above them (EV-6). */
export type WobbleSummary = {
  readonly largestProbabilityMovement: number;
  readonly largestConfidenceMovement: number;
  readonly minConfidence: number;
  readonly minConfidenceSitsAbove: boolean;
};

/** Return the largest value minus the smallest value, which is how far the values moved (EV-6). */
export function spread(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  let smallest = values[0] as number;
  let largest = values[0] as number;
  for (const value of values) {
    if (value < smallest) {
      smallest = value;
    }
    if (value > largest) {
      largest = value;
    }
  }
  return largest - smallest;
}

/**
 * Measure how far one question's option probabilities and confidence moved across the runs. The
 * probability movement is the largest spread of any one option. It refuses runs whose option names
 * differ, because that means the questions changed between runs (EV-6).
 */
export function measureQuestionMovement(
  question: string,
  observations: readonly Observation[],
): QuestionMovement {
  const firstObservation = observations[0];
  if (firstObservation === undefined) {
    throw new Error(`${question}: no runs to compare`);
  }
  const optionNames = Object.keys(firstObservation.distribution).sort();
  let probabilityMovement = 0;
  for (const optionName of optionNames) {
    const probabilities: number[] = [];
    for (const observation of observations) {
      const probability = observation.distribution[optionName];
      if (
        probability === undefined ||
        Object.keys(observation.distribution).length !== optionNames.length
      ) {
        throw new Error(`${question}: the runs do not have the same options`);
      }
      probabilities.push(probability);
    }
    probabilityMovement = Math.max(probabilityMovement, spread(probabilities));
  }

  const confidences: number[] = [];
  for (const observation of observations) {
    if (observation.confidence !== null) {
      confidences.push(observation.confidence);
    }
  }
  let confidenceMovement: number | null = null;
  if (confidences.length === observations.length) {
    confidenceMovement = spread(confidences);
  } else if (confidences.length > 0) {
    throw new Error(`${question}: only some runs reported a confidence`);
  }
  return { question, probabilityMovement, confidenceMovement };
}

/**
 * Take the largest movement of each kind over all questions and say whether minConfidence sits
 * strictly above the largest confidence movement, which is the pass rule of EV-6 and OQ-10.
 */
export function summarizeWobble(
  movements: readonly QuestionMovement[],
  minConfidence: number = DEFAULT_MIN_CONFIDENCE,
): WobbleSummary {
  let largestProbabilityMovement = 0;
  let largestConfidenceMovement = 0;
  for (const movement of movements) {
    largestProbabilityMovement = Math.max(
      largestProbabilityMovement,
      movement.probabilityMovement,
    );
    if (movement.confidenceMovement !== null) {
      largestConfidenceMovement = Math.max(
        largestConfidenceMovement,
        movement.confidenceMovement,
      );
    }
  }
  return {
    largestProbabilityMovement,
    largestConfidenceMovement,
    minConfidence,
    minConfidenceSitsAbove: minConfidence > largestConfidenceMovement,
  };
}
