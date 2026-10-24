// Disposable unit tests for the pure request builder and the response check (CS-20, CS-22). They
// use plain values: no key and no network.

import { Image } from "@typesafe-ai/sdk";
import { expect, test } from "vitest";
import { CouldNotRunError } from "../../shared/could-not-run-error.js";
import type { Question } from "../../shared/question.js";
import { IMAGE_STATE_PATH, type State } from "../../shared/state.js";
import {
  buildTypeSafeRequest,
  chooseModelId,
  DEFAULT_MODEL_ID,
  PRICE_USD_PER_MILLION_INPUT_TOKENS,
  readTypeSafeResponse,
} from "./request.js";

const imageBytes = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);

const state: State = {
  [IMAGE_STATE_PATH]: {
    format: "png",
    bytes: imageBytes,
    width: 1000,
    height: 500,
  },
  context: { purpose: "Sign up for the newsletter." },
  facts: { brand: { colors: ["#000000"] }, pages: 2 },
};

const questions: Question[] = [
  {
    id: "typography/heading-visible",
    criterion: "typography/heading-visible",
    type: "noul",
    instructions:
      "Looking at the image at `screenshot`, is the heading hidden?",
    criteria: { true: "The heading is hidden.", false: "It is visible." },
  },
  {
    id: "layout/density-mixed",
    criterion: "layout/density-mixed",
    type: "choice",
    instructions: "Looking at the image at `screenshot`, how is spacing?",
    criteria: [
      { option: "even", description: "Even." },
      { option: "some-sparse", description: "Some parts sparse." },
      { option: "cramped", description: "Cramped." },
    ],
  },
  {
    id: "typography/measure-too-long",
    criterion: "typography/measure-too-long",
    type: "score",
    instructions: "Looking at the image at `screenshot`, how long are lines?",
    levels: ["Comfortable.", "Somewhat long.", "Too long."],
  },
  {
    id: "typography/heading-visible#box",
    criterion: "typography/heading-visible",
    type: "box",
    instructions: "the main heading in the image at `screenshot`",
  },
];

/** A response as plain data, typed loosely so a test can break any part of it without a cast. */
type RecordedResponse = {
  model?: unknown;
  answers?: Record<string, Record<string, unknown>>;
  usage?: unknown;
};

/**
 * Return a response in the shape TypeSafe returned on 2026-10-24 for jev-1.14.0: the noul and
 * box answers come from a live request with both types, and the choice and score answers from a
 * spike run (spike/results/raw/).
 */
function buildRecordedResponse(): RecordedResponse {
  return {
    model: "jev-1.14.0",
    answers: {
      "typography/heading-visible": { type: "noul", noul: 0.04 },
      "layout/density-mixed": {
        type: "choice",
        choice: "some-sparse",
        confidence: 0.48,
        probabilities: { even: 0.25, "some-sparse": 0.68, cramped: 0.07 },
      },
      "typography/measure-too-long": {
        type: "score",
        score: 0.72,
        confidence: 0,
        legend: {
          "0": "Comfortable.",
          "1": "Somewhat long.",
          "2": "Too long.",
        },
        probabilities: { "0": 0.46, "1": 0.37, "2": 0.17 },
      },
      "typography/heading-visible#box": {
        type: "box",
        box: { top: 0.03, bottom: 0.34, left: 0.14, right: 0.67 },
        confidence: 0.19,
      },
    },
    usage: { input_tokens: 5402, output_tokens: 37 },
  };
}

/** Count every SDK Image anywhere inside a value, to check the image is sent once (FR-15, JC-6). */
function countImages(value: unknown): number {
  if (value instanceof Image) {
    return 1;
  }
  let count = 0;
  if (Array.isArray(value)) {
    for (const item of value) {
      count += countImages(item);
    }
  } else if (typeof value === "object" && value !== null) {
    for (const item of Object.values(value)) {
      count += countImages(item);
    }
  }
  return count;
}

test("the built request carries the danger-zone header", () => {
  const built = buildTypeSafeRequest(state, questions, "jev-1.14.0");
  expect(built.options.headers).toEqual({
    "TypeSafe-Danger-Zone-Images": "true",
  });
});

test("the built request carries the model id it was given", () => {
  const built = buildTypeSafeRequest(state, questions, "jev-1.15.2");
  expect(built.body.model).toBe("jev-1.15.2");
});

