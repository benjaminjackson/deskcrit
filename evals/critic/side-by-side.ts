// The blind side-by-side (PRD EV-19). Two versions of the design-critic skill each write a crit of
// every page. prepare writes one file per page with the two crits as Crit A and Crit B, in an order
// drawn from a random seed that only key.json holds, and a picks.txt template. Benjamin Jackson
// reads the pages without knowing which version wrote which crit and writes his picks. record maps
// each pick back through key.json and prints how often each version won.
//
// prepare only reads saved crits through readSavedCrits. This file takes no runner, so it cannot
// start a model call; run-critic.ts run makes the crits first.
//
// Usage:
//   node evals/critic/side-by-side.ts prepare --base X --candidate Y [--candidate-go-further SHA] [--go-further-dir DIR] [--note TEXT] [--runs-dir DIR] [--out DIR] IMAGE_FOLDER
//   node evals/critic/side-by-side.ts record [--out DIR]
//   node evals/critic/side-by-side.ts --help
//
// Exit codes: 0 done, 1 missing crits or invalid picks, 2 could not run.

import { createHash, createHmac, randomBytes } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { formatTable } from "../support/format-table.ts";
import { goFurtherKey, readSavedGoFurther } from "./go-further.ts";
import { readSavedCrits, requestKey } from "./run-critic.ts";

const SIDE_BY_SIDE_DIRECTORY = join(import.meta.dirname, "side-by-side");
const DEFAULT_RUNS_DIRECTORY = join(SIDE_BY_SIDE_DIRECTORY, "runs");
const DEFAULT_OUT_DIRECTORY = join(SIDE_BY_SIDE_DIRECTORY, "out");
const DEFAULT_GO_FURTHER_DIRECTORY = join(SIDE_BY_SIDE_DIRECTORY, "go-further");
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);
const REMOVED_TEXT = "[removed]";
const SHORTEST_HIDDEN_PREFIX = 7;
const SEED_BYTES = 32;
const EXIT_CODE_MISSING_OR_INVALID = 1;
const EXIT_CODE_COULD_NOT_RUN = 2;

/** Which skill version a crit came from. */
export type SideName = "base" | "candidate";

/** One page in key.json: which side is Crit A and which is Crit B. */
export type KeyPage = {
  readonly page: string;
  readonly image_sha256: string;
  readonly image_path: string;
  readonly a: SideName;
  readonly b: SideName;
};

/** The wire shape of key.json. */
export type KeyFile = {
  readonly key_file_version: 1;
  readonly seed: string;
  readonly base: string;
  readonly candidate: string;
  readonly pages: readonly KeyPage[];
};

/** One side of the comparison: the value given on the command line and the run folder it names. */
type Side = {
  readonly value: string;
  readonly commit: string;
  readonly runsDirectory: string;
  readonly runFolder: string;
};

/** What prepare and record return: the text to print and the exit code. */
export type CommandResult = {
  readonly text: string;
  readonly errorText: string;
  readonly exitCode: number;
};

/** The inputs of prepareSideBySide. */
export type PrepareInput = {
  readonly imageFolder: string;
  readonly base: string;
  readonly candidate: string;
  /**
   * The skill commit of the go-further step (go-further.ts) when the candidate's crits are its
   * joined crits: each candidate crit is then the saved crit with the section joined in.
   */
  readonly candidateGoFurther?: string;
  /** The folder go-further.ts saved the joined crits in (default side-by-side/go-further). */
  readonly goFurtherDirectory?: string;
  readonly note: string | undefined;
  readonly runsDirectory: string;
  readonly outDirectory: string;
  readonly randomSeed: () => Buffer;
};

/** Where the runs and the output live, and where the seed comes from. Tests pass a fixed seed. */
export type SideBySideOptions = {
  readonly runsDirectory: string;
  readonly outDirectory: string;
  readonly randomSeed: () => Buffer;
};

