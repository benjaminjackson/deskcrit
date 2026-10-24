// The durable test of `crit packs test <dir>` that runs with no key and no network (EV-4, FR-50,
// FR-53, CS-21). It runs the built bundle as a child process with only PATH in its environment, so
// it must still pass if crit were rewritten in another language (AC-6). The cases that need a
// verdict from Jev are in run-live.ts, which only `npm run test:live:packs` runs.

import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runCritBundle } from "../support/run-crit-bundle.ts";

/** This folder, the working directory of every run, so crit reads its .crit.yaml. */
const PACKS_TEST_FOLDER = fileURLToPath(new URL(".", import.meta.url));

/** The environment of every run: PATH only, so no TYPESAFE_API_KEY reaches crit. */
const ENVIRONMENT_WITHOUT_KEY = { PATH: process.env.PATH ?? "" };

/** One case that stops before any request, with the text stderr must hold. */
type OfflineCase = {
  readonly name: string;
  readonly packDirectory: string;
  readonly stderrParts: readonly string[];
};

const offlineCases: readonly OfflineCase[] = [
  {
    name: "a fixture image that does not exist",
    packDirectory: join("packs", "missing-image"),
    stderrParts: ["solid-red", "fixtures/missing.png"],
  },
  {
    name: "a pack the schema rejects",
    packDirectory: join("packs", "invalid-pack"),
    stderrParts: ["packs/invalid-pack/pack.yaml", "fix"],
  },
  {
    name: "a valid pack with no key",
    packDirectory: join("packs", "all-agree"),
    stderrParts: ["TYPESAFE_API_KEY"],
  },
];

describe("crit packs test with no key", () => {
  for (const offlineCase of offlineCases) {
    it(`exits 2 with nothing on stdout for ${offlineCase.name}, and names the input`, async () => {
      const run = await runCritBundle(
        ["packs", "test", offlineCase.packDirectory],
        ENVIRONMENT_WITHOUT_KEY,
        PACKS_TEST_FOLDER,
      );
      expect(run.exitCode).toBe(2);
      expect(run.stdout).toBe("");
      for (const part of offlineCase.stderrParts) {
        expect(run.stderr).toContain(part);
      }
    });
  }
});
