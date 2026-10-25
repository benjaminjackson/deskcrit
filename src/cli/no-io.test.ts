// A disposable check of CS-6 and CS-18: the renderers in src/cli/ do no I/O, import only compose's
// types, and use nothing that breaks determinism. It reads source files, which is fine in a test.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

/** Each pattern names one way a renderer could do I/O, reach the process, or lose determinism. */
const forbiddenPatterns: readonly RegExp[] = [
  /\bfetch\(/,
  /from\s+["']node:/,
  /require\(/,
  /\bimport\s*\(/,
  /^export\s.*\sfrom\s/m,
  /\bprocess\b/,
  /\bglobalThis\b/,
  /\bconsole\./,
  /from\s+["']\.\.\/(?!compose\/report\.js|compose\/verdict\.js|compose\/gate\.js|compose\/compare\.js)/,
  /\bDate\b/,
  /Math\.random/,
  /localeCompare|toLocale/,
  /\\u001b|\\x1b/,
];

/** The renderer source files this check reads. */
const rendererFileNames: readonly string[] = [
  "render-json.ts",
  "render-text.ts",
];

/** Returns true when the source text matches any forbidden pattern. */
function hasForbiddenPattern(source: string): boolean {
  for (const pattern of forbiddenPatterns) {
    if (pattern.test(source)) {
      return true;
    }
  }
  return false;
}

describe("the forbidden patterns catch", () => {
  const forbiddenSamples: readonly string[] = [
    'const fileSystem = await import("fs");',
    'export { writeFileSync } from "fs";',
    "const { stdout } = process;",
    'globalThis["process"].stdout.write("x");',
    'const reader = globalThis["require"];',
    'const later = import ("fs");',
  ];
  for (const sample of forbiddenSamples) {
    test(sample, () => {
      expect(hasForbiddenPattern(sample)).toBe(true);
    });
  }
});

for (const name of rendererFileNames) {
  test(`${name} does no I/O and imports only compose's types`, () => {
    const source = readFileSync(join(import.meta.dirname, name), "utf8");
    for (const pattern of forbiddenPatterns) {
      expect(source).not.toMatch(pattern);
    }
    expect(source).not.toMatch(/^import (?!type )/m);
  });
}

/**
 * The only modules report-command.ts may import: the package entry point src/index.ts, which holds
 * the four stage functions, the adapter type, and CouldNotRunError, so the CLI runs what a library
 * caller runs; the renderers; read-inputs.ts for its input type; answers-file.ts for --answers and
 * --save-answers; and package.json for the version (FR-63, FR-65, CS-6). A stage file, such as
 * compose/verdict.js or even compose/compose.js, is not on the list.
 */
const reportCommandAllowedImports: readonly string[] = [
  "../../package.json",
  "../index.js",
  "./answers-file.js",
  "./read-inputs.js",
  "./render-json.js",
  "./render-text.js",
];

test("report-command.ts imports only the stage entry files and does no I/O (FR-65, CS-6)", () => {
  const source = readFileSync(
    join(import.meta.dirname, "report-command.ts"),
    "utf8",
  );
  // Each match is the module text between the quotes after `from`.
  const importedModules: string[] = [];
  for (const match of source.matchAll(/\sfrom\s+"([^"]+)"/g)) {
    const moduleName = match[1];
    if (moduleName !== undefined) {
      importedModules.push(moduleName);
    }
  }
  expect(importedModules.length).toBeGreaterThan(0);
  for (const moduleName of importedModules) {
    expect(reportCommandAllowedImports).toContain(moduleName);
  }
  expect(source).not.toMatch(/\bprocess\b/);
  expect(source).not.toMatch(/\bconsole\./);
  expect(source).not.toMatch(/\bimport\s*\(/);
  expect(source).not.toMatch(/require\(/);
});

/**
 * The only modules gate-command.ts may import: the package entry point for gate(), the report
 * pipeline in report-command.ts, the renderers, and read-inputs.ts for its input type, so the gate
 * command runs exactly the gate a library caller runs (FR-63, FR-65, CS-6).
 */
const gateCommandAllowedImports: readonly string[] = [
  "../index.js",
  "./read-inputs.js",
  "./render-json.js",
  "./render-text.js",
  "./report-command.js",
];

test("gate-command.ts imports only the entry point, the report pipeline, and the renderers, and does no I/O (FR-65, CS-6)", () => {
  const source = readFileSync(
    join(import.meta.dirname, "gate-command.ts"),
    "utf8",
  );
  const importedModules: string[] = [];
  for (const match of source.matchAll(/\sfrom\s+"([^"]+)"/g)) {
    const moduleName = match[1];
    if (moduleName !== undefined) {
      importedModules.push(moduleName);
    }
  }
  expect(importedModules.length).toBeGreaterThan(0);
  for (const moduleName of importedModules) {
    expect(gateCommandAllowedImports).toContain(moduleName);
  }
  expect(source).not.toMatch(/\bprocess\b/);
  expect(source).not.toMatch(/\bconsole\./);
  expect(source).not.toMatch(/\bimport\s*\(/);
  expect(source).not.toMatch(/require\(/);
});

test("only main.ts sets the exit code, and no file in src/cli/ calls process.exit (CS-17)", () => {
  for (const name of readdirSync(import.meta.dirname)) {
    if (!name.endsWith(".ts") || name.endsWith(".test.ts")) {
      continue;
    }
    const source = readFileSync(join(import.meta.dirname, name), "utf8");
    expect(source).not.toMatch(/process\.exit\(/);
    if (name !== "main.ts") {
      expect(source).not.toMatch(/process\.exitCode/);
    }
  }
});

/**
 * The only modules compare-command.ts may import: the package entry point for compare(), the
 * answers file helpers, the report pipeline, the renderers, and read-inputs.ts for its input type,
 * so the compare command holds no diff or verdict logic of its own (FR-63, FR-65, CS-6).
 */
const compareCommandAllowedImports: readonly string[] = [
  "../index.js",
  "./answers-file.js",
  "./read-inputs.js",
  "./render-json.js",
  "./render-text.js",
  "./report-command.js",
];

test("compare-command.ts imports only the entry point, the answers file helpers, the report pipeline, and the renderers, and does no I/O (FR-65, CS-6)", () => {
  const source = readFileSync(
    join(import.meta.dirname, "compare-command.ts"),
    "utf8",
  );
  const importedModules: string[] = [];
  for (const match of source.matchAll(/\sfrom\s+"([^"]+)"/g)) {
    const moduleName = match[1];
    if (moduleName !== undefined) {
      importedModules.push(moduleName);
    }
  }
  expect(importedModules.length).toBeGreaterThan(0);
  for (const moduleName of importedModules) {
    expect(compareCommandAllowedImports).toContain(moduleName);
  }
  expect(source).not.toMatch(/\bprocess\b/);
  expect(source).not.toMatch(/\bconsole\./);
  expect(source).not.toMatch(/\bimport\s*\(/);
  expect(source).not.toMatch(/require\(/);
});
