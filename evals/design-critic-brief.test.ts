// The durable check of the design brief (FR-87, crit-aec). It reads the skill files as text and
// checks that the brief reaches every agent that judges the design: the skill description names
// the eight fields and the "not" halves, step 1 of the design-critic SKILL.md holds the labels, the
// five sorting rules in order, and the Brief block example, every agent prompt block is followed by
// a rule that says where the Brief block goes, critic.md names every label, and each other agent
// file says to read the brief. The prompt blocks themselves stay as they are, because other tests
// pin them to the prompt text that every saved run is hashed against. It reads files only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/** The repository root, one folder above evals/. */
const REPOSITORY_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** The design-critic skill folder. */
const DESIGN_CRITIC_FOLDER = join(
  REPOSITORY_ROOT,
  "plugin",
  "skills",
  "design-critic",
);

/** The eight field labels of FR-87, in the order of the Brief block. */
const FIELD_LABELS = [
  "Job",
  "Audience",
  "Setting",
  "Message",
  "Brand and tone",
  "Fixed",
  "Stage",
  "Ask",
];

/** The fields that have a "not" line (FR-87). */
const FIELDS_WITH_NOT = FIELD_LABELS.slice(0, 5);

/** Reads a file of the repository as text. */
function readRepositoryFile(...segments: string[]): string {
  return readFileSync(join(REPOSITORY_ROOT, ...segments), "utf8");
}

/** Reads a file of the design-critic skill folder as text. */
function readSkillFile(...segments: string[]): string {
  return readFileSync(join(DESIGN_CRITIC_FOLDER, ...segments), "utf8");
}

/**
 * Returns, for each fenced block whose first line starts with "Time matters here" (an agent
 * prompt), the text after the block up to the next fence line or the end of the file.
 */
function textAfterEachPromptBlock(text: string): string[] {
  const lines = text.split("\n");
  const isFence = (line: string) => line.trimStart().startsWith("```");
  const results: string[] = [];
  let index = 0;
  while (index < lines.length) {
    if (!isFence(lines[index] ?? "")) {
      index += 1;
      continue;
    }
    // Find the closing fence of this block.
    let closing = index + 1;
    while (closing < lines.length && !isFence(lines[closing] ?? "")) {
      closing += 1;
    }
    const firstLine = (lines[index + 1] ?? "").trim();
    if (firstLine.startsWith("Time matters here")) {
      let next = closing + 1;
      while (next < lines.length && !isFence(lines[next] ?? "")) {
        next += 1;
      }
      results.push(lines.slice(closing + 1, next).join("\n"));
    }
    index = closing + 1;
  }
  return results;
}

describe("the design-critic skill description", () => {
  const skill = readSkillFile("SKILL.md");
  const description = /^description: (.*)$/m.exec(skill)?.[1] ?? "";

  it("is 1,024 characters or less, the limit of the Agent Skills format", () => {
    // Array.from counts characters, not UTF-16 code units, so "ü" counts as one.
    expect(Array.from(description).length).toBeLessThanOrEqual(1024);
  });

  it("names all eight brief fields and the not halves", () => {
    for (const words of [
      "job",
      "audience",
      "setting",
      "message",
      "brand and tone",
      "fixed",
      "how finished",
      "feedback wanted",
      "what it is not",
    ]) {
      expect(description).toContain(words);
    }
  });
});

describe("step 1 of the design-critic SKILL.md", () => {
  const skill = readSkillFile("SKILL.md");
  const stepOne = skill.slice(
    skill.indexOf("1. Collect the inputs"),
    skill.indexOf("\n2. Spawn one agent"),
  );

  it("defines each of the eight labels and each not line", () => {
    for (const label of FIELD_LABELS) {
      expect(stepOne).toContain(`**${label}**:`);
    }
    for (const label of FIELDS_WITH_NOT) {
      expect(stepOne).toContain(`**${label}, not**:`);
    }
  });

  it("holds the five sorting rules in order", () => {
    const rules = [
      "1. An item about the crit and not the piece",
      "2. An item about how finished the piece is goes in Stage.",
      "3. An item whose exact form is required, or that is a hard limit, goes in Fixed.",
      "4. Any other item goes in the field whose subject it names",
      '5. A negative item goes in the "not" line of the field that rule 4 picks, unless rule 1 or rule 3 picks a field first.',
    ];
    let position = -1;
    for (const rule of rules) {
      const found = stepOne.indexOf(rule, position + 1);
      expect(found, rule).toBeGreaterThan(position);
      position = found;
    }
  });

  it("holds the Brief block example", () => {
    expect(stepOne).toContain(
      "   ```\n   Brief:\n   <Label>: <text>\n   <Label>, not: <text>\n   ```\n",
    );
  });
});

