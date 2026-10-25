import { describe, expect, it } from "vitest";
import {
  findUnlabeledPairs,
  MINIMUM_PAIRS,
  readLabeledPairs,
} from "./compare-labels.ts";

/** Build `count` valid label entries as plain objects, each with its own two images and a preference of same. */
function validEntries(count: number): Record<string, unknown>[] {
  const entries: Record<string, unknown>[] = [];
  for (let index = 1; index <= count; index += 1) {
    entries.push({
      pair_id: `pair-${index}`,
      before: `packs/_compare-pairs/fixtures/pair-${index}.before.png`,
      after: `packs/_compare-pairs/fixtures/pair-${index}.after.png`,
      targets: ["typography/heading-indistinct"],
      preference: "same",
    });
  }
  return entries;
}

/** Return MINIMUM_PAIRS valid entries with the first one's fields replaced by `changes`. */
function entriesWithFirst(
  changes: Record<string, unknown>,
): Record<string, unknown>[] {
  const entries = validEntries(MINIMUM_PAIRS);
  entries[0] = { ...entries[0], ...changes };
  return entries;
}

/** Check the entries as the label file text. */
function read(entries: unknown): ReturnType<typeof readLabeledPairs> {
  return readLabeledPairs("labels.json", JSON.stringify(entries));
}

describe("readLabeledPairs", () => {
  it("accepts thirty valid pairs, a null preference, and an empty target list", () => {
    const entries = entriesWithFirst({ preference: null, targets: [] });
    const pairs = read(entries);
    expect(pairs).toHaveLength(MINIMUM_PAIRS);
    expect(pairs[0]).toEqual({
      pair_id: "pair-1",
      before: "packs/_compare-pairs/fixtures/pair-1.before.png",
      after: "packs/_compare-pairs/fixtures/pair-1.after.png",
      targets: [],
      preference: null,
    });
  });

  it("rejects fewer than thirty pairs", () => {
    expect(() => read(validEntries(MINIMUM_PAIRS - 1))).toThrow(
      "labels.json: lists 29 pairs, and EV-9 needs at least 30",
    );
  });

  it("rejects text that is not JSON or not a list", () => {
    expect(() => readLabeledPairs("labels.json", "{")).toThrow(
      "not valid JSON",
    );
    expect(() => readLabeledPairs("labels.json", "{}")).toThrow(
      "must hold a JSON list",
    );
  });

  it("rejects an unknown preference", () => {
    expect(() => read(entriesWithFirst({ preference: "neither" }))).toThrow(
      'pair pair-1: preference must be null, after, before, or same, not "neither"',
    );
  });

  it("rejects an absolute path and a path that climbs with ..", () => {
    expect(() => read(entriesWithFirst({ before: "/tmp/before.png" }))).toThrow(
      "pair pair-1: before must be relative to the repository root",
    );
    expect(() =>
      read(entriesWithFirst({ after: "packs/../../secret.png" })),
    ).toThrow("pair pair-1: after must not contain ..");
    expect(() => read(entriesWithFirst({ before: "" }))).toThrow(
      "pair pair-1: before must be a non-empty path",
    );
  });

  it("rejects a repeated pair id", () => {
    expect(() => read(entriesWithFirst({ pair_id: "pair-2" }))).toThrow(
      "pair pair-2: the id is already used by another pair",
    );
  });

  it("rejects a pair id that is not kebab-case", () => {
    expect(() => read(entriesWithFirst({ pair_id: "Pair_1" }))).toThrow(
      "pair_id must be kebab-case",
    );
  });

  it("rejects an unknown key and a missing key", () => {
    expect(() => read(entriesWithFirst({ note: "x" }))).toThrow(
      "pair pair-1: unknown key note",
    );
    const entries = validEntries(MINIMUM_PAIRS);
    delete entries[0]?.preference;
    expect(() => read(entries)).toThrow("pair pair-1: preference is missing");
  });

  it("rejects the same image as before and after, and an image in two pairs", () => {
    expect(() =>
      read(
        entriesWithFirst({
          after: "packs/_compare-pairs/fixtures/pair-1.before.png",
        }),
      ),
    ).toThrow("pair pair-1: before and after are the same file");
    expect(() =>
      read(
        entriesWithFirst({
          after: "packs/_compare-pairs/fixtures/pair-2.after.png",
        }),
      ),
    ).toThrow("is already in another pair");
  });

  it("rejects a target without a pack and a repeated target", () => {
    expect(() =>
      read(entriesWithFirst({ targets: ["heading-indistinct"] })),
    ).toThrow("each target must be a pack/criterion id");
    expect(() =>
      read(
        entriesWithFirst({
          targets: ["layout/ragged-edge", "layout/ragged-edge"],
        }),
      ),
    ).toThrow("target layout/ragged-edge is listed twice");
  });
});

describe("findUnlabeledPairs", () => {
  it("names every pair whose preference is null, in file order", () => {
    const entries = validEntries(MINIMUM_PAIRS);
    entries[2] = { ...entries[2], preference: null };
    entries[0] = { ...entries[0], preference: null };
    expect(findUnlabeledPairs(read(entries))).toEqual(["pair-1", "pair-3"]);
  });
});
