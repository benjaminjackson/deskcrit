// Unit tests of the template tells evaluation (EV-23). A plain stub stands in for the `claude`
// child process, for both the critic and the judge, so no model is asked (CS-21, CS-22). Each test
// works in its own temporary folder, which afterEach removes, with a small tells manifest and tiny
// fake PNG files written by the test, so it does not need the fixtures of packs/_tells/. No test
// depends on the git state of the skill folder.

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
import { ensureJudgeAnswer, judgeAnswerPath, judgeKey } from "./judge.ts";
import {
  type ClaudeRunner,
  currentRunIdentity,
  readSavedCrits,
  requestKeyOf,
} from "./run-critic.ts";
import {
  buildTellQuestion,
  countTells,
  parseTellAnswer,
  parseTellsManifest,
  runTells,
  type Tell,
  type TellAnswer,
  type TellMention,
} from "./tells.ts";

const COMMIT = "0123456789abcdef0123456789abcdef01234567";
const REPOSITORY_DIRECTORY = join(import.meta.dirname, "..", "..");
const SKILL_DIRECTORY = join(
  REPOSITORY_DIRECTORY,
  "plugin",
  "skills",
  "design-critic",
);

/** Two tells; the template ids share no word with their titles or questions. */
const TELLS: readonly Tell[] = [
  {
    template: "zz-alpha-fixture",
    title: "Gradient text in headings, numbers, or the logo",
    question:
      "Is a heading, a number, or the logo filled with a color gradient instead of one solid color?",
  },
  {
    template: "zz-beta-fixture",
    title: "Uppercase labels with wide tracking",
    question:
      "Is there a small uppercase line with wide letter spacing above the hero headline?",
  },
];

/** The 8-byte signature that starts every PNG file. */
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

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

/** The paths of one test's folder: the runs folder, the manifest, and the fixtures folder. */
type TestFolder = {
  readonly runsDirectory: string;
  readonly manifestPath: string;
  readonly fixturesDirectory: string;
};

/**
 * Makes a temp folder with a runs folder, a manifest of TELLS, and two tiny fake PNGs per tell.
 * Each PNG is the signature plus its own name, so every image has its own SHA-256; the critic
 * runner copies the bytes and never decodes them.
 */
function newTestFolder(): TestFolder {
  const root = mkdtempSync(join(tmpdir(), "crit-tells-test-"));
  temporaryFolders.push(root);
  const fixturesDirectory = join(root, "fixtures");
  mkdirSync(fixturesDirectory);
  for (const tell of TELLS) {
    for (const side of ["positive", "negative"]) {
      const name = `${tell.template}.${side}.png`;
      writeFileSync(
        join(fixturesDirectory, name),
        Buffer.concat([PNG_SIGNATURE, Buffer.from(name)]),
      );
    }
  }
  const manifestPath = join(root, "tells.json");
  writeFileSync(manifestPath, JSON.stringify(TELLS));
  return { runsDirectory: join(root, "runs"), manifestPath, fixturesDirectory };
}