/**
 * Returns the help text. It is built at run time so the two run-critic.ts commands name the runs
 * folder as an absolute path: run-critic.ts reads a relative --runs-dir from the current folder, so
 * from a subfolder the private crits would land outside the folder that .gitignore lists.
 */
function buildHelpText(runsDirectory: string, outDirectory: string): string {
  return `Pair two unlabeled crits per page, then count the picks (PRD EV-19).

Usage:
  node evals/critic/side-by-side.ts prepare --base X --candidate Y [--candidate-go-further SHA] [--go-further-dir DIR] [--note TEXT] [--runs-dir DIR] [--out DIR] IMAGE_FOLDER
  node evals/critic/side-by-side.ts record [--out DIR]
  node evals/critic/side-by-side.ts --help

First make the crits, one command per skill version. Each SKILL_DIR is a design-critic skill folder
checked out at that version, for example in its own git worktree. IMAGE_FILES is each image file
of IMAGE_FOLDER (png, jpg, jpeg, or webp). Use the same --note in all three commands, or none:
  node evals/critic/run-critic.ts run --skill BASE_SKILL_DIR --runs-dir ${runsDirectory} IMAGE_FILES
  node evals/critic/run-critic.ts run --skill CANDIDATE_SKILL_DIR --runs-dir ${runsDirectory} IMAGE_FILES
Each run makes a folder named after the skill commit under the runs folder. To read the
candidate's crits with the section "Where it could go further" joined in by the second step, make
them with
  node evals/critic/go-further.ts run --crit-commit CANDIDATE_COMMIT --skill SKILL_DIR --runs-dir ${runsDirectory} --go-further-dir DIR IMAGE_FILES
and pass --candidate-go-further with the skill commit it printed the crits under, and the same
--go-further-dir.

Modes:
  prepare  Read the saved crits and write, in the out folder, pages/page-NN.md (Crit A and Crit B
           in a random order per page), key.json (which version is A), and picks.txt. Starts no
           model call. Refuses an out folder that exists and is not empty.
  record   Read key.json and picks.txt, map each pick back through the key, and print the wins.

Flags:
  --base X, --candidate Y  A skill commit (a folder name under the runs folder) or the path of a
                           saved <commit> run folder.
  --candidate-go-further SHA  Read the candidate's crits with the section joined in by the
                           go-further step of skill commit SHA (go-further.ts).
  --go-further-dir DIR     The folder of the joined crits (default ${DEFAULT_GO_FURTHER_DIRECTORY}).
  --note TEXT              The note the crits were made with.
  --runs-dir DIR           The runs folder (default ${runsDirectory}).
  --out DIR                The out folder (default ${outDirectory}).
  --help, -h               Print this help.

How to pick: read pages/page-NN.md and the image it names, then replace each ? in picks.txt with
A, B, or none. Do not open key.json or the runs folder before you finish picking. The pages hide
the commits, the skill folders, and the run metadata, but not what the crits say: a section that
only one version writes, or a crit that is longer, cannot be hidden, because it is the thing being
judged.

Exit codes: 0 done, 1 missing crits or invalid picks, 2 could not run.
`;
}

