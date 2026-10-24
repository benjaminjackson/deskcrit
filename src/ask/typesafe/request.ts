// The pure half of the real TypeSafe adapter: build the one request for an image, and check the
// SDK response that comes back (CS-7, CS-20, FR-19 to FR-23). Nothing here reads the environment,
// the file system, or the network. Only this folder knows TypeSafe's request format (AC-8).

import {
  type ContentValue,
  image,
  type RequestOptions,
  type Question as SdkQuestion,
  type Questions as SdkQuestions,
  type SystemOneRequest,
} from "@typesafe-ai/sdk";
import type { Answer, Region } from "../../shared/answer.js";
import { CouldNotRunError } from "../../shared/could-not-run-error.js";
import type { Question } from "../../shared/question.js";
import { IMAGE_STATE_PATH, type State } from "../../shared/state.js";
import type { Usage } from "../../shared/usage.js";

/**
 * The model id ask sends when `.crit.yaml` pins none (FR-22, JC-8). Provisional: set to the newest
 * versioned id crit is released against after M-1. M-1 ran on this id on 2026-10-24 (JC-10).
 */
export const DEFAULT_MODEL_ID = "jev-1.14.0";

/** The alias that must never be sent, because its answers change when TypeSafe ships a model (FR-22, NFR-6, JC-8). */
const FORBIDDEN_MODEL_ID = "jev-latest";

/** The opt-in header every request with an image or a Box question must carry (FR-19, NFR-8, JC-7). */
const DANGER_ZONE_HEADERS: Readonly<Record<string, string>> = {
  "TypeSafe-Danger-Zone-Images": "true",
};

/** TypeSafe's price in US dollars per million input tokens; output is free. The SDK reports no cost (JC-10, FR-23). */
const PRICE_USD_PER_MILLION_INPUT_TOKENS = 0.042;

/** The request body and the per-call options, ready for `client.systemOne(body, options)` (FR-19). */
export type TypeSafeRequest = {
  readonly body: SystemOneRequest<SdkQuestions>;
  readonly options: RequestOptions;
};

/** The pixel size of the prepared image, used to turn Box fractions into a pixel Region (FR-8). */
type ImageSize = {
  readonly width: number;
  readonly height: number;
};

/** What the response check returns: one answer per question, and usage without latency (FR-20, FR-23). */
type CheckedResponse = {
  readonly answers: Answer[];
  readonly usage: Omit<Usage, "latency_ms">;
};

/**
 * Return the model id to send: the one the CLI passes from `.crit.yaml`, or DEFAULT_MODEL_ID when
 * none is pinned (FR-22). The `??` operator picks the right side only when the left is undefined.
 */
export function chooseModelId(pinnedModel: string | undefined): string {
  return pinnedModel ?? DEFAULT_MODEL_ID;
}

/**
 * Build the one request for one image: the model id, the danger-zone header, the state with its
 * image once, and every question in order (FR-14, FR-15, FR-19, FR-22, CS-20). It throws a plain
 * Error for `jev-latest` or a duplicate question id, because both are broken invariants (CS-16).
 */
export function buildTypeSafeRequest(
  state: State,
  questions: readonly Question[],
  model: string,
): TypeSafeRequest {
  if (model === FORBIDDEN_MODEL_ID) {
    throw new Error(
      `the model id ${FORBIDDEN_MODEL_ID} must never be sent (FR-22, NFR-6)`,
    );
  }
  const sdkQuestions: SdkQuestions = {};
  for (const question of questions) {
    // Object.hasOwn checks the object's own keys only, so an id such as "toString" cannot match
    // a property inherited from Object.prototype.
    if (Object.hasOwn(sdkQuestions, question.id)) {
      throw new Error(`duplicate question id ${question.id}`);
    }
    sdkQuestions[question.id] = toSdkQuestion(question);
  }
  return {
    body: { model, state: toSdkState(state), questions: sdkQuestions },
    options: { headers: { ...DANGER_ZONE_HEADERS } },
  };
}

