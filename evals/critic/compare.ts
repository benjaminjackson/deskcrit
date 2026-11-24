// The critic compare evaluation (PRD EV-15). For each of the 30 before-and-after pairs in
// evals/compare-pairs/labels.json, it gives the design critic both images as version 1 and
// version 2, in an order fixed by the pair id, and asks which version does its job better or
// whether they are the same. It reads the answer from a fixed last line of the crit, with no judge
// call, and scores it against the preference Benjamin Jackson wrote. All 30 pairs are scored,
// including the pairs with no target criterion, because the critic is not limited to the packs.
//
// Live mode runs the critic through ensureCrits in run-critic.ts and asks a model, so `npm run ci`
// never runs it (CS-21). Replay mode (`npm run eval:critic:compare`) reads the saved crits and
// starts no child process.
//
// Usage: node evals/critic/compare.ts [--replay] [--skill DIR] [--skill-commit SHA]
// Exit codes: 0 after a full report, 2 when it could not run or replay found a missing crit.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import {
  findUnlabeledPairs,
  type HumanPreference,
  type LabeledPair,
  readLabeledPairs,
} from "../agreement/compare-labels.ts";
import { formatTable } from "../support/format-table.ts";
import {
  type ClaudeRunner,
  type CritRequest,
  DEFAULT_PARALLEL,
  ensureCrits,
  parseParallel,
  readSavedCrits,
  requestKey,
  runClaudeProcess,
  runPooled,
  type SavedCrit,
  skillCommit,
} from "./run-critic.ts";

// These three moved to run-critic.ts, which uses them too; the other scripts still import them from here.
export { DEFAULT_PARALLEL, parseParallel, runPooled };

const REPOSITORY_DIRECTORY = resolve(import.meta.dirname, "..", "..");
const EXIT_CODE_COULD_NOT_RUN = 2;

/**
 * The focus line of every compare request. It names the images only by their neutral names, so it
 * says nothing about which one is before or after.
 */
export const COMPARE_FOCUS =
  "Two versions of the same design are attached: image-1.png is version 1 and image-2.png is version 2. Say which version does its job better, or whether they are the same, and why. End your reply with one line on its own, exactly one of: `Better: version 1`, `Better: version 2`, `Better: same`.";

/** The Jev figures on the same 30 pairs, from docs/PRD.md section 3, EV-9, and FR-37. */
export const JEV_FIGURES_LINE =
  "Jev: 0.500 first run, 0.467 after the respelling, 0.867 after FR-37 changed (FR-37 was chosen after these 30 pairs had been seen)";

/** What the critic chose, read from the last line of its crit. */
export type CriticChoice = "version 1" | "version 2" | "same" | "undecided";

/** How one pair came out against the human preference. */
export type PairOutcome = "agreed" | "disagreed" | "undecided";

/** Where the labels and runs are, which skill runs, and how to start `claude`. Tests pass a stub runner. */
export type CompareOptions = {
  readonly repositoryDirectory: string;
  readonly runsDirectory: string;
  readonly skillDirectory: string;
  readonly runClaude: ClaudeRunner;
};

const DEFAULT_OPTIONS: CompareOptions = {
  repositoryDirectory: REPOSITORY_DIRECTORY,
  runsDirectory: join(import.meta.dirname, "runs"),
  skillDirectory: join(
    REPOSITORY_DIRECTORY,
    "plugin",
    "skills",
    "design-critic",
  ),
  runClaude: runClaudeProcess,
};

/** The text for stdout, the text for stderr, and the exit code of one run. */
export type CompareOutput = {
  readonly text: string;
  readonly errorText: string;
  readonly exitCode: number;
};

const HELP_TEXT = `Ask the design critic which version of each labeled pair is better, and score it (EV-15).

Usage:
  node evals/critic/compare.ts [--replay] [--skill DIR] [--skill-commit SHA]
                              [--parallel N]

Flags:
  --replay            Read the saved crits and start no child process. Without it, the script runs
                      the critic on each pair with no saved crit, which asks a model.
  --skill DIR         The skill folder (default plugin/skills/design-critic).
  --skill-commit SHA  Use the runs of this commit instead of the skill folder's commit.
  --parallel N        How many critic runs or judge calls run at once (default ${DEFAULT_PARALLEL}).
  --help, -h          Print this help.

Exit codes: 0 after a full report, 2 when it could not run or replay found a missing crit.
`;

/**
 * Returns true when the after image is shown as version 1: when the first byte of the SHA-256 of
 * the pair id is even. A fixed rule, so a rerun shows each pair in the same order.
 */
export function afterFirst(pairId: string): boolean {
  const firstByte = createHash("sha256").update(pairId).digest()[0] ?? 0;
  return firstByte % 2 === 0;
}

