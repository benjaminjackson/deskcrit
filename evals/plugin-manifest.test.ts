// The durable check of the Claude Code plugin packaging (FR-66, FR-69, crit-bts.3). It reads
// .claude-plugin/marketplace.json at the repository root and plugin/.claude-plugin/plugin.json, and
// checks that Claude Code can find the plugin and its skills from them: both files parse, the
// marketplace entry names the plugin and points at its folder, every skill folder has a SKILL.md
// with a matching name, and every component path the manifest declares exists. It reads files only
// and imports nothing from src/, so it still holds if crit is rewritten in another language (AC-6).

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/** The repository root, one folder above evals/. */
const REPOSITORY_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** A JSON object, read as plain data. */
type JsonObject = { [key: string]: unknown };

/** Reads a file under the repository root and parses it as a JSON object. */
function readJsonObject(relativePath: string): JsonObject {
  const text = readFileSync(join(REPOSITORY_ROOT, relativePath), "utf8");
  const parsed: unknown = JSON.parse(text);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${relativePath} is not a JSON object`);
  }
  return parsed as JsonObject;
}

/** Tells whether a value is a JSON object, so its keys can be read. */
function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Tells whether a path names a folder that exists. */
function isFolder(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

/**
 * Reads the `name` value from the YAML frontmatter at the top of a SKILL.md, the block between the
 * first two `---` lines. Returns null when there is no frontmatter or no name line.
 */
function readFrontmatterName(skillText: string): string | null {
  const lines = skillText.split("\n");
  if (lines[0]?.trim() !== "---") {
    return null;
  }
  for (let index = 1; index < lines.length; index++) {
    const line = lines[index] ?? "";
    if (line.trim() === "---") {
      return null;
    }
    const match = /^name:\s*(.+?)\s*$/.exec(line);
    if (match !== null) {
      return match[1] ?? null;
    }
  }
  return null;
}

/** The marketplace file that `/plugin marketplace add benjaminjackson/deskcrit` reads. */
const MARKETPLACE = readJsonObject(join(".claude-plugin", "marketplace.json"));

/** The plugin manifest. */
const PLUGIN_FOLDER = join(REPOSITORY_ROOT, "plugin");
const MANIFEST = readJsonObject(
  join("plugin", ".claude-plugin", "plugin.json"),
);

/** The manifest keys that name component paths in the plugin, from the Claude Code plugin reference. */
const COMPONENT_PATH_KEYS = [
  "skills",
  "commands",
  "agents",
  "hooks",
  "mcpServers",
];

describe("plugin manifest", () => {
  it("has a kebab-case name", () => {
    expect(MANIFEST.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("declares only component paths that start with ./ and exist in the plugin folder", () => {
    for (const key of COMPONENT_PATH_KEYS) {
      const value = MANIFEST[key];
      if (value === undefined || isJsonObject(value)) {
        // An absent key uses the default folder. An object, such as inline hooks, names no path.
        continue;
      }
      const paths = Array.isArray(value) ? value : [value];
      for (const path of paths) {
        expect(typeof path, `${key} entry`).toBe("string");
        expect(String(path).startsWith("./"), `${key}: ${path}`).toBe(true);
        expect(
          existsSync(join(PLUGIN_FOLDER, String(path))),
          `${key}: ${path}`,
        ).toBe(true);
      }
    }
  });
});

describe("plugin skills", () => {
  const skillsFolder = join(PLUGIN_FOLDER, "skills");
  const skillFolderNames = readdirSync(skillsFolder).filter((entry) =>
    isFolder(join(skillsFolder, entry)),
  );

  it("has at least one skill", () => {
    expect(skillFolderNames.length).toBeGreaterThan(0);
  });

  for (const folderName of skillFolderNames) {
    it(`${folderName} has a SKILL.md whose name is the folder name`, () => {
      const skillPath = join(skillsFolder, folderName, "SKILL.md");
      expect(existsSync(skillPath), skillPath).toBe(true);
      const name = readFrontmatterName(readFileSync(skillPath, "utf8"));
      expect(name).toBe(folderName);
    });
  }
});

describe("marketplace", () => {
  it("has a name, an owner name, and at least one plugin", () => {
    expect(typeof MARKETPLACE.name).toBe("string");
    expect(isJsonObject(MARKETPLACE.owner)).toBe(true);
    const owner = MARKETPLACE.owner as JsonObject;
    expect(typeof owner.name).toBe("string");
    expect(Array.isArray(MARKETPLACE.plugins)).toBe(true);
    expect((MARKETPLACE.plugins as unknown[]).length).toBeGreaterThan(0);
  });

  it("lists the plugin by its manifest name, with a source folder inside the repository that holds the manifest", () => {
    const entries = MARKETPLACE.plugins as unknown[];
    const entry = entries.find(
      (candidate) =>
        isJsonObject(candidate) && candidate.name === MANIFEST.name,
    );
    expect(isJsonObject(entry), `an entry named ${String(MANIFEST.name)}`).toBe(
      true,
    );
    const source = (entry as JsonObject).source;
    expect(typeof source).toBe("string");
    const sourceText = String(source);
    expect(sourceText.startsWith("./")).toBe(true);
    expect(sourceText.split("/")).not.toContain("..");
    const sourceFolder = resolve(REPOSITORY_ROOT, sourceText);
    expect(sourceFolder.startsWith(REPOSITORY_ROOT + sep)).toBe(true);
    expect(sourceFolder).toBe(PLUGIN_FOLDER);
    expect(
      existsSync(join(sourceFolder, ".claude-plugin", "plugin.json")),
    ).toBe(true);
  });
});
