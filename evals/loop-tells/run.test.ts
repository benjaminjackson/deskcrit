// Checks the EV-25 runner with stubs in place of `claude` and the screenshot, so it starts no
// model call and needs no browser (CS-21).
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
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { ClaudeRunner } from "../critic/run-critic.ts";
import {
  allowedTools,
  buildJudgeQuestion,
  dropLoopFiles,
  IMAGE_PLACEHOLDER,
  JUDGE_QUESTION_NAME,
  type LoopRunner,
  loopArguments,
  type MainOptions,
  parseAnswer,
  readPages,
  readSavedRun,
  readTemplateSigns,
  redactText,
  runCommand,
  STARTING_PROMPT,
} from "./run.ts";

const REPOSITORY_DIRECTORY = resolve(import.meta.dirname, "..", "..");
const LOOP_TELLS_DIRECTORY = import.meta.dirname;
const GUIDELINES_PATH = join(REPOSITORY_DIRECTORY, "GUIDELINES.md");

const temporaryDirectories: string[] = [];

/** Makes a temp folder that the test removes afterwards. */
function makeTemporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), "loop-tells-test-"));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

/** Where the stub loop puts its loop folder, and whether the transcript names it. */
type StubLoopSetup = {
  readonly folderInPage?: string;
  readonly named?: boolean;
  readonly rounds?: readonly number[];
};

/**
 * A stub loop: it edits styles.css in the work folder, writes a loop folder with two rounds in the
 * temp folder (or at `folderInPage` inside the page), and prints a stream-json line that names the
 * loop folder, as a real run would. Each work order holds the loop folder's path.
 */
function stubLoop(calls: string[][], setup: StubLoopSetup = {}): LoopRunner {
  return async (args, workingDirectory) => {
    calls.push([...args]);
    const stylesPath = join(workingDirectory, "styles.css");
    writeFileSync(
      stylesPath,
      `${readFileSync(stylesPath, "utf8")}\nh1 { font-size: 48px; }\n`,
    );
    let loopFolder = join(workingDirectory, setup.folderInPage ?? "");
    if (setup.folderInPage !== undefined) {
      mkdirSync(loopFolder, { recursive: true });
    } else {
      loopFolder = mkdtempSync(join(tmpdir(), "crit-loop-stub-"));
      temporaryDirectories.push(loopFolder);
    }
    for (const round of setup.rounds ?? [1, 2]) {
      mkdirSync(join(loopFolder, `round-${round}`));
      writeFileSync(
        join(loopFolder, `round-${round}`, "crit.md"),
        `crit of round ${round}\n`,
      );
      writeFileSync(
        join(loopFolder, `round-${round}`, "work-order.json"),
        `${JSON.stringify({ image: join(loopFolder, `round-${round}`, "desktop.png") })}\n`,
      );
    }
    const line = JSON.stringify({
      type: "assistant",
      text:
        setup.named === false
          ? "Captured."
          : `Captured into ${loopFolder}/round-2/desktop.png`,
    });
    const imageLine = JSON.stringify({
      type: "user",
      message: {
        content: [
          {
            type: "tool_result",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: "iVBORw0KGgoAAAA",
                },
              },
            ],
          },
        ],
      },
      tool_use_result: {
        type: "image",
        file: { base64: "iVBORw0KGgoAAAA", type: "image/png" },
      },
    });
    return {
      stdout: `${line}\n${imageLine}\n`,
      stderr: "",
      exitCode: 0,
      timedOut: false,
    };
  };
}

/** A stub screenshot that writes a small file in place of a PNG. */
function stubScreenshot(_pagePath: string, outputPath: string): void {
  writeFileSync(outputPath, "png");
}

/** A stub judge runner that answers every judge call with the given answer. */
function stubJudge(answer: unknown, calls: string[][]): ClaudeRunner {
  return async (args) => {
    calls.push([...args]);
    if (args[0] === "--version") {
      return { stdout: "2.0.0 (Claude Code)\n", stderr: "", exitCode: 0 };
    }
    const result = {
      type: "result",
      subtype: "success",
      is_error: false,
      structured_output: answer,
      modelUsage: { "claude-opus-5-5": {} },
      total_cost_usd: 0.01,
    };
    return { stdout: JSON.stringify(result), stderr: "", exitCode: 0 };
  };
}

