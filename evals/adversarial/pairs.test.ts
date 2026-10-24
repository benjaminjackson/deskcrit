// Disposable unit tests for the EV-7 pair file checker (CS-22). They use plain values only.

import { describe, expect, it } from "vitest";
import { readPairs } from "./pairs.ts";

/** One valid pair, which each test copies and breaks in one way. */
const VALID_PAIR = {
  id: "demo-praise",
  kind: "praise",
  pack: "typography",
  criterion: "demo",
  text_image: "packs/_adversarial/fixtures/demo-praise.positive.png",
  twin: "packs/_adversarial/fixtures/demo-praise.negative.png",
};

/** Return the JSON text of a pair file that holds these entries. */
function pairFileText(entries: readonly unknown[]): string {
  return JSON.stringify(entries);
}

describe("readPairs", () => {
  it("loads a valid file", () => {
    const pairs = readPairs("pairs.json", pairFileText([VALID_PAIR]));
    expect(pairs).toEqual([VALID_PAIR]);
  });

  it("rejects a missing twin and names the pair", () => {
    const { twin: _twin, ...pairWithoutTwin } = VALID_PAIR;
    expect(() =>
      readPairs("pairs.json", pairFileText([pairWithoutTwin])),
    ).toThrow("pairs.json: pair demo-praise: twin is missing or empty");
  });

  it("rejects an unknown kind and names the pair", () => {
    const pair = { ...VALID_PAIR, kind: "neutral" };
    expect(() => readPairs("pairs.json", pairFileText([pair]))).toThrow(
      "pairs.json: pair demo-praise: kind must be praise or condemn, not neutral",
    );
  });

  it("rejects a repeated id and names the pair", () => {
    const secondPair = {
      ...VALID_PAIR,
      text_image: "other.positive.png",
      twin: "other.negative.png",
    };
    expect(() =>
      readPairs("pairs.json", pairFileText([VALID_PAIR, secondPair])),
    ).toThrow("pairs.json: pair demo-praise: the id is already used");
  });

  it("rejects the same images under a new id and names the pair", () => {
    const secondPair = { ...VALID_PAIR, id: "demo-copy" };
    expect(() =>
      readPairs("pairs.json", pairFileText([VALID_PAIR, secondPair])),
    ).toThrow("pairs.json: pair demo-copy:");
  });

  it("rejects an image that is its own twin", () => {
    const pair = { ...VALID_PAIR, twin: VALID_PAIR.text_image };
    expect(() => readPairs("pairs.json", pairFileText([pair]))).toThrow(
      "pairs.json: pair demo-praise: text_image and twin are the same file",
    );
  });

  it("rejects text that is not a JSON list", () => {
    expect(() => readPairs("pairs.json", "{}")).toThrow(
      "pairs.json: must hold a JSON list of pairs",
    );
  });
});
