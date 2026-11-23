// The durable check that the design-critic skill's references are current (crit-6hd.1, FR-77).
// plugin/skills/design-critic/scripts/build.rb makes references/ from GUIDELINES.md and the packs.
// This test runs that script into a temporary folder and checks that the committed references/
// holds the same file names with the same text. So a hand edit to a reference file fails, and so
// does a change to GUIDELINES.md or a pack without a new build. It reads files and runs Ruby only,
// and imports nothing from src/.

import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

/** The repository root, one folder above evals/. */
const REPOSITORY_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** The design-critic skill folder inside the plugin. */
const SKILL_FOLDER = join(REPOSITORY_ROOT, "plugin", "skills", "design-critic");

/** The committed references that the test compares with a fresh build. */
const COMMITTED_REFERENCES = join(SKILL_FOLDER, "references");

/** The generator script. It needs Ruby 3.0 or later. */
const BUILD_SCRIPT = join(SKILL_FOLDER, "scripts", "build.rb");

/**
 * Reads the Ruby version and fails with a clear message when Ruby is missing or older than 3.0,
 * because the generator uses syntax that older Ruby releases cannot parse.
 */
function requireRuby3(): void {
  let versionText: string;
  try {
    versionText = execFileSync("ruby", ["-e", "print RUBY_VERSION"], {
      encoding: "utf8",
    });
  } catch {
    throw new Error(
      "Ruby 3.0 or later must be on PATH to build the design-critic references",
    );
  }
  const majorVersion = Number.parseInt(versionText.split(".")[0] ?? "", 10);
  // Written as "not at least 3" so that a version text that is not a number (NaN) also fails.
  if (!(majorVersion >= 3)) {
    throw new Error(
      `Ruby 3.0 or later is needed to build the design-critic references; found ${versionText}`,
    );
  }
}

/** Reads every file in a folder into a map from file name to text, with the names sorted. */
function readFolderTexts(folder: string): Map<string, string> {
  const texts = new Map<string, string>();
  const fileNames = readdirSync(folder).sort();
  for (const fileName of fileNames) {
    texts.set(fileName, readFileSync(join(folder, fileName), "utf8"));
  }
  return texts;
}

it("the committed design-critic references equal a fresh build", () => {
  requireRuby3();
  // mkdtempSync adds six random characters to the prefix and creates the folder.
  const buildFolder = mkdtempSync(join(tmpdir(), "design-critic-references-"));
  try {
    execFileSync("ruby", [BUILD_SCRIPT, buildFolder], { encoding: "utf8" });
    const builtTexts = readFolderTexts(buildFolder);
    const committedTexts = readFolderTexts(COMMITTED_REFERENCES);
    // [...map.keys()] copies the map's keys into an array, in insertion order (sorted here).
    expect([...committedTexts.keys()]).toEqual([...builtTexts.keys()]);
    for (const [fileName, builtText] of builtTexts) {
      expect(
        committedTexts.get(fileName),
        `references/${fileName} differs from a fresh build`,
      ).toBe(builtText);
    }
  } finally {
    rmSync(buildFolder, { recursive: true, force: true });
  }
});
