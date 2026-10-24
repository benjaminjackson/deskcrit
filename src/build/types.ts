// The input and output of the build stage (FR-12 to FR-17). The shared types it carries, such as
// Pack, Question, State, and StateImage, live in src/shared/ (CS-5, CS-6).

import type { Pack } from "../shared/pack.js";
import type { Question } from "../shared/question.js";
import type { Context, State, StateImage } from "../shared/state.js";

/**
 * What build takes: the parsed packs in the order given, the prepared image, the context, and the
 * parsed facts file, or undefined when no facts file was given (FR-3, FR-12 to FR-17). The image is
 * a StateImage and not prepare's PreparedImage, because a stage imports no other stage (CS-6).
 * A PreparedImage fits here as it is, because it has every StateImage field.
 */
export type BuildInput = {
  readonly packs: readonly Pack[];
  readonly image: StateImage;
  readonly context: Context;
  readonly facts: unknown;
};

/**
 * One criterion that build did not ask, and why (FR-12, FR-13). `criterion` is
 * "<pack name>/<criterion id>", as in the report's `skipped` list (section 8.1).
 */
export type Skipped = {
  readonly criterion: string;
  readonly reason: string;
};

/** What build returns: the one state, the questions in pack and criterion order, and the skipped criteria (FR-12 to FR-17). */
export type BuildResult = {
  readonly state: State;
  readonly questions: Question[];
  readonly skipped: Skipped[];
};
