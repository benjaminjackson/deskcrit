// Every file and environment read for `crit report`, `crit compare`, and `crit gate` (CS-6): the images, `.crit.yaml`, the bundled
// packs, each pack directory, the facts file, the --answers file, and the API key. Each failure throws CouldNotRunError that names the
// input, so the run exits with code 2 (FR-4, US-5, US-7, NFR-14). The stages get the values.

import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { DEFAULT_GATE_POLICY, type GatePolicy, loadPack } from "../index.js";
import { CouldNotRunError } from "../shared/could-not-run-error.js";
import type { Pack } from "../shared/pack.js";
import type { Context } from "../shared/state.js";
import {
  type RecordedRun,
  readAnswersFile,
  readCompareAnswersFile,
} from "./answers-file.js";
import type { CompareArguments, ReportArguments } from "./args.js";
import { loadBundledPacks } from "./bundled-packs.js";
import {
  CRIT_YAML_FILE_NAME,
  type CritYaml,
  parseCritYaml,
} from "./crit-yaml.js";

/** The file inside a pack directory that holds the pack (FR-11, FR-44). */
const PACK_FILE_NAME = "pack.yaml";

/** The environment variable that holds the TypeSafe API key (NFR-14, CS-19). */
export const API_KEY_VARIABLE = "TYPESAFE_API_KEY";

/** Everything `crit report` read, ready for the stages (FR-1 to FR-3, FR-11, FR-22). */
export type ReportInputs = {
  readonly imagePath: string;
  readonly imageBytes: Uint8Array;
  readonly packs: readonly Pack[];
  readonly context: Context;
  readonly facts: unknown;
  /** The model id pinned in `.crit.yaml`, or undefined for the adapter's default (FR-22). */
  readonly model: string | undefined;
  readonly json: boolean;
  /** The checked --answers file and the name it was given as, or undefined without --answers (FR-42). */
  readonly recordedAnswers: RecordedAnswers | undefined;
  /** The gate policy from `.crit.yaml`, or the default when it sets no `warn_fails_gate`. Only `crit gate` acts on it (FR-41, FR-42). */
  readonly gatePolicy: GatePolicy;
};

/**
 * One checked recorded run and the name later messages use for its file: the path the person gave,
 * and for compare which run of the file it is (FR-4, FR-42).
 */
export type RecordedAnswers = {
  readonly recordedRun: RecordedRun;
  readonly fileName: string;
};

/**
 * Everything `crit compare` read: one ReportInputs for each image. The two share the same packs,
 * context, facts, model, and gate policy objects, read once, so both runs are asked the same
 * questions (FR-35).
 */
export type CompareInputs = {
  readonly before: ReportInputs;
  readonly after: ReportInputs;
};

/** The inputs that do not depend on the image, which compare reads once for both runs (FR-35). */
type SharedInputs = Pick<
  ReportInputs,
  "packs" | "context" | "facts" | "model" | "json" | "gatePolicy"
>;

/** One loaded pack and where it came from, so a duplicate name can name both sources. */
type LoadedPack = {
  readonly pack: Pack;
  readonly source: string;
};

/**
 * Read every input the arguments name, relative to the working directory: the image bytes,
 * `.crit.yaml` from that directory only, the packs, and the facts file. Then lay the --context
 * flags over the file's context. With --answers it reads and checks that file too, before
 * prepare runs (FR-1 to FR-4, FR-11, FR-22, FR-42, FR-51, OQ-25 b).
 */
export async function readReportInputs(
  reportArguments: ReportArguments,
  workingDirectory: string,
): Promise<ReportInputs> {
  const imageBytes = await readImage(
    reportArguments.imagePath,
    workingDirectory,
  );
  const shared = await readSharedInputs(reportArguments, workingDirectory);
  let recordedAnswers: RecordedAnswers | undefined;
  if (reportArguments.answersPath !== undefined) {
    const text = await readAnswersFileText(
      reportArguments.answersPath,
      workingDirectory,
    );
    recordedAnswers = {
      recordedRun: readAnswersFile(text, reportArguments.answersPath),
      fileName: reportArguments.answersPath,
    };
  }
  return {
    imagePath: reportArguments.imagePath,
    imageBytes,
    ...shared,
    recordedAnswers,
  };
}

/**
 * Read every input of `crit compare`: the before and the after image, then the inputs both runs
 * share, read once, and with --answers the two-run answers file (FR-35, FR-42). Each run gets its
 * own run from that file, named in messages as the path and the run, such as
 * "answers/x.json (before run)" (FR-4).
 */
