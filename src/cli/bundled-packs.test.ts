// Disposable unit tests for the bundled packs (CS-22): which packs load for which names, the
// order, the error for a name that is not bundled, and what the built dist/crit.js holds
// (FR-11, FR-44, FR-51, FR-53, NFR-5).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CouldNotRunError } from "../shared/could-not-run-error.js";
import { listBundledPackSources, loadBundledPacks } from "./bundled-packs.js";

/** The repository root, so the tests can read packs/ and dist/crit.js. */
const repositoryRoot = join(import.meta.dirname, "..", "..");

/**
 * The folder names under packs/ that hold a pack (no leading `_`, and a pack.yaml inside), sorted
 * with a plain comparator (CS-18).
 */
function packFolderNames(): string[] {
  const names: string[] = [];
  for (const entry of readdirSync(join(repositoryRoot, "packs"), {
    withFileTypes: true,
  })) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) {
      continue;
    }
    if (existsSync(join(repositoryRoot, "packs", entry.name, "pack.yaml"))) {
      names.push(entry.name);
    }
  }
  return names.sort((left, right) => {
    if (left < right) {
      return -1;
    }
    if (left > right) {
      return 1;
    }
    return 0;
  });
}

/** Return the names of the packs, in order, so a test can compare lists. */
function namesOf(packs: readonly { name: string }[]): string[] {
  return packs.map((pack) => pack.name);
}

afterEach(() => {
  vi.doUnmock("./bundled-pack-texts.js");
  vi.resetModules();
});

describe("listBundledPackSources (FR-53)", () => {
  it("holds the pack.yaml text of every pack folder, sorted by name, with no _ folder", () => {
    const sources = listBundledPackSources();
    expect(namesOf(sources)).toEqual(packFolderNames());
    for (const source of sources) {
      expect(source.yamlText).toBe(
        readFileSync(
          join(repositoryRoot, "packs", source.name, "pack.yaml"),
          "utf8",
        ),
      );
    }
  });
});

describe("loadBundledPacks (FR-11, FR-51)", () => {
  it("returns the pack each name names, with the name and version from its pack.yaml", () => {
    for (const source of listBundledPackSources()) {
      const packs = loadBundledPacks([source.name]);
      expect(namesOf(packs)).toEqual([source.name]);
      const versionLine = source.yamlText.match(/^version: (.+)$/m);
      expect(packs[0]?.version).toBe(versionLine?.[1]);
    }
  });

  it("returns every bundled pack in name order when no names are given", () => {
    const allNames = namesOf(listBundledPackSources());
    expect(namesOf(loadBundledPacks())).toEqual(allNames);
    expect(namesOf(loadBundledPacks([]))).toEqual(allNames);
  });

  it("keeps the order of the names, the same on every call (NFR-5, CS-18)", () => {
    const first = loadBundledPacks(["typography", "layout"]);
    const second = loadBundledPacks(["typography", "layout"]);
    expect(namesOf(first)).toEqual(["typography", "layout"]);
    expect(second).toEqual(first);
    expect(namesOf(loadBundledPacks(["layout", "typography"]))).toEqual([
      "layout",
      "typography",
    ]);
  });

  it("throws CouldNotRunError that names the pack and lists the bundled names (FR-4)", () => {
    const allNames = namesOf(listBundledPackSources()).join(", ");
    expect(() => loadBundledPacks(["colour"])).toThrow(CouldNotRunError);
    expect(() => loadBundledPacks(["colour"])).toThrow(
      `pack colour is not a bundled pack; the bundled packs are: ${allNames}`,
    );
  });

  it("rejects a bundled pack with a field the schema does not define (FR-44, NFR-13)", async () => {
    const typographyText = readFileSync(
      join(repositoryRoot, "packs", "typography", "pack.yaml"),
      "utf8",
    );
    // vi.doMock swaps the module of embedded texts for this test only; the import after it
    // loads bundled-packs.ts again so that it sees the swapped module.
    vi.doMock("./bundled-pack-texts.js", () => ({
      BUNDLED_PACK_TEXTS: [
        { name: "typography", yamlText: `${typographyText}\ncolour: red\n` },
      ],
    }));
    const reloaded = await import("./bundled-packs.js");
    expect(() => reloaded.loadBundledPacks(["typography"])).toThrow(
      "bundled pack typography: invalid pack",
    );
  });
});

describe("the built dist/crit.js (FR-44, FR-53, NFR-2)", () => {
  const bundleText = readFileSync(
    join(repositoryRoot, "dist", "crit.js"),
    "utf8",
  );

  it("holds the text of every packs/*/pack.yaml, and only those texts", () => {
    // esbuild reprints the embedded strings as template literals, so the test finds the array
    // that the build plugin wrote and evaluates it to get the strings back.
    const declaration = "var BUNDLED_PACK_TEXTS = ";
    const start = bundleText.indexOf(declaration);
    expect(start).toBeGreaterThan(-1);
    const end = bundleText.indexOf("}];\n", start);
    const arrayText = bundleText.slice(start + declaration.length, end + 2);
    const embedded: unknown = new Function(`return ${arrayText};`)();
    const expected = packFolderNames().map((name) => ({
      name,
      yamlText: readFileSync(
        join(repositoryRoot, "packs", name, "pack.yaml"),
        "utf8",
      ),
    }));
    expect(embedded).toEqual(expected);
  });

  it("holds no fixture image, rendered.json, or ATTRIBUTION.md text", () => {
    // Every PNG file has an IHDR chunk name near its start, so a bundled image would show it.
    expect(bundleText).not.toContain("IHDR");
    for (const name of packFolderNames()) {
      const fixturesDirectory = join(repositoryRoot, "packs", name, "fixtures");
      const attributionPath = join(fixturesDirectory, "ATTRIBUTION.md");
      if (existsSync(attributionPath)) {
        expect(bundleText).not.toContain(
          readFileSync(attributionPath, "utf8").split("\n")[0],
        );
      }
      const renderedPath = join(fixturesDirectory, "rendered.json");
      if (existsSync(renderedPath)) {
        expect(bundleText).not.toContain('"png_sha256"');
      }
    }
  });
});
