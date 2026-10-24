// The ask stage: send the state and every question through the adapter the caller gives, and
// return the answers and usage as the adapter reported them (FR-20, FR-23, FR-24, FR-64). This
// file does no I/O and knows nothing of TypeSafe's request format (AC-8, CS-6).

import type { Answer } from "../shared/answer.js";
import type { Question, QuestionType } from "../shared/question.js";
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
  checkAnswersMatchQuestions(questions, result.answers);
  return { answers: result.answers, usage: result.usage };
}

/**
 * Throw a plain Error unless there is exactly one answer per question, with the question's id and
 * type (FR-20). The adapter already checked TypeSafe's response (CS-7), so a mismatch here is a
 * bug in the adapter and not bad input (CS-16).
 */
function checkAnswersMatchQuestions(
  questions: readonly Question[],
  answers: readonly Answer[],
): void {
  const questionTypeById = new Map<string, QuestionType>();
  for (const question of questions) {
    questionTypeById.set(question.id, readQuestionType(question));
  }
  const answeredIds = new Set<string>();
  for (const answer of answers) {
    const questionType = questionTypeById.get(answer.question_id);
    if (questionType === undefined) {
      throw new Error(
        `adapter returned an answer for unknown question ${answer.question_id}`,
      );
    }
    if (answeredIds.has(answer.question_id)) {
      throw new Error(
        `adapter returned two answers for question ${answer.question_id}`,
      );
    }
    if (answer.type !== questionType) {
      throw new Error(
        `adapter returned a ${answer.type} answer for ${questionType} question ${answer.question_id}`,
      );
    }
    answeredIds.add(answer.question_id);
  }
  for (const question of questions) {
    if (!answeredIds.has(question.id)) {
      throw new Error(`adapter returned no answer for question ${question.id}`);
    }
  }
}

/**
 * Return a question's type name, and fail to compile when a new question type is added and not
 * handled here (FR-21, CS-9).
 */
function readQuestionType(question: Question): QuestionType {
  switch (question.type) {
    case "noul":
    case "choice":
    case "score":
    case "box":
      return question.type;
    default: {
      // `never` is the type with no values. If every question type has a case above, the
      // compiler knows this line cannot run; a new type with no case makes this a compile error.
      const unhandled: never = question;
      throw new Error(`unknown question type: ${JSON.stringify(unhandled)}`);
    }
  }
}
