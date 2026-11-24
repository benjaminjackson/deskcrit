import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
// Ajv ships one class per JSON Schema draft; Ajv2020 checks draft 2020-12.
import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

const schemasDirectory = import.meta.dirname;
const validDirectory = join(schemasDirectory, "examples", "valid");
const invalidDirectory = join(schemasDirectory, "examples", "invalid");
const schemaText = readFileSync(
  join(schemasDirectory, "pack.schema.json"),
  "utf8",
);
const schema: unknown = JSON.parse(schemaText);

/** Builds the validator the way the loader will: strict, and reporting every error, not only the first (CS-3). */
function createAjv(): Ajv2020 {
  // strictRequired is off because the anyOf, then and not blocks list required fields
  // that are defined in the criterion's properties or in the shared question definition,
  // and Ajv's strictRequired check does not look there.
  return new Ajv2020({ strict: true, strictRequired: false, allErrors: true });
}

/** Lists the YAML example files in one directory in a fixed order. */
function listExampleFiles(directory: string): string[] {
  const fileNames = readdirSync(directory).filter((fileName) =>
    fileName.endsWith(".yaml"),
  );
  return fileNames.sort();
}

/** Parses one example pack with the YAML 1.2 core schema and duplicate keys rejected, as CS-4 requires. */
function readExamplePack(path: string): unknown {
  const text = readFileSync(path, "utf8");
  return parse(text, { schema: "core", uniqueKeys: true });
}

/** Reads the "# expect: <path> <keyword>" line that names the one rule an invalid example breaks. */
function readExpectation(path: string): {
  instancePath: string;
  keyword: string;
} {
  const text = readFileSync(path, "utf8");
  const match = /^# expect: (\S+) (\S+)$/m.exec(text);
  if (match === null) {
    throw new Error(`${path} has no "# expect: <path> <keyword>" line`);
  }
  // The root of the document is written "/" in the file, but Ajv names it "".
  const writtenPath = match[1] ?? "";
  const instancePath = writtenPath === "/" ? "" : writtenPath;
  return { instancePath, keyword: match[2] ?? "" };
}

/** Drops the errors that only restate another: an if/then branch that failed, whose branch error names the fault, and each anyOf option, whose anyOf error names the fault. */
function removeBranchErrors(errors: ErrorObject[]): ErrorObject[] {
  const remainingErrors: ErrorObject[] = [];
  for (const error of errors) {
    if (error.keyword === "if") {
      continue;
    }
    if (error.schemaPath.includes("/anyOf/")) {
      continue;
    }
    remainingErrors.push(error);
  }
  return remainingErrors;
}

/** Validates a parsed pack against the compiled pack schema and returns the errors, empty when it is valid. */
function validatePack(pack: unknown): ErrorObject[] {
  const validate = createAjv().compile(schema as object);
  if (validate(pack)) {
    return [];
  }
  return validate.errors ?? [];
}

describe("pack.schema.json", () => {
  it("is a valid JSON Schema 2020-12 document and compiles in strict mode", () => {
    const ajv = createAjv();
    expect(ajv.validateSchema(schema as object)).toBe(true);
    expect(() => ajv.compile(schema as object)).not.toThrow();
  });

  it("has no $schema keyword and sets no default values (OQ-10, CS-15)", () => {
    expect(schemaText).not.toContain('"$schema"');
    expect(schemaText).not.toContain('"default"');
  });

  it("has no field for the version of a standard (FR-57)", () => {
    expect(schemaText).not.toMatch(/"[a-z_]*standard[a-z_]*":/);
  });

  it.each(listExampleFiles(validDirectory))(
    "accepts the valid example %s",
    (fileName) => {
      const pack = readExamplePack(join(validDirectory, fileName));
      expect(validatePack(pack)).toEqual([]);
    },
  );

  it.each(listExampleFiles(invalidDirectory))(
    "rejects the invalid example %s for the reason its expect line names",
    (fileName) => {
      const path = join(invalidDirectory, fileName);
      const expectation = readExpectation(path);
      const errors = removeBranchErrors(validatePack(readExamplePack(path)));
      const errorSummaries = errors.map(
        (error) => `${error.instancePath} ${error.keyword}`,
      );
      // Every remaining error must be the expected one, so the file breaks one rule and no other.
      expect(errorSummaries.length).toBeGreaterThan(0);
      for (const summary of errorSummaries) {
        expect(summary).toBe(
          `${expectation.instancePath} ${expectation.keyword}`,
        );
      }
    },
  );

  const packFields = ["name", "version", "title", "license", "criteria"];
  it.each(packFields)(
    "rejects a pack with no %s field (PRD 7.8)",
    (fieldName) => {
      const pack = readExamplePack(join(validDirectory, "minimal.yaml"));
      if (typeof pack !== "object" || pack === null) {
        throw new Error("minimal.yaml is not a mapping");
      }
      const packWithoutField: Record<string, unknown> = { ...pack };
      delete packWithoutField[fieldName];
      const errors = validatePack(packWithoutField);
      const missingFields = errors.map(
        (error) =>
          `${error.instancePath} ${error.keyword} ${String(error.params.missingProperty)}`,
      );
      expect(missingFields).toContain(` required ${fieldName}`);
    },
  );

  const criterionFields = ["id", "title", "source", "question", "fix"];
  it.each(criterionFields)(
    "rejects a criterion with no %s field (FR-45)",
    (fieldName) => {
      const pack = readExamplePack(join(validDirectory, "minimal.yaml"));
      if (typeof pack !== "object" || pack === null || !("criteria" in pack)) {
        throw new Error("minimal.yaml has no criteria");
      }
      const criteria = pack.criteria;
      if (!Array.isArray(criteria) || typeof criteria[0] !== "object") {
        throw new Error("minimal.yaml has no first criterion");
      }
      const criterionWithoutField: Record<string, unknown> = { ...criteria[0] };
      delete criterionWithoutField[fieldName];
      const errors = validatePack({
        ...pack,
        criteria: [criterionWithoutField],
      });
      const missingFields = errors.map(
        (error) =>
          `${error.instancePath} ${error.keyword} ${String(error.params.missingProperty)}`,
      );
      expect(missingFields).toContain(`/criteria/0 required ${fieldName}`);
    },
  );
});

describe("the first-party packs", () => {
  // crit packs validate used to check every real pack against the schema. It was removed with
  // Jev (crit-mk9.3), and the critic evaluations still read each pack.yaml, so this keeps that check.
  const packsDirectory = join(schemasDirectory, "..", "packs");
  const packNames = readdirSync(packsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    // Only folders that hold a pack.yaml are packs; packs/node_modules holds the renderer's packages.
    .filter((entry) =>
      existsSync(join(packsDirectory, entry.name, "pack.yaml")),
    )
    .map((entry) => entry.name)
    .sort();

  it("finds the packs", () => {
    expect(packNames.length).toBeGreaterThan(0);
  });

  it.each(packNames)("%s/pack.yaml matches the pack schema", (packName) => {
    const validate = createAjv().compile(schema as object);
    const pack = readExamplePack(join(packsDirectory, packName, "pack.yaml"));
    const valid = validate(pack);
    expect(validate.errors ?? []).toEqual([]);
    expect(valid).toBe(true);
  });
});
