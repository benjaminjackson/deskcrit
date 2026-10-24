// The agreement harness (EV-4, EV-5, FR-50, OQ-9). It runs the built `crit report --json` bundle
// as a child process on each fixture image of a pack, checks every report against
// schemas/report.schema.json, and prints the EV-4 fixture table, the EV-5 agreement table, and
// the label coverage. It imports no stage code (AC-6, CS-21).
//
// Live mode (`npm run test:live`) asks TypeSafe only the pairs of a fixture and a criterion that no
// saved answers file of the pinned model answers yet, and saves each fixture's new answers with
// --save-answers in a new file under runs/<pack>/<model>/: <image>.answers.json first, then
// <image>.answers-2.json and so on. It never writes a saved file again. Replay mode
// (`npm run eval:agreement`) scores every saved file with --answers against a pack of only the
// criteria that file answers, needs no key, and makes no network call (EV-4 rule 5, FR-42).
//
// Usage: node evals/agreement/run-agreement.ts [--live] [--rerun-same-set] [--pack <dir>]...
// A live run with no pair left to ask is refused, unless a person passes --rerun-same-set, which
// asks every pair again and replaces the saved answers. Only a person passes it, never an agent.
// Without --pack it measures every first-party pack under packs/. Exit 0 when every fixture agrees,
// 1 when any EV-4 fixture disagrees, and 2 when the harness could not run (FR-24).

import { createHash } from "node:crypto";
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
import {
  basename,
  dirname,
  isAbsolute,
  join,
  normalize,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { isMap, isSeq, parseDocument } from "yaml";
import {
  compileReportValidator,
  readPinnedModel,
} from "../support/pinned-model-and-schema.ts";
import { type CritRun, runCritBundle } from "../support/run-crit-bundle.ts";
import {
  formatScoredPngHashes,
  hashPngHashes,
  parseScoredPngHashes,
  readFrozenPngHashes,
} from "./frozen-set.ts";
import {
  type FixtureLabel,
  type LabelPackCheck,
  readLabels,
} from "./labels.ts";
import {
  answersFileNumber,
  type LiveFixturePlan,
  type PlanFixture,
  planLiveRun,
  planReplay,
  type SavedAnswersFile,
} from "./plan-run.ts";
import {
  AGREEMENT_FLOOR,
  type Coverage,
  type CriterionAgreement,
  EV5_MINIMUM_DESIGNS,
  FIRST_PARTY_DOMAINS,
  type FixtureTestRow,
  type FixtureVerdicts,
  findSingleModel,
  measureCoverage,
  type PackCriterionFixtures,
  scoreAgreement,
  scoreFixtureTests,
  type Verdict,
} from "./score.ts";

const DEFAULT_HARNESS_DIRECTORY = import.meta.dirname;
const REPOSITORY_DIRECTORY = resolve(DEFAULT_HARNESS_DIRECTORY, "..", "..");
const REPORT_SCHEMA_PATH = join(
  REPOSITORY_DIRECTORY,
  "schemas",
  "report.schema.json",
);
const FIRST_PARTY_PACKS_DIRECTORY = join(REPOSITORY_DIRECTORY, "packs");

const EXIT_CODE_AGREED = 0;
const EXIT_CODE_DISAGREED = 1;
const EXIT_CODE_COULD_NOT_RUN = 2;

/** The report fields the harness reads. Ajv checks the whole document against the schema first. */
type ReportDocument = {
  readonly model: string;
  readonly findings: readonly {
    readonly criterion: string;
    readonly verdict: Verdict;
    readonly model: string;
  }[];
  readonly usage: {
    readonly requests: number;
    readonly input_tokens: number | null;
    readonly cost_usd: number | null;
    readonly latency_ms: number;
  };
};

/** One pack's name, directory, and criteria with their fixture paths (FR-44, FR-50). */
type PackFixtures = {
  readonly name: string;
  readonly directory: string;
  readonly criteria: readonly PackCriterionFixtures[];
};

/** The scored results of one pack, kept until every pack has run so no partial score prints (FR-24). */
type PackResult = {
  readonly pack: PackFixtures;
  readonly fixtureRows: readonly FixtureTestRow[];
  /** The pack's checked label file, read once, or null when it has none (EV-5). */
  readonly labels: readonly FixtureLabel[] | null;
  readonly agreement: readonly CriterionAgreement[] | null;
};

// The test reads CritRun from this file, so it is re-exported from the shared runner.
export type { CritRun };

/**
 * Runs `crit` with these arguments and environment, with the harness folder as its working
 * directory. The harness runs the built bundle; a test passes one that runs crit in-process with
 * the stub adapter, so no request reaches TypeSafe.
 */
export type CritRunner = (
  critArguments: readonly string[],
  environment: NodeJS.ProcessEnv,
  workingDirectory: string,
) => Promise<CritRun>;

/** The folders the harness reads and writes, and how it runs crit. Tests point them at a temporary folder. */
export type HarnessOptions = {
  /** The folder with the .crit.yaml that pins the model; crit runs with it as its working directory. */
  readonly harnessDirectory: string;
  readonly runsDirectory: string;
  readonly labelsDirectory: string;
  readonly runCrit: CritRunner;
};

/** The options of the real harness: this folder, its runs/ and labels/, and the built bundle. */
const DEFAULT_OPTIONS: HarnessOptions = {
  harnessDirectory: DEFAULT_HARNESS_DIRECTORY,
  runsDirectory: join(DEFAULT_HARNESS_DIRECTORY, "runs"),
  labelsDirectory: join(DEFAULT_HARNESS_DIRECTORY, "labels"),
  runCrit: runCritBundle,
};

/** The summed usage of every crit run, null where any run had no token count (FR-23, FR-33). */
type UsageTotals = {
  requests: number;
  input_tokens: number | null;
  cost_usd: number | null;
  latency_ms: number;
};

/** What one harness run needs at every step: the options, the pinned model, and the checker. */
type HarnessContext = {
  readonly options: HarnessOptions;
  readonly pinnedModel: string;
  readonly validateReport: ReturnType<
    typeof compileReportValidator<ReportDocument>
  >;
  /** A temporary folder for the packs made of only some criteria, removed when the run ends. */
  readonly temporaryDirectory: string;
  /** The pack directory already written for each set of criteria, keyed by the joined criterion ids. */
  readonly subsetPackDirectories: Map<string, string>;
};

/**
 * Run the harness and set the exit code: 2 when any step could not run, 1 when an EV-4 fixture
 * disagreed, and 0 otherwise. Output is written once at the end, so a stopped run prints no
 * partial scores (EV-4, EV-5, FR-24).
 */
export async function main(
  argv: readonly string[] = process.argv.slice(2),
  options: HarnessOptions = DEFAULT_OPTIONS,
): Promise<void> {
  try {
    const output = await runHarness(argv, options);
    process.stdout.write(output.text);
    process.exitCode = output.exitCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`agreement harness stopped: ${message}\n`);
    process.exitCode = EXIT_CODE_COULD_NOT_RUN;
  }
}

