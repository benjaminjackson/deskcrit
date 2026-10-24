// The frozen fixture set of a pack and the guard that keeps a live run off fixtures already
// scored (EV-4 rule 5). The frozen set is the list of PNG hashes in a pack's
// fixtures/rendered.json, so it covers those and nothing else: a new render that changes only the
// recorded defect evidence, or the order of the records, leaves it the same. It does no I/O;
// run-agreement.ts reads and writes the files.

import { createHash } from "node:crypto";

/**
 * Return the png_sha256 values in the text of a rendered.json, sorted. Throw when the text is not
 * a list of records that each have a png_sha256 string, because a set that cannot be named cannot
 * be frozen.
 */
export function readFrozenPngHashes(renderedJsonText: string): string[] {
  const parsed: unknown = JSON.parse(renderedJsonText);
  if (!Array.isArray(parsed)) {
    throw new Error("rendered.json is not a list of render records");
  }
  const pngHashes: string[] = [];
  for (const record of parsed) {
    const pngHash: unknown =
      typeof record === "object" && record !== null
        ? (record as Record<string, unknown>).png_sha256
        : undefined;
    if (typeof pngHash !== "string") {
      throw new Error("a rendered.json record has no png_sha256 string");
    }
    pngHashes.push(pngHash);
  }
  // Hex strings sort the same by code unit in every locale (CS-18).
  pngHashes.sort();
  return pngHashes;
}

/**
 * Return the SHA-256 of the sorted png_sha256 values in the text of a rendered.json, one per line.
 * This is the hash that names the set a run scored.
 */
export function hashFrozenFixtureSet(renderedJsonText: string): string {
  return hashPngHashes(readFrozenPngHashes(renderedJsonText));
}

/** Return the SHA-256 of a list of PNG hashes, sorted first, joined one per line. */
export function hashPngHashes(pngHashes: readonly string[]): string {
  // Hex strings sort the same by code unit in every locale (CS-18).
  const sorted = [...pngHashes].sort();
  return createHash("sha256").update(sorted.join("\n")).digest("hex");
}

/**
 * Read the text of a scored PNG list file: one PNG hash per line. Blank lines are ignored. Throw
 * on a line that is not a 64-character lowercase hex SHA-256, because a damaged list could let a
 * scored fixture through the guard.
 */
export function parseScoredPngHashes(text: string): string[] {
  const pngHashes: string[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") {
      continue;
    }
    if (!/^[0-9a-f]{64}$/.test(trimmed)) {
      throw new Error(
        `the scored PNG list has a line that is not a SHA-256: ${trimmed}`,
      );
    }
    pngHashes.push(trimmed);
  }
  return pngHashes;
}

/**
 * Return the text of a scored PNG list file that holds every hash in both lists, sorted, once
 * each, with one hash per line. A live run calls it with the hashes it just scored, so the list
 * only grows and a fixture once scored stays recorded.
 */
export function formatScoredPngHashes(
  previousPngHashes: readonly string[],
  scoredPngHashes: readonly string[],
): string {
  const allHashes = new Set<string>(previousPngHashes);
  for (const pngHash of scoredPngHashes) {
    allHashes.add(pngHash);
  }
  // Hex strings sort the same by code unit in every locale (CS-18).
  const sorted = [...allHashes].sort();
  return sorted.map((pngHash) => `${pngHash}\n`).join("");
}

/** What the guard decides about a live run on one pack. */
export type LiveRunDecision =
  // The stored set hash equals the hash of the current set: this exact set was scored.
  | "refuse-same-set"
  // Every PNG in the current set is in the scored PNG list, though the set as a whole is new,
  // for example after criteria and their fixtures were removed.
  | "refuse-all-scored"
  // At least one PNG was never scored with this model, or nothing was recorded yet.
  | "allow";

/**
 * Decide whether a live run may score the current fixture set with a model (EV-4 rule 5). The
 * first scored run on a fixture decides, so a run is refused when the set holds no PNG that was
 * not already scored with that model. storedSetHash is the content of the older single-hash file
 * (null when there is none); it still refuses the exact set it names, for runs scored before the
 * scored PNG list existed. scoredPngHashes is the scored PNG list (null when there is none).
 */
export function decideLiveRun(
  currentPngHashes: readonly string[],
  storedSetHash: string | null,
  scoredPngHashes: readonly string[] | null,
): LiveRunDecision {
  const currentSetHash = hashPngHashes(currentPngHashes);
  if (storedSetHash !== null && storedSetHash === currentSetHash) {
    return "refuse-same-set";
  }
  if (scoredPngHashes === null) {
    return "allow";
  }
  const scored = new Set<string>(scoredPngHashes);
  for (const pngHash of currentPngHashes) {
    if (!scored.has(pngHash)) {
      return "allow";
    }
  }
  return "refuse-all-scored";
}
