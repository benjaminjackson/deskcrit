// The go-further runner (PRD OQ-28, EV-19). It runs the skill's second step (agents/go-further.md)
// on one saved crit as a headless `claude -p` child process, with the same isolation, model, and
// allowed commands as the critic runner. The child gets the image as image-1.png and the crit as
// crit.md in a new work folder, so it never sees a fixture or page name. Its final message is the
// section "Where it could go further", which joinSection puts into the crit after "What's working",
// as SKILL.md step 3 does.
//
// Each result is saved once as <go-further-dir>/<go-further-commit>/<key>.md (the joined crit) and
// <key>.json (the section, the agent's message, and the metadata), with the "wx" flag, so a saved
// file is never written again. The key is the SHA-256 of the crit's commit, request key, run
// number, and text, the prompt template, and the model. readSavedGoFurther takes no runner, so a
// replay starts no child process. The folder is outside runs/, because every folder in runs/ is a
// skill commit with saved crits. It asks a model, so `npm run ci` never runs it live (CS-21).
//
// Usage:
//   node evals/critic/go-further.ts run    --crit-commit SHA [--skill DIR] [--runs-dir DIR] [--go-further-dir DIR] [--parallel N] IMAGE...
//   node evals/critic/go-further.ts replay --crit-commit SHA --go-further-commit SHA [--runs-dir DIR] [--go-further-dir DIR] IMAGE...
// Each image is a one-image request with no note, focus, or facts file; the runner reads its run-1
// crit at the crit commit.
//
// Exit codes: 0 when every image has its joined crit, 1 when replay finds one missing, and 2 when
// the runner could not run.

import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
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
  type ClaudeRunner,
  CRITIC_MODEL,
  isRecord,
  parseClaudeResult,
  parseParallel,
  readSavedCrits,
  redactPaths,
  requestKey,
  runClaudeProcess,
  runPooled,
  skillCommit,
} from "./run-critic.ts";

const REPOSITORY_DIRECTORY = resolve(import.meta.dirname, "..", "..");
const DEFAULT_SKILL_DIRECTORY = join(
  REPOSITORY_DIRECTORY,
  "plugin",
  "skills",
  "design-critic",
);
const DEFAULT_RUNS_DIRECTORY = join(import.meta.dirname, "runs");
/** Where joined crits live by default. Outside runs/, whose folders are skill commits with crits. */
export const DEFAULT_GO_FURTHER_DIRECTORY = join(
  import.meta.dirname,
  "go-further",
);
const EXIT_CODE_MISSING = 1;
const EXIT_CODE_COULD_NOT_RUN = 2;

/** The bold heading that starts the section, as agents/go-further.md and agents/critic.md's crit format write it. */
export const SECTION_HEADING = "**Where it could go further.**";

/** The starts of the other bold headings of the crit format in agents/critic.md. */
const CRIT_HEADINGS = [
  "**First read",
  "**What it's for",
  "**Verdict",
  "**What would move it most",
  "**Smaller things",
  "**What's working",
  "**Couldn't judge",
  "**Checklist",
];

/**
 * The prompt of the second step, the same text as SKILL.md step 3. buildGoFurtherPrompt fills the
 * placeholders. Its SHA-256 joins the key, so a change to this text makes new results.
 */
export const GO_FURTHER_PROMPT_TEMPLATE = `Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better.

Read <skill folder>/agents/go-further.md and follow it. The skill folder is <skill folder>; every path in go-further.md is relative to it.

Image: <absolute path of the image>
Crit file: <absolute path of crit.md>

You write only the section. Do not edit, move, or create any file except crops in a temporary folder.
End with the section as your final message. If you were spawned as a teammate, also call SendMessage to the agent that spawned you with the section.`;

/** The saved crit the second step extends: where it was saved, its text, and its image. */
export type CritToExtend = {
  readonly critCommit: string;
  readonly critKey: string;
  readonly critRun: number;
  readonly crit: string;
  readonly imagePath: string;
};

/** One saved result: its key, the section, and the crit with the section joined in. */
export type SavedGoFurther = {
  readonly key: string;
  readonly section: string;
  readonly joinedCrit: string;
};

/** Where results live, which skill commit wrote them, and how to start `claude`. */
export type GoFurtherOptions = {
  readonly goFurtherDirectory: string;
  readonly skillDirectory: string;
  readonly goFurtherCommit: string;
  readonly runClaude: ClaudeRunner;
};

