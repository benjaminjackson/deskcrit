// The refuter runner (PRD FR-81, EV-14). It runs the skill's refuter agent (agents/refuter.md) on
// one saved crit as a headless `claude -p` child process, with the same isolation, model, and
// allowed commands as the critic runner. The child gets the image as image-1.png, the crit's ranked
// findings as findings.md, and the measured facts file as facts.json when there is one, in a new
// work folder, so it never sees a fixture name. Its final message is the verdict JSON; the skill's
// scripts/refute.mjs checks it and applies it to the crit.
//
// Each refutation is saved once as runs/<refuter-commit>/refute/<key>.md (the crit after the
// refuter) and <key>.json (the verdicts, the agent's message, and the metadata), with the "wx"
// flag, so a saved file is never written again. The key is the SHA-256 of the crit's commit,
// request key, run number, and text, the facts file's SHA-256, the prompt template, and the model.
// readSavedRefutation takes no runner, so a replay starts no child process. detect.ts --refute is
// the only caller; it asks a model, so `npm run ci` never runs it live (CS-21).

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
import { extname, join } from "node:path";
import {
  applyVerdicts,
  findingsFileText,
  parseVerdicts,
  rankedFindingTexts,
} from "../../plugin/skills/design-critic/scripts/refute.mjs";
import {
  buildClaudeArguments,
  type ClaudeRunner,
  CRITIC_MODEL,
  isRecord,
  parseClaudeResult,
  redactPaths,
} from "./run-critic.ts";

/**
 * The prompt of the refuter. buildRefuterPrompt fills the placeholders. Its SHA-256 joins the
 * refutation key, so a change to this text makes new refutations.
 */
export const REFUTER_PROMPT_TEMPLATE = `Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better.

Read <skill folder>/agents/refuter.md and follow it. The skill folder is <skill folder>; every path in refuter.md is relative to it.

Image: <absolute path of the image>
Findings file: <absolute path of findings.md>
<Measured facts file line, or nothing>
You check only. Do not edit, move, or create any file except crops in a temporary folder.
End with the JSON object as your final message. If you were spawned as a teammate, also call SendMessage to the agent that spawned you with that JSON object.`;

const FACTS_PLACEHOLDER = "<Measured facts file line, or nothing>\n";

/** One verdict of the refuter on one ranked finding. */
export type RefuterVerdict = {
  readonly number: number;
  readonly verdict: "keep" | "drop";
  readonly evidence: string;
};

/** The saved crit the refuter checks: where it was saved, and its text. */
export type CritToRefute = {
  readonly critCommit: string;
  readonly critKey: string;
  readonly critRun: number;
  readonly crit: string;
  readonly imagePath: string;
  readonly factsPath?: string;
};

/** One saved refutation: its key, the verdicts, and the crit after the refuter. */
export type SavedRefutation = {
  readonly key: string;
  readonly verdicts: readonly RefuterVerdict[];
  readonly refutedCrit: string;
  readonly rankedCount: number;
  readonly droppedCount: number;
};

/** Where refutations live, which refuter commit they belong to, and how to start `claude`. */
export type RefuterOptions = {
  readonly runsDirectory: string;
  readonly skillDirectory: string;
  readonly refuterCommit: string;
  readonly runClaude: ClaudeRunner;
};

