// Unit tests of the repeat-run evaluation (EV-17). A plain stub stands in for the `claude` child
// process, for both the critic and the judge, so no model is asked (CS-21, CS-22). Each test
// works in its own temporary runs folder, which afterEach removes, and reads the real fixtures
// and the real saved crits. No test depends on the git state of the skill folder.

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ensureJudgeAnswer } from "./judge.ts";
import {
  buildRepeatQuestion,
  type CritSections,
  JEV_FIGURE_LINE,
  labelFindings,
  REPEAT_FIXTURES,
  rankedFindings,
  readCrit,
  repeatAnswerParser,
  runRepeat,
  scoreImage,
  smallerThings,
  verdict,
} from "./repeat.ts";
import {
  type ClaudeRunner,
  currentRunIdentity,
  readSavedCrits,
} from "./run-critic.ts";

const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const REPOSITORY_DIRECTORY = join(import.meta.dirname, "..", "..");
const SKILL_DIRECTORY = join(
  REPOSITORY_DIRECTORY,
  "plugin",
  "skills",
  "design-critic",
);
const SAVED_RUNS = join(import.meta.dirname, "runs");
const SAVED_KEY =
  "52706f8e83dfae39541f9bffea11ff765849ff8ade6f297d39e6b40d3f6c63c8";

/** The temp folders this test file made; afterEach removes them. */
const temporaryFolders: string[] = [];