describe("the agent prompt blocks", () => {
  const whatIKnow = "`What I know about the piece:`";
  const imagesLine = "`Image(s)`";
  const afterImage = "`After image`";
  // Each file with the line that the rule after each of its prompt blocks must name, in block
  // order. The counts pin how many prompt blocks each file has, so a new block without a rule fails.
  const files: { segments: string[]; targets: string[] }[] = [
    {
      // The critic, go-further, work-order, and contact-sheet prompts.
      segments: ["plugin", "skills", "design-critic", "SKILL.md"],
      targets: [whatIKnow, imagesLine, imagesLine, whatIKnow],
    },
    {
      // The recheck prompt.
      segments: ["plugin", "skills", "crit-loop", "SKILL.md"],
      targets: [afterImage],
    },
    {
      // The section critic and director prompts.
      segments: ["plugin", "skills", "design-critic", "agents", "deep-mode.md"],
      targets: [whatIKnow, whatIKnow],
    },
  ];
  for (const { segments, targets } of files) {
    it(`are each followed by a Brief block rule that names its line in ${segments.join("/")}`, () => {
      const after = textAfterEachPromptBlock(readRepositoryFile(...segments));
      expect(after).toHaveLength(targets.length);
      after.forEach((text, index) => {
        expect(text).toContain("Brief block");
        expect(text).toContain(targets[index]);
        expect(text).toContain("use the prompt exactly as shown");
      });
    });
  }

  it("has crit-loop write brief.md in round 1", () => {
    const loop = readRepositoryFile(
      "plugin",
      "skills",
      "crit-loop",
      "SKILL.md",
    );
    expect(loop).toContain("`<loop folder>/brief.md`");
  });

  it("has crit-loop write a settled finding into brief.md and the recheck mark it settled", () => {
    const loop = readRepositoryFile(
      "plugin",
      "skills",
      "crit-loop",
      "SKILL.md",
    );
    // The rule is prose after the fenced recheck prompt, so read only that text (FR-82, crit-deh).
    const afterRecheckPrompt = textAfterEachPromptBlock(loop).join("\n");
    expect(afterRecheckPrompt).toContain(
      "always goes on the Fixed line, because keeping an element as it is fixes its exact form",
    );
    expect(afterRecheckPrompt).toContain(
      "When you already changed its element in this round, undo that change before the capture",
    );
    expect(afterRecheckPrompt).toContain(
      "When the loop has no `brief.md`, create it with the `Brief:` line and the line the decision needs",
    );
    expect(afterRecheckPrompt).toContain(
      "The recheck marks the finding settled",
    );
    // The recheck critic must know the settled status and list it among the statuses.
    const recheck = readSkillFile("agents", "recheck.md");
    expect(recheck).toContain("**settled** when the Fixed line of the brief");
    expect(recheck).toContain(
      "closed | closed, new problem | settled | open | worse",
    );
  });
});

describe("the agent files", () => {
  it("critic.md names every label and every not line", () => {
    const critic = readSkillFile("agents", "critic.md");
    expect(critic).toContain("`Brief:`");
    for (const label of FIELD_LABELS) {
      expect(critic).toContain(`**${label}**`);
    }
    for (const label of FIELDS_WITH_NOT) {
      expect(critic).toContain(`**${label}, not:**`);
    }
  });

  for (const name of [
    "go-further.md",
    "work-order.md",
    "recheck.md",
    "set-critic.md",
    "picker.md",
    "section-critic.md",
    "director.md",
  ]) {
    it(`${name} reads the brief and never proposes a change to Fixed or toward a not line`, () => {
      const text = readSkillFile("agents", name);
      expect(text).toContain("`Brief:` block");
      expect(text).toContain("`Fixed:`");
      expect(text).toContain("`<Label>, not:`");
    });
  }

  it("picker.md judges the job against Job and Audience", () => {
    expect(readSkillFile("agents", "picker.md")).toContain(
      "against `Job:` and `Audience:`",
    );
  });
});