/** Returns the request key of one fixture image of a test folder. */
function keyOf(folder: TestFolder, template: string, side: string): string {
  return requestKeyOf({
    imagePaths: [join(folder.fixturesDirectory, `${template}.${side}.png`)],
  });
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

/** Returns a judge answer with the given mention. */
function answerOf(saysTell: TellMention): TellAnswer {
  return { reason: "stub", says_tell: saysTell };
}

/**
 * Saves a crit for every image except those in `skipCrit`, and a judge answer for each saved
 * crit: `raised` on positives and `not_mentioned` on negatives unless `answers` names another.
 */
async function seedRuns(
  folder: TestFolder,
  answers: Readonly<Record<string, TellMention>>,
  skipCrit: readonly string[],
): Promise<void> {
  for (const tell of TELLS) {
    for (const side of ["positive", "negative"]) {
      const label = `${tell.template} ${side}`;
      if (skipCrit.includes(label)) {
        continue;
      }
      const key = keyOf(folder, tell.template, side);
      writeSavedCrit(folder.runsDirectory, key, `Crit of ${label}.`);
      const saved = readSavedCrits(folder.runsDirectory, COMMIT, key)[0];
      if (saved === undefined) {
        throw new Error("seeded crit not found");
      }
      const question = buildTellQuestion(tell.title, tell.question, {
        key,
        saved,
      });
      const fallback = side === "positive" ? "raised" : "not_mentioned";
      await ensureJudgeAnswer(question, parseTellAnswer, {
        runsDirectory: folder.runsDirectory,
        skillCommit: COMMIT,
        runClaude: async () => ({
          stdout: judgeStdout(answerOf(answers[label] ?? fallback)),
          stderr: "",
          exitCode: 0,
        }),
      });
    }
  }
}

/** Returns the options of runTells for a test folder and a runner. */
function optionsOf(folder: TestFolder, runner: ClaudeRunner) {
  return {
    repositoryDirectory: REPOSITORY_DIRECTORY,
    runsDirectory: folder.runsDirectory,
    skillDirectory: SKILL_DIRECTORY,
    runClaude: runner,
  };
}

/** Returns the flags that point runTells at a test folder's manifest and fixtures. */
function folderFlags(folder: TestFolder): string[] {
  return [
    "--skill-commit",
    COMMIT,
    "--manifest",
    folder.manifestPath,
    "--fixtures",
    folder.fixturesDirectory,
  ];
}

/** Runs the replay on a test folder with a runner that throws if called. */
function replay(folder: TestFolder) {
  return runTells(
    ["--replay", ...folderFlags(folder)],
    optionsOf(folder, throwingRunner),
  );
}

describe("parseTellAnswer", () => {
  it("accepts each of the three mentions", () => {
    for (const mention of ["raised", "praised", "not_mentioned"] as const) {
      expect(parseTellAnswer({ reason: "r", says_tell: mention })).toEqual({
        reason: "r",
        says_tell: mention,
      });
    }
  });

  it("refuses a missing reason, an unknown mention, and a value that is not an object", () => {
    expect(() => parseTellAnswer({ says_tell: "raised" })).toThrow(
      "wrong shape",
    );
    expect(() =>
      parseTellAnswer({ reason: "r", says_tell: "present" }),
    ).toThrow("wrong shape");
    expect(() => parseTellAnswer("raised")).toThrow("wrong shape");
  });
});

describe("parseTellsManifest", () => {
  it("reads a list of tells and refuses a bad entry or a repeated template", () => {
    expect(parseTellsManifest(JSON.stringify(TELLS))).toEqual(TELLS);
    expect(() => parseTellsManifest("{}")).toThrow("not a JSON array");
    expect(() =>
      parseTellsManifest(JSON.stringify([{ template: "a", title: "" }])),
    ).toThrow("entry 0");
    expect(() =>
      parseTellsManifest(JSON.stringify([TELLS[0], TELLS[0]])),
    ).toThrow("repeats template");
  });
});

describe("buildTellQuestion", () => {
  it("holds the title, the question, and the crit, and no template id, path, or polarity", () => {
    const tell = TELLS[0];
    if (tell === undefined) {
      throw new Error("no tell");
    }
    const question = buildTellQuestion(tell.title, tell.question, {
      key: "crit-key",
      saved: {
        runNumber: 1,
        critPath: "",
        metadataPath: "",
        metadata: {},
        crit: "CRIT BODY",
      },
    });
    expect(question.name).toBe("tell");
    expect(question.prompt).toContain(`Possible tell: ${tell.title}\n`);
    expect(question.prompt).toContain(tell.question);
    expect(question.prompt).toContain("The design may or may not show this.");
    expect(question.prompt).toContain("CRIT BODY");
    for (const word of [
      tell.template,
      "zz-",
      ".png",
      "/",
      "positive",
      "negative",
      "planted",
      "twin",
    ]) {
      expect(question.prompt).not.toContain(word);
    }
    expect(question.crits).toEqual([{ key: "crit-key", run: 1 }]);
    expect(Object.keys(question.schema.properties as object)).toEqual([
      "reason",
      "says_tell",
    ]);
  });
});

describe("countTells", () => {
  it("counts raised and praised on positives and anything but raised as quiet on negatives", () => {
    const counts = countTells([
      { positive: answerOf("raised"), negative: answerOf("not_mentioned") },
      { positive: answerOf("praised"), negative: answerOf("praised") },
      { positive: answerOf("not_mentioned"), negative: answerOf("raised") },
      { positive: undefined, negative: undefined },
    ]);
    expect(counts).toEqual({
      raisedOnPositive: 1,
      praisedOnPositive: 1,
      positivesJudged: 3,
      quietOnNegative: 2,
      negativesJudged: 3,
    });
  });
});

describe("runTells --replay", () => {
  it("prints one row per tell, the total, and the skill commit, and exits 0", async () => {
    const folder = newTestFolder();
    await seedRuns(
      folder,
      {
        "zz-beta-fixture positive": "praised",
        "zz-beta-fixture negative": "raised",
      },
      [],
    );
    const output = await replay(folder);
    expect(output.errorText).toBe("");
    expect(output.exitCode).toBe(0);
    expect(output.text).toMatch(
      /^zz-alpha-fixture +raised +not_mentioned +yes +yes +no$/m,
    );
    expect(output.text).toMatch(
      /^zz-beta-fixture +praised +raised +no +no +yes$/m,
    );
    expect(output.text).toMatch(
      /^Total +0\.50 \(1\/2\) +0\.50 \(1\/2\) +0\.50 \(1\/2\)$/m,
    );
    expect(output.text).toContain(`skill commit ${COMMIT}`);
    expect(output.text).toContain(
      `node evals/critic/tells.ts --replay --skill-commit ${COMMIT}`,
    );
  });

  it("exits 2 and names a missing crit", async () => {
    const folder = newTestFolder();
    await seedRuns(folder, {}, ["zz-alpha-fixture negative"]);
    const output = await replay(folder);
    expect(output.exitCode).toBe(2);
    expect(output.text).toMatch(
      /^zz-alpha-fixture +raised +missing +yes +- +no$/m,
    );
    expect(output.errorText).toContain(
      "/fixtures/zz-alpha-fixture.negative.png at skill commit",
    );
  });

  it("exits 2 and names a missing judge answer", async () => {
    const folder = newTestFolder();
    const tell = TELLS[1];
    if (tell === undefined) {
      throw new Error("no tell");
    }
    await seedRuns(folder, {}, []);
    const key = keyOf(folder, tell.template, "positive");
    const saved = readSavedCrits(folder.runsDirectory, COMMIT, key)[0];
    if (saved === undefined) {
      throw new Error("no crit");
    }
    const question = buildTellQuestion(tell.title, tell.question, {
      key,
      saved,
    });
    rmSync(judgeAnswerPath(folder.runsDirectory, COMMIT, judgeKey(question)));
    const output = await replay(folder);
    expect(output.exitCode).toBe(2);
    expect(output.errorText).toContain(
      "missing judge answer for zz-beta-fixture positive",
    );
  });
});

describe("runTells live, with a stub critic and a stub judge", () => {
  it("makes a crit and a judge answer per image, then a second run makes no call", async () => {
    const folder = newTestFolder();
    let criticCalls = 0;
    let judgeCalls = 0;
    const stub: ClaudeRunner = async (args) => {
      if (args[0] === "--version") {
        return { stdout: "2.0.0 (Claude Code)", stderr: "", exitCode: 0 };
      }
      if (args.includes("--json-schema")) {
        judgeCalls += 1;
        return {
          stdout: judgeStdout(answerOf("raised")),
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
    const first = await runTells(folderFlags(folder), optionsOf(folder, stub));
    expect(first.exitCode).toBe(0);
    expect(criticCalls).toBe(TELLS.length * 2);
    expect(judgeCalls).toBe(TELLS.length * 2);

    const second = await runTells(folderFlags(folder), optionsOf(folder, stub));
    expect(second.exitCode).toBe(0);
    expect(criticCalls).toBe(TELLS.length * 2);
    expect(judgeCalls).toBe(TELLS.length * 2);

    const replayed = await replay(folder);
    expect(replayed.exitCode).toBe(0);
    const tell = TELLS[0];
    if (tell === undefined) {
      throw new Error("no tell");
    }
    const key = keyOf(folder, tell.template, "negative");
    const saved = readSavedCrits(folder.runsDirectory, COMMIT, key)[0];
    if (saved === undefined) {
      throw new Error("crit not saved");
    }
    const question = buildTellQuestion(tell.title, tell.question, {
      key,
      saved,
    });
    expect(
      readFileSync(
        judgeAnswerPath(folder.runsDirectory, COMMIT, judgeKey(question)),
        "utf8",
      ),
    ).toContain('"name": "tell"');
  });
});

describe("runTells --parallel", () => {
  it("stops with a usage error on a value that is not a positive integer", async () => {
    await expect(
      // The value is refused before the options are read, so an empty object is enough.
      runTells(["--parallel=0"], {} as never),
    ).rejects.toThrow("--parallel must be a whole number of 1 or more");
  });
});
