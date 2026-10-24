import { describe, expect, it } from "vitest";
import { hashFrozenFixtureSet } from "./frozen-set.ts";

/** Builds rendered.json text from records, each with a PNG hash and some evidence. */
function renderedJson(records: { png: string; evidence: string }[]): string {
  return JSON.stringify(
    records.map((record) => ({
      fixture: `${record.png}.png`,
      png_sha256: record.png,
      defect_evidence: { note: record.evidence },
    })),
  );
}

describe("hashFrozenFixtureSet", () => {
  it("gives the same hash when only the defect evidence changes", () => {
    const before = renderedJson([
      { png: "aa", evidence: "old" },
      { png: "bb", evidence: "old" },
    ]);
    const after = renderedJson([
      { png: "aa", evidence: "new" },
      { png: "bb", evidence: "new" },
    ]);
    expect(hashFrozenFixtureSet(after)).toBe(hashFrozenFixtureSet(before));
  });

  it("gives the same hash when the records change order", () => {
    const forwards = renderedJson([
      { png: "aa", evidence: "x" },
      { png: "bb", evidence: "x" },
    ]);
    const backwards = renderedJson([
      { png: "bb", evidence: "x" },
      { png: "aa", evidence: "x" },
    ]);
    expect(hashFrozenFixtureSet(backwards)).toBe(
      hashFrozenFixtureSet(forwards),
    );
  });

  it("gives a different hash when a PNG changes or is added", () => {
    const original = renderedJson([{ png: "aa", evidence: "x" }]);
    const changed = renderedJson([{ png: "ab", evidence: "x" }]);
    const added = renderedJson([
      { png: "aa", evidence: "x" },
      { png: "cc", evidence: "x" },
    ]);
    expect(hashFrozenFixtureSet(changed)).not.toBe(
      hashFrozenFixtureSet(original),
    );
    expect(hashFrozenFixtureSet(added)).not.toBe(
      hashFrozenFixtureSet(original),
    );
  });

  it("refuses a record with no PNG hash", () => {
    expect(() => hashFrozenFixtureSet('[{"fixture": "a.png"}]')).toThrow(
      "no png_sha256",
    );
  });
});
