// A disposable check of AC-8 and CS-6: nothing in src/ask/ outside src/ask/typesafe/ imports the
// TypeSafe SDK, touches the network, file system, environment or process, or names the
// danger-zone header. It reads source files, which is fine in a test.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

const askFolder = import.meta.dirname;

const forbiddenPatterns: RegExp[] = [
  /\bfetch\(/,
  /from\s+["']node:/,
  /require\(/,
  /\bprocess\./,
  /from\s+["'][^"']*typesafe[^"']*["']/i,
  /@typesafe-ai/,
  /danger-zone/i,
];

/** List the stage's source files: not tests, and not the real adapter's folder (AC-8). */
function listStageSourceFiles(): string[] {
  const files: string[] = [];
  for (const name of readdirSync(askFolder)) {
    if (name.endsWith(".ts") && !name.endsWith(".test.ts")) {
      files.push(name);
    }
  }
  return files;
}

test("the ask stage has source files to check", () => {
  expect(listStageSourceFiles()).toEqual(["adapter.ts", "ask.ts", "stub.ts"]);
});

for (const name of listStageSourceFiles()) {
  test(`${name} does no I/O and knows nothing of TypeSafe's request format`, () => {
    const source = readFileSync(join(askFolder, name), "utf8");
    for (const pattern of forbiddenPatterns) {
      expect(source).not.toMatch(pattern);
    }
  });
}
