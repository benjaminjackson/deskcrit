// Parse and check the text of `.crit.yaml`, the project settings file that only the person writes
// (FR-2, FR-22, FR-51, AC-5). It reads no file: read-inputs.ts reads the text and passes it here.
// The shape is the proposed default in OQ-25 (a).

import { parseDocument } from "yaml";
import { CouldNotRunError } from "../shared/could-not-run-error.js";
import type { Context } from "../shared/state.js";
import { isContextKey } from "./args.js";

/** The name of the settings file, as every message names it (FR-4). */
export const CRIT_YAML_FILE_NAME = ".crit.yaml";

/**
 * The checked `.crit.yaml` settings, with the wire field names (CS-10, OQ-25 a). `screenshot`
 * belongs to the hook (FR-68) and `warn_fails_gate` to gate (FR-41); report keeps them and does
 * not act on them.
 */
export type CritYaml = {
  readonly packs?: readonly string[];
  readonly model?: string;
  readonly context?: Context;
  readonly screenshot?: string;
  readonly warn_fails_gate?: boolean;
};

/** The top-level keys `.crit.yaml` may hold. Any other key stops the run (OQ-25 a). */
const CRIT_YAML_KEYS: readonly string[] = [
  "packs",
  "model",
  "context",
  "screenshot",
  "warn_fails_gate",
];

/**
 * Parse `.crit.yaml` text with the YAML 1.2 core schema, no custom tags, and no duplicate keys,
 * then check it (CS-4, FR-4). A YAML error throws CouldNotRunError that names the file and the
 * line. An empty file means no settings.
 */
export function parseCritYaml(yamlText: string): CritYaml {
  const document = parseDocument(yamlText, {
    schema: "core",
    customTags: [],
    // Without this, the library still resolves YAML 1.1 tags such as !!timestamp when a
    // document names them; turned off, they are unknown tags and give a warning.
    resolveKnownTags: false,
    uniqueKeys: true,
  });
  const firstProblem = document.errors[0] ?? document.warnings[0];
  if (firstProblem !== undefined) {
    const firstLine = firstProblem.message.split("\n")[0];
    throw new CouldNotRunError(
      `${CRIT_YAML_FILE_NAME}: ${firstProblem.code}: ${firstLine}`,
    );
  }
  const parsed: unknown = document.toJS();
  return checkCritYaml(parsed);
}

/**
 * The one checking function for `.crit.yaml`: it turns the parsed value into CritYaml or throws
 * CouldNotRunError that names the file and the key (CS-7, FR-4, OQ-25 a). null, from an empty
 * file, gives no settings.
 */
export function checkCritYaml(parsed: unknown): CritYaml {
  if (parsed === null || parsed === undefined) {
    return {};
  }
  if (!isPlainObject(parsed)) {
    throw new CouldNotRunError(
      `${CRIT_YAML_FILE_NAME}: expected a map of settings at the top level`,
    );
  }
  for (const key of Object.keys(parsed)) {
    if (!CRIT_YAML_KEYS.includes(key)) {
      throw new CouldNotRunError(
        `${CRIT_YAML_FILE_NAME}: unknown key ${key}; the keys are ${CRIT_YAML_KEYS.join(", ")}`,
      );
    }
  }

  const settings: {
    packs?: string[];
    model?: string;
    context?: Context;
    screenshot?: string;
    warn_fails_gate?: boolean;
  } = {};
  const packs = parsed.packs;
  if (packs !== undefined) {
    settings.packs = checkPackNames(packs);
  }
  const model = parsed.model;
  if (model !== undefined) {
    settings.model = checkNonEmptyString(model, "model");
  }
  const context = parsed.context;
  if (context !== undefined) {
    settings.context = checkContext(context);
  }
  const screenshot = parsed.screenshot;
  if (screenshot !== undefined) {
    settings.screenshot = checkNonEmptyString(screenshot, "screenshot");
  }
  const warnFailsGate = parsed.warn_fails_gate;
  if (warnFailsGate !== undefined) {
    if (typeof warnFailsGate !== "boolean") {
      throw new CouldNotRunError(
        `${CRIT_YAML_FILE_NAME}: warn_fails_gate must be true or false`,
      );
    }
    settings.warn_fails_gate = warnFailsGate;
  }
  return settings;
}

/** Check that `packs` is a list of non-empty pack names (FR-51, OQ-25 a). */
function checkPackNames(packs: unknown): string[] {
  if (!Array.isArray(packs)) {
    throw new CouldNotRunError(
      `${CRIT_YAML_FILE_NAME}: packs must be a list of pack names`,
    );
  }
  const names: string[] = [];
  for (const name of packs) {
    if (typeof name !== "string" || name === "") {
      throw new CouldNotRunError(
        `${CRIT_YAML_FILE_NAME}: packs must be a list of pack names`,
      );
    }
    names.push(name);
  }
  return names;
}

/** Check that a setting is a non-empty string, and name the key when it is not (FR-4). */
function checkNonEmptyString(value: unknown, key: string): string {
  if (typeof value !== "string" || value === "") {
    throw new CouldNotRunError(
      `${CRIT_YAML_FILE_NAME}: ${key} must be a non-empty string`,
    );
  }
  return value;
}

/** Check that `context` is a map with only the FR-2 keys, each a string (FR-2, OQ-25 a). */
function checkContext(context: unknown): Context {
  if (!isPlainObject(context)) {
    throw new CouldNotRunError(
      `${CRIT_YAML_FILE_NAME}: context must be a map with the keys purpose, audience, platform`,
    );
  }
  const checked: { purpose?: string; audience?: string; platform?: string } =
    {};
  for (const [key, value] of Object.entries(context)) {
    if (!isContextKey(key)) {
      throw new CouldNotRunError(
        `${CRIT_YAML_FILE_NAME}: unknown context key ${key}; the keys are purpose, audience, platform`,
      );
    }
    if (typeof value !== "string") {
      throw new CouldNotRunError(
        `${CRIT_YAML_FILE_NAME}: context ${key} must be a string`,
      );
    }
    checked[key] = value;
  }
  return checked;
}

/**
 * Return true when the value is a map from YAML, not a list or a scalar. This is a type guard, so
 * the compiler then lets the caller read its keys as unknown values.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
