// The picker evaluation (PRD FR-83, EV-15). For each of the 30 before-and-after pairs in
// evals/compare-pairs/labels.json, it puts the two images in the order compare.ts uses (so tile 1
// is version 1), builds the contact sheet with the skill's scripts/contact-sheet.mjs, and runs the
// picker (agents/picker.md) on the sheet and both full-size images. It reads the last line of the
// answer, `Best: tile <n>` or `Best: tie tile <n>, tile <m>`, with no judge call, and scores it
// against the preference Benjamin Jackson wrote, the way compare.ts scores `Better:` lines. A tie
// counts as "same". The figure of the old compare path (EV-15) is read from SCORES.md.
//
// Live mode runs the picker through ensureCrits and asks a model, so `npm run ci` never runs it
// (CS-21). Replay mode (`npm run eval:critic:picker`) reads saved runs and starts no child process.
//
// Usage: node evals/critic/picker.ts [--replay] [--skill DIR] [--skill-commit SHA] [--parallel N]
// Exit codes: 0 after a full report, 2 when it could not run or replay found a missing run.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
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
  afterFirst,
  formatSummaryLine,
  type PairOutcome,
  scoreAnswer,
} from "./compare.ts";
import {
  type ClaudeRunner,
  type CritRequest,
  DEFAULT_PARALLEL,
  ensureCrits,
  isRecord,
  parseParallel,
  readSavedCrits,
  requestKeyOf,
  runClaudeProcess,
  runPooled,
  type SavedCrit,
  skillCommit,
} from "./run-critic.ts";

const REPOSITORY_DIRECTORY = resolve(import.meta.dirname, "..", "..");
const EXIT_CODE_COULD_NOT_RUN = 2;

/** What the picker chose: one tile, a tie of two tiles, or nothing readable. */
export type PickerChoice =
  | { readonly state: "best"; readonly tile: number }
  | { readonly state: "tie"; readonly tiles: readonly number[] }
  | { readonly state: "invalid" };

/** Where the labels, runs, and contact-sheet script are, which skill runs, and how to start `claude`. Tests pass a stub runner. */
export type PickerOptions = {
  readonly repositoryDirectory: string;
  readonly runsDirectory: string;
  readonly skillDirectory: string;
  readonly contactSheetScript?: string;
  readonly runClaude: ClaudeRunner;
  /** The file that holds the old compare figure; defaults to evals/critic/SCORES.md. */
  readonly scoresPath?: string;
};

