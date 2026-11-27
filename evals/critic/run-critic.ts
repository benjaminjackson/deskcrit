// The critic runner (PRD EV-14 to EV-20). It runs the design-critic skill on one or more images as
// a headless Claude Code child process (`claude -p`), saves each crit under
// evals/critic/runs/<skill-commit>/<key>/<n>.md with its metadata in <n>.json, and never writes a
// saved file again. Replay mode reads the saved crits and starts no child process. Other
// evaluations import ensureCrits and readSavedCrits.
//
// It asks a model, so `npm run ci` never runs it (CS-21); a person starts run mode by hand.
//
// Usage:
//   node evals/critic/run-critic.ts run    [--skill DIR] [--runs N] [--parallel N] [--runs-dir DIR] [--brief FILE] [--note TEXT] [--facts FILE] IMAGE...
//   node evals/critic/run-critic.ts replay [--skill DIR | --skill-commit SHA] [--runs-dir DIR] [--brief FILE] [--note TEXT] [--facts FILE] IMAGE...
//   node evals/critic/run-critic.ts --help
// Each image on the command line is a separate one-image request. A request may carry a measured
// facts file (FR-79): its SHA-256 joins the request key and its prompt line joins the prompt hash,
// so a run with facts never shares a saved run with one without. A request may carry a brief file
// (FR-87) the same way: its Brief block takes the place of the note and focus lines, and its
// SHA-256 joins the request key.
//
// Exit codes: 0 when every request has its crits, 1 when replay finds an image with no saved crit,
// and 2 when the runner could not run.

