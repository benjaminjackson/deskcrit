// The one interface between ask and a backend (FR-20, FR-64). The adapter is a plain object with
// one method, askQuestions, and not a bare function type, because CS-11 says adapters are plain
// objects that match the adapter type. Only src/ask/typesafe/ knows TypeSafe's request format,
// its headers, and how it reports usage (AC-8).

import type { Answer } from "../shared/answer.js";
import type { Question } from "../shared/question.js";
import type { State } from "../shared/state.js";
import type { Usage } from "../shared/usage.js";

/** What ask hands the adapter: the state once and every question about it (FR-15, FR-19, FR-20). */
export type AskRequest = {
  readonly state: State;
  readonly questions: readonly Question[];
};

/** What an adapter gives back: one typed answer per question and one usage object (FR-20, FR-64). */
export type AskResult = {
  readonly answers: readonly Answer[];
  readonly usage: Usage;
};

/**
 * One backend for ask: the real TypeSafe adapter, the stub, or any other (FR-20, FR-64). When the
 * backend returns an error or cannot be reached, askQuestions rejects with a CouldNotRunError (FR-24).
 */
export type TypeSafeAdapter = {
  readonly askQuestions: (request: AskRequest) => Promise<AskResult>;
};
