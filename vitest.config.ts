import { defineConfig } from "vitest/config";

// Vitest loads its settings from this file's default export, so Biome's
// noDefaultExport rule is turned off for this one file in biome.json.
// The unit tests sit next to their modules (CS-22). The durable tests in evals/
// run the built bundle, which the pretest script in package.json builds first (CS-21).
export default defineConfig({
  test: {
    include: [
      "src/**/*.test.ts",
      "schemas/**/*.test.ts",
      "packs/_renderer/*.test.ts",
      "evals/*.test.ts",
      "evals/agreement/*.test.ts",
      "evals/wobble/*.test.ts",
      "evals/adversarial/*.test.ts",
      "evals/packs-test/*.test.ts",
    ],
    // Many tests run the built bundle or sharp as a child process. When the machine is busy,
    // such as several test runs at once, they take longer than the Vitest default of 5 seconds.
    // A longer limit changes nothing that a test checks.
    testTimeout: 30_000,
  },
});
