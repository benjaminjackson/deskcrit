import { expect, test } from "vitest";
import type { Answer } from "../shared/answer.js";
import { CouldNotRunError } from "../shared/could-not-run-error.js";
import type { Question } from "../shared/question.js";
import { IMAGE_STATE_PATH, type State } from "../shared/state.js";
import type { AskRequest, TypeSafeAdapter } from "./adapter.js";
import { ask } from "./ask.js";
import { createStubAdapter, STUB_MODEL_ID } from "./stub.js";

const state: State = {
  [IMAGE_STATE_PATH]: {
    format: "png",
    bytes: new Uint8Array([1, 2, 3]),
    width: 400,
    height: 300,
  },
  context: { purpose: "Sign up for the newsletter." },
};

const questions: Question[] = [
  {
    id: "typography/line-length",
    criterion: "typography/line-length",
    type: "noul",
    instructions:
      "Looking at the image at `screenshot`, are body lines too long?",
    criteria: { true: "Lines are too long.", false: "Lines are fine." },
  },
  {
    id: "layout/density",
    criterion: "layout/density",
    type: "score",
    instructions: "Looking at the image at `screenshot`, how crowded is it?",
    levels: ["Airy.", "Crowded."],
  },
];

const noulAnswer: Answer = {
  type: "noul",
  question_id: "typography/line-length",
  model: STUB_MODEL_ID,
  distribution: { true: 0.2, false: 0.8 },
  confidence: null,
};

const scoreAnswer: Answer = {
  type: "score",
  question_id: "layout/density",
  model: STUB_MODEL_ID,
  distribution: { "0": 0.7, "1": 0.3 },
  confidence: 0.6,
};

test("ask returns the stub's answers and passes its usage through unchanged", async () => {
  const stub = createStubAdapter();
  const expected = await stub.askQuestions({ state, questions });
  const result = await ask(state, questions, stub);
  expect(result.answers).toEqual(expected.answers);
  expect(result.usage).toEqual({
    input_tokens: 0,
    cost_usd: 0,
    latency_ms: 0,
    model: STUB_MODEL_ID,
  });
});

test("ask returns the very usage object the adapter gave, with no requests field", async () => {
  const usage = {
    input_tokens: 1234,
    cost_usd: 0.0000518,
    latency_ms: 401,
    model: "jev-test",
  };
  const backend: TypeSafeAdapter = {
    askQuestions: async () => ({ answers: [noulAnswer, scoreAnswer], usage }),
  };
  const result = await ask(state, questions, backend);
  expect(result.usage).toBe(usage);
  expect(Object.keys(result.usage)).toEqual([
    "input_tokens",
    "cost_usd",
    "latency_ms",
    "model",
  ]);
});

// FR-64: any object that matches TypeSafeAdapter compiles as a backend and gets the state and the
// questions exactly as the caller passed them.
test("a custom backend receives the same state and questions in one call", async () => {
  const requests: AskRequest[] = [];
  const backend: TypeSafeAdapter = {
    askQuestions: async (request) => {
      requests.push(request);
      return createStubAdapter().askQuestions(request);
    },
  };
  await ask(state, questions, backend);
  expect(requests).toHaveLength(1);
  expect(requests[0]?.state).toBe(state);
  expect(requests[0]?.questions).toBe(questions);
});

test("ask does not change its arguments", async () => {
  const stateBefore = structuredClone(state);
  const questionsBefore = structuredClone(questions);
  await ask(state, questions, createStubAdapter());
  expect(state).toEqual(stateBefore);
  expect(questions).toEqual(questionsBefore);
});

test("an adapter error stops ask with the same error and no result", async () => {
  const failure = new CouldNotRunError("TypeSafe could not be reached");
  await expect(
    ask(state, questions, createStubAdapter({ failWith: failure })),
  ).rejects.toBe(failure);
});

test("zero questions still call the adapter and give empty answers", async () => {
  const result = await ask(state, [], createStubAdapter());
  expect(result.answers).toEqual([]);
  expect(result.usage.model).toBe(STUB_MODEL_ID);
});

const choiceQuestion: Question = {
  id: "layout/alignment",
  criterion: "layout/alignment",
  type: "choice",
  instructions:
    "Looking at the image at `screenshot`, how is the text aligned?",
  criteria: [
    { option: "consistent", description: "One alignment." },
    { option: "mixed", description: "Several alignments." },
  ],
};

// JSON.parse returns an untyped value, which lets this test build an answer that breaks the Answer
// type, the way a faulty adapter or answers file could at run time.
const noulAnswerWithConfidence: Answer = JSON.parse(
  JSON.stringify({ ...noulAnswer, confidence: 0.8 }),
);

const mismatches: Array<{
  name: string;
  questions?: Question[];
  answers: Answer[];
  message: RegExp;
}> = [
  {
    name: "an answer is missing",
    answers: [noulAnswer],
    message: /no answer for question layout\/density/,
  },
  {
    name: "a question has two answers",
    answers: [noulAnswer, scoreAnswer, noulAnswer],
    message: /two answers for question typography\/line-length/,
  },
  {
    name: "an answer names an unknown question",
    answers: [
      noulAnswer,
      scoreAnswer,
      { ...noulAnswer, question_id: "other/criterion" },
    ],
    message: /unknown question other\/criterion/,
  },
  {
    name: "an answer has the wrong type",
    answers: [noulAnswer, { ...noulAnswer, question_id: "layout/density" }],
    message: /noul answer for score question layout\/density/,
  },
  {
    name: "two questions share an id",
    questions: [...questions, { ...choiceQuestion, id: "layout/density" }],
    answers: [noulAnswer, scoreAnswer],
    message: /two questions have the id layout\/density/,
  },
  {
    name: "a choice answer has keys that are not the options",
    questions: [choiceQuestion],
    answers: [
      {
        type: "choice",
        question_id: "layout/alignment",
        model: STUB_MODEL_ID,
        distribution: { consistent: 0.6, centred: 0.4 },
        confidence: 0.5,
      },
    ],
    message:
      /distribution keys consistent, centred for question layout\/alignment/,
  },
  {
    name: "a score answer has keys that are not the level indexes",
    answers: [
      noulAnswer,
      { ...scoreAnswer, distribution: { "0": 0.5, "1": 0.3, "2": 0.2 } },
    ],
    message: /distribution keys 0, 1, 2 for question layout\/density/,
  },
  {
    name: "a noul answer has a confidence",
    answers: [noulAnswerWithConfidence, scoreAnswer],
    message: /confidence for noul question typography\/line-length/,
  },
];

for (const mismatch of mismatches) {
  test(`ask throws a plain Error when ${mismatch.name}`, async () => {
    const stub = createStubAdapter({ answers: mismatch.answers });
    // `??` uses the shared questions when the case gives none of its own.
    const outcome = ask(state, mismatch.questions ?? questions, stub);
    await expect(outcome).rejects.toThrow(mismatch.message);
    await expect(outcome).rejects.not.toBeInstanceOf(CouldNotRunError);
  });
}