const DEFAULT_OPTIONS: PickerOptions = {
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
export type PickerOutput = {
  readonly text: string;
  readonly errorText: string;
  readonly exitCode: number;
};

const HELP_TEXT = `Ask the picker which version of each labeled pair is best, and score it (FR-83, EV-15).

Usage:
  node evals/critic/picker.ts [--replay] [--skill DIR] [--skill-commit SHA] [--parallel N]

Flags:
  --replay            Read the saved runs and start no child process. Without it, the script runs
                      the picker on each pair with no saved run, which asks a model.
  --skill DIR         The skill folder (default plugin/skills/design-critic).
  --skill-commit SHA  Use the runs of this commit instead of the skill folder's commit.
  --parallel N        How many picker runs run at once (default ${DEFAULT_PARALLEL}).
  --help, -h          Print this help.

Exit codes: 0 after a full report, 2 when it could not run or replay found a missing run.
`;

/** Returns the focus line of a pair: the sheet is image 1, the two versions follow in tile order. */
export function pickerFocus(): string {
  return (
    "Pick the best version, following agents/picker.md. " +
    "Image 1 is a contact sheet of 2 versions of one design, with each tile's number above it. " +
    "Image 2 is tile 1 and image 3 is tile 2, at full size. " +
    "End with one last line: `Best: tile <n>`, or `Best: tie tile <n>, tile <m>` when no version does the job better."
  );
}

/**
 * Reads the choice from the last non-empty line, and only that line. Markdown marks (`>`, `#`,
 * `-`, `*`, `_`, backtick) and one trailing period are stripped first. `Best: tile 2` and
 * `Best: tie tile 1, tile 2` are read; anything else is invalid, and nothing is guessed.
 */
export function parsePickerChoice(markdown: string): PickerChoice {
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
  const best = /^best: tile (\d+)$/i.exec(stripped);
  if (best?.[1] !== undefined) {
    return { state: "best", tile: Number(best[1]) };
  }
  const tie = /^best: tie tile (\d+), tile (\d+)$/i.exec(stripped);
  if (tie?.[1] !== undefined && tie[2] !== undefined) {
    return { state: "tie", tiles: [Number(tie[1]), Number(tie[2])] };
  }
  return { state: "invalid" };
}

/** Maps a choice to after, before, or same, given which image is tile 1. Null when the choice is invalid or names a tile that is not 1 or 2. */
export function pickerPreference(
  choice: PickerChoice,
  afterShownFirst: boolean,
): HumanPreference | null {
  if (choice.state === "invalid") {
    return null;
  }
  if (choice.state === "tie") {
    const sorted = [...choice.tiles].sort();
    return sorted[0] === 1 && sorted[1] === 2 ? "same" : null;
  }
  if (choice.tile !== 1 && choice.tile !== 2) {
    return null;
  }
  const tileOneChosen = choice.tile === 1;
  return tileOneChosen === afterShownFirst ? "after" : "before";
}

/** Makes the contact sheet of two images, in the given order, in a new temporary folder, and checks tiles.json lists them in that order. */
function buildPairSheet(
  imagePaths: readonly string[],
  scriptPath: string,
): string {
  if (!existsSync(scriptPath)) {
    throw new Error(`${scriptPath} is missing`);
  }
  const outDirectory = mkdtempSync(join(tmpdir(), "critic-picker-sheet-"));
  try {
    execFileSync("node", [scriptPath, ...imagePaths, "--out", outDirectory], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`contact-sheet.mjs failed: ${message}`);
  }
  const tilesFile: unknown = JSON.parse(
    readFileSync(join(outDirectory, "tiles.json"), "utf8"),
  );
  const tilePaths: string[] = [];
  if (isRecord(tilesFile) && Array.isArray(tilesFile.tiles)) {
    for (const tile of tilesFile.tiles) {
      if (isRecord(tile) && typeof tile.path === "string") {
        tilePaths.push(resolve(tile.path));
      }
    }
  }
  const expected = imagePaths.map((imagePath) => resolve(imagePath));
  if (tilePaths.join("\n") !== expected.join("\n")) {
    throw new Error("tiles.json does not list the two images in order");
  }
  return join(outDirectory, "sheet.png");
}

/** Returns the picker request of one pair: the sheet, then the two versions in tile order. */
export function buildPickerRequest(
  pair: LabeledPair,
  repositoryDirectory: string,
  scriptPath: string,
): CritRequest {
  const beforePath = join(repositoryDirectory, pair.before);
  const afterPath = join(repositoryDirectory, pair.after);
  const versions = afterFirst(pair.pair_id)
    ? [afterPath, beforePath]
    : [beforePath, afterPath];
  const sheetPath = buildPairSheet(versions, scriptPath);
  return { imagePaths: [sheetPath, ...versions], focus: pickerFocus() };
}

/**
 * Reads the old compare figure from the row "Compare: agrees with the preference" of SCORES.md:
 * the distinct scored cells, joined with " / ". Returns "unknown" when the row is not there.
 */
export function readOldCompareFigure(scoresText: string): string {
  const row = scoresText
    .split("\n")
    .find((line) => line.startsWith("| Compare: agrees with the preference"));
  if (row === undefined) {
    return "unknown";
  }
  const cells = row
    .split("|")
    .slice(2)
    .map((cell) => cell.trim())
    .filter((cell) => cell !== "" && cell !== "not scored");
  return [...new Set(cells)].join(" / ") || "unknown";
}

/** Returns the SHA-256 key of a request, the same key ensureCrits writes under. */
function keyOf(request: CritRequest): string {
  return requestKeyOf(request);
}

/** Runs the evaluation and returns the table, the agreement count, the tie counts, and the old figure. */
export async function runPicker(
  argv: readonly string[],
  options: PickerOptions,
): Promise<PickerOutput> {
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
  if (!replay && !existsSync(join(skillDirectory, "agents", "picker.md"))) {
    throw new Error(`${skillDirectory}/agents/picker.md is missing`);
  }
  const pairs = readLabeledPairs(
    "labels.json",
    readFileSync(
      join(
        options.repositoryDirectory,
        "evals",
        "compare-pairs",
        "labels.json",
      ),
      "utf8",
    ),
  );
  const unlabeled = findUnlabeledPairs(pairs);
  if (unlabeled.length > 0) {
    throw new Error(
      `${unlabeled.length} pairs have no preference yet, and only Benjamin Jackson writes them: ${unlabeled.join(", ")}`,
    );
  }
  const commit =
    parsed.values["skill-commit"] ?? skillCommit(skillDirectory, replay);
  const scriptPath =
    options.contactSheetScript ??
    join(skillDirectory, "scripts", "contact-sheet.mjs");
  const requests = pairs.map((pair) =>
    buildPickerRequest(pair, options.repositoryDirectory, scriptPath),
  );

  let runs: (SavedCrit | undefined)[];
  if (replay) {
    runs = requests.map(
      (request) =>
        readSavedCrits(options.runsDirectory, commit, keyOf(request))[0],
    );
  } else {
    const indexes = pairs.map((_pair, index) => index);
    runs = await runPooled(indexes, parallel, async (index) => {
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
        throw new Error(`pair ${pairs[index]?.pair_id}: ${message}`);
      }
    });
  }

  const rows: string[][] = [];
  const outcomes: PairOutcome[] = [];
  const missing: string[] = [];
  const named: string[] = [];
  let tiesOnSame = 0;
  let sameCount = 0;
  let tiesOnOthers = 0;
  let otherCount = 0;
  pairs.forEach((pair, index) => {
    const preference = pair.preference as HumanPreference;
    const shownFirst = afterFirst(pair.pair_id) ? "after" : "before";
    const run = runs[index];
    if (run === undefined) {
      missing.push(
        `${pair.pair_id} (key ${keyOf(requests[index] as CritRequest)})`,
      );
      rows.push([pair.pair_id, shownFirst, "missing", preference, "missing"]);
      return;
    }
    const choice = parsePickerChoice(run.crit);
    const answer = pickerPreference(choice, afterFirst(pair.pair_id));
    if (answer === null) {
      named.push(pair.pair_id);
      rows.push([
        pair.pair_id,
        shownFirst,
        "no valid Best line",
        preference,
        "left out",
      ]);
      return;
    }
    const outcome = scoreAnswer(answer, preference);
    outcomes.push(outcome);
    const isTie = choice.state === "tie";
    if (preference === "same") {
      sameCount += 1;
      if (isTie) {
        tiesOnSame += 1;
      }
    } else {
      otherCount += 1;
      if (isTie) {
        tiesOnOthers += 1;
      }
    }
    const shown = isTie ? "tie" : `tile ${(choice as { tile: number }).tile}`;
    rows.push([pair.pair_id, shownFirst, shown, preference, outcome]);
  });

  const header = [
    "Picker on the compare pairs (FR-83, EV-15)",
    `Mode: ${replay ? "replay (saved runs, no child process)" : "live"}`,
    `Skill commit: ${commit}`,
    `Pairs: ${pairs.length}`,
  ].join("\n");
  const table = formatTable(
    ["pair", "tile-1-is", "picker said", "preference", "outcome"],
    rows,
  );
  if (missing.length > 0) {
    const errorLines = [
      `No saved run at commit ${commit} for ${missing.length} ${missing.length === 1 ? "pair" : "pairs"}; run node evals/critic/picker.ts without --replay to make them:`,
      ...missing,
    ];
    return {
      text: `${header}\n\n${table}\n`,
      errorText: `${errorLines.join("\n")}\n`,
      exitCode: EXIT_CODE_COULD_NOT_RUN,
    };
  }
  const scoresPath =
    options.scoresPath ??
    join(options.repositoryDirectory, "evals", "critic", "SCORES.md");
  const oldFigure = readOldCompareFigure(readFileSync(scoresPath, "utf8"));
  const agreed = outcomes.filter((outcome) => outcome === "agreed").length;
  const sections = [
    header,
    table,
    `${formatSummaryLine(outcomes)} (of ${outcomes.length} scored)`,
    `agrees with the preference: ${agreed} of ${pairs.length}; old compare path (EV-15, SCORES.md): ${oldFigure}`,
    `ties on the ${sameCount} pairs preferred "same": ${tiesOnSame}; ties on the ${otherCount} other pairs: ${tiesOnOthers}`,
  ];
  if (named.length > 0) {
    sections.push(`left out, no valid Best line: ${named.join(", ")}`);
  }
  return { text: `${sections.join("\n\n")}\n`, errorText: "", exitCode: 0 };
}

/** Runs the evaluation and sets the exit code: 2 when anything stopped it. */
export async function main(): Promise<void> {
  try {
    const output = await runPicker(process.argv.slice(2), DEFAULT_OPTIONS);
    process.stdout.write(output.text);
    process.stderr.write(output.errorText);
    process.exitCode = output.exitCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`critic picker stopped: ${message}\n`);
    process.exitCode = EXIT_CODE_COULD_NOT_RUN;
  }
}

// Run only when node starts this file, not when a test imports it.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