/** Options for runCommand with stubs and a temp runs folder. */
function stubOptions(
  runsDirectory: string,
  loopCalls: string[][],
  judgeAnswer: unknown,
  judgeCalls: string[][],
): MainOptions {
  return {
    loopTellsDirectory: LOOP_TELLS_DIRECTORY,
    runsDirectory,
    pluginDirectory: join(REPOSITORY_DIRECTORY, "plugin"),
    guidelinesPath: GUIDELINES_PATH,
    playwrightModulesDirectory: makeTemporaryDirectory(),
    runLoop: stubLoop(loopCalls),
    runClaude: stubJudge(judgeAnswer, judgeCalls),
    screenshot: stubScreenshot,
    allowDirtyPlugin: true,
  };
}

const NO_SIGN_ANSWER = {
  reasoning: "plain fix",
  signs_added: [],
  recheck_praised: [],
};

describe("the inputs", () => {
  it("reads the 38 template signs of GUIDELINES.md, each with a question", () => {
    const signs = readTemplateSigns(GUIDELINES_PATH);
    expect(signs).toHaveLength(38);
    expect(signs.map((sign) => sign.title)).toContain(
      "Uppercase labels with wide tracking",
    );
  });

  it("reads 4 pages, each with its folder, defects, and lazy signs that are real sign titles", () => {
    const titles = new Set(
      readTemplateSigns(GUIDELINES_PATH).map((sign) => sign.title),
    );
    const pages = readPages(LOOP_TELLS_DIRECTORY);
    expect(pages).toHaveLength(4);
    for (const page of pages) {
      expect(
        existsSync(join(LOOP_TELLS_DIRECTORY, page.page, "index.html")),
      ).toBe(true);
      expect(
        existsSync(join(LOOP_TELLS_DIRECTORY, page.page, "styles.css")),
      ).toBe(true);
      expect(page.defects.length).toBeGreaterThan(0);
      for (const sign of page.lazy_signs) {
        expect(titles.has(sign)).toBe(true);
      }
    }
  });

  it("uses the EV-18 starting prompt word for word", () => {
    const readme = readFileSync(
      join(REPOSITORY_DIRECTORY, "evals", "loop-test", "README.md"),
      "utf8",
    );
    expect(readme).toContain(STARTING_PROMPT);
  });

  it("loads the plugin, accepts edits only, and bypasses no permission check", () => {
    const args = loopArguments("/plugin");
    expect(args).toContain("--plugin-dir");
    expect(args[args.indexOf("--permission-mode") + 1]).toBe("acceptEdits");
    expect(args.join(" ")).not.toMatch(/bypass|skip-permissions/);
    expect(args[args.length - 1]).toBe(STARTING_PROMPT);
  });
});

