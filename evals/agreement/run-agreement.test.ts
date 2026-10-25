// The live and replay paths of the agreement harness end to end, with crit run in-process on the
// stub adapter, so no request reaches TypeSafe (EV-4 rule 5, crit-cy8.43). The test builds a small
// pack in a temporary folder, scores it, adds a criterion, and scores it again.

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStubAdapter } from "../../src/ask/stub.ts";
import { main as critMain } from "../../src/cli/main.ts";
import { hashCriterionQuestion } from "./question-hash.ts";
import {
  type CritRun,
  type CritRunner,
  type HarnessOptions,
  main as harnessMain,
  runHarness,
} from "./run-agreement.ts";

/**
 * One criterion of the test pack: its id, a background colour for each of its two fixtures, the
 * start of its fixture file names, which is the id unless a test renames the criterion, and its
 * question text, which a test changes to reword the criterion.
 */
type TestCriterion = {
  readonly id: string;
  readonly positiveColour: string;
  readonly negativeColour: string;
  readonly fixtureStem?: string;
  readonly instructions?: string;
};

/** Return the start of a criterion's fixture file names. */
function fixtureStemOf(criterion: TestCriterion): string {
  return criterion.fixtureStem ?? criterion.id;
}

const FIRST: TestCriterion = {
  id: "first",
  positiveColour: "#ff0000",
  negativeColour: "#00ff00",
};
const SECOND: TestCriterion = {
  id: "second",
  positiveColour: "#0000ff",
  negativeColour: "#ffff00",
};
const THIRD: TestCriterion = {
  id: "third",
  positiveColour: "#ff00ff",
  negativeColour: "#00ffff",
};

/** Return the pack.yaml text of a pack named demo with these criteria (FR-44, PRD 7.8). */
function packYaml(criteria: readonly TestCriterion[]): string {
  const lines = [
    "name: demo",
    "version: 0.1.0",
    "title: Demo pack for the harness test",
    "license: MIT",
    "criteria:",
  ];
  for (const criterion of criteria) {
    lines.push(
      `  - id: ${criterion.id}`,
      `    title: 'The ${criterion.id} defect'`,
      "    source: 'W3C, WCAG 2.2, SC 1.4.3 Contrast (Minimum).'",
      "    question:",
      "      type: noul",
      `      instructions: '${criterion.instructions ?? `In the image at screenshot: Is the ${criterion.id} defect there?`}'`,
      "      criteria:",
      `        "true": 'The ${criterion.id} defect is there.'`,
      `        "false": 'The ${criterion.id} defect is not there.'`,
      "    fail_when: { probability_at_least: 0.7 }",
      "    pass_when: { probability_at_most: 0.3 }",
      `    fix: 'Remove the ${criterion.id} defect.'`,
      "    fixtures:",
      "      positive:",
      `        - fixtures/${fixtureStemOf(criterion)}.positive.png`,
      "      negative:",
      `        - fixtures/${fixtureStemOf(criterion)}.negative.png`,
    );
  }
  return `${lines.join("\n")}\n`;
}

/**
 * Write the pack's pack.yaml, its fixture PNGs, and, unless writeRenderedJson is false, a
 * rendered.json that names their hashes. A pack with no rendered.json has no frozen set, so the
 * guard checks only the saved answers.
 */
async function writePack(
  packDirectory: string,
  criteria: readonly TestCriterion[],
  writeRenderedJson = true,
): Promise<void> {
  const fixturesDirectory = join(packDirectory, "fixtures");
  mkdirSync(fixturesDirectory, { recursive: true });
  writeFileSync(join(packDirectory, "pack.yaml"), packYaml(criteria));
  const records: { fixture: string; png_sha256: string }[] = [];
  for (const criterion of criteria) {
    const images = [
      { kind: "positive", colour: criterion.positiveColour },
      { kind: "negative", colour: criterion.negativeColour },
    ];
    for (const image of images) {
      const fileName = `${fixtureStemOf(criterion)}.${image.kind}.png`;
      const png = await sharp({
        create: {
          width: 400,
          height: 300,
          channels: 3,
          background: image.colour,
        },
      })
        .png()
        .toBuffer();
      writeFileSync(join(fixturesDirectory, fileName), png);
      records.push({
        fixture: fileName,
        png_sha256: createHash("sha256").update(png).digest("hex"),
      });
    }
  }
  if (writeRenderedJson) {
    writeFileSync(
      join(fixturesDirectory, "rendered.json"),
      JSON.stringify(records),
    );
  }
}

