// The no-key check of the EV-9 label file. It runs in npm run ci and asks TypeSafe nothing (CS-21).
// It checks that every image the label file names exists, has an entry in its folder's
// ATTRIBUTION.md, and is 2 MB or less (FR-54); that every target names a criterion its pack has;
// that each targeted criterion's defect declaration in packs/_compare-pairs/ is the pack's own,
// byte for byte (FR-54 rule 2); and that both images of a pair come from one template (FR-54
// rule 3). It does not check the preferences, which only Benjamin Jackson writes (EV-5).

import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { readLabelledPairs } from "./compare-labels.ts";

/** The repository root. Every image path in the label file is relative to it. */
const REPOSITORY_ROOT = fileURLToPath(new URL("../../", import.meta.url));

/** The EV-9 label file (EV-9, AC-5). */
const LABELS_PATH = join(
  REPOSITORY_ROOT,
  "evals",
  "compare-pairs",
  "labels.json",
);

/** The folder of the pair templates, beside the first-party packs because the renderer reads only packs/. */
const COMPARE_PAIRS_PACK_DIRECTORY = join(
  REPOSITORY_ROOT,
  "packs",
  "_compare-pairs",
);

/** The largest fixture file FR-54 allows, in bytes. */
const MAX_FIXTURE_BYTES = 2 * 1024 * 1024;

const pairs = readLabelledPairs(
  "labels.json",
  readFileSync(LABELS_PATH, "utf8"),
);

/**
 * Return the template that rendered one image, from the rendered.json in the image's folder, or
 * null when the file or its entry for the image is missing (FR-54).
 */
function readTemplateOf(imagePath: string): string | null {
  const renderedPath = join(dirname(imagePath), "rendered.json");
  if (!existsSync(renderedPath)) {
    return null;
  }
  const records: unknown = JSON.parse(readFileSync(renderedPath, "utf8"));
  if (!Array.isArray(records)) {
    return null;
  }
  for (const record of records) {
    if (typeof record !== "object" || record === null) {
      continue;
    }
    // Reflect.get reads a key from an object whose keys TypeScript does not know.
    const fixture: unknown = Reflect.get(record, "fixture");
    const template: unknown = Reflect.get(record, "template");
    if (fixture === basename(imagePath) && typeof template === "string") {
      return template;
    }
  }
  return null;
}

describe("evals/compare-pairs/labels.json", () => {
  for (const pair of pairs) {
    it(`pair ${pair.pair_id}: both images exist, have an attribution entry, and are 2 MB or less`, () => {
      for (const imagePath of [pair.before, pair.after]) {
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

    it(`pair ${pair.pair_id}: both images come from one template`, () => {
      const beforeTemplate = readTemplateOf(join(REPOSITORY_ROOT, pair.before));
      const afterTemplate = readTemplateOf(join(REPOSITORY_ROOT, pair.after));
      expect(
        beforeTemplate,
        `${pair.before} has no rendered.json entry`,
      ).not.toBeNull();
      expect(afterTemplate, `${pair.after} has no rendered.json entry`).toBe(
        beforeTemplate,
      );
    });

    for (const target of pair.targets) {
      it(`pair ${pair.pair_id}: target ${target} exists and its defect declaration matches the pack's`, () => {
        const [packName, criterionId] = target.split("/");
        const packYamlPath = join(
          REPOSITORY_ROOT,
          "packs",
          packName ?? "",
          "pack.yaml",
        );
        expect(existsSync(packYamlPath), `${packYamlPath} is missing`).toBe(
          true,
        );
        const packLines = readFileSync(packYamlPath, "utf8").split("\n");
        expect(
          packLines,
          `packs/${packName}/pack.yaml has no criterion ${criterionId}`,
        ).toContain(`  - id: ${criterionId}`);
        const defectFileName = `${criterionId}.defect.json`;
        const packDefectPath = join(
          REPOSITORY_ROOT,
          "packs",
          packName ?? "",
          "templates",
          defectFileName,
        );
        const pairDefectPath = join(
          COMPARE_PAIRS_PACK_DIRECTORY,
          "templates",
          defectFileName,
        );
        expect(existsSync(pairDefectPath), `${pairDefectPath} is missing`).toBe(
          true,
        );
        expect(
          readFileSync(pairDefectPath).equals(readFileSync(packDefectPath)),
          `${pairDefectPath} differs from ${packDefectPath}`,
        ).toBe(true);
      });
    }
  }
});
