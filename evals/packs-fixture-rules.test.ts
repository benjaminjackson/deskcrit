// The durable check of the FR-54 fixture rules (crit-q25.4, EV-3): every folder under packs/
// that holds a fixtures/ folder must pass evals/packs-fixture-rules.ts with no problem. The
// unit cases build small packs in temporary folders, one failing case per rule, and the
// committed broken pack in evals/packs-fixture-rules/broken-pack/ fixes the whole problem list.

import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, test } from "vitest";
import {
  checkPackFixtures,
  listFixtureFolders,
  listPackDirectories,
  MAX_FIXTURE_FILE_BYTES,
  parseAttributionFile,
  readRightsBasis,
} from "./packs-fixture-rules.js";

/** This evals/ folder. */
const EVALS_FOLDER = dirname(fileURLToPath(import.meta.url));

/** The real packs/ folder of the repository. */
const PACKS_FOLDER = join(dirname(EVALS_FOLDER), "packs");

/** A tiny committed PNG that the temporary packs copy as their fixture images. */
const TINY_PNG_PATH = join(
  EVALS_FOLDER,
  "packs-test",
  "packs",
  "all-agree",
  "fixtures",
  "red.png",
);

/** The temporary folders that the unit cases made, removed after each case. */
const temporaryFolders: string[] = [];

