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

/** The layout version of the one-run file that `crit report` and `crit gate` read and write (OQ-26 a). */
const ANSWERS_FILE_VERSION = 1;

/**
 * The layout version of the two-run file that `crit compare` reads and writes, with a before and
 * an after run (FR-42, OQ-26 a).
 */
const COMPARE_ANSWERS_FILE_VERSION = 2;

/** An image fingerprint as the file holds it: 64 lowercase hexadecimal characters (OQ-26 e). */
const IMAGE_SHA256_PATTERN = /^[0-9a-f]{64}$/;

/** The keys of one recorded run, in the order the file writes them (OQ-26 a). */
const RUN_KEYS = ["image_sha256", "answers", "usage"] as const;

/** One recorded run: the image it was saved from, the raw answers, and the usage (FR-42, OQ-26). */
export type RecordedRun = {
  /** The SHA-256 of the original image bytes the answers were saved from (OQ-26 e). */
  readonly image_sha256: string;
  readonly answers: readonly Answer[];
  readonly usage: Usage;
};

/** The one-run answers file of `crit report`, with the wire field names (CS-10, FR-42, OQ-26). */
export type AnswersFile = RecordedRun & {
  readonly answers_file_version: typeof ANSWERS_FILE_VERSION;
};

/** The two runs of a `crit compare` answers file, labelled before and after (FR-42, OQ-26). */
export type CompareAnswersFile = {
  readonly before: RecordedRun;
  readonly after: RecordedRun;
};

/** The fields of one JSON object, read as unknown values, so each one is checked before use. */
type JsonFields = ReadonlyMap<string, unknown>;

/**
 * Parse the answers file text and check its shape, and return it as an AnswersFile (FR-42, CS-7).
 * This is the one function that turns the one-run file's unknown value into a typed one. Text that
 * is not JSON or has the wrong shape throws CouldNotRunError that names the file and the JSON path
 * (FR-4).
 */
export function readAnswersFile(
  fileText: string,
  fileName: string,
): AnswersFile {
  const fail = failNamingFile(fileName);
  const top = readTopLevel(fileText, fileName, fail);
  if (top.get("answers_file_version") !== ANSWERS_FILE_VERSION) {
    fail("answers_file_version", `must be ${ANSWERS_FILE_VERSION}`);
  }
  requireExactKeys(
    top,
    ["answers_file_version", ...RUN_KEYS],
    "the top level",
    fail,
  );
  const run = readRun(top, "", fail);
  return { answers_file_version: ANSWERS_FILE_VERSION, ...run };
}

/**
 * Parse the two-run answers file of `crit compare` and check its shape: version 2, exactly the
 * keys answers_file_version, before, and after, and each run with exactly the keys of a recorded
 * run (FR-42, OQ-26 a, CS-7). An error names the file and a JSON path that starts with the run,
 * such as before.answers[0].type (FR-4).
 */
export function readCompareAnswersFile(
  fileText: string,
  fileName: string,
): CompareAnswersFile {
  const fail = failNamingFile(fileName);
  const top = readTopLevel(fileText, fileName, fail);
  if (top.get("answers_file_version") !== COMPARE_ANSWERS_FILE_VERSION) {
    fail(
      "answers_file_version",
      `must be ${COMPARE_ANSWERS_FILE_VERSION} for crit compare, which records a before and an after run`,
    );
  }
  requireExactKeys(
    top,
    ["answers_file_version", "before", "after"],
    "the top level",
    fail,
  );
  const beforeFields = readFields(top.get("before"), "before", fail);
  requireExactKeys(beforeFields, RUN_KEYS, "before", fail);
  const afterFields = readFields(top.get("after"), "after", fail);
  requireExactKeys(afterFields, RUN_KEYS, "after", fail);
  return {
    before: readRun(beforeFields, "before.", fail),
    after: readRun(afterFields, "after.", fail),
  };
}

/** Return the function that stops with CouldNotRunError naming the file and the JSON path (FR-4, CS-16). */
function failNamingFile(fileName: string): Fail {
  return (path: string, problem: string): never => {
    throw new CouldNotRunError(`answers file ${fileName}: ${path} ${problem}`);
  };
}

/**
 * Parse the file text as JSON and return its top-level fields, after checking that the version
 * key is there. The version is read before the other keys, so a file with another layout is named
 * by its version and not by the first key that layout lacks (OQ-26 a).
 */
