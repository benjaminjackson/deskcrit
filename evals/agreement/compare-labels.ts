// The label file for EV-9: evals/compare-pairs/labels.json. Agents write the pair list with every
// preference null, and only Benjamin Jackson fills in the preferences (EV-5, AC-5). The compare
// agreement script and every agent only read the preferences. This module holds the one function
// that checks the file (CS-7). It reads no file: the caller reads the text and passes it here.

import { isAbsolute } from "node:path";

/** Which image of a pair the person judged better, or that neither is better (EV-9). */
export type HumanPreference = "after" | "before" | "same";

/**
 * One before-and-after pair. Image paths are relative to the repository root. `targets` holds the
 * pack-qualified criterion ids the change aims at, such as `typography/heading-indistinct`, and is
 * empty for a pair that should come out the same. `preference` is null until Benjamin Jackson
 * fills it in. Field names are the file's key names (CS-10).
 */
export type LabeledPair = {
  readonly pair_id: string;
  readonly before: string;
  readonly after: string;
  readonly targets: readonly string[];
  readonly preference: HumanPreference | null;
};

/** The fewest pairs EV-9 and EV-5 need with a human preference (EV-5, EV-9). */
export const MINIMUM_PAIRS = 30;

/** The keys every pair must have and the only keys it may have, in the order messages name them. */
const PAIR_KEYS: readonly string[] = [
  "pair_id",
  "before",
  "after",
  "targets",
  "preference",
];

/** A kebab-case id: lower-case letters and digits in groups joined by single hyphens. */
const KEBAB_CASE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** A pack-qualified criterion id: a kebab-case pack name, a slash, and a kebab-case criterion id. */
const TARGET_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*\/[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Parse and check the text of the label file. It rejects text that is not a JSON list, an entry
 * that is not an object or has unknown or missing keys, a pair id that is empty, not kebab-case,
 * or repeated, an image path that is empty, absolute, or climbs with `..`, a pair whose before and
 * after are the same file, an image used by two pairs, targets that are not a list of distinct
 * `pack/criterion` ids, a preference other than null, after, before, or same, and fewer than
 * MINIMUM_PAIRS pairs. A null preference is valid here; the agreement script refuses it later.
 * Each message names the file and the pair (EV-9, EV-5, CS-7).
 */
export function readLabeledPairs(
  fileName: string,
  jsonText: string,
): LabeledPair[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`${fileName}: not valid JSON`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`${fileName}: must hold a JSON list of pairs`);
  }
  const pairs: LabeledPair[] = [];
  const seenIds = new Set<string>();
  const seenImages = new Set<string>();
  for (let index = 0; index < parsed.length; index += 1) {
    const entry: unknown = parsed[index];
    const pair = checkPair(fileName, index, entry);
    const where = `${fileName}: pair ${pair.pair_id}`;
    if (seenIds.has(pair.pair_id)) {
      throw new Error(`${where}: the id is already used by another pair`);
    }
    seenIds.add(pair.pair_id);
    if (pair.before === pair.after) {
      throw new Error(`${where}: before and after are the same file`);
    }
    for (const imagePath of [pair.before, pair.after]) {
      if (seenImages.has(imagePath)) {
        throw new Error(`${where}: ${imagePath} is already in another pair`);
      }
      seenImages.add(imagePath);
    }
    pairs.push(pair);
  }
  if (pairs.length < MINIMUM_PAIRS) {
    throw new Error(
      `${fileName}: lists ${pairs.length} pairs, and EV-9 needs at least ${MINIMUM_PAIRS}`,
    );
  }
  return pairs;
}

/**
 * Return the ids of the pairs whose preference is still null, in file order, so the agreement
 * script can refuse to start and name them (EV-5, EV-9).
 */
export function findUnlabeledPairs(pairs: readonly LabeledPair[]): string[] {
  const unlabeled: string[] = [];
  for (const pair of pairs) {
    if (pair.preference === null) {
      unlabeled.push(pair.pair_id);
    }
  }
  return unlabeled;
}

/**
 * Check one entry of the list and return it as a LabeledPair. The message names the pair by its
 * id when it has one, and by its place in the list when it does not (CS-7).
 */
function checkPair(
  fileName: string,
  index: number,
  entry: unknown,
): LabeledPair {
  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
    throw new Error(`${fileName}: entry ${index + 1} must be a JSON object`);
  }
  // Reflect.get reads a key from an object whose keys TypeScript does not know yet.
  const idValue: unknown = Reflect.get(entry, "pair_id");
  let where = `${fileName}: entry ${index + 1}`;
  if (typeof idValue === "string" && idValue !== "") {
    where = `${fileName}: pair ${idValue}`;
  }
  for (const key of Object.keys(entry)) {
    if (!PAIR_KEYS.includes(key)) {
      throw new Error(`${where}: unknown key ${key}`);
    }
  }
  for (const key of PAIR_KEYS) {
    if (!Object.hasOwn(entry, key)) {
      throw new Error(`${where}: ${key} is missing`);
    }
  }
  const pairId = checkPairId(where, idValue);
  const before = checkImagePath(where, "before", Reflect.get(entry, "before"));
  const after = checkImagePath(where, "after", Reflect.get(entry, "after"));
  const targets = checkTargets(where, Reflect.get(entry, "targets"));
  const preference = checkPreference(where, Reflect.get(entry, "preference"));
  return { pair_id: pairId, before, after, targets, preference };
}

/** Check that a pair id is a non-empty kebab-case string (EV-9, CS-7). */
function checkPairId(where: string, value: unknown): string {
  if (typeof value !== "string" || value === "") {
    throw new Error(`${where}: pair_id must be a non-empty string`);
  }
  if (!KEBAB_CASE_PATTERN.test(value)) {
    throw new Error(`${where}: pair_id must be kebab-case, not ${value}`);
  }
  return value;
}

/**
 * Check that an image path is a non-empty path relative to the repository root that never climbs
 * out of it with a `..` segment, so the script cannot read a file outside the repository (EV-9).
 */
function checkImagePath(where: string, key: string, value: unknown): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${where}: ${key} must be a non-empty path`);
  }
  if (isAbsolute(value)) {
    throw new Error(
      `${where}: ${key} must be relative to the repository root, not ${value}`,
    );
  }
  const segments = value.split(/[/\\]/);
  if (segments.includes("..")) {
    throw new Error(`${where}: ${key} must not contain .., not ${value}`);
  }
  return value;
}

/** Check that targets is a list of distinct `pack/criterion` ids; an empty list is valid (EV-9). */
function checkTargets(where: string, value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`${where}: targets must be a list`);
  }
  const targets: string[] = [];
  for (const target of value) {
    if (typeof target !== "string" || !TARGET_PATTERN.test(target)) {
      throw new Error(
        `${where}: each target must be a pack/criterion id, not ${JSON.stringify(target)}`,
      );
    }
    if (targets.includes(target)) {
      throw new Error(`${where}: target ${target} is listed twice`);
    }
    targets.push(target);
  }
  return targets;
}

/** Check that a preference is null, after, before, or same (EV-5, EV-9). */
function checkPreference(
  where: string,
  value: unknown,
): HumanPreference | null {
  if (value === null) {
    return null;
  }
  if (value === "after" || value === "before" || value === "same") {
    return value;
  }
  throw new Error(
    `${where}: preference must be null, after, before, or same, not ${JSON.stringify(value)}`,
  );
}
