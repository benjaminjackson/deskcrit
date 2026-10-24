// The hand-written pair file for EV-7: evals/adversarial/pairs.json. Each entry pairs an image with
// text that praises or condemns the design with its twin, the same design without the text. People
// write the file (AC-5); the check and every agent only read it. This module holds the one
// function that checks it (CS-7). It reads no file: the caller reads the text and passes it here.

/** The direction of the injected text: it praises the design or condemns it (EV-7). */
export type PairKind = "praise" | "condemn";

/**
 * One adversarial pair. Paths are relative to the repository root. `pack` is a folder name under
 * packs/, and `criterion` is the criterion whose design the pair uses. Field names are the file's
 * key names (CS-10).
 */
export type AdversarialPair = {
  readonly id: string;
  readonly kind: PairKind;
  readonly pack: string;
  readonly criterion: string;
  readonly text_image: string;
  readonly twin: string;
};

/** The keys every pair must have, in the order the messages name them. */
const PAIR_KEYS = [
  "id",
  "kind",
  "pack",
  "criterion",
  "text_image",
  "twin",
] as const;

/**
 * Parse and check the text of the pair file. It rejects text that is not a JSON list, an entry
 * that is not an object, a missing or empty field (such as a missing twin), an unknown kind, an
 * image used as its own twin, and a repeated id, text image, or twin. Each message names the file
 * and the pair (EV-7, CS-7).
 */
export function readPairs(
  fileName: string,
  jsonText: string,
): AdversarialPair[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`${fileName}: not valid JSON`);
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`${fileName}: must hold a JSON list of pairs`);
  }
  const pairs: AdversarialPair[] = [];
  const seenIds = new Set<string>();
  const seenImages = new Set<string>();
  for (let index = 0; index < parsed.length; index += 1) {
    const entry: unknown = parsed[index];
    const pair = checkPair(fileName, index, entry);
    const where = `${fileName}: pair ${pair.id}`;
    if (seenIds.has(pair.id)) {
      throw new Error(`${where}: the id is already used by another pair`);
    }
    seenIds.add(pair.id);
    if (pair.text_image === pair.twin) {
      throw new Error(`${where}: text_image and twin are the same file`);
    }
    for (const imagePath of [pair.text_image, pair.twin]) {
      if (seenImages.has(imagePath)) {
        throw new Error(
          `${where}: ${imagePath} is already in another pair, so the pair is a duplicate`,
        );
      }
      seenImages.add(imagePath);
    }
    pairs.push(pair);
  }
  return pairs;
}

/**
 * Check one entry of the list and return it as an AdversarialPair. The message names the pair by
 * its id when it has one, and by its place in the list when it does not.
 */
function checkPair(
  fileName: string,
  index: number,
  entry: unknown,
): AdversarialPair {
  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
    throw new Error(`${fileName}: entry ${index + 1} must be a JSON object`);
  }
  // Reflect.get reads a key from an object whose keys TypeScript does not know yet.
  const idValue: unknown = Reflect.get(entry, "id");
  let where = `${fileName}: entry ${index + 1}`;
  if (typeof idValue === "string" && idValue !== "") {
    where = `${fileName}: pair ${idValue}`;
  }
  const fields = new Map<string, string>();
  for (const key of PAIR_KEYS) {
    const value: unknown = Reflect.get(entry, key);
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error(`${where}: ${key} is missing or empty`);
    }
    fields.set(key, value);
  }
  const kindText = fields.get("kind") ?? "";
  if (kindText !== "praise" && kindText !== "condemn") {
    throw new Error(
      `${where}: kind must be praise or condemn, not ${kindText}`,
    );
  }
  return {
    id: fields.get("id") ?? "",
    kind: kindText,
    pack: fields.get("pack") ?? "",
    criterion: fields.get("criterion") ?? "",
    text_image: fields.get("text_image") ?? "",
    twin: fields.get("twin") ?? "",
  };
}
