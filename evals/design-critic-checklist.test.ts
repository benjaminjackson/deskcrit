// The durable check that the design critic's checklist is a partition of the guideline catalog
// (crit-0a0.9, FR-77). It reads plugin/skills/design-critic/checklist.yaml, the hand-written
// source of references/checklist.md, and the entry titles of GUIDELINES.md, and checks that
// every entry the critic sees is under exactly one question, that every question is in exactly
// one section, and that a question with no entries is marked as a gap. scripts/build.rb makes
// the same check, but it needs Ruby; this test needs only Node, so it runs wherever npm run ci
// runs. It reads files only and imports nothing from src/.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import { parse } from "yaml";

/** The repository root, one folder above evals/. */
const REPOSITORY_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** The checklist source in the design-critic skill. */
const CHECKLIST_SOURCE = join(
  REPOSITORY_ROOT,
  "plugin",
  "skills",
  "design-critic",
  "checklist.yaml",
);

/** One GUIDELINES.md entry: its "##" section heading and its "###" title. */
type CatalogEntry = { section: string; title: string };

/** How the source names an entry: its title, or its section start and title when titles repeat. */
type EntryReference = string | { section: string; title: string };

type Question = {
  id: string;
  question: string;
  entries?: EntryReference[];
  gap?: boolean;
};

type Section = { id: string; title: string; questions: Question[] };

type ChecklistSource = {
  excluded: Record<string, string>;
  sections: Section[];
};

/**
 * Reads the entries of GUIDELINES.md that have a Rule line, because build.rb shows only those
 * to the critic. An entry starts at a "###" heading and belongs to the "##" heading above it.
 */
function readCatalogEntries(): CatalogEntry[] {
  const lines = readFileSync(
    join(REPOSITORY_ROOT, "GUIDELINES.md"),
    "utf8",
  ).split("\n");
  const entries: CatalogEntry[] = [];
  let section = "";
  let current: CatalogEntry | undefined;
  for (const line of lines) {
    if (line.startsWith("## ")) {
      section = line.slice(3);
      current = undefined;
    } else if (line.startsWith("### ")) {
      current = { section, title: line.slice(4).trim() };
    } else if (line.startsWith("- **Rule:**") && current !== undefined) {
      entries.push(current);
      current = undefined;
    }
  }
  return entries;
}

/** Returns the catalog entries that one reference in the source names: one when it resolves. */
function resolveReference(
  reference: EntryReference,
  catalog: CatalogEntry[],
): CatalogEntry[] {
  if (typeof reference === "string") {
    return catalog.filter((entry) => entry.title === reference);
  }
  return catalog.filter(
    (entry) =>
      entry.title === reference.title &&
      entry.section.startsWith(reference.section),
  );
}

const source = parse(readFileSync(CHECKLIST_SOURCE, "utf8")) as ChecklistSource;
const catalog = readCatalogEntries();

it("every catalog entry the critic sees is under exactly one question", () => {
  // Counts how many questions name each entry, keyed by "section / title".
  const placements = new Map<string, number>();
  const unresolved: string[] = [];
  for (const section of source.sections) {
    for (const question of section.questions) {
      for (const reference of question.entries ?? []) {
        const matches = resolveReference(reference, catalog);
        if (matches.length !== 1) {
          unresolved.push(`${question.id}: ${JSON.stringify(reference)}`);
          continue;
        }
        const match = matches[0] as CatalogEntry;
        const key = `${match.section} / ${match.title}`;
        placements.set(key, (placements.get(key) ?? 0) + 1);
      }
    }
  }
  expect(unresolved, "references that name no entry, or several").toEqual([]);

  const placedTwice = [...placements.entries()]
    .filter(([, count]) => count > 1)
    .map(([key]) => key);
  expect(placedTwice, "entries under more than one question").toEqual([]);

  const excludedTitles = new Set(Object.keys(source.excluded));
  const unplaced = catalog
    .filter((entry) => !excludedTitles.has(entry.title))
    .map((entry) => `${entry.section} / ${entry.title}`)
    .filter((key) => !placements.has(key));
  expect(unplaced, "entries under no question").toEqual([]);
});

it("every excluded title is a catalog entry and is under no question", () => {
  const placedTitles = new Set<string>();
  for (const section of source.sections) {
    for (const question of section.questions) {
      for (const reference of question.entries ?? []) {
        placedTitles.add(
          typeof reference === "string" ? reference : reference.title,
        );
      }
    }
  }
  const catalogTitles = new Set(catalog.map((entry) => entry.title));
  for (const title of Object.keys(source.excluded)) {
    expect(
      catalogTitles.has(title),
      `excluded "${title}" is in GUIDELINES.md`,
    ).toBe(true);
    expect(
      placedTitles.has(title),
      `excluded "${title}" is under a question`,
    ).toBe(false);
  }
});

it("every question is in exactly one section and has a unique id", () => {
  const sectionIds = source.sections.map((section) => section.id);
  expect(new Set(sectionIds).size).toBe(sectionIds.length);
  // The source is a list of sections that each hold their own questions, so a question can sit
  // in two sections only as two copies; a repeated id or question text would show that.
  const questionIds = source.sections.flatMap((section) =>
    section.questions.map((question) => question.id),
  );
  const questionTexts = source.sections.flatMap((section) =>
    section.questions.map((question) => question.question),
  );
  expect(questionIds.length).toBeGreaterThan(0);
  expect(new Set(questionIds).size).toBe(questionIds.length);
  expect(new Set(questionTexts).size).toBe(questionTexts.length);
});

it("a question with no entries is marked as a gap, and a gap names no entry", () => {
  for (const section of source.sections) {
    for (const question of section.questions) {
      const entryCount = question.entries?.length ?? 0;
      if (question.gap === true) {
        expect(entryCount, `gap ${question.id} names entries`).toBe(0);
      } else {
        expect(
          entryCount,
          `${question.id} has no entries and no gap mark`,
        ).toBeGreaterThan(0);
      }
      expect(
        question.question.endsWith("?"),
        `${question.id} is a question`,
      ).toBe(true);
    }
  }
});
