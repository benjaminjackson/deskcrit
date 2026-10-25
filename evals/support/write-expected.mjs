// Rewrites the expected.stdout, expected.stderr, and expected.exit-code files of the golden cases
// from the current bundle (EV-1). Run it by hand with `npm run build && node
// evals/support/write-expected.mjs [case-name...]`. With no names it rewrites every case. It is
// never part of `npm test`: a person reads the diff it makes and approves it in review, and an
// agent must not run it to make a failing golden test pass (CLAUDE.md, Fowler 11). Node 23.6 or
// later loads the TypeScript helper below with its built-in type stripping.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { readGoldenCases, runCrit } from "./run-crit.ts";

/**
 * Run each chosen golden case once and write what the bundle printed and its exit code into the
 * case folder, so the stored files match the current behavior.
 */
function writeExpectedFiles(chosenNames) {
  for (const goldenCase of readGoldenCases()) {
    if (chosenNames.length > 0 && !chosenNames.includes(goldenCase.name)) {
      continue;
    }
    const result = runCrit(goldenCase.arguments, goldenCase.workingDirectory);
    writeFileSync(join(goldenCase.directory, "expected.stdout"), result.stdout);
    writeFileSync(join(goldenCase.directory, "expected.stderr"), result.stderr);
    writeFileSync(
      join(goldenCase.directory, "expected.exit-code"),
      `${result.exitCode}\n`,
    );
    console.log(`${goldenCase.name}: exit code ${result.exitCode}`);
  }
}

writeExpectedFiles(process.argv.slice(2));
