// The ask stage: send the state and every question through the adapter the caller gives, and
// return the answers and usage as the adapter reported them (FR-20, FR-23, FR-24, FR-64). This
// file does no I/O and knows nothing of TypeSafe's request format (AC-8, CS-6).

import type { Answer } from "../shared/answer.js";
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
  checkAnswersMatchQuestions(questions, result.answers);
  return { answers: result.answers, usage: result.usage };
}

/**
 * Throw a plain Error unless the question ids are unique and there is exactly one answer per
 * question, with the question's id, type and distribution keys (FR-20). The adapter already
 * checked TypeSafe's response (CS-7), so a mismatch here is a bug in the adapter, not bad input (CS-16).
 */
function checkAnswersMatchQuestions(
  questions: readonly Question[],
  answers: readonly Answer[],
): void {
  const questionById = new Map<string, Question>();
  for (const question of questions) {
    if (questionById.has(question.id)) {
      throw new Error(`two questions have the id ${question.id}`);
    }
    questionById.set(question.id, question);
  }
  const answeredIds = new Set<string>();
  for (const answer of answers) {
    const question = questionById.get(answer.question_id);
    if (question === undefined) {
      throw new Error(
        `adapter returned an answer for unknown question ${answer.question_id}`,
      );
    }
    if (answeredIds.has(answer.question_id)) {
      throw new Error(
        `adapter returned two answers for question ${answer.question_id}`,
      );
    }
    checkAnswerFitsQuestion(question, answer);
    answeredIds.add(answer.question_id);
  }
  for (const question of questions) {
    if (!answeredIds.has(question.id)) {
      throw new Error(`adapter returned no answer for question ${question.id}`);
    }
  }
}

/**
 * Throw a plain Error unless the answer has the question's type and, for a text question, a
 * distribution over exactly the question's options or levels. A noul answer must have a null
 * confidence, because TypeSafe reports none for noul (FR-20, FR-21, FR-26).
 */
function checkAnswerFitsQuestion(question: Question, answer: Answer): void {
  const where = `question ${question.id}`;
  if (answer.type !== question.type) {
    throw new Error(
      `adapter returned a ${answer.type} answer for ${question.type} ${where}`,
    );
  }
  switch (question.type) {
    case "noul":
      if (answer.confidence !== null) {
        throw new Error(`adapter returned a confidence for noul ${where}`);
      }
      return;
    case "choice": {
      const options: string[] = [];
      for (const entry of question.criteria) {
        options.push(entry.option);
      }
      checkDistributionKeys(answer, options, where);
      return;
    }
    case "score": {
      const levelKeys: string[] = [];
      for (const index of question.levels.keys()) {
        levelKeys.push(String(index));
      }
      checkDistributionKeys(answer, levelKeys, where);
      return;
    }
    case "box":
      return;
    default: {
      // `never` is the type with no values. If every question type has a case above, the
      // compiler knows this line cannot run; a new type with no case makes this a compile error.
      const unhandled: never = question;
      throw new Error(`unknown question type: ${JSON.stringify(unhandled)}`);
    }
  }
}

/**
 * Throw a plain Error unless the answer's distribution has exactly the expected keys, in any
 * order, so compose never reads an option or level the question did not ask about (FR-20, FR-25).
 */
function checkDistributionKeys(
  answer: Answer,
  expectedKeys: readonly string[],
  where: string,
): void {
  if (answer.type === "box") {
    throw new Error(`adapter returned a box answer for ${where}`);
  }
  const actualKeys = Object.keys(answer.distribution);
  let keysMatch = actualKeys.length === expectedKeys.length;
  for (const key of expectedKeys) {
    if (!Object.hasOwn(answer.distribution, key)) {
      keysMatch = false;
    }
  }
  if (!keysMatch) {
    throw new Error(
      `adapter returned distribution keys ${actualKeys.join(", ")} for ${where}; expected ${expectedKeys.join(", ")}`,
    );
  }
}
