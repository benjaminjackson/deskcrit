// The durable check of the deck path of the crit-loop skill (FR-82, FR-83, crit-3wg). It reads the
// skill files and docs/PRD.md and runs nothing. It checks that the crit-loop skill has a section for
// a deck or a flow that runs contact-sheet mode with the consistency check every round, starts the
// agents of a round in one message, and turns the set critic's breaks into a set work order; that
// the design-critic skill runs the consistency check for slides of one deck with no mode named and
// keeps the refusal line for every other set; that the work-order agent knows how to read a set
// crit; that a screen a cut left too thin is caught by the recheck critic and the set critic and stays
// out of every fenced prompt block (crit-1kh); and that the PRD rows record the change.

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
      "deck pattern wins",
      "last set work order:",
      "`<round folder>/set-<n>`",
      "`--viewport widescreen`",
      "does not count against the stop rules",
      "marks no break of the last set work order closed",
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
    expect(setCrit).toContain("(slide-3)");
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

describe("the set critic and a last set work order", () => {
  it("marks each break of the last set work order closed or open", () => {
    const agent = readRepositoryFile(
      "plugin/skills/design-critic/agents/set-critic.md",
    );
    expect(agent).toContain("`Last set work order:`");
    expect(agent).toContain("**Break status**");
  });
});

describe("the FR-82 row after fix round 1", () => {
  it("names the deck pattern ruling and the flow as the orchestrator's detail", () => {
    const row = prdRow("FR-82");
    expect(row).toContain("Deck pattern wins");
    expect(row).toContain(
      "a flow of screens of one product runs the same way; this is the orchestrator's detail",
    );
  });
});

/** Returns the text inside each ``` fence of a file: the odd segments of a split on the fence marker. */
function fencedBlocks(text: string): string[] {
  const segments = text.split("```");
  const blocks: string[] = [];
  for (let index = 1; index < segments.length; index += 2) {
    blocks.push(segments[index] ?? "");
  }
  return blocks;
}

/** Counts how many times a phrase occurs in a text. */
function countOccurrences(text: string, phrase: string): number {
  return text.split(phrase).length - 1;
}

