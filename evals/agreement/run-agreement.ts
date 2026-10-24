// The agreement harness (EV-4, EV-5, FR-50, OQ-9). It runs the built `crit report --json` bundle
// as a child process on each fixture image of a pack, checks every report against
// schemas/report.schema.json, and prints the EV-4 fixture table, the EV-5 agreement table, and
// the label coverage. It imports no stage code (AC-6, CS-21).
//
// Live mode (`npm run test:live`) asks TypeSafe once per image and saves the raw answers with
// --save-answers into runs/<pack>/<model>/. Replay mode (`npm run eval:agreement`) scores those
// saved answers with --answers, needs no key, and makes no network call (FR-42).
//
// Usage: node evals/agreement/run-agreement.ts [--live] [--rerun-same-set] [--pack <dir>]...
// A live run refuses a fixture set whose PNGs were all already scored with the same model, unless
// a person passes --rerun-same-set. Only a person passes it, never an agent (EV-4 rule 5).
// Without --pack it measures every first-party pack under packs/. Exit 0 when every fixture agrees,
// 1 when any EV-4 fixture disagrees, and 2 when the harness could not run (FR-24).

import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, normalize, resolve } from "node:path";
import { parseArgs } from "node:util";
import { parseDocument } from "yaml";
import {
  compileReportValidator,
  readPinnedModel,
} from "../support/pinned-model-and-schema.ts";
import {
  decideLiveRun,
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

const HARNESS_DIRECTORY = import.meta.dirname;
const REPOSITORY_DIRECTORY = resolve(HARNESS_DIRECTORY, "..", "..");
const CRIT_BUNDLE_PATH = join(REPOSITORY_DIRECTORY, "dist", "crit.js");
const REPORT_SCHEMA_PATH = join(
  REPOSITORY_DIRECTORY,
  "schemas",
  "report.schema.json",
);
const LABELS_DIRECTORY = join(HARNESS_DIRECTORY, "labels");
const RUNS_DIRECTORY = join(HARNESS_DIRECTORY, "runs");
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

/** What one child process of crit gave back. */
type CritRun = {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number | null;
};

/** The summed usage of every crit run, null where any run had no token count (FR-23, FR-33). */
type UsageTotals = {
  requests: number;
  input_tokens: number | null;
  cost_usd: number | null;
  latency_ms: number;
};

/**
 * Run the harness and set the exit code: 2 when any step could not run, 1 when an EV-4 fixture
 * disagreed, and 0 otherwise. Output is written once at the end, so a stopped run prints no
 * partial scores (EV-4, EV-5, FR-24).
 */
function main(): void {
  try {
    const output = runHarness(process.argv.slice(2));
    process.stdout.write(output.text);
    process.exitCode = output.exitCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`agreement harness stopped: ${message}\n`);
    process.exitCode = EXIT_CODE_COULD_NOT_RUN;
  }
}

/**
 * Parse the flags, check the key in live mode, run crit on every fixture image of every pack,
 * score the reports, and return the text to print with its exit code (EV-4, EV-5, FR-42, CS-21).
 */
