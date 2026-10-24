// A disposable check of AC-8, CS-5 and CS-6: only src/ask/typesafe/ imports the TypeSafe SDK, and
// its source files read no environment, file system, or process, and write nothing to the console.
// It reads source files, which is fine in a test.

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { expect, test } from "vitest";

const adapterFolder = import.meta.dirname;
const sourceRoot = join(adapterFolder, "..", "..");

/** List every TypeScript file under a folder, in sorted order, walking into subfolders. */
function listTypeScriptFiles(folder: string): string[] {
  const files: string[] = [];
  const entries = readdirSync(folder, { withFileTypes: true });
  entries.sort((left, right) => (left.name < right.name ? -1 : 1));
  for (const entry of entries) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) {
      files.push(...listTypeScriptFiles(path));
    } else if (entry.name.endsWith(".ts")) {
      files.push(path);
    }
  }
  return files;
}

test("the adapter folder has the two source files to check", () => {
  const names: string[] = [];
  for (const path of listTypeScriptFiles(adapterFolder)) {
    if (!path.endsWith(".test.ts")) {
      names.push(relative(adapterFolder, path));
    }
  }
  expect(names).toEqual(["adapter.ts", "request.ts"]);
});

test("nothing in src/ outside src/ask/typesafe/ imports the TypeSafe SDK", () => {
  const importers: string[] = [];
  for (const path of listTypeScriptFiles(sourceRoot)) {
    if (path.startsWith(adapterFolder)) {
      continue;
    }
    if (readFileSync(path, "utf8").includes("@typesafe-ai/sdk")) {
      importers.push(relative(sourceRoot, path));
    }
  }
  expect(importers).toEqual([]);
});

const forbiddenPatterns: RegExp[] = [
  /\bprocess\./,
  /from\s+["']node:/,
  /require\(/,
  /\bconsole\./,
];

for (const name of ["adapter.ts", "request.ts"]) {
  test(`${name} reads no environment or file and writes nothing to the console`, () => {
    const source = readFileSync(join(adapterFolder, name), "utf8");
    for (const pattern of forbiddenPatterns) {
      expect(source).not.toMatch(pattern);
    }
  });
}
