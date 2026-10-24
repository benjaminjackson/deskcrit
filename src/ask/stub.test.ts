import { expect, test } from "vitest";
import type { Answer } from "../shared/answer.js";
import { boxQuestionIdFor, type Question } from "../shared/question.js";
import { IMAGE_STATE_PATH, type State } from "../shared/state.js";
import { createStubAdapter, STUB_MODEL_ID } from "./stub.js";

const state: State = {
  [IMAGE_STATE_PATH]: {
    format: "png",
    bytes: new Uint8Array([1, 2, 3]),
    width: 400,
    height: 300,
  },
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
    id: "layout/alignment",
    criterion: "layout/alignment",
    type: "choice",
    instructions:
      "Looking at the image at `screenshot`, how is the text aligned?",
    criteria: [
      { option: "consistent", description: "One alignment." },
      { option: "mixed", description: "Several alignments." },
    ],
  },
  {
    id: "layout/density",
    criterion: "layout/density",
    type: "score",
    instructions: "Looking at the image at `screenshot`, how crowded is it?",
    levels: ["Airy.", "Balanced.", "Crowded."],
  },
  {
    id: boxQuestionIdFor("typography/line-length"),
    criterion: "typography/line-length",
    type: "box",
    instructions: "Mark the longest line of body text.",
  },
];

test("the stub reports zero usage and the stub model id", async () => {
  const result = await createStubAdapter().askQuestions({ state, questions });
  expect(result.usage).toEqual({
    input_tokens: 0,
    cost_usd: 0,
    latency_ms: 0,
    model: STUB_MODEL_ID,
  });
});

test("the stub gives one no-defect answer per question, with its id and type", async () => {
  const result = await createStubAdapter().askQuestions({ state, questions });
  expect(result.answers).toEqual([
    {
      type: "noul",
      question_id: "typography/line-length",
      model: STUB_MODEL_ID,
      distribution: { true: 0, false: 1 },
      confidence: null,
    },
    {
      type: "choice",
      question_id: "layout/alignment",
      model: STUB_MODEL_ID,
      distribution: { consistent: 1, mixed: 0 },
      confidence: 1,
    },
    {
      type: "score",
      question_id: "layout/density",
      model: STUB_MODEL_ID,
      distribution: { "0": 1, "1": 0, "2": 0 },
      confidence: 1,
    },
    {
      type: "box",
      question_id: "typography/line-length#box",
      model: STUB_MODEL_ID,
      region: { x: 0, y: 0, width: 0, height: 0 },
      confidence: null,
    },
  ]);
});

test("the stub returns the answers it was given unchanged", async () => {
  const chosen: Answer[] = [
    {
      type: "noul",
      question_id: "typography/line-length",
      model: "jev-test",
      distribution: { true: 0.9, false: 0.1 },
      confidence: null,
    },
  ];
  const result = await createStubAdapter({ answers: chosen }).askQuestions({
    state,
    questions,
  });
  expect(result.answers).toBe(chosen);
});

test("the stub gives no answers for no questions", async () => {
  const result = await createStubAdapter().askQuestions({
    state,
    questions: [],
  });
  expect(result.answers).toEqual([]);
});

test("the stub rejects with the error it was given", async () => {
  const failure = new Error("TypeSafe is down");
  const stub = createStubAdapter({ failWith: failure });
  await expect(stub.askQuestions({ state, questions })).rejects.toBe(failure);
});