test("with no pinned model the default versioned id is used", () => {
  expect(DEFAULT_MODEL_ID).toBe("jev-1.14.0");
  expect(chooseModelId(undefined)).toBe(DEFAULT_MODEL_ID);
  expect(chooseModelId("jev-1.15.2")).toBe("jev-1.15.2");
});

test("building with jev-latest throws a plain Error", () => {
  expect(() => buildTypeSafeRequest(state, questions, "jev-latest")).toThrow(
    /never be sent/,
  );
  try {
    buildTypeSafeRequest(state, questions, "jev-latest");
  } catch (error) {
    expect(error).not.toBeInstanceOf(CouldNotRunError);
  }
});

test("the image is in the state once and in no question", () => {
  const built = buildTypeSafeRequest(state, questions, DEFAULT_MODEL_ID);
  expect(countImages(built)).toBe(1);
  expect(countImages(built.body.questions)).toBe(0);
  expect(countImages(built.body.state)).toBe(1);
  expect(built.body.state).toHaveProperty(IMAGE_STATE_PATH);
});

test("the state keeps the context and the facts unchanged", () => {
  const built = buildTypeSafeRequest(state, questions, DEFAULT_MODEL_ID);
  expect(built.body.state).toMatchObject({
    context: { purpose: "Sign up for the newsletter." },
    facts: { brand: { colors: ["#000000"] }, pages: 2 },
  });
});

test("every question is in the one request, in the same order", () => {
  const built = buildTypeSafeRequest(state, questions, DEFAULT_MODEL_ID);
  const ids: string[] = [];
  for (const question of questions) {
    ids.push(question.id);
  }
  expect(Object.keys(built.body.questions)).toEqual(ids);
  expect(built.body.questions["layout/density-mixed"]).toEqual({
    type: "choice",
    instructions: "Looking at the image at `screenshot`, how is spacing?",
    criteria: {
      even: "Even.",
      "some-sparse": "Some parts sparse.",
      cramped: "Cramped.",
    },
  });
  expect(built.body.questions["typography/measure-too-long"]).toMatchObject({
    type: "score",
    criteria: ["Comfortable.", "Somewhat long.", "Too long."],
  });
  expect(built.body.questions["typography/heading-visible#box"]).toEqual({
    type: "box",
    instructions: "the main heading in the image at `screenshot`",
  });
});

test("a duplicate question id throws", () => {
  const first = questions[0];
  if (first === undefined) {
    throw new Error("the test needs a question");
  }
  expect(() =>
    buildTypeSafeRequest(state, [first, first], DEFAULT_MODEL_ID),
  ).toThrow(/duplicate question id/);
});

test("choice option names that look like whole numbers are refused, not reordered", () => {
  const numbered: Question = {
    id: "layout/columns",
    criterion: "layout/columns",
    type: "choice",
    instructions: "How many columns does the image at `screenshot` have?",
    criteria: [
      { option: "many", description: "Many." },
      { option: "2", description: "Two." },
    ],
  };
  expect(() =>
    buildTypeSafeRequest(state, [numbered], DEFAULT_MODEL_ID),
  ).toThrow(CouldNotRunError);
});

test("the recorded response becomes typed answers with the response's model id and usage", () => {
  const checked = readTypeSafeResponse(buildRecordedResponse(), questions, {
    width: 1000,
    height: 500,
  });
  expect(checked.answers).toHaveLength(4);
  const [noul, choice, score, box] = checked.answers;
  expect(noul).toEqual({
    type: "noul",
    question_id: "typography/heading-visible",
    model: "jev-1.14.0",
    distribution: { true: 0.04, false: 0.96 },
    confidence: null,
  });
  expect(choice).toEqual({
    type: "choice",
    question_id: "layout/density-mixed",
    model: "jev-1.14.0",
    distribution: { even: 0.25, "some-sparse": 0.68, cramped: 0.07 },
    confidence: 0.48,
  });
  expect(score).toEqual({
    type: "score",
    question_id: "typography/measure-too-long",
    model: "jev-1.14.0",
    distribution: { "0": 0.46, "1": 0.37, "2": 0.17 },
    confidence: 0,
  });
  expect(box?.type).toBe("box");
  if (box?.type === "box") {
    expect(box.question_id).toBe("typography/heading-visible#box");
    expect(box.confidence).toBe(0.19);
    expect(box.region.x).toBeCloseTo(140);
    expect(box.region.y).toBeCloseTo(15);
    expect(box.region.width).toBeCloseTo(530);
    expect(box.region.height).toBeCloseTo(155);
  }
  expect(checked.usage.input_tokens).toBe(5402);
  expect(checked.usage.model).toBe("jev-1.14.0");
  expect(checked.usage.cost_usd).toBeCloseTo(
    (5402 * PRICE_USD_PER_MILLION_INPUT_TOKENS) / 1_000_000,
    12,
  );
});

