// The shared judge of the critic evaluations (PRD EV-16 and the evaluations after it). It asks a
// model one text-only question about saved crits with `claude -p --json-schema`, checks the
// structured answer, and saves it once under evals/critic/runs/<skill-commit>/judge/<key>.json.
// It never writes a saved answer again, and a replay reads the saved answer with no model call.
//
// It asks a model, so `npm run ci` never calls ensureJudgeAnswer with the real runner (CS-21).

import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type ClaudeRunner,
  CRITIC_ISOLATION_FLAG,
  CRITIC_PERMISSION_MODE,
  redactPaths,
} from "./run-critic.ts";

/**
 * The full model id of the judge. Opus on purpose: a judge mistake goes into every score, and the
 * calls are text only, so they are cheap. A full id, not an alias, so a saved answer names its model.
 */
export const JUDGE_MODEL = "claude-opus-5-5";

/** One saved crit the judge reads: the request key of the crit and its run number. */
export type CritReference = { readonly key: string; readonly run: number };

/**
 * One judge question. `name` names the evaluation, `prompt` embeds the crit text, `schema` is the
 * JSON Schema of the answer, and `crits` names the saved crits the prompt embeds.
 */
export type JudgeQuestion = {
  readonly name: string;
  readonly system: string;
  readonly prompt: string;
  readonly schema: Readonly<Record<string, unknown>>;
  readonly crits: readonly CritReference[];
};

/** Where judge answers live, which skill commit they belong to, and how to start `claude`. */
export type JudgeOptions = {
  readonly runsDirectory: string;
  readonly skillCommit: string;
  readonly runClaude: ClaudeRunner;
};

