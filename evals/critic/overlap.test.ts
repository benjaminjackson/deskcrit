// Unit tests of the Jev overlap evaluation (EV-20). The small tests build a repository of one
// made-up pack in a temporary folder, save crits and judge answers into a temporary runs folder
// with a stub in place of the `claude` child process, and pass stubs for Jev's verdicts and the
// praise-text replay, so no model and no TypeSafe call is made (CS-21, CS-22). The last test
// replays the real repository through dist/crit.js, which `npm test` builds first (pretest).

import { createHash } from "node:crypto";
import {
  copyFileSync,
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
import type { Verdict } from "../agreement/score.ts";
import {
  buildDetectionQuestion,
  type DefectMention,
  judgeRule,
  parseDetectionAnswer,
  selectCriteria,
} from "./detect.ts";
import { ensureJudgeAnswer } from "./judge.ts";
import {
  defaultOverlapOptions,
  type JevVerdicts,
  jevVerdictKey,
  type OverlapOptions,
  runOverlap,
} from "./overlap.ts";
import type { PraiseTextOutput } from "./praise-text.ts";
import { currentRunIdentity, readSavedCrits } from "./run-critic.ts";

const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const REPOSITORY_DIRECTORY = join(import.meta.dirname, "..", "..");

/** The temp folders this test file made; afterEach removes them. */
const temporaryFolders: string[] = [];

afterEach(() => {
  for (const folder of temporaryFolders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

/** Makes a new empty temp folder for one test. */
function newFolder(): string {
  const folder = mkdtempSync(join(tmpdir(), "crit-overlap-test-"));
  temporaryFolders.push(folder);
  return folder;
}

/** Returns the SHA-256 of a file, which is the request key of a one-image request. */
function fileKey(absolutePath: string): string {
  return createHash("sha256").update(readFileSync(absolutePath)).digest("hex");
}

/**
 * Builds a small repository: one pack `tiny` with the criteria alpha, beta, and gamma, one pair
 * each, copied from distinct real fixture PNGs, and an empty removed-fixture manifest.
 */
function buildTinyRepository(): string {
  const repository = newFolder();
  const realFixtures = join(
    REPOSITORY_DIRECTORY,
    "packs",
    "layout",
    "fixtures",
  );
  const pngs = readdirSync(realFixtures)
    .filter((name) => name.endsWith(".png"))
    .sort();
  const fixturesDirectory = join(repository, "packs", "tiny", "fixtures");
  mkdirSync(fixturesDirectory, { recursive: true });
  const criterionIds = ["alpha", "beta", "gamma"];
  let yaml = "name: tiny\ncriteria:\n";
  let pngIndex = 0;
  for (const id of criterionIds) {
    for (const polarity of ["positive", "negative"]) {
      copyFileSync(
        join(realFixtures, pngs[pngIndex] ?? ""),
        join(fixturesDirectory, `${id}.${polarity}.png`),
      );
      pngIndex += 1;
    }
    yaml += `  - id: ${id}
    title: '${id} defect'
    question:
      instructions: 'In the image at screenshot: Is ${id} there?'
    fixtures:
      positive: [fixtures/${id}.positive.png]
      negative: [fixtures/${id}.negative.png]
`;
  }
  writeFileSync(join(repository, "packs", "tiny", "pack.yaml"), yaml);
  const removedDirectory = join(
    repository,
    "evals",
    "critic",
    "removed-fixtures",
  );
  mkdirSync(removedDirectory, { recursive: true });
  writeFileSync(join(removedDirectory, "manifest.json"), "[]");
  return repository;
}

/**
 * Saves a crit for every image of the tiny repository and a judge answer with the mention that
 * `mentionByPath` gives its display path; an image not in the map gets no judge answer.
 */
async function seedCriticRuns(
  repository: string,
  runsDirectory: string,
  mentionByPath: ReadonlyMap<string, DefectMention>,
): Promise<void> {
  const { selected } = selectCriteria(repository, 1);
  for (const entry of selected) {
    for (const scoredImage of entry.scored) {
      const key = fileKey(scoredImage.image.absolutePath);
      const requestDirectory = join(runsDirectory, COMMIT, key);
      mkdirSync(requestDirectory, { recursive: true });
      writeFileSync(join(requestDirectory, "1.md"), "A crit.");
      writeFileSync(
        join(requestDirectory, "1.json"),
        JSON.stringify({ ...currentRunIdentity(), skill_commit: COMMIT }),
      );
      const mention = mentionByPath.get(scoredImage.image.displayPath);
      if (mention === undefined) {
        continue;
      }
      const saved = readSavedCrits(runsDirectory, COMMIT, key)[0];
      if (saved === undefined) {
        throw new Error("seeded crit not found");
      }
      const question = buildDetectionQuestion(
        entry.criterion.title,
        judgeRule(entry.criterion.question),
        key,
        saved,
      );
      const answer = { reason: "stub", says_defect: mention };
      await ensureJudgeAnswer(question, parseDetectionAnswer, {
        runsDirectory,
        skillCommit: COMMIT,
        runClaude: async () => ({
          stdout: JSON.stringify({
            type: "result",
            subtype: "success",
            is_error: false,
            result: JSON.stringify(answer),
            structured_output: answer,
            total_cost_usd: 0.01,
            modelUsage: { "claude-opus-5-5": {} },
            permission_denials: [],
          }),
          stderr: "",
          exitCode: 0,
        }),
      });
    }
  }
}

/** The critic's answer for each image of the tiny repository. */
const CRITIC_MENTIONS = new Map<string, DefectMention>([
  ["packs/tiny/fixtures/alpha.positive.png", "present"],
  ["packs/tiny/fixtures/alpha.negative.png", "absent"],
  ["packs/tiny/fixtures/beta.positive.png", "not_mentioned"],
  ["packs/tiny/fixtures/beta.negative.png", "absent"],
  ["packs/tiny/fixtures/gamma.positive.png", "present"],
  ["packs/tiny/fixtures/gamma.negative.png", "not_mentioned"],
]);

/** Jev's verdict for each image of the tiny repository; gamma's negative image has none. */
const JEV_VERDICTS: readonly [string, string, Verdict][] = [
  ["packs/tiny/fixtures/alpha.positive.png", "alpha", "fail"],
  ["packs/tiny/fixtures/alpha.negative.png", "alpha", "pass"],
  ["packs/tiny/fixtures/beta.positive.png", "beta", "warn"],
  ["packs/tiny/fixtures/beta.negative.png", "beta", "fail"],
  ["packs/tiny/fixtures/gamma.positive.png", "gamma", "pass"],
];

/** A praise-text replay result with no failed pair. */
const PRAISE_TEXT_PASSED: PraiseTextOutput = {
  text: "pair  kind\npassed 14, failed 0, inconclusive 0 of 14\n",
  errorText: "",
  exitCode: 0,
};

/** Returns options for the tiny repository with stub Jev verdicts; `jevCalls` counts the Jev reads. */
function tinyOptions(
  repository: string,
  runsDirectory: string,
  jevCalls: { count: number },
): OverlapOptions {
  const verdictByKey = new Map<string, Verdict>();
  for (const [displayPath, criterion, verdict] of JEV_VERDICTS) {
    verdictByKey.set(jevVerdictKey(displayPath, "tiny", criterion), verdict);
  }
  const jev: JevVerdicts = { model: "jev-test", verdictByKey };
  return {
    repositoryDirectory: repository,
    criticRunsDirectory: runsDirectory,
    skillCommit: COMMIT,
    readJevVerdicts: async () => {
      jevCalls.count += 1;
      return jev;
    },
    replayPraiseText: async () => PRAISE_TEXT_PASSED,
  };
}

describe("runOverlap --replay on a small made-up set", () => {
  it("prints the four figures, the missing Jev answer, and the bar line", async () => {
    const repository = buildTinyRepository();
    const runsDirectory = newFolder();
    await seedCriticRuns(repository, runsDirectory, CRITIC_MENTIONS);
    const output = await runOverlap(
      ["--replay"],
      tinyOptions(repository, runsDirectory, { count: 0 }),
    );
    expect(output.errorText).toBe("");
    expect(output.exitCode).toBe(0);
    const text = output.text;
    expect(text).toContain(
      "images: 6, the variant-1 pair of each live criterion; 3 show the defect and 3 do not",
    );
    expect(text).toContain(
      "images with no Jev answer: 1\n  packs/tiny/fixtures/gamma.negative.png (tiny/gamma): Jev no answer, critic not_mentioned\n",
    );
    expect(text).toContain(
      "1. Jev fires: 3 of 5 images with a Jev answer; 2 on images that show the defect, 1 on images that do not",
    );
    expect(text).toContain(
      "2. Jev's fires on images that show the defect that the critic also raised: 50.0% (1/2)\n   the critic missed: 1\n    packs/tiny/fixtures/beta.positive.png (tiny/beta): Jev warn, critic not_mentioned\n",
    );
    expect(text).toContain(
      "3. defects the critic raised that Jev left quiet, on images that show the defect: 1\n    packs/tiny/fixtures/gamma.positive.png (tiny/gamma): Jev pass, critic present\n",
    );
    expect(text).toContain(
      "4. praise-text (EV-16): passed 14, failed 0, inconclusive 0 of 14\n",
    );
    expect(text).toContain(
      "Here the share is 50.0%, below 95%, and praise-text has no failed pair.",
    );
  });

  it("exits 2 and names a missing judge answer, and never reads Jev", async () => {
    const repository = buildTinyRepository();
    const runsDirectory = newFolder();
    const withoutBeta = new Map(CRITIC_MENTIONS);
    withoutBeta.delete("packs/tiny/fixtures/beta.positive.png");
    await seedCriticRuns(repository, runsDirectory, withoutBeta);
    const jevCalls = { count: 0 };
    const output = await runOverlap(
      ["--replay"],
      tinyOptions(repository, runsDirectory, jevCalls),
    );
    expect(output.exitCode).toBe(2);
    expect(output.text).toBe("");
    expect(output.errorText).toContain(
      "missing judge answer: tiny/beta, packs/tiny/fixtures/beta.positive.png",
    );
    expect(jevCalls.count).toBe(0);
  });

  it("exits 2 with the help text without --replay", async () => {
    const repository = buildTinyRepository();
    const output = await runOverlap(
      [],
      tinyOptions(repository, newFolder(), { count: 0 }),
    );
    expect(output.exitCode).toBe(2);
    expect(output.errorText).toContain(
      "Usage:\n  node evals/critic/overlap.ts --replay",
    );
  });
});

describe("runOverlap --replay on the real repository", () => {
  it("exits 0 and prints the code block in evals/critic/RESULTS.md", async () => {
    const output = await runOverlap(
      ["--replay"],
      defaultOverlapOptions(REPOSITORY_DIRECTORY),
    );
    expect(output.errorText).toBe("");
    expect(output.exitCode).toBe(0);
    const results = readFileSync(
      join(REPOSITORY_DIRECTORY, "evals", "critic", "RESULTS.md"),
      "utf8",
    );
    // The text between the first ``` line and the next one.
    const codeBlock = /\n```\n([\s\S]*?)```\n/.exec(results)?.[1];
    expect(output.text).toBe(codeBlock);
  }, 300_000);
});
