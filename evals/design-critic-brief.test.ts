// The durable check of the design brief (FR-87, crit-aec). It reads the skill files as text and
// checks that the brief reaches every agent that judges the design: the skill description names
// the eight fields and the "not" halves, step 1 of the design-critic SKILL.md holds the labels, the
// five sorting rules in order, and the Brief block example, every agent prompt block is followed by
// a rule that says where the Brief block goes, critic.md names every label, and each other agent
// file says to read the brief. The prompt blocks themselves stay as they are, because other tests
// pin them to the prompt text that every saved run is hashed against. It reads files only.
// It also checks the real thing a mock shows (FR-77, FR-82, crit-321): the skill passes its path on a
// `Real thing:` line per path after each prompt block, the critic and the recheck critic open it and never
// stop the run when they cannot, and nobody searches for one.

import { readdirSync, readFileSync } from "node:fs";
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
      "A Fixed entry that causes a defect is not settled",
    );
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

  // The three claim questions and the trust sentence (FR-77 as changed by crit-38w and crit-9hj).
  // The critic reads as the brief's Audience and asks what the piece asks that reader to accept
  // that they do not already hold, what it shows that the reader would accept on sight, and what
  // the reader will object to. It leaves plain facts out and ranks a piece whose proof does not
  // carry the ask under the same Ask and Stage rules as any finding. The recheck critic copies
  // the trust sentence from the crit that crit_file names after it reads the work order.
  it("critic.md step 3 asks the three claim questions after the Ask bullet, as the Audience reads them", () => {
    const critic = readSkillFile("agents", "critic.md");
    const stepStart = critic.indexOf("3. **Establish the job.**");
    const stepEnd = critic.indexOf("4. **Run the checklist");
    expect(stepStart).toBeGreaterThan(-1);
    expect(stepEnd).toBeGreaterThan(stepStart);
    const step = critic.slice(stepStart, stepEnd);
    const askAt = step.indexOf("**Ask**");
    const briefDescribesAt = step.indexOf("The brief describes the piece");
    expect(askAt).toBeGreaterThan(-1);
    expect(briefDescribesAt).toBeGreaterThan(askAt);
    const claimSort = step.slice(askAt, briefDescribesAt);
    for (const phrase of [
      "**Audience**",
      "**What does the piece ask this reader to accept that they do not already hold?**",
      "assume they hold none of it",
      "**What does it show that this reader would accept on sight?**",
      "a fact this reader doubts is one more thing to accept",
      "A shown fact must also lead to what the piece asks",
      "**What will this reader object to, and does the piece answer it?**",
      "Plain facts",
      "ranked finding",
      "inline in its own prose, not as a list",
      "only when all three of these hold: the job needs this reader's belief",
      "leaves unanswered an objection this reader will surely raise",
      "the link from a shown fact to the ask",
      "Objections stay inside this one finding: it names the kind of answer that is missing and never writes the answer",
      "Ask and Stage apply to this finding",
      "one trust sentence per version",
      "no claim is at stake",
      "already holds what the piece asks",
    ]) {
      expect(claimSort).toContain(phrase);
    }
    expect(claimSort).not.toContain("**checkable on the piece**");
  });

  // The crits report in terms of the piece and never label parts of an argument (crit-9hj), so
  // no agent file uses the vocabulary of Toulmin's model. \b marks a word boundary, so
  // "background" does not match "backing".
  it("no agent file uses the words of Toulmin's model", () => {
    const toulminWords = /\b(toulmin|warrants?|rebuttals?|grounds|backing)\b/i;
    const agentFiles = readdirSync(join(DESIGN_CRITIC_FOLDER, "agents")).filter(
      (name) => name.endsWith(".md"),
    );
    expect(agentFiles).toContain("critic.md");
    expect(agentFiles).toContain("recheck.md");
    for (const file of agentFiles) {
      expect(readSkillFile("agents", file)).not.toMatch(toulminWords);
    }
  });

  it("critic.md's What it's for line has the trust sentence", () => {
    const critic = readSkillFile("agents", "critic.md");
    const line = critic
      .split("\n")
      .find((text) => text.startsWith("**What it's for.**"));
    expect(line).toContain("must see to believe the piece or act on it");
  });

  it("recheck.md asks the three claim questions in step 3 and copies the trust sentence from crit_file", () => {
    const recheck = readSkillFile("agents", "recheck.md");
    const stepStart = recheck.indexOf("3. **Read the last work order.**");
    const stepEnd = recheck.indexOf("4. **Check each finding");
    expect(stepStart).toBeGreaterThan(-1);
    expect(stepEnd).toBeGreaterThan(stepStart);
    const step = recheck.slice(stepStart, stepEnd);
    for (const phrase of [
      "`crit_file`",
      "answer the three questions of `agents/critic.md` step 3 for the after image",
      "not part of what you return",
      "the same condition as `agents/critic.md` step 3",
      "rank a claim problem only when a change to the after image makes it meet that condition",
      "new problem",
    ]) {
      expect(step).toContain(phrase);
    }
    expect(recheck.indexOf("three questions")).toBeGreaterThan(stepStart);
    const line = recheck
      .split("\n")
      .find((text) => text.startsWith("**What it's for.**"));
    expect(line).toContain(
      "the trust sentence copied from the crit that `crit_file` names",
    );
  });
});

