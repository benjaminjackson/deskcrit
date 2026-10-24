import { defineConfig } from "vitest/config";

// Vitest loads its settings from this file's default export, so Biome's
// noDefaultExport rule is turned off for this one file in biome.json.
// Only unit tests next to their modules run here. The durable tests in
// evals/ run the built bundle and are wired up by a later ticket (CS-21, CS-22).
export default defineConfig({
  test: {
    include: [
      "src/**/*.test.ts",
      "schemas/**/*.test.ts",
      "packs/_renderer/*.test.ts",
    ],
  },
});