export async function readCompareInputs(
  compareArguments: CompareArguments,
  workingDirectory: string,
): Promise<CompareInputs> {
  const beforeBytes = await readImage(
    compareArguments.beforePath,
    workingDirectory,
  );
  const afterBytes = await readImage(
    compareArguments.afterPath,
    workingDirectory,
  );
  const shared = await readSharedInputs(compareArguments, workingDirectory);
  let beforeRecorded: RecordedAnswers | undefined;
  let afterRecorded: RecordedAnswers | undefined;
  if (compareArguments.answersPath !== undefined) {
    const answersPath = compareArguments.answersPath;
    const text = await readAnswersFileText(answersPath, workingDirectory);
    const compareFile = readCompareAnswersFile(text, answersPath);
    beforeRecorded = {
      recordedRun: compareFile.before,
      fileName: `${answersPath} (before run)`,
    };
    afterRecorded = {
      recordedRun: compareFile.after,
      fileName: `${answersPath} (after run)`,
    };
  }
  return {
    before: {
      imagePath: compareArguments.beforePath,
      imageBytes: beforeBytes,
      ...shared,
      recordedAnswers: beforeRecorded,
    },
    after: {
      imagePath: compareArguments.afterPath,
      imageBytes: afterBytes,
      ...shared,
      recordedAnswers: afterRecorded,
    },
  };
}

/**
 * Read the inputs that do not depend on the image: `.crit.yaml`, the packs, and the facts file,
 * and lay the --context flags over the file's context (FR-2, FR-3, FR-11, FR-22, FR-41, FR-51).
 */
async function readSharedInputs(
  options: Omit<ReportArguments, "imagePath">,
  workingDirectory: string,
): Promise<SharedInputs> {
  const critYaml = await readCritYaml(workingDirectory);
  const packs = await readPacks(
    options.packDirectories,
    critYaml.packs ?? [],
    workingDirectory,
  );
  let facts: unknown;
  if (options.factsPath !== undefined) {
    facts = await readFacts(options.factsPath, workingDirectory);
  }
  return {
    packs,
    context: mergeContext(critYaml.context, options.contextFlags),
    facts,
    model: critYaml.model,
    json: options.json,
    gatePolicy: {
      warn_fails_gate:
        critYaml.warn_fails_gate ?? DEFAULT_GATE_POLICY.warn_fails_gate,
    },
  };
}

/**
 * Return the API key from TYPESAFE_API_KEY, or throw CouldNotRunError that names the variable
 * when it is missing or empty. No message ever holds the key's value (NFR-14, CS-19, US-4).
 */
export function readApiKey(
  environment: Readonly<Record<string, string | undefined>>,
): string {
  const apiKey = environment[API_KEY_VARIABLE];
  if (apiKey === undefined || apiKey === "") {
    throw new CouldNotRunError(`${API_KEY_VARIABLE} is not set`);
  }
  return apiKey;
}

/** Read the image file as bytes; prepare checks that it is a PNG or JPEG (FR-1, FR-4). */
async function readImage(
  imagePath: string,
  workingDirectory: string,
): Promise<Uint8Array> {
  try {
    const buffer = await readFile(resolve(workingDirectory, imagePath));
    return new Uint8Array(buffer);
  } catch {
    throw new CouldNotRunError(`${imagePath}: cannot read image`);
  }
}

/**
 * Read and check `.crit.yaml` in the working directory. A missing file means no settings; any
 * other read error, a YAML error, or a bad key stops the run (FR-4, OQ-25 a, OQ-25 b).
 */
export async function readCritYaml(
  workingDirectory: string,
): Promise<CritYaml> {
  let text: string;
  try {
    text = await readFile(join(workingDirectory, CRIT_YAML_FILE_NAME), "utf8");
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) {
      return {};
    }
    throw new CouldNotRunError(`${CRIT_YAML_FILE_NAME}: cannot read file`);
  }
  return parseCritYaml(text);
}

/**
 * Load the bundled packs that `.crit.yaml` names, then each --pack directory, and reject two packs
 * with the same name, naming both sources (FR-11, FR-51, US-5). With no names in `.crit.yaml` and
 * no --pack, every bundled pack loads; with --pack and no names, only the local packs load (FR-11).
 */
