// Unit tests of the detection evaluation (EV-14). A plain stub stands in for the `claude` child
// process, for both the critic and the judge, so no model is asked (CS-21, CS-22). Each test works
// in its own temporary folder, which afterEach removes, and reads the real packs, labels, and
// removed-fixture manifest unless it builds a small repository of its own. No test depends on the
// git state of the skill folder: each passes --skill-commit.

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
import { basename, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  addCounts,
  addJudgedImage,
  buildDetectionQuestion,
  buildRows,
  type DetectionAnswer,
  type DetectionCounts,
  type DetectionCriterion,
  type FixtureImage,
  formatRate,
  imageTruth,
  judgeRule,
  parseDetectionAnswer,
  readLiveCriteria,
  readRemovedCriteria,
  runDetect,
  selectCriteria,
  selectPairs,
} from "./detect.ts";
import { ensureJudgeAnswer } from "./judge.ts";
import {
  type ClaudeRunner,
  currentRunIdentity,
  readSavedCrits,
  type SavedCrit,
} from "./run-critic.ts";

const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const REPOSITORY_DIRECTORY = join(import.meta.dirname, "..", "..");
const SKILL_DIRECTORY = join(
  REPOSITORY_DIRECTORY,
  "plugin",
  "skills",
  "design-critic",
);

/** The temp folders this test file made; afterEach removes them. */
const temporaryFolders: string[] = [];

