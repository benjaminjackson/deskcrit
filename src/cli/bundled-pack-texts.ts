// The text of each first-party pack's pack.yaml, for the bundled packs (FR-11, FR-53, NFR-2).
//
// This is the version that runs from source and under Vitest: it reads packs/ from disk when the
// module loads. The CLI build in scripts/build.mjs replaces this whole file with one line,
// `export const BUNDLED_PACK_TEXTS = [...]`, which holds the same texts as strings, so the built
// dist/crit.js reads no pack file at run time. Both versions use the same rules: a folder whose
// name starts with `_` is not a pack, a folder with no pack.yaml is skipped, and the list is sorted
// by folder name with a plain comparator (CS-18). Only pack.yaml text is read, never fixtures
// (FR-44).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** One bundled pack: its folder name under packs/ and the text of its pack.yaml (FR-53). */
export type BundledPackSource = {
  readonly name: string;
  readonly yamlText: string;
};

/** The packs/ folder at the repository root, two levels above this file. */
const PACKS_DIRECTORY = fileURLToPath(new URL("../../packs/", import.meta.url));

/** Read every packs/<name>/pack.yaml by the rules in the file comment, sorted by name (CS-18). */
function readPackTexts(): BundledPackSource[] {
  const names: string[] = [];
  for (const entry of readdirSync(PACKS_DIRECTORY, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) {
      continue;
    }
    if (!existsSync(join(PACKS_DIRECTORY, entry.name, "pack.yaml"))) {
      continue;
    }
    names.push(entry.name);
  }
  names.sort((left, right) => {
    if (left < right) {
      return -1;
    }
    if (left > right) {
      return 1;
    }
    return 0;
  });
  const sources: BundledPackSource[] = [];
  for (const name of names) {
    const yamlText = readFileSync(
      join(PACKS_DIRECTORY, name, "pack.yaml"),
      "utf8",
    );
    sources.push({ name, yamlText });
  }
  return sources;
}

/** The text of each bundled pack, sorted by name (FR-11, FR-53). */
export const BUNDLED_PACK_TEXTS: readonly BundledPackSource[] = readPackTexts();