afterEach(() => {
  for (const folder of temporaryFolders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

/** A runner that fails the test if anything calls it. */
const throwingRunner: ClaudeRunner = async () => {
  throw new Error("the runner must not be called");
};

/** Makes a new empty runs folder for one test. */
function newRunsDirectory(): string {
  const folder = mkdtempSync(join(tmpdir(), "crit-repeat-test-"));
  temporaryFolders.push(folder);
  return folder;
}

/** Returns the SHA-256 of a fixture, which is the request key of a one-image request. */
function imageKey(fixture: string): string {
  return createHash("sha256")
    .update(readFileSync(join(REPOSITORY_DIRECTORY, fixture)))
    .digest("hex");
}

/** Returns a crit in the form critic.md asks for, with the given verdict, ranked findings, and smaller things. */
function sampleCrit(
  verdictText: string,
  ranked: readonly string[],
  smaller: readonly string[],
): string {
  const rankedLines = ranked.map((text, index) => `${index + 1}. ${text}`);
  const smallerLines = smaller.map((text) => `- ${text}`);
  return [
    "**First read.** The eye lands on the heading.",
    "",
    "**What it's for.** A sample page.",
    "",
    `**Verdict.** ${verdictText}`,
    "",
    "**What would move it most**",
    "",
    rankedLines.join("\n\n"),
    "",
    "**Smaller things.**",
    smallerLines.join("\n"),
    "",
    "**What's working.**",
    "- The colors.",
  ].join("\n");
}

/** Writes runs 1 to `count` of a fixture as the critic runner would, with the current run identity. */
function writeSavedCrits(
  runsDirectory: string,
  fixture: string,
  crits: readonly string[],
): void {
  const requestDirectory = join(runsDirectory, COMMIT, imageKey(fixture));
  mkdirSync(requestDirectory, { recursive: true });
  crits.forEach((crit, index) => {
    writeFileSync(join(requestDirectory, `${index + 1}.md`), crit);
    writeFileSync(
      join(requestDirectory, `${index + 1}.json`),
      JSON.stringify({ ...currentRunIdentity(), skill_commit: COMMIT }),
    );
  });
}

/** Returns stdout in the shape a judge call prints, holding the given answer. */
function judgeStdout(answer: unknown): string {
  return JSON.stringify({
    type: "result",
    subtype: "success",
    is_error: false,
    result: JSON.stringify(answer),
    structured_output: answer,
    total_cost_usd: 0.01,
    modelUsage: { "claude-opus-5-5": {} },
    permission_denials: [],
  });
}

/** The three crits every seeded image gets: 2 ranked findings and 1 smaller thing each. */
const SEED_CRITS = [
  sampleCrit(
    "Weak.",
    ["Heading too small.", "Too many sizes."],
    ["Line long."],
  ),
  sampleCrit("Weak.", ["Heading too small.", "Low contrast."], ["Line long."]),
  sampleCrit(
    "Weak.",
    ["Heading too small."],
    ["Too many sizes.", "Line long."],
  ),
];

/**
 * The seeded answer: A1, B1, C1 match (in all 3 ranked lists); A2 matches Cs1 only (two runs); B2
 * is alone; the three smaller "Line long." match. So 3 of the 5 ranked findings are in all 3 runs.
 */
const SEED_GROUPS = [
  ["A1", "B1", "C1"],
  ["A2", "Cs1"],
  ["B2"],
  ["As1", "Bs1", "Cs2"],
];

/** Seeds 3 crits for every fixture and, unless the fixture is in `skipJudge`, a judge answer. */
async function seedRuns(
  runsDirectory: string,
  skipJudge: readonly string[],
): Promise<void> {
  for (const fixture of REPEAT_FIXTURES) {
    writeSavedCrits(runsDirectory, fixture, SEED_CRITS);
    if (skipJudge.includes(fixture)) {
      continue;
    }
    const key = imageKey(fixture);
    const crits = readSavedCrits(runsDirectory, COMMIT, key);
    const sections: CritSections[] = [];
    for (const crit of crits) {
      const reading = readCrit(crit.crit);
      if (reading.type !== "read") {
        throw new Error("seed crit not read");
      }
      sections.push(reading.sections);
    }
    const findings = labelFindings(sections);
    const question = buildRepeatQuestion(
      key,
      crits,
      sections.map((section) => section.verdict),
      findings,
    );
    await ensureJudgeAnswer(question, repeatAnswerParser(findings), {
      runsDirectory,
      skillCommit: COMMIT,
      runClaude: async () => ({
        stdout: judgeStdout({
          reason: "stub",
          groups: SEED_GROUPS,
          verdicts_agree: true,
        }),
        stderr: "",
        exitCode: 0,
      }),
    });
  }
}

/** Runs the replay on a runs folder with a runner that throws if called. */
function replay(runsDirectory: string) {
  return runRepeat(["--replay", "--skill-commit", COMMIT], {
    repositoryDirectory: REPOSITORY_DIRECTORY,
    runsDirectory,
    skillDirectory: SKILL_DIRECTORY,
    runClaude: throwingRunner,
  });
}

describe("REPEAT_FIXTURES", () => {
  it("lists 10 fixtures: 5 positive, 5 negative, all 8 packs, every file exists", () => {
    expect(REPEAT_FIXTURES).toHaveLength(10);
    const positives = REPEAT_FIXTURES.filter((path) =>
      path.endsWith(".positive.png"),
    );
    const negatives = REPEAT_FIXTURES.filter((path) =>
      path.endsWith(".negative.png"),
    );
    expect(positives).toHaveLength(5);
    expect(negatives).toHaveLength(5);
    const packs = new Set(REPEAT_FIXTURES.map((path) => path.split("/")[1]));
    const firstPartyPacks = readdirSync(join(REPOSITORY_DIRECTORY, "packs"))
      .filter((name) => !name.startsWith("_"))
      .filter((name) =>
        existsSync(join(REPOSITORY_DIRECTORY, "packs", name, "pack.yaml")),
      );
    expect(firstPartyPacks).toHaveLength(8);
    expect([...packs].sort()).toEqual([...firstPartyPacks].sort());
    for (const fixture of REPEAT_FIXTURES) {
      expect(existsSync(join(REPOSITORY_DIRECTORY, fixture))).toBe(true);
    }
  });
});

describe("extraction", () => {
  it("reads a sample crit", () => {
    const crit = sampleCrit(
      "It fails.\nThe heading is lost.",
      ["One.\n   - sub", "Two."],
      ["Small."],
    );
    expect(verdict(crit)).toBe("It fails.\nThe heading is lost.");
    expect(rankedFindings(crit)).toEqual(["1. One.\n   - sub", "2. Two."]);
    expect(smallerThings(crit)).toEqual(["- Small."]);
  });

  it("reads a crit that ends with the Checklist tally, and leaves the tally out of the findings", () => {
    // The tally follows Smaller things directly here, so an unknown heading would end in an error.
    const crit = [
      "**First read.** The eye lands on the heading.",
      "",
      "**Verdict.** It fails.",
      "",
      "**What would move it most**",
      "",
      "1. One.",
      "",
      "**Smaller things.**",
      "- Small.",
      "",
      "**Checklist.**",
      "Basics: common mistakes: 10 lines, 9 yes, 1 no (Text does not read as faint), 0 unsure",
      "Charts and data: skipped",
      "",
      "Better: version 1",
    ].join("\n");
    expect(rankedFindings(crit)).toEqual(["1. One."]);
    expect(smallerThings(crit)).toEqual(["- Small."]);
    expect(readCrit(crit)).toEqual({
      type: "read",
      sections: {
        verdict: "It fails.",
        rankedFindings: ["1. One."],
        smallerThings: ["- Small."],
      },
    });
  });

  it("reads the real saved crits", () => {
    const expectedCounts: Record<string, [number, number]> = {
      [`01218fd9c4f11aa8d790a3a39289ee0266bfb3d1/${SAVED_KEY}/1.md`]: [5, 7],
      [`5eaac029d00a173874cc3a80bb85758b88ecd56f/${SAVED_KEY}/1.md`]: [4, 6],
      [`5eaac029d00a173874cc3a80bb85758b88ecd56f/${SAVED_KEY}/2.md`]: [4, 8],
      [`5eaac029d00a173874cc3a80bb85758b88ecd56f/${SAVED_KEY}/3.md`]: [3, 8],
      [`5eaac029d00a173874cc3a80bb85758b88ecd56f/${SAVED_KEY}/4.md`]: [5, 6],
    };
    for (const [path, [ranked, smaller]] of Object.entries(expectedCounts)) {
      const reading = readCrit(readFileSync(join(SAVED_RUNS, path), "utf8"));
      if (reading.type !== "read") {
        throw new Error(`${path}: ${JSON.stringify(reading)}`);
      }
      expect(reading.sections.rankedFindings).toHaveLength(ranked);
      expect(reading.sections.smallerThings).toHaveLength(smaller);
      expect(reading.sections.verdict).toMatch(/^The /);
    }
    const nested = readFileSync(
      join(
        SAVED_RUNS,
        `5eaac029d00a173874cc3a80bb85758b88ecd56f/${SAVED_KEY}/2.md`,
      ),
      "utf8",
    );
    expect(rankedFindings(nested)?.[1]).toContain(
      "Move the note into real caption text",
    );
  });

  it("says a crit has no ranked list only when the heading is present with no item", () => {
    expect(
      readCrit("**Verdict.** Fine.\n\n**Smaller things.**\n- One."),
    ).toEqual({
      type: "unreadable",
      problem: 'no "What would move it most" heading',
    });
    expect(readCrit(sampleCrit("Fine.", [], []))).toEqual({
      type: "no-ranked-list",
    });
  });

  it("reports a ranked list in another form instead of counting it short", () => {
    const bulleted = sampleCrit("Weak.", [], []).replace(
      "**What would move it most**\n",
      "**What would move it most**\n- First.\n- Second.\n",
    );
    expect(readCrit(bulleted).type).toBe("unreadable");
    const skipped = sampleCrit("Weak.", ["One."], []).replace(
      "1. One.",
      "1. One.\n\n3. Three.",
    );
    expect(readCrit(skipped).type).toBe("unreadable");
    const proseSmallerThings = sampleCrit("Weak.", ["One."], []).replace(
      "**Smaller things.**\n",
      "**Smaller things.** The line is long and the dash is stray.\n",
    );
    expect(readCrit(proseSmallerThings).type).toBe("unreadable");
  });

  it('reads a Smaller things heading line that starts with "None" as an empty list', () => {
    const base = sampleCrit("Weak.", ["One."], []);
    for (const rest of [
      "None.",
      "None beyond the above.",
      "None worth listing. The copy is good.",
    ]) {
      const crit = base.replace(
        "**Smaller things.**\n",
        `**Smaller things.** ${rest}\n`,
      );
      expect(smallerThings(crit)).toEqual([]);
      expect(readCrit(crit).type).toBe("read");
    }
  });

  it('keeps refusing other text on the Smaller things line, and a "None" line with items below it', () => {
    const base = sampleCrit("Weak.", ["One."], []);
    const nonetheless = base.replace(
      "**Smaller things.**\n",
      "**Smaller things.** Nonetheless the line is long.\n",
    );
    expect(readCrit(nonetheless)).toEqual({
      type: "unreadable",
      problem: "text on the line of the smaller-things heading",
    });
    const noneWithItem = base.replace(
      "**Smaller things.**\n",
      "**Smaller things.** None worth listing.\n- The line is long.\n",
    );
    expect(readCrit(noneWithItem)).toEqual({
      type: "unreadable",
      problem: 'text below a "None" smaller-things heading',
    });
  });

  it('reads the saved crits whose Smaller things line says "None"', () => {
    // bare-kpi-number.positive.png at 581fdaf runs 1 and 3, all-caps-long-text.positive.png at
    // 8006d3a run 3: each wrote "**Smaller things.** None ..." (crit-576.11).
    const paths = [
      "581fdaf090d4c83ac390aec2cbd61002d2e4b35b/12a1a435e03c74d0fa9b893e6aeec8f7f53b00bc8e980e4a3218e11eaba04c11/1.md",
      "581fdaf090d4c83ac390aec2cbd61002d2e4b35b/12a1a435e03c74d0fa9b893e6aeec8f7f53b00bc8e980e4a3218e11eaba04c11/3.md",
      "8006d3a2831b64dd0305b88936ac253ce60b9c2d/25551a27a6f47a4b5a3cbdc8959e633b15d04e499e87f668e767939dc382ea8f/3.md",
    ];
    for (const path of paths) {
      const reading = readCrit(readFileSync(join(SAVED_RUNS, path), "utf8"));
      if (reading.type !== "read") {
        throw new Error(`${path}: ${JSON.stringify(reading)}`);
      }
      expect(reading.sections.smallerThings).toEqual([]);
      expect(reading.sections.rankedFindings.length).toBeGreaterThan(0);
    }
  });

  it("reports a heading that critic.md does not name", () => {
    const smallerToFix = sampleCrit("Weak.", ["One."], ["Two."]).replace(
      "**Smaller things.**",
      "**Smaller things to fix.**",
    );
    expect(readCrit(smallerToFix)).toEqual({
      type: "unreadable",
      problem: 'unknown heading: "**Smaller things to fix.**"',
    });
    const rankedVariant = sampleCrit("Weak.", ["One."], ["Two."]).replace(
      "**What would move it most**",
      "**What would move it most (ranked)**",
    );
    expect(readCrit(rankedVariant)).toEqual({
      type: "unreadable",
      problem: 'no "What would move it most" heading',
    });
  });
});

describe("repeatAnswerParser", () => {
  const sections: CritSections[] = [
    { verdict: "v", rankedFindings: ["a"], smallerThings: ["s"] },
    { verdict: "v", rankedFindings: ["a"], smallerThings: [] },
    { verdict: "v", rankedFindings: ["a"], smallerThings: [] },
  ];
  const parse = repeatAnswerParser(labelFindings(sections));
  const answer = (groups: unknown) => ({
    reason: "r",
    groups,
    verdicts_agree: true,
  });

  it("accepts a grouping that uses every id once", () => {
    expect(parse(answer([["A1", "B1", "C1"], ["As1"]])).groups).toHaveLength(2);
  });

  it("rejects an unknown, missing, or repeated id, and two ids of one run in a group", () => {
    expect(() => parse(answer([["A1", "B1", "C1"], ["As1"], ["D1"]]))).toThrow(
      "unknown id D1",
    );
    expect(() => parse(answer([["A1", "B1", "C1"]]))).toThrow(
      "leaves out the id As1",
    );
    expect(() =>
      parse(
        answer([
          ["A1", "B1", "C1"],
          ["As1", "A1"],
        ]),
      ),
    ).toThrow("A1 twice");
    expect(() =>
      parse(
        answer([
          ["A1", "As1"],
          ["B1", "C1"],
        ]),
      ),
    ).toThrow("two ids of run A");
    expect(() => parse({ reason: "r", groups: [] })).toThrow("wrong shape");
  });
});

describe("scoreImage", () => {
  const sections: CritSections[] = [
    { verdict: "v", rankedFindings: ["a", "b"], smallerThings: [] },
    { verdict: "v", rankedFindings: ["a", "b"], smallerThings: ["b"] },
    { verdict: "v", rankedFindings: ["a", "b"], smallerThings: ["b"] },
  ];
  const findings = labelFindings(sections);

  it("gives 1 when every ranked finding is matched in all 3 ranked lists", () => {
    const score = scoreImage(findings, [
      ["A1", "B1", "C1"],
      ["A2", "B2", "C2"],
      ["Bs1"],
      ["Cs1"],
    ]);
    expect(score).toEqual({
      rankedFindings: 6,
      inAllRuns: 6,
      inAllRankedLists: 6,
    });
  });

  it("gives 0 when no finding is matched", () => {
    const groups = findings.map((finding) => [finding.id]);
    const score = scoreImage(findings, groups);
    expect(score.inAllRuns).toBe(0);
    expect(score.rankedFindings).toBe(6);
  });

  it("counts findings, not groups: two problems in all 3 ranked lists and one own finding per run give 6 of 9", () => {
    const threeRanked = labelFindings([
      { verdict: "v", rankedFindings: ["a", "b", "c"], smallerThings: [] },
      { verdict: "v", rankedFindings: ["a", "b", "c"], smallerThings: [] },
      { verdict: "v", rankedFindings: ["a", "b", "c"], smallerThings: [] },
    ]);
    const score = scoreImage(threeRanked, [
      ["A1", "B1", "C1"],
      ["A2", "B2", "C2"],
      ["A3"],
      ["B3"],
      ["C3"],
    ]);
    expect(score).toEqual({
      rankedFindings: 9,
      inAllRuns: 6,
      inAllRankedLists: 6,
    });
    expect((score.inAllRuns / score.rankedFindings).toFixed(3)).toBe("0.667");
  });

  it("counts a match through smaller things in the first share and not the second", () => {
    const score = scoreImage(findings, [
      ["A1", "B1", "C1"],
      ["A2", "Bs1", "Cs1"],
      ["B2"],
      ["C2"],
    ]);
    expect(score).toEqual({
      rankedFindings: 6,
      inAllRuns: 4,
      inAllRankedLists: 3,
    });
  });
});

describe("runRepeat --replay", () => {
  it("prints one row per image with the shares and the means, and exits 0", async () => {
    const runsDirectory = newRunsDirectory();
    await seedRuns(runsDirectory, []);
    const output = await replay(runsDirectory);
    expect(output.errorText).toBe("");
    expect(output.exitCode).toBe(0);
    for (const fixture of REPEAT_FIXTURES) {
      expect(output.text).toMatch(
        new RegExp(`^${fixture} +2/2/1 +0\\.600 +0\\.600 +yes$`, "m"),
      );
    }
    expect(output.text).toContain(
      "mean share in all 3: 0.600 (10 of 10 images)",
    );
    expect(output.text).toContain(
      "mean share in all 3 ranked lists: 0.600 (10 of 10 images)",
    );
    expect(output.text).toContain("verdicts agree 10 of 10");
    expect(output.text).toContain(JEV_FIGURE_LINE);
  });

  it("leaves an image with no ranked list out of the means and says so", async () => {
    const runsDirectory = newRunsDirectory();
    const fixture = REPEAT_FIXTURES[0] ?? "";
    await seedRuns(runsDirectory, [fixture]);
    rmSync(join(runsDirectory, COMMIT, imageKey(fixture)), { recursive: true });
    writeSavedCrits(runsDirectory, fixture, [
      ...SEED_CRITS.slice(0, 2),
      sampleCrit("Strong.", [], []),
    ]);
    const output = await replay(runsDirectory);
    expect(output.exitCode).toBe(0);
    expect(output.text).toMatch(
      new RegExp(`^${fixture} +2/2/0 +no ranked list`, "m"),
    );
    expect(output.text).toContain(
      "mean share in all 3: 0.600 (9 of 10 images)",
    );
    expect(output.text).toContain("verdicts agree 9 of 9");
    expect(output.text).toContain("1 of 10 images left out of the means");
  });

  it("exits 2 when every image is left out", async () => {
    const runsDirectory = newRunsDirectory();
    for (const fixture of REPEAT_FIXTURES) {
      writeSavedCrits(runsDirectory, fixture, [
        sampleCrit("Strong.", [], []),
        sampleCrit("Strong.", [], []),
        sampleCrit("Strong.", [], []),
      ]);
    }
    const output = await replay(runsDirectory);
    expect(output.exitCode).toBe(2);
    expect(output.text).toContain("mean share in all 3: - (0 of 10 images)");
    expect(output.errorText).toContain("every image was left out");
  });

  it("exits 2 and names the image when its third run is missing", async () => {
    const runsDirectory = newRunsDirectory();
    const fixture = REPEAT_FIXTURES[4] ?? "";
    await seedRuns(runsDirectory, []);
    const requestDirectory = join(runsDirectory, COMMIT, imageKey(fixture));
    rmSync(join(requestDirectory, "3.md"));
    rmSync(join(requestDirectory, "3.json"));
    const output = await replay(runsDirectory);
    expect(output.exitCode).toBe(2);
    expect(output.text).toMatch(new RegExp(`^${fixture} .*missing$`, "m"));
    expect(output.text).not.toContain("mean share");
    expect(output.errorText).toContain(
      `missing crits of ${fixture}: 2 of 3 saved`,
    );
  });

  it("exits 2 and names a missing judge answer", async () => {
    const runsDirectory = newRunsDirectory();
    const fixture = REPEAT_FIXTURES[6] ?? "";
    await seedRuns(runsDirectory, [fixture]);
    const output = await replay(runsDirectory);
    expect(output.exitCode).toBe(2);
    expect(output.errorText).toContain(`missing judge answer for ${fixture}`);
  });

  it("exits 2 on an empty runs folder and names each image", async () => {
    const output = await replay(newRunsDirectory());
    expect(output.exitCode).toBe(2);
    for (const fixture of REPEAT_FIXTURES) {
      expect(output.errorText).toContain(
        `missing crits of ${fixture}: 0 of 3 saved`,
      );
    }
    expect(output.errorText).toContain("without --replay");
  });
});

describe("runRepeat --batch", () => {
  it("gives the same replay with --batch 1 as with no flag, for every saved skill commit", async () => {
    for (const commit of readdirSync(SAVED_RUNS)) {
      const options = {
        repositoryDirectory: REPOSITORY_DIRECTORY,
        runsDirectory: SAVED_RUNS,
        skillDirectory: SKILL_DIRECTORY,
        runClaude: throwingRunner,
      };
      const plain = await runRepeat(
        ["--replay", "--skill-commit", commit],
        options,
      );
      const batchOne = await runRepeat(
        ["--replay", "--skill-commit", commit, "--batch", "1"],
        options,
      );
      expect(batchOne).toEqual(plain);
    }
  });

  it("scores batch 2 from runs 4 to 6 with its own judge answers, and leaves batch 1 as it was", async () => {
    const runsDirectory = newRunsDirectory();
    await seedRuns(runsDirectory, []);
    const before = await replay(runsDirectory);
    const batchTwoCrits = [
      sampleCrit("Strong.", ["Gap."], []),
      sampleCrit("Strong.", ["Gap."], []),
      sampleCrit("Strong.", ["Gap."], []),
    ];
    for (const fixture of REPEAT_FIXTURES) {
      writeSavedCrits(runsDirectory, fixture, [
        ...SEED_CRITS,
        ...batchTwoCrits,
      ]);
    }
    const judgeCalls: string[] = [];
    const stub: ClaudeRunner = async (args) => {
      if (args[0] === "--version") {
        return { stdout: "2.0.0 (Claude Code)", stderr: "", exitCode: 0 };
      }
      if (!args.includes("--json-schema")) {
        throw new Error(
          "batch 2 must start no critic run: runs 4 to 6 are saved",
        );
      }
      judgeCalls.push(args.join(" "));
      return {
        stdout: judgeStdout({
          reason: "stub",
          groups: [["A1", "B1"], ["C1"]],
          verdicts_agree: true,
        }),
        stderr: "",
        exitCode: 0,
      };
    };
    const options = {
      repositoryDirectory: REPOSITORY_DIRECTORY,
      runsDirectory,
      skillDirectory: SKILL_DIRECTORY,
      runClaude: stub,
    };
    const live = await runRepeat(
      ["--skill-commit", COMMIT, "--batch", "2"],
      options,
    );
    expect(live.errorText).toBe("");
    expect(judgeCalls).toHaveLength(10);
    expect(live.text).toContain("mean share in all 3: 0.000 (10 of 10 images)");
    for (const fixture of REPEAT_FIXTURES) {
      expect(live.text).toMatch(
        new RegExp(`^${fixture} +1/1/1 +0\\.000 +0\\.000 +yes$`, "m"),
      );
    }
    const after = await replay(runsDirectory);
    expect(after).toEqual(before);
    expect(after.text).toContain(
      "mean share in all 3: 0.600 (10 of 10 images)",
    );
  });

  it("names the missing crits of batch 2 and starts no run in replay", async () => {
    const runsDirectory = newRunsDirectory();
    await seedRuns(runsDirectory, []);
    const output = await runRepeat(
      ["--replay", "--skill-commit", COMMIT, "--batch", "2"],
      {
        repositoryDirectory: REPOSITORY_DIRECTORY,
        runsDirectory,
        skillDirectory: SKILL_DIRECTORY,
        runClaude: throwingRunner,
      },
    );
    expect(output.exitCode).toBe(2);
    expect(output.errorText).toContain(
      `missing crits of ${REPEAT_FIXTURES[0]}: 0 of 3 saved`,
    );
  });

  it("refuses a batch that is not a whole number from 1 up", async () => {
    for (const value of ["0", "1.5", "two", "01"]) {
      const output = await runRepeat(["--replay", "--batch", value], {
        repositoryDirectory: REPOSITORY_DIRECTORY,
        runsDirectory: newRunsDirectory(),
        skillDirectory: SKILL_DIRECTORY,
        runClaude: throwingRunner,
      });
      expect(output.exitCode).toBe(2);
      expect(output.errorText).toContain("--batch must be a whole number");
    }
  });
});

describe("runRepeat live, with a stub critic and a stub judge", () => {
  it("makes 30 crits and 10 judge answers, then a second run makes no call", async () => {
    const runsDirectory = newRunsDirectory();
    let criticCalls = 0;
    let judgeCalls = 0;
    const progress: string[] = [];
    const stub: ClaudeRunner = async (args) => {
      if (args[0] === "--version") {
        return { stdout: "2.0.0 (Claude Code)", stderr: "", exitCode: 0 };
      }
      if (args.includes("--json-schema")) {
        judgeCalls += 1;
        return {
          stdout: judgeStdout({
            reason: "stub",
            groups: [["A1", "B1", "C1"]],
            verdicts_agree: false,
          }),
          stderr: "",
          exitCode: 0,
        };
      }
      criticCalls += 1;
      return {
        stdout: JSON.stringify({
          type: "result",
          subtype: "success",
          is_error: false,
          result: sampleCrit(`Crit ${criticCalls}.`, ["The heading."], []),
          modelUsage: { "claude-opus-5-5": {} },
        }),
        stderr: "",
        exitCode: 0,
      };
    };
    const options = {
      repositoryDirectory: REPOSITORY_DIRECTORY,
      runsDirectory,
      skillDirectory: SKILL_DIRECTORY,
      runClaude: stub,
      writeProgress: (line: string) => {
        progress.push(line);
      },
    };
    const first = await runRepeat(["--skill-commit", COMMIT], options);
    expect(first.errorText).toBe("");
    expect(first.exitCode).toBe(0);
    expect(criticCalls).toBe(30);
    expect(judgeCalls).toBe(10);
    expect(progress[0]).toContain(
      "30 critic runs (0 saved), then 10 judge calls (0 saved)",
    );
    expect(first.text).toContain("mean share in all 3: 1.000");
    expect(first.text).toContain("verdicts agree 0 of 10");

    const second = await runRepeat(["--skill-commit", COMMIT], options);
    expect(second.exitCode).toBe(0);
    expect(criticCalls).toBe(30);
    expect(judgeCalls).toBe(10);
    expect(progress[1]).toContain(
      "30 critic runs (30 saved), then 10 judge calls (10 saved)",
    );
  });
});