test("the model id comes from the response, not the request", () => {
  const response = buildRecordedResponse();
  response.model = "jev-1.14.1";
  const checked = readTypeSafeResponse(response, questions, {
    width: 1000,
    height: 500,
  });
  for (const answer of checked.answers) {
    expect(answer.model).toBe("jev-1.14.1");
  }
  expect(checked.usage.model).toBe("jev-1.14.1");
});

test("a box answer with no confidence keeps null", () => {
  const response = buildRecordedResponse();
  const boxAnswer = response.answers?.["typography/heading-visible#box"];
  if (boxAnswer === undefined) {
    throw new Error("the recorded response needs a box answer");
  }
  boxAnswer.confidence = null;
  const checked = readTypeSafeResponse(response, questions, {
    width: 1000,
    height: 500,
  });
  expect(checked.answers[3]?.confidence).toBeNull();
});

/** Each case breaks one part of the recorded response; every one must throw CouldNotRunError (CS-7, FR-24). */
const brokenResponses: Array<{
  name: string;
  breakIt: (response: RecordedResponse) => void;
}> = [
  {
    name: "no model",
    breakIt: (response) => {
      delete response.model;
    },
  },
  {
    name: "no answers",
    breakIt: (response) => {
      delete response.answers;
    },
  },
  {
    name: "a missing answer",
    breakIt: (response) => {
      delete response.answers?.["layout/density-mixed"];
    },
  },
  {
    name: "an answer for a question not asked",
    breakIt: (response) => {
      if (response.answers !== undefined) {
        response.answers.extra = { type: "noul", noul: 0.5 };
      }
    },
  },
  {
    name: "a wrong answer type",
    breakIt: (response) => {
      if (response.answers !== undefined) {
        response.answers["typography/heading-visible"] = {
          type: "score",
          noul: 0.5,
        };
      }
    },
  },
  {
    name: "a noul probability over 1",
    breakIt: (response) => {
      if (response.answers !== undefined) {
        response.answers["typography/heading-visible"] = {
          type: "noul",
          noul: 1.5,
        };
      }
    },
  },
  {
    name: "a missing choice probability",
    breakIt: (response) => {
      const choice = response.answers?.["layout/density-mixed"];
      if (choice !== undefined) {
        choice.probabilities = { even: 0.5, "some-sparse": 0.5 };
      }
    },
  },
  {
    name: "a missing score confidence",
    breakIt: (response) => {
      const score = response.answers?.["typography/measure-too-long"];
      if (score !== undefined) {
        delete score.confidence;
      }
    },
  },
  {
    name: "a box with left past right",
    breakIt: (response) => {
      const box = response.answers?.["typography/heading-visible#box"];
      if (box !== undefined) {
        box.box = { top: 0.1, bottom: 0.2, left: 0.8, right: 0.3 };
      }
    },
  },
  {
    name: "no usage",
    breakIt: (response) => {
      delete response.usage;
    },
  },
  {
    name: "a null input token count",
    breakIt: (response) => {
      response.usage = { input_tokens: null, output_tokens: null };
    },
  },
];

for (const brokenCase of brokenResponses) {
  test(`a response with ${brokenCase.name} throws CouldNotRunError`, () => {
    const response = buildRecordedResponse();
    brokenCase.breakIt(response);
    expect(() =>
      readTypeSafeResponse(response, questions, { width: 1000, height: 500 }),
    ).toThrow(CouldNotRunError);
  });
}

test("a response that is not an object throws CouldNotRunError", () => {
  expect(() =>
    readTypeSafeResponse("nope", questions, { width: 1000, height: 500 }),
  ).toThrow(CouldNotRunError);
});
