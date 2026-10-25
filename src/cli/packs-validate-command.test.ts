// Disposable unit tests for `crit packs validate <dir>` through main (FR-43, FR-49, FR-60, FR-61,
// US-6, CS-22). They run with no API key and an adapter factory that fails the test if it is
// called, so the command is shown to need neither.

import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { main } from "./main.js";

/** The repository root, so the tests can find the first-party packs and an example pack. */
const repositoryRoot = join(import.meta.dirname, "..", "..");

let workingDirectory = "";
let stdoutText = "";
let stderrText = "";

beforeEach(() => {
  workingDirectory = mkdtempSync(join(tmpdir(), "crit-packs-validate-test-"));
  stdoutText = "";
  stderrText = "";
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdoutText += String(chunk);
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    stderrText += String(chunk);
    return true;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
  // workingDirectory comes from mkdtempSync, so it is never empty and sits in the temp folder.
  rmSync(workingDirectory, { recursive: true, force: true });
});

/** Run `crit packs validate <directory>` with no environment and an adapter that must not be made. */
async function runValidate(directory: string, cwd: string) {
  await main(
    ["packs", "validate", directory],
    {},
    () => {
      throw new Error("packs validate must not make an adapter");
    },
    cwd,
  );
  return { stdout: stdoutText, stderr: stderrText, exitCode: process.exitCode };
}

/** Write a pack directory from the minimal example pack plus the given fixtures block and files. */
function writePackDirectory(fixturesBlock: string, files: string[]): void {
  const directory = join(workingDirectory, "my-pack");
  mkdirSync(join(directory, "fixtures"), { recursive: true });
  const minimal = readFileSync(
    join(repositoryRoot, "schemas/examples/valid/minimal.yaml"),
    "utf8",
  );
  writeFileSync(join(directory, "pack.yaml"), `${minimal}${fixturesBlock}`);
  for (const file of files) {
    writeFileSync(join(directory, file), "");
  }
}

describe("crit packs validate", () => {
  for (const packName of ["basics", "layout", "typography"]) {
    it(`accepts the first-party ${packName} pack with exit 0`, async () => {
      const result = await runValidate(`packs/${packName}`, repositoryRoot);
      expect(result.stderr).toBe("");
      expect(result.stdout).toMatch(
        new RegExp(
          `^packs/${packName}: pack ${packName} is valid \\(\\d+ criteri(on|a)\\)\\n$`,
        ),
      );
      expect(result.exitCode).toBe(0);
    });
  }

  it("reports every fixture problem with the criterion and field, and exits 1", async () => {
    writePackDirectory(
      "    fixtures:\n      positive:\n        - fixtures/missing.png\n",
      [],
    );
    const result = await runValidate("my-pack", workingDirectory);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe(
      [
        "crit: my-pack/pack.yaml: criterion faint-body-text, field fixtures.positive.0: fixtures/missing.png is not a file in the pack directory",
        "crit: my-pack/pack.yaml: criterion faint-body-text, field fixtures.negative: the criterion has no negative fixture; crit packs validate needs at least one",
        "",
      ].join("\n"),
    );
    expect(result.exitCode).toBe(1);
  });

  it("reports a schema problem with exit 1", async () => {
    writePackDirectory("    color: red\n", []);
    const result = await runValidate("my-pack", workingDirectory);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(
      "crit: my-pack/pack.yaml: criterion faint-body-text, field ",
    );
    expect(result.stderr).toContain("color");
    expect(result.exitCode).toBe(1);
  });

  it("accepts a pack whose fixtures exist", async () => {
    writePackDirectory(
      "    fixtures:\n      positive:\n        - fixtures/a.png\n      negative:\n        - fixtures/b.png\n",
      ["fixtures/a.png", "fixtures/b.png"],
    );
    const result = await runValidate("my-pack", workingDirectory);
    expect(result.stdout).toBe(
      "my-pack: pack minimal is valid (1 criterion)\n",
    );
    expect(result.exitCode).toBe(0);
  });

  it("does not follow a fixtures link to a folder outside the pack", async () => {
    const outside = join(workingDirectory, "outside");
    mkdirSync(outside);
    writeFileSync(join(outside, "a.png"), "");
    writeFileSync(join(outside, "b.png"), "");
    const directory = join(workingDirectory, "my-pack");
    mkdirSync(directory);
    symlinkSync(outside, join(directory, "fixtures"), "dir");
    const minimal = readFileSync(
      join(repositoryRoot, "schemas/examples/valid/minimal.yaml"),
      "utf8",
    );
    writeFileSync(
      join(directory, "pack.yaml"),
      `${minimal}    fixtures:\n      positive:\n        - fixtures/a.png\n      negative:\n        - fixtures/b.png\n`,
    );
    const result = await runValidate("my-pack", workingDirectory);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(
      "field fixtures.positive.0: fixtures/a.png is not a file in the pack directory",
    );
    expect(result.stderr).toContain(
      "field fixtures.negative.0: fixtures/b.png is not a file in the pack directory",
    );
    expect(result.exitCode).toBe(1);
  });

  it("stops with exit 2 for a missing directory", async () => {
    const result = await runValidate("no-such-pack", workingDirectory);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("crit: no-such-pack: no such pack directory\n");
    expect(result.exitCode).toBe(2);
  });

  it("stops with exit 2 for a directory with no pack.yaml", async () => {
    mkdirSync(join(workingDirectory, "empty"));
    const result = await runValidate("empty", workingDirectory);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("crit: empty/pack.yaml: cannot read file\n");
    expect(result.exitCode).toBe(2);
  });

  it("stops with exit 2 for a custom YAML tag, naming the path", async () => {
    mkdirSync(join(workingDirectory, "tagged"));
    copyFileSync(
      join(repositoryRoot, "schemas/examples/valid/minimal.yaml"),
      join(workingDirectory, "tagged/pack.yaml"),
    );
    const packFile = join(workingDirectory, "tagged/pack.yaml");
    const text = readFileSync(packFile, "utf8").replace(
      "title: Minimal pack",
      "title: !foo Minimal pack",
    );
    writeFileSync(packFile, text);
    const result = await runValidate("tagged", workingDirectory);
    expect(result.stdout).toBe("");
    expect(result.stderr).toMatch(
      /^crit: tagged\/pack\.yaml: cannot parse YAML\n {2}field yaml: /,
    );
    expect(result.exitCode).toBe(2);
  });
});