function readTopLevel(
  fileText: string,
  fileName: string,
  fail: Fail,
): JsonFields {
  let parsed: unknown;
  try {
    parsed = JSON.parse(fileText);
  } catch {
    throw new CouldNotRunError(`answers file ${fileName} is not valid JSON`);
  }
  const top = readFields(parsed, "the top level", fail);
  if (!top.has("answers_file_version")) {
    fail("the top level", "has no answers_file_version");
  }
  return top;
}

/**
 * Read the image fingerprint, the answers, and the usage of one run, whose keys the caller has
 * already checked. `pathPrefix` goes in front of every JSON path in a message: empty for the
 * one-run file, and "before." or "after." for the compare file (FR-4, OQ-26).
 */
function readRun(
  fields: JsonFields,
  pathPrefix: string,
  fail: Fail,
): RecordedRun {
  const imageSha256 = fields.get("image_sha256");
  if (
    typeof imageSha256 !== "string" ||
    !IMAGE_SHA256_PATTERN.test(imageSha256)
  ) {
    return fail(
      `${pathPrefix}image_sha256`,
      "must be 64 lowercase hexadecimal characters",
    );
  }
  const answersValue = fields.get("answers");
  if (!Array.isArray(answersValue)) {
    return fail(`${pathPrefix}answers`, "must be a list");
  }
  const answers: Answer[] = [];
  for (const [index, answerValue] of answersValue.entries()) {
    answers.push(
      readAnswer(answerValue, `${pathPrefix}answers[${index}]`, fail),
    );
  }
  const usage = readUsage(fields.get("usage"), `${pathPrefix}usage`, fail);
  return { image_sha256: imageSha256, answers, usage };
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
  recorded: RecordedRun,
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

/** The function the readers use to stop with a message that names the path (CS-16). */
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

/** Read the adapter's usage object at this JSON path: the four fields of FR-20 and no others (FR-23). */
function readUsage(value: unknown, path: string, fail: Fail): Usage {
  const fields = readFields(value, path, fail);
  requireExactKeys(
    fields,
    ["input_tokens", "cost_usd", "latency_ms", "model"],
    path,
    fail,
  );
  const latency_ms = readFiniteNumber(
    fields.get("latency_ms"),
    `${path}.latency_ms`,
    fail,
  );
  if (latency_ms < 0) {
    fail(`${path}.latency_ms`, "must not be negative");
  }
  return {
    input_tokens: readCountOrNull(
      fields.get("input_tokens"),
      `${path}.input_tokens`,
      fail,
    ),
    cost_usd: readCountOrNull(fields.get("cost_usd"), `${path}.cost_usd`, fail),
    latency_ms,
    model: readNonEmptyText(fields.get("model"), `${path}.model`, fail),
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
  recorded: RecordedRun,
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
  const file = {
    answers_file_version: ANSWERS_FILE_VERSION,
    ...orderedRun(asked, imageSha256),
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}

/** One run as the compare writer takes it: the ask result and the fingerprint of its image (FR-42). */
export type RunToWrite = {
  readonly asked: AskResult;
  readonly imageSha256: string;
};

/**
 * Return the two-run answers file text of `crit compare`: version 2, then the before run and the
 * after run, each in the fixed key order of the one-run file, as JSON with a two-space indent and a
 * final newline (FR-42, OQ-26 a). The same answers give the same bytes.
 */
export function writeCompareAnswersFile(
  before: RunToWrite,
  after: RunToWrite,
): string {
  const file = {
    answers_file_version: COMPARE_ANSWERS_FILE_VERSION,
    before: orderedRun(before.asked, before.imageSha256),
    after: orderedRun(after.asked, after.imageSha256),
  };
  return `${JSON.stringify(file, null, 2)}\n`;
}

/**
 * Build one run as a new object with its keys in the fixed order: the image fingerprint, the
 * answers with a fixed field order for each type, and the usage object (OQ-26 a). JSON.stringify
 * writes keys in the order they were added, so this order is the order of the file.
 */
function orderedRun(asked: AskResult, imageSha256: string): object {
  const answers: object[] = [];
  for (const answer of asked.answers) {
    answers.push(orderAnswerFields(answer));
  }
  return {
    image_sha256: imageSha256,
    answers,
    usage: {
      input_tokens: asked.usage.input_tokens,
      cost_usd: asked.usage.cost_usd,
      latency_ms: asked.usage.latency_ms,
      model: asked.usage.model,
    },
  };
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
