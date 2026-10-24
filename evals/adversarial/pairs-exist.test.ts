// The no-key check of the EV-7 pair file. It runs in npm run ci and asks TypeSafe nothing (CS-21).
// It checks that every image the pair file names exists, has an entry in its folder's
// ATTRIBUTION.md, and is 2 MB or less (FR-54), and that every pack and criterion it names exists.

import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readPairs } from "./pairs.ts";

/** The repository root. Every path in the pair file is relative to it. */
const REPOSITORY_ROOT = fileURLToPath(new URL("../../", import.meta.url));

/** The hand-written pair file (EV-7, AC-5). */
const PAIRS_PATH = join(REPOSITORY_ROOT, "evals", "adversarial", "pairs.json");

/** The largest fixture file FR-54 allows, in bytes. */
const MAX_FIXTURE_BYTES = 2 * 1024 * 1024;

const pairs = readPairs("pairs.json", readFileSync(PAIRS_PATH, "utf8"));

describe("evals/adversarial/pairs.json", () => {
  it("lists at least one pair of each kind", () => {
    const kinds = new Set<string>();
    for (const pair of pairs) {
      kinds.add(pair.kind);
    }
    expect(kinds).toEqual(new Set(["praise", "condemn"]));
  });

  for (const pair of pairs) {
    it(`pair ${pair.id}: both images exist, have an attribution entry, and are 2 MB or less`, () => {
      for (const imagePath of [pair.text_image, pair.twin]) {
        const absolutePath = join(REPOSITORY_ROOT, imagePath);
        expect(existsSync(absolutePath), `${imagePath} is missing`).toBe(true);
        expect(
          statSync(absolutePath).size,
          `${imagePath} is over 2 MB`,
        ).toBeLessThanOrEqual(MAX_FIXTURE_BYTES);
        const attributionPath = join(dirname(absolutePath), "ATTRIBUTION.md");
        const attributionLines = readFileSync(attributionPath, "utf8").split(
          "\n",
        );
        expect(
          attributionLines,
          `${imagePath} has no entry in ATTRIBUTION.md`,
        ).toContain(`## ${basename(imagePath)}`);
      }
    });

    it(`pair ${pair.id}: the pack and its criterion exist`, () => {
      const packYamlPath = join(
        REPOSITORY_ROOT,
        "packs",
        pair.pack,
        "pack.yaml",
      );
      expect(existsSync(packYamlPath), `${packYamlPath} is missing`).toBe(true);
      const packLines = readFileSync(packYamlPath, "utf8").split("\n");
      expect(
        packLines,
        `packs/${pair.pack}/pack.yaml has no criterion ${pair.criterion}`,
      ).toContain(`  - id: ${pair.criterion}`);
    });
  }
});