/**
 * Turn crit's state into the SDK's state: the image once under IMAGE_STATE_PATH as an SDK Image,
 * then the context and the facts unchanged (FR-15, FR-17, JC-6). The SDK sends the image as one
 * file part and writes its reference string where the Image sits.
 */
function toSdkState(state: State): Record<string, ContentValue> {
  const sdkState: Record<string, ContentValue> = {
    [IMAGE_STATE_PATH]: image(state[IMAGE_STATE_PATH].bytes),
  };
  if (state.context !== undefined) {
    const context: Record<string, ContentValue> = {};
    for (const [key, value] of Object.entries(state.context)) {
      if (value !== undefined) {
        context[key] = value;
      }
    }
    sdkState.context = context;
  }
  if (state.facts !== undefined) {
    sdkState.facts = toJsonContent(state.facts, "facts");
  }
  return sdkState;
}

/**
 * Copy a value that came from a JSON file into the SDK's content type, checking each part, so no
 * cast is needed (CS-7, FR-17). Anything that JSON cannot hold is a broken invariant, because the
 * CLI parsed the facts file as JSON.
 */
function toJsonContent(value: unknown, where: string): ContentValue {
  if (value === null) {
    return null;
  }
  if (typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    const items: ContentValue[] = [];
    for (const [index, item] of value.entries()) {
      items.push(toJsonContent(item, `${where}[${index}]`));
    }
    return items;
  }
  if (isRecord(value)) {
    const fields: Record<string, ContentValue> = {};
    for (const [key, item] of Object.entries(value)) {
      fields[key] = toJsonContent(item, `${where}.${key}`);
    }
    return fields;
  }
  throw new Error(`${where} is not a JSON value`);
}

/**
 * Turn one crit question into the SDK's question. The instructions name the image by its state
 * path, so no question carries a copy of the image (FR-15, FR-21, JC-6).
 */
function toSdkQuestion(question: Question): SdkQuestion {
  switch (question.type) {
    case "noul":
      return {
        type: "noul",
        instructions: question.instructions,
        criteria: {
          true: question.criteria.true,
          false: question.criteria.false,
        },
      };
    case "choice":
      return {
        type: "choice",
        instructions: question.instructions,
        criteria: toChoiceCriteria(question.id, question.criteria),
      };
    case "score": {
      const [first, second, ...rest] = question.levels;
      if (first === undefined || second === undefined) {
        throw new Error(`${question.id}: a score question needs two levels`);
      }
      return {
        type: "score",
        instructions: question.instructions,
        criteria: [first, second, ...rest],
      };
    }
    case "box":
      return { type: "box", instructions: question.instructions };
    default: {
      // `never` is the type with no values. If every question type has a case above, the
      // compiler knows this line cannot run; a new type with no case makes this a compile error.
      const unhandled: never = question;
      throw new Error(`unknown question type: ${JSON.stringify(unhandled)}`);
    }
  }
}

/**
 * Turn the ordered option list into the SDK's object of option name to description, and refuse
 * when the object would not keep the pack's order (JC-3, FR-25). JavaScript moves option names
 * that look like whole numbers, such as "2", to the front of an object.
 */
function toChoiceCriteria(
  questionId: string,
  options: ReadonlyArray<{
    readonly option: string;
    readonly description: string;
  }>,
): Record<string, string> {
  const criteria: Record<string, string> = {};
  for (const entry of options) {
    criteria[entry.option] = entry.description;
  }
  const keptOrder = Object.keys(criteria);
  for (const [index, entry] of options.entries()) {
    if (keptOrder[index] !== entry.option) {
      throw new CouldNotRunError(
        `${questionId}: choice option names must be unique and must not look like whole numbers, or their order is lost`,
      );
    }
  }
  return criteria;
}

/**
 * Tell whether a value is a plain object with string keys. This is a type guard: when it returns
 * true, TypeScript treats the value as a Record from then on.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Read a number from 0 to 1, or throw CouldNotRunError that names the field and not the value (FR-24). */
