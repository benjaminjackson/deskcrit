// The answers file that `--save-answers` writes and `--answers` reads (FR-42, OQ-26). It holds the
// raw answers from the ask stage and the adapter's usage object, and no verdicts, because compose
// decides verdicts from thresholds (FR-25). This file does no I/O: read-inputs.ts reads the file and
// main.ts writes it (AC-7, CS-6).

import { createHash } from "node:crypto";
import type { AskResult } from "../ask/adapter.js";
import type { Answer, Region } from "../shared/answer.js";
import { findAnswersMismatch } from "../shared/answers-mismatch.js";
import { CouldNotRunError } from "../shared/could-not-run-error.js";
import type { Question } from "../shared/question.js";
import type { Usage } from "../shared/usage.js";

/** The one layout version this build reads and writes. Any other version stops the run (OQ-26). */
const ANSWERS_FILE_VERSION = 1;

/** An image fingerprint as the file holds it: 64 lowercase hexadecimal characters (OQ-26 e). */
const IMAGE_SHA256_PATTERN = /^[0-9a-f]{64}$/;

/** The answers file, with the wire field names (CS-10, FR-42, OQ-26). */
export type AnswersFile = {
  readonly answers_file_version: typeof ANSWERS_FILE_VERSION;
  /** The SHA-256 of the original image bytes the answers were saved from (OQ-26 e). */
  readonly image_sha256: string;
  readonly answers: readonly Answer[];
  readonly usage: Usage;
};

/** The fields of one JSON object, read as unknown values, so each one is checked before use. */
type JsonFields = ReadonlyMap<string, unknown>;

/**
 * Parse the answers file text and check its shape, and return it as an AnswersFile (FR-42, CS-7).
 * This is the one function that turns the file's unknown value into a typed one. Text that is not
 * JSON or has the wrong shape throws CouldNotRunError that names the file and the JSON path (FR-4).
 */
export function readAnswersFile(
  fileText: string,
  fileName: string,
): AnswersFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fileText);
  } catch {
    throw new CouldNotRunError(`answers file ${fileName} is not valid JSON`);
  }
  /** Stop with CouldNotRunError that names the file and the JSON path (FR-4, CS-16). */
  const fail = (path: string, problem: string): never => {
    throw new CouldNotRunError(`answers file ${fileName}: ${path} ${problem}`);
  };
  const top = readFields(parsed, "the top level", fail);
  // The version is read before the other keys, so a file with another layout is named by its
  // version and not by the first key that layout lacks (OQ-26 a).
  if (!top.has("answers_file_version")) {
    fail("the top level", "has no answers_file_version");
  }
  if (top.get("answers_file_version") !== ANSWERS_FILE_VERSION) {
    fail("answers_file_version", `must be ${ANSWERS_FILE_VERSION}`);
  }
  requireExactKeys(
    top,
    ["answers_file_version", "image_sha256", "answers", "usage"],
    "the top level",
    fail,
  );
  const imageSha256 = top.get("image_sha256");
  if (
    typeof imageSha256 !== "string" ||
    !IMAGE_SHA256_PATTERN.test(imageSha256)
  ) {
    return fail("image_sha256", "must be 64 lowercase hexadecimal characters");
  }
  const answersValue = top.get("answers");
  if (!Array.isArray(answersValue)) {
    return fail("answers", "must be a list");
  }
  const answers: Answer[] = [];
  for (const [index, answerValue] of answersValue.entries()) {
    answers.push(readAnswer(answerValue, `answers[${index}]`, fail));
  }
  const usage = readUsage(top.get("usage"), fail);
  return {
    answers_file_version: ANSWERS_FILE_VERSION,
    image_sha256: imageSha256,
    answers,
    usage,
  };
}

/**
 * Return the SHA-256 of the original image bytes as 64 lowercase hexadecimal characters. The
 * answers file records it, and --answers compares it before prepare runs (FR-42, OQ-26 e).
 */
export function fingerprintImage(imageBytes: Uint8Array): string {
  return createHash("sha256").update(imageBytes).digest("hex");
}

/**
 * Stop the run when the recorded answers were saved from another image, so a replay never reports
 * on an image its answers did not come from. The CLI calls it before prepare, so a wrong image is
 * refused with no image work (FR-42, OQ-26 e, CS-16).
 */
export function checkRecordedImage(
  recorded: AnswersFile,
  imageSha256: string,
  fileName: string,
  imagePath: string,
): void {
  if (recorded.image_sha256 !== imageSha256) {
    throw new CouldNotRunError(
      `answers file ${fileName} belongs to another image, not ${imagePath}; record answers for this image with --save-answers`,
    );
  }
}