/** Returns the SHA-256 of bytes as lowercase hex. */
function sha256(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

/** Returns true when a path exists and is a folder. */
function isDirectory(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

/**
 * Finds the run folder that --base or --candidate names: the value as a path first, then
 * <runs-dir>/<value>. The folder name is the skill commit, and its parent is the runs folder.
 */
function resolveSide(value: string, runsDirectory: string): Side {
  let runFolder = resolve(value);
  if (!isDirectory(runFolder)) {
    runFolder = resolve(runsDirectory, value);
  }
  if (!isDirectory(runFolder)) {
    throw new Error(
      `${value} is neither a run folder nor a folder under ${runsDirectory}`,
    );
  }
  return {
    value,
    commit: basename(runFolder),
    runsDirectory: dirname(runFolder),
    runFolder,
  };
}

/** Returns the image files of a folder (png, jpg, jpeg, webp), sorted by name. */
function listPageImages(imageFolder: string): string[] {
  if (!isDirectory(imageFolder)) {
    throw new Error(`${imageFolder} is not a folder`);
  }
  const names = readdirSync(imageFolder).filter((name) =>
    IMAGE_EXTENSIONS.has(extname(name).toLowerCase()),
  );
  // sort() with no comparator compares UTF-16 code units, so the order does not depend on the locale.
  names.sort();
  return names.map((name) => join(imageFolder, name));
}

/**
 * Decides whether the candidate is Crit A on one page: the low bit of the first byte of
 * HMAC-SHA256(seed, image SHA-256). The same seed and image always give the same order.
 */
export function isCandidateFirst(seed: Buffer, imageSha256: string): boolean {
  const digest = createHmac("sha256", seed).update(imageSha256).digest();
  const firstByte = digest[0] ?? 0;
  return (firstByte & 1) === 1;
}

/** Escapes the characters that have a meaning in a regular expression. */
function escapeRegularExpression(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns a pattern that matches a commit's first 7 characters and any hex characters after them,
 * ignoring case, so the full commit and every prefix of 7 or more characters are matched.
 */
function commitPattern(commit: string): RegExp {
  const prefix = escapeRegularExpression(
    commit.slice(0, SHORTEST_HIDDEN_PREFIX),
  );
  return new RegExp(`${prefix}[0-9a-f]*`, "gi");
}

/** Matches any run of non-space characters that holds skills/design-critic, such as an absolute skill path. */
const SKILL_PATH_PATTERN = /\S*skills\/design-critic\S*/g;

/** Returns true when a run folder name looks like a git commit: 7 to 40 hex characters. */
function isCommitName(name: string): boolean {
  return /^[0-9a-f]{7,40}$/i.test(name);
}

/** Returns true when a --base or --candidate value is a path, so it may be removed from crit text. */
function isPathValue(value: string): boolean {
  return value.includes("/") || value.includes(sep);
}

/**
 * Replaces with [removed] every text that could name a side: any path that holds
 * skills/design-critic (an absolute one names the worktree), the literal texts (side values that are
 * paths, run folders, skill folders from the metadata), and both commits with their prefixes of 7
 * or more characters.
 */
export function hideSideNames(
  crit: string,
  commits: readonly string[],
  literals: readonly string[],
): string {
  // Longest first, so a run folder path is removed before the commit inside it.
  const sortedLiterals = literals.filter((literal) => literal !== "");
  sortedLiterals.sort((left, right) => right.length - left.length);
  let text = crit.replace(SKILL_PATH_PATTERN, REMOVED_TEXT);
  for (const literal of sortedLiterals) {
    text = text.replace(
      new RegExp(escapeRegularExpression(literal), "gi"),
      REMOVED_TEXT,
    );
  }
  for (const commit of commits) {
    text = text.replace(commitPattern(commit), REMOVED_TEXT);
  }
  return text;
}

/** Throws when a finished page file still holds either commit in full or as its 7-character prefix. */
function checkPageHidesCommits(
  pageText: string,
  commits: readonly string[],
): void {
  const lowerText = pageText.toLowerCase();
  for (const commit of commits) {
    const lowerCommit = commit.toLowerCase();
    const prefix = lowerCommit.slice(0, SHORTEST_HIDDEN_PREFIX);
    if (lowerText.includes(lowerCommit) || lowerText.includes(prefix)) {
      throw new Error(
        "a page file still names a skill commit; nothing was written",
      );
    }
  }
}

/**
 * Reads both sides' crits of every page and writes the page files, key.json, and picks.txt. It
 * returns exit code 1 and the pages that lack a crit when either side has none, and writes nothing.
 * It throws when it could not run, including when the out folder exists and is not empty.
 */
export function prepareSideBySide(input: PrepareInput): CommandResult {
  const outDirectory = resolve(input.outDirectory);
  const keyPath = join(outDirectory, "key.json");
  if (existsSync(outDirectory) && readdirSync(outDirectory).length > 0) {
    throw new Error(
      `${outDirectory} exists and is not empty, so earlier picks could be lost; pass another --out`,
    );
  }
  const runsDirectory = resolve(input.runsDirectory);
  const base = resolveSide(input.base, runsDirectory);
  const candidate = resolveSide(input.candidate, runsDirectory);
  if (base.runFolder === candidate.runFolder) {
    throw new Error("--base and --candidate name the same run folder");
  }
  const imagePaths = listPageImages(resolve(input.imageFolder));
  if (imagePaths.length === 0) {
    throw new Error(
      `${input.imageFolder} holds no png, jpg, jpeg, or webp file`,
    );
  }

  const pages: {
    page: string;
    imagePath: string;
    imageSha256: string;
    baseCrit: string;
    candidateCrit: string;
    skillDirectories: string[];
  }[] = [];
  const missingPages: string[] = [];
  const pageNumberWidth = Math.max(2, String(imagePaths.length).length);
  imagePaths.forEach((imagePath, index) => {
    const page = String(index + 1).padStart(pageNumberWidth, "0");
    const imageSha256 = sha256(readFileSync(imagePath));
    const key = requestKey([imageSha256], input.note, undefined);
    // readSavedCrits keeps only runs made the way run-critic.ts run makes them now, so both sides
    // were made with the same prompt, model, and permissions, and only the skill differs.
    const baseCrits = readSavedCrits(base.runsDirectory, base.commit, key);
    const candidateCrits = readSavedCrits(
      candidate.runsDirectory,
      candidate.commit,
      key,
    );
    if (
      input.candidateGoFurther !== undefined &&
      candidateCrits[0] !== undefined
    ) {
      // The joined crit replaces the crit it was made from, and keeps that crit's metadata.
      const first = candidateCrits[0];
      const joined = readSavedGoFurther(
        resolve(input.goFurtherDirectory ?? DEFAULT_GO_FURTHER_DIRECTORY),
        input.candidateGoFurther,
        goFurtherKey({
          critCommit: candidate.commit,
          critKey: key,
          critRun: first.runNumber,
          crit: first.crit,
          imagePath,
        }),
      );
      candidateCrits.splice(
        0,
        candidateCrits.length,
        ...(joined === undefined
          ? []
          : [{ ...first, crit: joined.joinedCrit }]),
      );
    }
    const lacking: string[] = [];
    if (baseCrits[0] === undefined) {
      lacking.push(`base ${base.value}`);
    }
    if (candidateCrits[0] === undefined) {
      lacking.push(`candidate ${candidate.value}`);
    }
    if (baseCrits[0] === undefined || candidateCrits[0] === undefined) {
      missingPages.push(
        `page ${page} ${imagePath}: no crit from ${lacking.join(" or ")}`,
      );
      return;
    }
    // readSavedCrits returns the runs in order of run number, so [0] is the lowest number.
    pages.push({
      page,
      imagePath,
      imageSha256,
      baseCrit: baseCrits[0].crit,
      candidateCrit: candidateCrits[0].crit,
      skillDirectories: [
        String(baseCrits[0].metadata.skill_directory ?? ""),
        String(candidateCrits[0].metadata.skill_directory ?? ""),
      ],
    });
  });
  if (missingPages.length > 0) {
    const lines = [
      "These pages have no saved crit on one side:",
      ...missingPages,
      "Runs made with an older prompt, model, permission mode, or settings, or with a different --note, are not used.",
      "Run node evals/critic/run-critic.ts run for each skill version first; see --help.",
    ];
    return {
      text: "",
      errorText: `${lines.join("\n")}\n`,
      exitCode: EXIT_CODE_MISSING_OR_INVALID,
    };
  }

  const seed = input.randomSeed();
  // Only a run folder named like a commit is hidden as one, so a folder named with a bare word,
  // such as main, does not remove that word from the crits.
  const commits = [
    base.commit,
    candidate.commit,
    input.candidateGoFurther ?? "",
  ].filter(isCommitName);
  const keyPages: KeyPage[] = [];
  const pageFiles: { name: string; text: string }[] = [];
  for (const page of pages) {
    // A side value that is a commit is removed by the commit pattern; a bare word is never removed.
    const literals = [
      isPathValue(base.value) ? base.value : "",
      isPathValue(candidate.value) ? candidate.value : "",
      base.runFolder,
      candidate.runFolder,
      ...page.skillDirectories,
    ];
    // Trimmed, so a different number of trailing line breaks does not tell the sides apart.
    const baseText = hideSideNames(page.baseCrit, commits, literals).trim();
    const candidateText = hideSideNames(
      page.candidateCrit,
      commits,
      literals,
    ).trim();
    const candidateFirst = isCandidateFirst(seed, page.imageSha256);
    let critA = baseText;
    let critB = candidateText;
    let sideA: SideName = "base";
    let sideB: SideName = "candidate";
    if (candidateFirst) {
      critA = candidateText;
      critB = baseText;
      sideA = "candidate";
      sideB = "base";
    }
    const lines = [`# Page ${page.page}`, "", `Image: ${page.imagePath}`, ""];
    if (input.note !== undefined) {
      lines.push(`Note: ${input.note}`, "");
    }
    lines.push("## Crit A", "", critA, "", "## Crit B", "", critB, "");
    const text = lines.join("\n");
    checkPageHidesCommits(text, commits);
    pageFiles.push({ name: `page-${page.page}.md`, text });
    keyPages.push({
      page: page.page,
      image_sha256: page.imageSha256,
      image_path: page.imagePath,
      a: sideA,
      b: sideB,
    });
  }

  const keyFile: KeyFile = {
    key_file_version: 1,
    seed: seed.toString("hex"),
    base: base.commit,
    candidate:
      input.candidateGoFurther !== undefined
        ? `${candidate.commit} with go-further ${input.candidateGoFurther}`
        : candidate.commit,
    pages: keyPages,
  };
  const pickLines = [
    "# Replace each ? with A, B, or none (no difference). Lines that start with # are skipped.",
  ];
  for (const page of pages) {
    pickLines.push(`${page.page} ?`);
  }
  const picksText = `${pickLines.join("\n")}\n`;
  checkPageHidesCommits(picksText, commits);

  mkdirSync(join(outDirectory, "pages"), { recursive: true });
  for (const pageFile of pageFiles) {
    writeFileSync(join(outDirectory, "pages", pageFile.name), pageFile.text);
  }
  writeFileSync(join(outDirectory, "picks.txt"), picksText);
  // The "wx" flag makes the write fail when key.json exists, so a key is never written twice.
  writeFileSync(keyPath, `${JSON.stringify(keyFile, null, 2)}\n`, {
    flag: "wx",
  });
  const text = [
    `Wrote ${pageFiles.length} pages to ${join(outDirectory, "pages")}.`,
    `Write your picks in ${join(outDirectory, "picks.txt")}, then run record.`,
    "Do not open key.json before you finish picking.",
  ].join("\n");
  return { text: `${text}\n`, errorText: "", exitCode: 0 };
}

/** Returns true when a value is a plain object, so its fields can be read. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Returns true when a value is "base" or "candidate". This is a type guard: true narrows the type. */
function isSideName(value: unknown): value is SideName {
  return value === "base" || value === "candidate";
}

/** Checks the parsed text of key.json and returns it typed; it throws on any other shape (CS-7). */
export function checkKeyFile(value: unknown): KeyFile {
  if (!isRecord(value) || value.key_file_version !== 1) {
    throw new Error("key.json is not a version 1 key file");
  }
  if (
    typeof value.seed !== "string" ||
    typeof value.base !== "string" ||
    typeof value.candidate !== "string" ||
    !Array.isArray(value.pages)
  ) {
    throw new Error("key.json lacks seed, base, candidate, or pages");
  }
  const pages: KeyPage[] = [];
  for (const page of value.pages) {
    if (
      !isRecord(page) ||
      typeof page.page !== "string" ||
      !/^\d+$/.test(page.page) ||
      typeof page.image_sha256 !== "string" ||
      typeof page.image_path !== "string" ||
      !isSideName(page.a) ||
      !isSideName(page.b) ||
      page.a === page.b
    ) {
      throw new Error(`key.json has a bad page entry: ${JSON.stringify(page)}`);
    }
    pages.push({
      page: page.page,
      image_sha256: page.image_sha256,
      image_path: page.image_path,
      a: page.a,
      b: page.b,
    });
  }
  return {
    key_file_version: 1,
    seed: value.seed,
    base: value.base,
    candidate: value.candidate,
    pages,
  };
}

/** The winner of one pick: a side, or no difference. */
type Winner = SideName | "no difference";

/**
 * Maps picks.txt through the key and returns the per-page and total tables. It returns exit code 1
 * and every problem (unknown page, duplicate, a ? left, a bad line, a page with no pick) when the
 * picks are not complete and valid.
 */
export function recordPicks(
  keyFile: KeyFile,
  picksText: string,
): CommandResult {
  const keyPagesByNumber = new Map<number, KeyPage>();
  for (const page of keyFile.pages) {
    keyPagesByNumber.set(Number(page.page), page);
  }
  const problems: string[] = [];
  const picksByNumber = new Map<number, string>();
  const unpickedNumbers = new Set<number>();
  const lines = picksText.split("\n");
  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    const lineNumber = index + 1;
    if (line === "" || line.startsWith("#")) {
      return;
    }
    const unpicked = /^(\d+)\s+\?$/.exec(line);
    if (unpicked?.[1] !== undefined) {
      problems.push(`line ${lineNumber}: page ${unpicked[1]} still has ?`);
      unpickedNumbers.add(Number(unpicked[1]));
      return;
    }
    const match = /^(\d+)\s+(A|B|none)$/i.exec(line);
    if (match?.[1] === undefined || match[2] === undefined) {
      problems.push(
        `line ${lineNumber}: "${line}" is not a page number and A, B, or none`,
      );
      return;
    }
    const pageNumber = Number(match[1]);
    if (!keyPagesByNumber.has(pageNumber)) {
      problems.push(`line ${lineNumber}: page ${match[1]} is not in key.json`);
      return;
    }
    if (picksByNumber.has(pageNumber)) {
      problems.push(`line ${lineNumber}: page ${match[1]} is picked twice`);
      return;
    }
    picksByNumber.set(pageNumber, match[2].toLowerCase());
  });
  for (const page of keyFile.pages) {
    const pageNumber = Number(page.page);
    if (!picksByNumber.has(pageNumber) && !unpickedNumbers.has(pageNumber)) {
      problems.push(`page ${page.page} has no pick`);
    }
  }
  if (problems.length > 0) {
    const text = ["picks.txt has these problems:", ...problems].join("\n");
    return {
      text: "",
      errorText: `${text}\n`,
      exitCode: EXIT_CODE_MISSING_OR_INVALID,
    };
  }

  const pageRows: string[][] = [];
  const wins = new Map<Winner, number>([
    ["base", 0],
    ["candidate", 0],
    ["no difference", 0],
  ]);
  for (const page of keyFile.pages) {
    const pick = picksByNumber.get(Number(page.page)) ?? "none";
    let winner: Winner = "no difference";
    if (pick === "a") {
      winner = page.a;
    } else if (pick === "b") {
      winner = page.b;
    }
    wins.set(winner, (wins.get(winner) ?? 0) + 1);
    pageRows.push([
      page.page,
      pick === "none" ? "none" : pick.toUpperCase(),
      winner,
    ]);
  }
  const totalRows = [
    ["base", keyFile.base, String(wins.get("base") ?? 0)],
    ["candidate", keyFile.candidate, String(wins.get("candidate") ?? 0)],
    ["no difference", "", String(wins.get("no difference") ?? 0)],
  ];
  const text = [
    formatTable(["page", "pick", "winner"], pageRows),
    "",
    formatTable(["side", "commit", "pages won"], totalRows),
  ].join("\n");
  return { text: `${text}\n`, errorText: "", exitCode: 0 };
}

/** Reads key.json and picks.txt from the out folder and runs recordPicks. It throws when either is missing. */
function recordFromOutDirectory(outDirectory: string): CommandResult {
  const keyPath = join(outDirectory, "key.json");
  const picksPath = join(outDirectory, "picks.txt");
  if (!existsSync(keyPath) || !existsSync(picksPath)) {
    throw new Error(
      `${outDirectory} has no key.json or picks.txt; run prepare first`,
    );
  }
  const keyFile = checkKeyFile(JSON.parse(readFileSync(keyPath, "utf8")));
  return recordPicks(keyFile, readFileSync(picksPath, "utf8"));
}

/** Parses the command line and runs prepare or record. Any error that stops the run gives exit code 2. */
export function runSideBySideCommand(
  argv: readonly string[],
  options: SideBySideOptions,
): CommandResult {
  try {
    const parsed = parseArgs({
      args: [...argv],
      options: {
        base: { type: "string" },
        candidate: { type: "string" },
        "candidate-go-further": { type: "string" },
        "go-further-dir": { type: "string" },
        note: { type: "string" },
        "runs-dir": { type: "string" },
        out: { type: "string" },
        help: { type: "boolean", short: "h", default: false },
      },
      strict: true,
      allowPositionals: true,
    });
    if (parsed.values.help === true) {
      return {
        text: buildHelpText(
          resolve(options.runsDirectory),
          resolve(options.outDirectory),
        ),
        errorText: "",
        exitCode: 0,
      };
    }
    const [mode, ...rest] = parsed.positionals;
    const outDirectory = resolve(parsed.values.out ?? options.outDirectory);
    if (mode === "record") {
      if (
        rest.length > 0 ||
        parsed.values.base !== undefined ||
        parsed.values.candidate !== undefined ||
        parsed.values["candidate-go-further"] !== undefined ||
        parsed.values["go-further-dir"] !== undefined ||
        parsed.values.note !== undefined ||
        parsed.values["runs-dir"] !== undefined
      ) {
        throw new Error("record takes only --out");
      }
      return recordFromOutDirectory(outDirectory);
    }
    if (mode !== "prepare") {
      throw new Error(
        `name a mode, prepare or record\n\n${buildHelpText(resolve(options.runsDirectory), resolve(options.outDirectory))}`,
      );
    }
    const imageFolder = rest[0];
    if (imageFolder === undefined || rest.length > 1) {
      throw new Error("prepare takes one IMAGE_FOLDER");
    }
    if (
      parsed.values.base === undefined ||
      parsed.values.candidate === undefined
    ) {
      throw new Error("prepare needs --base and --candidate");
    }
    return prepareSideBySide({
      imageFolder,
      base: parsed.values.base,
      candidate: parsed.values.candidate,
      candidateGoFurther: parsed.values["candidate-go-further"],
      goFurtherDirectory: parsed.values["go-further-dir"],
      note: parsed.values.note,
      runsDirectory: parsed.values["runs-dir"] ?? options.runsDirectory,
      outDirectory,
      randomSeed: options.randomSeed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      text: "",
      errorText: `side-by-side stopped: ${message}\n`,
      exitCode: EXIT_CODE_COULD_NOT_RUN,
    };
  }
}

/** Runs the command with the default folders and a new random seed, prints, and sets the exit code. */
export function main(): void {
  const output = runSideBySideCommand(process.argv.slice(2), {
    runsDirectory: DEFAULT_RUNS_DIRECTORY,
    outDirectory: DEFAULT_OUT_DIRECTORY,
    randomSeed: () => randomBytes(SEED_BYTES),
  });
  process.stdout.write(output.text);
  process.stderr.write(output.errorText);
  process.exitCode = output.exitCode;
}

// Run only when node starts this file, not when a test imports it.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
