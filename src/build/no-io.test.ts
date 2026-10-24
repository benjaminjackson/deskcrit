// A disposable check of AC-7 and CS-6: the build stage's source files do no I/O, import no other
// stage's folder, and use nothing that breaks determinism (CS-18). It reads source files, which is
// fine in a test.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

const buildFolder = import.meta.dirname;

const forbiddenPatterns: RegExp[] = [
  /\bfetch\(/,
  /from\s+["']node:/,
  /require\(/,
  /\bprocess\./,
  /console\./,
  // Node's built-in modules without the node: prefix, and dynamic import().
  /from\s+["'](fs|path|child_process|os)(\/[^"']*)?["']/,
  /\bimport\(/,
  /from\s+["']\.\.\/(?!shared\/)/,
  /\bDate\b/,
  /Math\.random/,
  /localeCompare|toLocale/,
];

/** List the stage's source files, leaving out tests. */
function listStageSourceFiles(): string[] {
  const files: string[] = [];
  for (const name of readdirSync(buildFolder)) {
    if (name.endsWith(".ts") && !name.endsWith(".test.ts")) {
      files.push(name);
    }
  }
  files.sort();
  return files;
}

test("the build stage has source files to check", () => {
  expect(listStageSourceFiles()).toEqual(["build.ts", "types.ts"]);
});

for (const name of listStageSourceFiles()) {
  test(`${name} does no I/O and imports only src/shared/ and its own folder`, () => {
    const source = readFileSync(join(buildFolder, name), "utf8");
    for (const pattern of forbiddenPatterns) {
      expect(source).not.toMatch(pattern);
    }
  });
}
