// Two helpers that the agreement harness and the wobble check share (EV-4, EV-5, EV-6). Each
// takes the folder that holds its .crit.yaml, so neither script copies the other's code.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import { parseDocument } from "yaml";

/** The model id FR-22 forbids a pin to, because it changes under the user (NFR-6). */
const FLOATING_MODEL_ID = "jev-latest";

/**
 * Read the model id pinned in the .crit.yaml of the given folder, which crit also reads from its
 * working directory, and refuse a missing id or jev-latest (FR-22, NFR-6).
 */
export function readPinnedModel(critYamlDirectory: string): string {
  const critYamlPath = join(critYamlDirectory, ".crit.yaml");
  const document = parseDocument(readFileSync(critYamlPath, "utf8"), {
    schema: "core",
    uniqueKeys: true,
  });
  if (document.errors.length > 0) {
    throw new Error(`${critYamlPath}: not valid YAML`);
  }
  const parsed: unknown = document.toJS();
  if (typeof parsed !== "object" || parsed === null || !("model" in parsed)) {
    throw new Error(`${critYamlPath} must pin a model id`);
  }
  const model = parsed.model;
  if (
    typeof model !== "string" ||
    model === "" ||
    model === FLOATING_MODEL_ID
  ) {
    throw new Error(
      `${critYamlPath} must pin an exact model id, never ${FLOATING_MODEL_ID}`,
    );
  }
  return model;
}

/**
 * Compile the report schema at the given path with Ajv's draft 2020-12 validator. The returned
 * function is a type guard: when it returns true, TypeScript treats the value as ReportDocument,
 * the report type the calling script reads (EV-2, CS-7).
 */
export function compileReportValidator<ReportDocument>(
  reportSchemaPath: string,
) {
  const schema: unknown = JSON.parse(readFileSync(reportSchemaPath, "utf8"));
  if (typeof schema !== "object" || schema === null) {
    throw new Error(`${reportSchemaPath} is not a JSON object`);
  }
  const ajv = new Ajv2020({ allErrors: true });
  return ajv.compile<ReportDocument>(schema);
}
