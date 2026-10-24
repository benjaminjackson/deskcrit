// The typed answers ask returns, one per question (FR-20, FR-21). Field names are the wire names,
// because the answers file under FR-42 stores these values as they are (CS-10).

/** The fields every answer has: the id of the question it answers and the model that gave it (FR-20). */
type AnswerBase = {
  readonly question_id: string;
  readonly model: string;
};

/**
 * A yes or no answer. It has no confidence, because TypeSafe reports none for Noul and the
 * probability already carries the uncertainty. The adapter makes none up (FR-20, FR-26).
 */
export type NoulAnswer = AnswerBase & {
  readonly type: "noul";
  readonly distribution: { readonly true: number; readonly false: number };
  readonly confidence: null;
};

/** One of a set: the probability of each option, keyed by option name, and TypeSafe's confidence (FR-20). */
export type ChoiceAnswer = AnswerBase & {
  readonly type: "choice";
  readonly distribution: Readonly<Record<string, number>>;
  readonly confidence: number;
};

/**
 * A degree: the probability of each level, keyed by the level index "0" to "n-1", and TypeSafe's
 * confidence (FR-20). Compose uses the most probable level, not an expected value.
 */
export type ScoreAnswer = AnswerBase & {
  readonly type: "score";
  readonly distribution: Readonly<Record<string, number>>;
  readonly confidence: number;
};

/**
 * A rectangle in pixels of the prepared image. Compose maps it back to the original (FR-8).
 * TypeSafe returns a box as top, bottom, left and right fractions of the image, so the real
 * adapter (crit-cy8.7) converts them to pixels with the prepared image's width and height.
 */
export type Region = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/**
 * Where a criterion's defect is. It carries a region instead of a distribution. The SDK gives a
 * number or null as its confidence, and what that number means is open (OQ-21).
 */
export type BoxAnswer = AnswerBase & {
  readonly type: "box";
  readonly region: Region;
  readonly confidence: number | null;
};

/** Every answer type: the three text primitives and Box, and nothing else (FR-21). */
export type Answer = NoulAnswer | ChoiceAnswer | ScoreAnswer | BoxAnswer;