/** Returns the SHA-256 of a string or bytes as lowercase hex. */
function sha256(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

/** Fills the refuter prompt with the skill folder, the image, the findings file, and the facts line when there is a facts file. */
export function buildRefuterPrompt(
  skillDirectory: string,
  imagePath: string,
  findingsPath: string,
  factsPath: string | undefined,
): string {
  const factsLine =
    factsPath === undefined ? "" : `Measured facts file: ${factsPath}\n`;
  return REFUTER_PROMPT_TEMPLATE.replaceAll("<skill folder>", skillDirectory)
    .replace("<absolute path of the image>", imagePath)
    .replace("<absolute path of findings.md>", findingsPath)
    .replace(FACTS_PLACEHOLDER, factsLine);
}

/** Returns the key of a refutation: the SHA-256 of what it was made from, as JSON in a fixed key order. */
export function refutationKey(input: CritToRefute): string {
  return sha256(
    JSON.stringify({
      crit_commit: input.critCommit,
      crit_key: input.critKey,
      crit_run: input.critRun,
      crit_sha256: sha256(input.crit),
      facts_sha256:
        input.factsPath === undefined
          ? null
          : sha256(readFileSync(input.factsPath)),
      prompt_sha256: sha256(REFUTER_PROMPT_TEMPLATE),
      model_requested: CRITIC_MODEL,
    }),
  );
}

/** Returns the folder that holds the refutations of one refuter commit. */
function refutationDirectory(runsDirectory: string, commit: string): string {
  return join(runsDirectory, commit, "refute");
}

/** Counts the findings a list of verdicts drops. */
function countDropped(verdicts: readonly RefuterVerdict[]): number {
  return verdicts.filter((verdict) => verdict.verdict === "drop").length;
}

/**
 * Reads a saved refutation, or returns undefined when none is saved. It takes no runner, so it
 * cannot start a model call.
 */
export function readSavedRefutation(
  runsDirectory: string,
  refuterCommit: string,
  key: string,
): SavedRefutation | undefined {
  const directory = refutationDirectory(runsDirectory, refuterCommit);
  const metadataPath = join(directory, `${key}.json`);
  const critPath = join(directory, `${key}.md`);
  if (!existsSync(metadataPath) || !existsSync(critPath)) {
    return undefined;
  }
  const metadata: unknown = JSON.parse(readFileSync(metadataPath, "utf8"));
  if (!isRecord(metadata) || !Array.isArray(metadata.verdicts)) {
    throw new Error(`${metadataPath} has no verdicts list`);
  }
  const rankedCount = metadata.ranked_count;
  if (typeof rankedCount !== "number") {
    throw new Error(`${metadataPath} has no ranked_count`);
  }
  // parseVerdicts checks each saved verdict again, so a hand-edited file is refused.
  const verdicts: RefuterVerdict[] = parseVerdicts(
    JSON.stringify({ findings: metadata.verdicts }),
    rankedCount,
  );
  return {
    key,
    verdicts,
    refutedCrit: readFileSync(critPath, "utf8"),
    rankedCount,
    droppedCount: countDropped(verdicts),
  };
}

/**
 * Returns the refutation of a saved crit: the saved one when there is one, and otherwise the result
 * of one new refuter run, saved first. A crit with no ranked finding needs no run: it is saved with
 * no verdicts and its text unchanged. It throws, and saves nothing, when the child fails or its
 * message is not a verdict for each ranked finding.
 */
export async function ensureRefutation(
  input: CritToRefute,
  options: RefuterOptions,
): Promise<SavedRefutation> {
  const key = refutationKey(input);
  const saved = readSavedRefutation(
    options.runsDirectory,
    options.refuterCommit,
    key,
  );
  if (saved !== undefined) {
    return saved;
  }
  const rankedCount = rankedFindingTexts(input.crit).length;
  let verdicts: RefuterVerdict[] = [];
  let runRecord: Record<string, unknown> = {};
  if (rankedCount > 0) {
    const once = await runRefuterOnce(input, options);
    verdicts = parseVerdicts(once.message, rankedCount);
    runRecord = once.record;
  }
  const refutedCrit = applyVerdicts(input.crit, verdicts);
  const directory = refutationDirectory(
    options.runsDirectory,
    options.refuterCommit,
  );
  mkdirSync(directory, { recursive: true });
  const metadata = {
    crit: {
      commit: input.critCommit,
      key: input.critKey,
      run: input.critRun,
      sha256: sha256(input.crit),
    },
    facts_sha256:
      input.factsPath === undefined
        ? null
        : sha256(readFileSync(input.factsPath)),
    prompt_sha256: sha256(REFUTER_PROMPT_TEMPLATE),
    model_requested: CRITIC_MODEL,
    refuter_commit: options.refuterCommit,
    ranked_count: rankedCount,
    verdicts,
    ...runRecord,
  };
  try {
    // The "wx" flag makes a write fail when the file exists, so a saved file is never written again.
    writeFileSync(join(directory, `${key}.md`), refutedCrit, { flag: "wx" });
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
  const savedNow = readSavedRefutation(
    options.runsDirectory,
    options.refuterCommit,
    key,
  );
  if (savedNow === undefined) {
    throw new Error(`refutation ${key} was not saved`);
  }
  return savedNow;
}

/**
 * Runs the refuter once in a new work folder that holds only the image, the findings file, and the
 * facts file, and deletes the folder after. Returns the agent's final message and the metadata to
 * save with it.
 */
async function runRefuterOnce(
  input: CritToRefute,
  options: RefuterOptions,
): Promise<{ message: string; record: Record<string, unknown> }> {
  const workDirectory = mkdtempSync(join(tmpdir(), "crit-refuter-"));
  try {
    const imagePath = join(workDirectory, `image-1${extname(input.imagePath)}`);
    copyFileSync(input.imagePath, imagePath);
    const findingsPath = join(workDirectory, "findings.md");
    writeFileSync(findingsPath, findingsFileText(input.crit));
    let factsPath: string | undefined;
    if (input.factsPath !== undefined) {
      factsPath = join(workDirectory, "facts.json");
      copyFileSync(input.factsPath, factsPath);
    }
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
    const prompt = buildRefuterPrompt(
      options.skillDirectory,
      imagePath,
      findingsPath,
      factsPath,
    );
    const startedAt = new Date();
    const run = await options.runClaude(
      buildClaudeArguments(options.skillDirectory, prompt),
      process.env,
      workDirectory,
    );
    if (run.exitCode !== 0) {
      throw new Error(
        `claude refuter exited with code ${run.exitCode}: ${run.stderr.slice(0, 500)} ${run.stdout.slice(0, 500)}`,
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
