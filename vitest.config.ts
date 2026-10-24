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
  },
});
