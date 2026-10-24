// The live and replay paths of the agreement harness end to end, with crit run in-process on the
// stub adapter, so no request reaches TypeSafe (EV-4 rule 5, crit-cy8.43). The test builds a small
// pack in a temporary folder, scores it, adds a criterion, and scores it again.

import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStubAdapter } from "../../src/ask/stub.ts";
import { main as critMain } from "../../src/cli/main.ts";
import {
  type CritRun,
  type CritRunner,
  type HarnessOptions,
  runHarness,
} from "./run-agreement.ts";

/** One criterion of the test pack: its id and a background colour for each of its two fixtures. */
type TestCriterion = {
  readonly id: string;
  readonly positiveColour: string;
  readonly negativeColour: string;
};

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
      `      instructions: 'In the image at screenshot: Is the ${criterion.id} defect there?'`,
      "      criteria:",
      `        "true": 'The ${criterion.id} defect is there.'`,
      `        "false": 'The ${criterion.id} defect is not there.'`,
      "    fail_when: { probability_at_least: 0.7 }",
      "    pass_when: { probability_at_most: 0.3 }",
      `    fix: 'Remove the ${criterion.id} defect.'`,
      "    fixtures:",
      "      positive:",
      `        - fixtures/${criterion.id}.positive.png`,
      "      negative:",
      `        - fixtures/${criterion.id}.negative.png`,
    );
  }
  return `${lines.join("\n")}\n`;
}

/** Write the pack's pack.yaml, its fixture PNGs, and a rendered.json that names their hashes. */
async function writePack(
  packDirectory: string,
  criteria: readonly TestCriterion[],
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
      const fileName = `${criterion.id}.${image.kind}.png`;
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
  writeFileSync(
    join(fixturesDirectory, "rendered.json"),
    JSON.stringify(records),
  );
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

/** Return the question ids recorded in one answers file. */
function questionIdsIn(answersPath: string): string[] {
  const parsed = JSON.parse(readFileSync(answersPath, "utf8")) as {
    answers: { question_id: string }[];
  };
  return parsed.answers.map((answer) => answer.question_id);
}

/**
 * A crit runner that calls crit's main in-process with the stub adapter and records the question
 * ids of every request, so the test sees what a live run asked. It catches what main writes to
 * stdout and stderr and the exit code it sets, then puts them back.
 */
function makeStubCritRunner(askedQuestionIds: string[][]): CritRunner {
  return async (critArguments, environment, workingDirectory) => {
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
    let run: CritRun;
    try {
      await critMain(
        critArguments,
        environment,
        () => {
          const stub = createStubAdapter();
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
      const exitCode = process.exitCode;
      run = {
        stdout,
        stderr,
        exitCode: typeof exitCode === "number" ? exitCode : 0,
      };
    } finally {
      stdoutSpy.mockRestore();
      stderrSpy.mockRestore();
      process.exitCode = exitCodeBefore;
    }
    return run;
  };
}

describe("the agreement harness with a criterion added to a scored pack", () => {
  let root = "";
  let packDirectory = "";
  let answersDirectory = "";
  let askedQuestionIds: string[][] = [];
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
    options = {
      harnessDirectory,
      runsDirectory: join(harnessDirectory, "runs"),
      labelsDirectory: join(harnessDirectory, "labels"),
      runCrit: makeStubCritRunner(askedQuestionIds),
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
      "first.positive.png.answers.json",
      "second.negative.png.answers.json",
      "second.positive.png.answers.json",
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

  it("refuses a second live run with nothing left to ask and sends no request", async () => {
    await writePack(packDirectory, [FIRST, SECOND]);
    await runHarness(["--live", "--pack", packDirectory], options);
    askedQuestionIds.length = 0;
    await expect(
      runHarness(["--live", "--pack", packDirectory], options),
    ).rejects.toThrow(/no request was sent/);
    expect(askedQuestionIds).toEqual([]);
  });
});
