// Disposable unit tests for the answers file (FR-42, OQ-26, CS-7): the write and read round trip,
// bad JSON, each wrong shape, and answers that do not fit the questions. Plain values only (CS-22).

import { describe, expect, it } from "vitest";
import type { AskResult } from "../ask/adapter.js";
import type {
  Answer,
  BoxAnswer,
  ChoiceAnswer,
  NoulAnswer,
  ScoreAnswer,
} from "../shared/answer.js";
import { CouldNotRunError } from "../shared/could-not-run-error.js";
import type { Question } from "../shared/question.js";
import {
  checkRecordedAnswers,
  checkRecordedImage,
  fingerprintImage,
  readAnswersFile,
  writeAnswersFile,
} from "./answers-file.js";

/** The file name every message must hold (FR-4). */
const FILE_NAME = "recorded/answers.json";

/** The SHA-256 of the three bytes "abc", a published test vector (FIPS 180-2). */
const ABC_SHA256 =
  "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

/** One question of each type, as build makes them. */
const questions: Question[] = [
  {
    type: "noul",
    id: "typography/faint",
    criterion: "typography/faint",
    instructions: "Is the body text faint?",
    criteria: { true: "faint", false: "not faint" },
  },
  {
    type: "choice",
    id: "layout/alignment",
    criterion: "layout/alignment",
    instructions: "How are the edges aligned?",
    criteria: [
      { option: "consistent", description: "one edge" },
      { option: "mixed", description: "several edges" },
    ],
  },
  {
    type: "score",
    id: "layout/density",
    criterion: "layout/density",
    instructions: "How dense is the page?",
    levels: ["airy", "balanced", "crowded"],
  },
  {
    type: "box",
    id: "typography/faint#box",
    criterion: "typography/faint",
    instructions: "Where is the faint text?",
  },
];

/** One answer for each question above. */
const noulAnswer: NoulAnswer = {
  type: "noul",
  question_id: "typography/faint",
  model: "jev-1",
  distribution: { true: 0.8, false: 0.2 },
  confidence: null,
};
const choiceAnswer: ChoiceAnswer = {
  type: "choice",
  question_id: "layout/alignment",
  model: "jev-1",
  distribution: { consistent: 0.7, mixed: 0.3 },
  confidence: 0.4,
};
const scoreAnswer: ScoreAnswer = {
  type: "score",
  question_id: "layout/density",
  model: "jev-1",
  distribution: { "0": 0.1, "1": 0.6, "2": 0.3 },
  confidence: 0.55,
};
const boxAnswer: BoxAnswer = {
  type: "box",
  question_id: "typography/faint#box",
  model: "jev-1",
  region: { x: 10, y: 20, width: 300, height: 40 },
  confidence: null,
};

/** An ask result that fits the questions above. */
const asked: AskResult = {
  answers: [noulAnswer, choiceAnswer, scoreAnswer, boxAnswer],
  usage: {
    input_tokens: 1200,
    cost_usd: 0.002,
    latency_ms: 850,
    model: "jev-1",
  },
};

/** Return the file as a plain JSON value, so a test can break one part of it. */
function writtenValue(): Record<string, unknown> {
  return JSON.parse(writeAnswersFile(asked, ABC_SHA256));
}

/** Return the error that reading this value as an answers file throws. */
function readError(value: unknown): unknown {
  try {
    readAnswersFile(JSON.stringify(value), FILE_NAME);
  } catch (error) {
    return error;
  }
  return undefined;
}

describe("writeAnswersFile and readAnswersFile", () => {
  it("give back the same answers and usage after a round trip (FR-42)", () => {
    const text = writeAnswersFile(asked, ABC_SHA256);
    const file = readAnswersFile(text, FILE_NAME);
    expect(file.answers_file_version).toBe(1);
    expect(file.image_sha256).toBe(ABC_SHA256);
    expect(file.answers).toEqual(asked.answers);
    expect(file.usage).toEqual(asked.usage);
  });

  it("write a fixed key order with a two-space indent and a final newline (OQ-26)", () => {
    const text = writeAnswersFile(asked, ABC_SHA256);
    expect(text.endsWith("}\n")).toBe(true);
    expect(
      text.startsWith(
        `{\n  "answers_file_version": 1,\n  "image_sha256": "${ABC_SHA256}",\n  "answers": [`,
      ),
    ).toBe(true);
    const reordered: AskResult = {
      answers: [
        {
          confidence: null,
          distribution: { false: 0.2, true: 0.8 },
          model: "jev-1",
          question_id: "typography/faint",
          type: "noul",
        },
      ],
      usage: {
        model: "jev-1",
        latency_ms: 1,
        cost_usd: null,
        input_tokens: null,
      },
    };
    expect(writeAnswersFile(reordered, ABC_SHA256)).toBe(
      `${JSON.stringify(
        {
          answers_file_version: 1,
          image_sha256: ABC_SHA256,
          answers: [
            {
              type: "noul",
              question_id: "typography/faint",
              model: "jev-1",
              distribution: { true: 0.8, false: 0.2 },
              confidence: null,
            },
          ],
          usage: {
            input_tokens: null,
            cost_usd: null,
            latency_ms: 1,
            model: "jev-1",
          },
        },
        null,
        2,
      )}\n`,
    );
  });

  it("stop with a message that names the file when the text is not JSON (FR-4)", () => {
    expect(() => readAnswersFile("{ not json", FILE_NAME)).toThrow(
      new CouldNotRunError(`answers file ${FILE_NAME} is not valid JSON`),
    );
  });
});