/**
 * Parse the flags and check the key in live mode. A live run first plans every pack, so a refusal
 * comes before any request, then asks crit only the pairs of a fixture and a criterion with no
 * saved answer, each fixture's new answers in a new file (EV-4 rule 5). Both modes then score the
 * saved answers with --answers and return the text to print with its exit code (EV-4, EV-5,
 * FR-42, CS-21).
 */
export async function runHarness(
  argv: readonly string[],
  options: HarnessOptions,
): Promise<{ text: string; exitCode: number }> {
  const parsed = parseArgs({
    args: [...argv],
    options: {
      live: { type: "boolean", default: false },
      "rerun-same-set": { type: "boolean", default: false },
      pack: { type: "string", multiple: true },
    },
    strict: true,
    allowPositionals: false,
  });
  const live = parsed.values.live ?? false;
  const rerunSameSet = parsed.values["rerun-same-set"] ?? false;
  if (live && !isApiKeyPresent()) {
    throw new Error(
      "TYPESAFE_API_KEY is not set. Live mode asks TypeSafe and needs the key; no request was sent. Use npm run eval:agreement to score saved answers with no key.",
    );
  }
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "crit-agreement-"));
  try {
    const context: HarnessContext = {
      options,
      pinnedModel: readPinnedModel(options.harnessDirectory),
      validateReport:
        compileReportValidator<ReportDocument>(REPORT_SCHEMA_PATH),
      temporaryDirectory,
      subsetPackDirectories: new Map<string, string>(),
    };
    return await runHarnessWithContext(
      context,
      listPackDirectories(parsed.values.pack ?? []),
      live,
      rerunSameSet,
    );
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

/** Plan and ask in live mode, then score every pack from its saved answers (EV-4, EV-5). */
async function runHarnessWithContext(
  context: HarnessContext,
  packDirectories: readonly string[],
  live: boolean,
  rerunSameSet: boolean,
): Promise<{ text: string; exitCode: number }> {
  const packs = packDirectories.map(readPackFixtures);
  const usageTotals: UsageTotals = {
    requests: 0,
    input_tokens: 0,
    cost_usd: 0,
    latency_ms: 0,
  };
  const modelIds: string[] = [];
  // Read and check every label file before the first request, so a bad label file stops a live
  // run before it asks TypeSafe anything (EV-5, crit-cy8.44).
  const labelsByPack = new Map<string, readonly FixtureLabel[] | null>();
  for (const pack of packs) {
    labelsByPack.set(pack.name, readPackLabels(context, pack));
  }
  const labelsByDomain = readAllLabels(context, labelsByPack);
  if (live) {
    // Plan every pack before the first request, so a refused pack sends nothing at all.
    const plans: LiveFixturePlan[][] = [];
    for (const pack of packs) {
      plans.push(planPackLiveRun(context, pack, rerunSameSet));
    }
    for (const [index, pack] of packs.entries()) {
      // Record the set before the first request, so a run that stops part way still counts as
      // scored and the next live run on the same fixtures is refused (EV-4 rule 5).
      recordFrozenSet(context, pack);
      for (const fixturePlan of plans[index] ?? []) {
        const report = await askFixture(context, pack, fixturePlan);
        modelIds.push(report.model);
        addUsage(usageTotals, report.usage);
      }
    }
  }

  const packResults: PackResult[] = [];
  for (const pack of packs) {
    const verdictsByFixture = new Map<string, FixtureVerdicts>();
    for (const fixture of listFixtureImages(pack)) {
      const verdicts = new Map<string, Verdict>();
      for (const report of await replayFixture(context, pack, fixture)) {
        modelIds.push(report.model);
        for (const finding of report.findings) {
          modelIds.push(finding.model);
          verdicts.set(finding.criterion, finding.verdict);
        }
        if (!live) {
          addUsage(usageTotals, report.usage);
        }
      }
      verdictsByFixture.set(fixture, verdicts);
    }
    const fixtureRows = scoreFixtureTests(pack.criteria, verdictsByFixture);
    const labels = labelsByPack.get(pack.name) ?? null;
    let agreement: CriterionAgreement[] | null = null;
    if (labels !== null) {
      const criterionIds = pack.criteria.map((criterion) => criterion.id);
      agreement = scoreAgreement(
        pack.name,
        criterionIds,
        labels,
        verdictsByFixture,
      );
    }
    packResults.push({ pack, fixtureRows, labels, agreement });
  }
  const model = findSingleModel(context.pinnedModel, modelIds);
  const coverage = measureCoverage(labelsByDomain);

  const sections: string[] = [];
  sections.push(formatHeader(live, packResults, model, usageTotals));
  let anyDisagreed = false;
  for (const result of packResults) {
    sections.push(formatFixtureTests(result));
    for (const row of result.fixtureRows) {
      if (!row.agrees) {
        anyDisagreed = true;
      }
    }
    sections.push(formatAgreement(context, result));
  }
  sections.push(formatCoverage(coverage));
  const exitCode = anyDisagreed ? EXIT_CODE_DISAGREED : EXIT_CODE_AGREED;
  return { text: `${sections.join("\n\n")}\n`, exitCode };
}

/**
 * Plan a live run on one pack from its fixtures, their saved answers, and the guard files, or
 * throw when EV-4 rule 5 refuses it. The message says that no request was sent and that only a
 * person may pass --rerun-same-set.
 */
function planPackLiveRun(
  context: HarnessContext,
  pack: PackFixtures,
  rerunSameSet: boolean,
): LiveFixturePlan[] {
  const fixtures: PlanFixture[] = [];
  for (const fixture of listFixtureImages(pack)) {
    const imagePath = join(pack.directory, fixture);
    if (!existsSync(imagePath)) {
      throw new Error(
        `${pack.name} fixture ${fixture}: ${imagePath} does not exist`,
      );
    }
    fixtures.push({
      fixture,
      pngSha256: createHash("sha256")
        .update(readFileSync(imagePath))
        .digest("hex"),
      savedFiles: readSavedAnswersFiles(context, pack, fixture),
    });
  }
  let storedSetHash: string | null = null;
  const hashPath = frozenSetHashPath(context, pack);
  if (existsSync(hashPath)) {
    storedSetHash = readFileSync(hashPath, "utf8").trim();
  }
  let scoredPngHashes: string[] | null = null;
  const listPath = scoredPngListPath(context, pack);
  if (existsSync(listPath)) {
    scoredPngHashes = parseScoredPngHashes(readFileSync(listPath, "utf8"));
  }
  try {
    return planLiveRun({
      packName: pack.name,
      criteria: pack.criteria,
      fixtures,
      currentSetPngHashes: readFixtureSetPngHashes(pack),
      storedSetHash,
      scoredPngHashes,
      rerunSameSet,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `${message} (${join(context.options.runsDirectory, pack.name, context.pinnedModel)}). EV-4 rule 5 allows no second run on a pair already scored; no request was sent. A person may pass --rerun-same-set to run it again.`,
    );
  }
}

/**
 * Return the saved answers files of one fixture with the pinned model, first file first: the name,
 * the recorded image_sha256, and the question ids of each. Throw on a file that is not JSON or has
 * no answers list, naming it; crit checks the rest of its shape when it replays it (FR-42).
 */
function readSavedAnswersFiles(
  context: HarnessContext,
  pack: PackFixtures,
  fixture: string,
): SavedAnswersFile[] {
  const directory = fixtureAnswersDirectory(context, pack, fixture);
  if (!existsSync(directory)) {
    return [];
  }
  const imageFileName = basename(fixture);
  const numbered: { n: number; fileName: string }[] = [];
  for (const fileName of readdirSync(directory)) {
    const n = answersFileNumber(imageFileName, fileName);
    if (n !== null) {
      numbered.push({ n, fileName });
    }
  }
  numbered.sort((left, right) => left.n - right.n);
  const savedFiles: SavedAnswersFile[] = [];
  for (const entry of numbered) {
    const filePath = join(directory, entry.fileName);
    savedFiles.push(readSavedAnswersFile(filePath, entry.fileName));
  }
  return savedFiles;
}

/** Read the image_sha256 and the question ids of one saved answers file (FR-42, OQ-26 a). */
function readSavedAnswersFile(
  filePath: string,
  fileName: string,
): SavedAnswersFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    throw new Error(`${filePath}: not JSON`);
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(`${filePath}: not an answers file`);
  }
  const record = parsed as Record<string, unknown>;
  const imageSha256 = record.image_sha256;
  const answers = record.answers;
  if (typeof imageSha256 !== "string" || !Array.isArray(answers)) {
    throw new Error(`${filePath}: not an answers file`);
  }
  const questionIds: string[] = [];
  for (const answer of answers) {
    const questionId: unknown =
      typeof answer === "object" && answer !== null
        ? (answer as Record<string, unknown>).question_id
        : undefined;
    if (typeof questionId !== "string") {
      throw new Error(`${filePath}: an answer has no question_id`);
    }
    questionIds.push(questionId);
  }
  return { fileName, imageSha256, questionIds };
}