function readFraction(value: unknown, where: string): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new CouldNotRunError(
      `TypeSafe returned a malformed answer: ${where} is not a number from 0 to 1`,
    );
  }
  return value;
}

/**
 * TypeSafe sends a noul answer as the probability of true only, with two decimal places (all 310
 * noul values in spike/results have two). Work out the probability of false as 1 - true and round
 * it to the same two places, so true + false is exactly 1 at that precision and the result does
 * not carry float noise such as 0.07999999999999996 that the model never sent (FR-26).
 */
function deriveProbabilityFalse(probabilityTrue: number): number {
  const placesFactor = 100;
  return Math.round((1 - probabilityTrue) * placesFactor) / placesFactor;
}

/**
 * Read a map of label to probability that holds exactly the expected labels, and return it in the
 * expected order (FR-20). Anything missing or extra throws CouldNotRunError (CS-7, FR-24).
 */
function readDistribution(
  probabilities: unknown,
  expectedLabels: readonly string[],
  where: string,
): Record<string, number> {
  if (!isRecord(probabilities)) {
    throw new CouldNotRunError(
      `TypeSafe returned a malformed answer: ${where} is missing`,
    );
  }
  const expected = new Set(expectedLabels);
  for (const label of Object.keys(probabilities)) {
    if (!expected.has(label)) {
      throw new CouldNotRunError(
        `TypeSafe returned a malformed answer: ${where} has a label that is not an option`,
      );
    }
  }
  const distribution: Record<string, number> = {};
  for (const label of expectedLabels) {
    if (!Object.hasOwn(probabilities, label)) {
      throw new CouldNotRunError(
        `TypeSafe returned a malformed answer: ${where}.${label} is missing`,
      );
    }
    distribution[label] = readFraction(
      probabilities[label],
      `${where}.${label}`,
    );
  }
  return distribution;
}

/**
 * Turn a Box answer's edges, fractions of the image's width and height, into a pixel Region of
 * the prepared image (FR-8, FR-16). No rounding: compose maps it back to the original image.
 */
function readRegion(box: unknown, imageSize: ImageSize, where: string): Region {
  if (!isRecord(box)) {
    throw new CouldNotRunError(
      `TypeSafe returned a malformed answer: ${where} is missing`,
    );
  }
  const top = readFraction(box.top, `${where}.top`);
  const bottom = readFraction(box.bottom, `${where}.bottom`);
  const left = readFraction(box.left, `${where}.left`);
  const right = readFraction(box.right, `${where}.right`);
  if (left > right || top > bottom) {
    throw new CouldNotRunError(
      `TypeSafe returned a malformed answer: ${where} has an edge past its opposite edge`,
    );
  }
  return {
    x: left * imageSize.width,
    y: top * imageSize.height,
    width: (right - left) * imageSize.width,
    height: (bottom - top) * imageSize.height,
  };
}

/**
 * Check one answer against its question and return crit's typed answer, with the model id from
 * the response (FR-20, FR-21, US-10). A noul answer has no confidence (FR-26).
 */