describe("run, score, and replay with stubs", () => {
  it("saves each run once with its files, scores it, and replays the scores with no call", async () => {
    const runsDirectory = makeTemporaryDirectory();
    const loopCalls: string[][] = [];
    const judgeCalls: string[][] = [];
    const answer = {
      reasoning: "the fix adds a line above the headline",
      signs_added: [
        {
          title: "Uppercase labels with wide tracking",
          how: "new element",
          evidence: "+<p class=eyebrow>",
        },
        {
          title: "Too many type sizes and weights on one screen",
          how: "style change",
          evidence: "+font-size: 48px",
        },
      ],
      recheck_praised: [
        {
          title: "Uppercase labels with wide tracking",
          round: 2,
          quote: "the eyebrow helps",
        },
      ],
    };
    const options = stubOptions(runsDirectory, loopCalls, answer, judgeCalls);

    const run = await runCommand(["run"], options);
    expect(run.exitCode).toBe(0);
    expect(loopCalls).toHaveLength(12);
    const savedDirectory = join(
      runsDirectory,
      readCommit(runsDirectory),
      "harbor-tides",
      "1",
    );
    for (const name of [
      "before.png",
      "after.png",
      "page.diff",
      "transcript.jsonl",
      "run.json",
      "final-page/index.html",
      "final-page/styles.css",
      "loop/round-1/crit.md",
      "loop/round-2/crit.md",
    ]) {
      expect(existsSync(join(savedDirectory, name))).toBe(true);
    }
    expect(existsSync(join(savedDirectory, "final-page", "node_modules"))).toBe(
      false,
    );
    expect(readFileSync(join(savedDirectory, "page.diff"), "utf8")).toContain(
      "+h1 { font-size: 48px; }",
    );
    // The transcript keeps the image blocks, but not their data.
    const transcript = readFileSync(
      join(savedDirectory, "transcript.jsonl"),
      "utf8",
    );
    expect(transcript).not.toContain("iVBORw0KGgo");
    expect(transcript).toContain(
      `"media_type":"image/png","data":"${IMAGE_PLACEHOLDER}"`,
    );
    expect(transcript).toContain(`"base64":"${IMAGE_PLACEHOLDER}"`);
    // The transcript holds no temp folder path of this machine.
    expect(
      readFileSync(join(savedDirectory, "transcript.jsonl"), "utf8"),
    ).not.toContain(tmpdir());

    // A second run starts no loop, because every run is saved.
    const again = await runCommand(["run"], options);
    expect(again.text).toContain("already saved");
    expect(loopCalls).toHaveLength(12);

    // Replay before scoring names the missing answers and exits 2.
    const early = await runCommand(["replay"], options);
    expect(early.exitCode).toBe(2);
    expect(early.text).toContain("missing answer");

    const score = await runCommand(["score"], options);
    expect(score.exitCode).toBe(0);
    // One --version and one judge call per run.
    expect(judgeCalls).toHaveLength(24);

    const callsBefore = judgeCalls.length;
    const replay = await runCommand(["replay"], options);
    expect(judgeCalls).toHaveLength(callsBefore);
    expect(replay.exitCode).toBe(0);
    expect(replay.text).toContain(
      "harbor-tides | 1 | 0 | Uppercase labels with wide tracking (new element); Too many type sizes and weights on one screen (style change) | Uppercase labels with wide tracking (round 2)",
    );
    expect(replay.text).toContain(
      "Runs whose final page adds a sign: 12 of 12",
    );
    expect(replay.text).toContain("by a style change: 12 of 12");
    expect(replay.text).toContain(
      "Runs where a recheck praised a sign: 12 of 12",
    );
  });

  it("puts the diff and the recheck crits in the judge prompt, and no page name or lazy sign", async () => {
    const runsDirectory = makeTemporaryDirectory();
    const options = stubOptions(runsDirectory, [], NO_SIGN_ANSWER, []);
    await runCommand(["run"], options);
    const savedRun = readSavedRun(
      runsDirectory,
      readCommit(runsDirectory),
      "boat-hire",
      2,
    );
    expect(savedRun).toBeDefined();
    if (savedRun === undefined) {
      return;
    }
    expect(savedRun.rechecks.map((recheck) => recheck.round)).toEqual([2]);
    const question = buildJudgeQuestion(
      savedRun,
      readTemplateSigns(GUIDELINES_PATH),
      LOOP_TELLS_DIRECTORY,
    );
    expect(question.name).toBe(JUDGE_QUESTION_NAME);
    expect(question.prompt).toContain("+h1 { font-size: 48px; }");
    expect(question.prompt).toContain("crit of round 2");
    expect(question.prompt).not.toContain("crit of round 1");
    expect(question.prompt).not.toContain("boat-hire");
    expect(question.prompt).toContain("style change");
  });

  it("leaves a loop folder inside the page out of the diff and the final page", async () => {
    const runsDirectory = makeTemporaryDirectory();
    const options = {
      ...stubOptions(runsDirectory, [], NO_SIGN_ANSWER, []),
      runLoop: stubLoop([], { folderInPage: "work/.crit-loop", named: false }),
    };
    await runCommand(["run"], options);
    const savedDirectory = join(
      runsDirectory,
      readCommit(runsDirectory),
      "garden-plots",
      "1",
    );
    const diff = readFileSync(join(savedDirectory, "page.diff"), "utf8");
    expect(diff).toContain("+h1 { font-size: 48px; }");
    expect(diff).not.toContain(".crit-loop");
    expect(
      existsSync(join(savedDirectory, "final-page", "work", ".crit-loop")),
    ).toBe(false);
    // The transcript names no loop folder, so the runner finds the one in the page.
    const metadata = JSON.parse(
      readFileSync(join(savedDirectory, "run.json"), "utf8"),
    );
    expect(metadata.loop_folder_found).toBe(true);
    // The saved work order holds no temp folder path of this machine.
    const workOrder = readFileSync(
      join(savedDirectory, "loop", "round-1", "work-order.json"),
      "utf8",
    );
    expect(workOrder).toContain("<temp>");
    expect(workOrder).not.toContain(tmpdir());
    expect(existsSync(join(savedDirectory, "loop", "round-2", "crit.md"))).toBe(
      true,
    );
  });

  it("drops the diff sections of files inside a loop folder", () => {
    const diff =
      "diff --git a/.crit-loop/round-1/crit.md b/.crit-loop/round-1/crit.md\n+crit\ndiff --git a/styles.css b/styles.css\n+h1 {}\n";
    expect(dropLoopFiles(diff)).toBe(
      "diff --git a/styles.css b/styles.css\n+h1 {}\n",
    );
  });

  it("marks a run with no recheck crit, and does not count it as no praise", async () => {
    const runsDirectory = makeTemporaryDirectory();
    const options = {
      ...stubOptions(runsDirectory, [], NO_SIGN_ANSWER, []),
      runLoop: stubLoop([], { rounds: [1] }),
    };
    await runCommand(["run"], options);
    await runCommand(["score"], options);
    const replay = await runCommand(["--replay"], options);
    expect(replay.exitCode).toBe(0);
    expect(replay.text).toContain(
      "harbor-tides | 1 | 0 | none | no recheck crits",
    );
    expect(replay.text).toContain(
      "Runs where a recheck praised a sign: 0 of 0",
    );
    expect(replay.text).toContain(
      "Runs with no recheck crit, left out of the praise count: 12",
    );
  });

  it("keeps the run another process saved first", async () => {
    const runsDirectory = makeTemporaryDirectory();
    const base = stubOptions(runsDirectory, [], NO_SIGN_ANSWER, []);
    const inner = stubLoop([]);
    const options = {
      ...base,
      runLoop: async (
        args: readonly string[],
        workingDirectory: string,
        limit: number,
      ) => {
        const result = await inner(args, workingDirectory, limit);
        // Another process saves the same run while this one runs.
        const commit = readCommitIfAny(runsDirectory);
        const pageName = workingDirectory.includes("harbor-tides")
          ? "harbor-tides"
          : undefined;
        if (commit !== undefined && pageName !== undefined) {
          for (const run of ["1", "2", "3"]) {
            const other = join(runsDirectory, commit, pageName, run);
            mkdirSync(other, { recursive: true });
            writeFileSync(join(other, "run.json"), "{}\n");
          }
        }
        return result;
      },
    };
    const run = await runCommand(["run"], options);
    expect(run.exitCode).toBe(0);
    expect(run.text).toContain("harbor-tides run 1: already saved");
  });

  it("removes this machine's temp and home paths, also when cut short", () => {
    const text = `cd ${tmpdir()}/loop-tells-x/round-1 and "Running cat /private/var/folders/ab/cd…" and "jq /private/var/folders…" and /Users/somebody/file`;
    const redacted = redactText(text);
    expect(redacted).not.toMatch(/\/var\/folders|\/Users\//);
    expect(redacted).toContain("<temp>");
    expect(redacted).toContain("<home>/file");
  });

  it("lets node run only the plugin's skill scripts", () => {
    const tools = allowedTools("/plugin");
    expect(tools).toContain("Bash(node /plugin/skills/*/scripts/*)");
    expect(tools).not.toContain("Bash(node *)");
  });

  it("refuses a judge answer that names a sign not in the list", () => {
    const signs = readTemplateSigns(GUIDELINES_PATH);
    expect(() =>
      parseAnswer(
        {
          reasoning: "",
          signs_added: [
            { title: "Drop shadows", how: "new element", evidence: "" },
          ],
          recheck_praised: [],
        },
        signs,
      ),
    ).toThrow(/may not/);
  });
});

/** Returns the one plugin commit folder in the runs folder, or undefined when there is none yet. */
function readCommitIfAny(runsDirectory: string): string | undefined {
  if (!existsSync(runsDirectory)) {
    return undefined;
  }
  return readdirSync(runsDirectory).find((name) => /^[0-9a-f]{40}$/.test(name));
}

/** Returns the one plugin commit folder a stub run wrote. */
function readCommit(runsDirectory: string): string {
  const names = readdirSync(runsDirectory);
  const commit = names.find((name) => /^[0-9a-f]{40}$/.test(name));
  if (commit === undefined) {
    throw new Error("no plugin commit folder");
  }
  return commit;
}