/** Run a step with stdout, stderr, and the exit code caught, and put them back afterwards. */
async function catchOutput(step: () => Promise<void>): Promise<CritRun> {
  let stdout = "";
  let stderr = "";
  const stdoutSpy = vi
    .spyOn(process.stdout, "write")
    .mockImplementation((chunk: string | Uint8Array) => {
      stdout += String(chunk);
      return true;
    });
  const stderrSpy = vi
    .spyOn(process.stderr, "write")
    .mockImplementation((chunk: string | Uint8Array) => {
      stderr += String(chunk);
      return true;
    });
  const exitCodeBefore = process.exitCode;
  // Clear the exit code, so a step that sets none reads as 0.
  process.exitCode = undefined;
  try {
    await step();
    const exitCode = process.exitCode;
    return {
      stdout,
      stderr,
      exitCode: typeof exitCode === "number" ? exitCode : 0,
    };
  } finally {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    process.exitCode = exitCodeBefore;
  }
}

/** Return the SHA-256 of every file in a folder, keyed by file name, to check nothing changed. */
function hashFiles(directory: string): Map<string, string> {
  const hashes = new Map<string, string>();
  for (const fileName of readdirSync(directory)) {
    const bytes = readFileSync(join(directory, fileName));
    hashes.set(fileName, createHash("sha256").update(bytes).digest("hex"));
  }
  return hashes;
}

/** Return the hash of a test criterion's question as packYaml writes it (EV-4 rule 5, crit-q25.23). */
function questionSha256Of(criterion: TestCriterion): string {
  return hashCriterionQuestion({
    question: {
      type: "noul",
      instructions:
        criterion.instructions ??
        `In the image at screenshot: Is the ${criterion.id} defect there?`,
      criteria: {
        true: `The ${criterion.id} defect is there.`,
        false: `The ${criterion.id} defect is not there.`,
      },
    },
  });
}

/** Return the question ids recorded in one answers file. */
function questionIdsIn(answersPath: string): string[] {
  const parsed = JSON.parse(readFileSync(answersPath, "utf8")) as {
    answers: { question_id: string }[];
  };
  return parsed.answers.map((answer) => answer.question_id);
}

/**
 * A crit runner that calls crit's main in-process with the stub adapter and records the question
 * ids of every request, so the test sees what a live run asked. While failure.fail is true, the
 * stub rejects every request, as the real adapter does when TypeSafe fails, so crit exits 2.
 */
function makeStubCritRunner(
  askedQuestionIds: string[][],
  failure: { fail: boolean },
): CritRunner {
  return async (critArguments, environment, workingDirectory) => {
    return await catchOutput(async () => {
      await critMain(
        critArguments,
        environment,
        () => {
          const stub = failure.fail
            ? createStubAdapter({ failWith: new Error("stub failure") })
            : createStubAdapter();
          return {
            askQuestions: async (request) => {
              askedQuestionIds.push(
                request.questions.map((question) => question.id),
              );
              return await stub.askQuestions(request);
            },
          };
        },
        workingDirectory,
      );
    });
  };
}