/** The function readAnswersFile uses to stop with a message that names the path (CS-16). */
type Fail = (path: string, problem: string) => never;

/**
 * Read one answer: its type, question id and model, then the fields of that type and no others
 * (FR-20, FR-21). Part of readAnswersFile's check (CS-7).
 */
function readAnswer(value: unknown, path: string, fail: Fail): Answer {
  const fields = readFields(value, path, fail);
  const type = fields.get("type");
  const question_id = readNonEmptyText(
    fields.get("question_id"),
    `${path}.question_id`,
    fail,
  );
  const model = readNonEmptyText(fields.get("model"), `${path}.model`, fail);
  if (type === "noul") {
    requireExactKeys(
      fields,
      ["type", "question_id", "model", "distribution", "confidence"],
      path,
      fail,
    );
    const distribution = readFields(
      fields.get("distribution"),
      `${path}.distribution`,
      fail,
    );
    requireExactKeys(
      distribution,
      ["true", "false"],
      `${path}.distribution`,
      fail,
    );
    if (fields.get("confidence") !== null) {
      fail(`${path}.confidence`, "must be null for a noul answer");
    }
    return {
      type,
      question_id,
      model,
      distribution: {
        true: readProbability(
          distribution.get("true"),
          `${path}.distribution.true`,
          fail,
        ),
        false: readProbability(
          distribution.get("false"),
          `${path}.distribution.false`,
          fail,
        ),
      },
      confidence: null,
    };
  }
  if (type === "choice" || type === "score") {
    requireExactKeys(
      fields,
      ["type", "question_id", "model", "distribution", "confidence"],
      path,
      fail,
    );
    const distributionFields = readFields(
      fields.get("distribution"),
      `${path}.distribution`,
      fail,
    );
    const distribution: Record<string, number> = {};
    for (const [key, probability] of distributionFields) {
      distribution[key] = readProbability(
        probability,
        `${path}.distribution.${key}`,
        fail,
      );
    }
    const confidence = readProbability(
      fields.get("confidence"),
      `${path}.confidence`,
      fail,
    );
    return { type, question_id, model, distribution, confidence };
  }
  if (type === "box") {
    requireExactKeys(
      fields,
      ["type", "question_id", "model", "region", "confidence"],
      path,
      fail,
    );
    const region = readRegion(fields.get("region"), `${path}.region`, fail);
    const confidenceValue = fields.get("confidence");
    let confidence: number | null = null;
    if (confidenceValue !== null) {
      confidence = readFiniteNumber(
        confidenceValue,
        `${path}.confidence`,
        fail,
      );
    }
    return { type, question_id, model, region, confidence };
  }
  return fail(`${path}.type`, "must be noul, choice, score, or box");
}

/** Read a Box region: x, y, width and height as finite numbers, the size not negative (FR-8). */
function readRegion(value: unknown, path: string, fail: Fail): Region {
  const fields = readFields(value, path, fail);
  requireExactKeys(fields, ["x", "y", "width", "height"], path, fail);
  const width = readFiniteNumber(fields.get("width"), `${path}.width`, fail);
  const height = readFiniteNumber(fields.get("height"), `${path}.height`, fail);
  if (width < 0) {
    fail(`${path}.width`, "must not be negative");
  }
  if (height < 0) {
    fail(`${path}.height`, "must not be negative");
  }
  return {
    x: readFiniteNumber(fields.get("x"), `${path}.x`, fail),
    y: readFiniteNumber(fields.get("y"), `${path}.y`, fail),
    width,
    height,
  };
}

/** Read the adapter's usage object: the four fields of FR-20 and no others (FR-23). */
function readUsage(value: unknown, fail: Fail): Usage {
  const fields = readFields(value, "usage", fail);
  requireExactKeys(
    fields,
    ["input_tokens", "cost_usd", "latency_ms", "model"],
    "usage",
    fail,
  );
  const latency_ms = readFiniteNumber(
    fields.get("latency_ms"),
    "usage.latency_ms",
    fail,
  );
  if (latency_ms < 0) {
    fail("usage.latency_ms", "must not be negative");
  }
  return {
    input_tokens: readCountOrNull(
      fields.get("input_tokens"),
      "usage.input_tokens",
      fail,
    ),
    cost_usd: readCountOrNull(fields.get("cost_usd"), "usage.cost_usd", fail),
    latency_ms,
    model: readNonEmptyText(fields.get("model"), "usage.model", fail),
  };
}

