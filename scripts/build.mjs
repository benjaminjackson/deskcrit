import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
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

/**
 * The packs/ folder at the repository root, found from this script's own path, so the build reads
 * the same folder as src/cli/bundled-pack-texts.ts whatever the current directory is.
 */
const PACKS_DIRECTORY = fileURLToPath(new URL("../packs/", import.meta.url));

/**
 * The comments the plugin writes before and after the embedded list. A `/*!` comment is a legal
 * comment, which esbuild keeps in place with `legalComments: "inline"`, so the bundle test can find
 * the list between them.
 */
const BUNDLED_PACKS_START_MARKER = "/*! crit-bundled-packs-start */";
const BUNDLED_PACKS_END_MARKER = "/*! crit-bundled-packs-end */";

/**
 * Reads the text of every packs/<name>/pack.yaml, sorted by name with a plain comparator (CS-18).
 * A folder whose name starts with `_` is not a pack, and a folder with no pack.yaml is skipped.
 * These are the same rules as src/cli/bundled-pack-texts.ts. Only pack.yaml is read, so fixtures
 * and ATTRIBUTION.md never reach the bundle (FR-44, FR-53). It throws when it finds no pack.
 */
function readBundledPackTexts() {
  const names = [];
  for (const entry of readdirSync(PACKS_DIRECTORY, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) {
      continue;
    }
    if (!existsSync(join(PACKS_DIRECTORY, entry.name, "pack.yaml"))) {
      continue;
    }
    names.push(entry.name);
  }
  names.sort((left, right) => {
    if (left < right) {
      return -1;
    }
    if (left > right) {
      return 1;
    }
    return 0;
  });
  if (names.length === 0) {
    throw new Error("the build found no packs/*/pack.yaml to bundle");
  }
  const sources = [];
  for (const name of names) {
    const yamlText = readFileSync(
      join(PACKS_DIRECTORY, name, "pack.yaml"),
      "utf8",
    );
    sources.push({ name, yamlText });
  }
  return sources;
}

/**
 * An esbuild plugin that replaces the whole of src/cli/bundled-pack-texts.ts with one line that
 * holds every pack text as a string, so dist/crit.js carries the first-party packs and reads no
 * pack file at run time (FR-11, FR-53, NFR-2). onLoad gives esbuild the module text in place of
 * the file on disk, and the filter is a regular expression on the file path.
 */
const bundledPacksPlugin = {
  name: "bundled-packs",
  setup(pluginBuild) {
    pluginBuild.onLoad(
      { filter: /src[\\/]cli[\\/]bundled-pack-texts\.ts$/ },
      () => {
        const sources = readBundledPackTexts();
        return {
          contents: `${BUNDLED_PACKS_START_MARKER}\nexport const BUNDLED_PACK_TEXTS = ${JSON.stringify(sources)};\n${BUNDLED_PACKS_END_MARKER}\n`,
          loader: "js",
        };
      },
    );
  },
};

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
  plugins: [bundledPacksPlugin],
  // Keeps the two marker comments around the embedded pack list where the plugin put them.
  legalComments: "inline",
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