/** Each case breaks one part of a good file and names the path the message must hold. */
type ShapeCase = {
  readonly name: string;
  readonly breakFile: (file: Record<string, unknown>) => unknown;
  readonly message: RegExp;
};

/** Return answer number `index` of the file as a plain object, so a case can change it. */
function answerAt(
  file: Record<string, unknown>,
  index: number,
): Record<string, unknown> {
  const answers = file.answers;
  if (!Array.isArray(answers)) {
    throw new Error("answers is not a list");
  }
  return answers[index];
}

const shapeCases: ShapeCase[] = [
  {
    name: "the top level is a list",
    breakFile: () => [],
    message: /the top level must be an object/,
  },
  {
    name: "the version is 2",
    breakFile: (file) => ({ ...file, answers_file_version: 2 }),
    message: /answers_file_version must be 1/,
  },
  {
    name: "the version is missing",
    breakFile: (file) => ({ answers: file.answers, usage: file.usage }),
    message: /the top level has no answers_file_version/,
  },
  {
    name: "the version is 2 and the layout has no image_sha256",
    breakFile: (file) => ({
      answers_file_version: 2,
      answers: file.answers,
      usage: file.usage,
    }),
    message: /answers_file_version must be 1/,
  },
  {
    name: "image_sha256 is missing",
    breakFile: (file) => ({
      answers_file_version: file.answers_file_version,
      answers: file.answers,
      usage: file.usage,
    }),
    message: /the top level has no image_sha256/,
  },
  {
    name: "image_sha256 is upper case",
    breakFile: (file) => ({ ...file, image_sha256: ABC_SHA256.toUpperCase() }),
    message: /image_sha256 must be 64 lowercase hexadecimal characters/,
  },
  {
    name: "image_sha256 is too short",
    breakFile: (file) => ({ ...file, image_sha256: "ba7816bf" }),
    message: /image_sha256 must be 64 lowercase hexadecimal characters/,
  },
  {
    name: "the top level has an extra key",
    breakFile: (file) => ({ ...file, verdicts: [] }),
    message: /the top level has an unknown key verdicts/,
  },
  {
    name: "answers is not a list",
    breakFile: (file) => ({ ...file, answers: {} }),
    message: /answers must be a list/,
  },
  {
    name: "an answer has an unknown type",
    breakFile: (file) => {
      answerAt(file, 0).type = "rank";
      return file;
    },
    message: /answers\[0\]\.type must be noul, choice, score, or box/,
  },
  {
    name: "an answer has an empty question id",
    breakFile: (file) => {
      answerAt(file, 1).question_id = "";
      return file;
    },
    message: /answers\[1\]\.question_id must be a non-empty string/,
  },
  {
    name: "an answer has no model",
    breakFile: (file) => {
      delete answerAt(file, 1).model;
      return file;
    },
    message: /answers\[1\]\.model must be a non-empty string/,
  },
  {
    name: "a noul answer has a confidence",
    breakFile: (file) => {
      answerAt(file, 0).confidence = 0.6;
      return file;
    },
    message: /answers\[0\]\.confidence must be null for a noul answer/,
  },
  {
    name: "a noul distribution has an extra key",
    breakFile: (file) => {
      answerAt(file, 0).distribution = { true: 0.5, false: 0.5, maybe: 0 };
      return file;
    },
    message: /answers\[0\]\.distribution has an unknown key maybe/,
  },
  {
    name: "a choice probability is above 1",
    breakFile: (file) => {
      answerAt(file, 1).distribution = { consistent: 1.5, mixed: 0.3 };
      return file;
    },
    message:
      /answers\[1\]\.distribution\.consistent must be a number from 0 to 1/,
  },
  {
    name: "a score confidence is a string",
    breakFile: (file) => {
      answerAt(file, 2).confidence = "high";
      return file;
    },
    message: /answers\[2\]\.confidence must be a number/,
  },
  {
    name: "a score answer has an extra key",
    breakFile: (file) => {
      answerAt(file, 2).verdict = "fail";
      return file;
    },
    message: /answers\[2\] has an unknown key verdict/,
  },
  {
    name: "a box region has a negative width",
    breakFile: (file) => {
      answerAt(file, 3).region = { x: 0, y: 0, width: -1, height: 4 };
      return file;
    },
    message: /answers\[3\]\.region\.width must not be negative/,
  },
  {
    name: "a box region has no height",
    breakFile: (file) => {
      answerAt(file, 3).region = { x: 0, y: 0, width: 1 };
      return file;
    },
    message: /answers\[3\]\.region has no height/,
  },
  {
    name: "usage has a negative cost",
    breakFile: (file) => ({
      ...file,
      usage: { input_tokens: 1, cost_usd: -1, latency_ms: 1, model: "jev-1" },
    }),
    message: /usage\.cost_usd must not be negative/,
  },
  {
    name: "usage has no model",
    breakFile: (file) => ({
      ...file,
      usage: { input_tokens: 1, cost_usd: 0, latency_ms: 1 },
    }),
    message: /usage has no model/,
  },
];