function readAnswer(
  rawAnswer: unknown,
  question: Question,
  model: string,
  imageSize: ImageSize,
): Answer {
  const where = `answers.${question.id}`;
  if (!isRecord(rawAnswer)) {
    throw new CouldNotRunError(
      `TypeSafe returned no answer for question ${question.id}`,
    );
  }
  if (rawAnswer.type !== question.type) {
    throw new CouldNotRunError(
      `TypeSafe returned a malformed answer: ${where}.type is not ${question.type}`,
    );
  }
  switch (question.type) {
    case "noul": {
      const probabilityTrue = readFraction(rawAnswer.noul, `${where}.noul`);
      return {
        type: "noul",
        question_id: question.id,
        model,
        distribution: {
          true: probabilityTrue,
          false: deriveProbabilityFalse(probabilityTrue),
        },
        confidence: null,
      };
    }
    case "choice": {
      const optionNames: string[] = [];
      for (const entry of question.criteria) {
        optionNames.push(entry.option);
      }
      return {
        type: "choice",
        question_id: question.id,
        model,
        distribution: readDistribution(
          rawAnswer.probabilities,
          optionNames,
          `${where}.probabilities`,
        ),
        confidence: readFraction(rawAnswer.confidence, `${where}.confidence`),
      };
    }
    case "score": {
      const levelKeys: string[] = [];
      for (const index of question.levels.keys()) {
        levelKeys.push(String(index));
      }
      return {
        type: "score",
        question_id: question.id,
        model,
        distribution: readDistribution(
          rawAnswer.probabilities,
          levelKeys,
          `${where}.probabilities`,
        ),
        confidence: readFraction(rawAnswer.confidence, `${where}.confidence`),
      };
    }
    case "box": {
      let confidence: number | null = null;
      if (rawAnswer.confidence !== null) {
        confidence = readFraction(rawAnswer.confidence, `${where}.confidence`);
      }
      return {
        type: "box",
        question_id: question.id,
        model,
        region: readRegion(rawAnswer.box, imageSize, `${where}.box`),
        confidence,
      };
    }
    default: {
      const unhandled: never = question;
      throw new Error(`unknown question type: ${JSON.stringify(unhandled)}`);
    }
  }
}

/**
 * Read the input token count. TypeSafe may report none (the SDK types it as a number or null).
 * Then this returns null and the cost is unknown, so answers already paid for are kept (FR-23,
 * CS-7). A count that is there but is not a whole number still stops the run (FR-24).
 */
function readInputTokens(usage: unknown): number | null {
  if (!isRecord(usage)) {
    throw new CouldNotRunError("TypeSafe returned no usage");
  }
  const inputTokens = usage.input_tokens;
  if (inputTokens === null || inputTokens === undefined) {
    return null;
  }
  if (
    typeof inputTokens !== "number" ||
    !Number.isInteger(inputTokens) ||
    inputTokens < 0
  ) {
    throw new CouldNotRunError(
      "TypeSafe returned a malformed usage: input_tokens is not a whole number",
    );
  }
  return inputTokens;
}

/** Compute the cost in US dollars at the JC-10 price, or null when the token count is unknown (FR-23). */
function computeCostUsd(inputTokens: number | null): number | null {
  if (inputTokens === null) {
    return null;
  }
  return (inputTokens * PRICE_USD_PER_MILLION_INPUT_TOKENS) / 1_000_000;
}

/**
 * Check the SDK response, which enters as unknown, and return one typed answer per question in
 * question order plus usage without latency. This is the one checking function for TypeSafe
 * responses (CS-7, FR-20, FR-23, US-10). Any missing or malformed part throws CouldNotRunError,
 * so no partial answer list is ever returned (FR-24). A missing token count is not a failure:
 * usage then holds null for input_tokens and cost_usd (FR-23).
 */
export function readTypeSafeResponse(
  response: unknown,
  questions: readonly Question[],
  imageSize: ImageSize,
): CheckedResponse {
  if (!isRecord(response)) {
    throw new CouldNotRunError(
      "TypeSafe returned a response that is not an object",
    );
  }
  const model = response.model;
  if (typeof model !== "string" || model.trim() === "") {
    throw new CouldNotRunError("TypeSafe returned no model id");
  }
  const rawAnswers = response.answers;
  if (!isRecord(rawAnswers)) {
    throw new CouldNotRunError("TypeSafe returned no answers");
  }
  const knownIds = new Set<string>();
  for (const question of questions) {
    knownIds.add(question.id);
  }
  for (const id of Object.keys(rawAnswers)) {
    if (!knownIds.has(id)) {
      throw new CouldNotRunError(
        "TypeSafe returned an answer for a question that was not asked",
      );
    }
  }
  const answers: Answer[] = [];
  for (const question of questions) {
    answers.push(
      readAnswer(rawAnswers[question.id], question, model, imageSize),
    );
  }
  const inputTokens = readInputTokens(response.usage);
  return {
    answers,
    usage: {
      input_tokens: inputTokens,
      cost_usd: computeCostUsd(inputTokens),
      model,
    },
  };
}
