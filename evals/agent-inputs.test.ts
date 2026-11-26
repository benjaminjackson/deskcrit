// The durable check of the inputs rule of the design-critic agents (FR-77, crit-lcu). It reads the
// agent files and docs/PRD.md and runs nothing. It checks that agents/critic.md holds the one
// statement of the rule in a "Your inputs" section, that each of the other five agent files points
// to that section with one exact paragraph in a fixed place, that no agent file restates the rule
// outside that section, and that the FR-77 row of the PRD records the decision.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/** The repository root, one folder above evals/. */
const REPOSITORY_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** The folder of the design-critic agent files, from the repository root. */
const AGENTS_FOLDER = "plugin/skills/design-critic/agents";

/** The one paragraph each other agent file uses to point to the rule. */
const POINTER =
  'Open every file with Read, by the exact path you were given, and use Bash only to run this skill\'s scripts by their full path: never run `ls`, `find`, `grep`, `cat`, or `cd`, never use Glob or Grep, and never open a file because it sits next to one you were given. "Your inputs" in `agents/critic.md` is the full rule; read it before you start.';

/** The agent files whose pointer comes right before their "## How you work" heading. */
const POINTER_BEFORE_HOW_YOU_WORK = [
  "go-further.md",
  "picker.md",
  "recheck.md",
  "set-critic.md",
  "work-order.md",
];

/** Every agent file in the folder, checked for a restatement of the rule. */
const ALL_AGENT_FILES = ["critic.md", ...POINTER_BEFORE_HOW_YOU_WORK];

/** Phrases specific to the rule, which only the "Your inputs" section of critic.md may hold. */
const RULE_PHRASES = [
  "search the disk",
  "harness relays",
  "sits next to",
  "project records",
  "tools are not inputs",
  "list, glob",
];

/** Reads a file under the repository root as text. */
function readRepositoryFile(relativePath: string): string {
  return readFileSync(join(REPOSITORY_ROOT, relativePath), "utf8");
}

/** Reads one agent file as text. */
function readAgentFile(name: string): string {
  return readRepositoryFile(`${AGENTS_FOLDER}/${name}`);
}

/** Returns the text of a "## " section, from its heading up to the next "## " heading, or "". */
function section(text: string, heading: string): string {
  const start = text.indexOf(`\n## ${heading}\n`);
  if (start === -1) {
    return "";
  }
  const next = text.indexOf("\n## ", start + 1);
  return next === -1 ? text.slice(start) : text.slice(start, next);
}

/** Counts how many times `phrase` occurs in `text`. */
function countOccurrences(text: string, phrase: string): number {
  return text.split(phrase).length - 1;
}

/** Returns the one PRD table row whose first cell is the given id. */
function prdRow(id: string): string {
  const prd = readRepositoryFile("docs/PRD.md");
  return prd.split("\n").find((line) => line.startsWith(`| ${id} |`)) ?? "";
}

describe("the inputs rule of the design-critic agents", () => {
  const critic = readAgentFile("critic.md");
  const inputsSection = section(critic, "Your inputs");

  it("critic.md states the rule in a Your inputs section before How you work", () => {
    expect(inputsSection).not.toBe("");
    expect(critic.indexOf("\n## Your inputs\n")).toBeLessThan(
      critic.indexOf("\n## How you work\n"),
    );
    for (const phrase of [
      "one statement of what an agent of this skill may read",
      "`Real thing:` lines",
      "by the exact path you were given",
      "sits next to",
      "Never list, glob, or grep a folder",
      "never run `ls`, `find`, `grep`, `cat`, or `cd`",
      "never search the disk or the repository",
      "project records",
      "harness relays into your context",
      "Your tools are not inputs",
      "`scripts/entries.mjs`",
      "never search `references/`",
    ]) {
      expect(inputsSection).toContain(phrase);
    }
  });

  it("each other agent file points to the section once, right before How you work", () => {
    // A pointer to a section that critic.md no longer has points nowhere.
    expect(inputsSection).not.toBe("");
    for (const name of POINTER_BEFORE_HOW_YOU_WORK) {
      const text = readAgentFile(name);
      expect(countOccurrences(text, POINTER), name).toBe(1);
      expect(text, name).toContain(`\n${POINTER}\n\n## How you work\n`);
    }
  });

  it("no agent file restates the rule outside the section", () => {
    for (const name of ALL_AGENT_FILES) {
      // The pointer is a fixed summary that the pointer tests pin, so the guard skips that exact string.
      let text = readAgentFile(name).replace(POINTER, "");
      if (name === "critic.md") {
        text = text.replace(inputsSection, "");
      }
      const lowered = text.toLowerCase();
      for (const phrase of RULE_PHRASES) {
        expect(lowered.includes(phrase), `${name}: ${phrase}`).toBe(false);
      }
    }
  });

  it("the FR-77 row records the decision, and no other PRD line restates it", () => {
    const row = prdRow("FR-77");
    for (const phrase of [
      "Decision 2026-11-25 (crit-lcu)",
      "relays into its context",
      "sits next to a given one",
      "Its tools are not inputs",
    ]) {
      expect(row).toContain(phrase);
    }
    expect(row).not.toContain("The critic uses only what its prompt gives it");
    const prd = readRepositoryFile("docs/PRD.md");
    for (const phrase of [
      "relays into its context",
      "sits next to a given one",
      "Its tools are not inputs",
    ]) {
      expect(countOccurrences(prd, phrase), phrase).toBe(1);
    }
  });
  it("each place that starts the set work-order agent gives it the tiles file", () => {
    // The set work-order agent reads tile paths from tiles.json, so its prompt must name that file.
    const loop = readRepositoryFile("plugin/skills/crit-loop/SKILL.md");
    const deck = section(loop, "A deck or a flow");
    const setWorkOrderStart = deck.indexOf("**The set work order.**");
    expect(setWorkOrderStart).toBeGreaterThan(-1);
    const setWorkOrder = deck.slice(
      setWorkOrderStart,
      deck.indexOf("\n", setWorkOrderStart),
    );
    expect(setWorkOrder).toContain(
      "`Tiles file: <absolute path of <round folder>/set/tiles.json>`",
    );
    const setCrit = section(readAgentFile("work-order.md"), "A set crit");
    expect(setCrit).toContain(
      "the tiles file (`tiles.json`) on the `Tiles file:` line of your prompt",
    );
    expect(setCrit).not.toContain("in the image's folder");
  });
});
