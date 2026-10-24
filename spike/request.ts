// Pure functions for the M-1 spike (crit-oj5.2). Nothing in this file reads files, the
// environment, or the network, so request.test.ts can check it with plain values (CS-20).
// This is disposable spike code: CS-5 and CS-6 apply to src/, which the spike does not create.

import { zstdDecompressSync } from "node:zlib";
import type {
  Image,
  Question,
  Questions,
  RequestOptions,
  SystemOneRequest,
} from "@typesafe-ai/sdk";

/** The pinned, versioned Jev model id. Never `jev-latest` (FR-22, NFR-6). Decided 2026-10-23. */
export const PINNED_MODEL = "jev-1.14.0";

/** The header every request that holds an image must carry (FR-19, NFR-8). */
export const DANGER_ZONE_HEADERS = { "TypeSafe-Danger-Zone-Images": "true" };

/** Price of one input token in US dollars: $0.042 per million (JC-10). The SDK reports no cost. */
export const PRICE_USD_PER_INPUT_TOKEN = 0.042 / 1_000_000;

/** The number of questions crit-oj5.1 wrote (M-1). */
export const EXPECTED_QUESTION_COUNT = 20;

/** The state key that holds the image. Every question says "the image at screenshot" (FR-15). */
export const SCREENSHOT_STATE_KEY = "screenshot";

/** Image limits from the TypeSafe images page: each side 280 to 1568 px, area at most 2,458,624 px. */
export const IMAGE_SIDE_MIN = 280;
export const IMAGE_SIDE_MAX = 1568;
export const IMAGE_AREA_MAX = 2_458_624;

/** One question from spike/questions.yaml, after the check in parseQuestionFile. */
export type SpikeQuestion =
  | {
      id: string;
      type: "noul";
      instructions: string;
      criteria: { true: string; false: string } | null;
    }
  | {
      id: string;
      type: "choice";
      instructions: string;
      options: Record<string, string>;
    }
  | {
      id: string;
      type: "score";
      instructions: string;
      levels: readonly [string, string, ...string[]];
    };

/** The two conditions the spike compares to settle OQ-2. */
export type Condition = "with_purpose" | "without_purpose";

/** One answer as it goes into a results file. Field names are snake_case (CS-10). */
export type QuestionRecord = {
  id: string;
  type: "noul" | "choice" | "score";
  model: string;
  distribution: Record<string, number>;
  confidence: number | null;
  confidence_reported: boolean;
  derived_confidence: number | null;
  choice: string | null;
  score: number | null;
};

/** The checked parts of one SDK response. */
export type ParsedResponse = {
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  questions: QuestionRecord[];
};

/** A request body and its per-call options, ready for `client.systemOne(body, options)`. */
export type BuiltRequest = {
  body: SystemOneRequest<Questions>;
  options: RequestOptions;
};

/** What the dry run reads back from the bytes the SDK would send. */
export type WireRequest = {
  danger_zone_header: string | null;
  content_type: string;
  model: unknown;
  state: unknown;
  question_count: number;
  image_part_count: number;
  image_reference_count: number;
};

/**
 * Tell whether a value is a plain object with string keys. This is a type guard: when it returns
 * true, TypeScript treats the value as a Record from then on.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Read a field that must be a non-empty string, or throw with the field's name. */
