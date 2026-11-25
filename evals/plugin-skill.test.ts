// The durable check that the crit-loop plugin skill names real commands, real files, and real JSON
// fields (FR-69, FR-82, crit-bts.1, crit-9td.1). It reads
// plugin/skills/crit-loop/SKILL.md and checks three things.
//
// First, every code span or fenced line that starts with "node " is a command line that its
// program accepts. Each line runs as a child process (CS-21), with each image name and each
// <placeholder> swapped for a path that does not exist, only PATH in the environment, and a new
// empty working directory. A "node" line runs the design-critic script it names and must stop on
// the missing input that MISSING_INPUT_RESULTS gives for that script. A line with an unknown flag
// or a wrong number of arguments stops on a usage error instead. No line opens a browser.
//
// Second, every path under <design-critic folder> that the skill names exists.
//
// Third, every code span that looks like a JSON field or a dotted path (such as `rank` or
// `closed_when.method`) is a field of one of the schemas in schemas/: the work order (FR-80) or the
// measured facts file (FR-79). The test reads the schema files as JSON and imports nothing from
// src/ (AC-6).

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, describe, expect, it } from "vitest";

/** The repository root, one folder above evals/. */
const REPOSITORY_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** The design-critic skill folder, which the skill names as <design-critic folder>. */
const DESIGN_CRITIC_FOLDER = join(
  REPOSITORY_ROOT,
  "plugin",
  "skills",
  "design-critic",
);

/** The placeholder the skill uses for the design-critic skill folder. */
const DESIGN_CRITIC_PLACEHOLDER = "<design-critic folder>";

/** The text of the skill file. */
const SKILL_TEXT = readFileSync(
  join(REPOSITORY_ROOT, "plugin", "skills", "crit-loop", "SKILL.md"),
  "utf8",
);

/** The names of the output schemas, which are also the ids that their $ref values use. */
type SchemaFileName = "work-order.schema.json" | "facts.schema.json";