/**
 * Ask crit about one fixture in live mode and save the answers with --save-answers to the file the
 * plan names (FR-42). Only after crit succeeds does it delete the files the plan lists, which only
 * --rerun-same-set does, so a failed run leaves the saved files as they were. When the plan asks
 * only some criteria, crit gets a pack made of only those criteria.
 */
async function askFixture(
  context: HarnessContext,
  pack: PackFixtures,
  fixturePlan: LiveFixturePlan,
): Promise<ReportDocument> {
  const directory = fixtureAnswersDirectory(context, pack, fixturePlan.fixture);
  mkdirSync(directory, { recursive: true });
  const packDirectory = packDirectoryFor(context, pack, fixturePlan.criteria);
  const answersPath = join(directory, fixturePlan.answersFileName);
  // runCritOnFixture throws unless crit exited 0 or 1, so the deletes below run only after success.
  const report = await runCritOnFixture(
    context,
    pack,
    fixturePlan.fixture,
    packDirectory,
    ["--save-answers", answersPath],
  );
  for (const fileName of fixturePlan.fileNamesToDelete) {
    rmSync(join(directory, fileName));
  }
  return report;
}

/**
 * Replay every saved answers file of one fixture with --answers and no key, each against a pack of
 * only the criteria that file answers, and return the reports (EV-4 rule 5, FR-42).
 */
