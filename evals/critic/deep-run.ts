// The deep-mode runner (crit-0a0.7, OQ-28). It runs the deep mode of the design-critic skill
// (agents/deep-mode.md) headless: one section critic per checklist section, each a separate
// `claude -p` child process, and then the director, one more child process, which writes the crit.
// Each child has the same model, isolation, permissions, and allowed commands as the single critic
// (run-critic.ts). The image goes into a new work folder as image-1.png and the facts file as
// facts.json, so no child sees a fixture name; the runner writes each section report there as
// section-<section>.md for the director.
//
// The director's crit is saved once, like a single-critic run, as runs/<skill-commit>/<key>/<n>.md
// with <n>.json, and every section report is kept inside <n>.json. The key is deepRequestKey, the
// SHA-256 of the mode and the single-critic key, and the prompt hash covers both deep templates,
// so a deep run never shares a folder or a replay with a single run. readSavedCrits reads deep runs
// with currentDeepRunIdentity and takes no runner, so a replay starts no child process.
//
// It asks a model, so `npm run ci` never runs it live (CS-21). detect.ts --deep calls it, and its
// own run command makes deep crits of any images, such as the pages of the blind side-by-side
// (side-by-side.ts --candidate-deep). deep-run.test.ts passes a stub in place of the child process.
//
// Usage:
//   node evals/critic/deep-run.ts run [--skill DIR] [--runs-dir DIR] [--note TEXT] IMAGE...
//   node evals/critic/deep-run.ts --help

import { createHash } from "node:crypto";
import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  buildClaudeArguments,
  type ClaudeResult,
  type ClaudeRunner,
  type ClaudeRunResult,
  type CriticRunnerOptions,
  type CritRequest,
  currentRunIdentity,
  FACTS_PROMPT_LINE,
  parseClaudeResult,
  portablePath,
  type RunIdentity,
  readSavedCrits,
  redactPaths,
  requestKey,
  runClaudeProcess,
  type SavedCrit,
  skillCommit,
  WORK_FACTS_FILE_NAME,
  writeRun,
} from "./run-critic.ts";

/** The value of the `mode` field in the metadata of a deep run. */
export const DEEP_MODE = "deep";

/** The checklist sections, in checklist order: one section critic each (agents/deep-mode.md step 2). */
export const SECTION_IDS = [
  "whole",
  "hierarchy",
  "arrangement",
  "text",
  "color",
  "pictures",
  "data",
  "interface",
] as const;

/** The prompt of one section critic, word for word from step 2 of agents/deep-mode.md. */
export const SECTION_CRITIC_PROMPT_TEMPLATE = `Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better.

Read <skill folder>/agents/section-critic.md and follow it. The skill folder is <skill folder>; every path in section-critic.md is relative to it.

Image: <absolute path of the image>
Section: <section>
What I know about the piece: <purpose, audience, medium, or "nothing">

You critique only. Do not edit, move, or create any file except crops in a temporary folder.
When the report is done, end with the full report as your final message. If you were spawned as a teammate, also call SendMessage to the agent that spawned you with the full report.`;

/** The prompt of the director, word for word from step 4 of agents/deep-mode.md. */
export const DIRECTOR_PROMPT_TEMPLATE = `Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better.

Read <skill folder>/agents/director.md and follow it. The skill folder is <skill folder>; every path in director.md is relative to it.

Image: <absolute path of the image>
Section reports: <absolute paths of the section reports>
What I know about the piece: <purpose, audience, medium, or "nothing">

You critique only. Do not edit, move, or create any file except crops in a temporary folder.
When the critique is done, end with the full critique as your final message. If you were spawned as a teammate, also call SendMessage to the agent that spawned you with the full critique.`;

/** The Image line of both templates, which the facts line follows. */
const IMAGE_PROMPT_LINE = "Image: <absolute path of the image>";

/** Returns a template with the facts line after its Image line when `withFacts` is true. */
function withFactsLine(template: string, withFacts: boolean): string {
  if (!withFacts) {
    return template;
  }
  return template.replace(
    IMAGE_PROMPT_LINE,
    `${IMAGE_PROMPT_LINE}\n${FACTS_PROMPT_LINE}`,
  );
}

