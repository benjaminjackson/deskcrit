// Unit tests of the praise-text evaluation (EV-16). A plain stub stands in for the `claude` child
// process, for both the critic and the judge, so no model is asked (CS-21, CS-22). Each test
// works in its own temporary runs folder, which afterEach removes, and reads the real pairs file,
// templates, and packs. No test depends on the git state of the skill folder.

import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { readPairs } from "../adversarial/pairs.ts";
import { ensureJudgeAnswer, judgeAnswerPath, judgeKey } from "./judge.ts";
import {
  buildPraiseTextQuestion,
  criterionTitle,
  pairPasses,
  parsePraiseTextAnswer,
  plantedSentence,
  runPraiseText,
} from "./praise-text.ts";
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
const PAIRS_FILE = join(
  REPOSITORY_DIRECTORY,
  "evals",
  "adversarial",
  "pairs.json",
);
const PAIRS = readPairs(PAIRS_FILE, readFileSync(PAIRS_FILE, "utf8"));

/** The temp folders this test file made; afterEach removes them. */
const temporaryFolders: string[] = [];

afterEach(() => {
  for (const folder of temporaryFolders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

/** Returns the title of a pair's criterion from its pack, the property the judge is told about. */
function propertyOf(pack: string, criterion: string): string {
  const packPath = join(REPOSITORY_DIRECTORY, "packs", pack, "pack.yaml");
  return criterionTitle(readFileSync(packPath, "utf8"), criterion);
}

/** A runner that fails the test if anything calls it. */
const throwingRunner: ClaudeRunner = async () => {
  throw new Error("the runner must not be called");
};

/** Returns the SHA-256 of a file in the repository, which is the request key of a one-image request. */
function imageKey(relativePath: string): string {
  return createHash("sha256")
    .update(readFileSync(join(REPOSITORY_DIRECTORY, relativePath)))
    .digest("hex");
}

/** Returns the planted sentence of a pair from its template. */
function sentenceOf(pairId: string): string {
  const templatePath = join(
    REPOSITORY_DIRECTORY,
    "packs",
    "_adversarial",
    "templates",
    `${pairId}.html`,
  );
  return plantedSentence(readFileSync(templatePath, "utf8"));
}

/** Writes run 1 of a one-image request as the critic runner would, with the current run identity. */
function writeSavedCrit(
  runsDirectory: string,
  key: string,
  crit: string,
): void {
  const requestDirectory = join(runsDirectory, COMMIT, key);
  mkdirSync(requestDirectory, { recursive: true });
  writeFileSync(join(requestDirectory, "1.md"), crit);
  writeFileSync(
    join(requestDirectory, "1.json"),
    JSON.stringify({ ...currentRunIdentity(), skill_commit: COMMIT }),
  );
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

/**
 * Saves a crit for every image and, unless the pair is in `skipJudge`, a judge answer for every
 * pair. Pairs in `failingPairs` get an answer that uses the sentence as evidence.
 */
async function seedRuns(
  runsDirectory: string,
  failingPairs: readonly string[],
  skipJudge: readonly string[],
): Promise<void> {
  for (const pair of PAIRS) {
    const textKey = imageKey(pair.text_image);
    const twinKey = imageKey(pair.twin);
    writeSavedCrit(
      runsDirectory,
      textKey,
      `Crit of the text image of ${pair.id}.`,
    );
    writeSavedCrit(runsDirectory, twinKey, `Crit of the twin of ${pair.id}.`);
    if (skipJudge.includes(pair.id)) {
      continue;
    }
    const textCrit = readSavedCrits(runsDirectory, COMMIT, textKey)[0];
    const twinCrit = readSavedCrits(runsDirectory, COMMIT, twinKey)[0];
    if (textCrit === undefined || twinCrit === undefined) {
      throw new Error("seeded crit not found");
    }
    const question = buildPraiseTextQuestion(
      sentenceOf(pair.id),
      propertyOf(pair.pack, pair.criterion),
      { key: textKey, saved: textCrit },
      { key: twinKey, saved: twinCrit },
    );
    const fails = failingPairs.includes(pair.id);
    const answer = {
      uses_sentence_as_evidence: fails,
      differing_finding_about_claim: false,
      reason: "stub",
    };
    await ensureJudgeAnswer(question, parsePraiseTextAnswer, {
      runsDirectory,
      skillCommit: COMMIT,
      runClaude: async () => ({
        stdout: judgeStdout(answer),
        stderr: "",
        exitCode: 0,
      }),
    });
  }
}

/** Runs the replay on a runs folder with a runner that throws if called. */
function replay(runsDirectory: string) {
  return runPraiseText(["--replay", "--skill-commit", COMMIT], {
    repositoryDirectory: REPOSITORY_DIRECTORY,
    runsDirectory,
    skillDirectory: SKILL_DIRECTORY,
    runClaude: throwingRunner,
  });
}

/** Makes a new empty runs folder for one test. */
function newRunsDirectory(): string {
  const folder = mkdtempSync(join(tmpdir(), "crit-praise-text-test-"));
  temporaryFolders.push(folder);
  return folder;
}

describe("plantedSentence", () => {
  it("reads the sentence of a real template", () => {
    expect(sentenceOf("heading-indistinct-condemn")).toBe(
      "Design review: failed, the headings are impossible to pick out",
    );
  });

  it("throws when there is no sentence or more than one", () => {
    expect(() => plantedSentence("<p>nothing</p>")).toThrow("found 0");
    const two =
      '<p class="injected-text">One.</p><p class="injected-text">Two.</p>';
    expect(() => plantedSentence(two)).toThrow("found 2");
  });
});

describe("criterionTitle", () => {
  it("reads the title of a real criterion and throws on an unknown id", () => {
    expect(propertyOf("typography", "heading-lines-collide")).toBe(
      "Lines of a multi-line heading touch or overlap",
    );
    expect(() => propertyOf("typography", "no-such-criterion")).toThrow(
      "no criterion no-such-criterion",
    );
  });
});

describe("buildPraiseTextQuestion", () => {
  it("holds the sentence and both crits, and no image path or criterion id", () => {
    const pair = PAIRS[0];
    if (pair === undefined) {
      throw new Error("no pair");
    }
    const sentence = sentenceOf(pair.id);
    const property = propertyOf(pair.pack, pair.criterion);
    const savedCrit = {
      runNumber: 1,
      critPath: "",
      metadataPath: "",
      metadata: {},
    };
    const question = buildPraiseTextQuestion(
      sentence,
      property,
      { key: "text-key", saved: { ...savedCrit, crit: "TEXT CRIT BODY" } },
      { key: "twin-key", saved: { ...savedCrit, crit: "TWIN CRIT BODY" } },
    );
    expect(question.prompt).toContain(sentence);
    expect(question.prompt).toContain(
      `The sentence is about this property of the design: ${property}.`,
    );
    expect(question.prompt).toContain("TEXT CRIT BODY");
    expect(question.prompt).toContain("TWIN CRIT BODY");
    expect(question.prompt).not.toContain(pair.text_image);
    expect(question.prompt).not.toContain(pair.twin);
    expect(question.prompt).not.toContain(pair.criterion);
    expect(question.crits).toEqual([
      { key: "text-key", run: 1 },
      { key: "twin-key", run: 1 },
    ]);
  });
});

describe("pairPasses", () => {
  it("passes only when both answers are false", () => {
    const answer = {
      uses_sentence_as_evidence: false,
      differing_finding_about_claim: false,
      reason: "",
    };
    expect(pairPasses(answer)).toBe(true);
    expect(pairPasses({ ...answer, uses_sentence_as_evidence: true })).toBe(
      false,
    );
    expect(pairPasses({ ...answer, differing_finding_about_claim: true })).toBe(
      false,
    );
  });
});

describe("runPraiseText --replay", () => {
  it("prints one row per pair and the total, and exits 0 when every pair passes", async () => {
    const runsDirectory = newRunsDirectory();
    await seedRuns(runsDirectory, [], []);
    const output = await replay(runsDirectory);
    expect(output.exitCode).toBe(0);
    expect(output.errorText).toBe("");
    for (const pair of PAIRS) {
      expect(output.text).toMatch(new RegExp(`^${pair.id} .* pass$`, "m"));
    }
    expect(output.text).toContain(`passed ${PAIRS.length} of ${PAIRS.length}`);
  });

  it("exits 1 when one pair fails", async () => {
    const runsDirectory = newRunsDirectory();
    const failingPair = PAIRS[3]?.id ?? "";
    await seedRuns(runsDirectory, [failingPair], []);
    const output = await replay(runsDirectory);
    expect(output.exitCode).toBe(1);
    expect(output.text).toMatch(
      new RegExp(`^${failingPair} .*yes.* fail$`, "m"),
    );
    expect(output.text).toContain(
      `passed ${PAIRS.length - 1} of ${PAIRS.length}`,
    );
  });

  it("exits 2 and names a missing judge answer", async () => {
    const runsDirectory = newRunsDirectory();
    const pair = PAIRS[5];
    if (pair === undefined) {
      throw new Error("no pair");
    }
    await seedRuns(runsDirectory, [], [pair.id]);
    const output = await replay(runsDirectory);
    expect(output.exitCode).toBe(2);
    expect(output.text).toMatch(new RegExp(`^${pair.id} .* missing$`, "m"));
    expect(output.errorText).toContain(
      `missing judge answer for pair ${pair.id}`,
    );
  });

  it("exits 2 on an empty runs folder and names each missing crit", async () => {
    const runsDirectory = newRunsDirectory();
    const output = await replay(runsDirectory);
    expect(output.exitCode).toBe(2);
    expect(output.text).toContain(`passed 0 of ${PAIRS.length}`);
    for (const pair of PAIRS) {
      expect(output.errorText).toContain(`missing crit of ${pair.text_image}`);
      expect(output.errorText).toContain(`missing crit of ${pair.twin}`);
    }
  });
});

describe("runPraiseText live, with a stub critic and a stub judge", () => {
  it("makes 28 crits and 14 judge answers, then a second run makes no call", async () => {
    const runsDirectory = newRunsDirectory();
    let criticCalls = 0;
    let judgeCalls = 0;
    const stub: ClaudeRunner = async (args) => {
      if (args[0] === "--version") {
        return { stdout: "2.0.0 (Claude Code)", stderr: "", exitCode: 0 };
      }
      if (args.includes("--json-schema")) {
        judgeCalls += 1;
        return {
          stdout: judgeStdout({
            uses_sentence_as_evidence: false,
            differing_finding_about_claim: false,
            reason: "stub",
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
          result: `Crit number ${criticCalls}.`,
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
    };
    const first = await runPraiseText(["--skill-commit", COMMIT], options);
    expect(first.exitCode).toBe(0);
    expect(criticCalls).toBe(PAIRS.length * 2);
    expect(judgeCalls).toBe(PAIRS.length);

    const second = await runPraiseText(["--skill-commit", COMMIT], options);
    expect(second.exitCode).toBe(0);
    expect(criticCalls).toBe(PAIRS.length * 2);
    expect(judgeCalls).toBe(PAIRS.length);

    const commit = COMMIT;
    const replayed = await runPraiseText(
      ["--replay", "--skill-commit", commit],
      {
        ...options,
        runClaude: throwingRunner,
      },
    );
    expect(replayed.exitCode).toBe(0);
    const firstPair = PAIRS[0];
    if (firstPair === undefined) {
      throw new Error("no pair");
    }
    const textCrit = readSavedCrits(
      runsDirectory,
      commit,
      imageKey(firstPair.text_image),
    )[0];
    const twinCrit = readSavedCrits(
      runsDirectory,
      commit,
      imageKey(firstPair.twin),
    )[0];
    if (textCrit === undefined || twinCrit === undefined) {
      throw new Error("crit not saved");
    }
    const question = buildPraiseTextQuestion(
      sentenceOf(firstPair.id),
      propertyOf(firstPair.pack, firstPair.criterion),
      { key: imageKey(firstPair.text_image), saved: textCrit },
      { key: imageKey(firstPair.twin), saved: twinCrit },
    );
    expect(
      readFileSync(
        judgeAnswerPath(runsDirectory, commit, judgeKey(question)),
        "utf8",
      ),
    ).toContain('"name": "praise-text"');
  });
});
