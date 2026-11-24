import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  findEntries,
  parseEntries,
  readReferenceFiles,
} from "../plugin/skills/design-critic/scripts/entries.mjs";

const repositoryRoot = join(import.meta.dirname, "..");
const entriesScript = join(
  repositoryRoot,
  "plugin/skills/design-critic/scripts/entries.mjs",
);

/** Two made-up reference files: one title is in both, the way "Non-text contrast" is. */
const files = new Map([
  [
    "color.md",
    "# Color\n\nGenerated.\n\n### Shared title\n\n- **Rule:** color rule.\n\n### Only color\n\n- **Rule:** only in color.\n",
  ],
  [
    "ux.md",
    "# UX\n\n### Shared title\n\n- **Rule:** ux rule.\n\n### Jakob's law\n\n- **Rule:** known patterns.\n\n",
  ],
]);

/** Runs the script as a child process with the arguments and returns its exit code and output lines. */
function runScript(commandArguments: string[]): {
  status: number | null;
  lines: string[];
} {
  const result = spawnSync("node", [entriesScript, ...commandArguments], {
    encoding: "utf8",
  });
  return { status: result.status, lines: result.stdout.trimEnd().split("\n") };
}

describe("parseEntries", () => {
  it("splits a file at each ### heading and drops the trailing blank lines", () => {
    const entries = parseEntries(files.get("ux.md") ?? "");
    expect(entries).toEqual([
      {
        title: "Shared title",
        text: "### Shared title\n\n- **Rule:** ux rule.",
      },
      {
        title: "Jakob's law",
        text: "### Jakob's law\n\n- **Rule:** known patterns.",
      },
    ]);
  });
});

describe("findEntries", () => {
  it("prints several entries from several files in one call, each after a line naming its file", () => {
    const result = findEntries(["Only color", "Jakob's law"], files);
    expect(result.exitCode).toBe(0);
    expect(result.lines).toEqual([
      "=== references/color.md",
      "### Only color\n\n- **Rule:** only in color.",
      "",
      "=== references/ux.md",
      "### Jakob's law\n\n- **Rule:** known patterns.",
    ]);
  });

  it("prints every file's entry for a title two files hold, and only one when a file comes first", () => {
    const both = findEntries(["Shared title"], files);
    expect(both.lines.filter((line) => line.startsWith("==="))).toEqual([
      "=== references/color.md",
      "=== references/ux.md",
    ]);
    const one = findEntries(["references/ux.md", "Shared title"], files);
    expect(one.exitCode).toBe(0);
    expect(one.lines).toEqual([
      "=== references/ux.md",
      "### Shared title\n\n- **Rule:** ux rule.",
    ]);
  });

  it("ignores case and extra spaces in a title", () => {
    const result = findEntries(["  jakob's   LAW "], files);
    expect(result.exitCode).toBe(0);
    expect(result.lines[0]).toBe("=== references/ux.md");
  });

  it("prints the entries it found and one not-found line per missing title or file, and exits 2", () => {
    const result = findEntries(
      ["Only color", "No such entry", "layout.md", "Shared title"],
      files,
    );
    expect(result.exitCode).toBe(2);
    expect(result.lines).toEqual([
      "=== references/color.md",
      "### Only color\n\n- **Rule:** only in color.",
      'not found: no ### entry titled "No such entry" in references/*.md; copy the title exactly as the checklist line quotes it.',
      "not found: no reference file layout.md in references/; use a file a checklist line names.",
      'not found: no ### entry titled "Shared title" in references/layout.md; copy the title exactly as the checklist line quotes it.',
    ]);
  });

  it("prints the usage line and exits 2 with no title or an empty one", () => {
    for (const commandArguments of [[], ["references/ux.md"], [" "]]) {
      const result = findEntries(commandArguments, files);
      expect(result.exitCode).toBe(2);
      expect(result.lines).toHaveLength(1);
      expect(result.lines[0]).toMatch(/^usage: node entries\.mjs/);
    }
  });
});

describe("the script on the committed references", () => {
  it("reads every reference file except the checklist", () => {
    const names = [...readReferenceFiles().keys()];
    expect(names).toContain("ux.md");
    expect(names).not.toContain("checklist.md");
  });

  it("opens every entry title that references/checklist.md quotes", () => {
    const checklistText = readFileSync(
      join(
        repositoryRoot,
        "plugin/skills/design-critic/references/checklist.md",
      ),
      "utf8",
    );
    const titles = [
      ...checklistText.matchAll(/`references\/[a-z-]+\.md` "([^"]+)"/g),
    ].map((match) => match[1] ?? "");
    expect(titles.length).toBeGreaterThan(100);
    const result = findEntries(titles, readReferenceFiles());
    expect(result.lines.filter((line) => line.startsWith("not found"))).toEqual(
      [],
    );
    expect(result.exitCode).toBe(0);
  });

  it("runs as a script: prints the entries of one checklist line, or a not-found line and exit code 2", () => {
    const found = runScript(["Non-text contrast", "Jakob's law"]);
    expect(found.status).toBe(0);
    expect(found.lines.filter((line) => line.startsWith("==="))).toEqual([
      "=== references/accessibility.md",
      "=== references/color.md",
      "=== references/ux.md",
    ]);
    expect(found.lines).toContain("### Jakob's law");
    const missing = runScript(["No such entry"]);
    expect(missing.status).toBe(2);
    expect(missing.lines).toEqual([
      'not found: no ### entry titled "No such entry" in references/*.md; copy the title exactly as the checklist line quotes it.',
    ]);
  });
});