afterEach(() => {
  for (const folder of temporaryFolders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

/** Makes a new empty temp folder for one test. */
function newFolder(): string {
  const folder = mkdtempSync(join(tmpdir(), "crit-detect-test-"));
  temporaryFolders.push(folder);
  return folder;
}

/** A runner that fails the test if anything calls it. */
const throwingRunner: ClaudeRunner = async () => {
  throw new Error("the runner must not be called");
};

/** Returns the SHA-256 of a file, which is the request key of a one-image request. */
function fileKey(absolutePath: string): string {
  return createHash("sha256").update(readFileSync(absolutePath)).digest("hex");
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

/** Returns stdout in the shape a critic call prints, holding the given crit. */
function criticStdout(crit: string): string {
  return JSON.stringify({
    type: "result",
    subtype: "success",
    is_error: false,
    result: crit,
    modelUsage: { "claude-opus-5-5": {} },
  });
}

/** Returns a judge answer with the given mention. */
function answerSaying(
  mention: DetectionAnswer["says_defect"],
): DetectionAnswer {
  return { reason: "stub", says_defect: mention };
}

/** Returns an image of a made-up criterion for the pure-function tests. */
function fakeImage(
  variant: number,
  polarity: "positive" | "negative",
  labelPath?: string,
): FixtureImage {
  return {
    displayPath: `fake/${variant}.${polarity}.png`,
    absolutePath: `/fake/${variant}.${polarity}.png`,
    variant,
    polarity,
    labelPath,
  };
}

/** Returns a made-up live criterion with the given images. */
function fakeCriterion(images: FixtureImage[]): DetectionCriterion {
  return {
    group: "live",
    pack: "fakepack",
    id: "fake-criterion",
    title: "A fake defect",
    question: "In the image at screenshot: Is it fake?",
    removedBecause: undefined,
    images,
  };
}

/**
 * Builds a small repository in a temp folder: one live pack `tiny` with two criteria (one with a
 * label file row), one `_hidden` folder, a `node_modules` folder, and a removed-fixture manifest
 * with one criterion. The images are copies of real fixture PNGs with distinct bytes.
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
  const names = [
    "alpha.positive.png",
    "alpha.negative.png",
    "beta.positive.png",
    "beta.negative.png",
  ];
  names.forEach((name, index) => {
    copyFileSync(
      join(realFixtures, pngs[index] ?? ""),
      join(fixturesDirectory, name),
    );
  });
  writeFileSync(
    join(repository, "packs", "tiny", "pack.yaml"),
    `criteria:
  - id: alpha
    title: 'Alpha defect'
    question:
      instructions: 'In the image at screenshot: Is alpha there?'
    fixtures:
      positive: [fixtures/alpha.positive.png]
      negative: [fixtures/alpha.negative.png]
  - id: beta
    title: 'Beta defect'
    question:
      instructions: 'In the image at screenshot: Is beta there?'
    fixtures:
      positive: [fixtures/beta.positive.png]
      negative: [fixtures/beta.negative.png]
`,
  );
  mkdirSync(join(repository, "packs", "_hidden"), { recursive: true });
  writeFileSync(
    join(repository, "packs", "_hidden", "pack.yaml"),
    "criteria: []\n",
  );
  mkdirSync(join(repository, "packs", "node_modules", "thing"), {
    recursive: true,
  });
  mkdirSync(join(repository, "evals", "agreement", "labels"), {
    recursive: true,
  });
  writeFileSync(
    join(repository, "evals", "agreement", "labels", "tiny.csv"),
    "fixture,criterion,defect_present\nfixtures/beta.negative.png,beta,yes\n",
  );
  const removedDirectory = join(
    repository,
    "evals",
    "critic",
    "removed-fixtures",
  );
  mkdirSync(join(removedDirectory, "tiny"), { recursive: true });
  const manifest = [];
  for (const [index, polarity] of (
    ["positive", "negative"] as const
  ).entries()) {
    const file = `tiny/gamma.${polarity}.png`;
    copyFileSync(
      join(realFixtures, pngs[4 + index] ?? ""),
      join(removedDirectory, file),
    );
    manifest.push({
      file,
      pack: "tiny",
      criterion: "gamma",
      variant: 1,
      polarity,
      source_commit: "x",
      removal_commit: "y",
      removed_because: "no-source",
      sha256: fileKey(join(removedDirectory, file)),
      title: "Gamma defect",
      question: "In the image at screenshot: Is gamma there?",
    });
  }
  writeFileSync(
    join(removedDirectory, "manifest.json"),
    JSON.stringify(manifest),
  );
  return repository;
}

/**
 * Saves a crit for every selected image of a repository and, unless `skip` names the image's
 * display path, a judge answer: present for an image that shows the defect, absent otherwise.
 */
async function seedRuns(
  repository: string,
  runsDirectory: string,
  skip: readonly string[],
): Promise<void> {
  const { selected } = selectCriteria(repository, 1);
  for (const entry of selected) {
    for (const scoredImage of entry.scored) {
      const key = fileKey(scoredImage.image.absolutePath);
      if (readSavedCrits(runsDirectory, COMMIT, key).length === 0) {
        writeSavedCrit(
          runsDirectory,
          key,
          `Crit of ${basename(scoredImage.image.absolutePath)}.`,
        );
      }
      if (skip.includes(scoredImage.image.displayPath)) {
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
      const answer = answerSaying(
        scoredImage.truth === "shows-defect" ? "present" : "absent",
      );
      await ensureJudgeAnswer(question, parseDetectionAnswer, {
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
}

/** Runs the replay on a repository and runs folder with a runner that throws if called. */
function replay(repository: string, runsDirectory: string) {
  return runDetect(["--replay", "--skill-commit", COMMIT], {
    repositoryDirectory: repository,
    runsDirectory,
    skillDirectory: SKILL_DIRECTORY,
    runClaude: throwingRunner,
  });
}

describe("reading the real criteria", () => {
  it("finds 37 live criteria in 8 packs, each with a variant-1 pair, and skips _ folders and node_modules", () => {
    const live = readLiveCriteria(REPOSITORY_DIRECTORY);
    expect(live).toHaveLength(37);
    const packs = new Set(live.map((criterion) => criterion.pack));
    expect(packs.size).toBe(8);
    for (const pack of packs) {
      expect(pack.startsWith("_")).toBe(false);
      expect(pack).not.toBe("node_modules");
    }
    for (const criterion of live) {
      const pick = selectPairs(criterion, 1);
      expect(
        pick.images.map((image) => [image.variant, image.polarity]),
      ).toEqual([
        [1, "positive"],
        [1, "negative"],
      ]);
    }
  });

  it("finds 40 removed criteria in the manifest, each with a variant-1 pair", () => {
    const removed = readRemovedCriteria(REPOSITORY_DIRECTORY);
    expect(removed).toHaveLength(40);
    for (const criterion of removed) {
      expect(selectPairs(criterion, 1).images).toHaveLength(2);
    }
  });

  it("skips _ folders and node_modules in a small repository", () => {
    const repository = buildTinyRepository();
    const live = readLiveCriteria(repository);
    expect(
      live.map((criterion) => `${criterion.pack}/${criterion.id}`),
    ).toEqual(["tiny/alpha", "tiny/beta"]);
  });

  it("throws on a fixture path that names another criterion or has the wrong polarity", () => {
    const repository = buildTinyRepository();
    const packPath = join(repository, "packs", "tiny", "pack.yaml");
    const text = readFileSync(packPath, "utf8");
    writeFileSync(
      packPath,
      text.replace(
        "positive: [fixtures/beta.positive.png]",
        "positive: [fixtures/alpha.positive.png]",
      ),
    );
    expect(() => readLiveCriteria(repository)).toThrow(
      "listed under criterion beta but names alpha",
    );
    writeFileSync(
      packPath,
      text.replace(
        "negative: [fixtures/alpha.negative.png]",
        "negative: [fixtures/alpha.positive.png]",
      ),
    );
    expect(() => readLiveCriteria(repository)).toThrow(
      "in the negative list but its name says positive",
    );
  });
});

describe("reading the label files", () => {
  /** Writes one label row for the tiny pack and returns the replay promise. */
  function replayWithLabel(row: string) {
    const repository = buildTinyRepository();
    writeFileSync(
      join(repository, "evals", "agreement", "labels", "tiny.csv"),
      `fixture,criterion,defect_present\n${row}\n`,
    );
    return replay(repository, newFolder());
  }

  it("throws on a row whose criterion the pack lacks", async () => {
    await expect(
      replayWithLabel("fixtures/alpha.positive.png,no-such,yes"),
    ).rejects.toThrow("the pack has no criterion no-such");
  });

  it("throws on a row whose fixture the pack lacks", async () => {
    await expect(
      replayWithLabel("fixtures/alpha--9.positive.png,alpha,yes"),
    ).rejects.toThrow(
      "the pack lists no fixture fixtures/alpha--9.positive.png",
    );
  });

  it("throws on a row whose fixture is listed under another criterion", async () => {
    await expect(
      replayWithLabel("fixtures/beta.positive.png,alpha,yes"),
    ).rejects.toThrow(
      "fixtures/beta.positive.png is not listed under criterion alpha",
    );
  });

  it("accepts every real label file", () => {
    expect(() => selectCriteria(REPOSITORY_DIRECTORY, 1)).not.toThrow();
  });
});

describe("selectPairs", () => {
  const criterion = fakeCriterion([
    fakeImage(10, "positive"),
    fakeImage(10, "negative"),
    fakeImage(9, "positive"),
    fakeImage(9, "negative"),
    fakeImage(1, "positive"),
    fakeImage(1, "negative"),
    fakeImage(2, "positive"),
  ]);

  it("gives variant 1 at N = 1", () => {
    expect(
      selectPairs(criterion, 1).images.map((image) => image.variant),
    ).toEqual([1, 1]);
  });

  it("sorts 10 after 9 and skips a variant with no negative", () => {
    const pick = selectPairs(criterion, 3);
    expect(pick.images.map((image) => image.variant)).toEqual([
      1, 1, 9, 9, 10, 10,
    ]);
    expect(pick.shortOfPairs).toBe(false);
  });

  it("returns every pair and says so when N is too large", () => {
    const pick = selectPairs(criterion, 5);
    expect(pick.images).toHaveLength(6);
    expect(pick.shortOfPairs).toBe(true);
  });
});

describe("imageTruth", () => {
  /** Returns a label map holding one label for the fake criterion. */
  function labelsFor(
    fixture: string,
    defectPresent: "yes" | "no" | "cannot tell",
  ) {
    return new Map([
      [
        `fakepack|${fixture}|fake-criterion`,
        { fixture, criterion: "fake-criterion", defect_present: defectPresent },
      ],
    ]);
  }
  const positive = fakeImage(
    1,
    "positive",
    "fixtures/fake-criterion.positive.png",
  );
  const negative = fakeImage(
    1,
    "negative",
    "fixtures/fake-criterion.negative.png",
  );
  const criterion = fakeCriterion([positive, negative]);

  it("uses yes and no labels, and a label that flips the file name wins", () => {
    expect(
      imageTruth(
        criterion,
        positive,
        labelsFor(positive.labelPath ?? "", "yes"),
      ),
    ).toBe("shows-defect");
    expect(
      imageTruth(
        criterion,
        negative,
        labelsFor(negative.labelPath ?? "", "no"),
      ),
    ).toBe("no-defect");
    expect(
      imageTruth(
        criterion,
        negative,
        labelsFor(negative.labelPath ?? "", "yes"),
      ),
    ).toBe("shows-defect");
    expect(
      imageTruth(
        criterion,
        positive,
        labelsFor(positive.labelPath ?? "", "no"),
      ),
    ).toBe("no-defect");
  });

  it("leaves out an image labeled cannot tell", () => {
    expect(
      imageTruth(
        criterion,
        positive,
        labelsFor(positive.labelPath ?? "", "cannot tell"),
      ),
    ).toBe("left-out");
  });

  it("uses the file name when there is no row", () => {
    expect(imageTruth(criterion, positive, new Map())).toBe("shows-defect");
    expect(
      imageTruth(
        criterion,
        negative,
        labelsFor(positive.labelPath ?? "", "no"),
      ),
    ).toBe("no-defect");
  });

  it("never runs an image labeled cannot tell, and counts it as left out", async () => {
    const repository = buildTinyRepository();
    writeFileSync(
      join(repository, "evals", "agreement", "labels", "tiny.csv"),
      "fixture,criterion,defect_present\nfixtures/alpha.positive.png,alpha,cannot tell\n",
    );
    const runsDirectory = newFolder();
    let criticCalls = 0;
    const stub: ClaudeRunner = async (args) => {
      if (args[0] === "--version") {
        return { stdout: "2.0.0 (Claude Code)", stderr: "", exitCode: 0 };
      }
      if (args.includes("--json-schema")) {
        return {
          stdout: judgeStdout(answerSaying("absent")),
          stderr: "",
          exitCode: 0,
        };
      }
      criticCalls += 1;
      return { stdout: criticStdout("A crit."), stderr: "", exitCode: 0 };
    };
    const output = await runDetect(["--skill-commit", COMMIT], {
      repositoryDirectory: repository,
      runsDirectory,
      skillDirectory: SKILL_DIRECTORY,
      runClaude: stub,
    });
    expect(output.exitCode).toBe(0);
    expect(criticCalls).toBe(5);
    expect(output.text).toMatch(
      /^live +tiny +alpha +- \(0\/0\) +1\.00 \(1\/1\) +1$/m,
    );
  });
});

describe("the judge prompt", () => {
  const savedCrit: SavedCrit = {
    runNumber: 1,
    critPath: "",
    metadataPath: "",
    metadata: {},
    crit: "CRIT BODY",
  };

  it("for every real criterion holds the title and no polarity, file name, id, or pack path", () => {
    const criteria = [
      ...readLiveCriteria(REPOSITORY_DIRECTORY),
      ...readRemovedCriteria(REPOSITORY_DIRECTORY),
    ];
    expect(criteria).toHaveLength(77);
    for (const criterion of criteria) {
      const question = buildDetectionQuestion(
        criterion.title,
        judgeRule(criterion.question),
        "key",
        savedCrit,
      );
      const prompt = question.prompt;
      expect(prompt).toContain(`Possible defect: ${criterion.title}\n`);
      expect(prompt).toContain("CRIT BODY");
      expect(prompt).not.toMatch(/In the image at screenshot/i);
      for (const forbidden of [
        "positive",
        "negative",
        ".png",
        "fixtures/",
        criterion.id,
        `${criterion.pack}/`,
        `/${criterion.pack}`,
      ]) {
        expect(prompt.toLowerCase()).not.toContain(forbidden.toLowerCase());
      }
      for (const image of criterion.images) {
        expect(prompt).not.toContain(basename(image.absolutePath, ".png"));
      }
      expect(prompt).not.toContain("Judge only what is visible");
      expect(prompt).toContain(
        "A defect that is plainly the same one in other words counts. A different problem in the same area, or a general remark about the topic, is not_mentioned. Answer present, absent or not_mentioned.",
      );
      expect(question.crits).toEqual([{ key: "key", run: 1 }]);
    }
  });

  it("removes the leading screenshot phrase from the rule", () => {
    expect(judgeRule("In the image at screenshot: Is it bad?")).toBe(
      "Is it bad?",
    );
    expect(judgeRule("in the image at screenshot, is it bad?")).toBe(
      "is it bad?",
    );
  });

  it("removes the trailing instruction to judge only what is visible", () => {
    expect(
      judgeRule(
        "In the image at screenshot: Is it bad? Judge only what is visible.",
      ),
    ).toBe("Is it bad?");
  });
});

describe("scoring", () => {
  it("counts raised and quiet images and formats the cells", () => {
    const counts: DetectionCounts = {
      raisedOnPositive: 0,
      positivesJudged: 0,
      quietOnNegative: 0,
      negativesJudged: 0,
      leftOut: 0,
    };
    addJudgedImage(counts, "shows-defect", answerSaying("present"));
    addJudgedImage(counts, "shows-defect", answerSaying("absent"));
    addJudgedImage(counts, "no-defect", answerSaying("not_mentioned"));
    addJudgedImage(counts, "no-defect", answerSaying("absent"));
    addJudgedImage(counts, "no-defect", answerSaying("present"));
    expect(counts).toEqual({
      raisedOnPositive: 1,
      positivesJudged: 2,
      quietOnNegative: 2,
      negativesJudged: 3,
      leftOut: 0,
    });
    expect(formatRate(1, 2)).toBe("0.50 (1/2)");
    expect(formatRate(0, 0)).toBe("- (0/0)");
  });

  it("adds counts across images in the four total rows", () => {
    /** Returns a selected criterion of a group and removal reason with no images. */
    function entry(
      group: "live" | "removed",
      reason: string | undefined,
      id: string,
    ) {
      return {
        criterion: { ...fakeCriterion([]), group, id, removedBecause: reason },
        scored: [],
        leftOutCount: 0,
      };
    }
    const selected = [
      entry("live", undefined, "a"),
      entry("live", undefined, "b"),
      entry("removed", "jev-quiet", "c"),
      entry("removed", "no-source", "d"),
    ];
    const counts: DetectionCounts[] = [
      {
        raisedOnPositive: 1,
        positivesJudged: 1,
        quietOnNegative: 0,
        negativesJudged: 1,
        leftOut: 0,
      },
      {
        raisedOnPositive: 0,
        positivesJudged: 3,
        quietOnNegative: 1,
        negativesJudged: 1,
        leftOut: 1,
      },
      {
        raisedOnPositive: 1,
        positivesJudged: 1,
        quietOnNegative: 1,
        negativesJudged: 1,
        leftOut: 0,
      },
      {
        raisedOnPositive: 0,
        positivesJudged: 1,
        quietOnNegative: 1,
        negativesJudged: 1,
        leftOut: 0,
      },
    ];
    const rows = buildRows(selected, counts, true);
    expect(rows.slice(4)).toEqual([
      ["live total", "", "", "0.25 (1/4)", "0.50 (1/2)", "1"],
      ["removed total (jev-quiet)", "", "", "1.00 (1/1)", "1.00 (1/1)", "0"],
      ["removed total (no-source)", "", "", "0.00 (0/1)", "1.00 (1/1)", "0"],
      ["removed total", "", "", "0.50 (1/2)", "1.00 (2/2)", "0"],
    ]);
    const total: DetectionCounts = {
      raisedOnPositive: 0,
      positivesJudged: 0,
      quietOnNegative: 0,
      negativesJudged: 0,
      leftOut: 0,
    };
    for (const count of counts) {
      addCounts(total, count);
    }
    expect(total.positivesJudged).toBe(6);
  });

  it("rejects a judge answer outside present, absent, and not_mentioned", () => {
    expect(() =>
      parseDetectionAnswer({ reason: "r", says_defect: "maybe" }),
    ).toThrow("wrong shape");
  });
});

describe("runDetect --replay", () => {
  it("on the real repository prints one row per criterion and the totals, and exits 0", async () => {
    const runsDirectory = newFolder();
    await seedRuns(REPOSITORY_DIRECTORY, runsDirectory, []);
    const output = await replay(REPOSITORY_DIRECTORY, runsDirectory);
    expect(output.errorText).toBe("");
    expect(output.exitCode).toBe(0);
    expect(output.text).toContain("raised-on-positive");
    expect(output.text).toContain("quiet-on-negative");
    const { selected } = selectCriteria(REPOSITORY_DIRECTORY, 1);
    for (const entry of selected) {
      const criterion = entry.criterion;
      expect(output.text).toMatch(
        new RegExp(
          `^${criterion.group} +${criterion.pack} +${criterion.id} +`,
          "m",
        ),
      );
    }
    // The seeded judge says present exactly where the image shows the defect, so every rate is 1.
    expect(output.text).toMatch(
      /^live total +1\.00 \(\d+\/\d+\) +1\.00 \(\d+\/\d+\) +0$/m,
    );
    expect(output.text).toMatch(
      /^removed total \(jev-quiet\) +1\.00 \(31\/31\) +1\.00 \(31\/31\) +0$/m,
    );
    expect(output.text).toMatch(
      /^removed total \(no-source\) +1\.00 \(9\/9\) +1\.00 \(9\/9\) +0$/m,
    );
    expect(output.text).toMatch(
      /^removed total +1\.00 \(40\/40\) +1\.00 \(40\/40\) +0$/m,
    );
    expect(output.text).toContain(
      `skill commit ${COMMIT}, judge model claude-opus-5-5, pairs per criterion 1`,
    );
    expect(output.text).toContain("182 of 210 positive fixtures fired");
  });

  it("exits 2, prints missing cells and no totals, and names a missing judge answer", async () => {
    const repository = buildTinyRepository();
    const runsDirectory = newFolder();
    await seedRuns(repository, runsDirectory, [
      "packs/tiny/fixtures/beta.negative.png",
    ]);
    const output = await replay(repository, runsDirectory);
    expect(output.exitCode).toBe(2);
    expect(output.text).toMatch(/^live +tiny +beta +missing +missing +0$/m);
    expect(output.text).not.toContain("live total");
    expect(output.errorText).toContain(
      "missing judge answer: tiny/beta, packs/tiny/fixtures/beta.negative.png",
    );
  });

  it("scores a label that flips the file name the label's way", async () => {
    const repository = buildTinyRepository();
    const runsDirectory = newFolder();
    await seedRuns(repository, runsDirectory, []);
    const output = await replay(repository, runsDirectory);
    expect(output.exitCode).toBe(0);
    // beta.negative.png is labeled yes, so beta has two images that show the defect and none without it.
    expect(output.text).toMatch(
      /^live +tiny +beta +1\.00 \(2\/2\) +- \(0\/0\) +0$/m,
    );
    expect(output.text).toMatch(
      /^removed total \(no-source\) +1\.00 \(1\/1\) +1\.00 \(1\/1\) +0$/m,
    );
  });

  it("exits 2 on an empty runs folder and names each missing crit", async () => {
    const output = await replay(REPOSITORY_DIRECTORY, newFolder());
    expect(output.exitCode).toBe(2);
    expect(output.errorText.match(/^missing crit: /gm)).toHaveLength(154);
    expect(output.errorText).toContain("missing crit: layout/");
    expect(output.text).not.toContain("removed total");
  });
});

describe("runDetect live, with a stub critic and a stub judge", () => {
  it("makes 2 critic calls per criterion, prints the plan, and a second run makes no call", async () => {
    const repository = buildTinyRepository();
    const runsDirectory = newFolder();
    let criticCalls = 0;
    let judgeCalls = 0;
    const stub: ClaudeRunner = async (args) => {
      if (args[0] === "--version") {
        return { stdout: "2.0.0 (Claude Code)", stderr: "", exitCode: 0 };
      }
      if (args.includes("--json-schema")) {
        judgeCalls += 1;
        return {
          stdout: judgeStdout(answerSaying("not_mentioned")),
          stderr: "",
          exitCode: 0,
        };
      }
      criticCalls += 1;
      return {
        stdout: criticStdout(`Crit number ${criticCalls}.`),
        stderr: "",
        exitCode: 0,
      };
    };
    const progress: string[] = [];
    const options = {
      repositoryDirectory: repository,
      runsDirectory,
      skillDirectory: SKILL_DIRECTORY,
      runClaude: stub,
      reportProgress: (line: string) => {
        progress.push(line);
      },
    };
    const first = await runDetect(["--skill-commit", COMMIT], options);
    expect(first.exitCode).toBe(0);
    expect(criticCalls).toBe(6);
    expect(judgeCalls).toBe(6);
    expect(progress).toEqual([
      "plan: 3 criteria, 6 critic runs and 6 judge calls to make (0 crits and 0 judge answers already saved), at most 4 at once",
    ]);

    const second = await runDetect(["--skill-commit", COMMIT], options);
    expect(second.exitCode).toBe(0);
    expect(criticCalls).toBe(6);
    expect(judgeCalls).toBe(6);
    expect(progress[1]).toBe(
      "plan: 3 criteria, 0 critic runs and 0 judge calls to make (6 crits and 6 judge answers already saved), at most 4 at once",
    );

    const replayed = await replay(repository, runsDirectory);
    expect(replayed.exitCode).toBe(0);
    expect(replayed.text).toBe(second.text);
  });
});

describe("runDetect --facts", () => {
  it("runs the live criteria with their facts files apart from the runs without, and prints both side by side", async () => {
    const repository = buildTinyRepository();
    const runsDirectory = newFolder();
    const factsDirectory = join(repository, "evals", "critic", "facts", "tiny");
    mkdirSync(factsDirectory, { recursive: true });
    for (const name of ["alpha", "beta"]) {
      for (const polarity of ["positive", "negative"]) {
        writeFileSync(
          join(factsDirectory, `${name}.${polarity}.facts.json`),
          `{"version":1,"source":"page.html","n":"${name}${polarity}"}\n`,
        );
      }
    }
    const critPrompts: string[] = [];
    const stub: ClaudeRunner = async (args, _environment, cwd) => {
      if (args[0] === "--version") {
        return { stdout: "2.0.0 (Claude Code)", stderr: "", exitCode: 0 };
      }
      if (args.includes("--json-schema")) {
        return {
          stdout: judgeStdout(answerSaying("present")),
          stderr: "",
          exitCode: 0,
        };
      }
      critPrompts.push(
        `${args.at(-1) ?? ""}\nfiles: ${readdirSync(cwd).sort().join(",")}`,
      );
      return {
        stdout: criticStdout(`Crit ${critPrompts.length}.`),
        stderr: "",
        exitCode: 0,
      };
    };
    const options = {
      repositoryDirectory: repository,
      runsDirectory,
      skillDirectory: SKILL_DIRECTORY,
      runClaude: stub,
    };
    const without = await runDetect(["--skill-commit", COMMIT], options);
    expect(without.exitCode).toBe(0);
    expect(critPrompts).toHaveLength(6);
    expect(critPrompts.join("\n")).not.toContain("Measured facts file");

    const withFacts = await runDetect(
      ["--skill-commit", COMMIT, "--facts"],
      options,
    );
    expect(withFacts.exitCode).toBe(0);
    // Only the 4 live images, each a new run, each with facts.json beside the image.
    expect(critPrompts).toHaveLength(10);
    for (const prompt of critPrompts.slice(6)) {
      expect(prompt).toMatch(/\nMeasured facts file: .*\/facts\.json\n/);
      expect(prompt).toContain("files: facts.json,image-1.png");
    }
    expect(withFacts.text).toContain(
      `skill commit ${COMMIT}, with measured facts (live criteria only)`,
    );
    expect(withFacts.text).not.toMatch(/^removed +tiny +gamma/m);

    const replayed = await runDetect(
      ["--replay", "--skill-commit", COMMIT, "--facts", "--beside", COMMIT],
      { ...options, runClaude: throwingRunner },
    );
    expect(replayed.errorText).toBe("");
    expect(replayed.exitCode).toBe(0);
    expect(replayed.text).toContain("01234567 raised");
    expect(replayed.text).toContain("01234567+facts raised");
    // Without facts the label flips beta.negative to shows-defect, so beta has 2 positives.
    expect(replayed.text).toMatch(/^tiny +alpha +1\/1 +0\/1 +1\/1 +0\/1$/m);
    expect(replayed.text).toMatch(/^total +3\/3 +0\/1 +3\/3 +0\/1$/m);
  });

  it("stops when an image has no facts file", async () => {
    const repository = buildTinyRepository();
    await expect(
      runDetect(["--replay", "--skill-commit", COMMIT, "--facts"], {
        repositoryDirectory: repository,
        runsDirectory: newFolder(),
        skillDirectory: SKILL_DIRECTORY,
        runClaude: throwingRunner,
      }),
    ).rejects.toThrow(
      /no facts file for packs\/tiny\/fixtures\/alpha\.positive\.png/,
    );
  });
});
