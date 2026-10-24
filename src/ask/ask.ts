// The ask stage: send the state and every question through the adapter the caller gives, and
// return the answers and usage as the adapter reported them (FR-20, FR-23, FR-24, FR-64). This
// file does no I/O and knows nothing of TypeSafe's request format (AC-8, CS-6).

import { findAnswersMismatch } from "../shared/answers-mismatch.js";
import type { Question } from "../shared/question.js";
import type { State } from "../shared/state.js";
import type { AskResult, TypeSafeAdapter } from "./adapter.js";

/**
 * Ask every question about the state in one adapter call and return its answers and its usage
 * object unchanged (FR-19, FR-20, FR-23, FR-33, FR-64). The adapter is required and has no default.
 * An adapter error is not caught, so it stops ask with no partial result (FR-24).
 */
export async function ask(
  state: State,
  questions: readonly Question[],
  adapter: TypeSafeAdapter,
): Promise<AskResult> {
  const result = await adapter.askQuestions({ state, questions });
  // The adapter already checked TypeSafe's response (CS-7), so a mismatch here is a bug in the
  // adapter, not bad input, and gets a plain Error (CS-16).
  const mismatch = findAnswersMismatch(questions, result.answers);
  if (mismatch !== undefined) {
    throw new Error(
      `adapter returned answers that do not fit the questions: ${mismatch}`,
    );
  }
  return { answers: result.answers, usage: result.usage };
}