/** Returns the line of `text` that starts at the first `start`, up to the next newline. */
function paragraphStartingWith(text: string, start: string): string {
  const begin = text.indexOf(start);
  if (begin === -1) {
    return "";
  }
  const end = text.indexOf("\n", begin);
  return end === -1 ? text.slice(begin) : text.slice(begin, end);
}

/** The phrases that the critic and the recheck critic share about the real thing. */
const REAL_THING_PHRASES = [
  "`Real thing:` line",
  "with Read",
  "Read's `pages` parameter, up to 20 pages a call",
  "treat it as not given",
  "says it could not be opened",
  "Never stop the run for it",
  "its format, its structure, and its real labels",
  '"Smaller things"',
  "could not be checked against the real thing",
  "Never search the disk for the real thing",
];

describe("the real thing a mock shows", () => {
  it("step 1 of the design-critic SKILL.md passes a given path and never searches", () => {
    const skill = readSkillFile("SKILL.md");
    const stepStart = skill.indexOf("1. Collect the inputs");
    const stepEnd = skill.indexOf("\n2. Spawn one agent");
    expect(stepStart).toBeGreaterThan(-1);
    expect(stepEnd).toBeGreaterThan(stepStart);
    const step = skill.slice(stepStart, stepEnd);
    for (const phrase of [
      "Never search the disk for the real thing",
      "`Real thing:` line",
      "Do not open it, check it, or list its folder",
    ]) {
      expect(step).toContain(phrase);
    }
  });

  it("no skill file or the PRD stops the run on a real thing that cannot be opened", () => {
    for (const text of [
      readSkillFile("SKILL.md"),
      readSkillFile("agents", "critic.md"),
      readSkillFile("agents", "recheck.md"),
      readRepositoryFile("plugin", "skills", "crit-loop", "SKILL.md"),
      readRepositoryFile("docs", "PRD.md"),
    ]) {
      expect(text).not.toContain("real thing <path> does not exist");
    }
  });

  it("the text after the critic prompt block says where the Real thing line goes", () => {
    const afterFirstBlock =
      textAfterEachPromptBlock(readSkillFile("SKILL.md"))[0] ?? "";
    expect(afterFirstBlock).toContain("`Real thing: <absolute path>`");
    expect(afterFirstBlock).toContain("for each path");
    expect(afterFirstBlock).toContain("`You critique only.`");
  });

  it("critic.md step 3 judges a mock against the real thing after the brief paragraph", () => {
    const critic = readSkillFile("agents", "critic.md");
    const stepStart = critic.indexOf("3. **Establish the job.**");
    const stepEnd = critic.indexOf("4. **Run the checklist");
    expect(stepStart).toBeGreaterThan(-1);
    expect(stepEnd).toBeGreaterThan(stepStart);
    const step = critic.slice(stepStart, stepEnd);
    const start = "When the image shows a mock of a real thing";
    expect(step.indexOf(start)).toBeGreaterThan(
      step.indexOf("The brief describes the piece"),
    );
    const paragraph = paragraphStartingWith(step, start);
    for (const phrase of [
      ...REAL_THING_PHRASES,
      "ranked finding",
      "Ask and Stage apply",
    ]) {
      expect(paragraph).toContain(phrase);
    }
  });

  it("recheck.md step 5 judges a mock in the after image against the real thing", () => {
    const recheck = readSkillFile("agents", "recheck.md");
    // The paragraph sits in step 5, after the first read of step 2 and the statuses of step 4.
    const stepFive = recheck.indexOf("5. **Look for new problems.**");
    const stepSix = recheck.indexOf("6. **Rank what is left.**");
    const start = "When the after image shows a mock of a real thing";
    const paragraphStart = recheck.indexOf(start);
    expect(stepFive).toBeGreaterThan(-1);
    expect(paragraphStart).toBeGreaterThan(stepFive);
    expect(stepSix).toBeGreaterThan(paragraphStart);
    const paragraph = paragraphStartingWith(recheck, start);
    for (const phrase of [
      ...REAL_THING_PHRASES,
      "stays open, unless step 4 marks it settled",
      "new problem",
    ]) {
      expect(paragraph).toContain(phrase);
    }
  });

  it("the crit-loop SKILL.md passes the same real thing in round 1 and every round", () => {
    const loop = readRepositoryFile(
      "plugin",
      "skills",
      "crit-loop",
      "SKILL.md",
    );
    const roundOneStart = loop.indexOf("## Round 1");
    const roundOneEnd = loop.indexOf("## Each round after that");
    expect(roundOneStart).toBeGreaterThan(-1);
    expect(roundOneEnd).toBeGreaterThan(roundOneStart);
    expect(loop.slice(roundOneStart, roundOneEnd)).toContain(
      "write each path to `<loop folder>/real-thing.txt`, one path per line",
    );
    // The recheck prompt block is the one whose following text names the Before images line.
    const afterRecheckBlock =
      textAfterEachPromptBlock(loop).find((text) =>
        text.includes("Before images:"),
      ) ?? "";
    for (const phrase of [
      "`Real thing: <absolute path>`",
      "for each path in it",
      "`real-thing.txt`",
      "in every round",
      "Never search the disk for the real thing",
    ]) {
      expect(afterRecheckBlock).toContain(phrase);
    }
  });
});