import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir, tmpdir } from "node:os";
import { extname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const REPOSITORY_DIRECTORY = resolve(import.meta.dirname, "..", "..");
const DEFAULT_RUNS_DIRECTORY = join(import.meta.dirname, "runs");
const DEFAULT_SKILL_DIRECTORY = join(
  REPOSITORY_DIRECTORY,
  "plugin",
  "skills",
  "design-critic",
);
const EXIT_CODE_MISSING_CRIT = 1;
const EXIT_CODE_COULD_NOT_RUN = 2;
const CHILD_TIMEOUT_MILLISECONDS = 20 * 60 * 1000;
const MAX_BUDGET_USD = "5";

/** The full model id the critic runs on. A full id, not the alias "opus", so a saved run names the model it was made with. */
export const CRITIC_MODEL = "claude-opus-5-5";

/**
 * The permission mode of the child. In dontAsk mode, every call that would prompt is denied, and
 * only the allow list and actions that need no approval run, whatever the user's settings say.
 */
export const CRITIC_PERMISSION_MODE = "dontAsk";

/**
 * The isolation flag of the child. --safe-mode turns off the user's CLAUDE.md, skills, plugins,
 * hooks, and MCP servers, while auth and permissions work normally (claude --help). It does not
 * depend on the environment, so a run made on one machine replays on another.
 */
export const CRITIC_ISOLATION_FLAG = "--safe-mode";

/**
 * Settings passed to the child with --settings. blockReadsOutsideWorkingDirectories makes the file
 * tools refuse reads outside the working folders (CRITIC_READABLE_FOLDERS), so the critic cannot
 * read fixture names or label files in the repository.
 */
export const CRITIC_SETTINGS = JSON.stringify({
  permissions: { blockReadsOutsideWorkingDirectories: true },
});

/**
 * The folders the critic may read: the work folder (its working directory), the skill folder, and
 * the system temp folder (os.tmpdir()), all given with --add-dir except the work folder. The temp
 * folder is there because the skill's scripts/crop.mjs writes its crops into a new folder in the
 * system temp folder, and without this folder Read refuses every crop. The work folder is
 * made inside the system temp folder, so the critic can also list other temp folders of this user,
 * but not the repository.
 */
export const CRITIC_READABLE_FOLDERS =
  "work folder, skill folder, system temp folder";

/** How a run was made. A saved run counts only when every field matches the current values. */
export type RunIdentity = {
  readonly prompt_sha256: string;
  readonly model_requested: string;
  readonly isolation_flag: string;
  readonly permission_mode: string;
  readonly settings: string;
  readonly readable_folders: string;
};

/**
 * The prompt from step 2 of the skill's SKILL.md, word for word. buildPrompt fills the
 * placeholders. Its SHA-256 is saved with each run as prompt_sha256, so a change to this text
 * makes ensureCrits start new runs.
 */
export const CRITIC_PROMPT_TEMPLATE = `Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better.

Read <skill folder>/agents/critic.md and follow it. The skill folder is <skill folder>; every path in critic.md is relative to it.

Image(s): <absolute paths>
What I know about the piece: <purpose, audience, medium, or "nothing">
<Any focus the caller asked for, such as "compare v1 and v2" or "only the chart". Omit if none.>

You critique only. Do not edit, move, or create any file except crops in a temporary folder.
When the critique is done, end with the full critique as your final message. If you were spawned as a teammate, also call SendMessage to the agent that spawned you with the full critique.`;

/**
 * The line that SKILL.md step 2 says to add after the Image(s) line when the caller has a measured
 * facts file (FR-79). It is not in CRITIC_PROMPT_TEMPLATE, so a run without facts keeps the prompt,
 * and the prompt hash, it had before facts existed.
 */
export const FACTS_PROMPT_LINE =
  "Measured facts file: <absolute path of facts.json>";

/** The name the facts file gets in the work folder: neutral, so it never names a fixture. */
export const WORK_FACTS_FILE_NAME = "facts.json";

/**
 * The Jev evidence line that runs with Jev evidence had after the Image(s) line. It stays, with the
 * `withJev` argument of promptTemplate and currentRunIdentity and the `jevEvidenceSha256` argument
 * of requestKey, only so the saved runs of skill commit 82b57a1f still replay after Jev was
 * removed (crit-mk9.3).
 */
export const JEV_EVIDENCE_PROMPT_LINE =
  "Jev evidence file: <absolute path the script printed>";

/** The Image(s) line of the template, which the facts line follows. */
const IMAGES_PROMPT_LINE = "Image(s): <absolute paths>";

/** The first line of the Brief block (FR-87), as step 1 of the skill's SKILL.md writes it. */
const BRIEF_PROMPT_HEADER = "Brief:";

/** The placeholder of the brief lines in the template of a request with a brief. */
const BRIEF_LINES_PLACEHOLDER = "<brief lines>";

/**
 * The labels a line of a brief file may start with (FR-87): the eight fields in their order, and the
 * "not" lines of the first five.
 */
export const BRIEF_LABELS: readonly string[] = [
  "Job",
  "Job, not",
  "Audience",
  "Audience, not",
  "Setting",
  "Setting, not",
  "Message",
  "Message, not",
  "Brand and tone",
  "Brand and tone, not",
  "Fixed",
  "Stage",
  "Ask",
];

const NOTE_PROMPT_LINE =
  'What I know about the piece: <purpose, audience, medium, or "nothing">';

const FOCUS_PLACEHOLDER_LINE =
  '<Any focus the caller asked for, such as "compare v1 and v2" or "only the chart". Omit if none.>';

/**
 * Returns the prompt template of a request: the facts line after the Image(s) line when it has
 * facts, and the Jev evidence line after those when `withJev` is true. With a brief (FR-87), the
 * Brief block takes the place of the note line and the focus line, because the brief's Ask holds
 * the focus. With none of the three it is CRITIC_PROMPT_TEMPLATE exactly, so saved runs keep their
 * prompt hash. `withJev` stays only so the saved runs of skill commit 82b57a1f still replay after
 * Jev was removed (crit-mk9.3).
 */
export function promptTemplate(
  withFacts: boolean,
  withJev = false,
  withBrief = false,
): string {
  let template = CRITIC_PROMPT_TEMPLATE;
  let addedLines = "";
  if (withFacts) {
    addedLines += `\n${FACTS_PROMPT_LINE}`;
  }
  if (withJev) {
    addedLines += `\n${JEV_EVIDENCE_PROMPT_LINE}`;
  }
  if (addedLines !== "") {
    template = template.replace(
      IMAGES_PROMPT_LINE,
      `${IMAGES_PROMPT_LINE}${addedLines}`,
    );
  }
  if (withBrief) {
    template = template.replace(
      `${NOTE_PROMPT_LINE}\n${FOCUS_PLACEHOLDER_LINE}`,
      `${BRIEF_PROMPT_HEADER}\n${BRIEF_LINES_PLACEHOLDER}`,
    );
  }
  return template;
}

/**
 * Checks the text of a brief file and returns its field lines, trimmed, joined by line breaks. A
 * first line that is exactly "Brief:" is left out, because crit-loop's brief.md holds the whole
 * block. Each other line must start with one of BRIEF_LABELS and ": ", and each label must come
 * later in BRIEF_LABELS than the label of the line before it. That one order rule stops a wrong
 * order, a repeated label, and a "not" line that is not right after its field, so the critic gets
 * the block the way step 1 of SKILL.md writes it. It stops with one line naming the file and the bad
 * line.
 */
export function parseBriefText(text: string, briefPath: string): string {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");
  if (lines[0] === BRIEF_PROMPT_HEADER) {
    lines.shift();
  }
  if (lines.length === 0) {
    throw new Error(`brief file ${briefPath} has no field`);
  }
  let lastLabelIndex = -1;
  for (const line of lines) {
    const labelIndex = BRIEF_LABELS.findIndex((label) =>
      line.startsWith(`${label}: `),
    );
    if (labelIndex === -1) {
      throw new Error(
        `brief file ${briefPath}: line does not start with a brief label and ": ": ${line}`,
      );
    }
    if (labelIndex <= lastLabelIndex) {
      throw new Error(
        `brief file ${briefPath}: line is out of order, repeated, or a "not" line away from its field: ${line}`,
      );
    }
    lastLabelIndex = labelIndex;
  }
  return lines.join("\n");
}

/** Reads a brief file and returns its checked field lines (parseBriefText); it stops when the file does not exist. */
export function readBriefLines(briefPath: string): string {
  if (!existsSync(briefPath)) {
    throw new Error(`brief file ${briefPath} does not exist`);
  }
  return parseBriefText(readFileSync(briefPath, "utf8"), briefPath);
}

/** What a child process returned. */
export type ClaudeRunResult = {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
};

/** Starts one `claude` child process. Tests pass a stub; only main passes the real one. */
export type ClaudeRunner = (
  args: readonly string[],
  environment: NodeJS.ProcessEnv,
  workingDirectory: string,
) => Promise<ClaudeRunResult>;

/**
 * One request to the critic: the images in order, an optional note and focus, an optional
 * measured facts file (FR-79), and an optional brief file (FR-87), which goes with no note or focus.
 */
export type CritRequest = {
  readonly imagePaths: readonly string[];
  readonly note?: string;
  readonly focus?: string;
  readonly factsPath?: string;
  readonly briefPath?: string;
};

/** One saved run: its number, the crit text, its metadata, and both file paths. */
export type SavedCrit = {
  readonly runNumber: number;
  readonly critPath: string;
  readonly metadataPath: string;
  readonly crit: string;
  readonly metadata: Record<string, unknown>;
};

/** Where the runs live and how to start the child process. */
export type CriticRunnerOptions = {
  readonly runsDirectory: string;
  readonly skillDirectory: string;
  readonly skillCommit?: string;
  readonly runClaude: ClaudeRunner;
};

/** The crit text and the metadata read from the JSON that `claude -p --output-format json` prints. */
export type ClaudeResult = {
  readonly crit: string;
  readonly sessionId: unknown;
  readonly numTurns: unknown;
  readonly usage: unknown;
  readonly totalCostUsd: unknown;
  readonly modelIds: readonly string[];
  readonly permissionDenials: readonly unknown[];
};

/**
 * Returns a path that is safe to commit in a metadata file: relative to the repository root when
 * the path is inside it, otherwise only its last `segmentsOutside` segments. An absolute path
 * would save the user's home folder and the worktree name.
 */
export function portablePath(path: string, segmentsOutside: number): string {
  const absolutePath = resolve(path);
  const fromRepository = relative(REPOSITORY_DIRECTORY, absolutePath);
  // relative() starts with ".." when the path is outside the repository, and is absolute when it
  // is on another drive (Windows).
  if (
    fromRepository !== "" &&
    !fromRepository.startsWith("..") &&
    !isAbsolute(fromRepository)
  ) {
    return fromRepository.split(sep).join("/");
  }
  const segments = absolutePath.split(sep).filter((segment) => segment !== "");
  return segments.slice(-segmentsOutside).join("/");
}

/** Returns the SHA-256 of a string or bytes as lowercase hex. */
function sha256(content: string | Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Fills the prompt template with the skill folder, image paths, note, optional focus line, and,
 * when `factsPath` is given, the facts line with that path. When `briefLines` is given (the checked
 * lines of a brief file, from parseBriefText), they take the place of the note and focus lines.
 * runCriticCommand refuses --brief with --note before any prompt is built.
 */
export function buildPrompt(
  skillDirectory: string,
  imagePaths: readonly string[],
  note: string | undefined,
  focus: string | undefined,
  factsPath?: string,
  briefLines?: string,
): string {
  // A function as the replacement keeps any "$" in the filled text literal; a plain string
  // would read $&, $` and $' as patterns.
  let prompt = promptTemplate(
    factsPath !== undefined,
    false,
    briefLines !== undefined,
  ).replaceAll("<skill folder>", () => skillDirectory);
  if (factsPath !== undefined) {
    prompt = prompt.replace("<absolute path of facts.json>", () => factsPath);
  }
  prompt = prompt.replace("<absolute paths>", () => imagePaths.join(", "));
  if (briefLines !== undefined) {
    return prompt.replace(BRIEF_LINES_PLACEHOLDER, () => briefLines);
  }
  prompt = prompt.replace(
    '<purpose, audience, medium, or "nothing">',
    () => note ?? "nothing",
  );
  if (focus === undefined) {
    // Drop the whole placeholder line, with its line break, when there is no focus.
    prompt = prompt.replace(`${FOCUS_PLACEHOLDER_LINE}\n`, "");
  } else {
    prompt = prompt.replace(FOCUS_PLACEHOLDER_LINE, () => focus);
  }
  return prompt;
}

/**
 * Returns what a new run would be made with. A run with a facts file or a brief has its own
 * template, so its prompt hash differs; a run with neither keeps the hash of the saved runs.
 * `withJev` stays only so the saved runs of skill commit 82b57a1f still replay after Jev was
 * removed (crit-mk9.3).
 */
export function currentRunIdentity(
  withFacts = false,
  withJev = false,
  withBrief = false,
): RunIdentity {
  return {
    prompt_sha256: sha256(promptTemplate(withFacts, withJev, withBrief)),
    model_requested: CRITIC_MODEL,
    isolation_flag: CRITIC_ISOLATION_FLAG,
    permission_mode: CRITIC_PERMISSION_MODE,
    settings: CRITIC_SETTINGS,
    readable_folders: CRITIC_READABLE_FOLDERS,
  };
}

/** Returns true when saved metadata holds every field of the identity with the same value. */
function matchesIdentity(
  metadata: Record<string, unknown>,
  identity: RunIdentity,
): boolean {
  return (
    metadata.prompt_sha256 === identity.prompt_sha256 &&
    metadata.model_requested === identity.model_requested &&
    metadata.isolation_flag === identity.isolation_flag &&
    metadata.permission_mode === identity.permission_mode &&
    metadata.settings === identity.settings &&
    metadata.readable_folders === identity.readable_folders
  );
}

/**
 * Returns the first Bash rule the critic is allowed: running the skill's crop script, by its
 * absolute path, on any arguments (agents/critic.md step 1).
 */
export function cropCommandRule(skillDirectory: string): string {
  return `Bash(node ${skillDirectory}/scripts/crop.mjs *)`;
}

/**
 * Returns the second Bash rule the critic is allowed: running the skill's entries script, by its
 * absolute path, on any arguments, to open the guideline entries a checklist line names
 * (agents/critic.md step 5). The allowed rules are not part of the run identity, so adding this
 * rule keeps the keys and the replays of runs saved before it.
 */
export function entriesCommandRule(skillDirectory: string): string {
  return `Bash(node ${skillDirectory}/scripts/entries.mjs *)`;
}

/**
 * Returns the `claude` arguments for one crit. The prompt goes last, after an option that takes
 * one value, so no option that takes a list can swallow it.
 */
export function buildClaudeArguments(
  skillDirectory: string,
  prompt: string,
): string[] {
  return [
    "-p",
    CRITIC_ISOLATION_FLAG,
    "--model",
    CRITIC_MODEL,
    "--permission-mode",
    CRITIC_PERMISSION_MODE,
    "--output-format",
    "json",
    "--no-session-persistence",
    "--tools",
    "Read,Bash",
    "--allowedTools",
    "Read",
    cropCommandRule(skillDirectory),
    entriesCommandRule(skillDirectory),
    "--permission-prompts",
    "none",
    "--strict-mcp-config",
    "--settings",
    CRITIC_SETTINGS,
    "--add-dir",
    skillDirectory,
    tmpdir(),
    "--max-budget-usd",
    MAX_BUDGET_USD,
    prompt,
  ];
}

/** Returns true when a value is a plain object, so its fields can be read. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Reads the JSON that `claude -p --output-format json` prints and returns the crit and its
 * metadata. It throws unless type is "result", subtype is "success", is_error is false, and
 * result is a non-empty string.
 */
export function parseClaudeResult(stdout: string): ClaudeResult {
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
  if (typeof parsed.result !== "string" || parsed.result.trim() === "") {
    throw new Error("claude result has no crit text in result");
  }
  let modelIds: string[] = [];
  if (isRecord(parsed.modelUsage)) {
    modelIds = Object.keys(parsed.modelUsage);
  }
  return {
    crit: parsed.result,
    sessionId: parsed.session_id ?? null,
    numTurns: parsed.num_turns ?? null,
    usage: parsed.usage ?? null,
    totalCostUsd: parsed.total_cost_usd ?? null,
    modelIds,
    // Each call the permission rules refused; an empty list means nothing was refused.
    permissionDenials: Array.isArray(parsed.permission_denials)
      ? parsed.permission_denials
      : [],
  };
}

/**
 * Returns the commit that last touched the skill folder. It throws when the folder is not in a git
 * repository or has uncommitted or untracked files, unless allowDirty is true.
 */
export function skillCommit(
  skillDirectory: string,
  allowDirty = false,
): string {
  let commit: string;
  let status: string;
  try {
    commit = execFileSync(
      "git",
      ["-C", skillDirectory, "log", "-1", "--format=%H", "--", "."],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ).trim();
    status = execFileSync(
      "git",
      [
        "-C",
        skillDirectory,
        "status",
        "--porcelain",
        "--untracked-files=all",
        "--",
        ".",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch {
    throw new Error(`${skillDirectory} is not in a git repository`);
  }
  if (commit === "") {
    throw new Error(`${skillDirectory} has no commit`);
  }
  if (!allowDirty && status.trim() !== "") {
    throw new Error(
      `${skillDirectory} has uncommitted or untracked files; commit them first:\n${status}`,
    );
  }
  return commit;
}

/**
 * Returns the folder name for a request: the image SHA-256 for one image with no note, focus, or
 * facts file, and otherwise the SHA-256 of {images, note, focus} as JSON with the keys in that
 * order, with `facts`, the facts file's SHA-256, added last only when there is one, and then
 * `brief`, the brief file's SHA-256, only when there is one. So every key made before facts or
 * briefs existed stays the same, and a run with facts or a brief never shares a folder with a run
 * without them, or with a run on another facts or brief file.
 */
export function requestKey(
  imageSha256s: readonly string[],
  note: string | undefined,
  focus: string | undefined,
  factsSha256?: string,
  // Stays only so the saved runs of skill commit 82b57a1f still replay after Jev was removed (crit-mk9.3).
  jevEvidenceSha256?: string,
  briefSha256?: string,
): string {
  const onlyImage = imageSha256s[0];
  if (
    imageSha256s.length === 1 &&
    onlyImage !== undefined &&
    note === undefined &&
    focus === undefined &&
    factsSha256 === undefined &&
    jevEvidenceSha256 === undefined &&
    briefSha256 === undefined
  ) {
    return onlyImage;
  }
  const fields: Record<string, unknown> = {
    images: imageSha256s,
    note: note ?? null,
    focus: focus ?? null,
  };
  if (factsSha256 !== undefined) {
    fields.facts = factsSha256;
  }
  if (jevEvidenceSha256 !== undefined) {
    fields.jev = jevEvidenceSha256;
  }
  if (briefSha256 !== undefined) {
    fields.brief = briefSha256;
  }
  return sha256(JSON.stringify(fields));
}

/**
 * Returns the request key of a request, reading each image, the facts file, and the brief file to
 * hash it. ensureCrits passes `briefSha256` of the brief text it already read, so the key, the
 * metadata, and the prompt all come from one read of the file.
 */
export function requestKeyOf(
  request: CritRequest,
  briefSha256 = request.briefPath === undefined
    ? undefined
    : sha256(readFileSync(request.briefPath)),
): string {
  const imageSha256s = request.imagePaths.map((imagePath) =>
    sha256(readFileSync(imagePath)),
  );
  const factsSha256 =
    request.factsPath === undefined
      ? undefined
      : sha256(readFileSync(request.factsPath));
  return requestKey(
    imageSha256s,
    request.note,
    request.focus,
    factsSha256,
    undefined,
    briefSha256,
  );
}

/** Returns the run numbers found in a request folder, from both .md and .json file names. */
function listRunNumbers(requestDirectory: string): number[] {
  if (!existsSync(requestDirectory)) {
    return [];
  }
  const numbers: number[] = [];
  for (const name of readdirSync(requestDirectory)) {
    const match = /^(\d+)\.(md|json)$/.exec(name);
    if (match?.[1] !== undefined) {
      numbers.push(Number(match[1]));
    }
  }
  return numbers;
}

/**
 * Reads the complete runs of one request that were made the way a new run would be made, in order
 * of run number. A run is complete when its .json exists, and it counts only when its prompt hash,
 * model, isolation flag, and permission mode match `identity`. It takes no runner, so it cannot
 * start a child process.
 */
export function readSavedCrits(
  runsDirectory: string,
  commit: string,
  key: string,
  identity: RunIdentity = currentRunIdentity(),
): SavedCrit[] {
  const requestDirectory = join(runsDirectory, commit, key);
  const uniqueNumbers = [...new Set(listRunNumbers(requestDirectory))];
  uniqueNumbers.sort((left, right) => left - right);
  const saved: SavedCrit[] = [];
  for (const runNumber of uniqueNumbers) {
    const critPath = join(requestDirectory, `${runNumber}.md`);
    const metadataPath = join(requestDirectory, `${runNumber}.json`);
    if (!existsSync(metadataPath) || !existsSync(critPath)) {
      continue;
    }
    const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
    if (!matchesIdentity(metadata, identity)) {
      continue;
    }
    saved.push({
      runNumber,
      critPath,
      metadataPath,
      crit: readFileSync(critPath, "utf8"),
      metadata,
    });
  }
  return saved;
}

/**
 * Returns the folder paths to hide in saved metadata, longest first, each with its placeholder:
 * the system temp folder in both its /var and /private/var forms (on macOS /var links to
 * /private/var, so tools print either), and the home folder.
 */
function pathsToRedact(): { path: string; placeholder: string }[] {
  const temporaryFolder = tmpdir();
  const temporaryForms = new Set([temporaryFolder]);
  if (temporaryFolder.startsWith("/private/var/")) {
    temporaryForms.add(temporaryFolder.slice("/private".length));
  } else if (temporaryFolder.startsWith("/var/")) {
    temporaryForms.add(`/private${temporaryFolder}`);
  }
  const replacements = [...temporaryForms].map((path) => ({
    path,
    placeholder: "<temp>",
  }));
  replacements.push({ path: homedir(), placeholder: "<home>" });
  replacements.sort((left, right) => right.path.length - left.path.length);
  return replacements;
}

/** Returns the text with every character that has a meaning in a regular expression escaped. */
function escapeForRegExp(text: string): string {
  // "\\$&" puts a backslash before the matched character.
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns a copy of a JSON value with every temp and home folder path in its strings replaced by
 * <temp> or <home>, so a committed metadata file holds no absolute path of this machine.
 */
export function redactPaths<Value>(value: Value): Value {
  // Each folder path becomes a pattern that matches the path only as a whole path prefix: the
  // character before it and the character after it must not be part of a file name. Reason: on
  // Linux the temp folder is /tmp, and a plain text replace turned /tmp/tmp.a/1.png into
  // <temp><temp>.a/1.png (crit-1y1). In the pattern, (?<!...) means "not preceded by" and
  // (?!...) means "not followed by".
  const replacements = pathsToRedact().map((replacement) => ({
    pattern: new RegExp(
      `(?<![A-Za-z0-9._-])${escapeForRegExp(replacement.path)}(?![A-Za-z0-9._-])`,
      "g",
    ),
    placeholder: replacement.placeholder,
  }));
  /** Replaces the paths in one value, walking into arrays and objects. */
  function redact(item: unknown): unknown {
    if (typeof item === "string") {
      let text = item;
      for (const replacement of replacements) {
        text = text.replace(replacement.pattern, replacement.placeholder);
      }
      return text;
    }
    if (Array.isArray(item)) {
      return item.map(redact);
    }
    if (isRecord(item)) {
      return Object.fromEntries(
        Object.entries(item).map(([key, entry]) => [key, redact(entry)]),
      );
    }
    return item;
  }
  // The walk keeps the shape of the value, so the cast back to its type is safe.
  return redact(value) as Value;
}

/** Returns true when an error is Node's "file already exists" error. */
function isFileExistsError(error: unknown): boolean {
  return isRecord(error) && error.code === "EEXIST";
}

/**
 * Writes the crit as <n>.md and then its metadata as <n>.json, with n one more than the highest
 * number in the folder. The "wx" flag makes a write fail when the file exists, so a saved file is
 * never written again; on that failure it tries the next number.
 */
export function writeRun(
  requestDirectory: string,
  crit: string,
  metadata: Record<string, unknown>,
): SavedCrit {
  mkdirSync(requestDirectory, { recursive: true });
  let runNumber = Math.max(0, ...listRunNumbers(requestDirectory)) + 1;
  for (;;) {
    const critPath = join(requestDirectory, `${runNumber}.md`);
    const metadataPath = join(requestDirectory, `${runNumber}.json`);
    try {
      writeFileSync(critPath, crit, { flag: "wx" });
    } catch (error) {
      if (isFileExistsError(error)) {
        runNumber += 1;
        continue;
      }
      throw error;
    }
    writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, {
      flag: "wx",
    });
    return { runNumber, critPath, metadataPath, crit, metadata };
  }
}

/**
 * Runs the critic once: copies the images into a new work folder under neutral names, starts
 * `claude -p` there, checks its output, and deletes the work folder. It writes no run file.
 */
async function runCriticOnce(
  request: CritRequest,
  options: CriticRunnerOptions,
  briefLines: string | undefined,
): Promise<{
  result: ClaudeResult;
  claudeVersion: string;
  startedAt: string;
  durationMs: number;
}> {
  const workDirectory = mkdtempSync(join(tmpdir(), "crit-critic-"));
  try {
    const workImagePaths: string[] = [];
    request.imagePaths.forEach((imagePath, index) => {
      // Fixture names carry the answer, so the critic sees only image-1.png, image-2.png, and so on.
      const workImagePath = join(
        workDirectory,
        `image-${index + 1}${extname(imagePath)}`,
      );
      copyFileSync(imagePath, workImagePath);
      workImagePaths.push(workImagePath);
    });
    // The facts file goes in the work folder, which the critic may read, under a neutral name.
    let workFactsPath: string | undefined;
    if (request.factsPath !== undefined) {
      workFactsPath = join(workDirectory, WORK_FACTS_FILE_NAME);
      copyFileSync(request.factsPath, workFactsPath);
    }
    const environment = process.env;
    const versionRun = await options.runClaude(
      ["--version"],
      environment,
      workDirectory,
    );
    if (versionRun.exitCode !== 0) {
      throw new Error(
        `claude --version exited with code ${versionRun.exitCode}: ${versionRun.stderr.slice(0, 500)}`,
      );
    }
    const prompt = buildPrompt(
      options.skillDirectory,
      workImagePaths,
      request.note,
      request.focus,
      workFactsPath,
      briefLines,
    );
    const startedAt = new Date();
    const run = await options.runClaude(
      buildClaudeArguments(options.skillDirectory, prompt),
      environment,
      workDirectory,
    );
    const durationMs = Date.now() - startedAt.getTime();
    if (run.exitCode !== 0) {
      throw new Error(
        `claude exited with code ${run.exitCode}: ${run.stderr.slice(0, 500)} ${run.stdout.slice(0, 500)}`,
      );
    }
    return {
      result: parseClaudeResult(run.stdout),
      claudeVersion: versionRun.stdout.trim(),
      startedAt: startedAt.toISOString(),
      durationMs,
    };
  } finally {
    rmSync(workDirectory, { recursive: true, force: true });
  }
}

/**
 * Makes sure a request has at least `runs` complete runs made the way a new run would be made
 * (same prompt template, model, isolation flag, and permission mode), and starts only the missing
 * ones. Returns every such run, in order.
 */
export async function ensureCrits(
  request: CritRequest,
  options: CriticRunnerOptions,
  runs = 1,
): Promise<SavedCrit[]> {
  const commit = options.skillCommit ?? skillCommit(options.skillDirectory);
  const imageSha256s = request.imagePaths.map((imagePath) =>
    sha256(readFileSync(imagePath)),
  );
  // Read the brief once, so a file edited during a long run never puts crits of the new text under
  // the key of the old text: the key, the metadata, and every prompt use these same bytes.
  let briefSha256: string | undefined;
  let briefLines: string | undefined;
  if (request.briefPath !== undefined) {
    // The Brief block takes the place of the note and focus lines, so a note or focus would go into
    // the key but never reach the critic. Callers such as compare.ts call this function directly.
    if (request.note !== undefined || request.focus !== undefined) {
      throw new Error(
        "a brief replaces the note and the focus; give the brief alone",
      );
    }
    const briefBytes = readFileSync(request.briefPath);
    briefSha256 = sha256(briefBytes);
    briefLines = parseBriefText(briefBytes.toString("utf8"), request.briefPath);
  }
  const key = requestKeyOf(request, briefSha256);
  const identity = currentRunIdentity(
    request.factsPath !== undefined,
    false,
    request.briefPath !== undefined,
  );
  const requestDirectory = join(options.runsDirectory, commit, key);
  const currentRuns = () =>
    readSavedCrits(options.runsDirectory, commit, key, identity);
  let missing = runs - currentRuns().length;
  while (missing > 0) {
    const once = await runCriticOnce(request, options, briefLines);
    writeRun(requestDirectory, once.result.crit, {
      request: {
        images: request.imagePaths.map((imagePath, index) => ({
          sha256: imageSha256s[index],
          path: portablePath(imagePath, 1),
        })),
        note: request.note ?? null,
        focus: request.focus ?? null,
        ...(request.factsPath === undefined
          ? {}
          : {
              facts: {
                sha256: sha256(readFileSync(request.factsPath)),
                path: portablePath(request.factsPath, 1),
              },
            }),
        ...(request.briefPath === undefined
          ? {}
          : {
              brief: {
                sha256: briefSha256,
                path: portablePath(request.briefPath, 1),
              },
            }),
      },
      ...identity,
      skill_directory: portablePath(options.skillDirectory, 2),
      skill_commit: commit,
      model_ids: once.result.modelIds,
      permission_denials: redactPaths(once.result.permissionDenials),
      claude_version: once.claudeVersion,
      session_id: once.result.sessionId,
      num_turns: once.result.numTurns,
      usage: once.result.usage,
      total_cost_usd: once.result.totalCostUsd,
      started_at: once.startedAt,
      duration_ms: once.durationMs,
    });
    missing -= 1;
  }
  return currentRuns();
}

/**
 * The real runner: starts `claude` with stdin closed, because `claude -p` waits and warns when
 * stdin is open, and stops it after 20 minutes.
 */
export function runClaudeProcess(
  args: readonly string[],
  environment: NodeJS.ProcessEnv,
  workingDirectory: string,
): Promise<ClaudeRunResult> {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn("claude", [...args], {
      cwd: workingDirectory,
      env: environment,
      stdio: ["ignore", "pipe", "pipe"],
      timeout: CHILD_TIMEOUT_MILLISECONDS,
    });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk));
    child.on("error", rejectPromise);
    child.on("close", (code) => {
      resolvePromise({
        stdout: Buffer.concat(stdoutChunks).toString("utf8"),
        stderr: Buffer.concat(stderrChunks).toString("utf8"),
        // A child stopped by a signal, such as the timeout, has no exit code.
        exitCode: code ?? EXIT_CODE_COULD_NOT_RUN,
      });
    });
  });
}

const HELP_TEXT = `Run the design critic headless, save each crit, or replay saved crits.

Usage:
  node evals/critic/run-critic.ts run    [--skill DIR] [--runs N] [--parallel N] [--runs-dir DIR] [--brief FILE] [--note TEXT] [--facts FILE] IMAGE...
  node evals/critic/run-critic.ts replay [--skill DIR | --skill-commit SHA] [--runs-dir DIR] [--brief FILE] [--note TEXT] [--facts FILE] IMAGE...
  node evals/critic/run-critic.ts --help

Modes:
  run     Make sure each image has N saved crits (default 1) at the skill's commit, and start
          claude -p only for the missing ones. Asks a model; never run in npm run ci.
  replay  Print the saved crits of each image. Starts no child process.

Flags:
  --skill DIR         The skill folder (default plugin/skills/design-critic).
  --skill-commit SHA  replay only: read the runs of this commit instead of the skill's commit.
  --runs N            run only: how many saved crits each image must have.
  --parallel N        run only: how many images run at once (default 40).
  --note TEXT         what you know about the piece. replay needs the note the run used.
  --brief FILE        a brief (FR-87): one "<Label>: <text>" line per field, with the labels of
                      step 1 of the skill's SKILL.md. Its Brief block takes the place of the note
                      line, so it goes with no --note. replay needs the brief file the run used.
  --facts FILE        a measured facts file (facts.json from the skill's scripts/measure.mjs) for
                      the one image named. The critic gets a copy named facts.json. replay needs
                      the facts file the run used.
  --runs-dir DIR      The folder that holds the saved runs (default evals/critic/runs).
  --help, -h          Print this help.

Exit codes: 0 done, 1 replay found an image with no saved crit, 2 could not run.
`;

/** Returns one warning line per call that the permission rules refused in a saved run. */
function describeDenials(saved: SavedCrit): string[] {
  const denials = saved.metadata.permission_denials;
  if (!Array.isArray(denials)) {
    return [];
  }
  return denials.map((denial) => {
    const toolName = isRecord(denial) ? String(denial.tool_name) : "unknown";
    const toolInput = isRecord(denial) ? JSON.stringify(denial.tool_input) : "";
    return `warning: run ${saved.runNumber} was refused a ${toolName} call: ${toolInput}`;
  });
}

/** Options for main: where runs live, the default skill folder, and the child process runner. */
export type MainOptions = {
  readonly runsDirectory: string;
  readonly defaultSkillDirectory: string;
  readonly runClaude: ClaudeRunner;
};

const DEFAULT_MAIN_OPTIONS: MainOptions = {
  runsDirectory: DEFAULT_RUNS_DIRECTORY,
  defaultSkillDirectory: DEFAULT_SKILL_DIRECTORY,
  runClaude: runClaudeProcess,
};

/** Throws unless the folder holds SKILL.md and agents/critic.md. */
function checkSkillDirectory(skillDirectory: string): void {
  const skillFile = join(skillDirectory, "SKILL.md");
  const criticFile = join(skillDirectory, "agents", "critic.md");
  if (!existsSync(skillFile) || !existsSync(criticFile)) {
    throw new Error(
      `${skillDirectory} has no SKILL.md or agents/critic.md; pass --skill <folder of the design-critic skill>`,
    );
  }
}

/** How many critic runs or judge calls run at once when --parallel is not given. */
export const DEFAULT_PARALLEL = 40;

/**
 * Reads the value of --parallel: a whole number of 1 or more, or the default when the flag is
 * absent. Anything else stops the script with a usage error, because a zero or a word would
 * start no work or hang the pool.
 */
export function parseParallel(text: string | undefined): number {
  if (text === undefined) {
    return DEFAULT_PARALLEL;
  }
  if (!/^[1-9]\d*$/.test(text)) {
    throw new Error(
      `--parallel must be a whole number of 1 or more, not "${text}"`,
    );
  }
  return Number(text);
}

/**
 * Runs `work` on every item with at most `limit` running at once, and keeps the results in item
 * order. After the first failure no worker takes a new item; the runs already started finish, so
 * what they save stays saved. Then it throws one error that names every failure.
 */
export async function runPooled<Item, Result>(
  items: readonly Item[],
  limit: number,
  work: (item: Item) => Promise<Result>,
): Promise<Result[]> {
  const results: Result[] = new Array(items.length);
  const failures: string[] = [];
  let nextIndex = 0;
  // Each worker takes the next index until none is left or a run has failed. JavaScript runs one
  // callback at a time, so two workers never take the same index.
  const worker = async (): Promise<void> => {
    while (nextIndex < items.length && failures.length === 0) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        results[index] = await work(items[index] as Item);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(message);
      }
    }
  };
  const workers: Promise<void>[] = [];
  for (let count = 0; count < Math.min(limit, items.length); count += 1) {
    workers.push(worker());
  }
  await Promise.all(workers);
  if (failures.length > 0) {
    throw new Error(
      `${failures.length} ${failures.length === 1 ? "run" : "runs"} failed:\n${failures.join("\n")}`,
    );
  }
  return results;
}

