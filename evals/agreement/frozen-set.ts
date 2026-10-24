// The hash that names a frozen fixture set (EV-4 rule 5). The frozen set is the list of PNG hashes
// in a pack's fixtures/rendered.json, so the hash covers those and nothing else: a new render that
// changes only the recorded defect evidence, or the order of the records, leaves it the same. It
// does no I/O; run-agreement.ts reads the file.

import { createHash } from "node:crypto";

/**
 * Return the SHA-256 of the sorted png_sha256 values in the text of a rendered.json, one per line.
 * Throw when the text is not a list of records that each have a png_sha256 string, because a set
 * that cannot be named cannot be frozen.
 */
export function hashFrozenFixtureSet(renderedJsonText: string): string {
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
  return createHash("sha256").update(pngHashes.join("\n")).digest("hex");
}
