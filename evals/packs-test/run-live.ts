// The live cases of the `crit packs test <dir>` durable test (EV-4, FR-50, FR-53, CS-21). It runs
// the built bundle on three small packs whose fixtures are solid colours, so the verdicts are
// stable: one pack where every fixture agrees, one where the positive fixture disagrees, and one
// where the negative fixture disagrees. It asks TypeSafe 6 times in all (one request per fixture
// image), so only `npm run test:live:packs` runs it and `npm run ci` never does. It refuses to
// start without TYPESAFE_API_KEY and never prints the key.

import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runCritBundle } from "../support/run-crit-bundle.ts";

/** This folder, the working directory of every run, so crit reads its .crit.yaml and pinned model. */
const PACKS_TEST_FOLDER = fileURLToPath(new URL(".", import.meta.url));

/** One live case: the pack, the exit code it must give, and the lines stdout must hold. */
type LiveCase = {
  readonly packDirectory: string;
  readonly exitCode: number;
  readonly stdoutLines: readonly string[];
};

const liveCases: readonly LiveCase[] = [
  {
    packDirectory: join("packs", "all-agree"),
    exitCode: 0,
    stdoutLines: ["all-agree: 2 agreed, 0 disagreed"],
  },
  {
    packDirectory: join("packs", "positive-disagrees"),
    exitCode: 1,
    stdoutLines: [
      "solid-red positive fixtures/white.png: pass",
      "positive-disagrees: 1 agreed, 1 disagreed",
    ],
  },
  {
    packDirectory: join("packs", "negative-disagrees"),
    exitCode: 1,
    stdoutLines: [
      "solid-red negative fixtures/dark-red.png: fail",
      "negative-disagrees: 1 agreed, 1 disagreed",
    ],
  },
];

/**
 * Run each live case, print what crit wrote, and return the number of cases whose exit code or
 * stdout did not match (EV-4, FR-50).
 */
async function runLiveCases(apiKey: string): Promise<number> {
  const environment = {
    PATH: process.env.PATH ?? "",
    TYPESAFE_API_KEY: apiKey,
  };
  let failedCases = 0;
  for (const liveCase of liveCases) {
    const run = await runCritBundle(
      ["packs", "test", liveCase.packDirectory],
      environment,
      PACKS_TEST_FOLDER,
    );
    const problems: string[] = [];
    if (run.exitCode !== liveCase.exitCode) {
      problems.push(`exit code ${run.exitCode}, expected ${liveCase.exitCode}`);
    }
    for (const line of liveCase.stdoutLines) {
      if (!run.stdout.includes(line)) {
        problems.push(`stdout does not hold "${line}"`);
      }
    }
    process.stdout.write(`== ${liveCase.packDirectory}\n${run.stdout}`);
    if (run.stderr !== "") {
      process.stdout.write(`stderr: ${run.stderr}`);
    }
    if (problems.length > 0) {
      failedCases += 1;
      for (const problem of problems) {
        process.stdout.write(`FAILED: ${problem}\n`);
      }
    }
  }
  return failedCases;
}

/** Check the key, run the cases, and set exit code 1 when any case failed and 2 when there is no key. */
async function runMain(): Promise<void> {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (apiKey === undefined || apiKey === "") {
    process.stderr.write(
      "TYPESAFE_API_KEY is not set; the live packs test cases ask TypeSafe\n",
    );
    process.exitCode = 2;
    return;
  }
  const failedCases = await runLiveCases(apiKey);
  process.stdout.write(
    `${liveCases.length - failedCases} of ${liveCases.length} live cases passed\n`,
  );
  if (failedCases > 0) {
    process.exitCode = 1;
  }
}

await runMain();
