// The first-party packs that travel inside the CLI bundle (FR-11, FR-51, FR-53). This module turns
// the embedded pack.yaml texts into parsed packs with the pack loader, so the loader stays the one
// place that parses and checks pack YAML (CS-4, CS-7). It writes no file and keeps no cache (AC-5).

import { loadPack } from "../index.js";
import { CouldNotRunError } from "../shared/could-not-run-error.js";
import type { Pack } from "../shared/pack.js";
import {
  BUNDLED_PACK_TEXTS,
  type BundledPackSource,
} from "./bundled-pack-texts.js";

export type { BundledPackSource };

/** Return the name and pack.yaml text of each bundled pack, sorted by name (FR-53, CS-18). */
export function listBundledPackSources(): BundledPackSource[] {
  return [...BUNDLED_PACK_TEXTS];
}

/**
 * Parse the bundled packs that `requestedNames` names, in that order, or every bundled pack in
 * name order when the list is missing or empty (FR-11, NFR-5). A name that is not bundled throws
 * CouldNotRunError that lists the bundled names, so the run exits with code 2 (FR-4, CS-16).
 * Each pack's version comes from its bundled text only (FR-51).
 */
export function loadBundledPacks(requestedNames?: readonly string[]): Pack[] {
  const sources = listBundledPackSources();
  let selected: BundledPackSource[];
  if (requestedNames === undefined || requestedNames.length === 0) {
    selected = sources;
  } else {
    selected = [];
    for (const name of requestedNames) {
      const source = sources.find((candidate) => candidate.name === name);
      if (source === undefined) {
        const bundledNames = sources
          .map((candidate) => candidate.name)
          .join(", ");
        throw new CouldNotRunError(
          `pack ${name} is not a bundled pack; the bundled packs are: ${bundledNames}`,
        );
      }
      selected.push(source);
    }
  }
  const packs: Pack[] = [];
  for (const source of selected) {
    packs.push(loadPack(source.yamlText, `bundled pack ${source.name}`));
  }
  return packs;
}