async function replayFixture(
  context: HarnessContext,
  pack: PackFixtures,
  fixture: string,
): Promise<ReportDocument[]> {
  const savedFiles = readSavedAnswersFiles(context, pack, fixture);
  const packCriteria = pack.criteria.map((criterion) => criterion.criterion);
  const filePlans = planReplay(pack.name, packCriteria, fixture, savedFiles);
  const directory = fixtureAnswersDirectory(context, pack, fixture);
  const reports: ReportDocument[] = [];
  for (const filePlan of filePlans) {
    const packDirectory = filePlan.coversWholePack
      ? pack.directory
      : packDirectoryFor(context, pack, filePlan.criteria);
    const answersPath = join(directory, filePlan.fileName);
    reports.push(
      await runCritOnFixture(context, pack, fixture, packDirectory, [
        "--answers",
        answersPath,
      ]),
    );
  }
  return reports;
}

/**
 * Return the pack directory to give crit for these criteria: the pack itself when they are all of
 * its criteria, or else a temporary pack whose pack.yaml keeps the pack's name and fields and only
 * these criteria. The temporary folder is named after the pack.
 */
function packDirectoryFor(
  context: HarnessContext,
  pack: PackFixtures,
  criteria: readonly string[],
): string {
  if (criteria.length === pack.criteria.length) {
    return pack.directory;
  }
  const key = criteria.join("\n");
  const existing = context.subsetPackDirectories.get(key);
  if (existing !== undefined) {
    return existing;
  }
  const keep = new Set<string>(criteria);
  const document = parseDocument(
    readFileSync(join(pack.directory, "pack.yaml"), "utf8"),
    { schema: "core", uniqueKeys: true },
  );
  const criteriaNode = document.get("criteria", true);
  if (!isSeq(criteriaNode)) {
    throw new Error(
      `${pack.directory}/pack.yaml: the pack has no criteria list`,
    );
  }
  criteriaNode.items = criteriaNode.items.filter((item) => {
    if (!isMap(item)) {
      return false;
    }
    return keep.has(`${pack.name}/${String(item.get("id"))}`);
  });
  const directory = join(
    context.temporaryDirectory,
    String(context.subsetPackDirectories.size + 1),
    pack.name,
  );
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    join(directory, "pack.yaml"),
    document.toString({ lineWidth: 0 }),
  );
  context.subsetPackDirectories.set(key, directory);
  return directory;
}

