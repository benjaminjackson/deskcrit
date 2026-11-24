import { defineConfig } from "vitest/config";

// Vitest loads its settings from this file's default export, so Biome's
// noDefaultExport rule is turned off for this one file in biome.json.
// The unit tests sit next to their modules (CS-22).
// Time limit for one test. Reason: tests that run a script or sharp as a child process
// took longer than 30 s when other agents loaded the machine (load average 7 to 13, crit-cgd).
// Review trigger: raise or lower it if the slowest test on a quiet machine changes much.
const TEST_TIMEOUT_MS = 120_000;

export default defineConfig({
  test: {
    include: [
      "schemas/**/*.test.ts",
      "packs/_renderer/*.test.ts",
      "evals/*.test.ts",
      "evals/agreement/*.test.ts",
      "evals/adversarial/*.test.ts",
      "evals/critic/**/*.test.ts",
      "evals/loop-tells/*.test.ts",
    ],
    // Many tests run a script or sharp as a child process. When the machine is busy,
    // such as several test runs at once, they take longer than the Vitest default of 5 seconds.
    // A longer limit changes nothing that a test checks.
    testTimeout: TEST_TIMEOUT_MS,
  },
});