afterEach(() => {
  for (const folder of temporaryFolders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

/** The values of one ATTRIBUTION.md entry, keyed by label, for writeEntry. */
type EntryValues = {
  rightsBasis: string;
  source: string;
  license: string;
  attributionText: string;
  sourceUrl: string;
  captureDate: string;
  viewport: string;
  deviceScaleFactor: string;
  browserVersion: string;
};

/** Returns the values of a rendered own-work entry for a fixture of the pack "sample", as the renderer prints them. */
function renderedEntryValues(): EntryValues {
  return {
    rightsBasis: "own work licensed under the pack license",
    source: "packs/sample/templates/sample.html, defect=on",
    license: "MIT",
    attributionText: "none",
    sourceUrl: "not applicable",
    captureDate: "not applicable",
    viewport: "1280x800",
    deviceScaleFactor: "1",
    browserVersion: "153.0.8010.12",
  };
}

/** Returns the values of a live capture entry under an open license, complete and valid. */
function capturedEntryValues(): EntryValues {
  return {
    rightsBasis: "open license that permits redistribution and commercial use",
    source: "a page captured from a public site",
    license: "CC BY 4.0",
    attributionText: "Example Author, CC BY 4.0",
    sourceUrl: "https://example.com/page",
    captureDate: "2026-10-01",
    viewport: "1280x800",
    deviceScaleFactor: "2",
    browserVersion: "153.0.8010.12",
  };
}

/** Writes one ATTRIBUTION.md entry in the packs/README.md format, labels in order. */
function writeEntry(file: string, values: EntryValues): string {
  return [
    `## ${file}`,
    "",
    `- Rights basis: ${values.rightsBasis}`,
    `- Source: ${values.source}`,
    `- License: ${values.license}`,
    `- Attribution text: ${values.attributionText}`,
    `- Source URL: ${values.sourceUrl}`,
    `- Capture date: ${values.captureDate}`,
    `- Viewport: ${values.viewport}`,
    `- Device scale factor: ${values.deviceScaleFactor}`,
    `- Browser version: ${values.browserVersion}`,
    "",
  ].join("\n");
}

/** What a temporary pack holds: pack.yaml text or none, the ATTRIBUTION.md text, and its image names. */
type SamplePack = {
  packYaml?: string;
  attribution?: string;
  images: string[];
};

/** Writes a pack named "sample" in a new temporary packs folder and returns that folder. */
function writeSamplePack(samplePack: SamplePack): string {
  const packsRoot = mkdtempSync(join(tmpdir(), "packs-fixture-rules-"));
  temporaryFolders.push(packsRoot);
  const fixturesPath = join(packsRoot, "sample", "fixtures");
  mkdirSync(fixturesPath, { recursive: true });
  // Every sample pack has the template that renderedEntryValues names, so its entries count as rendered.
  mkdirSync(join(packsRoot, "sample", "templates"));
  writeFileSync(
    join(packsRoot, "sample", "templates", "sample.html"),
    "<!doctype html>\n",
  );
  if (samplePack.packYaml !== undefined) {
    writeFileSync(join(packsRoot, "sample", "pack.yaml"), samplePack.packYaml);
  }
  if (samplePack.attribution !== undefined) {
    writeFileSync(join(fixturesPath, "ATTRIBUTION.md"), samplePack.attribution);
  }
  for (const image of samplePack.images) {
    copyFileSync(TINY_PNG_PATH, join(fixturesPath, image));
  }
  return packsRoot;
}

/** Checks a sample pack with one image whose entry has the given values, and returns the messages. */
function checkOneEntry(values: EntryValues): string[] {
  const packsRoot = writeSamplePack({
    packYaml: "name: sample\nlicense: MIT\n",
    attribution: `Pack license: MIT\n\n${writeEntry("a.png", values)}`,
    images: ["a.png"],
  });
  return checkPackFixtures(packsRoot, "sample").map(
    (problem) => problem.message,
  );
}

describe("the real packs folder", () => {
  test("lists at least one fixture folder, so a broken path fails instead of passing", () => {
    expect(listFixtureFolders(PACKS_FOLDER).length).toBeGreaterThan(0);
  });

  test("lists the packs that hold a pack.yaml, sorted, without the _ folders", () => {
    const packNames = listPackDirectories(PACKS_FOLDER);
    expect(packNames).toEqual(
      expect.arrayContaining(["basics", "layout", "typography"]),
    );
    expect(packNames).not.toContain("_example");
    expect([...packNames].sort()).toEqual(packNames);
  });

  test("every pack also has a fixtures/ folder, so a pack that loses it fails", () => {
    const fixtureFolders = listFixtureFolders(PACKS_FOLDER);
    for (const packName of listPackDirectories(PACKS_FOLDER)) {
      expect(fixtureFolders).toContain(packName);
    }
  });

  for (const folderName of listFixtureFolders(PACKS_FOLDER)) {
    test(`${folderName}: every fixture follows the FR-54 rules`, () => {
      expect(checkPackFixtures(PACKS_FOLDER, folderName)).toEqual([]);
    });
  }
});

describe("the committed broken pack", () => {
  test("reports every broken rule, sorted", () => {
    const messages = checkPackFixtures(
      join(EVALS_FOLDER, "packs-fixture-rules"),
      "broken-pack",
    ).map((problem) => problem.message);
    expect(messages).toEqual([
      "broken-pack/fixtures/captured.png: has no browser version (FR-54)",
      'broken-pack/fixtures/fair-use.png: has fair use in its Rights basis "fair use", which FR-54 refuses (FR-54)',
      'broken-pack/fixtures/non-commercial.png: has the NC (non-commercial) term in its License "CC BY-NC 4.0", which FR-54 refuses (FR-54)',
      "broken-pack/fixtures/orphan.png: has an entry in ATTRIBUTION.md but is not an image in fixtures/ (FR-54)",
      "broken-pack/fixtures/unlisted.png: has no entry in ATTRIBUTION.md (FR-54)",
      "broken-pack/pack.yaml: has no license field (FR-54)",
    ]);
  });
});

describe("parseAttributionFile", () => {
  test("reads the pack license and each entry", () => {
    const parsed = parseAttributionFile(
      `Pack license: MIT\n\n${writeEntry("a.png", renderedEntryValues())}`,
    );
    expect(parsed.packLicense).toBe("MIT");
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0]?.file).toBe("a.png");
    expect(parsed.entries[0]?.fields.Viewport).toBe("1280x800");
    expect(parsed.entries[0]?.problems).toEqual([]);
  });

  test("reports a missing label as a problem and does not throw", () => {
    const text = writeEntry("a.png", renderedEntryValues()).replace(
      "- Viewport: 1280x800\n",
      "",
    );
    const parsed = parseAttributionFile(`Pack license: MIT\n\n${text}`);
    expect(parsed.entries[0]?.problems).toEqual(['has no "Viewport" line']);
  });

  test("reports labels out of order", () => {
    const text = writeEntry("a.png", renderedEntryValues()).replace(
      "- Source URL: not applicable\n- Capture date: not applicable\n",
      "- Capture date: not applicable\n- Source URL: not applicable\n",
    );
    const parsed = parseAttributionFile(`Pack license: MIT\n\n${text}`);
    expect(parsed.entries[0]?.problems).toHaveLength(1);
    expect(parsed.entries[0]?.problems[0]).toContain("out of order");
  });

  test("maps the four exact rights basis strings and nothing else", () => {
    expect(readRightsBasis("own work licensed under the pack license")).toBe(
      "own-work",
    );
    expect(readRightsBasis("public domain with the source named")).toBe(
      "public-domain",
    );
    expect(
      readRightsBasis(
        "open license that permits redistribution and commercial use",
      ),
    ).toBe("open-license");
    expect(
      readRightsBasis(
        "written permission from the owner attached to the pull request",
      ),
    ).toBe("written-permission");
    expect(readRightsBasis("own work")).toBeUndefined();
  });
});

describe("checkPackFixtures", () => {
  test("passes a pack with a rendered entry and a complete live capture", () => {
    const packsRoot = writeSamplePack({
      packYaml: "name: sample\nlicense: MIT\n",
      attribution: `Pack license: MIT\n\n${writeEntry("a.png", renderedEntryValues())}\n${writeEntry("b.png", capturedEntryValues())}`,
      images: ["a.png", "b.png"],
    });
    expect(checkPackFixtures(packsRoot, "sample")).toEqual([]);
  });

  test("refuses a fixture file over 2 MB, rendered.json included", () => {
    const packsRoot = writeSamplePack({
      packYaml: "name: sample\nlicense: MIT\n",
      attribution: "Pack license: MIT\n",
      images: [],
    });
    // The oversized file is made here, one byte over the limit, and never committed.
    writeFileSync(
      join(packsRoot, "sample", "fixtures", "rendered.json"),
      Buffer.alloc(MAX_FIXTURE_FILE_BYTES + 1),
    );
    const problems = checkPackFixtures(packsRoot, "sample");
    expect(problems).toHaveLength(1);
    expect(problems[0]?.pack).toBe("sample");
    expect(problems[0]?.file).toBe("rendered.json");
    expect(problems[0]?.message).toBe(
      "sample/fixtures/rendered.json: is 2097153 bytes, over the limit of 2097152 bytes (2 MB) (FR-54)",
    );
  });

  test("refuses an image with two entries", () => {
    const entry = writeEntry("a.png", renderedEntryValues());
    const packsRoot = writeSamplePack({
      packYaml: "name: sample\nlicense: MIT\n",
      attribution: `Pack license: MIT\n\n${entry}\n${entry}`,
      images: ["a.png"],
    });
    const problems = checkPackFixtures(packsRoot, "sample");
    expect(problems.map((problem) => problem.message)).toEqual([
      "sample/fixtures/a.png: has 2 entries in ATTRIBUTION.md, and needs exactly one (FR-54)",
    ]);
    expect(problems[0]?.file).toBe("a.png");
  });

  test("refuses an image with no entry and an entry with no image", () => {
    const packsRoot = writeSamplePack({
      packYaml: "name: sample\nlicense: MIT\n",
      attribution: `Pack license: MIT\n\n${writeEntry("gone.png", renderedEntryValues())}`,
      images: ["a.png"],
    });
    expect(
      checkPackFixtures(packsRoot, "sample").map((problem) => problem.message),
    ).toEqual([
      "sample/fixtures/a.png: has no entry in ATTRIBUTION.md (FR-54)",
      "sample/fixtures/gone.png: has an entry in ATTRIBUTION.md but is not an image in fixtures/ (FR-54)",
    ]);
  });

  test("refuses fair use and fair dealing by name, in any case", () => {
    expect(
      checkOneEntry({ ...capturedEntryValues(), rightsBasis: "fair use" }),
    ).toEqual([
      'sample/fixtures/a.png: has fair use in its Rights basis "fair use", which FR-54 refuses (FR-54)',
    ]);
    expect(
      checkOneEntry({ ...capturedEntryValues(), rightsBasis: "Fair Dealing" }),
    ).toEqual([
      'sample/fixtures/a.png: has fair dealing in its Rights basis "Fair Dealing", which FR-54 refuses (FR-54)',
    ]);
  });

  test("refuses a refused term in the License whatever the basis", () => {
    expect(
      checkOneEntry({ ...capturedEntryValues(), license: "fair use" }),
    ).toEqual([
      'sample/fixtures/a.png: has fair use in its License "fair use", which FR-54 refuses (FR-54)',
    ]);
    expect(
      checkOneEntry({
        ...capturedEntryValues(),
        rightsBasis: "public domain with the source named",
        license: "All Rights Reserved",
      }),
    ).toEqual([
      'sample/fixtures/a.png: has all rights reserved in its License "All Rights Reserved", which FR-54 refuses (FR-54)',
    ]);
  });

  test("refuses the NC and ND terms by name, in any case, whatever the basis", () => {
    expect(
      checkOneEntry({ ...capturedEntryValues(), license: "CC BY-NC-SA 4.0" }),
    ).toEqual([
      'sample/fixtures/a.png: has the NC (non-commercial) term in its License "CC BY-NC-SA 4.0", which FR-54 refuses (FR-54)',
    ]);
    expect(
      checkOneEntry({ ...capturedEntryValues(), license: "cc by-nc 4.0" }),
    ).toEqual([
      'sample/fixtures/a.png: has the NC (non-commercial) term in its License "cc by-nc 4.0", which FR-54 refuses (FR-54)',
    ]);
    expect(
      checkOneEntry({
        ...capturedEntryValues(),
        rightsBasis: "public domain with the source named",
        license: "CC BY-ND 4.0",
      }),
    ).toEqual([
      'sample/fixtures/a.png: has the ND (no derivatives) term in its License "CC BY-ND 4.0", which FR-54 refuses (FR-54)',
    ]);
    expect(
      checkOneEntry({
        ...capturedEntryValues(),
        rightsBasis: "Creative Commons NonCommercial",
      }),
    ).toEqual([
      'sample/fixtures/a.png: has the NC (non-commercial) term in its Rights basis "Creative Commons NonCommercial", which FR-54 refuses (FR-54)',
    ]);
    expect(
      checkOneEntry({
        ...capturedEntryValues(),
        license: "Attribution-NoDerivatives 4.0",
      }),
    ).toEqual([
      'sample/fixtures/a.png: has the ND (no derivatives) term in its License "Attribution-NoDerivatives 4.0", which FR-54 refuses (FR-54)',
    ]);
  });

  test("refuses any other rights basis and lists the four", () => {
    const messages = checkOneEntry({
      ...capturedEntryValues(),
      rightsBasis: "found online",
    });
    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain(
      'sample/fixtures/a.png: has the rights basis "found online"',
    );
    expect(messages[0]).toContain('"own work licensed under the pack license"');
    expect(messages[0]).toContain(
      '"written permission from the owner attached to the pull request"',
    );
  });

  test("refuses an open license outside the list, and accepts the listed ones with a version", () => {
    expect(
      checkOneEntry({ ...capturedEntryValues(), license: "GPL 3.0" }),
    ).toEqual([
      'sample/fixtures/a.png: has the open license "GPL 3.0", which is not CC0, CC BY, CC BY-SA, Open Government Licence, MIT, or Apache (FR-54)',
    ]);
    for (const license of [
      "CC0",
      "CC BY-SA 4.0",
      "Open Government Licence v3.0",
      "MIT",
      "Apache 2.0",
    ]) {
      expect(checkOneEntry({ ...capturedEntryValues(), license })).toEqual([]);
    }
  });

  test("refuses an open license with no attribution text", () => {
    expect(
      checkOneEntry({ ...capturedEntryValues(), attributionText: "none" }),
    ).toEqual([
      "sample/fixtures/a.png: has an open license but no attribution text (FR-54)",
    ]);
  });

  test("refuses public domain without a named source", () => {
    expect(
      checkOneEntry({
        ...capturedEntryValues(),
        rightsBasis: "public domain with the source named",
        source: "none",
        license: "Public domain",
      }),
    ).toEqual([
      "sample/fixtures/a.png: is public domain but its Source does not name the source (FR-54)",
    ]);
  });

  test("refuses public domain whose License does not name public domain, and accepts one that does", () => {
    const publicDomain = {
      ...capturedEntryValues(),
      rightsBasis: "public domain with the source named",
      source: "a scan from a public archive",
    };
    expect(checkOneEntry({ ...publicDomain, license: "MIT" })).toEqual([
      'sample/fixtures/a.png: is public domain but its License "MIT" does not name public domain, such as "Public domain" or CC0 (FR-54)',
    ]);
    for (const license of [
      "Public domain",
      "CC0 1.0",
      "Public Domain Mark 1.0",
    ]) {
      expect(checkOneEntry({ ...publicDomain, license })).toEqual([]);
    }
  });

  test("refuses written permission without a pull request URL, and accepts one with it", () => {
    const writtenPermission = {
      ...capturedEntryValues(),
      rightsBasis:
        "written permission from the owner attached to the pull request",
      license: "used with the written permission of the owner",
    };
    expect(
      checkOneEntry({ ...writtenPermission, source: "email from the owner" }),
    ).toEqual([
      'sample/fixtures/a.png: has written permission but its Source "email from the owner" is not a pull request URL such as https://github.com/<owner>/<repo>/pull/<n> (FR-54)',
    ]);
    expect(
      checkOneEntry({
        ...writtenPermission,
        source: "https://github.com/benjaminjackson/crit/pull/12",
      }),
    ).toEqual([]);
  });

  test("refuses own work whose license differs from the pack license", () => {
    expect(
      checkOneEntry({ ...renderedEntryValues(), license: "Apache 2.0" }),
    ).toEqual([
      'sample/fixtures/a.png: is own work with the license "Apache 2.0", which differs from the pack license "MIT" (FR-54)',
    ]);
  });

  test("treats an entry whose named template does not exist as a live capture", () => {
    expect(
      checkOneEntry({
        ...renderedEntryValues(),
        source: "packs/sample/templates/missing.html, defect=on",
      }),
    ).toEqual([
      'sample/fixtures/a.png: is a live capture but its Capture date "not applicable" is not in the form YYYY-MM-DD (FR-54)',
      'sample/fixtures/a.png: is a live capture but its Source URL "not applicable" is not an http or https URL (FR-54)',
    ]);
  });

  test("refuses a live capture without a source URL or capture date", () => {
    expect(
      checkOneEntry({
        ...capturedEntryValues(),
        sourceUrl: "not applicable",
        captureDate: "October 2026",
      }),
    ).toEqual([
      'sample/fixtures/a.png: is a live capture but its Capture date "October 2026" is not in the form YYYY-MM-DD (FR-54)',
      'sample/fixtures/a.png: is a live capture but its Source URL "not applicable" is not an http or https URL (FR-54)',
    ]);
  });

  test("refuses a rendered entry without its viewport, scale factor, or browser version", () => {
    expect(
      checkOneEntry({
        ...renderedEntryValues(),
        viewport: "wide",
        deviceScaleFactor: "retina",
        browserVersion: "",
      }),
    ).toEqual([
      "sample/fixtures/a.png: has no browser version (FR-54)",
      'sample/fixtures/a.png: has the Device scale factor "retina", which is not a number (FR-54)',
      'sample/fixtures/a.png: has the Viewport "wide", which is not in the form <width>x<height> (FR-54)',
    ]);
  });

  test("refuses an ATTRIBUTION.md without a Pack license line", () => {
    const packsRoot = writeSamplePack({
      attribution: writeEntry("a.png", { ...renderedEntryValues() }),
      images: ["a.png"],
    });
    expect(
      checkPackFixtures(packsRoot, "sample").map((problem) => problem.message),
    ).toEqual([
      'sample/fixtures/ATTRIBUTION.md: has no "Pack license:" line (FR-54)',
    ]);
  });

  test("refuses a missing ATTRIBUTION.md", () => {
    const packsRoot = writeSamplePack({ images: [] });
    expect(
      checkPackFixtures(packsRoot, "sample").map((problem) => problem.message),
    ).toEqual(["sample/fixtures/ATTRIBUTION.md: is missing (FR-54)"]);
  });

  test("refuses a pack.yaml license that differs from the Pack license line", () => {
    const packsRoot = writeSamplePack({
      packYaml: "name: sample\nlicense: Apache-2.0\n",
      attribution: `Pack license: MIT\n\n${writeEntry("a.png", renderedEntryValues())}`,
      images: ["a.png"],
    });
    const problems = checkPackFixtures(packsRoot, "sample");
    expect(problems.map((problem) => problem.message)).toEqual([
      'sample/pack.yaml: has the license "Apache-2.0", which differs from the "Pack license: MIT" line of fixtures/ATTRIBUTION.md (FR-54)',
    ]);
    expect(problems[0]?.file).toBe("pack.yaml");
  });
});