/** Parses the command line, runs the mode, and returns the text to print and the exit code. */
export async function runCriticCommand(
  argv: readonly string[],
  options: MainOptions,
): Promise<{ text: string; exitCode: number }> {
  const parsed = parseArgs({
    args: [...argv],
    options: {
      skill: { type: "string" },
      "skill-commit": { type: "string" },
      runs: { type: "string" },
      parallel: { type: "string" },
      note: { type: "string" },
      facts: { type: "string" },
      brief: { type: "string" },
      "runs-dir": { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
    allowPositionals: true,
  });
  if (parsed.values.help === true) {
    return { text: HELP_TEXT, exitCode: 0 };
  }
  const [mode, ...imageArguments] = parsed.positionals;
  if (mode !== "run" && mode !== "replay") {
    throw new Error(`name a mode, run or replay\n\n${HELP_TEXT}`);
  }
  if (imageArguments.length === 0) {
    throw new Error("name at least one image");
  }
  const imagePaths = imageArguments.map((imagePath) => resolve(imagePath));
  for (const imagePath of imagePaths) {
    if (!existsSync(imagePath)) {
      throw new Error(`image ${imagePath} does not exist`);
    }
  }
  // A facts file describes one page, so it goes with exactly one image.
  let factsPath: string | undefined;
  if (parsed.values.facts !== undefined) {
    factsPath = resolve(parsed.values.facts);
    if (!existsSync(factsPath)) {
      throw new Error(`facts file ${factsPath} does not exist`);
    }
    if (imagePaths.length !== 1) {
      throw new Error("--facts goes with exactly one image");
    }
  }
  // A brief takes the place of the note line, so the two never go together (FR-87).
  let briefPath: string | undefined;
  if (parsed.values.brief !== undefined) {
    briefPath = resolve(parsed.values.brief);
    if (parsed.values.note !== undefined) {
      throw new Error(
        "--brief replaces the note line; give --brief or --note, not both",
      );
    }
    // Reading it here stops the run on a missing file or a bad line before any child starts.
    readBriefLines(briefPath);
  }
  const skillDirectory = resolve(
    parsed.values.skill ?? options.defaultSkillDirectory,
  );
  const runsDirectory = resolve(
    parsed.values["runs-dir"] ?? options.runsDirectory,
  );
  const lines: string[] = [];

  if (mode === "replay") {
    let commit = parsed.values["skill-commit"];
    if (commit === undefined) {
      checkSkillDirectory(skillDirectory);
      commit = skillCommit(skillDirectory, true);
    }
    const missingImages: string[] = [];
    for (const imagePath of imagePaths) {
      const key = requestKeyOf({
        imagePaths: [imagePath],
        note: parsed.values.note,
        factsPath,
        briefPath,
      });
      const saved = readSavedCrits(
        runsDirectory,
        commit,
        key,
        currentRunIdentity(
          factsPath !== undefined,
          false,
          briefPath !== undefined,
        ),
      );
      if (saved.length === 0) {
        missingImages.push(imagePath);
      }
      for (const crit of saved) {
        lines.push(`=== ${imagePath}: ${crit.critPath}`, crit.crit, "");
      }
    }
    if (missingImages.length > 0) {
      lines.push(
        `No saved crit at commit ${commit} for: ${missingImages.join(", ")}`,
      );
      return {
        text: `${lines.join("\n")}\n`,
        exitCode: EXIT_CODE_MISSING_CRIT,
      };
    }
    return { text: `${lines.join("\n")}\n`, exitCode: 0 };
  }

  // Check the flag before the skill folder, so a bad value is named first.
  const parallel = parseParallel(parsed.values.parallel);
  checkSkillDirectory(skillDirectory);
  const runs = Number(parsed.values.runs ?? "1");
  if (!Number.isInteger(runs) || runs < 1) {
    throw new Error(`--runs must be a whole number of 1 or more`);
  }
  const commit = skillCommit(skillDirectory);
  // Start up to `parallel` images at once, so one slow image does not hold up the rest.
  const savedPerImage = await runPooled(imagePaths, parallel, (imagePath) =>
    ensureCrits(
      {
        imagePaths: [imagePath],
        note: parsed.values.note,
        factsPath,
        briefPath,
      },
      {
        runsDirectory,
        skillDirectory,
        skillCommit: commit,
        runClaude: options.runClaude,
      },
      runs,
    ),
  );
  // Print in the order the images were given, whatever order they finished in.
  imagePaths.forEach((imagePath, index) => {
    for (const crit of savedPerImage[index] ?? []) {
      lines.push(`${imagePath}: ${crit.critPath}`);
      lines.push(...describeDenials(crit));
    }
  });
  return { text: `${lines.join("\n")}\n`, exitCode: 0 };
}

/** Runs the command and sets the exit code: 2 when anything stopped the run. */
export async function main(): Promise<void> {
  try {
    const output = await runCriticCommand(
      process.argv.slice(2),
      DEFAULT_MAIN_OPTIONS,
    );
    process.stdout.write(output.text);
    process.exitCode = output.exitCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`run-critic stopped: ${message}\n`);
    process.exitCode = EXIT_CODE_COULD_NOT_RUN;
  }
}

// Run only when node starts this file, not when a test imports it.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
