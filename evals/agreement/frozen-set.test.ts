import { describe, expect, it } from "vitest";
import {
  decideLiveRun,
  formatScoredPngHashes,
  hashFrozenFixtureSet,
  hashPngHashes,
  parseScoredPngHashes,
  readFrozenPngHashes,
} from "./frozen-set.ts";

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

/** Makes a 64-character hex string that stands in for the SHA-256 of one PNG. */
function pngHash(seed: string): string {
  return seed.repeat(64).slice(0, 64);
}

/**
 * Builds the rendered.json text of a pack whose criteria each have one positive and one negative
 * fixture, with PNG hashes made from the criterion's seed letter and a digit.
 */
function packRenderedJson(criterionSeeds: string[]): string {
  const records: { png: string; evidence: string }[] = [];
  for (const seed of criterionSeeds) {
    records.push({ png: pngHash(`${seed}1`), evidence: "x" });
    records.push({ png: pngHash(`${seed}2`), evidence: "x" });
  }
  return renderedJson(records);
}

/**
 * Plays a live run that scored this rendered.json, as run-agreement.ts records it: the set hash
 * and the scored PNG list, read back from the text it writes.
 */
function scoreSet(
  renderedJsonText: string,
  previousList: string[] = [],
): { storedSetHash: string; scoredPngHashes: string[] } {
  const listText = formatScoredPngHashes(
    previousList,
    readFrozenPngHashes(renderedJsonText),
  );
  return {
    storedSetHash: hashFrozenFixtureSet(renderedJsonText),
    scoredPngHashes: parseScoredPngHashes(listText),
  };
}

describe("decideLiveRun", () => {
  const scoredSet = packRenderedJson(["a", "b", "c"]);

  it("refuses the exact set that was scored", () => {
    const record = scoreSet(scoredSet);
    expect(
      decideLiveRun(
        readFrozenPngHashes(scoredSet),
        record.storedSetHash,
        record.scoredPngHashes,
      ),
    ).toBe("refuse-same-set");
  });

  it("refuses a set left after one criterion's fixtures are removed", () => {
    const record = scoreSet(scoredSet);
    const keptSet = packRenderedJson(["a", "c"]);
    expect(hashFrozenFixtureSet(keptSet)).not.toBe(record.storedSetHash);
    expect(
      decideLiveRun(
        readFrozenPngHashes(keptSet),
        record.storedSetHash,
        record.scoredPngHashes,
      ),
    ).toBe("refuse-all-scored");
  });

  it("allows a set with at least one PNG never scored", () => {
    const record = scoreSet(scoredSet);
    const grownSet = packRenderedJson(["a", "c", "d"]);
    expect(
      decideLiveRun(
        readFrozenPngHashes(grownSet),
        record.storedSetHash,
        record.scoredPngHashes,
      ),
    ).toBe("allow");
  });

  it("allows a set when nothing was recorded for the model", () => {
    expect(decideLiveRun(readFrozenPngHashes(scoredSet), null, null)).toBe(
      "allow",
    );
  });

  it("still refuses the exact set named by an old single-hash file", () => {
    const oldHash = hashFrozenFixtureSet(scoredSet);
    expect(decideLiveRun(readFrozenPngHashes(scoredSet), oldHash, null)).toBe(
      "refuse-same-set",
    );
  });

  it("keeps every PNG of earlier runs in the scored list", () => {
    const firstRun = scoreSet(packRenderedJson(["a", "b"]));
    const secondRun = scoreSet(
      packRenderedJson(["c"]),
      firstRun.scoredPngHashes,
    );
    expect(
      decideLiveRun(
        readFrozenPngHashes(packRenderedJson(["a", "c"])),
        secondRun.storedSetHash,
        secondRun.scoredPngHashes,
      ),
    ).toBe("refuse-all-scored");
  });
});

describe("the scored PNG list file", () => {
  it("writes each hash once, sorted, one per line", () => {
    const text = formatScoredPngHashes(
      [pngHash("b"), pngHash("a")],
      [pngHash("a"), pngHash("c")],
    );
    expect(text).toBe(`${pngHash("a")}\n${pngHash("b")}\n${pngHash("c")}\n`);
    expect(parseScoredPngHashes(text)).toEqual([
      pngHash("a"),
      pngHash("b"),
      pngHash("c"),
    ]);
  });

  it("refuses a line that is not a SHA-256", () => {
    expect(() => parseScoredPngHashes("not-a-hash\n")).toThrow("not a SHA-256");
  });

  it("hashes a PNG list the same way as the rendered.json it came from", () => {
    const text = packRenderedJson(["e", "f"]);
    expect(hashPngHashes(readFrozenPngHashes(text))).toBe(
      hashFrozenFixtureSet(text),
    );
  });
});