/** The folder that holds a fixture's saved answers files with the pinned model. */
function fixtureAnswersDirectory(
  context: HarnessContext,
  pack: PackFixtures,
  fixture: string,
): string {
  return dirname(
    join(
      context.options.runsDirectory,
      pack.name,
      context.pinnedModel,
      fixture,
    ),
  );
}

/**
 * Return the sorted PNG hashes of the pack's frozen fixture set, from its fixtures/rendered.json,
 * or null when the pack has no rendered.json, such as a pack made of captured pages only
 * (EV-4 rule 5).
 */
function readFixtureSetPngHashes(pack: PackFixtures): string[] | null {
  const renderedJsonPath = join(pack.directory, "fixtures", "rendered.json");
  if (!existsSync(renderedJsonPath)) {
    return null;
  }
  return readFrozenPngHashes(readFileSync(renderedJsonPath, "utf8"));
}

/** The path of the file that keeps the hash of the fixture set the last live run scored. */
function frozenSetHashPath(
  context: HarnessContext,
  pack: PackFixtures,
): string {
  return join(
    context.options.runsDirectory,
    pack.name,
    context.pinnedModel,
    "rendered.json.sha256",
  );
}

/**
 * The path of the file that lists, one per line, the hash of every PNG that a live run with this
 * model has scored for this pack, across all runs.
 */
function scoredPngListPath(
  context: HarnessContext,
  pack: PackFixtures,
): string {
  return join(
    context.options.runsDirectory,
    pack.name,
    context.pinnedModel,
    "scored-png-sha256.txt",
  );
}

/**
 * Record the fixture set a live run is about to score, next to its answers, before the first
 * request is sent (EV-4 rule 5): the SHA-256 of the set in rendered.json.sha256, so a later
 * reader can check which set the run used, and its PNG hashes added to the scored PNG list, so
 * the guard knows each scored fixture. A pack with no rendered.json, such as one made of captured
 * pages only, gets no files.
 */
function recordFrozenSet(context: HarnessContext, pack: PackFixtures): void {
  const currentPngHashes = readFixtureSetPngHashes(pack);
  if (currentPngHashes === null) {
    return;
  }
  const hash = hashPngHashes(currentPngHashes);
  const hashPath = frozenSetHashPath(context, pack);
  mkdirSync(dirname(hashPath), { recursive: true });
  writeFileSync(hashPath, `${hash}\n`);
  const listPath = scoredPngListPath(context, pack);
  let previousPngHashes: string[] = [];
  if (existsSync(listPath)) {
    previousPngHashes = parseScoredPngHashes(readFileSync(listPath, "utf8"));
  }
  writeFileSync(
    listPath,
    formatScoredPngHashes(previousPngHashes, currentPngHashes),
  );
}

/** Say whether TYPESAFE_API_KEY is set, without reading its value into any output (CS-19, NFR-14). */
function isApiKeyPresent(): boolean {
  const key = process.env.TYPESAFE_API_KEY;
  return key !== undefined && key !== "";
}

/**
 * Return the pack directories to measure as absolute paths: the --pack directories, or else every
 * first-party pack under packs/ whose folder name does not start with `_` (FR-53).
 */
function listPackDirectories(packFlags: readonly string[]): string[] {
  const directories: string[] = [];
  if (packFlags.length > 0) {
    for (const packFlag of packFlags) {
      directories.push(resolve(packFlag));
    }
    return directories;
  }
  const entries = readdirSync(FIRST_PARTY_PACKS_DIRECTORY, {
    withFileTypes: true,
  });
  const names: string[] = [];
  for (const entry of entries) {
    const isPack =
      entry.isDirectory() &&
      !entry.name.startsWith("_") &&
      existsSync(join(FIRST_PARTY_PACKS_DIRECTORY, entry.name, "pack.yaml"));
    if (isPack) {
      names.push(entry.name);
    }
  }
  names.sort(compareText);
  for (const name of names) {
    directories.push(join(FIRST_PARTY_PACKS_DIRECTORY, name));
  }
  if (directories.length === 0) {
    throw new Error(
      "no pack to measure: pass --pack <dir> or add a pack under packs/",
    );
  }
  return directories;
}

/**
 * Read a pack's name and each criterion's fixture paths from its pack.yaml. It refuses a pack
 * that is not valid YAML, a criterion with no positive or no negative fixture, and a fixture path
 * that leaves the pack directory (FR-44, FR-49, FR-50, CS-7).
 */