describe("a screen a cut left too thin (crit-1kh)", () => {
  const recheckPath = "plugin/skills/design-critic/agents/recheck.md";
  const setCriticPath = "plugin/skills/design-critic/agents/set-critic.md";
  const skillPath = "plugin/skills/crit-loop/SKILL.md";
  const recheck = readRepositoryFile(recheckPath);
  const setCritic = readRepositoryFile(setCriticPath);
  const skill = readRepositoryFile(skillPath);

  it("states the rule once, in step 5 of the recheck critic", () => {
    const start = recheck.indexOf("5. **Look for new problems.**");
    const end = recheck.indexOf("6. **Rank what is left.**");
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const stepFive = recheck.slice(start, end);
    for (const phrase of [
      "one element on a mostly empty frame",
      "no longer makes the point it made in the before image",
      "never respacing, enlarging, or moving what is left",
      "a title slide, a section divider, or an end slide",
      "`Fact needed from the maker:`",
      "This is the one statement of the thin-screen rule",
    ]) {
      expect(stepFive).toContain(phrase);
    }
  });

  it("has no second copy of the rule in another agent file or the crit-loop skill", () => {
    const files = [
      recheckPath,
      setCriticPath,
      "plugin/skills/design-critic/agents/critic.md",
      "plugin/skills/design-critic/agents/work-order.md",
      skillPath,
    ];
    const counts = files.map((path) =>
      countOccurrences(
        readRepositoryFile(path),
        "one element on a mostly empty frame",
      ),
    );
    expect(counts).toEqual([1, 0, 0, 0, 0]);
  });

  it("lists the screens sparse by design once, in the recheck critic", () => {
    const files = [
      recheckPath,
      setCriticPath,
      "plugin/skills/design-critic/agents/critic.md",
      "plugin/skills/design-critic/agents/work-order.md",
      skillPath,
    ];
    const counts = files.map((path) =>
      countOccurrences(
        readRepositoryFile(path),
        "a title slide, a section divider, or an end slide",
      ),
    );
    expect(counts).toEqual([1, 0, 0, 0, 0]);
  });

  it("lets a thin-screen break request a fact, and lets the deck stop when only that is left (fix 1)", () => {
    expect(setCritic).toContain(
      "end the break with the `Fact needed from the maker:` sentence of `agents/critic.md`; that is the only fact you request",
    );
    const factsSection = section(skill, "When a finding requests a fact");
    expect(factsSection).toContain(
      "the set critic requests no facts, with one exception: a thin-screen break",
    );
    expect(factsSection).toContain(
      "goes through this section like any requested fact",
    );
    const deck = section(skill, "A deck or a flow");
    expect(
      countOccurrences(
        deck,
        'or names only thin-screen breaks that "When a finding requests a fact" sets aside',
      ),
    ).toBe(2);
    const oneQuestionLines = skill
      .split("\n")
      .filter((line) => line.includes("one question"));
    expect(oneQuestionLines).toHaveLength(2);
  });

  it("closes a thin-screen break by content comparable to the others (fix 2)", () => {
    const start = setCritic.indexOf(
      "If your prompt has a `Last set work order:` line",
    );
    expect(start).toBeGreaterThan(-1);
    const breakStatus = setCritic.slice(start, setCritic.indexOf("\n", start));
    expect(breakStatus).toContain(
      "A thin-screen break is closed when that screen now makes its point with content comparable to the others; there is no number.",
    );
  });

  it("puts the set critic's fact request into the round's question in all three places", () => {
    const deck = section(skill, "A deck or a flow");
    const roundOneStart = deck.indexOf("**Round 1.**");
    expect(roundOneStart).toBeGreaterThan(-1);
    const roundOne = deck.slice(
      roundOneStart,
      deck.indexOf("\n", roundOneStart),
    );
    expect(roundOne).toContain(
      "its question includes a fact that the set critic's `crit.md` requests",
    );
    const stepSixStart = deck.indexOf("6. If you do not stop");
    expect(stepSixStart).toBeGreaterThan(-1);
    const stepSix = deck.slice(stepSixStart, deck.indexOf("\n", stepSixStart));
    expect(stepSix).toContain(
      "once the set critic is done, wait for every slide's recheck",
    );
    expect(stepSix).toContain("the set critic's `crit.md` included");
    const designCritic = readRepositoryFile(
      "plugin/skills/design-critic/SKILL.md",
    );
    const stepFiveStart = designCritic.indexOf("5. Write the work order");
    expect(stepFiveStart).toBeGreaterThan(-1);
    const stepFive = designCritic.slice(
      stepFiveStart,
      designCritic.indexOf("\n", stepFiveStart),
    );
    expect(stepFive).toContain(
      "and the set critic's crit when the run has one",
    );
    for (const block of fencedBlocks(designCritic)) {
      expect(block).not.toContain("set critic's crit");
    }
  });

  it("allows a card that carries a fact only in the fix of a thin screen (fix 3)", () => {
    const fixSection = section(skill, "Fix the design, not the score");
    expect(fixSection).toContain(
      "Only in the fix of a screen that a cut left too thin, an element that carries one, such as a card, is not a new section",
    );
    expect(fixSection).toContain(
      "a quote from the brief is still a testimonial and is never added as a card",
    );
  });

  it("gives the set critic one exception for a screen with far less content", () => {
    expect(countOccurrences(setCritic, "far less content")).toBe(1);
    expect(setCritic).toContain("there is no fixed number");
    expect(setCritic).toContain("`agents/recheck.md` step 5");
    expect(setCritic).toContain(
      "leave out every problem that a single screen shows by itself",
    );
  });

  it("tells the fix loop that each screen must still make its point", () => {
    const fixSection = section(skill, "Fix the design, not the score");
    expect(fixSection).toContain("each screen must still make its point");
    expect(fixSection).toContain("`<design-critic folder>/agents/recheck.md`");
    expect(fixSection).toContain(
      "Do not hide or remove content to close a finding.",
    );
    expect(fixSection).toContain("is not a new section");
    expect(skill).toContain(
      "or, only in the fix of a screen that a cut left too thin, one that carries a fact or a real example that section allows",
    );
  });

  it("keeps the rule out of every fenced prompt block", () => {
    for (const text of [recheck, setCritic, skill]) {
      for (const block of fencedBlocks(text)) {
        for (const phrase of [
          "too thin",
          "far less content",
          "mostly empty frame",
        ]) {
          expect(block).not.toContain(phrase);
        }
      }
    }
  });

  it("records the rule in the FR-82 and FR-83 rows", () => {
    const fr82 = prdRow("FR-82");
    expect(fr82).toContain("Decision 2026-11-25 (crit-1kh)");
    expect(fr82).toContain("one element on a mostly empty frame");
    expect(fr82).toContain("crit-1kh, 2026-11-25");
    const fr83 = prdRow("FR-83");
    expect(fr83).toContain("(crit-1kh)");
    expect(fr83).toContain("far less content");
    expect(fr83).toContain("This is the one fact the set critic requests.");
    expect(fr82).toContain(
      "or names only thin-screen breaks set aside as FR-83 says, or when two rounds in a row close nothing",
    );
    expect(fr82).toContain(
      "keyed on `Breaks: none`, with the one exception of a thin-screen break set aside as FR-83 says",
    );
    expect(fr83).toContain("content comparable to the other screens");
    expect(fr82).toContain(
      "except the one fact request of a thin-screen break (FR-83, crit-1kh)",
    );
    expect(fr82).toContain(
      "A quote from the brief is still a testimonial and is never added as a card.",
    );
  });
});
