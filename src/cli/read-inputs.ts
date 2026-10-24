// Every file and environment read for `crit report` (CS-6): the image, `.crit.yaml`, each pack
// directory, the facts file, the --answers file, and the API key. Each failure throws CouldNotRunError that names the
// input, so the run exits with code 2 (FR-4, US-5, US-7, NFR-14). The stages get the values.

import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { loadPack } from "../packs/load-pack.js";
import { CouldNotRunError } from "../shared/could-not-run-error.js";
import type { Pack } from "../shared/pack.js";
import type { Context } from "../shared/state.js";
import { type AnswersFile, readAnswersFile } from "./answers-file.js";
import type { ReportArguments } from "./args.js";
import {
  CRIT_YAML_FILE_NAME,
  type CritYaml,
  parseCritYaml,
} from "./crit-yaml.js";

/** The file inside a pack directory that holds the pack (FR-11, FR-44). */
const PACK_FILE_NAME = "pack.yaml";

/** The environment variable that holds the TypeSafe API key (NFR-14, CS-19). */
export const API_KEY_VARIABLE = "TYPESAFE_API_KEY";

/** The message when no pack is named at all (OQ-25 d). */
const NO_PACKS_MESSAGE =
  "no packs: pass --pack <dir> or name packs in .crit.yaml";

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
};

/** A checked answers file and the path the person gave, so later messages can name it (FR-4, FR-42). */
export type RecordedAnswers = {
  readonly answersFile: AnswersFile;
  readonly fileName: string;
};

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
  const critYaml = await readCritYaml(workingDirectory);
  const packs = await readPacks(
    reportArguments.packDirectories,
    critYaml.packs ?? [],
    workingDirectory,
  );
  let facts: unknown;
  if (reportArguments.factsPath !== undefined) {
    facts = await readFacts(reportArguments.factsPath, workingDirectory);
  }
  let recordedAnswers: RecordedAnswers | undefined;
  if (reportArguments.answersPath !== undefined) {
    recordedAnswers = await readRecordedAnswers(
      reportArguments.answersPath,
      workingDirectory,
    );
  }
  return {
    imagePath: reportArguments.imagePath,
    imageBytes,
    packs,
    context: mergeContext(critYaml.context, reportArguments.contextFlags),
    facts,
    model: critYaml.model,
    json: reportArguments.json,
    recordedAnswers,
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
async function readCritYaml(workingDirectory: string): Promise<CritYaml> {
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
 * Load each --pack directory, then each pack `.crit.yaml` names, and reject two packs with the
 * same name, naming both sources (FR-11, US-5). No pack at all stops the run (OQ-25 d).
 */
async function readPacks(
  packDirectories: readonly string[],
  critYamlPackNames: readonly string[],
  workingDirectory: string,
): Promise<Pack[]> {
  const loaded: LoadedPack[] = [];
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
  for (const name of critYamlPackNames) {
    // Until crit-q25.3 bundles packs, a name in .crit.yaml must be a local pack directory (FR-11).
    const text = await readPackFile(name, workingDirectory);
    if (text === undefined) {
      throw new CouldNotRunError(
        `pack ${name} named in ${CRIT_YAML_FILE_NAME} was not found`,
      );
    }
    loaded.push({
      pack: loadPack(text, name),
      source: `pack ${name} in ${CRIT_YAML_FILE_NAME}`,
    });
  }
  if (loaded.length === 0) {
    throw new CouldNotRunError(NO_PACKS_MESSAGE);
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
 * Read the --answers file and check its shape. An unreadable file stops the run and names the
 * path; readAnswersFile names it for bad JSON or a wrong shape (FR-4, FR-42, CS-7).
 */
async function readRecordedAnswers(
  answersPath: string,
  workingDirectory: string,
): Promise<RecordedAnswers> {
  let text: string;
  try {
    text = await readFile(resolve(workingDirectory, answersPath), "utf8");
  } catch {
    throw new CouldNotRunError(`answers file ${answersPath} cannot be read`);
  }
  return {
    answersFile: readAnswersFile(text, answersPath),
    fileName: answersPath,
  };
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
