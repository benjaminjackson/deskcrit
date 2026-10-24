// The durable check of PRD FR-54 rules 2 and 3 (crit-cy8.38). For every pack
// under packs/, it reads the committed fixtures/rendered.json and each
// criterion's templates/<criterion-id>.defect.json, and runs the same pure
// check as `npm --prefix packs run verify`, with no browser: each positive
// fixture sits inside its declared range, each negative sits outside it, and
// each pair differs only in the declared properties. The evidence in
// rendered.json comes from the renderer; `npm --prefix packs run check`
// confirms it against a fresh render. Folders whose name starts with "_" are
// checked too, because the worked example must follow the rules it teaches.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import {
  declarationPathFor,
  findPackDeclarationProblems,
  parseDefectDeclaration,
} from "../packs/_renderer/defect.js";
import type { RenderRecord } from "../packs/_renderer/jobs.js";

/** The packs/ folder, where every path in rendered.json and every declaration path starts. */
const PACKS_FOLDER = join(
  dirname(dirname(fileURLToPath(import.meta.url))),
  "packs",
);

/** Lists the folders under packs/ that hold a fixtures/rendered.json. */
function listRenderedPacks(): string[] {
  const packFolders: string[] = [];
  for (const entry of readdirSync(PACKS_FOLDER, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === "node_modules") {
      continue;
    }
    if (
      existsSync(join(PACKS_FOLDER, entry.name, "fixtures", "rendered.json"))
    ) {
      packFolders.push(entry.name);
    }
  }
  return packFolders.sort();
}

test("finds at least the worked example and the basics pack", () => {
  expect(listRenderedPacks()).toEqual(
    expect.arrayContaining(["_example", "basics"]),
  );
});

for (const packFolder of listRenderedPacks()) {
  test(`${packFolder}: every fixture pair fits its defect declaration`, () => {
    const records = JSON.parse(
      readFileSync(
        join(PACKS_FOLDER, packFolder, "fixtures", "rendered.json"),
        "utf8",
      ),
    ) as RenderRecord[];
    const problems = findPackDeclarationProblems(
      packFolder,
      records,
      (criterionId) => {
        const declarationPath = declarationPathFor(packFolder, criterionId);
        const absolutePath = join(PACKS_FOLDER, declarationPath);
        if (!existsSync(absolutePath)) {
          return null;
        }
        return parseDefectDeclaration(
          readFileSync(absolutePath, "utf8"),
          declarationPath,
        );
      },
    );
    expect(problems).toEqual([]);
  });
}