function readPackFixtures(packDirectory: string): PackFixtures {
  const packYamlPath = join(packDirectory, "pack.yaml");
  if (!existsSync(packYamlPath)) {
    throw new Error(`${packYamlPath} does not exist`);
  }
  const document = parseDocument(readFileSync(packYamlPath, "utf8"), {
    schema: "core",
    uniqueKeys: true,
  });
  if (document.errors.length > 0) {
    throw new Error(`${packYamlPath}: not valid YAML`);
  }
  const parsed: unknown = document.toJS();
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(`${packYamlPath}: not a pack`);
  }
  if (!("name" in parsed) || typeof parsed.name !== "string") {
    throw new Error(`${packYamlPath}: the pack has no name`);
  }
  if (!("criteria" in parsed) || !Array.isArray(parsed.criteria)) {
    throw new Error(`${packYamlPath}: the pack has no criteria list`);
  }
  const packName = parsed.name;
  const criteria: PackCriterionFixtures[] = [];
  for (const criterion of parsed.criteria) {
    criteria.push(readCriterionFixtures(packYamlPath, packName, criterion));
  }
  return { name: packName, directory: packDirectory, criteria };
}

/** Read one criterion's id and fixture lists from parsed pack.yaml data (FR-50, CS-7). */
function readCriterionFixtures(
  packYamlPath: string,
  packName: string,
  criterion: unknown,
): PackCriterionFixtures {
  if (typeof criterion !== "object" || criterion === null) {
    throw new Error(`${packYamlPath}: a criterion is not a mapping`);
  }
  if (!("id" in criterion) || typeof criterion.id !== "string") {
    throw new Error(`${packYamlPath}: a criterion has no id`);
  }
  const where = `${packYamlPath}: criterion ${criterion.id}`;
  if (!("fixtures" in criterion) || typeof criterion.fixtures !== "object") {
    throw new Error(`${where} has no fixtures field`);
  }
  const fixtures: unknown = criterion.fixtures;
  if (fixtures === null || typeof fixtures !== "object") {
    throw new Error(`${where} has no fixtures field`);
  }
  const positive = "positive" in fixtures ? fixtures.positive : undefined;
  const negative = "negative" in fixtures ? fixtures.negative : undefined;
  return {
    criterion: `${packName}/${criterion.id}`,
    id: criterion.id,
    positive: readFixturePaths(`${where} fixtures.positive`, positive),
    negative: readFixturePaths(`${where} fixtures.negative`, negative),
  };
}