function runHarness(argv: readonly string[]): {
  text: string;
  exitCode: number;
} {
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
  if (live && !isApiKeyPresent()) {
    throw new Error(
      "TYPESAFE_API_KEY is not set. Live mode asks TypeSafe and needs the key; no request was sent. Use npm run eval:agreement to score saved answers with no key.",
    );
  }
  if (!existsSync(CRIT_BUNDLE_PATH)) {
    throw new Error(
      `${CRIT_BUNDLE_PATH} does not exist; run npm run build first`,
    );
  }
  const pinnedModel = readPinnedModel(HARNESS_DIRECTORY);
  const packDirectories = listPackDirectories(parsed.values.pack ?? []);
  const validateReport =
    compileReportValidator<ReportDocument>(REPORT_SCHEMA_PATH);
  if (live && !(parsed.values["rerun-same-set"] ?? false)) {
    for (const packDirectory of packDirectories) {
      refuseSecondRunOnSameSet(readPackFixtures(packDirectory), pinnedModel);
    }
  }

  const usageTotals: UsageTotals = {
    requests: 0,
    input_tokens: 0,
    cost_usd: 0,
    latency_ms: 0,
  };
  const modelIds: string[] = [];
  const packResults: PackResult[] = [];
  for (const packDirectory of packDirectories) {
    const pack = readPackFixtures(packDirectory);
    // Record the set before the first request, so a run that stops part way still counts as
    // scored and the next live run on the same fixtures is refused (EV-4 rule 5).
    if (live) {
      recordFrozenSet(pack, pinnedModel);
    }
    const verdictsByFixture = new Map<string, FixtureVerdicts>();
    for (const fixture of listFixtureImages(pack)) {
      const report = runCritOnFixture(
        pack,
        fixture,
        pinnedModel,
        live,
        validateReport,
      );
      modelIds.push(report.model);
      const verdicts = new Map<string, Verdict>();
      for (const finding of report.findings) {
        modelIds.push(finding.model);
        verdicts.set(finding.criterion, finding.verdict);
      }
      verdictsByFixture.set(fixture, verdicts);
      addUsage(usageTotals, report.usage);
    }
    const fixtureRows = scoreFixtureTests(pack.criteria, verdictsByFixture);
    const labels = readPackLabels(pack);
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
  const model = findSingleModel(pinnedModel, modelIds);
  const coverage = measureCoverage(readAllLabels(packResults));

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
    sections.push(formatAgreement(result));
  }
  sections.push(formatCoverage(coverage));
  const exitCode = anyDisagreed ? EXIT_CODE_DISAGREED : EXIT_CODE_AGREED;
  return { text: `${sections.join("\n\n")}\n`, exitCode };
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
function frozenSetHashPath(pack: PackFixtures, pinnedModel: string): string {
  return join(RUNS_DIRECTORY, pack.name, pinnedModel, "rendered.json.sha256");
}

/**
 * The path of the file that lists, one per line, the hash of every PNG that a live run with this
 * model has scored for this pack, across all runs.
 */
function scoredPngListPath(pack: PackFixtures, pinnedModel: string): string {
  return join(RUNS_DIRECTORY, pack.name, pinnedModel, "scored-png-sha256.txt");
}

/**
 * Throw before any request is sent when every fixture PNG of the pack was already scored with
 * this model, because EV-4 rule 5 says the first scored run decides and no criterion is run
 * again on the same fixtures. That covers this exact set, which the older single-hash file can
 * show, and a smaller set left after criteria were removed, which the scored PNG list shows. A
 * person who must run it again, for example after a run that stopped part way, passes
 * --rerun-same-set.
 */
function refuseSecondRunOnSameSet(
  pack: PackFixtures,
  pinnedModel: string,
): void {
  const currentPngHashes = readFixtureSetPngHashes(pack);
  if (currentPngHashes === null) {
    return;
  }
  const hashPath = frozenSetHashPath(pack, pinnedModel);
  let storedSetHash: string | null = null;
  if (existsSync(hashPath)) {
    storedSetHash = readFileSync(hashPath, "utf8").trim();
  }
  const listPath = scoredPngListPath(pack, pinnedModel);
  let scoredPngHashes: string[] | null = null;
  if (existsSync(listPath)) {
    scoredPngHashes = parseScoredPngHashes(readFileSync(listPath, "utf8"));
  }
  const decision = decideLiveRun(
    currentPngHashes,
    storedSetHash,
    scoredPngHashes,
  );
  if (decision === "refuse-same-set") {
    throw new Error(
      `${pack.name}: a live run with ${pinnedModel} already scored this fixture set (${hashPath}), and EV-4 rule 5 allows no second run on the same set; no request was sent. A person may pass --rerun-same-set to run it again.`,
    );
  }
  if (decision === "refuse-all-scored") {
    throw new Error(
      `${pack.name}: live runs with ${pinnedModel} already scored every fixture in this set (${listPath}), and EV-4 rule 5 allows no second run on the same fixtures; no request was sent. A person may pass --rerun-same-set to run it again.`,
    );
  }
}

/**
 * Record the fixture set a live run is about to score, next to its answers, before the first
 * request is sent (EV-4 rule 5): the SHA-256 of the set in rendered.json.sha256, so a later
 * reader can check which set the run used, and its PNG hashes added to the scored PNG list, so
 * the guard knows each scored fixture. A pack with no rendered.json, such as one made of captured
 * pages only, gets no files.
 */
function recordFrozenSet(pack: PackFixtures, pinnedModel: string): void {
  const currentPngHashes = readFixtureSetPngHashes(pack);
  if (currentPngHashes === null) {
    return;
  }
  const hash = hashPngHashes(currentPngHashes);
  const hashPath = frozenSetHashPath(pack, pinnedModel);
  mkdirSync(dirname(hashPath), { recursive: true });
  writeFileSync(hashPath, `${hash}\n`);
  const listPath = scoredPngListPath(pack, pinnedModel);
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
 * Run `crit report --json` on one fixture image of a pack and return the checked report. Live mode
 * saves the raw answers with --save-answers; replay mode reads them with --answers and runs crit
 * without the key. An exit code of 2, or any code but 0 and 1, stops the harness and names the
 * fixture (FR-24, FR-42, EV-2).
 */
function runCritOnFixture(
  pack: PackFixtures,
  fixture: string,
  pinnedModel: string,
  live: boolean,
  validateReport: ReturnType<typeof compileReportValidator<ReportDocument>>,
): ReportDocument {
  const imagePath = join(pack.directory, fixture);
  const answersPath = join(
    RUNS_DIRECTORY,
    pack.name,
    pinnedModel,
    `${fixture}.answers.json`,
  );
  const critArguments = [
    "report",
    imagePath,
    "--pack",
    pack.directory,
    "--json",
  ];
  // A copy of the environment; replay removes the key so crit cannot reach TypeSafe (FR-42).
  const environment = { ...process.env };
  if (live) {
    mkdirSync(dirname(answersPath), { recursive: true });
    critArguments.push("--save-answers", answersPath);
  } else {
    if (!existsSync(answersPath)) {
      throw new Error(
        `${pack.name} fixture ${fixture}: no saved answers at ${answersPath}; record them with npm run test:live`,
      );
    }
    critArguments.push("--answers", answersPath);
    delete environment.TYPESAFE_API_KEY;
  }
  const run = runCrit(critArguments, environment);
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
  if (!validateReport(document)) {
    const errors = JSON.stringify(validateReport.errors);
    throw new Error(
      `${pack.name} fixture ${fixture}: the report does not match ${REPORT_SCHEMA_PATH}: ${errors}`,
    );
  }
  return document;
}

/**
 * Run the built crit bundle as a child process with the harness folder as its working directory,
 * so crit reads evals/agreement/.crit.yaml. This is the only function that starts a process (AC-6).
 */
function runCrit(
  critArguments: readonly string[],
  environment: NodeJS.ProcessEnv,
): CritRun {
  const result = spawnSync(
    process.execPath,
    [CRIT_BUNDLE_PATH, ...critArguments],
    {
      cwd: HARNESS_DIRECTORY,
      env: environment,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  if (result.error !== undefined) {
    throw new Error(`crit could not start: ${result.error.message}`);
  }
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.status,
  };
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
function readPackLabels(pack: PackFixtures): FixtureLabel[] | null {
  const labelPath = join(LABELS_DIRECTORY, `${pack.name}.csv`);
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
 * checked against the pack (EV-5, FR-55).
 */
function readAllLabels(
  packResults: readonly PackResult[],
): Map<string, readonly FixtureLabel[]> {
  const labelsByDomain = new Map<string, readonly FixtureLabel[]>();
  if (!existsSync(LABELS_DIRECTORY)) {
    return labelsByDomain;
  }
  const fileNames = readdirSync(LABELS_DIRECTORY);
  fileNames.sort(compareText);
  for (const fileName of fileNames) {
    if (!fileName.endsWith(".csv")) {
      continue;
    }
    const domain = fileName.slice(0, -".csv".length);
    if (!FIRST_PARTY_DOMAINS.includes(domain)) {
      throw new Error(
        `${join(LABELS_DIRECTORY, fileName)}: not named after one of the seven domains (${FIRST_PARTY_DOMAINS.join(", ")})`,
      );
    }
    const measuredPack = packResults.find(
      (result) => result.pack.name === domain,
    );
    if (measuredPack !== undefined) {
      labelsByDomain.set(domain, measuredPack.labels ?? []);
    } else {
      const labelPath = join(LABELS_DIRECTORY, fileName);
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
function formatAgreement(result: PackResult): string {
  const labelFile = join(LABELS_DIRECTORY, `${result.pack.name}.csv`);
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

main();