/** Returns the SHA-256 of a string or bytes as lowercase hex. */
function sha256(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

/** Fills the prompt with the skill folder, the image, and the crit file. */
export function buildGoFurtherPrompt(
  skillDirectory: string,
  imagePath: string,
  critPath: string,
): string {
  return GO_FURTHER_PROMPT_TEMPLATE.replaceAll("<skill folder>", skillDirectory)
    .replace("<absolute path of the image>", imagePath)
    .replace("<absolute path of crit.md>", critPath);
}

/** Returns the key of a result: the SHA-256 of what it was made from, as JSON in a fixed key order. */
export function goFurtherKey(input: CritToExtend): string {
  return sha256(
    JSON.stringify({
      crit_commit: input.critCommit,
      crit_key: input.critKey,
      crit_run: input.critRun,
      crit_sha256: sha256(input.crit),
      prompt_sha256: sha256(GO_FURTHER_PROMPT_TEMPLATE),
      model_requested: CRITIC_MODEL,
    }),
  );
}

/**
 * Checks the agent's final message and returns the section, trimmed. It throws when the message
 * does not start with the section heading or holds another heading of the crit after it, so a
 * message that copies the crit or adds a preface is never joined.
 */
export function checkSection(message: string): string {
  const section = message.trim();
  if (!section.startsWith(SECTION_HEADING)) {
    throw new Error(
      `the go-further message does not start with ${SECTION_HEADING}: ${section.slice(0, 200)}`,
    );
  }
  // A line that starts with another heading of the crit means more than the section came back.
  const otherHeading = section
    .split("\n")
    .slice(1)
    .find((line) =>
      CRIT_HEADINGS.some((heading) => line.trim().startsWith(heading)),
    );
  if (otherHeading !== undefined) {
    throw new Error(
      `the go-further message holds another section: ${otherHeading.slice(0, 200)}`,
    );
  }
  return section;
}

/**
 * Puts the section into the crit as its own paragraph right after "What's working": before
 * "Couldn't judge from a still" when the crit has it, else before "Checklist", else at the end.
 * It throws when the crit already holds the section, so a crit never gets two.
 */
export function joinSection(crit: string, section: string): string {
  if (crit.includes(SECTION_HEADING)) {
    throw new Error("the crit already holds the section");
  }
  const lines = crit.split("\n");
  const findHeading = (heading: string): number =>
    lines.findIndex((line) => line.trim().startsWith(heading));
  let index = findHeading("**Couldn't judge from a still");
  if (index === -1) {
    index = findHeading("**Checklist");
  }
  if (index === -1) {
    return `${crit.trimEnd()}\n\n${section}\n`;
  }
  const before = lines.slice(0, index).join("\n").trimEnd();
  const after = lines.slice(index).join("\n");
  return `${before}\n\n${section}\n\n${after}`;
}

/** Reads a saved result, or returns undefined when none is saved. It takes no runner, so it cannot start a model call. */
export function readSavedGoFurther(
  goFurtherDirectory: string,
  goFurtherCommit: string,
  key: string,
): SavedGoFurther | undefined {
  const directory = join(goFurtherDirectory, goFurtherCommit);
  const metadataPath = join(directory, `${key}.json`);
  const critPath = join(directory, `${key}.md`);
  if (!existsSync(metadataPath) || !existsSync(critPath)) {
    return undefined;
  }
  const metadata: unknown = JSON.parse(readFileSync(metadataPath, "utf8"));
  if (!isRecord(metadata) || typeof metadata.section !== "string") {
    throw new Error(`${metadataPath} has no section`);
  }
  return {
    key,
    section: metadata.section,
    joinedCrit: readFileSync(critPath, "utf8"),
  };
}

/**
 * Returns the joined crit of a saved crit: the saved one when there is one, and otherwise the
 * result of one new run, saved first. It throws, and saves nothing, when the child fails or its
 * message is not the section alone.
 */
export async function ensureGoFurther(
  input: CritToExtend,
  options: GoFurtherOptions,
): Promise<SavedGoFurther> {
  const key = goFurtherKey(input);
  const saved = readSavedGoFurther(
    options.goFurtherDirectory,
    options.goFurtherCommit,
    key,
  );
  if (saved !== undefined) {
    return saved;
  }
  const once = await runGoFurtherOnce(input, options);
  const section = checkSection(once.message);
  const joinedCrit = joinSection(input.crit, section);
  const directory = join(options.goFurtherDirectory, options.goFurtherCommit);
  mkdirSync(directory, { recursive: true });
  const metadata = {
    crit: {
      commit: input.critCommit,
      key: input.critKey,
      run: input.critRun,
      sha256: sha256(input.crit),
    },
    prompt_sha256: sha256(GO_FURTHER_PROMPT_TEMPLATE),
    model_requested: CRITIC_MODEL,
    go_further_commit: options.goFurtherCommit,
    section,
    ...once.record,
  };
  try {
    // The "wx" flag makes a write fail when the file exists, so a saved file is never written again.
    writeFileSync(join(directory, `${key}.md`), joinedCrit, { flag: "wx" });
    writeFileSync(
      join(directory, `${key}.json`),
      `${JSON.stringify(metadata, null, 2)}\n`,
      { flag: "wx" },
    );
  } catch (error) {
    if (!(isRecord(error) && error.code === "EEXIST")) {
      throw error;
    }
  }
  const savedNow = readSavedGoFurther(
    options.goFurtherDirectory,
    options.goFurtherCommit,
    key,
  );
  if (savedNow === undefined) {
    throw new Error(`go-further result ${key} was not saved`);
  }
  return savedNow;
}

/**
 * Runs the second step once in a new work folder that holds only the image and the crit, and
 * deletes the folder after. Returns the agent's final message and the metadata to save with it.
 */
async function runGoFurtherOnce(
  input: CritToExtend,
  options: GoFurtherOptions,
): Promise<{ message: string; record: Record<string, unknown> }> {
  const workDirectory = mkdtempSync(join(tmpdir(), "crit-go-further-"));
  try {
    const imagePath = join(workDirectory, `image-1${extname(input.imagePath)}`);
    copyFileSync(input.imagePath, imagePath);
    const critPath = join(workDirectory, "crit.md");
    writeFileSync(critPath, input.crit);
    const versionRun = await options.runClaude(
      ["--version"],
      process.env,
      workDirectory,
    );
    if (versionRun.exitCode !== 0) {
      throw new Error(
        `claude --version exited with code ${versionRun.exitCode}: ${versionRun.stderr.slice(0, 500)}`,
      );
    }
    const prompt = buildGoFurtherPrompt(
      options.skillDirectory,
      imagePath,
      critPath,
    );
    const startedAt = new Date();
    const run = await options.runClaude(
      buildClaudeArguments(options.skillDirectory, prompt),
      process.env,
      workDirectory,
    );
    if (run.exitCode !== 0) {
      throw new Error(
        `claude go-further exited with code ${run.exitCode}: ${run.stderr.slice(0, 500)} ${run.stdout.slice(0, 500)}`,
      );
    }
    const result = parseClaudeResult(run.stdout);
    return {
      message: result.crit,
      record: {
        message: result.crit,
        model_ids: result.modelIds,
        permission_denials: redactPaths(result.permissionDenials),
        claude_version: versionRun.stdout.trim(),
        num_turns: result.numTurns,
        total_cost_usd: result.totalCostUsd,
        started_at: startedAt.toISOString(),
        duration_ms: Date.now() - startedAt.getTime(),
      },
    };
  } finally {
    rmSync(workDirectory, { recursive: true, force: true });
  }
}

/** What the command returns: the text to print and the exit code. */
export type GoFurtherCommandResult = {
  readonly text: string;
  readonly errorText: string;
  readonly exitCode: number;
};

/** Where the command reads and writes by default, and how it starts `claude`. Tests pass a stub runner. */
export type GoFurtherCommandOptions = {
  readonly runsDirectory: string;
  readonly goFurtherDirectory: string;
  readonly skillDirectory: string;
  readonly runClaude: ClaudeRunner;
};

/**
 * Parses the command line, then for each image reads its run-1 crit at the crit commit and, in run
 * mode, makes or reads its joined crit, or in replay mode only reads it. Prints one line per image
 * with the joined crit's path.
 */
export async function runGoFurtherCommand(
  argv: readonly string[],
  options: GoFurtherCommandOptions,
): Promise<GoFurtherCommandResult> {
  try {
    const parsed = parseArgs({
      args: [...argv],
      options: {
        "crit-commit": { type: "string" },
        "go-further-commit": { type: "string" },
        skill: { type: "string" },
        "runs-dir": { type: "string" },
        "go-further-dir": { type: "string" },
        parallel: { type: "string" },
      },
      strict: true,
      allowPositionals: true,
    });
    const [mode, ...imagePaths] = parsed.positionals;
    if (mode !== "run" && mode !== "replay") {
      throw new Error("name a mode, run or replay");
    }
    const critCommit = parsed.values["crit-commit"];
    if (critCommit === undefined) {
      throw new Error("--crit-commit is required");
    }
    if (imagePaths.length === 0) {
      throw new Error("name at least one image");
    }
    const skillDirectory = resolve(
      parsed.values.skill ?? options.skillDirectory,
    );
    const replay = mode === "replay";
    // ?? gives the right side only when --go-further-commit is not given.
    const goFurtherCommit =
      parsed.values["go-further-commit"] ??
      (replay ? undefined : skillCommit(skillDirectory));
    if (goFurtherCommit === undefined) {
      throw new Error("replay needs --go-further-commit");
    }
    const runsDirectory = resolve(
      parsed.values["runs-dir"] ?? options.runsDirectory,
    );
    const goFurtherDirectory = resolve(
      parsed.values["go-further-dir"] ?? options.goFurtherDirectory,
    );
    const parallel = parseParallel(parsed.values.parallel);
    const inputs: CritToExtend[] = imagePaths.map((imagePath) => {
      const absoluteImagePath = resolve(imagePath);
      const critKey = requestKey(
        [sha256(readFileSync(absoluteImagePath))],
        undefined,
        undefined,
      );
      const crits = readSavedCrits(runsDirectory, critCommit, critKey);
      const first = crits[0];
      if (first === undefined) {
        throw new Error(
          `no saved crit at ${critCommit} for ${absoluteImagePath}`,
        );
      }
      return {
        critCommit,
        critKey,
        critRun: first.runNumber,
        crit: first.crit,
        imagePath: absoluteImagePath,
      };
    });
    const lines: string[] = [];
    const missing: string[] = [];
    if (replay) {
      for (const input of inputs) {
        const key = goFurtherKey(input);
        const saved = readSavedGoFurther(
          goFurtherDirectory,
          goFurtherCommit,
          key,
        );
        if (saved === undefined) {
          missing.push(`missing: ${input.imagePath}`);
          continue;
        }
        lines.push(
          `${input.imagePath}\t${join(goFurtherDirectory, goFurtherCommit, `${key}.md`)}`,
        );
      }
    } else {
      const results = await runPooled(inputs, parallel, (input) =>
        ensureGoFurther(input, {
          goFurtherDirectory,
          skillDirectory,
          goFurtherCommit,
          runClaude: options.runClaude,
        }),
      );
      inputs.forEach((input, index) => {
        const result = results[index] as SavedGoFurther;
        lines.push(
          `${input.imagePath}\t${join(goFurtherDirectory, goFurtherCommit, `${result.key}.md`)}`,
        );
      });
    }
    return {
      text: lines.length > 0 ? `${lines.join("\n")}\n` : "",
      errorText: missing.length > 0 ? `${missing.join("\n")}\n` : "",
      exitCode: missing.length > 0 ? EXIT_CODE_MISSING : 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      text: "",
      errorText: `go-further stopped: ${message}\n`,
      exitCode: EXIT_CODE_COULD_NOT_RUN,
    };
  }
}

/** Runs the command with the default folders and the real `claude` runner, prints, and sets the exit code. */
export async function main(): Promise<void> {
  const output = await runGoFurtherCommand(process.argv.slice(2), {
    runsDirectory: DEFAULT_RUNS_DIRECTORY,
    goFurtherDirectory: DEFAULT_GO_FURTHER_DIRECTORY,
    skillDirectory: DEFAULT_SKILL_DIRECTORY,
    runClaude: runClaudeProcess,
  });
  process.stdout.write(output.text);
  process.stderr.write(output.errorText);
  process.exitCode = output.exitCode;
}

// Run only when node starts this file, not when a test imports it.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