function readText(
  record: Record<string, unknown>,
  field: string,
  where: string,
): string {
  const value = record[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${where}: ${field} must be a non-empty string`);
  }
  return value;
}

/** Read a map of label to description text, keeping the YAML order, or throw. */
function readTextMap(value: unknown, where: string): Record<string, string> {
  if (!isRecord(value)) {
    throw new Error(`${where} must be a map of label to text`);
  }
  const result: Record<string, string> = {};
  for (const [label, description] of Object.entries(value)) {
    if (typeof description !== "string") {
      throw new Error(`${where}.${label} must be text`);
    }
    result[label] = description;
  }
  return result;
}

/**
 * Check the parsed YAML of spike/questions.yaml and return typed questions, in file order. This is
 * the one checking function for that file (CS-7). It never rewrites question text.
 */
export function parseQuestionFile(raw: unknown): SpikeQuestion[] {
  if (!Array.isArray(raw)) {
    throw new Error("questions.yaml must be a list");
  }
  if (raw.length !== EXPECTED_QUESTION_COUNT) {
    throw new Error(
      `questions.yaml must hold ${EXPECTED_QUESTION_COUNT} questions, found ${raw.length}`,
    );
  }
  const questions: SpikeQuestion[] = [];
  const seenIds = new Set<string>();
  for (const entry of raw) {
    if (!isRecord(entry)) {
      throw new Error("each entry in questions.yaml must be a map");
    }
    const id = readText(entry, "id", "question");
    if (seenIds.has(id)) {
      throw new Error(`duplicate question id ${id}`);
    }
    seenIds.add(id);
    const question = entry.question;
    if (!isRecord(question)) {
      throw new Error(`${id}: question must be a map`);
    }
    const instructions = readText(question, "instructions", id);
    const type = question.type;
    if (type === "noul") {
      let criteria: { true: string; false: string } | null = null;
      if (question.criteria !== undefined) {
        const map = readTextMap(question.criteria, `${id}.criteria`);
        const trueText = map.true;
        const falseText = map.false;
        if (
          trueText === undefined ||
          falseText === undefined ||
          Object.keys(map).length !== 2
        ) {
          throw new Error(
            `${id}: noul criteria must have exactly "true" and "false"`,
          );
        }
        criteria = { true: trueText, false: falseText };
      }
      questions.push({ id, type, instructions, criteria });
    } else if (type === "choice") {
      const options = readTextMap(question.criteria, `${id}.criteria`);
      if (Object.keys(options).length < 2) {
        throw new Error(`${id}: choice needs at least two options`);
      }
      questions.push({ id, type, instructions, options });
    } else if (type === "score") {
      const levels = question.levels;
      if (!Array.isArray(levels)) {
        throw new Error(`${id}: score needs a levels list`);
      }
      const levelTexts: string[] = [];
      for (const level of levels) {
        if (typeof level !== "string") {
          throw new Error(`${id}: each level must be text`);
        }
        levelTexts.push(level);
      }
      const [first, second, ...rest] = levelTexts;
      if (first === undefined || second === undefined) {
        throw new Error(`${id}: score needs at least two levels`);
      }
      questions.push({
        id,
        type,
        instructions,
        levels: [first, second, ...rest],
      });
    } else {
      throw new Error(`${id}: question.type must be noul, choice, or score`);
    }
  }
  return questions;
}

/** Turn one spike question into the plain object the SDK sends. Score levels become criteria. */
export function toSdkQuestion(question: SpikeQuestion): Question {
  switch (question.type) {
    case "noul":
      if (question.criteria === null) {
        return { type: "noul", instructions: question.instructions };
      }
      return {
        type: "noul",
        instructions: question.instructions,
        criteria: question.criteria,
      };
    case "choice":
      return {
        type: "choice",
        instructions: question.instructions,
        criteria: question.options,
      };
    case "score":
      return {
        type: "score",
        instructions: question.instructions,
        criteria: question.levels,
      };
    default: {
      // `never` is the type with no values: if a new question type is added and not handled
      // above, this assignment stops compiling (CS-9).
      const unhandled: never = question;
      throw new Error(`unhandled question ${JSON.stringify(unhandled)}`);
    }
  }
}

/** Turn every spike question into the SDK's map of question name to question, keyed by id. */
function toSdkQuestions(questions: SpikeQuestion[]): Questions {
  const result: Questions = {};
  for (const question of questions) {
    result[question.id] = toSdkQuestion(question);
  }
  return result;
}

/**
 * Build one image request: all twenty questions, the image once in the state under `screenshot`,
 * the purpose line only when given, the pinned model, and the danger-zone header (FR-15, FR-17,
 * FR-19, FR-22, JC-4). The state holds no facts.
 */
export function buildRequest(
  screenshot: Image,
  purpose: string | null,
  questions: SpikeQuestion[],
): BuiltRequest {
  let state: Record<string, Image | string>;
  if (purpose === null) {
    state = { [SCREENSHOT_STATE_KEY]: screenshot };
  } else {
    state = { [SCREENSHOT_STATE_KEY]: screenshot, purpose };
  }
  return {
    body: { model: PINNED_MODEL, state, questions: toSdkQuestions(questions) },
    options: { headers: { ...DANGER_ZONE_HEADERS } },
  };
}

/**
 * Build the one text-only baseline request: the same twenty questions with a placeholder string
 * where the image would be, and no purpose. It holds no image, so it needs no danger-zone header.
 * Its input tokens, taken from a without_purpose run, estimate the tokens the image costs.
 */
export function buildTextOnlyRequest(questions: SpikeQuestion[]): BuiltRequest {
  return {
    body: {
      model: PINNED_MODEL,
      state: { [SCREENSHOT_STATE_KEY]: "(no image)" },
      questions: toSdkQuestions(questions),
    },
    options: {},
  };
}

/** Read a probability that must be a finite number from 0 to 1, or throw. */
function readProbability(value: unknown, where: string): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error(`${where} must be a probability from 0 to 1`);
  }
  return value;
}

/** How far a distribution's probabilities may sum away from 1 before the parser rejects it. */
const DISTRIBUTION_SUM_TOLERANCE = 0.01;

/**
 * Read a map of label to probability that must hold exactly the expected labels, in their order,
 * and sum to 1 within DISTRIBUTION_SUM_TOLERANCE, or throw (FR-20).
 */
function readDistribution(
  probabilities: unknown,
  expectedLabels: string[],
  where: string,
): Record<string, number> {
  if (!isRecord(probabilities)) {
    throw new Error(`${where} is missing`);
  }
  const expected = new Set(expectedLabels);
  for (const label of Object.keys(probabilities)) {
    if (!expected.has(label)) {
      throw new Error(`${where} has a label that is not an option: ${label}`);
    }
  }
  const distribution: Record<string, number> = {};
  let sum = 0;
  for (const label of expectedLabels) {
    // Object.hasOwn checks the object's own keys only, so a label such as "toString" cannot
    // match a property inherited from Object.prototype.
    if (!Object.hasOwn(probabilities, label)) {
      throw new Error(`${where}.${label} is missing`);
    }
    const probability = readProbability(
      probabilities[label],
      `${where}.${label}`,
    );
    distribution[label] = probability;
    sum += probability;
  }
  if (Math.abs(sum - 1) > DISTRIBUTION_SUM_TOLERANCE) {
    throw new Error(
      `${where} sums to ${sum}, not 1 within ${DISTRIBUTION_SUM_TOLERANCE}`,
    );
  }
  return distribution;
}

/** Read a token count that may be null, or throw. */
function readTokenCount(value: unknown, where: string): number | null {
  if (value === null) {
    return null;
  }
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`${where} must be a whole number or null`);
  }
  return value;
}

/**
 * Check one answer against its question and return its record. Noul answers report no confidence,
 * so they record confidence null and a separate derived max(p, 1 - p), as Benjamin Jackson decided
 * on 2026-10-23 (FR-20, FR-26; the product rule waits on crit-dmm).
 */
function parseAnswer(
  answer: unknown,
  question: SpikeQuestion,
  model: string,
): QuestionRecord {
  const where = `answers.${question.id}`;
  if (!isRecord(answer)) {
    throw new Error(`${where} is missing`);
  }
  if (answer.type !== question.type) {
    throw new Error(
      `${where}.type is ${String(answer.type)}, expected ${question.type}`,
    );
  }
  switch (question.type) {
    case "noul": {
      const probabilityTrue = readProbability(answer.noul, `${where}.noul`);
      return {
        id: question.id,
        type: "noul",
        model,
        distribution: { true: probabilityTrue, false: 1 - probabilityTrue },
        confidence: null,
        confidence_reported: false,
        derived_confidence: Math.max(probabilityTrue, 1 - probabilityTrue),
        choice: null,
        score: null,
      };
    }
    case "choice": {
      const distribution = readDistribution(
        answer.probabilities,
        Object.keys(question.options),
        `${where}.probabilities`,
      );
      const choice = answer.choice;
      if (typeof choice !== "string" || !Object.hasOwn(distribution, choice)) {
        throw new Error(`${where}.choice is not one of the options`);
      }
      return {
        id: question.id,
        type: "choice",
        model,
        distribution,
        confidence: readProbability(answer.confidence, `${where}.confidence`),
        confidence_reported: true,
        derived_confidence: null,
        choice,
        score: null,
      };
    }
    case "score": {
      const levelKeys: string[] = [];
      for (
        let levelIndex = 0;
        levelIndex < question.levels.length;
        levelIndex++
      ) {
        levelKeys.push(String(levelIndex));
      }
      const distribution = readDistribution(
        answer.probabilities,
        levelKeys,
        `${where}.probabilities`,
      );
      const score = answer.score;
      if (
        typeof score !== "number" ||
        !Number.isFinite(score) ||
        score < 0 ||
        score > question.levels.length - 1
      ) {
        throw new Error(
          `${where}.score must be a number from 0 to ${question.levels.length - 1}`,
        );
      }
      return {
        id: question.id,
        type: "score",
        model,
        distribution,
        confidence: readProbability(answer.confidence, `${where}.confidence`),
        confidence_reported: true,
        derived_confidence: null,
        choice: null,
        score,
      };
    }
    default: {
      const unhandled: never = question;
      throw new Error(`unhandled question ${JSON.stringify(unhandled)}`);
    }
  }
}

/**
 * Check one SDK response, which enters as unknown, and return its records in question order. This
 * is the one checking function for SDK responses (CS-7).
 */
export function parseResponse(
  raw: unknown,
  questions: SpikeQuestion[],
): ParsedResponse {
  if (!isRecord(raw)) {
    throw new Error("response is not an object");
  }
  const model = raw.model;
  if (typeof model !== "string") {
    throw new Error("response.model is not a string");
  }
  const usage = raw.usage;
  if (!isRecord(usage)) {
    throw new Error("response.usage is missing");
  }
  const answers = raw.answers;
  if (!isRecord(answers)) {
    throw new Error("response.answers is missing");
  }
  const knownIds = new Set<string>();
  for (const question of questions) {
    knownIds.add(question.id);
  }
  for (const id of Object.keys(answers)) {
    if (!knownIds.has(id)) {
      throw new Error(
        `response has an answer for an unknown question id: ${id}`,
      );
    }
  }
  const records: QuestionRecord[] = [];
  for (const question of questions) {
    records.push(parseAnswer(answers[question.id], question, model));
  }
  return {
    model,
    input_tokens: readTokenCount(usage.input_tokens, "usage.input_tokens"),
    output_tokens: readTokenCount(usage.output_tokens, "usage.output_tokens"),
    questions: records,
  };
}

/** Compute the cost of one request from its input tokens at the JC-10 price, or null with no count. */
export function computeCostUsd(inputTokens: number | null): number | null {
  if (inputTokens === null) {
    return null;
  }
  return inputTokens * PRICE_USD_PER_INPUT_TOKEN;
}

/** Return the minimum, median, and maximum of a list of numbers, or null for an empty list. */
export function summarizeNumbers(
  values: number[],
): { min: number; median: number; max: number } | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  let median: number;
  if (sorted.length % 2 === 1) {
    median = sorted[middle] ?? 0;
  } else {
    median = ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
  }
  return { min: sorted[0] ?? 0, median, max: sorted[sorted.length - 1] ?? 0 };
}

/** Read the width and height from a PNG file's IHDR chunk, or throw if the bytes are not a PNG. */
export function readPngSize(bytes: Uint8Array): {
  width: number;
  height: number;
} {
  // The signature is 8 bytes, the IHDR length and type 8 more, then width and height 4 bytes each.
  if (bytes.byteLength < 24) {
    throw new Error("screenshot is too short to be a PNG file");
  }
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let index = 0; index < signature.length; index++) {
    if (bytes[index] !== signature[index]) {
      throw new Error("screenshot is not a PNG file");
    }
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunkType = new TextDecoder("latin1").decode(bytes.subarray(12, 16));
  if (chunkType !== "IHDR") {
    throw new Error("screenshot PNG has no IHDR chunk first");
  }
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/** Throw if an image is outside the TypeSafe size limits, so no paid request is sent for it. */
export function checkImageSize(width: number, height: number): void {
  for (const side of [width, height]) {
    if (side < IMAGE_SIDE_MIN || side > IMAGE_SIDE_MAX) {
      throw new Error(
        `image side ${side} px is outside ${IMAGE_SIDE_MIN} to ${IMAGE_SIDE_MAX} px`,
      );
    }
  }
  if (width * height > IMAGE_AREA_MAX) {
    throw new Error(
      `image area ${width * height} px is over ${IMAGE_AREA_MAX} px`,
    );
  }
}

/** Return a header's value from a fetch headers argument, matching the name without case. */
function readHeader(headers: unknown, name: string): string | null {
  if (!isRecord(headers)) {
    return null;
  }
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === name.toLowerCase() && typeof value === "string") {
      return value;
    }
  }
  return null;
}

/**
 * Read back what the SDK would put on the wire: the danger-zone header, the JSON request part, and
 * the number of image parts. It undoes zstd compression and splits the multipart body. The dry run
 * and the test use it to check FR-15, FR-19, and FR-22 on the real bytes, with no network.
 */
export function readWireRequest(
  headers: unknown,
  body: Uint8Array,
): WireRequest {
  let plain = body;
  if (readHeader(headers, "Content-Encoding") === "zstd") {
    plain = new Uint8Array(zstdDecompressSync(body));
  }
  // latin1 maps every byte to one character, so the binary image parts cannot break the decode.
  const text = new TextDecoder("latin1").decode(plain);
  const contentType = readHeader(headers, "Content-Type") ?? "";
  let jsonText = text;
  let imagePartCount = 0;
  const boundaryMatch = /boundary=(\S+)/.exec(contentType);
  if (boundaryMatch !== null) {
    const parts = text.split(`--${boundaryMatch[1]}`);
    for (const part of parts) {
      if (part.includes('name="request"')) {
        const start = part.indexOf("\r\n\r\n") + 4;
        jsonText = part.slice(start, part.length - 2);
      } else if (part.includes('name="asset-')) {
        imagePartCount++;
      }
    }
  }
  const payload: unknown = JSON.parse(jsonText);
  if (!isRecord(payload)) {
    throw new Error("request JSON is not an object");
  }
  let questionCount = 0;
  if (isRecord(payload.questions)) {
    questionCount = Object.keys(payload.questions).length;
  }
  return {
    danger_zone_header: readHeader(headers, "TypeSafe-Danger-Zone-Images"),
    content_type: contentType.split(";")[0] ?? "",
    model: payload.model,
    state: payload.state,
    question_count: questionCount,
    image_part_count: imagePartCount,
    // Each use of an image reference in the state or the questions adds the image again (JC-6),
    // so this must be 1. The top-level assets map lists the reference as a key, which is not a use.
    image_reference_count:
      JSON.stringify([payload.state, payload.questions]).split("<image:")
        .length - 1,
  };
}

/**
 * Build a stand-in response with even distributions, so the dry run can exercise parseResponse
 * without a key or a network call. Its numbers mean nothing and are never written to results.
 */
export function buildStandInResponse(questions: SpikeQuestion[]): unknown {
  const answers: Record<string, unknown> = {};
  for (const question of questions) {
    if (question.type === "noul") {
      answers[question.id] = { type: "noul", noul: 0.5 };
    } else if (question.type === "choice") {
      const labels = Object.keys(question.options);
      const probabilities: Record<string, number> = {};
      for (const label of labels) {
        probabilities[label] = 1 / labels.length;
      }
      answers[question.id] = {
        type: "choice",
        choice: labels[0],
        confidence: 1 / labels.length,
        probabilities,
      };
    } else {
      const probabilities: Record<string, number> = {};
      for (
        let levelIndex = 0;
        levelIndex < question.levels.length;
        levelIndex++
      ) {
        probabilities[String(levelIndex)] = 1 / question.levels.length;
      }
      answers[question.id] = {
        type: "score",
        score: 0,
        confidence: 1 / question.levels.length,
        probabilities,
      };
    }
  }
  return {
    model: PINNED_MODEL,
    answers,
    usage: { input_tokens: null, output_tokens: null },
  };
}
