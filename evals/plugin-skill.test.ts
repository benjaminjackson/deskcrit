// The durable check that the crit-loop plugin skill names real commands and real JSON fields
// (FR-60, FR-66, FR-69, sections 8.1 to 8.3, crit-bts.1). It reads plugin/skills/crit-loop/SKILL.md
// and checks two things.
//
// First, every code span or fenced line that starts with "crit " is a command line the CLI accepts.
// The test runs the built bundle, dist/crit.js, as a child process on each line (CS-21), with each
// image name swapped for a path that does not exist, only PATH in the environment, and a new empty
// working directory with no .crit.yaml. The bundle checks the command line before it reads the
// image, so a good line stops on the missing image (exit 2, "cannot read image"), and a line with an
// unknown flag or a wrong command stops on a usage error instead. No line reaches TypeSafe.
//
// Second, every code span that looks like a JSON field or a dotted path (such as `findings` or
// `gate.passed`) is a field of schemas/report.schema.json, schemas/compare.schema.json, or
// schemas/gate.schema.json. The test reads the schema files as JSON and imports nothing from src/,
// so it still holds if crit is rewritten in another language (AC-6).

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { runCritBundle } from "./support/run-crit-bundle.js";

/** The repository root, one folder above evals/. */
const REPOSITORY_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** The text of the skill file. */
const SKILL_TEXT = readFileSync(
  join(REPOSITORY_ROOT, "plugin", "skills", "crit-loop", "SKILL.md"),
  "utf8",
);

/** The names of the three output schemas, which are also the ids that their $ref values use. */
type SchemaFileName =
  | "report.schema.json"
  | "compare.schema.json"
  | "gate.schema.json";

/** The three schema file names, in the order the field check tries them. */
const SCHEMA_FILE_NAMES: readonly SchemaFileName[] = [
  "report.schema.json",
  "compare.schema.json",
  "gate.schema.json",
];

/** A JSON Schema node, read as plain data. */
type SchemaNode = { [key: string]: unknown };

/** A schema node together with the schema file that holds it, so a local $ref can be followed. */
type PlacedNode = { node: SchemaNode; schema: SchemaFileName };

/** Reads one schema file from schemas/. */
function readSchema(fileName: SchemaFileName): SchemaNode {
  const text = readFileSync(join(REPOSITORY_ROOT, "schemas", fileName), "utf8");
  return JSON.parse(text);
}

/** The three schemas by file name, so a $ref such as "report.schema.json#/..." can be followed. */
const SCHEMAS: Record<SchemaFileName, SchemaNode> = {
  "report.schema.json": readSchema("report.schema.json"),
  "compare.schema.json": readSchema("compare.schema.json"),
  "gate.schema.json": readSchema("gate.schema.json"),
};