/** Check a non-empty list of fixture paths that stay inside the pack directory (FR-49, FR-54). */
function readFixturePaths(where: string, value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${where} must list at least one fixture`);
  }
  const paths: string[] = [];
  for (const item of value) {
    if (typeof item !== "string" || item === "") {
      throw new Error(`${where} must hold fixture paths`);
    }
    if (isAbsolute(item) || normalize(item).startsWith("..")) {
      throw new Error(
        `${where}: ${item} must be a path inside the pack directory`,
      );
    }
    paths.push(item);
  }
  return paths;
}

/** List every distinct fixture image a pack names, sorted, so each image is asked once (EV-4). */
function listFixtureImages(pack: PackFixtures): string[] {
  const fixtures = new Set<string>();
  for (const criterion of pack.criteria) {
    for (const fixture of criterion.positive) {
      fixtures.add(fixture);
    }
    for (const fixture of criterion.negative) {
      fixtures.add(fixture);
    }
  }
  const sorted = [...fixtures];
  sorted.sort(compareText);
  return sorted;
}
/**
 * Run `crit report --json` on one fixture image with this pack directory and these extra flags,
 * and return the checked report. With --answers the key is removed from crit's environment, so
 * crit cannot reach TypeSafe. An exit code of 2, or any code but 0 and 1, stops the harness and
 * names the fixture (FR-24, FR-42, EV-2).
 */
async function runCritOnFixture(
  context: HarnessContext,
  pack: PackFixtures,
  fixture: string,
  packDirectory: string,
  answerFlags: readonly string[],
): Promise<ReportDocument> {
  const imagePath = join(pack.directory, fixture);
  const critArguments = [
    "report",
    imagePath,
    "--pack",
    packDirectory,
    "--json",
    ...answerFlags,
  ];
  // A copy of the environment; replay removes the key so crit cannot reach TypeSafe (FR-42).
  const environment = { ...process.env };
  if (answerFlags.includes("--answers")) {
    delete environment.TYPESAFE_API_KEY;
  }
  const run = await context.options.runCrit(
    critArguments,
    environment,
    context.options.harnessDirectory,
  );
  if (run.exitCode !== 0 && run.exitCode !== 1) {
    throw new Error(
      `${pack.name} fixture ${fixture}: crit exited ${String(run.exitCode)}: ${run.stderr.trim()}`,
    );
  }
  let document: unknown;
  try {
    document = JSON.parse(run.stdout);
  } catch {
    throw new Error(`${pack.name} fixture ${fixture}: crit did not write JSON`);
  }
  if (!context.validateReport(document)) {
    const errors = JSON.stringify(context.validateReport.errors);
    throw new Error(
      `${pack.name} fixture ${fixture}: the report does not match ${REPORT_SCHEMA_PATH}: ${errors}`,
    );
  }
  return document;
}

/** Add one report's usage to the totals; a null token count or cost makes that total null (FR-33). */
function addUsage(totals: UsageTotals, usage: ReportDocument["usage"]): void {
  totals.requests += usage.requests;
  totals.latency_ms += usage.latency_ms;
  if (totals.input_tokens === null || usage.input_tokens === null) {
    totals.input_tokens = null;
  } else {
    totals.input_tokens += usage.input_tokens;
  }
  if (totals.cost_usd === null || usage.cost_usd === null) {
    totals.cost_usd = null;
  } else {
    totals.cost_usd += usage.cost_usd;
  }
}

/**
 * Read labels/<pack>.csv for a pack and check it against the pack's criteria and fixtures, or
 * return null when the file does not exist. The harness never writes a label file (EV-5, CS-7).
 */
function readPackLabels(
  context: HarnessContext,
  pack: PackFixtures,
): FixtureLabel[] | null {
  const labelPath = join(context.options.labelsDirectory, `${pack.name}.csv`);
  if (!existsSync(labelPath)) {
    return null;
  }
  const criterionIds = new Set<string>();
  const fixtures = new Set<string>();
  for (const criterion of pack.criteria) {
    criterionIds.add(criterion.id);
    for (const fixture of criterion.positive) {
      fixtures.add(fixture);
    }
    for (const fixture of criterion.negative) {
      fixtures.add(fixture);
    }
  }
  const packCheck: LabelPackCheck = { criterionIds, fixtures };
  return readLabels(labelPath, readFileSync(labelPath, "utf8"), packCheck);
}

/**
 * Read every label file in labels/ for the coverage count. A file must be named after one of the
 * seven first-party domains. A pack measured in this run reuses the labels it already read and
 * checked against the pack, which labelsByPack holds by pack name (EV-5, FR-55).
 */
function readAllLabels(
  context: HarnessContext,
  labelsByPack: ReadonlyMap<string, readonly FixtureLabel[] | null>,
): Map<string, readonly FixtureLabel[]> {
  const labelsByDomain = new Map<string, readonly FixtureLabel[]>();
  if (!existsSync(context.options.labelsDirectory)) {
    return labelsByDomain;
  }
  const fileNames = readdirSync(context.options.labelsDirectory);
  fileNames.sort(compareText);
  for (const fileName of fileNames) {
    if (!fileName.endsWith(".csv")) {
      continue;
    }
    const domain = fileName.slice(0, -".csv".length);
    if (!FIRST_PARTY_DOMAINS.includes(domain)) {
      throw new Error(
        `${join(context.options.labelsDirectory, fileName)}: not named after one of the seven domains (${FIRST_PARTY_DOMAINS.join(", ")})`,
      );
    }
    if (labelsByPack.has(domain)) {
      labelsByDomain.set(domain, labelsByPack.get(domain) ?? []);
    } else {
      const labelPath = join(context.options.labelsDirectory, fileName);
      labelsByDomain.set(
        domain,
        readLabels(labelPath, readFileSync(labelPath, "utf8"), undefined),
      );
    }
  }
  return labelsByDomain;
}

/**
 * Format the header: the mode, the packs, the model id from the reports' top-level `model`, and
 * the summed requests, input tokens, cost in US dollars, and latency (FR-26, FR-33).
 */
function formatHeader(
  live: boolean,
  packResults: readonly PackResult[],
  model: string,
  usage: UsageTotals,
): string {
  const packNames = packResults.map((result) => result.pack.name);
  const inputTokens =
    usage.input_tokens === null ? "unknown" : String(usage.input_tokens);
  const cost =
    usage.cost_usd === null ? "unknown" : `$${usage.cost_usd.toFixed(5)}`;
  const lines = [
    "Agreement harness (EV-4, EV-5)",
    `Mode: ${live ? "live (asked TypeSafe, answers saved)" : "replay (saved answers, no network call)"}`,
    `Packs: ${packNames.join(", ")}`,
    `Model: ${model}`,
    `Usage: ${usage.requests} requests, ${inputTokens} input tokens, ${cost}, ${Math.round(usage.latency_ms)} ms`,
  ];
  return lines.join("\n");
}

/**
 * Format the EV-4 table for one pack: one row per criterion and fixture with the verdict and
 * whether it fired or stayed quiet, then a count of uncertain negatives, then every fixture that
 * disagreed (EV-4, FR-50).
 */
function formatFixtureTests(result: PackResult): string {
  const rows: string[][] = [];
  const disagreements: string[] = [];
  let uncertainNegatives = 0;
  for (const row of result.fixtureRows) {
    const agreesText = row.agrees ? "agrees" : "DISAGREES";
    rows.push([
      row.criterion,
      row.kind,
      row.fixture,
      row.verdict ?? "-",
      row.outcome,
      agreesText,
    ]);
    if (row.kind === "negative" && row.verdict === "uncertain") {
      uncertainNegatives += 1;
    }
    if (!row.agrees) {
      const reason =
        row.outcome === "not asked"
          ? "not asked"
          : `${row.kind} fixture ${row.outcome}`;
      disagreements.push(`  ${row.criterion} ${row.fixture}: ${reason}`);
    }
  }
  const lines = [
    `EV-4 fixture tests: ${result.pack.name}`,
    formatTable(
      ["criterion", "kind", "fixture", "verdict", "outcome", "result"],
      rows,
    ),
    `Negative fixtures with verdict uncertain (quiet, counted): ${uncertainNegatives}`,
  ];
  if (disagreements.length === 0) {
    lines.push("Every fixture agreed.");
  } else {
    lines.push(`Fixtures that disagreed: ${disagreements.length}`);
    for (const disagreement of disagreements) {
      lines.push(disagreement);
    }
  }
  return lines.join("\n");
}

/**
 * Format the EV-5 table for one pack: per criterion, the agreement with the count of scored
 * labels beside it, the uncertain, cannot tell, and not asked counts, and what the criterion may
 * ship with against AGREEMENT_FLOOR (EV-5, OQ-9, FR-27).
 */
function formatAgreement(context: HarnessContext, result: PackResult): string {
  const labelFile = join(
    context.options.labelsDirectory,
    `${result.pack.name}.csv`,
  );
  if (result.agreement === null) {
    return `EV-5 agreement: ${result.pack.name}\nNo label file at ${labelFile}, so EV-5 is not measured for this pack.`;
  }
  const rows: string[][] = [];
  for (const criterion of result.agreement) {
    let agreementText = "-";
    if (criterion.agreement !== null) {
      agreementText = `${criterion.agreement.toFixed(2)} (${criterion.agreed} of ${criterion.labelled})`;
    }
    let shipWith = "no labels scored";
    if (criterion.meets_floor === true) {
      shipWith = "may ship with fail";
    }
    if (criterion.meets_floor === false) {
      shipWith = "ship with warn as most severe";
    }
    rows.push([
      criterion.criterion,
      agreementText,
      String(criterion.labelled),
      String(criterion.uncertain),
      String(criterion.cannot_tell),
      String(criterion.not_asked),
      shipWith,
    ]);
  }
  const lines = [
    `EV-5 agreement: ${result.pack.name} (floor ${AGREEMENT_FLOOR}, OQ-9)`,
    formatTable(
      [
        "criterion",
        "agreement",
        "labelled",
        "uncertain",
        "cannot tell",
        "not asked",
        "ship with",
      ],
      rows,
    ),
  ];
  return lines.join("\n");
}

/**
 * Format the label coverage: the labelled designs per domain, the total against 100, and the
 * domains with designs against seven. Below either, it says "EV-5 minimum not met" (EV-5, M-2).
 */
function formatCoverage(coverage: Coverage): string {
  const rows: string[][] = [];
  for (const domain of coverage.domains) {
    rows.push([
      domain.domain,
      String(domain.designs),
      String(domain.cannot_tell),
    ]);
  }
  const lines = [
    "EV-5 label coverage",
    formatTable(["domain", "labelled designs", "cannot tell"], rows),
    `Total: ${coverage.total_designs} of ${EV5_MINIMUM_DESIGNS} designs, ${coverage.domains_with_designs} of ${FIRST_PARTY_DOMAINS.length} domains`,
  ];
  if (coverage.minimum_met) {
    lines.push("EV-5 minimum met.");
  } else {
    lines.push("EV-5 minimum not met");
  }
  return lines.join("\n");
}

/** Order two strings by code unit, so the pack, fixture, and label file order in the EV-4 and EV-5 output never depends on the locale (CS-18). */
function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

/** Format rows as a plain text table with columns padded to the widest cell, for the EV-4 and EV-5 tables. */
function formatTable(
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): string {
  const widths: number[] = [];
  for (const header of headers) {
    widths.push(header.length);
  }
  for (const row of rows) {
    for (let column = 0; column < row.length; column += 1) {
      const cellLength = (row[column] ?? "").length;
      if (cellLength > (widths[column] ?? 0)) {
        widths[column] = cellLength;
      }
    }
  }
  const lines: string[] = [];
  lines.push(formatTableRow(headers, widths));
  for (const row of rows) {
    lines.push(formatTableRow(row, widths));
  }
  return lines.join("\n");
}

/** Pad each cell of one row of an EV-4 or EV-5 table to its column width and join the cells with two spaces. */
function formatTableRow(
  cells: readonly string[],
  widths: readonly number[],
): string {
  const padded: string[] = [];
  for (let column = 0; column < cells.length; column += 1) {
    padded.push((cells[column] ?? "").padEnd(widths[column] ?? 0));
  }
  return padded.join("  ").trimEnd();
}

// Run only when node starts this file, not when a test imports it.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
