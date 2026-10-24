// The package entry point of deskcrit: the library that a caller imports to run the stages by
// hand (FR-63, FR-64, FR-65, US-13). It only re-exports what the stages and src/shared/ define. It
// holds no logic and no wrapper types, and it is the one barrel file that CS-2 allows. The CLI in
// src/cli/ imports the stage functions from here, so the CLI and the library run the same code.
// The gate export (crit-8cu.3) goes in this file when the function exists (FR-63). Biome keeps the exports sorted by path, so each block follows that order.

/**
 * Ask: send the state and the questions through the adapter that the caller gives. The stub
 * adapter answers with no network call and no key. The real TypeSafe adapter is not exported
 * (FR-20, FR-23, FR-24, FR-64).
 */
export type { AskRequest, AskResult, TypeSafeAdapter } from "./ask/adapter.js";
export { ask } from "./ask/ask.js";
export type { StubOptions } from "./ask/stub.js";
export { createStubAdapter, STUB_MODEL_ID } from "./ask/stub.js";

/** Build: make the one state and one question per criterion, and list the skipped criteria (FR-12 to FR-17). */
export { buildQuestions as build } from "./build/build.js";
export type { BuildInput, BuildResult, Skipped } from "./build/types.js";

/**
 * Compose: turn the packs, questions, image record, and answers into one report document, and
 * compare two finished reports per criterion (FR-25 to FR-28, FR-33, FR-34 to FR-37, FR-39,
 * sections 8.1 and 8.2).
 */
export type {
  BetterDirection,
  Change,
  ChangeSide,
  CompareInput,
  CompareReport,
  CompareSkipped,
  CompareSummary,
  CriterionChange,
  ReportWithoutUsage,
} from "./compose/compare.js";
export { compare } from "./compose/compare.js";
export type { ComposeInput } from "./compose/compose.js";
export { compose } from "./compose/compose.js";
export type {
  Finding,
  Report,
  ReportImage,
  ReportPack,
  ReportSkipped,
  ReportUsage,
} from "./compose/report.js";
export type { Verdict } from "./compose/verdict.js";

/**
 * The pack loader: parse and check the text of one pack.yaml, so a caller can make the packs that
 * build and compose take (FR-11, FR-44, US-6). Benjamin Jackson decided on 2026-10-24 to export it.
 */
export { loadPack } from "./packs/load-pack.js";

/** Prepare: turn one PNG or JPEG into the image that TypeSafe accepts (FR-5 to FR-8, FR-10, FR-73). */
export type { ImageFormat, PreparedImage } from "./prepare/prepare.js";
export { prepareImage as prepare } from "./prepare/prepare.js";

/**
 * The shared types that pass between the stages: answers, the error every stage throws when the
 * run cannot go on (exit code 2 in the CLI), packs, questions, the state, and usage (FR-4, FR-20,
 * FR-21, FR-24, FR-44, CS-16).
 */
export type {
  Answer,
  BoxAnswer,
  ChoiceAnswer,
  NoulAnswer,
  Region,
  ScoreAnswer,
} from "./shared/answer.js";
export { CouldNotRunError } from "./shared/could-not-run-error.js";
export type {
  Criterion,
  Pack,
  PackChoiceQuestion,
  PackFixtures,
  PackNoulQuestion,
  PackQuestion,
  PackScoreQuestion,
  Predicate,
  PredicateKind,
} from "./shared/pack.js";
export type {
  BoxQuestion,
  ChoiceQuestion,
  NoulQuestion,
  Question,
  QuestionType,
  ScoreQuestion,
} from "./shared/question.js";
export type { Context, State, StateImage } from "./shared/state.js";
export type { Usage } from "./shared/usage.js";