describe("readAnswersFile stops on a wrong shape with CouldNotRunError that names the file and the path (CS-7, FR-4)", () => {
  for (const shapeCase of shapeCases) {
    it(`when ${shapeCase.name}`, () => {
      const error = readError(shapeCase.breakFile(writtenValue()));
      expect(error).toBeInstanceOf(CouldNotRunError);
      expect(String(error)).toContain(`answers file ${FILE_NAME}: `);
      expect(String(error)).toMatch(shapeCase.message);
    });
  }
});

describe("fingerprintImage and checkRecordedImage (FR-42, OQ-26 e)", () => {
  it("gives the SHA-256 of the bytes as 64 lowercase hexadecimal characters", () => {
    const bytes = new TextEncoder().encode("abc");
    expect(fingerprintImage(bytes)).toBe(ABC_SHA256);
  });

  it("returns when the file was saved from this image", () => {
    const file = readAnswersFile(
      writeAnswersFile(asked, ABC_SHA256),
      FILE_NAME,
    );
    expect(() =>
      checkRecordedImage(file, ABC_SHA256, FILE_NAME, "page.png"),
    ).not.toThrow();
  });

  it("stops with CouldNotRunError that names the file and the image when the file belongs to another image", () => {
    const file = readAnswersFile(
      writeAnswersFile(asked, ABC_SHA256),
      FILE_NAME,
    );
    const otherSha256 = fingerprintImage(new TextEncoder().encode("abd"));
    expect(() =>
      checkRecordedImage(file, otherSha256, FILE_NAME, "other.png"),
    ).toThrow(
      new CouldNotRunError(
        `answers file ${FILE_NAME} belongs to another image, not other.png; record answers for this image with --save-answers`,
      ),
    );
  });
});

describe("checkRecordedAnswers (FR-42, OQ-26)", () => {
  it("returns the answers and usage as ask would when they fit the questions", () => {
    const file = readAnswersFile(
      writeAnswersFile(asked, ABC_SHA256),
      FILE_NAME,
    );
    expect(checkRecordedAnswers(file, questions, FILE_NAME)).toEqual(asked);
  });

  /** Each case changes the answers so they no longer fit the questions. */
  const mismatchCases: {
    name: string;
    answers: Answer[];
    message: RegExp;
  }[] = [
    {
      name: "an answer is missing",
      answers: [choiceAnswer, scoreAnswer, boxAnswer],
      message: /no answer for question typography\/faint/,
    },
    {
      name: "an extra answer names an unknown question",
      answers: [
        noulAnswer,
        choiceAnswer,
        scoreAnswer,
        boxAnswer,
        { ...noulAnswer, question_id: "other/criterion" },
      ],
      message: /unknown question other\/criterion/,
    },
    {
      name: "the choice options differ from the question's",
      answers: [
        noulAnswer,
        {
          type: "choice",
          question_id: "layout/alignment",
          model: "jev-1",
          distribution: { left: 0.5, right: 0.5 },
          confidence: 0.1,
        },
        scoreAnswer,
        boxAnswer,
      ],
      message: /distribution keys left, right for question layout\/alignment/,
    },
  ];
  for (const mismatchCase of mismatchCases) {
    it(`stops with CouldNotRunError that names the file when ${mismatchCase.name}`, () => {
      const text = writeAnswersFile(
        {
          answers: mismatchCase.answers,
          usage: asked.usage,
        },
        ABC_SHA256,
      );
      const file = readAnswersFile(text, FILE_NAME);
      let caught: unknown;
      try {
        checkRecordedAnswers(file, questions, FILE_NAME);
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(CouldNotRunError);
      expect(String(caught)).toContain(
        `answers file ${FILE_NAME} does not fit`,
      );
      expect(String(caught)).toMatch(mismatchCase.message);
    });
  }
});