/** Returns the critic request for one pair: both images in the order afterFirst gives, and the focus. */
export function buildPairRequest(
  pair: LabeledPair,
  repositoryDirectory: string,
): CritRequest {
  const beforePath = join(repositoryDirectory, pair.before);
  const afterPath = join(repositoryDirectory, pair.after);
  let imagePaths: string[];
  if (afterFirst(pair.pair_id)) {
    imagePaths = [afterPath, beforePath];
  } else {
    imagePaths = [beforePath, afterPath];
  }
  return { imagePaths, focus: COMPARE_FOCUS };
}

/** Returns the runs folder key of one request, the same key ensureCrits writes under. */
function keyOfRequest(request: CritRequest): string {
  const imageSha256s = request.imagePaths.map((imagePath) =>
    createHash("sha256").update(readFileSync(imagePath)).digest("hex"),
  );
  return requestKey(imageSha256s, request.note, request.focus);
}

/**
 * Reads the choice from the last non-empty line of a crit, and only that line, because the focus
 * line asks the critic to end with it. Markdown decoration is stripped first: leading quote,
 * heading, and list marks, every `*`, `_`, and backtick, surrounding spaces, and one trailing
 * period. The rest must be `Better: version 1`, `Better: version 2`, or `Better: same`, ignoring
 * case. Anything else is undecided; a `Better:` line elsewhere in the crit is ignored.
 */