/** Read a number that is null, or finite and not negative, as usage holds when the cost is unknown (FR-23). */
function readCountOrNull(
  value: unknown,
  path: string,
  fail: Fail,
): number | null {
  if (value === null) {
    return null;
  }
  const number = readFiniteNumber(value, path, fail);
  if (number < 0) {
    fail(path, "must not be negative");
  }
  return number;
}

/** Read a probability or confidence: a finite number from 0 to 1 (FR-20). */
function readProbability(value: unknown, path: string, fail: Fail): number {
  const number = readFiniteNumber(value, path, fail);
  if (number < 0 || number > 1) {
    fail(path, "must be a number from 0 to 1");
  }
  return number;
}

/** Read a finite number. NaN and Infinity cannot come from JSON, but the check costs nothing. */
function readFiniteNumber(value: unknown, path: string, fail: Fail): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fail(path, "must be a number");
  }
  return value;
}

/** Read a string that is not empty, such as a question id or a model id (FR-20). */
function readNonEmptyText(value: unknown, path: string, fail: Fail): string {
  if (typeof value !== "string" || value === "") {
    return fail(path, "must be a non-empty string");
  }
  return value;
}

/** Read a JSON object (not a list and not null) as a map from key to unknown value. */
function readFields(value: unknown, path: string, fail: Fail): JsonFields {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(path, "must be an object");
  }
  return new Map<string, unknown>(Object.entries(value));
}

/** Stop unless the object has exactly these keys: none missing and none extra (OQ-26). */
function requireExactKeys(
  fields: JsonFields,
  expectedKeys: readonly string[],
  path: string,
  fail: Fail,
): void {
  for (const key of expectedKeys) {
    if (!fields.has(key)) {
      fail(path, `has no ${key}`);
    }
  }
  for (const key of fields.keys()) {
    if (!expectedKeys.includes(key)) {
      fail(path, `has an unknown key ${key}`);
    }
  }
}

/**
 * Check that the recorded answers fit the questions build made this run, and return them in the
 * shape ask returns, so compose cannot tell the two paths apart (FR-42, OQ-26). A file that does not
 * fit throws CouldNotRunError that names the file, because the file is input (CS-16).
 */
export function checkRecordedAnswers(
  recorded: AnswersFile,
  questions: readonly Question[],
  fileName: string,
): AskResult {
  const mismatch = findAnswersMismatch(questions, recorded.answers);
  if (mismatch !== undefined) {
    throw new CouldNotRunError(
      `answers file ${fileName} does not fit the questions of this run: ${mismatch}`,
    );
  }
  return { answers: recorded.answers, usage: recorded.usage };
}

/**
 * Return the answers file text for one ask result: the version, the image fingerprint, the answers
 * in the order ask gave them with a fixed field order for each type, and the usage object, as JSON
 * with a two-space indent and a final newline (FR-42, OQ-26). The fixed order makes the same answers
 * give the same bytes.
 */
export function writeAnswersFile(
  asked: AskResult,
  imageSha256: string,
): string {
  const answers: object[] = [];
  for (const answer of asked.answers) {
    answers.push(orderAnswerFields(answer));
  }
  const file = {
    answers_file_version: ANSWERS_FILE_VERSION,
    image_sha256: imageSha256,
    answers,
    usage: {
      input_tokens: asked.usage.input_tokens,
      cost_usd: asked.usage.cost_usd,
      latency_ms: asked.usage.latency_ms,
      model: asked.usage.model,
    },
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}

/** Copy one answer into a new object with its fields in the fixed order for its type (OQ-26). */
function orderAnswerFields(answer: Answer): object {
  switch (answer.type) {
    case "noul":
      return {
        type: answer.type,
        question_id: answer.question_id,
        model: answer.model,
        distribution: {
          true: answer.distribution.true,
          false: answer.distribution.false,
        },
        confidence: answer.confidence,
      };
    case "choice":
    case "score":
      return {
        type: answer.type,
        question_id: answer.question_id,
        model: answer.model,
        distribution: answer.distribution,
        confidence: answer.confidence,
      };
    case "box":
      return {
        type: answer.type,
        question_id: answer.question_id,
        model: answer.model,
        region: {
          x: answer.region.x,
          y: answer.region.y,
          width: answer.region.width,
          height: answer.region.height,
        },
        confidence: answer.confidence,
      };
    default: {
      // `never` is the type with no values, so a new answer type with no case is a compile error.
      const unhandled: never = answer;
      throw new Error(`unknown answer type: ${JSON.stringify(unhandled)}`);
    }
  }
}
