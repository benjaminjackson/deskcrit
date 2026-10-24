// The rule that a list of answers fits the questions build made: unique question ids, exactly one
// answer per question, the right type, and the right distribution keys (FR-20). Ask uses it on what
// an adapter returns, and the CLI uses it on a recorded answers file (FR-42). It does no I/O.

import type { Answer } from "./answer.js";
import type { Question } from "./question.js";

/**
 * Return a message that says how the answers do not fit the questions, or undefined when they fit
 * (FR-20, FR-42). The caller picks the error: ask throws a plain Error, because a mismatch there is
 * an adapter bug, and the CLI throws CouldNotRunError, because a recorded file is input (CS-16).
 */
export function findAnswersMismatch(
  questions: readonly Question[],
  answers: readonly Answer[],
): string | undefined {
  const questionById = new Map<string, Question>();
  for (const question of questions) {
    if (questionById.has(question.id)) {
      return `two questions have the id ${question.id}`;
    }
    questionById.set(question.id, question);
  }
  const answeredIds = new Set<string>();
  for (const answer of answers) {
    const question = questionById.get(answer.question_id);
    if (question === undefined) {
      return `an answer for unknown question ${answer.question_id}`;
    }
    if (answeredIds.has(answer.question_id)) {
      return `two answers for question ${answer.question_id}`;
    }
    const answerMismatch = findAnswerMismatch(question, answer);
    if (answerMismatch !== undefined) {
      return answerMismatch;
    }
    answeredIds.add(answer.question_id);
  }
  for (const question of questions) {
    if (!answeredIds.has(question.id)) {
      return `no answer for question ${question.id}`;
    }
  }
  return undefined;
}

/**
 * Return a message unless the answer has the question's type and, for a choice or score question,
 * a distribution over exactly the question's options or level indexes. A noul answer must have a
 * null confidence, because TypeSafe reports none for noul (FR-20, FR-21, FR-26).
 */
function findAnswerMismatch(
  question: Question,
  answer: Answer,
): string | undefined {
  const where = `question ${question.id}`;
  if (answer.type !== question.type) {
    return `a ${answer.type} answer for ${question.type} ${where}`;
  }
  switch (question.type) {
    case "noul":
      if (answer.confidence !== null) {
        return `a confidence for noul ${where}`;
      }
      return undefined;
    case "choice": {
      const options: string[] = [];
      for (const entry of question.criteria) {
        options.push(entry.option);
      }
      return findDistributionKeysMismatch(answer, options, where);
    }
    case "score": {
      const levelKeys: string[] = [];
      for (const index of question.levels.keys()) {
        levelKeys.push(String(index));
      }
      return findDistributionKeysMismatch(answer, levelKeys, where);
    }
    case "box":
      return undefined;
    default: {
      // `never` is the type with no values. If every question type has a case above, the
      // compiler knows this line cannot run; a new type with no case makes this a compile error.
      const unhandled: never = question;
      throw new Error(`unknown question type: ${JSON.stringify(unhandled)}`);
    }
  }
}

/**
 * Return a message unless the answer's distribution has exactly the expected keys, in any order,
 * so compose never reads an option or level the question did not ask about (FR-20, FR-25).
 */
function findDistributionKeysMismatch(
  answer: Answer,
  expectedKeys: readonly string[],
  where: string,
): string | undefined {
  if (answer.type === "box") {
    return `a box answer for ${where}`;
  }
  const actualKeys = Object.keys(answer.distribution);
  let keysMatch = actualKeys.length === expectedKeys.length;
  for (const key of expectedKeys) {
    if (!Object.hasOwn(answer.distribution, key)) {
      keysMatch = false;
    }
  }
  if (!keysMatch) {
    return `distribution keys ${actualKeys.join(", ")} for ${where}; expected ${expectedKeys.join(", ")}`;
  }
  return undefined;
}
