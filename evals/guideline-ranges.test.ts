// Checks that the two copies of each defect range agree: the `Defect range`
// line in GUIDELINES.md, which people read, and the criterion's .defect.json,
// which verify reads (PRD FR-54 rule 2, crit-cy8.38). It also checks that
// every criterion with a template has both copies. Folders under packs/ whose
// name starts with "_" are not packs and are skipped.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import {
  declarationPathFor,
  describeRangeMismatch,
  parseDefectDeclaration,
  parseGuidelineRanges,
  templateCriterionId,
} from "../packs/_renderer/defect.js";

/** The repository root, which holds GUIDELINES.md and packs/. */
const REPOSITORY_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** The packs/ folder, where every declaration path starts. */
const PACKS_FOLDER = join(REPOSITORY_ROOT, "packs");

/** Lists the criterion ids that have at least one template in a pack. */
function listTemplateCriterionIds(packFolder: string): string[] {
  const templatesFolder = join(PACKS_FOLDER, packFolder, "templates");
  if (!existsSync(templatesFolder)) {
    return [];
  }
  const criterionIds = new Set<string>();
  for (const fileName of readdirSync(templatesFolder)) {
    if (fileName.endsWith(".html")) {
      criterionIds.add(templateCriterionId(fileName.slice(0, -".html".length)));
    }
  }
  return Array.from(criterionIds).sort();
}

test("GUIDELINES.md and every .defect.json state the same range for each criterion", () => {
  const guidelineRanges = parseGuidelineRanges(
    readFileSync(join(REPOSITORY_ROOT, "GUIDELINES.md"), "utf8"),
  );
  const problems: string[] = [];
  const packFolders = readdirSync(PACKS_FOLDER, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .filter((entry) => entry.name !== "node_modules")
    .map((entry) => entry.name);
  for (const packFolder of packFolders) {
    for (const criterionId of listTemplateCriterionIds(packFolder)) {
      const declarationPath = declarationPathFor(packFolder, criterionId);
      const absolutePath = join(PACKS_FOLDER, declarationPath);
      if (!existsSync(absolutePath)) {
        problems.push(`${declarationPath} is missing`);
        continue;
      }
      if (!guidelineRanges.has(criterionId)) {
        problems.push(
          `GUIDELINES.md has no Defect range line for ${criterionId}`,
        );
        continue;
      }
      const declaration = parseDefectDeclaration(
        readFileSync(absolutePath, "utf8"),
        declarationPath,
      );
      const mismatch = describeRangeMismatch(
        criterionId,
        guidelineRanges.get(criterionId) ?? null,
        declaration.range,
      );
      if (mismatch !== null) {
        problems.push(mismatch);
      }
    }
  }
  expect(problems).toEqual([]);
});
