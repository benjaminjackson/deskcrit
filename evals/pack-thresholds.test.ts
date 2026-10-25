// The durable check that no first-party criterion can reach fail by accident (EV-5, FR-25,
// crit-q25.28). By step 4 of the verdict rule, a criterion that has pass_when gives fail when no
// predicate matches. So a criterion with pass_when and without fail_when gives fail in the middle
// band, although its most severe verdict should be warn. This test reads every pack.yaml under
// packs/ (not the folders whose name starts with "_") and names each criterion that has pass_when
// and no fail_when.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { parse } from "yaml";
import { listPackDirectories } from "./packs-fixture-rules.js";

/** The real packs/ folder of the repository. */
const PACKS_FOLDER = join(
  dirname(dirname(fileURLToPath(import.meta.url))),
  "packs",
);

/** The fields of one criterion that this check reads. */
interface CriterionThresholds {
  id: string;
  pass_when?: unknown;
  fail_when?: unknown;
}

/** Lists "<pack>/<id>" for each criterion of the first-party packs that has pass_when and no fail_when. */
function findPassWithoutFail(): string[] {
  const offenders: string[] = [];
  for (const packName of listPackDirectories(PACKS_FOLDER)) {
    if (packName.startsWith("_")) {
      continue;
    }
    const packText = readFileSync(
      join(PACKS_FOLDER, packName, "pack.yaml"),
      "utf8",
    );
    const pack = parse(packText) as { criteria: CriterionThresholds[] };
    for (const criterion of pack.criteria) {
      if (
        criterion.pass_when !== undefined &&
        criterion.fail_when === undefined
      ) {
        offenders.push(`${packName}/${criterion.id}`);
      }
    }
  }
  return offenders;
}

test("the check finds at least one first-party pack", () => {
  const firstPartyPacks = listPackDirectories(PACKS_FOLDER).filter(
    (packName) => !packName.startsWith("_"),
  );
  expect(firstPartyPacks.length).toBeGreaterThan(0);
});

test("every first-party criterion with pass_when also has fail_when", () => {
  expect(findPassWithoutFail()).toEqual([]);
});
