import { rm } from "node:fs/promises";
import { build } from "esbuild";

/**
 * Bundles src/cli/bin.ts into the one file dist/crit.js that both bin
 * entries run, so `npx deskcrit` works with no install step (FR-59, NFR-2).
 * It deletes dist/ first so that no stale file from an earlier build ships.
 * A .mjs file is an ES module, so it can use await at the top level.
 */
await rm("dist", { recursive: true, force: true });
await build({
  entryPoints: ["src/cli/bin.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  // The lowest Node release in package.json engines (NFR-1).
  target: "node22",
  outfile: "dist/crit.js",
  // sharp stays external because it ships a native libvips binary for each
  // platform, which cannot be put inside a JavaScript file. crit-cy8.4 adds it
  // to package.json dependencies so that npx installs it (NFR-2, OQ-12).
  external: ["sharp"],
  // The shebang line lets the operating system run the file as a command, and it must stay the
  // first line. The two lines after it define `require` for the bundled CommonJS code in yaml,
  // which calls require("process"); an ES module has no `require` of its own, so without them the
  // bundle fails with 'Dynamic require of "process" is not supported'.
  banner: {
    js: '#!/usr/bin/env node\nimport { createRequire as __critCreateRequire } from "node:module";\nconst require = __critCreateRequire(import.meta.url);',
  },
  logLevel: "info",
});
