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

/** The text of packs/typography/pack.yaml, for the tests that swap in other texts. */
function typographyText(): string {
  return readFileSync(
    join(repositoryRoot, "packs", "typography", "pack.yaml"),
    "utf8",
  );
}

/**
 * Load bundled-packs.ts again with these texts in place of the embedded ones. vi.doMock swaps
 * the module for the import that follows it, and afterEach puts the real module back. The
 * reloaded module has its own copy of CouldNotRunError, so these tests check the message only.
 */
async function loadWithTexts(
  texts: { name: string; yamlText: string }[],
): Promise<typeof import("./bundled-packs.js")> {
  vi.doMock("./bundled-pack-texts.js", () => ({ BUNDLED_PACK_TEXTS: texts }));
  return import("./bundled-packs.js");
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
    expect(() => loadBundledPacks(["color"])).toThrow(CouldNotRunError);
    expect(() => loadBundledPacks(["color"])).toThrow(
      `pack color is not a bundled pack; the bundled packs are: ${allNames}`,
    );
  });

  it("throws when one name is given twice (FR-4)", () => {
    expect(() => loadBundledPacks(["layout", "typography", "layout"])).toThrow(
      "pack layout is named twice in .crit.yaml",
    );
  });

  it("rejects a bundled pack with a field the schema does not define (FR-44, NFR-13)", async () => {
    const reloaded = await loadWithTexts([
      { name: "typography", yamlText: `${typographyText()}\ncolor: red\n` },
    ]);
    expect(() => reloaded.loadBundledPacks(["typography"])).toThrow(
      "bundled pack typography: invalid pack",
    );
  });

  it("rejects a bundled pack whose name is not its folder name (FR-51)", async () => {
    const reloaded = await loadWithTexts([
      { name: "type", yamlText: typographyText() },
    ]);
    expect(() => reloaded.loadBundledPacks(["type"])).toThrow(
      "bundled pack folder type holds a pack named typography",
    );
    expect(() => reloaded.loadBundledPacks()).toThrow(
      "bundled pack folder type holds a pack named typography; the folder name and the pack name must match",
    );
  });

  it("throws when every pack is wanted and none is bundled (FR-74)", async () => {
    const reloaded = await loadWithTexts([]);
    expect(() => reloaded.loadBundledPacks()).toThrow(
      "no packs: no bundled pack was found and no --pack was given",
    );
    expect(() => reloaded.loadBundledPacks([])).toThrow(
      "no packs: no bundled pack was found and no --pack was given",
    );
  });
});

describe("the built dist/crit.js (FR-44, FR-53, NFR-2)", () => {
  const bundleText = readFileSync(
    join(repositoryRoot, "dist", "crit.js"),
    "utf8",
  );

  // This exact comparison is the real guarantee that the bundle holds the pack.yaml texts and
  // nothing else from packs/ (FR-44, FR-53).
  it("holds the text of every packs/*/pack.yaml, and only those texts", () => {
    // esbuild reprints the embedded strings as template literals, so the test cannot search for
    // the file text. The build plugin writes a marker comment before and after the list, and the
    // test evaluates only the code between them to get the strings back.
    const startMarker = "/*! crit-bundled-packs-start */";
    const endMarker = "/*! crit-bundled-packs-end */";
    const start = bundleText.indexOf(startMarker);
    const end = bundleText.indexOf(endMarker);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const listCode = bundleText.slice(start + startMarker.length, end);
    const embedded: unknown = new Function(
      `${listCode}\nreturn BUNDLED_PACK_TEXTS;`,
    )();
    const expected = packFolderNames().map((name) => ({
      name,
      yamlText: readFileSync(
        join(repositoryRoot, "packs", name, "pack.yaml"),
        "utf8",
      ),
    }));
    expect(embedded).toEqual(expected);
  });

  it("holds no PNG chunk name, no ATTRIBUTION.md first line, and no rendered.json png_sha256 key", () => {
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
