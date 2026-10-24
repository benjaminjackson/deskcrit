import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

/**
 * Runs one command with no arguments, and throws unless it exits with code 2, writes nothing to
 * stdout, and prints the usage line on stderr (FR-43, FR-59, FR-61).
 */
function expectUsageRun(command, commandArguments, workingDirectory) {
  const description = [command, ...commandArguments].join(" ");
  const result = spawnSync(command, commandArguments, {
    cwd: workingDirectory,
    encoding: "utf8",
  });
  if (result.status !== 2) {
    throw new Error(
      `${description} exited with ${result.status}, expected 2\n${result.stderr}`,
    );
  }
  if (result.stdout !== "") {
    throw new Error(`${description} printed ${JSON.stringify(result.stdout)}`);
  }
  if (!result.stderr.includes("usage: crit report")) {
    throw new Error(
      `${description} stderr has no usage line\n${result.stderr}`,
    );
  }
  console.log(`ok: ${description}`);
}

/**
 * Runs the bundle on a real image and a real pack with TYPESAFE_API_KEY unset. main checks the
 * key after it loads the pack, so exit code 2 with the key message proves the bundled yaml and
 * Ajv code runs (NFR-14, FR-11). The stderr check for "Dynamic require" catches the CommonJS
 * require failure that the build banner fixes.
 */
function expectPackLoadsInBundle() {
  const workingDirectory = mkdtempSync(join(tmpdir(), "deskcrit-report-"));
  try {
    mkdirSync(join(workingDirectory, "minimal"));
    copyFileSync(
      "schemas/examples/valid/minimal.yaml",
      join(workingDirectory, "minimal", "pack.yaml"),
    );
    const environment = { ...process.env };
    delete environment.TYPESAFE_API_KEY;
    const commandArguments = [
      resolve("dist/crit.js"),
      "report",
      resolve("packs/_example/fixtures/example-contrast.positive.png"),
      "--pack",
      "minimal",
      "--json",
    ];
    const description = `node ${commandArguments.join(" ")}`;
    const result = spawnSync("node", commandArguments, {
      cwd: workingDirectory,
      encoding: "utf8",
      env: environment,
    });
    if (result.status !== 2) {
      throw new Error(
        `${description} exited with ${result.status}, expected 2\n${result.stderr}`,
      );
    }
    if (result.stdout !== "") {
      throw new Error(
        `${description} printed ${JSON.stringify(result.stdout)}`,
      );
    }
    if (result.stderr.includes("Dynamic require")) {
      throw new Error(
        `${description} hit a CommonJS require\n${result.stderr}`,
      );
    }
    if (!result.stderr.includes("TYPESAFE_API_KEY")) {
      throw new Error(
        `${description} stderr does not name TYPESAFE_API_KEY\n${result.stderr}`,
      );
    }
    console.log(`ok: ${description} loads the pack and stops for the key`);
  } finally {
    // The path comes from mkdtempSync, so it is never empty and sits inside the temp folder.
    rmSync(workingDirectory, { recursive: true, force: true });
  }
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

  expectUsageRun("node", ["dist/crit.js"], process.cwd());
  expectPackLoadsInBundle();

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
      expectUsageRun(
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