async function readPacks(
  packDirectories: readonly string[],
  critYamlPackNames: readonly string[],
  workingDirectory: string,
): Promise<Pack[]> {
  const loaded: LoadedPack[] = [];
  const bundledPacksWanted =
    critYamlPackNames.length > 0 || packDirectories.length === 0;
  if (bundledPacksWanted) {
    for (const pack of loadBundledPacks(critYamlPackNames)) {
      loaded.push({
        pack,
        source: `bundled pack ${pack.name}`,
      });
    }
  }
  for (const directory of packDirectories) {
    const text = await readPackFile(directory, workingDirectory);
    if (text === undefined) {
      throw new CouldNotRunError(
        `--pack ${directory}: no ${PACK_FILE_NAME} in that directory`,
      );
    }
    loaded.push({
      pack: loadPack(text, directory),
      source: `--pack ${directory}`,
    });
  }
  checkPackNamesUnique(loaded);
  const packs: Pack[] = [];
  for (const entry of loaded) {
    packs.push(entry.pack);
  }
  return packs;
}

/**
 * Read <directory>/pack.yaml, or return undefined when the directory or the file does not exist.
 * Any other read error stops the run and names the directory (FR-4).
 */
async function readPackFile(
  directory: string,
  workingDirectory: string,
): Promise<string | undefined> {
  const packFilePath = join(
    resolve(workingDirectory, directory),
    PACK_FILE_NAME,
  );
  try {
    return await readFile(packFilePath, "utf8");
  } catch (error) {
    if (hasErrorCode(error, "ENOENT") || hasErrorCode(error, "ENOTDIR")) {
      return undefined;
    }
    throw new CouldNotRunError(`${directory}: cannot read ${PACK_FILE_NAME}`);
  }
}

/** Throw CouldNotRunError when two loaded packs share a name, naming both sources (FR-11, FR-14). */
function checkPackNamesUnique(loaded: readonly LoadedPack[]): void {
  const sourceByName = new Map<string, string>();
  for (const entry of loaded) {
    const earlierSource = sourceByName.get(entry.pack.name);
    if (earlierSource !== undefined) {
      throw new CouldNotRunError(
        `two packs are named ${entry.pack.name}: ${earlierSource} and ${entry.source}`,
      );
    }
    sourceByName.set(entry.pack.name, entry.source);
  }
}

/**
 * Read the facts file and parse it as JSON. The value is passed on unchanged, and nothing here
 * reads its meaning (FR-3, US-7). Unreadable or invalid JSON stops the run and names the path.
 */
async function readFacts(
  factsPath: string,
  workingDirectory: string,
): Promise<unknown> {
  let text: string;
  try {
    text = await readFile(resolve(workingDirectory, factsPath), "utf8");
  } catch {
    throw new CouldNotRunError(`${factsPath}: cannot read facts file`);
  }
  try {
    const facts: unknown = JSON.parse(text);
    return facts;
  } catch {
    throw new CouldNotRunError(
      `${factsPath}: the facts file is not valid JSON`,
    );
  }
}

/**
 * Read the text of the --answers file. An unreadable file stops the run and names the path; the
 * readers in answers-file.ts name it for bad JSON or a wrong shape (FR-4, FR-42, CS-7).
 */
async function readAnswersFileText(
  answersPath: string,
  workingDirectory: string,
): Promise<string> {
  try {
    return await readFile(resolve(workingDirectory, answersPath), "utf8");
  } catch {
    throw new CouldNotRunError(`answers file ${answersPath} cannot be read`);
  }
}

/**
 * Lay the --context flags over the `.crit.yaml` context, so a flag wins for its key, and keep
 * only the keys that were given (FR-2, OQ-24 c).
 */
function mergeContext(
  fileContext: Context | undefined,
  flagContext: Context,
): Context {
  const merged: { purpose?: string; audience?: string; platform?: string } = {};
  const layers: Context[] = [];
  if (fileContext !== undefined) {
    layers.push(fileContext);
  }
  layers.push(flagContext);
  for (const layer of layers) {
    if (layer.purpose !== undefined) {
      merged.purpose = layer.purpose;
    }
    if (layer.audience !== undefined) {
      merged.audience = layer.audience;
    }
    if (layer.platform !== undefined) {
      merged.platform = layer.platform;
    }
  }
  return merged;
}

/** Return true when the error is a Node file system error with this code, such as ENOENT. */
function hasErrorCode(error: unknown, code: string): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return Reflect.get(error, "code") === code;
}