export function parseChoice(markdown: string): CriticChoice {
  const lines = markdown.split("\n");
  let lastLine = "";
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = (lines[index] ?? "").trim();
    if (line !== "") {
      lastLine = line;
      break;
    }
  }
  // Remove leading `>`, `#`, `-`, and `*` marks and the spaces between them.
  let stripped = lastLine.replace(/^[>#\-*\s]+/, "");
  // Remove every bold, italic, and code mark anywhere in the line.
  stripped = stripped.replaceAll(/[*_`]/g, "").trim();
  if (stripped.endsWith(".")) {
    stripped = stripped.slice(0, -1).trim();
  }
  const normalized = stripped.toLowerCase();
  if (normalized === "better: version 1") {
    return "version 1";
  }
  if (normalized === "better: version 2") {
    return "version 2";
  }
  if (normalized === "better: same") {
    return "same";
  }
  return "undecided";
}

/** Maps the critic's choice to after, before, or same, given which image was version 1. */
export function toPreference(
  choice: CriticChoice,
  afterShownFirst: boolean,
): HumanPreference | "undecided" {
  if (choice === "same" || choice === "undecided") {
    return choice;
  }
  const versionOneChosen = choice === "version 1";
  if (versionOneChosen === afterShownFirst) {
    return "after";
  }
  return "before";
}

/** Scores one answer: agreed when it equals the preference, undecided when there is none, else disagreed. */
export function scoreAnswer(
  answer: HumanPreference | "undecided",
  preference: HumanPreference,
): PairOutcome {
  if (answer === "undecided") {
    return "undecided";
  }
  if (answer === preference) {
    return "agreed";
  }
  return "disagreed";
}

/** Formats the counts and the rate, agreed divided by all pairs, so undecided counts as not agreeing. */
export function formatSummaryLine(outcomes: readonly PairOutcome[]): string {
  let agreed = 0;
  let disagreed = 0;
  let undecided = 0;
  for (const outcome of outcomes) {
    if (outcome === "agreed") {
      agreed += 1;
    } else if (outcome === "disagreed") {
      disagreed += 1;
    } else {
      undecided += 1;
    }
  }
  const rate = outcomes.length === 0 ? 0 : agreed / outcomes.length;
  return `agreed ${agreed}, disagreed ${disagreed}, undecided ${undecided}, rate ${rate.toFixed(3)}`;
}

/** Returns one warning per call that the permission rules refused in a saved run of a pair. */
function describeDenials(pairId: string, saved: SavedCrit): string[] {
  const denials = saved.metadata.permission_denials;
  if (!Array.isArray(denials)) {
    return [];
  }
  return denials.map(
    (denial) =>
      `warning: pair ${pairId}: run ${saved.runNumber} was refused a call: ${JSON.stringify(denial)}`,
  );
}

/**
 * Reads the labels, refuses a pair with no preference, gets one crit per pair (live: runs the
 * critic where none is saved; replay: reads saved crits only), and returns the table, the summary
 * line, and the Jev line. A replay with a missing crit prints the table with `missing` rows and no
 * summary, names each missing pair and key on stderr, and exits 2.
 */
export async function runCompare(
  argv: readonly string[],
  options: CompareOptions,
): Promise<CompareOutput> {
  const parsed = parseArgs({
    args: [...argv],
    options: {
      replay: { type: "boolean", default: false },
      skill: { type: "string" },
      "skill-commit": { type: "string" },
      parallel: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
    strict: true,
    allowPositionals: false,
  });
  if (parsed.values.help === true) {
    return { text: HELP_TEXT, errorText: "", exitCode: 0 };
  }
  const replay = parsed.values.replay === true;
  const parallel = parseParallel(parsed.values.parallel);
  const skillDirectory = resolve(parsed.values.skill ?? options.skillDirectory);
  const labelsPath = join(
    options.repositoryDirectory,
    "evals",
    "compare-pairs",
    "labels.json",
  );
  const pairs = readLabeledPairs(
    "labels.json",
    readFileSync(labelsPath, "utf8"),
  );
  const unlabeled = findUnlabeledPairs(pairs);
  if (unlabeled.length > 0) {
    throw new Error(
      `${unlabeled.length} pairs have no preference yet, and only Benjamin Jackson writes them: ${unlabeled.join(", ")}`,
    );
  }
  const commit =
    parsed.values["skill-commit"] ?? skillCommit(skillDirectory, replay);

  const requests = pairs.map((pair) =>
    buildPairRequest(pair, options.repositoryDirectory),
  );
  const warnings: string[] = [];
  let crits: (SavedCrit | undefined)[];
  if (replay) {
    crits = requests.map(
      (request) =>
        readSavedCrits(options.runsDirectory, commit, keyOfRequest(request))[0],
    );
  } else {
    const indexes = pairs.map((_pair, index) => index);
    crits = await runPooled(indexes, parallel, async (index) => {
      const pair = pairs[index] as LabeledPair;
      try {
        const saved = await ensureCrits(requests[index] as CritRequest, {
          runsDirectory: options.runsDirectory,
          skillDirectory,
          skillCommit: commit,
          runClaude: options.runClaude,
        });
        return saved[0];
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`pair ${pair.pair_id}: ${message}`);
      }
    });
    // Collected after every run has finished, so the warnings come in pair order.
    pairs.forEach((pair, index) => {
      const crit = crits[index];
      if (crit !== undefined) {
        warnings.push(...describeDenials(pair.pair_id, crit));
      }
    });
  }

  const rows: string[][] = [];
  const outcomes: PairOutcome[] = [];
  const missing: string[] = [];
  pairs.forEach((pair, index) => {
    const preference = pair.preference as HumanPreference;
    const shownFirst = afterFirst(pair.pair_id) ? "after" : "before";
    const crit = crits[index];
    if (crit === undefined) {
      const request = requests[index] as CritRequest;
      missing.push(`${pair.pair_id} (key ${keyOfRequest(request)})`);
      rows.push([pair.pair_id, shownFirst, "missing", preference, "missing"]);
      return;
    }
    const choice = parseChoice(crit.crit);
    const outcome = scoreAnswer(
      toPreference(choice, afterFirst(pair.pair_id)),
      preference,
    );
    outcomes.push(outcome);
    rows.push([pair.pair_id, shownFirst, choice, preference, outcome]);
  });

  const header = [
    "Critic compare (EV-15)",
    `Mode: ${replay ? "replay (saved crits, no child process)" : "live"}`,
    `Skill commit: ${commit}`,
    `Pairs: ${pairs.length}`,
  ].join("\n");
  const table = formatTable(
    ["pair", "shown-first", "answer", "preference", "outcome"],
    rows,
  );
  if (missing.length > 0) {
    const errorLines = [
      ...warnings,
      `No saved crit at commit ${commit} for ${missing.length} ${missing.length === 1 ? "pair" : "pairs"}; run node evals/critic/compare.ts without --replay to make them:`,
      ...missing,
    ];
    return {
      text: `${header}\n\n${table}\n`,
      errorText: `${errorLines.join("\n")}\n`,
      exitCode: EXIT_CODE_COULD_NOT_RUN,
    };
  }
  const sections = [
    header,
    table,
    formatSummaryLine(outcomes),
    JEV_FIGURES_LINE,
  ];
  const errorText = warnings.length > 0 ? `${warnings.join("\n")}\n` : "";
  return { text: `${sections.join("\n\n")}\n`, errorText, exitCode: 0 };
}

/** Runs the evaluation and sets the exit code: 2 when anything stopped it. */
export async function main(): Promise<void> {
  try {
    const output = await runCompare(process.argv.slice(2), DEFAULT_OPTIONS);
    process.stdout.write(output.text);
    process.stderr.write(output.errorText);
    process.exitCode = output.exitCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`critic compare stopped: ${message}\n`);
    process.exitCode = EXIT_CODE_COULD_NOT_RUN;
  }
}

// Run only when node starts this file, not when a test imports it.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
