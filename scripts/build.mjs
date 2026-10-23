import { rm } from "node:fs/promises";
import { build } from "esbuild";

/**
 * Bundles src/cli/main.ts into the one file dist/crit.js that both bin
 * entries run, so `npx deskcrit` works with no install step (FR-59, NFR-2).
 * It deletes dist/ first so that no stale file from an earlier build ships.
 */
async function buildBundle() {
  await rm("dist", { recursive: true, force: true });
  await build({
    entryPoints: ["src/cli/main.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    // The lowest Node release in package.json engines (NFR-1).
    target: "node22",
    outfile: "dist/crit.js",
    // sharp ships a native libvips binary for each platform, which cannot be
    // put inside a JavaScript file. It stays a normal package import, and npx
    // installs it from package.json dependencies (NFR-2, OQ-12).
    external: ["sharp"],
    // The shebang line lets the operating system run the file as a command.
    banner: { js: "#!/usr/bin/env node" },
    logLevel: "info",
  });
}

await buildBundle();
