// The questions build makes and ask sends: one text question per criterion, plus one Box question
// for each criterion that sets `locate: true` (FR-14, FR-16, FR-21). Field names follow the wire
// format (CS-8, CS-10).

/** The fields every question has. `criterion` is "<pack id>/<criterion id>" (FR-14). */
type QuestionBase = {
  readonly id: string;
  readonly criterion: string;
  readonly instructions: string;
};

/** A yes or no question. `true` names the defect (JC-5, FR-21). */
export type NoulQuestion = QuestionBase & {
  readonly type: "noul";
  readonly criteria: { readonly true: string; readonly false: string };
};

/**
 * One of a set of options. The options are a list, not an object keyed by option name, because
 * JavaScript moves integer-like keys such as "1" to the front of an object, and the pack's order
 * must hold (JC-3, FR-25).
 */
export type ChoiceQuestion = QuestionBase & {
  readonly type: "choice";
  readonly criteria: ReadonlyArray<{
    readonly option: string;
    readonly description: string;
  }>;
};

/** A degree along described levels, listed from level 0 upward (FR-21). */
export type ScoreQuestion = QuestionBase & {
  readonly type: "score";
  readonly levels: readonly string[];
};

/**
 * A request for the region where a criterion's defect is. Its instructions are the criterion's
 * `locate_instructions` (FR-16). Box is used only for regions, never for a judgment (FR-21).
 */
export type BoxQuestion = QuestionBase & {
  readonly type: "box";
};

/** Every question ask can send: the three text primitives and Box, and nothing else (FR-21). */
export type Question =
  | NoulQuestion
  | ChoiceQuestion
  | ScoreQuestion
  | BoxQuestion;

/** The literal names of the question types, the same as the wire format (CS-8). */
export type QuestionType = Question["type"];

/**
 * Return the id of the Box question for a criterion, so compose can pair it with the text
 * question, whose id is the criterion itself (FR-16).
 */
export function boxQuestionIdFor(criterion: string): string {
  return `${criterion}#box`;
}
