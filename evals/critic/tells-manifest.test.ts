// Checks packs/_tells/tells.json, the list of tells that the template tells evaluation reads
// (EV-23, FR-86), against GUIDELINES.md. Its titles and questions must equal the entries of the
// "Template tells" section, in order, without "Template tells left out", and each template must
// have its HTML file, its .defect.json, and both fixture PNGs. It reads files only.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseTellsManifest } from "./tells.ts";

const REPOSITORY_DIRECTORY = join(import.meta.dirname, "..", "..");
const TELLS_DIRECTORY = join(REPOSITORY_DIRECTORY, "packs", "_tells");
const MANIFEST_PATH = join(TELLS_DIRECTORY, "tells.json");
const SECTION_PREFIX = "## Template tells";
const LEFT_OUT_TITLE = "Template tells left out";

/** One entry of the Template tells section: its "###" title and the text of its question. */
type GuidelineTell = { readonly title: string; readonly question: string };

/**
 * Reads the entries of the Template tells section of GUIDELINES.md, in order, and stops at the
 * "Template tells left out" heading or the next "##" heading. Each entry's question is the quoted
 * text after `Question:` on its "Judged by" line.
 */
function readGuidelineTells(): GuidelineTell[] {
  const lines = readFileSync(
    join(REPOSITORY_DIRECTORY, "GUIDELINES.md"),
    "utf8",
  ).split("\n");
  const tells: GuidelineTell[] = [];
  let inSection = false;
  let title: string | undefined;
  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (inSection) {
        break;
      }
      inSection = line.startsWith(SECTION_PREFIX);
      continue;
    }
    if (!inSection) {
      continue;
    }
    if (line.startsWith("### ")) {
      title = line.slice(4).trim();
      if (title === LEFT_OUT_TITLE) {
        break;
      }
      continue;
    }
    const match = /^- \*\*Judged by:\*\*.*Question: "([^"]+)"/.exec(line);
    if (match?.[1] !== undefined && title !== undefined) {
      tells.push({ title, question: match[1] });
      title = undefined;
    }
  }
  return tells;
}

describe("the Template tells section of GUIDELINES.md", () => {
  it("has 38 entries, each with a question", () => {
    expect(readGuidelineTells()).toHaveLength(38);
  });
});

// The fixture lane of crit-7hw.2 adds packs/_tells/tells.json; until then these tests skip so
// `npm run ci` passes. The integrator removes the skip when the fixtures land.
describe.skipIf(!existsSync(MANIFEST_PATH))("packs/_tells/tells.json", () => {
  /** Returns the tells of the manifest. */
  function readManifest() {
    return parseTellsManifest(readFileSync(MANIFEST_PATH, "utf8"));
  }

  it("has the titles and questions of the GUIDELINES.md entries, in order", () => {
    const fromManifest = readManifest().map((tell) => ({
      title: tell.title,
      question: tell.question,
    }));
    expect(fromManifest).toEqual(readGuidelineTells());
  });

  it("has a template, a .defect.json, and both PNGs for each tell", () => {
    const missing: string[] = [];
    for (const tell of readManifest()) {
      const files = [
        join("templates", `${tell.template}.html`),
        join("templates", `${tell.template}.defect.json`),
        join("fixtures", `${tell.template}.positive.png`),
        join("fixtures", `${tell.template}.negative.png`),
      ];
      for (const file of files) {
        if (!existsSync(join(TELLS_DIRECTORY, file))) {
          missing.push(file);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