/** Returns true when a value is a plain object, so its fields can be read. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Returns a copy of a JSON value with the keys of every object sorted, so equal values give equal JSON. */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (isRecord(value)) {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortKeys(value[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * Returns the key of a judge question: the SHA-256 of {model, name, system, prompt, schema, crits}
 * as JSON with sorted keys. The prompt embeds the crit text, so a changed prompt, schema, model,
 * or crit gives a new key and a new call.
 */
export function judgeKey(question: JudgeQuestion): string {
  const canonical = JSON.stringify(
    sortKeys({
      model: JUDGE_MODEL,
      name: question.name,
      system: question.system,
      prompt: question.prompt,
      schema: question.schema,
      crits: question.crits,
    }),
  );
  return createHash("sha256").update(canonical).digest("hex");
}

/**
 * Returns the `claude` arguments for one judge call: no tools, no customizations, the pinned
 * model, and the answer schema. As in the critic runner, the prompt goes last, after an option
 * that takes one value, so --tools, which takes a list, cannot swallow it.
 */
export function judgeArguments(question: JudgeQuestion): string[] {
  return [
    "-p",
    CRITIC_ISOLATION_FLAG,
    "--model",
    JUDGE_MODEL,
    "--permission-mode",
    CRITIC_PERMISSION_MODE,
    "--output-format",
    "json",
    "--no-session-persistence",
    "--strict-mcp-config",
    "--disable-slash-commands",
    // An empty string means no built-in tools (claude --help).
    "--tools",
    "",
    "--json-schema",
    JSON.stringify(question.schema),
    "--system-prompt",
    question.system,
    question.prompt,
  ];
}

/** Returns the path of the saved answer to a judge question. */
export function judgeAnswerPath(
  runsDirectory: string,
  skillCommit: string,
  key: string,
): string {
  return join(runsDirectory, skillCommit, "judge", `${key}.json`);
}

/**
 * Reads the saved answer to a judge question and checks it with `parse`. Returns undefined when no
 * answer is saved. It takes no runner, so it cannot start a model call.
 */
export function readJudgeAnswer<Answer>(
  question: JudgeQuestion,
  parse: (value: unknown) => Answer,
  runsDirectory: string,
  skillCommit: string,
): Answer | undefined {
  const answerPath = judgeAnswerPath(
    runsDirectory,
    skillCommit,
    judgeKey(question),
  );
  if (!existsSync(answerPath)) {
    return undefined;
  }
  const saved: unknown = JSON.parse(readFileSync(answerPath, "utf8"));
  if (!isRecord(saved)) {
    throw new Error(`${answerPath} does not hold a JSON object`);
  }
  return parse(saved.answer);
}

/** The checked fields of the JSON that `claude -p --output-format json --json-schema` prints. */
type JudgeResult = {
  readonly structuredOutput: unknown;
  readonly modelIds: readonly string[];
  readonly totalCostUsd: unknown;
  readonly permissionDenials: readonly unknown[];
};

/**
 * Reads the JSON a judge call printed. It throws unless type is "result", subtype is "success",
 * and is_error is false. The structured answer is in the `structured_output` field.
 */
function parseJudgeResult(stdout: string): JudgeResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    throw new Error(
      `claude printed output that is not JSON: ${stdout.slice(0, 200)}`,
    );
  }
  if (!isRecord(parsed)) {
    throw new Error("claude printed JSON that is not an object");
  }
  if (parsed.type !== "result") {
    throw new Error(
      `claude result has type ${String(parsed.type)}, not result`,
    );
  }
  if (parsed.subtype !== "success") {
    throw new Error(
      `claude result has subtype ${String(parsed.subtype)}, not success`,
    );
  }
  if (parsed.is_error !== false) {
    throw new Error(
      `claude result has is_error ${String(parsed.is_error)}, not false`,
    );
  }
  let modelIds: string[] = [];
  if (isRecord(parsed.modelUsage)) {
    modelIds = Object.keys(parsed.modelUsage);
  }
  let permissionDenials: unknown[] = [];
  if (Array.isArray(parsed.permission_denials)) {
    permissionDenials = parsed.permission_denials;
  }
  return {
    structuredOutput: parsed.structured_output,
    modelIds,
    // ?? gives the right side when the left side is null or undefined.
    totalCostUsd: parsed.total_cost_usd ?? null,
    permissionDenials,
  };
}

/** Returns true when an error is Node's "file already exists" error. */
function isFileExistsError(error: unknown): boolean {
  return isRecord(error) && error.code === "EEXIST";
}

/**
 * Returns the answer to a judge question: the saved answer when there is one, and otherwise the
 * answer of one new `claude -p` call, saved first. The call runs in a new empty temp folder, so no
 * project file loads. Any failure, including a wrong-shaped answer, throws and saves nothing.
 */
export async function ensureJudgeAnswer<Answer>(
  question: JudgeQuestion,
  parse: (value: unknown) => Answer,
  options: JudgeOptions,
): Promise<Answer> {
  const saved = readJudgeAnswer(
    question,
    parse,
    options.runsDirectory,
    options.skillCommit,
  );
  if (saved !== undefined) {
    return saved;
  }
  const workDirectory = mkdtempSync(join(tmpdir(), "crit-judge-"));
  let run: Awaited<ReturnType<ClaudeRunner>>;
  try {
    run = await options.runClaude(
      judgeArguments(question),
      process.env,
      workDirectory,
    );
  } finally {
    rmSync(workDirectory, { recursive: true, force: true });
  }
  if (run.exitCode !== 0) {
    throw new Error(
      `claude judge call exited with code ${run.exitCode}: ${run.stderr.slice(0, 500)} ${run.stdout.slice(0, 500)}`,
    );
  }
  const result = parseJudgeResult(run.stdout);
  const answer = parse(result.structuredOutput);
  const record = {
    model_requested: JUDGE_MODEL,
    model_ids: result.modelIds,
    name: question.name,
    crits: question.crits,
    system: question.system,
    prompt: question.prompt,
    schema: question.schema,
    answer: result.structuredOutput,
    saved_at: new Date().toISOString(),
    total_cost_usd: result.totalCostUsd,
    permission_denials: redactPaths(result.permissionDenials),
  };
  const answerPath = judgeAnswerPath(
    options.runsDirectory,
    options.skillCommit,
    judgeKey(question),
  );
  mkdirSync(join(options.runsDirectory, options.skillCommit, "judge"), {
    recursive: true,
  });
  try {
    // The "wx" flag makes the write fail when the file exists, so a saved answer is never written again.
    writeFileSync(answerPath, `${JSON.stringify(record, null, 2)}\n`, {
      flag: "wx",
    });
  } catch (error) {
    if (!isFileExistsError(error)) {
      throw error;
    }
    const savedByOther = readJudgeAnswer(
      question,
      parse,
      options.runsDirectory,
      options.skillCommit,
    );
    if (savedByOther !== undefined) {
      return savedByOther;
    }
  }
  return answer;
}
