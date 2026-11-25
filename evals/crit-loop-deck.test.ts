// The durable check of the deck path of the crit-loop skill (FR-82, FR-83, crit-3wg). It reads the
// skill files and docs/PRD.md and runs nothing. It checks that the crit-loop skill has a section for
// a deck or a flow that runs contact-sheet mode with the consistency check every round, starts the
// agents of a round in one message, and turns the set critic's breaks into a set work order; that
// the design-critic skill runs the consistency check for slides of one deck with no mode named and
// keeps the refusal line for every other set; that the work-order agent knows how to read a set
// crit; and that the PRD rows record the change.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/** The repository root, one folder above evals/. */
const REPOSITORY_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** Reads a file under the repository root as text. */
function readRepositoryFile(relativePath: string): string {
  return readFileSync(join(REPOSITORY_ROOT, relativePath), "utf8");
}

/** Returns the text of a "## " section, from its heading up to the next "## " heading. */
function section(text: string, heading: string): string {
  const start = text.indexOf(`\n## ${heading}\n`);
  if (start === -1) {
    return "";
  }
  const next = text.indexOf("\n## ", start + 1);
  return next === -1 ? text.slice(start) : text.slice(start, next);
}

/** Returns the one PRD table row whose first cell is the given id. */
function prdRow(id: string): string {
  const prd = readRepositoryFile("docs/PRD.md");
  return prd.split("\n").find((line) => line.startsWith(`| ${id} |`)) ?? "";
}

describe("the crit-loop skill's deck path", () => {
  const skill = readRepositoryFile("plugin/skills/crit-loop/SKILL.md");
  const deck = section(skill, "A deck or a flow");

  it("has a section for a deck or a flow", () => {
    expect(deck).not.toBe("");
  });

  it("names what the deck path needs", () => {
    for (const words of [
      "contact-sheet mode",
      "consistency check",
      "one image per slide",
      "one message",
      "<design-critic folder>/agents/work-order.md",
      "set work order",
      "`Breaks: none`",
      "twelve",
      "`--widescreen`",
      "`<deck file>#<k>`",
      "hash anchor",
      "as soon as the set critic has finished",
    ]) {
      // Lowercase both, so a phrase at the start of a sentence still matches.
      expect(deck.toLowerCase()).toContain(words.toLowerCase());
    }
  });

  it("names a deck in the description", () => {
    const description = /^description: (.*)$/m.exec(skill)?.[1] ?? "";
    expect(description).toContain("deck");
  });

  it("still has exactly one fenced prompt block", () => {
    const fenceLines = skill
      .split("\n")
      .filter((line) => line.trim().startsWith("```"));
    expect(fenceLines).toHaveLength(2);
  });
});

describe("the design-critic skill's mode for slides of one deck", () => {
  const skill = readRepositoryFile("plugin/skills/design-critic/SKILL.md");
  const pickTheMode = section(skill, "Pick the mode");

  it("runs the consistency check with no question", () => {
    expect(pickTheMode).toContain("Slides of one deck or screens of one flow");
    expect(pickTheMode).toContain("ask no question");
  });

  it("keeps the refusal line for any other set, after the deck rule", () => {
    const refusal =
      '`Two or more images need a mode: "consistency check" or "best pick".`';
    expect(pickTheMode).toContain(refusal);
    expect(pickTheMode).toContain("could be versions of one design");
    const deckRule = pickTheMode.indexOf("Slides of one deck");
    const otherSets = pickTheMode.indexOf("For any other set");
    expect(otherSets).toBeGreaterThan(deckRule);
  });
});

describe("the work-order agent and a set crit", () => {
  const agent = readRepositoryFile(
    "plugin/skills/design-critic/agents/work-order.md",
  );
  const setCrit = section(agent, "A set crit");

  it("reads the Breaks heading and the tiles file", () => {
    expect(setCrit).toContain("`**Breaks**`");
    expect(setCrit).toContain("`tiles.json`");
  });
});

describe("the PRD rows of the deck path", () => {
  it("records the deck path in FR-82", () => {
    const row = prdRow("FR-82");
    expect(row).toContain("crit-3wg");
    expect(row).toContain("`Breaks: none`");
    expect(row).toContain("all decks use hash as the slide anchor");
  });

  it("records the deck default in FR-83", () => {
    const row = prdRow("FR-83");
    expect(row).toContain("slides of one deck");
    expect(row).toContain("2026-11-25");
    expect(row).toContain("screens of one flow");
  });
});