/** Returns the SHA-256 of a string or bytes as lowercase hex. */
function sha256(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Returns what a new deep run would be made with: the single critic's identity with a prompt hash
 * over the mode and both deep templates, so no deep run matches a single run's identity.
 */
export function currentDeepRunIdentity(withFacts = false): RunIdentity {
  const promptHash = sha256(
    JSON.stringify({
      mode: DEEP_MODE,
      section: withFactsLine(SECTION_CRITIC_PROMPT_TEMPLATE, withFacts),
      director: withFactsLine(DIRECTOR_PROMPT_TEMPLATE, withFacts),
    }),
  );
  return { ...currentRunIdentity(withFacts), prompt_sha256: promptHash };
}

/**
 * Returns the folder name of a deep request: the SHA-256 of {mode, key} as JSON, where key is the
 * single critic's requestKey of the same request. So a deep run never shares a folder with a
 * single run of the same image.
 */
export function deepRequestKey(
  imageSha256s: readonly string[],
  note: string | undefined,
  focus: string | undefined,
  factsSha256?: string,
): string {
  const singleKey = requestKey(imageSha256s, note, focus, factsSha256);
  return sha256(JSON.stringify({ mode: DEEP_MODE, key: singleKey }));
}

/** Throws unless a request is one the deep mode takes: one image and no focus. */
function checkDeepRequest(request: CritRequest): void {
  if (request.imagePaths.length !== 1) {
    throw new Error(
      `the deep mode takes one image, not ${request.imagePaths.length}`,
    );
  }
  if (request.focus !== undefined) {
    throw new Error("the deep mode takes no focus");
  }
}

/** Returns the deep request key of a request, reading the image and the facts file to hash them. */
export function deepRequestKeyOf(request: CritRequest): string {
  checkDeepRequest(request);
  const imageSha256s = request.imagePaths.map((imagePath) =>
    sha256(readFileSync(imagePath)),
  );
  const factsSha256 =
    request.factsPath === undefined
      ? undefined
      : sha256(readFileSync(request.factsPath));
  return deepRequestKey(imageSha256s, request.note, request.focus, factsSha256);
}

/**
 * Fills the section critic's prompt: the skill folder, the image, the section, the note, and the
 * facts line when there is a facts file.
 */
export function buildSectionPrompt(
  skillDirectory: string,
  imagePath: string,
  section: string,
  note: string | undefined,
  factsPath?: string,
): string {
  let prompt = withFactsLine(
    SECTION_CRITIC_PROMPT_TEMPLATE,
    factsPath !== undefined,
  ).replaceAll("<skill folder>", skillDirectory);
  if (factsPath !== undefined) {
    prompt = prompt.replace("<absolute path of facts.json>", factsPath);
  }
  prompt = prompt.replace("<absolute path of the image>", imagePath);
  prompt = prompt.replace("<section>", section);
  return prompt.replace(
    '<purpose, audience, medium, or "nothing">',
    note ?? "nothing",
  );
}

/**
 * Fills the director's prompt: the skill folder, the image, the report paths joined by ", ", the
 * note, and the facts line when there is a facts file.
 */
export function buildDirectorPrompt(
  skillDirectory: string,
  imagePath: string,
  reportPaths: readonly string[],
  note: string | undefined,
  factsPath?: string,
): string {
  let prompt = withFactsLine(
    DIRECTOR_PROMPT_TEMPLATE,
    factsPath !== undefined,
  ).replaceAll("<skill folder>", skillDirectory);
  if (factsPath !== undefined) {
    prompt = prompt.replace("<absolute path of facts.json>", factsPath);
  }
  prompt = prompt.replace("<absolute path of the image>", imagePath);
  prompt = prompt.replace(
    "<absolute paths of the section reports>",
    reportPaths.join(", "),
  );
  return prompt.replace(
    '<purpose, audience, medium, or "nothing">',
    note ?? "nothing",
  );
}

/**
 * Limits how many child processes run at once, across every image of a run. A director call goes
 * ahead of every waiting section call, so an image whose sections are done is finished and saved
 * first, and a run stopped part way keeps the most finished crits.
 */
export class CallLimiter {
  private running = 0;
  private readonly waitingDirectors: (() => void)[] = [];
  private readonly waitingSections: (() => void)[] = [];
  private readonly limit: number;

  /** Makes a limiter that lets `limit` calls run at once. */
  constructor(limit: number) {
    this.limit = limit;
  }

  /** Runs `work` when a place is free; directors wait in their own line, which goes first. */
  async run<Result>(
    kind: "section" | "director",
    work: () => Promise<Result>,
  ): Promise<Result> {
    if (this.running >= this.limit) {
      const line =
        kind === "director" ? this.waitingDirectors : this.waitingSections;
      await new Promise<void>((resolveWait) => line.push(resolveWait));
    } else {
      this.running += 1;
    }
    try {
      return await work();
    } finally {
      this.release();
    }
  }

  /** Hands the place to the next waiting call, a director first, or frees it. */
  private release(): void {
    const next = this.waitingDirectors.shift() ?? this.waitingSections.shift();
    if (next === undefined) {
      this.running -= 1;
      return;
    }
    // The place passes straight to the next call, so running stays the same.
    next();
  }
}

/** Where deep runs live, how to start a child process, and an optional limit on child processes. */
export type DeepRunnerOptions = CriticRunnerOptions & {
  readonly limiter?: CallLimiter;
};

/** One section critic's run, as it is kept in the metadata of a deep run. */
type SectionRun = {
  readonly section: string;
  readonly result: ClaudeResult;
  readonly durationMs: number;
};

/** Runs one child process through the limiter when there is one. */
function runLimited(
  options: DeepRunnerOptions,
  kind: "section" | "director",
  args: readonly string[],
  workingDirectory: string,
): Promise<ClaudeRunResult> {
  const start = () => options.runClaude(args, process.env, workingDirectory);
  if (options.limiter === undefined) {
    return start();
  }
  return options.limiter.run(kind, start);
}

/** Runs one child and returns its parsed result and duration; throws when it did not succeed. */
async function runAgent(
  options: DeepRunnerOptions,
  kind: "section" | "director",
  label: string,
  prompt: string,
  workingDirectory: string,
): Promise<{ result: ClaudeResult; durationMs: number }> {
  const startedAt = Date.now();
  const run = await runLimited(
    options,
    kind,
    buildClaudeArguments(options.skillDirectory, prompt),
    workingDirectory,
  );
  const durationMs = Date.now() - startedAt;
  if (run.exitCode !== 0) {
    throw new Error(
      `${label}: claude exited with code ${run.exitCode}: ${run.stderr.slice(0, 500)} ${run.stdout.slice(0, 500)}`,
    );
  }
  try {
    return { result: parseClaudeResult(run.stdout), durationMs };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${label}: ${message}`);
  }
}

/**
 * Runs the deep mode once: copies the image and the facts file into a new work folder, runs the
 * eight section critics at once, writes their reports into the folder, runs the director, and
 * deletes the folder. It writes no run file.
 */
async function runDeepOnce(
  request: CritRequest,
  options: DeepRunnerOptions,
): Promise<{
  sections: SectionRun[];
  director: { result: ClaudeResult; durationMs: number };
  claudeVersion: string;
  startedAt: string;
  durationMs: number;
}> {
  const workDirectory = mkdtempSync(join(tmpdir(), "crit-deep-"));
  try {
    const sourceImagePath = request.imagePaths[0] ?? "";
    // Fixture names carry the answer, so every child sees only image-1.png.
    const imagePath = join(workDirectory, `image-1${extname(sourceImagePath)}`);
    copyFileSync(sourceImagePath, imagePath);
    let factsPath: string | undefined;
    if (request.factsPath !== undefined) {
      factsPath = join(workDirectory, WORK_FACTS_FILE_NAME);
      copyFileSync(request.factsPath, factsPath);
    }
    const versionRun = await runLimited(
      options,
      "section",
      ["--version"],
      workDirectory,
    );
    if (versionRun.exitCode !== 0) {
      throw new Error(
        `claude --version exited with code ${versionRun.exitCode}: ${versionRun.stderr.slice(0, 500)}`,
      );
    }
    const startedAt = new Date();
    const sections = await Promise.all(
      SECTION_IDS.map(async (section): Promise<SectionRun> => {
        const prompt = buildSectionPrompt(
          options.skillDirectory,
          imagePath,
          section,
          request.note,
          factsPath,
        );
        const run = await runAgent(
          options,
          "section",
          `section critic ${section}`,
          prompt,
          workDirectory,
        );
        return { section, ...run };
      }),
    );
    const reportPaths: string[] = [];
    for (const sectionRun of sections) {
      const reportPath = join(
        workDirectory,
        `section-${sectionRun.section}.md`,
      );
      writeFileSync(reportPath, sectionRun.result.crit);
      reportPaths.push(reportPath);
    }
    const director = await runAgent(
      options,
      "director",
      "director",
      buildDirectorPrompt(
        options.skillDirectory,
        imagePath,
        reportPaths,
        request.note,
        factsPath,
      ),
      workDirectory,
    );
    return {
      sections,
      director,
      claudeVersion: versionRun.stdout.trim(),
      startedAt: startedAt.toISOString(),
      durationMs: Date.now() - startedAt.getTime(),
    };
  } finally {
    rmSync(workDirectory, { recursive: true, force: true });
  }
}

/** Returns the sum of the numbers in a list, or null when any of them is not a number. */
function sumCosts(costs: readonly unknown[]): number | null {
  let total = 0;
  for (const cost of costs) {
    if (typeof cost !== "number") {
      return null;
    }
    total += cost;
  }
  return total;
}

/**
 * Makes sure a deep request has at least `runs` complete deep runs made the way a new one would
 * be made, and starts only the missing ones. Returns every such run, in order. The crit of each is
 * the director's final message, in the format of agents/critic.md.
 */
export async function ensureDeepCrits(
  request: CritRequest,
  options: DeepRunnerOptions,
  runs = 1,
): Promise<SavedCrit[]> {
  const key = deepRequestKeyOf(request);
  const commit = options.skillCommit ?? skillCommit(options.skillDirectory);
  const identity = currentDeepRunIdentity(request.factsPath !== undefined);
  const requestDirectory = join(options.runsDirectory, commit, key);
  const currentRuns = () =>
    readSavedCrits(options.runsDirectory, commit, key, identity);
  let missing = runs - currentRuns().length;
  while (missing > 0) {
    const once = await runDeepOnce(request, options);
    const imagePath = request.imagePaths[0] ?? "";
    const allResults = [
      ...once.sections.map((sectionRun) => sectionRun.result),
      once.director.result,
    ];
    writeRun(requestDirectory, once.director.result.crit, {
      request: {
        images: [
          {
            sha256: sha256(readFileSync(imagePath)),
            path: portablePath(imagePath, 1),
          },
        ],
        note: request.note ?? null,
        focus: null,
        ...(request.factsPath === undefined
          ? {}
          : {
              facts: {
                sha256: sha256(readFileSync(request.factsPath)),
                path: portablePath(request.factsPath, 1),
              },
            }),
      },
      mode: DEEP_MODE,
      ...identity,
      skill_directory: portablePath(options.skillDirectory, 2),
      skill_commit: commit,
      model_ids: [...new Set(allResults.flatMap((result) => result.modelIds))],
      permission_denials: redactPaths(
        allResults.flatMap((result) => result.permissionDenials),
      ),
      claude_version: once.claudeVersion,
      total_cost_usd: sumCosts(allResults.map((result) => result.totalCostUsd)),
      started_at: once.startedAt,
      duration_ms: once.durationMs,
      director: {
        session_id: once.director.result.sessionId,
        num_turns: once.director.result.numTurns,
        usage: once.director.result.usage,
        total_cost_usd: once.director.result.totalCostUsd,
        duration_ms: once.director.durationMs,
      },
      sections: once.sections.map((sectionRun) => ({
        section: sectionRun.section,
        report: sectionRun.result.crit,
        session_id: sectionRun.result.sessionId,
        num_turns: sectionRun.result.numTurns,
        usage: sectionRun.result.usage,
        total_cost_usd: sectionRun.result.totalCostUsd,
        duration_ms: sectionRun.durationMs,
        permission_denials: redactPaths(sectionRun.result.permissionDenials),
      })),
    });
    missing -= 1;
  }
  return currentRuns();
}

const DEFAULT_RUNS_DIRECTORY = join(import.meta.dirname, "runs");
const DEFAULT_SKILL_DIRECTORY = join(
  import.meta.dirname,
  "..",
  "..",
  "plugin",
  "skills",
  "design-critic",
);
const EXIT_CODE_COULD_NOT_RUN = 2;
/** How many child processes the run command starts at once. */
const MAX_PARALLEL_CALLS = 8;

const HELP_TEXT = `Make deep-mode crits of images and save each one (agents/deep-mode.md).

Usage:
  node evals/critic/deep-run.ts run [--skill DIR] [--runs-dir DIR] [--note TEXT] IMAGE...
  node evals/critic/deep-run.ts --help

run makes sure each image has one saved deep crit at the skill's commit, and starts claude -p only
for the missing ones: eight section critics and a director per image, at most ${MAX_PARALLEL_CALLS}
child processes at once. It asks a model; never run it in npm run ci. A deep crit is read back
with readSavedCrits, the deep request key, and currentDeepRunIdentity, as detect.ts --deep and
side-by-side.ts --candidate-deep do.

Flags:
  --skill DIR     The skill folder (default plugin/skills/design-critic).
  --runs-dir DIR  The folder that holds the saved runs (default evals/critic/runs).
  --note TEXT     What you know about the piece.
  --help, -h      Print this help.

Exit codes: 0 done, 2 could not run.
`;

/** Parses the command line, makes the missing deep crits, and returns the lines to print. */
export async function runDeepCommand(
  argv: readonly string[],
  runClaude: ClaudeRunner,
): Promise<string> {
  const parsed = parseArgs({
    args: [...argv],
    options: {
      skill: { type: "string" },
      "runs-dir": { type: "string" },
      note: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
    allowPositionals: true,
  });
  if (parsed.values.help === true) {
    return HELP_TEXT;
  }
  const [mode, ...imageArguments] = parsed.positionals;
  if (mode !== "run") {
    throw new Error(`name the mode run\n\n${HELP_TEXT}`);
  }
  if (imageArguments.length === 0) {
    throw new Error("name at least one image");
  }
  const skillDirectory = resolve(
    parsed.values.skill ?? DEFAULT_SKILL_DIRECTORY,
  );
  const options: DeepRunnerOptions = {
    runsDirectory: resolve(parsed.values["runs-dir"] ?? DEFAULT_RUNS_DIRECTORY),
    skillDirectory,
    skillCommit: skillCommit(skillDirectory),
    runClaude,
    limiter: new CallLimiter(MAX_PARALLEL_CALLS),
  };
  const lines = await Promise.all(
    imageArguments.map(async (imageArgument) => {
      const imagePath = resolve(imageArgument);
      const saved = await ensureDeepCrits(
        { imagePaths: [imagePath], note: parsed.values.note },
        options,
      );
      return `${imagePath}: ${saved[0]?.critPath ?? "no crit"}`;
    }),
  );
  return `${lines.join("\n")}\n`;
}

// Run only when node starts this file, not when a test imports it.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.stdout.write(
      await runDeepCommand(process.argv.slice(2), runClaudeProcess),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`deep-run stopped: ${message}\n`);
    process.exitCode = EXIT_CODE_COULD_NOT_RUN;
  }
}
