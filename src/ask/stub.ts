// The stub adapter: answers every question with no network call, zeros in usage, and a stub model
// id (FR-20, US-13). Tests and offline runs pass it to ask in place of the real adapter (FR-64).

import type { Answer } from "../shared/answer.js";
import type { Question } from "../shared/question.js";
import type { Usage } from "../shared/usage.js";
import type { AskRequest, AskResult, TypeSafeAdapter } from "./adapter.js";

/** The model id on every stub answer and in the stub's usage object (FR-20). */
export const STUB_MODEL_ID = "stub";

/** What the stub does instead of the default: return these answers, or reject with this error. */
export type StubOptions = {
  readonly answers?: readonly Answer[];
  readonly failWith?: Error;
};

/**
 * Make a stub adapter (FR-20, US-13). By default it answers each question with a fixed "no defect"
 * answer. With `answers` it returns those unchanged, so a test chooses the answers. With
 * `failWith` it rejects with that error, as the real adapter does when TypeSafe fails (FR-24).
 */
export function createStubAdapter(options: StubOptions = {}): TypeSafeAdapter {
  return {
    askQuestions: async (request: AskRequest): Promise<AskResult> => {
      if (options.failWith !== undefined) {
        throw options.failWith;
      }
      let answers: readonly Answer[];
      if (options.answers !== undefined) {
        answers = options.answers;
      } else {
        answers = request.questions.map(buildDefaultAnswer);
      }
      const usage: Usage = {
        input_tokens: 0,
        cost_usd: 0,
        latency_ms: 0,
        model: STUB_MODEL_ID,
      };
      return { answers, usage };
    },
  };
}

/**
 * Build the stub's fixed answer for one question: no defect for noul, the first option for choice,
 * level 0 for score, and an empty region for box (FR-20, FR-21).
 */
function buildDefaultAnswer(question: Question): Answer {
  switch (question.type) {
    case "noul":
      return {
        type: "noul",
        question_id: question.id,
        model: STUB_MODEL_ID,
        distribution: { true: 0, false: 1 },
        confidence: null,
      };
    case "choice": {
      const distribution: Record<string, number> = {};
      for (const [index, entry] of question.criteria.entries()) {
        if (index === 0) {
          distribution[entry.option] = 1;
        } else {
          distribution[entry.option] = 0;
        }
      }
      return {
        type: "choice",
        question_id: question.id,
        model: STUB_MODEL_ID,
        distribution,
        confidence: 1,
      };
    }
    case "score": {
      const distribution: Record<string, number> = {};
      for (const index of question.levels.keys()) {
        if (index === 0) {
          distribution[String(index)] = 1;
        } else {
          distribution[String(index)] = 0;
        }
      }
      return {
        type: "score",
        question_id: question.id,
        model: STUB_MODEL_ID,
        distribution,
        confidence: 1,
      };
    }
    case "box":
      return {
        type: "box",
        question_id: question.id,
        model: STUB_MODEL_ID,
        region: { x: 0, y: 0, width: 0, height: 0 },
        confidence: null,
      };
    default: {
      // `never` is the type with no values. If every question type has a case above, the
      // compiler knows this line cannot run; a new type with no case makes this a compile error.
      const unhandled: never = question;
      throw new Error(`unknown question type: ${JSON.stringify(unhandled)}`);
    }
  }
}
