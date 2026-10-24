import { spawnSync } from "node:child_process";
import { rm } from "node:fs/promises";
import { build } from "esbuild";

// This script makes three outputs in dist/: the CLI bundle dist/crit.js, the library bundle
// dist/index.js, and the library type declarations in dist/types/. It deletes dist/ first so that
// no stale file from an earlier build ships. A .mjs file is an ES module, so it can use await at
// the top level.

/**
 * The lines that define `require` for the bundled CommonJS code in yaml, which calls
 * require("process"). An ES module has no `require` of its own, so without them a bundle fails
 * with 'Dynamic require of "process" is not supported'.
 */
const requireBanner =
  'import { createRequire as __critCreateRequire } from "node:module";\nconst require = __critCreateRequire(import.meta.url);';

await rm("dist", { recursive: true, force: true });

/**
 * Bundles src/cli/bin.ts into the one file dist/crit.js that both bin
 * entries run, so `npx deskcrit` works with no install step (FR-59, NFR-2).
 */
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
  // first line, before the require lines.
  banner: {
    js: `#!/usr/bin/env node\n${requireBanner}`,
  },
  logLevel: "info",
});

/**
 * Bundles the package entry point src/index.ts into dist/index.js, the file that `import ... from
 * "deskcrit"` loads (FR-63). It has no shebang, because it is a library and not a command. sharp
 * stays external for the same reason as in the CLI bundle.
 */
await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  outfile: "dist/index.js",
  external: ["sharp"],
  banner: { js: requireBanner },
  logLevel: "info",
});

/**
 * Writes the type declarations of the package entry point to dist/types/, so a TypeScript caller
 * gets the stage input and output types (FR-63, US-13). esbuild does not write declarations, so
 * the TypeScript compiler does it with tsconfig.lib.json.
 */
const declarationResult = spawnSync(
  "npx",
  ["--no-install", "tsc", "-p", "tsconfig.lib.json"],
  { stdio: "inherit" },
);
if (declarationResult.status !== 0) {
  throw new Error("tsc could not write the declarations in dist/types/");
}
