import { describe, expect, it } from "vitest";
import {
  formatAskedQuestionHashes,
  formatCanonicalJson,
  formatQuestionRecord,
  hashCriterionQuestion,
  parseAskedQuestionHashes,
  parseQuestionRecord,
  recordFileNameFor,
} from "./question-hash.ts";

/** A criterion as the YAML parser returns it. */
const CRITERION = {
  id: "demo",
  title: "The demo defect",
  source: "A source.",
  question: {
    type: "noul",
    instructions: "Is the demo defect there?",
    criteria: { true: "It is there.", false: "It is not there." },
  },
  fail_when: { probability_at_least: 0.7 },
  fix: "Remove it.",
};

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);

describe("hashCriterionQuestion", () => {
  it("does not change with key order, thresholds, the fix hint, the title, or the source", () => {
    const reordered = {
      fix: "Another fix.",
      question: {
        criteria: { false: "It is not there.", true: "It is there." },
        instructions: "Is the demo defect there?",
        type: "noul",
      },
      fail_when: { probability_at_least: 0.9 },
      title: "Another title",
      source: "Another source.",
      id: "demo",
    };
    expect(hashCriterionQuestion(reordered)).toBe(
      hashCriterionQuestion(CRITERION),
    );
  });

  it("changes with the question text and with the locate fields", () => {
    const base = hashCriterionQuestion(CRITERION);
    const reworded = {
      ...CRITERION,
      question: { ...CRITERION.question, instructions: "Another question?" },
    };
    expect(hashCriterionQuestion(reworded)).not.toBe(base);
    const located = {
      ...CRITERION,
      locate: true,
      locate_instructions: "Find it.",
    };
    expect(hashCriterionQuestion(located)).not.toBe(base);
  });

  it("writes JSON with sorted keys and no undefined field", () => {
    expect(
      formatCanonicalJson({ b: [2, { d: 1, c: null }], a: undefined }),
    ).toBe('{"b":[2,{"c":null,"d":1}]}');
  });
});

describe("record files", () => {
  it("are named after their answers file", () => {
    expect(recordFileNameFor("a.png.answers.json")).toBe(
      "a.png.answers.questions.json",
    );
    expect(recordFileNameFor("a.png.answers-2.json")).toBe(
      "a.png.answers-2.questions.json",
    );
  });

  it("read back what they write", () => {
    const record = new Map([
      ["demo/second", SHA_B],
      ["demo/first", SHA_A],
    ]);
    const text = formatQuestionRecord(record);
    expect(text).toBe(
      `{\n  "demo/first": "${SHA_A}",\n  "demo/second": "${SHA_B}"\n}\n`,
    );
    expect(parseQuestionRecord(text)).toEqual(record);
  });

  it("refuse a value that is not a SHA-256 and a text that is not an object", () => {
    expect(() => parseQuestionRecord('{"demo/first": "abc"}')).toThrow(
      /demo\/first that is not a SHA-256/,
    );
    expect(() => parseQuestionRecord("[]")).toThrow(/not a JSON object/);
    expect(() => parseQuestionRecord("{")).toThrow(/not JSON/);
  });
});

describe("the asked list", () => {
  it("keeps every line once, sorted, and only grows", () => {
    const text = formatAskedQuestionHashes(
      [{ questionSha256: SHA_B, criterion: "demo/first" }],
      [
        { questionSha256: SHA_A, criterion: "demo/second" },
        { questionSha256: SHA_B, criterion: "demo/first" },
      ],
    );
    expect(text).toBe(`${SHA_A} demo/second\n${SHA_B} demo/first\n`);
    expect(parseAskedQuestionHashes(text)).toEqual([
      { questionSha256: SHA_A, criterion: "demo/second" },
      { questionSha256: SHA_B, criterion: "demo/first" },
    ]);
  });

  it("refuses a line that is not a SHA-256 and a pack-qualified id", () => {
    expect(() => parseAskedQuestionHashes(`${SHA_A}\n`)).toThrow(
      /not "<sha256> <pack>\/<id>"/,
    );
    expect(() => parseAskedQuestionHashes(`${SHA_A} first\n`)).toThrow(
      /not "<sha256> <pack>\/<id>"/,
    );
    expect(() => parseAskedQuestionHashes("abc demo/first\n")).toThrow(
      /not "<sha256> <pack>\/<id>"/,
    );
  });
});
