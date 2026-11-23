// Checks the images recovered from git history for the critic evaluations (EV-14).
// It reads files only and runs no git command, because CI may check out a shallow clone.
// The manifest and the PNG files on disk must name the same files, each PNG must have the
// SHA-256 the manifest records, and each criterion must have as many positive as negative images.

import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/** One image of the manifest: where it is, which criterion it shows, and where it came from. */
type ManifestEntry = {
  file: string;
  pack: string;
  criterion: string;
  variant: number;
  polarity: string;
  source_commit: string;
  sha256: string;
  title: string;
  question: string;
  removal_commit: string;
  removed_because: string;
};

/** The folder that holds the manifest and one subfolder of PNG files per pack. */
const FIXTURES_FOLDER = fileURLToPath(new URL("./", import.meta.url));

/** The keys that every manifest entry must have. */
const REQUIRED_KEYS = [
  "file",
  "pack",
  "criterion",
  "variant",
  "polarity",
  "source_commit",
  "sha256",
  "title",
  "question",
  "removal_commit",
  "removed_because",
];

const manifest = JSON.parse(
  readFileSync(join(FIXTURES_FOLDER, "manifest.json"), "utf8"),
) as ManifestEntry[];

/**
 * Lists each PNG file on disk as `<pack>/<name>`, sorted. A PNG directly in this folder is
 * listed by its bare name, which no manifest entry has, so the comparison with the manifest fails.
 */
function listPngFilesOnDisk(): string[] {
  const files: string[] = [];
  const folderEntries = readdirSync(FIXTURES_FOLDER, { withFileTypes: true });
  for (const folderEntry of folderEntries) {
    if (!folderEntry.isDirectory()) {
      if (folderEntry.name.endsWith(".png")) {
        files.push(folderEntry.name);
      }
      continue;
    }
    for (const name of readdirSync(join(FIXTURES_FOLDER, folderEntry.name))) {
      if (name.endsWith(".png")) {
        files.push(`${folderEntry.name}/${name}`);
      }
    }
  }
  return files.sort();
}

describe("evals/critic/removed-fixtures/manifest.json", () => {
  it("names exactly the PNG files on disk", () => {
    const manifestFiles = manifest.map((entry) => entry.file).sort();
    expect(manifestFiles).toEqual(listPngFilesOnDisk());
  });

  it("gives every entry the required keys", () => {
    for (const entry of manifest) {
      for (const key of REQUIRED_KEYS) {
        expect(entry, `${entry.file} has no ${key}`).toHaveProperty(key);
      }
    }
  });

  it("records the SHA-256 of each PNG file", () => {
    for (const entry of manifest) {
      const bytes = readFileSync(join(FIXTURES_FOLDER, entry.file));
      const actualHash = createHash("sha256").update(bytes).digest("hex");
      expect(actualHash, `${entry.file} changed`).toBe(entry.sha256);
    }
  });

  it("has as many positive as negative images for each criterion", () => {
    // Maps `<pack>/<criterion>` to the count of positive images minus the count of negative images.
    const balanceByCriterion = new Map<string, number>();
    for (const entry of manifest) {
      expect(["positive", "negative"], `${entry.file} polarity`).toContain(
        entry.polarity,
      );
      const key = `${entry.pack}/${entry.criterion}`;
      const change = entry.polarity === "positive" ? 1 : -1;
      balanceByCriterion.set(key, (balanceByCriterion.get(key) ?? 0) + change);
    }
    for (const [criterion, balance] of balanceByCriterion) {
      expect(balance, `${criterion} positive minus negative`).toBe(0);
    }
  });
});
