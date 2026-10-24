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
import { CRIT_YAML_FILE_NAME } from "./crit-yaml.js";

export type { BundledPackSource };

/** Return the name and pack.yaml text of each bundled pack, sorted by name (FR-53, CS-18). */
export function listBundledPackSources(): BundledPackSource[] {
  return [...BUNDLED_PACK_TEXTS];
}

/**
 * Parse the bundled packs that `requestedNames` names, in that order, or every bundled pack in
 * name order when the list is missing or empty (FR-11, NFR-5). Each of these stops the run with
 * CouldNotRunError, so it exits with code 2 (FR-4, CS-16): a name that is not bundled (the message
 * lists the bundled names), a name given twice, no bundled pack at all when every pack is wanted,
 * and a pack whose `name` is not its folder name. Each pack's version comes from its bundled text
 * only (FR-51).
 */
export function loadBundledPacks(requestedNames?: readonly string[]): Pack[] {
  const sources = listBundledPackSources();
  let selected: BundledPackSource[];
  if (requestedNames === undefined || requestedNames.length === 0) {
    if (sources.length === 0) {
      // Only a run from source can get here, with an empty packs/ folder; the build refuses to
      // make a bundle with no pack. A run that loads no pack would check nothing and pass (FR-74).
      throw new CouldNotRunError(
        "no packs: no bundled pack was found and no --pack was given",
      );
    }
    selected = sources;
  } else {
    selected = [];
    for (const name of requestedNames) {
      if (selected.some((earlier) => earlier.name === name)) {
        throw new CouldNotRunError(
          `pack ${name} is named twice in ${CRIT_YAML_FILE_NAME}`,
        );
      }
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
    const pack = loadPack(source.yamlText, `bundled pack ${source.name}`);
    // .crit.yaml selects a pack by its folder name and the report lists it by its pack.yaml name,
    // so the two must be the same name (FR-51).
    if (pack.name !== source.name) {
      throw new CouldNotRunError(
        `bundled pack folder ${source.name} holds a pack named ${pack.name}; the folder name and the pack name must match`,
      );
    }
    packs.push(pack);
  }
  return packs;
}
