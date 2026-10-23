import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const EXPECTED_OUTPUT = "deskcrit: no commands yet (crit-cy8.11 adds them)\n";

/**
 * Runs one command, and throws unless it exits with code 0 and prints exactly
 * the placeholder line on stdout (FR-59, FR-61).
 */
function expectPlaceholderRun(command, commandArguments, workingDirectory) {
  const description = [command, ...commandArguments].join(" ");
  const result = spawnSync(command, commandArguments, {
    cwd: workingDirectory,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(
      `${description} exited with ${result.status}\n${result.stderr}`,
    );
  }
  if (result.stdout !== EXPECTED_OUTPUT) {
    throw new Error(`${description} printed ${JSON.stringify(result.stdout)}`);
  }
  console.log(`ok: ${description}`);
}

/**
 * Checks the built bundle the way a user meets it: dist/ holds one file, node
 * runs it, and npx runs the packed tarball under both bin names with no
 * separate install step (FR-59, NFR-2).
 */
function runSmokeChecks() {
  const distFiles = readdirSync("dist");
  if (distFiles.length !== 1 || distFiles[0] !== "crit.js") {
    throw new Error(`dist/ should hold only crit.js, found: ${distFiles}`);
  }
  console.log("ok: dist/ holds only crit.js");

  expectPlaceholderRun("node", ["dist/crit.js"], process.cwd());

  const packDirectory = mkdtempSync(join(tmpdir(), "deskcrit-pack-"));
  const emptyDirectory = mkdtempSync(join(tmpdir(), "deskcrit-npx-"));
  try {
    const packResult = spawnSync(
      "npm",
      ["pack", "--pack-destination", packDirectory],
      { encoding: "utf8" },
    );
    if (packResult.status !== 0) {
      throw new Error(`npm pack failed\n${packResult.stderr}`);
    }
    const tarballName = readdirSync(packDirectory)[0];
    if (tarballName === undefined) {
      throw new Error("npm pack wrote no tarball");
    }
    const tarballPath = resolve(packDirectory, tarballName);
    for (const binName of ["crit", "deskcrit"]) {
      expectPlaceholderRun(
        "npx",
        ["--yes", "--package", tarballPath, binName],
        emptyDirectory,
      );
    }
  } finally {
    // Both paths come from mkdtempSync, so they are never empty and always
    // sit inside the system temp folder.
    rmSync(packDirectory, { recursive: true, force: true });
    rmSync(emptyDirectory, { recursive: true, force: true });
  }
}

runSmokeChecks();