/** The schema file names, in the order the field check tries them. */
const SCHEMA_FILE_NAMES: readonly SchemaFileName[] = [
  "work-order.schema.json",
  "facts.schema.json",
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

/** The schemas by file name, so a $ref such as "report.schema.json#/..." can be followed. */
const SCHEMAS: Record<SchemaFileName, SchemaNode> = {
  "work-order.schema.json": readSchema("work-order.schema.json"),
  "facts.schema.json": readSchema("facts.schema.json"),
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

/** Returns every command line in the text that starts with the program name and a space. */
function listCommandLines(text: string, programName: string): string[] {
  const candidates = [...listCodeSpans(text), ...listFencedLines(text)];
  const commandLines: string[] = [];
  for (const candidate of candidates) {
    if (candidate.startsWith(`${programName} `)) {
      commandLines.push(candidate);
    }
  }
  return commandLines;
}

/**
 * Splits a command line into words. A <placeholder> such as <evidence file> is one word, even
 * when it holds spaces, and so is a path that starts with one, such as <design-critic folder>/x.
 */
function splitWords(commandLine: string): string[] {
  // Each match is a run of placeholders and plain characters with no space outside the brackets.
  const words = commandLine.match(/(?:<[^>]+>|[^\s<])+/g) ?? [];
  // A word in double quotes, such as "<title>", loses its quotes, as it does in a shell, so a
  // quoted placeholder is swapped like any other placeholder.
  return words.map((word) => word.replace(/^"(.*)"$/, "$1"));
}

/**
 * Returns every path that starts with <design-critic folder>/ in the skill, from code spans and
 * fenced lines, with the folder swapped for its place in this repository.
 */
function listDesignCriticPaths(text: string): string[] {
  const paths: string[] = [];
  const candidates = [...listCodeSpans(text), ...listFencedLines(text)];
  for (const candidate of candidates) {
    for (const word of splitWords(candidate)) {
      if (word.startsWith(`${DESIGN_CRITIC_PLACEHOLDER}/`)) {
        paths.push(
          word.replace(DESIGN_CRITIC_PLACEHOLDER, DESIGN_CRITIC_FOLDER),
        );
      }
    }
  }
  return paths;
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
    const looksLikeFileName = /\.(png|jpg|yaml|yml|json|md|mjs)$/.test(span);
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

/** Returns true when the path, such as ["closed_when", "method"], starts at this node. */
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
 * Returns true when the dotted path is a field at any depth of any of the schemas. So `rank`
 * matches the rank of each work-order finding, and `closed_when.method` matches a nested field. It walks
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

/** A new empty working directory, so a script finds no file of the project. */
const WORKING_DIRECTORY = mkdtempSync(join(tmpdir(), "crit-plugin-skill-"));

/** A folder that never exists, so each input path under it cannot be read. */
const MISSING_FOLDER = join(WORKING_DIRECTORY, "does-not-exist");

/** Only PATH, so no key reaches a script (CS-21). */
const ENVIRONMENT = { PATH: process.env.PATH ?? "" };

afterAll(() => {
  rmSync(WORKING_DIRECTORY, { recursive: true, force: true });
});

/** What a design-critic script gives when its input is missing: exit code and a piece of output. */
type MissingInputResult = { exitCode: number; output: string };

/**
 * The missing-input result of each script the skill may run. measure.mjs checks the page before it
 * looks for Playwright, so no browser opens. entries.mjs exits 2 for a usage error too, so its
 * row checks the "not found:" line, which the usage line does not hold. A script the skill names that is not in this table
 * fails the test, so a new script gets a row here.
 */
const MISSING_INPUT_RESULTS: Record<string, MissingInputResult> = {
  "measure.mjs": { exitCode: 3, output: "does not exist" },
  "entries.mjs": { exitCode: 2, output: "not found:" },
};

/**
 * Runs one node command line: the design-critic folder is swapped for its place in this
 * repository, and every other placeholder and every .png word for a path under MISSING_FOLDER.
 * Returns the script's file name, its exit code, and its stdout and stderr together.
 */
function runNodeWithMissingInputs(commandLine: string): {
  scriptName: string;
  exitCode: number | null;
  output: string;
} {
  const words = splitWords(commandLine).slice(1);
  const nodeArguments: string[] = [];
  for (const word of words) {
    if (word.startsWith(DESIGN_CRITIC_PLACEHOLDER)) {
      nodeArguments.push(
        word.replace(DESIGN_CRITIC_PLACEHOLDER, DESIGN_CRITIC_FOLDER),
      );
    } else if (word.startsWith("<") || word.endsWith(".png")) {
      // A placeholder becomes a safe file name, so "<round folder>" becomes "round-folder".
      const fileName = word.replace(/[<>]/g, "").replace(/\s+/g, "-");
      nodeArguments.push(join(MISSING_FOLDER, fileName));
    } else {
      nodeArguments.push(word);
    }
  }
  const scriptPath = nodeArguments[0] ?? "";
  const run = spawnSync(process.execPath, nodeArguments, {
    cwd: WORKING_DIRECTORY,
    env: ENVIRONMENT,
    encoding: "utf8",
  });
  return {
    scriptName: scriptPath.split("/").pop() ?? "",
    exitCode: run.status,
    output: `${run.stdout}${run.stderr}`,
  };
}

describe("the crit-loop skill commands", () => {
  const nodeLines = listCommandLines(SKILL_TEXT, "node");

  it("names the measure script", () => {
    // The script is the second word, such as <design-critic folder>/scripts/measure.mjs.
    const scriptNames = nodeLines.map(
      (commandLine) => splitWords(commandLine)[1]?.split("/").pop() ?? "",
    );
    expect(scriptNames).toContain("measure.mjs");
  });

  for (const commandLine of nodeLines) {
    it(`passes the command-line check: ${commandLine}`, () => {
      const run = runNodeWithMissingInputs(commandLine);
      const expected = MISSING_INPUT_RESULTS[run.scriptName];
      expect(
        expected,
        `no missing-input result for ${run.scriptName}`,
      ).toBeDefined();
      expect(run.exitCode).toBe(expected?.exitCode);
      expect(run.output).toContain(expected?.output);
      expect(run.output).not.toContain("usage:");
    });
  }

  // Lines that are wrong on purpose. Each gives the usage error and not the missing-input error,
  // which shows that the checks above can fail.
  const wrongNodeLines = [
    "node <design-critic folder>/scripts/measure.mjs <page> --outt <round folder>",
  ];
  for (const wrongLine of wrongNodeLines) {
    it(`fails the command-line check: ${wrongLine}`, () => {
      const run = runNodeWithMissingInputs(wrongLine);
      expect(run.exitCode).toBe(2);
      expect(run.output).toContain("usage:");
    });
  }
});

describe("the crit-loop skill files", () => {
  const paths = listDesignCriticPaths(SKILL_TEXT);

  it("names the recheck critic's instructions", () => {
    expect(paths).toContain(join(DESIGN_CRITIC_FOLDER, "agents", "recheck.md"));
  });

  for (const path of paths) {
    it(`names a file that exists: ${path}`, () => {
      expect(existsSync(path)).toBe(true);
    });
  }
});

describe("the crit-loop skill fields", () => {
  it("names the work-order fields the loop reads", () => {
    const fields = listFieldSpans(SKILL_TEXT);
    expect(fields).toContain("rank");
    expect(fields).toContain("location");
    expect(fields).toContain("target");
    expect(fields).toContain("fix_direction");
  });

  it("names only fields that the output schemas have", () => {
    expect(findUnknownFields(SKILL_TEXT)).toEqual([]);
  });

  it("finds a field that no schema has, so the check can fail", () => {
    const wrongText =
      "Read `closed_when.methods` and `gate.passes`, not `closed_when.method`.";
    expect(findUnknownFields(wrongText)).toEqual([
      "closed_when.methods",
      "gate.passes",
    ]);
  });
});

describe("the viewports of one page (crit-9w5.6, FR-85)", () => {
  it("captures every viewport the person picks, not only desktop and phone", () => {
    expect(SKILL_TEXT).not.toContain("--desktop --phone");
  });

  it("names the viewports line the design-critic skill adds to the critic's prompt", () => {
    const designCriticText = readFileSync(
      join(DESIGN_CRITIC_FOLDER, "SKILL.md"),
      "utf8",
    );
    expect(designCriticText).toContain(
      "   Viewports, in image order: <names, such as desktop, phone, tablet, widescreen>\n",
    );
  });
});

// Benjamin Jackson, 2026-11-25 (bd memory critic-no-buyer-framing): not every piece has a buyer,
// so no example in the skills may assume a sale (crit-cgl). This reads every SKILL.md and every
// agent file of both skills, removes the listed real terms, and expects no commercial word left.
describe("the skill files frame no piece as a sale (crit-cgl)", () => {
  const SKILLS_FOLDER = join(REPOSITORY_ROOT, "plugin", "skills");
  const COMMERCIAL_WORDS =
    /\b(?:buyers?|clients?|customers?|sales?|sell(?:s|ing)?|purchas\w*|prices?|pricing|trials?|checkout|carts?|subscrib\w*|plans?|conversions?|CTA|sign[- ]?ups?)\b/gi;
  // Real terms, by path under plugin/skills. Each phrase must still be in its file.
  const ALLOWED: Readonly<Record<string, readonly string[]>> = {
    "design-critic/agents/critic.md": [
      "do not call the reader a buyer or a client", // the rule itself (crit-9hj)
      "a team reading its own plan", // a document the team wrote
      "Prices, dates, deadlines", // crit-bwr owns this line; delete this entry when it rewords it
    ],
    "design-critic/SKILL.md": ["from a checkout of the repository"], // a git checkout
  };

  /** Lists each skill's SKILL.md and agents/*.md, as paths under plugin/skills. */
  function listSkillFiles(): string[] {
    const files: string[] = [];
    for (const skill of readdirSync(SKILLS_FOLDER)) {
      files.push(`${skill}/SKILL.md`);
      const agentsFolder = join(SKILLS_FOLDER, skill, "agents");
      if (!existsSync(agentsFolder)) continue;
      for (const name of readdirSync(agentsFolder)) {
        if (name.endsWith(".md")) files.push(`${skill}/agents/${name}`);
      }
    }
    return files;
  }
  const files = listSkillFiles();

  it("reads both skills", () => {
    expect(files).toContain("crit-loop/SKILL.md");
    expect(files).toContain("design-critic/agents/critic.md");
  });

  for (const file of files) {
    it(`uses no commercial word outside the real terms: ${file}`, () => {
      let text = readFileSync(join(SKILLS_FOLDER, file), "utf8");
      for (const phrase of ALLOWED[file] ?? [])
        text = text.replaceAll(phrase, "");
      expect(text.match(COMMERCIAL_WORDS) ?? []).toEqual([]);
    });
  }

  for (const [file, phrases] of Object.entries(ALLOWED)) {
    for (const phrase of phrases) {
      it(`still holds the allowed phrase "${phrase}": ${file}`, () => {
        expect(readFileSync(join(SKILLS_FOLDER, file), "utf8")).toContain(
          phrase,
        );
      });
    }
  }

  it("finds the old sales-page example, so the check can fail", () => {
    expect(
      "the price, if this is a sales page".match(COMMERCIAL_WORDS),
    ).toEqual(["price", "sales"]);
  });
});