/** Returns the text inside each fenced block of `text`, one string per block. */
function textInsideEachFence(text: string): string[] {
  const lines = text.split("\n");
  const isFence = (line: string) => line.trimStart().startsWith("```");
  const blocks: string[] = [];
  let index = 0;
  while (index < lines.length) {
    if (!isFence(lines[index] ?? "")) {
      index += 1;
      continue;
    }
    let closing = index + 1;
    while (closing < lines.length && !isFence(lines[closing] ?? "")) {
      closing += 1;
    }
    blocks.push(lines.slice(index + 1, closing).join("\n"));
    index = closing + 1;
  }
  return blocks;
}

/** Returns the part of `text` from the first `start` up to the next `end` after it. */
function sliceBetween(text: string, start: string, end: string): string {
  const begin = text.indexOf(start);
  expect(begin).toBeGreaterThan(-1);
  const finish = text.indexOf(end, begin + start.length);
  expect(finish).toBeGreaterThan(begin);
  return text.slice(begin, finish);
}

// The maker facts a finding requests (FR-77, FR-80, FR-82, crit-cbt): the critic writes one
// fixed sentence per requested fact, the main thread asks for every requested fact in one
// question before the work order, the fix loop writes the answers into brief.md and does not
// count an unanswered request against the stop rules, and nothing searches the disk for a fact.
describe("the facts a finding requests from the maker", () => {
  const loop = readRepositoryFile("plugin", "skills", "crit-loop", "SKILL.md");
  const designCritic = readSkillFile("SKILL.md");

  it("critic.md says how a finding requests a fact and never searches for one", () => {
    const critic = readSkillFile("agents", "critic.md");
    for (const phrase of [
      "`Fact needed from the maker: <the fact>.`",
      "just before the `Viewports:` ending",
      "Never search the disk or the repository for a fact",
      "or at its end when it has no such ending",
      "A fact request is its own finding, and its whole fix is the missing fact.",
      "write that part as a separate finding without the sentence",
      "or a fact the brief states, is never a fact request",
      "Neither is a real thing that your prompt does not give",
    ]) {
      expect(critic).toContain(phrase);
    }
  });

  it("recheck.md and work-order.md point to the rule and do not restate it", () => {
    const recheck = readSkillFile("agents", "recheck.md");
    expect(recheck).toContain(
      '"Suggest copy edits, never new content" bullet in `agents/critic.md`',
    );
    expect(recheck).toContain(
      "A fact the brief or a file on a `Real thing:` line states is not made up.",
    );
    const workOrder = readSkillFile("agents", "work-order.md");
    expect(workOrder).toContain("Fact needed from the maker:");
    expect(workOrder).toContain("Never search the disk or the repository");
    for (const text of [recheck, workOrder]) {
      expect(text).not.toContain("just before the `Viewports:` ending");
    }
  });

  it("step 5 of the design-critic SKILL.md asks for every requested fact in one question", () => {
    const stepFive = sliceBetween(
      designCritic,
      "5. Write the work order",
      "## Contact-sheet mode",
    );
    for (const phrase of [
      "Fact needed from the maker:",
      "in one question",
      "never ask one at a time",
      "ask one question for all the images together",
      "When no finding requests a fact, ask nothing",
      "When no person can answer",
      "wait until every crit that runs together is done",
      "every slide's crit or recheck of a fix-loop round",
      "making the block when there was no brief, and give every work-order agent of those crits that Brief block",
      "Leave out each fact that the caller says was asked for before and not given",
    ]) {
      expect(stepFive).toContain(phrase);
    }
  });

  it("the crit-loop SKILL.md has the section on requested facts", () => {
    const section = sliceBetween(
      loop,
      "## When a finding requests a fact",
      "\n## ",
    );
    for (const phrase of [
      "When the person settles a finding",
      "`<loop folder>/facts-asked.txt`, one line each, in the request's own words",
      "so it does not ask for them again",
      "A fact the person answers goes into `brief.md` and not into that file",
      "the set critic requests no facts",
      "does not count against the stop rules",
      "No slide has a ranked finding",
      "never searches the disk or the repository",
      "the files the caller named",
      "A finding whose whole fix is a requested fact that nobody gave stays open",
      "together with other fixes is not set aside: make its other fixes",
      "Once its other fixes are made and only its requested fact is left, it counts as a finding whose whole fix is that fact",
      "counts as asked and not given and is written to `<loop folder>/facts-asked.txt`",
    ]) {
      expect(section).toContain(phrase);
    }
    expect(section).not.toMatch(/\bowner\b/);
    const fixTheDesign = loop.slice(
      loop.indexOf("## Fix the design, not the score"),
    );
    expect(fixTheDesign).toContain("## Fix the design, not the score");
    expect(fixTheDesign).not.toMatch(/\bowner\b/);
    expect(section).not.toMatch(
      /\b(bd|beads|CLAUDE\.md|buyer|customer|sale|sales|sell|purchase|price)\b/i,
    );
  });

  it("the crit-loop SKILL.md says one question on exactly two lines, round 1 and step 6", () => {
    const lines = loop
      .split("\n")
      .filter((line) => line.includes("one question"));
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^2\. Run the design-critic skill/);
    expect(lines[1]).toMatch(/^6\. If you do not stop/);
  });

  it("contact-sheet mode and later deck rounds ask once, after every crit", () => {
    expect(designCritic).toContain(
      "when every crit is done, ask for the requested facts as step 5 says, then write each work order",
    );
    expect(loop).toContain(
      "wait for every slide's recheck, ask once for the facts that all of them request",
    );
  });

  it("both stop rules of the crit-loop SKILL.md set the requested facts aside", () => {
    const deckStop = sliceBetween(loop, "**When to stop.**", "\n\n");
    expect(deckStop).toContain("When a finding requests a fact");
    const deckRoundOne = sliceBetween(loop, "**Round 1.**", "\n\n");
    expect(deckRoundOne).toContain('"Deck pattern wins" overrides');
    expect(deckRoundOne).toContain(
      '"When a finding requests a fact" sets aside',
    );
    const pageStop = sliceBetween(loop, "## When to stop", "\n## ");
    expect(pageStop).toContain("When a finding requests a fact");
  });

  it("no fenced block of either skill holds the new rule", () => {
    for (const text of [loop, designCritic]) {
      for (const block of textInsideEachFence(text)) {
        expect(block).not.toContain("Fact needed");
        expect(block).not.toContain("one question");
      }
    }
  });
});

