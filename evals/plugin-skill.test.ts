// The durable check that the crit-loop plugin skill names real commands and real JSON fields
// (FR-60, FR-66, FR-69, sections 8.1 to 8.3, crit-bts.1). It reads plugin/skills/crit-loop/SKILL.md
// and checks two things. First, every code span that starts with "crit " is a command line that the
// CLI parser accepts, and it is the command the skill means. Second, every JSON field path the
// skill tells the agent to read exists in schemas/report.schema.json, schemas/compare.schema.json,
// or schemas/gate.schema.json.
//
// This test imports parseCommand from src/cli/args.ts instead of running the bundle, which departs
// from CS-21. Reason: the skill's commands name images such as before.png that do not exist, so the
// bundle would exit 2 on a missing file before it showed whether the command line itself is right.
// The parser is the part of the CLI that decides whether a command line is valid (FR-60). If the
// CLI is rewritten in another language, replace the parser call with a run of the bundle on real
// images and recorded answers files.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseCommand } from "../src/cli/args.js";

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

/** A JSON Schema node, read as plain data. */
type SchemaNode = { [key: string]: unknown };

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

/**
 * The JSON fields the skill tells the agent to read, with the schema each one belongs to. A dot
 * separates the levels. A level that is an array is entered through its items, so
 * "findings.verdict" means the verdict of each finding.
 */
const FIELDS_THE_SKILL_NAMES: ReadonlyArray<{
  path: string;
  schema: SchemaFileName;
  wordInSkill: string;
}> = [
  { path: "findings", schema: "report.schema.json", wordInSkill: "findings" },
  {
    path: "findings.verdict",
    schema: "report.schema.json",
    wordInSkill: "verdict",
  },
  { path: "findings.fix", schema: "report.schema.json", wordInSkill: "fix" },
  {
    path: "findings.region",
    schema: "report.schema.json",
    wordInSkill: "region",
  },
  { path: "changes", schema: "compare.schema.json", wordInSkill: "changes" },
  {
    path: "changes.change",
    schema: "compare.schema.json",
    wordInSkill: "change",
  },
  { path: "summary", schema: "compare.schema.json", wordInSkill: "summary" },
  {
    path: "summary.improved",
    schema: "compare.schema.json",
    wordInSkill: "summary.improved",
  },
  { path: "skipped", schema: "compare.schema.json", wordInSkill: "skipped" },
  {
    path: "gate.passed",
    schema: "gate.schema.json",
    wordInSkill: "gate.passed",
  },
  {
    path: "gate.blocking",
    schema: "gate.schema.json",
    wordInSkill: "gate.blocking",
  },
  { path: "findings", schema: "gate.schema.json", wordInSkill: "findings" },
];

/** Returns the text of every inline code span in the skill, without the backticks. */
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

/** Returns every line inside a fenced code block of the skill. */
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

/** Returns every crit command line the skill names, from code spans and fenced code blocks. */
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
 * Follows a $ref such as "#/$defs/finding" or "report.schema.json#/properties/findings" from the
 * schema named by currentSchema, and returns the node it points to and the schema that holds it.
 */
function followReference(
  reference: string,
  currentSchema: SchemaFileName,
): { node: SchemaNode; schema: SchemaFileName } {
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
function resolveNode(
  node: SchemaNode,
  schema: SchemaFileName,
): { node: SchemaNode; schema: SchemaFileName } {
  let current = { node, schema };
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

/** Returns true when the dotted field path exists in the named schema. */
function schemaHasField(path: string, schema: SchemaFileName): boolean {
  let current = { node: SCHEMAS[schema], schema };
  for (const fieldName of path.split(".")) {
    const resolved = resolveNode(current.node, current.schema);
    const properties = resolved.node.properties as SchemaNode | undefined;
    if (properties === undefined) {
      return false;
    }
    const child = properties[fieldName];
    if (child === undefined) {
      return false;
    }
    current = { node: child as SchemaNode, schema: resolved.schema };
  }
  return true;
}

describe("the crit-loop skill", () => {
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
    it(`names a command line the parser accepts: ${commandLine}`, () => {
      const words = commandLine.split(" ").slice(1);
      const command = parseCommand(words);
      // parseCommand treats any first word it does not know as the image of crit report, so
      // check that the command it returns is the one the skill wrote.
      expect(command.command).toBe(words[0]);
    });
  }

  for (const field of FIELDS_THE_SKILL_NAMES) {
    it(`names ${field.path}, which ${field.schema} has`, () => {
      expect(listCodeSpans(SKILL_TEXT)).toContain(field.wordInSkill);
      expect(schemaHasField(field.path, field.schema)).toBe(true);
    });
  }

  it("rejects a field path that no schema has, so the check can fail", () => {
    expect(schemaHasField("summary.improved_by", "compare.schema.json")).toBe(
      false,
    );
    expect(schemaHasField("gate.passes", "gate.schema.json")).toBe(false);
  });
});