/** Returns the text of every inline code span, without the backticks. */
function listCodeSpans(text: string): string[] {
  const spans: string[] = [];
  // A code span is text between two single backticks on one line.
  for (const match of text.matchAll(/`([^`\n]+)`/g)) {
    const spanText = match[1];
    if (spanText !== undefined) {
      spans.push(spanText);
    }
  }
  return spans;
}

/** Returns every line inside a fenced code block. */
function listFencedLines(text: string): string[] {
  const lines: string[] = [];
  let insideFence = false;
  for (const line of text.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      insideFence = !insideFence;
      continue;
    }
    if (insideFence) {
      lines.push(line.trim());
    }
  }
  return lines;
}

/** Returns every crit command line in the text, from code spans and fenced code blocks. */
function listCritCommandLines(text: string): string[] {
  const candidates = [...listCodeSpans(text), ...listFencedLines(text)];
  const commandLines: string[] = [];
  for (const candidate of candidates) {
    if (candidate.startsWith("crit ")) {
      commandLines.push(candidate);
    }
  }
  return commandLines;
}

/**
 * Returns every code span that looks like a JSON field: lowercase words and underscores, with dots
 * between the levels. A file name such as after.png ends in a file extension and is left out. A
 * command line has spaces, a flag starts with "--", and a path has a slash, so none of them match.
 */
function listFieldSpans(text: string): string[] {
  const fields: string[] = [];
  for (const span of listCodeSpans(text)) {
    const looksLikeField = /^[a-z_]+(\.[a-z_]+)*$/.test(span);
    const looksLikeFileName = /\.(png|jpg|yaml|yml|json|md)$/.test(span);
    if (looksLikeField && !looksLikeFileName) {
      fields.push(span);
    }
  }
  return fields;
}

/**
 * Follows a $ref such as "#/$defs/finding" or "report.schema.json#/properties/findings" from the
 * schema named by currentSchema, and returns the node it points to.
 */
function followReference(
  reference: string,
  currentSchema: SchemaFileName,
): PlacedNode {
  const [fileName, pointer] = reference.split("#");
  let targetSchema = currentSchema;
  if (fileName !== undefined && fileName !== "") {
    targetSchema = fileName as SchemaFileName;
  }
  let node: unknown = SCHEMAS[targetSchema];
  const steps = (pointer ?? "").split("/").filter((step) => step !== "");
  for (const step of steps) {
    node = (node as SchemaNode)[step];
  }
  if (node === undefined) {
    throw new Error(`the $ref ${reference} points to nothing`);
  }
  return { node: node as SchemaNode, schema: targetSchema };
}

/** Follows $ref values and array items until the node describes an object or a plain value. */
function resolveNode(placed: PlacedNode): PlacedNode {
  let current = placed;
  while (true) {
    const reference = current.node.$ref;
    if (typeof reference === "string") {
      current = followReference(reference, current.schema);
      continue;
    }
    const items = current.node.items;
    if (typeof items === "object" && items !== null) {
      current = { node: items as SchemaNode, schema: current.schema };
      continue;
    }
    return current;
  }
}

/** Returns the properties of a node by name, after its $ref and array items are followed. */
function listChildren(placed: PlacedNode): Map<string, PlacedNode> {
  const children = new Map<string, PlacedNode>();
  const resolved = resolveNode(placed);
  const properties = resolved.node.properties as SchemaNode | undefined;
  if (properties === undefined) {
    return children;
  }
  for (const [name, child] of Object.entries(properties)) {
    children.set(name, { node: child as SchemaNode, schema: resolved.schema });
  }
  return children;
}

/** Returns true when the path, such as ["gate", "passed"], starts at this node. */
function pathStartsAt(path: readonly string[], placed: PlacedNode): boolean {
  let current = placed;
  for (const fieldName of path) {
    const child = listChildren(current).get(fieldName);
    if (child === undefined) {
      return false;
    }
    current = child;
  }
  return true;
}

/**
 * Returns true when the dotted path is a field at any depth of any of the three schemas. So
 * `verdict` matches the verdict of each finding, and `gate.passed` matches the gate object. It walks
 * every object reachable from each schema root, and remembers the nodes it has seen so that a $ref
 * that points back up cannot loop.
 */
function schemasHaveField(dottedPath: string): boolean {
  const path = dottedPath.split(".");
  const seen = new Set<SchemaNode>();
  const toVisit: PlacedNode[] = [];
  for (const schemaName of SCHEMA_FILE_NAMES) {
    toVisit.push({ node: SCHEMAS[schemaName], schema: schemaName });
  }
  while (toVisit.length > 0) {
    const current = toVisit.pop();
    if (current === undefined || seen.has(current.node)) {
      continue;
    }
    seen.add(current.node);
    if (pathStartsAt(path, current)) {
      return true;
    }
    for (const child of listChildren(current).values()) {
      toVisit.push(child);
    }
  }
  return false;
}

/** Returns each field span of the text that no output schema has. */
function findUnknownFields(text: string): string[] {
  const unknown: string[] = [];
  for (const field of listFieldSpans(text)) {
    if (!schemasHaveField(field)) {
      unknown.push(field);
    }
  }
  return unknown;
}

/** A new empty working directory, so crit finds no .crit.yaml (FR-51). */
const WORKING_DIRECTORY = mkdtempSync(join(tmpdir(), "crit-plugin-skill-"));

/** A folder that never exists, so each image path under it cannot be read. */
const MISSING_FOLDER = join(WORKING_DIRECTORY, "does-not-exist");

/** Only PATH, so no TYPESAFE_API_KEY reaches crit (CS-21). */
const ENVIRONMENT = { PATH: process.env.PATH ?? "" };

afterAll(() => {
  rmSync(WORKING_DIRECTORY, { recursive: true, force: true });
});

/** Runs one skill command line with its image names swapped for paths under MISSING_FOLDER. */
async function runWithMissingImages(commandLine: string) {
  const words = commandLine.split(" ").slice(1);
  const critArguments: string[] = [];
  for (const word of words) {
    if (word.endsWith(".png")) {
      critArguments.push(join(MISSING_FOLDER, word));
    } else {
      critArguments.push(word);
    }
  }
  return runCritBundle(critArguments, ENVIRONMENT, WORKING_DIRECTORY);
}

describe("the crit-loop skill commands", () => {
  const commandLines = listCritCommandLines(SKILL_TEXT);

  it("names the report, compare, and gate commands", () => {
    const commandNames = commandLines.map(
      (commandLine) => commandLine.split(" ")[1],
    );
    expect(commandNames).toContain("report");
    expect(commandNames).toContain("compare");
    expect(commandNames).toContain("gate");
  });

  for (const commandLine of commandLines) {
    it(`passes the command-line check: ${commandLine}`, async () => {
      const run = await runWithMissingImages(commandLine);
      expect(run.exitCode).toBe(2);
      expect(run.stderr).toContain("cannot read image");
      expect(run.stderr).not.toContain("usage:");
    });
  }

  // Lines that are wrong on purpose. Each gives the usage error and not the missing-image error,
  // which shows that the check above can fail.
  const wrongLines = [
    "crit report after.png --jsn",
    "crit compar after.png --json",
    "crit gate after.png --json --save-answers saved.json",
    "crit compare after.png --json",
  ];
  for (const wrongLine of wrongLines) {
    it(`fails the command-line check: ${wrongLine}`, async () => {
      const run = await runWithMissingImages(wrongLine);
      expect(run.exitCode).toBe(2);
      expect(run.stderr).toContain("usage:");
      expect(run.stderr).not.toContain("cannot read image");
    });
  }
});

describe("the crit-loop skill fields", () => {
  it("names the fields the loop reads", () => {
    const fields = listFieldSpans(SKILL_TEXT);
    expect(fields).toContain("findings");
    expect(fields).toContain("summary.improved");
    expect(fields).toContain("gate.passed");
    expect(fields).toContain("gate.blocking");
  });

  it("names only fields that the output schemas have", () => {
    expect(findUnknownFields(SKILL_TEXT)).toEqual([]);
  });

  it("finds a field that no schema has, so the check can fail", () => {
    const wrongText =
      "Read `summary.improvements` and `gate.passes`, not `summary.improved`.";
    expect(findUnknownFields(wrongText)).toEqual([
      "summary.improvements",
      "gate.passes",
    ]);
  });
});