// The copy rule (FR-77, FR-82, crit-bwr): facts and real examples come from the brief or the real
// thing, and a fix adds no new promise or sample data. The critic.md bullet
// "Suggest copy edits, never new content" is its one statement; the recheck, the work order, and
// the fix loop point to it, and no fenced prompt block holds it.
describe("the copy rule of FR-77", () => {
  const critic = readSkillFile("agents", "critic.md");
  const recheck = readSkillFile("agents", "recheck.md");
  const workOrder = readSkillFile("agents", "work-order.md");
  const loop = readRepositoryFile("plugin", "skills", "crit-loop", "SKILL.md");
  const designCritic = readSkillFile("SKILL.md");
  const bullet = sliceBetween(
    critic,
    "- **Suggest copy edits, never new content.**",
    "\n- **",
  );
  // "Fix the design, not the score" is the last section of the crit-loop SKILL.md.
  const fixTheDesignStart = loop.indexOf("## Fix the design, not the score");
  const fixTheDesign = loop.slice(fixTheDesignStart);

  it("the fix loop has its Fix the design section", () => {
    expect(fixTheDesignStart).toBeGreaterThanOrEqual(0);
  });

  it("the critic.md bullet states the whole rule", () => {
    for (const phrase of [
      "Keep what each line means and what each label names",
      'a column headed "Size" still names a size',
      "a unit the piece states nowhere is a fact only the maker has",
      "Never add a promise the piece does not already make",
      '"every", "unlimited", "as many as you like"',
      "judge any other claim of scope or quantity the same way",
      "A real example the caller gave",
      '"Case No. 00-EXAMPLE"',
      "never in the format of a real record",
      "This bullet is the one statement of the copy rule",
    ]) {
      expect(bullet).toContain(phrase);
    }
  });

  it("the rule is stated once, in critic.md", () => {
    const files = [critic, recheck, workOrder, loop];
    for (const phrase of [
      "Never add a promise",
      "00-EXAMPLE",
      "copywriter",
      "cut, reorder, restore",
    ]) {
      const count = files
        .map((text) => text.split(phrase).length - 1)
        .reduce((total, each) => total + each, 0);
      expect(count, phrase).toBe(1);
      expect(bullet).toContain(phrase);
    }
  });

  it("the recheck, the work order, and the fix loop point to the bullet", () => {
    for (const text of [recheck, workOrder, loop]) {
      expect(text).toContain('"Suggest copy edits, never new content" bullet');
    }
    expect(recheck).toContain("a promise the before image does not make");
    expect(recheck).toContain("a label that now names a different thing");
  });

  it("the fix loop says never invent content and uses given facts as given", () => {
    const inventLines = loop
      .split("\n")
      .filter((line) => line.includes("Never invent content"));
    expect(inventLines).toHaveLength(1);
    expect(loop).not.toContain("Never add content");
    for (const phrase of [
      "<design-critic folder>/agents/critic.md",
      "a file in `real-thing.txt`",
      "use it exactly as given",
    ]) {
      expect(fixTheDesign).toContain(phrase);
    }
  });

  it("no fenced block holds the rule", () => {
    for (const text of [loop, designCritic, critic, recheck, workOrder]) {
      for (const block of textInsideEachFence(text)) {
        expect(block).not.toContain("promise");
        expect(block).not.toContain("00-EXAMPLE");
      }
    }
  });

  it("the bullet keeps its ban list and adds no sample data where none is shown", () => {
    expect(bullet).toContain(
      "no facts, figures, names, comparisons, quotes, sample data, or claims that the piece does not make",
    );
    expect(bullet).toContain(
      "A fix adds no sample data where the piece shows none.",
    );
    expect(bullet).toContain(
      "When the piece already shows sample data, a fix that changes it keeps it reading as made up at a glance",
    );
    expect(recheck).toContain(
      "made-up names, numbers, or sample data that the before image did not show",
    );
  });

  it("facts come only from the brief and the real thing", () => {
    expect(fixTheDesign).toContain(
      "A fact or a real example that `brief.md` or a file in `real-thing.txt` gives",
    );
    expect(fixTheDesign).toContain(
      "A fact the person states in the request reaches you through the `brief.md` that round 1 writes.",
    );
    for (const text of [bullet, fixTheDesign]) {
      expect(text).not.toContain("the request, or a file the caller named");
    }
  });

  it("the work-order agent gets the Real thing lines, outside the prompt block", () => {
    const afterWorkOrderBlock = textAfterEachPromptBlock(designCritic)[2] ?? "";
    expect(afterWorkOrderBlock).toContain(
      "When the crit had `Real thing:` lines, add the same lines, one per path, as the last lines before `When the work order is done`",
    );
    for (const block of textInsideEachFence(designCritic)) {
      expect(block).not.toContain("Real thing:");
    }
    expect(workOrder).toContain("even when the crit gives one as an example");
  });

  it("the fix loop may add a control whose label uses words already there", () => {
    expect(loop).toContain(
      'The rule against new content in "Fix the design, not the score" holds here too',
    );
    expect(loop).toContain(
      "A control that a finding asks for may be added when its label uses only words already on the piece or in `brief.md`",
    );
    expect(loop).toContain("It adds no promise, number, or sample data.");
    expect(loop).not.toContain("The rule against new content still holds");
  });

  it("the PRD states the rule in FR-77 and points to it from FR-82", () => {
    const prd = readRepositoryFile("docs", "PRD.md").split("\n");
    const row77 = prd.find((line) => line.startsWith("| FR-77 |")) ?? "";
    const row82 = prd.find((line) => line.startsWith("| FR-82 |")) ?? "";
    expect(row77).toContain("Decision 2026-11-25 (crit-bwr)");
    expect(row77).toContain("the list is open");
    expect(row82).toContain("under the copy-edit rule of FR-77");
    expect(row82).toContain("I do not want anything to invent content");
  });
});