describe("the agreement harness with a criterion added to a scored pack", () => {
  let root = "";
  let packDirectory = "";
  let answersDirectory = "";
  let askedQuestionIds: string[][] = [];
  let failure = { fail: false };
  let options: HarnessOptions;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "crit-agreement-test-"));
    packDirectory = join(root, "packs", "demo");
    const harnessDirectory = join(root, "harness");
    mkdirSync(harnessDirectory, { recursive: true });
    writeFileSync(join(harnessDirectory, ".crit.yaml"), "model: stub\n");
    answersDirectory = join(
      harnessDirectory,
      "runs",
      "demo",
      "stub",
      "fixtures",
    );
    askedQuestionIds = [];
    failure = { fail: false };
    options = {
      harnessDirectory,
      runsDirectory: join(harnessDirectory, "runs"),
      labelsDirectory: join(harnessDirectory, "labels"),
      runCrit: makeStubCritRunner(askedQuestionIds, failure),
    };
    // A fake key: the stub adapter never sends it anywhere.
    vi.stubEnv("TYPESAFE_API_KEY", "test-key-not-sent");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(root, { recursive: true, force: true });
  });

  it("asks only the new pairs, keeps the old answers byte-identical, and replays them all", async () => {
    await writePack(packDirectory, [FIRST, SECOND]);
    await runHarness(["--live", "--pack", packDirectory], options);
    expect(askedQuestionIds).toEqual([
      ["demo/first", "demo/second"],
      ["demo/first", "demo/second"],
      ["demo/first", "demo/second"],
      ["demo/first", "demo/second"],
    ]);
    const before = hashFiles(answersDirectory);
    expect([...before.keys()].sort()).toEqual([
      "first.negative.png.answers.json",
      "first.negative.png.answers.questions.json",
      "first.positive.png.answers.json",
      "first.positive.png.answers.questions.json",
      "second.negative.png.answers.json",
      "second.negative.png.answers.questions.json",
      "second.positive.png.answers.json",
      "second.positive.png.answers.questions.json",
    ]);

    await writePack(packDirectory, [FIRST, SECOND, THIRD]);
    askedQuestionIds.length = 0;
    const live = await runHarness(["--live", "--pack", packDirectory], options);
    expect(askedQuestionIds).toEqual([
      ["demo/third"],
      ["demo/third"],
      ["demo/third"],
      ["demo/third"],
      ["demo/first", "demo/second", "demo/third"],
      ["demo/first", "demo/second", "demo/third"],
    ]);
    const after = hashFiles(answersDirectory);
    for (const [fileName, hash] of before) {
      expect(after.get(fileName)).toBe(hash);
    }
    expect(
      questionIdsIn(
        join(answersDirectory, "first.positive.png.answers-2.json"),
      ),
    ).toEqual(["demo/third"]);
    expect(
      questionIdsIn(join(answersDirectory, "third.positive.png.answers.json")),
    ).toEqual(["demo/first", "demo/second", "demo/third"]);
    // Every one of the 6 criterion and own-fixture rows has a verdict, so none is "not asked".
    expect(live.text).not.toContain("not asked  ");

    askedQuestionIds.length = 0;
    const replay = await runHarness(["--pack", packDirectory], options);
    expect(askedQuestionIds).toEqual([]);
    expect(replay.text).toContain("Mode: replay");
    expect(replay.text.match(/demo\/third +(positive|negative)/g)).toHaveLength(
      2,
    );
    expect(replay.text).not.toContain("not asked  ");
    // The replay counts the usage of all 10 saved files: 4 first files, 4 added, and 2 new.
    expect(replay.text).toContain("Usage: 10 requests");
  });

  it("refuses a live run with no pair left to ask and sends no request", async () => {
    // With no rendered.json there is no set hash and no scored PNG list, so the only refusal that
    // can stop this run is the one that finds every pair already answered.
    await writePack(packDirectory, [FIRST, SECOND], false);
    await runHarness(["--live", "--pack", packDirectory], options);
    askedQuestionIds.length = 0;
    await expect(
      runHarness(["--live", "--pack", packDirectory], options),
    ).rejects.toThrow(
      /every pair of a fixture and a criterion already has a saved answer with this model, so no pair is left to ask/,
    );
    expect(askedQuestionIds).toEqual([]);
  });

  it("refuses a criterion renamed on fixtures already scored and sends no request", async () => {
    await writePack(packDirectory, [FIRST, SECOND]);
    await runHarness(["--live", "--pack", packDirectory], options);
    const before = hashFiles(answersDirectory);
    // first is renamed to renamed and keeps its fixtures; third brings new PNGs, so the set as a
    // whole is new and only the rule about a criterion's own fixtures can refuse it.
    const renamed: TestCriterion = {
      ...FIRST,
      id: "renamed",
      fixtureStem: "first",
    };
    await writePack(packDirectory, [renamed, SECOND, THIRD]);
    askedQuestionIds.length = 0;
    await expect(
      runHarness(["--live", "--pack", packDirectory], options),
    ).rejects.toThrow(
      /demo\/renamed has never been scored on its own fixture fixtures\/first\.negative\.png/,
    );
    expect(askedQuestionIds).toEqual([]);
    expect(hashFiles(answersDirectory)).toEqual(before);
  });

  it("with --rerun-same-set keeps the added files when crit fails and deletes them when it succeeds", async () => {
    await writePack(packDirectory, [FIRST, SECOND]);
    await runHarness(["--live", "--pack", packDirectory], options);
    await writePack(packDirectory, [FIRST, SECOND, THIRD]);
    await runHarness(["--live", "--pack", packDirectory], options);
    const before = hashFiles(answersDirectory);
    expect(before.has("first.negative.png.answers-2.json")).toBe(true);

    failure.fail = true;
    await expect(
      runHarness(
        ["--live", "--rerun-same-set", "--pack", packDirectory],
        options,
      ),
    ).rejects.toThrow(/crit exited 2/);
    expect(hashFiles(answersDirectory)).toEqual(before);

    failure.fail = false;
    askedQuestionIds.length = 0;
    await runHarness(
      ["--live", "--rerun-same-set", "--pack", packDirectory],
      options,
    );
    expect(askedQuestionIds).toHaveLength(6);
    const after = [...hashFiles(answersDirectory).keys()].sort();
    expect(after).toEqual([
      "first.negative.png.answers.json",
      "first.negative.png.answers.questions.json",
      "first.positive.png.answers.json",
      "first.positive.png.answers.questions.json",
      "second.negative.png.answers.json",
      "second.negative.png.answers.questions.json",
      "second.positive.png.answers.json",
      "second.positive.png.answers.questions.json",
      "third.negative.png.answers.json",
      "third.negative.png.answers.questions.json",
      "third.positive.png.answers.json",
      "third.positive.png.answers.questions.json",
    ]);
    expect(
      questionIdsIn(join(answersDirectory, "first.positive.png.answers.json")),
    ).toEqual(["demo/first", "demo/second", "demo/third"]);
  });

  it("stops the replay with exit code 2 when a saved file answers a criterion no longer in the pack", async () => {
    await writePack(packDirectory, [FIRST, SECOND]);
    await runHarness(["--live", "--pack", packDirectory], options);
    await writePack(packDirectory, [FIRST]);
    const run = await catchOutput(async () => {
      await harnessMain(["--pack", packDirectory], options);
    });
    expect(run.exitCode).toBe(2);
    expect(run.stdout).toBe("");
    expect(run.stderr).toContain(
      "answers demo/second, but demo/second is not in the pack. Removing a criterion means removing its answers from the saved answers files by hand",
    );
  });

  it("asks a reworded criterion again about every fixture, keeps the old files, and replays only its new answers", async () => {
    await writePack(packDirectory, [FIRST, SECOND]);
    await runHarness(["--live", "--pack", packDirectory], options);
    const before = hashFiles(answersDirectory);

    const reworded: TestCriterion = {
      ...SECOND,
      instructions: "In the image at screenshot: Does the second defect show?",
    };
    await writePack(packDirectory, [FIRST, reworded]);
    askedQuestionIds.length = 0;
    await runHarness(["--live", "--pack", packDirectory], options);
    expect(askedQuestionIds).toEqual([
      ["demo/second"],
      ["demo/second"],
      ["demo/second"],
      ["demo/second"],
    ]);
    const after = hashFiles(answersDirectory);
    for (const [fileName, hash] of before) {
      expect(after.get(fileName)).toBe(hash);
    }
    expect(
      questionIdsIn(
        join(answersDirectory, "first.positive.png.answers-2.json"),
      ),
    ).toEqual(["demo/second"]);
    expect(
      Object.keys(
        JSON.parse(
          readFileSync(
            join(
              answersDirectory,
              "first.positive.png.answers-2.questions.json",
            ),
            "utf8",
          ),
        ),
      ),
    ).toEqual(["demo/second"]);

    askedQuestionIds.length = 0;
    // runHarness returns the text and exit code that main would print and set.
    const replay = await runHarness(["--pack", packDirectory], options);
    expect(replay.text).toContain("Mode: replay");
    expect(askedQuestionIds).toEqual([]);
    expect(replay.text).not.toContain("not asked  ");
    // Each fixture replays its first file for first and its second file for second.
    expect(replay.text).toContain("Usage: 8 requests");
    // The replay copies the first files without the old answers; the saved files never change.
    expect(hashFiles(answersDirectory)).toEqual(after);

    // A third question for the same id is refused before any request (R-4).
    const rewordedAgain: TestCriterion = {
      ...SECOND,
      instructions: "In the image at screenshot: Is there a second defect?",
    };
    await writePack(packDirectory, [FIRST, rewordedAgain]);
    await expect(
      runHarness(
        ["--live", "--rerun-same-set", "--pack", packDirectory],
        options,
      ),
    ).rejects.toThrow(
      /demo\/second .*R-4 allows one rewording per criterion id/,
    );
    expect(askedQuestionIds).toEqual([]);
    expect(hashFiles(answersDirectory)).toEqual(after);
  });

  it("asks a respelled and renamed criterion again on every fixture and replays only its new answers", async () => {
    const british: TestCriterion = {
      id: "colour-check",
      positiveColour: "#123456",
      negativeColour: "#654321",
      instructions: "In the image at screenshot: Is the colour wrong?",
    };
    const us: TestCriterion = {
      id: "color-check",
      positiveColour: british.positiveColour,
      negativeColour: british.negativeColour,
      instructions: "In the image at screenshot: Is the color wrong?",
    };
    await writePack(packDirectory, [british, SECOND]);
    await runHarness(["--live", "--pack", packDirectory], options);

    // Rename the fixtures and their saved files, as git mv does, with the bytes unchanged.
    const fixturesDirectory = join(packDirectory, "fixtures");
    for (const kind of ["positive", "negative"]) {
      renameSync(
        join(fixturesDirectory, `colour-check.${kind}.png`),
        join(fixturesDirectory, `color-check.${kind}.png`),
      );
      for (const suffix of ["answers.json", "answers.questions.json"]) {
        renameSync(
          join(answersDirectory, `colour-check.${kind}.png.${suffix}`),
          join(answersDirectory, `color-check.${kind}.png.${suffix}`),
        );
      }
    }
    await writePack(packDirectory, [us, SECOND]);
    const before = hashFiles(answersDirectory);
    const respelledOptions: HarnessOptions = {
      ...options,
      respelling: {
        questions: [
          {
            criterion: "demo/color-check",
            britishQuestionSha256: questionSha256Of(british),
            usQuestionSha256: questionSha256Of(us),
          },
        ],
        criterionIds: new Map([["demo/colour-check", "demo/color-check"]]),
      },
    };

    // Without the map the rename is refused before any request.
    askedQuestionIds.length = 0;
    await expect(
      runHarness(["--live", "--pack", packDirectory], options),
    ).rejects.toThrow(/already scored this fixture set/);
    expect(askedQuestionIds).toEqual([]);

    await runHarness(["--live", "--pack", packDirectory], respelledOptions);
    expect(askedQuestionIds).toEqual([
      ["demo/color-check"],
      ["demo/color-check"],
      ["demo/color-check"],
      ["demo/color-check"],
    ]);
    const after = hashFiles(answersDirectory);
    for (const [fileName, hash] of before) {
      expect(after.get(fileName)).toBe(hash);
    }

    askedQuestionIds.length = 0;
    const replay = await runHarness(
      ["--pack", packDirectory],
      respelledOptions,
    );
    expect(askedQuestionIds).toEqual([]);
    expect(replay.text).not.toContain("not asked  ");
    expect(replay.text).not.toContain("demo/colour-check");
    expect(
      replay.text.match(/demo\/color-check +(positive|negative)/g),
    ).toHaveLength(2);
    expect(hashFiles(answersDirectory)).toEqual(after);
  });

  it("keeps the new record when crit wrote the answers file and the harness then failed", async () => {
    await writePack(packDirectory, [FIRST, SECOND]);
    // crit runs and saves its answers, but the report it prints is not JSON.
    const stubRunner = makeStubCritRunner(askedQuestionIds, failure);
    const brokenReportRunner: CritRunner = async (
      critArguments,
      environment,
      workingDirectory,
    ) => {
      const run = await stubRunner(
        critArguments,
        environment,
        workingDirectory,
      );
      return { ...run, stdout: "not JSON" };
    };
    await expect(
      runHarness(["--live", "--pack", packDirectory], {
        ...options,
        runCrit: brokenReportRunner,
      }),
    ).rejects.toThrow(/crit did not write JSON/);
    const fileNames = [...hashFiles(answersDirectory).keys()].sort();
    expect(fileNames).toEqual([
      "first.negative.png.answers.json",
      "first.negative.png.answers.questions.json",
    ]);
    // The record names the criteria the saved answers file answers.
    expect(
      Object.keys(
        JSON.parse(
          readFileSync(
            join(answersDirectory, "first.negative.png.answers.questions.json"),
            "utf8",
          ),
        ),
      ),
    ).toEqual(["demo/first", "demo/second"]);
  });

  it("removes the new record when crit fails before it writes the answers file", async () => {
    await writePack(packDirectory, [FIRST, SECOND]);
    failure.fail = true;
    await expect(
      runHarness(["--live", "--pack", packDirectory], options),
    ).rejects.toThrow(/crit exited 2/);
    expect([...hashFiles(answersDirectory).keys()]).toEqual([]);
  });

  it("stops the replay when a saved answers file has no record file", async () => {
    await writePack(packDirectory, [FIRST, SECOND]);
    await runHarness(["--live", "--pack", packDirectory], options);
    rmSync(join(answersDirectory, "first.positive.png.answers.questions.json"));
    // main turns this error into exit code 2 and a message on stderr.
    await expect(
      runHarness(["--pack", packDirectory], options),
    ).rejects.toThrow(
      /first\.positive\.png\.answers\.questions\.json does not exist/,
    );
  });

  it("stops a live run with exit code 2 before the first request when a label file is named after no domain", async () => {
    await writePack(packDirectory, [FIRST, SECOND]);
    const labelsDirectory = join(options.harnessDirectory, "labels");
    mkdirSync(labelsDirectory, { recursive: true });
    writeFileSync(
      join(labelsDirectory, "nodomain.csv"),
      "fixture,criterion,defect_present\n",
    );
    const run = await catchOutput(async () => {
      await harnessMain(["--live", "--pack", packDirectory], options);
    });
    expect(run.exitCode).toBe(2);
    expect(run.stdout).toBe("");
    expect(run.stderr).toContain(
      "nodomain.csv: not named after one of the seven domains",
    );
    expect(askedQuestionIds).toEqual([]);
    // Nothing was saved, so no answers folder was made for the pack.
    expect(existsSync(join(options.runsDirectory, "demo"))).toBe(false);
  });
});
