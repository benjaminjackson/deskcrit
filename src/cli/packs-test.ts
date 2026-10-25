// `crit packs test <dir>` (FR-50, FR-53, FR-60, US-6, EV-4). It runs the checks of `crit packs
// validate` first, then asks Jev about each fixture image through the same prepare, build, ask, and
// compose stages as `crit report`, and compares each verdict with the fixture's label. It decides
// no verdict itself: compose does (FR-25, FR-27, FR-65). It writes nothing; main.ts writes the
// returned text and sets the exit code (CS-17).

import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
// The JSON import is bundled by esbuild, so package.json is never read from disk at run time.
import packageJson from "../../package.json" with { type: "json" };
// The stage functions come from the package entry point, as in report-command.ts, so the command
// runs exactly what `crit report` and a library caller run (FR-63, FR-65).
import {
  ask,
  build,
  CouldNotRunError,
  compose,
  type Pack,
  type PreparedImage,
  prepare,
  type TypeSafeAdapter,
  type Verdict,
} from "../index.js";
import { validatePackText } from "../packs/validate-pack.js";
import {
  checkIsDirectory,
  describeProblem,
  listFilesInDirectory,
  PACK_FILE_NAME,
  readPackFile,
} from "./packs-validate-command.js";
import { readCritYaml } from "./read-inputs.js";

/** The tool name the report records (section 8.1). */
const TOOL_NAME = "deskcrit";

/** Which list of a criterion's fixtures an image is on (FR-50). */
export type FixtureLabel = "positive" | "negative";

/** One criterion that names one fixture image, and on which list (FR-50). */
export type FixtureEntry = {
  readonly criterionId: string;
  readonly label: FixtureLabel;
};

/** One fixture image, as its path is written in pack.yaml, and every criterion that names it (FR-50). */
export type FixtureImageJob = {
  readonly fixturePath: string;
  readonly entries: readonly FixtureEntry[];
};

/**
 * One fixture checked against one criterion. `verdict` is null when build skipped the criterion,
 * so it was not asked (FR-50, EV-4).
 */
export type FixtureResult = {
  readonly criterionId: string;
  readonly fixturePath: string;
  readonly label: FixtureLabel;
  readonly verdict: Verdict | null;
  readonly agreed: boolean;
};

/** What one packs test run gives main.ts: whether any fixture disagreed, and the text for stdout (FR-50). */
export type PacksTestOutput = {
  readonly anyDisagreement: boolean;
  readonly stdoutText: string;
};

/**
 * Makes the adapter for the model `.crit.yaml` pins, or for the default model when it pins none.
 * main.ts reads the key inside it, so the key is read only after every input is checked (FR-22, CS-21).
 */
export type MakeAdapter = (model: string | undefined) => TypeSafeAdapter;

/** What the requests of one run cost, summed over the fixture images. Cost is null when any request gave none (FR-33). */
export type PacksTestUsage = {
  readonly requests: number;
  readonly costUsd: number | null;
};

/** One fixture image after prepare, with the bytes already turned into the image TypeSafe takes. */
type PreparedFixture = {
  readonly job: FixtureImageJob;
  readonly prepared: PreparedImage;
};

/**
 * Decide whether a verdict agrees with a fixture's label. A positive fixture must fire: `fail` or
 * `warn`. A negative fixture must stay quiet: `pass` or `uncertain`, because `uncertain` means the
 * model did not raise the defect. So `uncertain` on a positive fixture is a disagreement (FR-50,
 * EV-4, "Quiet, but counted").
 */
export function fixtureAgrees(label: FixtureLabel, verdict: Verdict): boolean {
  const fired = verdictFired(verdict);
  switch (label) {
    case "positive":
      return fired;
    case "negative":
      return !fired;
    default: {
      // `never` is the type with no values: if a new label is added, this line fails to compile.
      const unhandled: never = label;
      throw new Error(`unknown fixture label ${String(unhandled)}`);
    }
  }
}

/** Return true when a verdict raises the defect: `fail` and `warn` fire, `pass` and `uncertain` do not (FR-50, EV-4). */
function verdictFired(verdict: Verdict): boolean {
  switch (verdict) {
    case "fail":
      return true;
    case "warn":
      return true;
    case "pass":
      return false;
    case "uncertain":
      return false;
    default: {
      const unhandled: never = verdict;
      throw new Error(`unknown verdict ${String(unhandled)}`);
    }
  }
}

/**
 * Group every (criterion, label, path) of the pack's fixtures lists by image path, so each image is
 * asked about once, with every criterion that names it (FR-15, FR-50). The jobs are sorted by path,
 * and each job's entries keep criterion order and then positive before negative (CS-18).
 */
export function listFixtureJobs(pack: Pack): FixtureImageJob[] {
  const entriesByPath = new Map<string, FixtureEntry[]>();
  for (const criterion of pack.criteria) {
    const labeledLists: { label: FixtureLabel; paths: readonly string[] }[] = [
      // `?.` reads the list only when `fixtures` is present, and `??` gives [] when it is not.
      { label: "positive", paths: criterion.fixtures?.positive ?? [] },
      { label: "negative", paths: criterion.fixtures?.negative ?? [] },
    ];
    for (const labeledList of labeledLists) {
      for (const fixturePath of labeledList.paths) {
        let entries = entriesByPath.get(fixturePath);
        if (entries === undefined) {
          entries = [];
          entriesByPath.set(fixturePath, entries);
        }
        entries.push({ criterionId: criterion.id, label: labeledList.label });
      }
    }
  }
  const jobs: FixtureImageJob[] = [];
  for (const [fixturePath, entries] of entriesByPath) {
    jobs.push({ fixturePath, entries });
  }
  jobs.sort((first, second) =>
    compareText(first.fixturePath, second.fixturePath),
  );
  return jobs;
}

/** Return a copy of the pack that holds only the criteria with these ids, in pack order (FR-14, FR-50). */
export function restrictPack(
  pack: Pack,
  criterionIds: ReadonlySet<string>,
): Pack {
  const criteria = pack.criteria.filter((criterion) =>
    criterionIds.has(criterion.id),
  );
  return { ...pack, criteria };
}

/**
 * Write the result text: one line per disagreeing fixture, then the counts, then one line per
 * negative fixture whose verdict was `uncertain`, which agrees but is shown so the doubt stays
 * visible, then what the requests cost. The results are sorted by criterion order in `pack`, then
 * label, then path (FR-33, FR-50, EV-4, CS-18).
 */
export function renderPacksTestReport(
  pack: Pack,
  results: readonly FixtureResult[],
  usage: PacksTestUsage,
): string {
  const sorted = sortResults(pack, results);
  const lines: string[] = [];
  let agreedCount = 0;
  let disagreedCount = 0;
  const uncertainNegatives: FixtureResult[] = [];
  for (const result of sorted) {
    if (result.agreed) {
      agreedCount += 1;
    } else {
      disagreedCount += 1;
      lines.push(
        `${describeFixture(result)}: ${describeVerdict(result.verdict)}`,
      );
    }
    if (result.label === "negative" && result.verdict === "uncertain") {
      uncertainNegatives.push(result);
    }
  }
  lines.push(
    `${pack.name}: ${agreedCount} agreed, ${disagreedCount} disagreed, ${uncertainNegatives.length} uncertain on a negative fixture (counted as agreed)`,
  );
  for (const result of uncertainNegatives) {
    lines.push(`uncertain on a negative fixture: ${describeFixture(result)}`);
  }
  let costText = "unknown";
  if (usage.costUsd !== null) {
    // toFixed(6) rounds to six decimal places, so float sums such as 0.00006904800000000001 read plainly.
    costText = `$${usage.costUsd.toFixed(6)}`;
  }
  lines.push(`usage: ${usage.requests} requests, cost ${costText}`);
  return `${lines.join("\n")}\n`;
}

/**
 * Run `crit packs test` on the pack in `directory`, resolved against the working directory. It
 * checks every input before it reads the key: the pack and its fixtures as `crit packs validate`
 * does, `.crit.yaml`, each fixture image through prepare, and which criteria build skips. Then it
 * asks one request per fixture image, with the pack cut to the criteria that name that image, and
 * compares each verdict with its label. Any problem throws CouldNotRunError, so no partial result is returned (FR-4, FR-22, FR-24,
 * FR-49, FR-50, FR-53, US-6, EV-4).
 */
export async function runPacksTest(
  directory: string,
  workingDirectory: string,
  makeAdapter: MakeAdapter,
): Promise<PacksTestOutput> {
  const packDirectory = resolve(workingDirectory, directory);
  const pack = await readValidPack(packDirectory, directory);
  const critYaml = await readCritYaml(workingDirectory);
  const preparedFixtures: PreparedFixture[] = [];
  for (const job of listFixtureJobs(pack)) {
    const imageBytes = await readFixtureImage(packDirectory, directory, job);
    const prepared = await prepareNamingFixture(imageBytes, directory, job);
    preparedFixtures.push({ job, prepared });
  }

  let skippedCriterionIds = new Set<string>();
  const firstFixture = preparedFixtures[0];
  if (firstFixture !== undefined) {
    skippedCriterionIds = findSkippedCriterionIds(pack, firstFixture.prepared);
  }

  const adapter = makeAdapter(critYaml.model);
  const results: FixtureResult[] = [];
  let requests = 0;
  let costUsd: number | null = 0;
  for (const preparedFixture of preparedFixtures) {
    const asked = await askAboutFixture(
      pack,
      preparedFixture,
      skippedCriterionIds,
      adapter,
    );
    for (const result of asked.results) {
      results.push(result);
    }
    requests += asked.usage.requests;
    if (costUsd !== null && asked.usage.costUsd !== null) {
      costUsd += asked.usage.costUsd;
    } else {
      costUsd = null;
    }
  }
  let anyDisagreement = false;
  for (const result of results) {
    if (!result.agreed) {
      anyDisagreement = true;
    }
  }
  return {
    anyDisagreement,
    stdoutText: renderPacksTestReport(pack, results, { requests, costUsd }),
  };
}

/**
 * Read the pack and run every check of `crit packs validate` on it. Any problem, from the YAML, the
 * schema, the rules, or a fixture list or path, throws CouldNotRunError that lists each problem,
 * because a pack that is not valid cannot be tested (FR-4, FR-49, FR-50).
 */
async function readValidPack(
  packDirectory: string,
  directory: string,
): Promise<Pack> {
  const packFileLabel = join(directory, PACK_FILE_NAME);
  await checkIsDirectory(packDirectory, directory);
  const packYamlText = await readPackFile(packDirectory, packFileLabel);
  const existingFiles = await listFilesInDirectory(packDirectory, directory);
  const validation = validatePackText(packYamlText, existingFiles);
  if (validation.phase === "ok") {
    return validation.pack;
  }
  const lines = [
    `${packFileLabel}: the pack is not valid, so it cannot be tested; run crit packs validate ${directory}`,
  ];
  for (const problem of validation.problems) {
    lines.push(`  ${describeProblem(problem)}`);
  }
  throw new CouldNotRunError(lines.join("\n"));
}

/**
 * Read one fixture image as bytes. Validate has already checked that the path stays inside the
 * pack directory and names a file, so a read error here names the criteria and the path (FR-4).
 */
async function readFixtureImage(
  packDirectory: string,
  directory: string,
  job: FixtureImageJob,
): Promise<Uint8Array> {
  try {
    const buffer = await readFile(join(packDirectory, job.fixturePath));
    return new Uint8Array(buffer);
  } catch {
    throw new CouldNotRunError(
      `${describeFixtureSource(directory, job)}: cannot read image`,
    );
  }
}

/** Run prepare on one fixture, and put the criteria and the path in front of its could-not-run message (FR-4, FR-73). */
async function prepareNamingFixture(
  imageBytes: Uint8Array,
  directory: string,
  job: FixtureImageJob,
): Promise<PreparedImage> {
  try {
    return await prepare(imageBytes);
  } catch (error) {
    if (error instanceof CouldNotRunError) {
      throw new CouldNotRunError(
        `${describeFixtureSource(directory, job)}: ${error.message}`,
      );
    }
    throw error;
  }
}

/**
 * Ask about one fixture image with the pack cut to the criteria that name it and that build does
 * not skip, and read each criterion's verdict from the report findings by its full id
 * `<pack>/<criterion>`. A skipped criterion has no finding, so its verdict is null and it
 * disagrees. When every criterion that names the image is skipped, no request is sent (FR-14,
 * FR-15, FR-25, FR-50, FR-65, FR-74). It also returns what the request cost (FR-33).
 */
async function askAboutFixture(
  pack: Pack,
  preparedFixture: PreparedFixture,
  skippedCriterionIds: ReadonlySet<string>,
  adapter: TypeSafeAdapter,
): Promise<{ results: FixtureResult[]; usage: PacksTestUsage }> {
  const job = preparedFixture.job;
  const criterionIds = new Set<string>();
  for (const entry of job.entries) {
    if (!skippedCriterionIds.has(entry.criterionId)) {
      criterionIds.add(entry.criterionId);
    }
  }
  const verdictByCriterion = new Map<string, Verdict>();
  let usage: PacksTestUsage = { requests: 0, costUsd: 0 };
  if (criterionIds.size > 0) {
    const packs = [restrictPack(pack, criterionIds)];
    const built = build({
      packs,
      image: preparedFixture.prepared,
      context: {},
      facts: undefined,
    });
    const asked = await ask(built.state, built.questions, adapter);
    const report = compose({
      packs,
      built,
      prepared: preparedFixture.prepared,
      asked,
      run: {
        tool: { name: TOOL_NAME, version: packageJson.version },
        imagePath: job.fixturePath,
        context: {},
      },
    });
    for (const finding of report.findings) {
      verdictByCriterion.set(finding.criterion, finding.verdict);
    }
    usage = {
      requests: report.usage.requests,
      costUsd: report.usage.cost_usd,
    };
  }
  const results: FixtureResult[] = [];
  for (const entry of job.entries) {
    const verdict =
      verdictByCriterion.get(`${pack.name}/${entry.criterionId}`) ?? null;
    let agreed = false;
    if (verdict !== null) {
      agreed = fixtureAgrees(entry.label, verdict);
    }
    results.push({
      criterionId: entry.criterionId,
      fixturePath: job.fixturePath,
      label: entry.label,
      verdict,
      agreed,
    });
  }
  return { results, usage };
}

/**
 * Ask build which criteria of the whole pack it skips, with the empty context and no facts that
 * every packs test run uses. Which criteria build skips depends only on the pack, the context, and
 * the facts, not on the image, so one call on any fixture answers for all of them. When build
 * skips every criterion it throws, because there is nothing to test (FR-12, FR-13, FR-50, FR-74).
 */
function findSkippedCriterionIds(
  pack: Pack,
  image: PreparedImage,
): Set<string> {
  const built = build({ packs: [pack], image, context: {}, facts: undefined });
  const skippedIds = new Set<string>();
  for (const skipped of built.skipped) {
    skippedIds.add(skipped.criterion.slice(pack.name.length + 1));
  }
  return skippedIds;
}

/** Sort results by the criterion's place in the pack, then positive before negative, then path (CS-18). */
function sortResults(
  pack: Pack,
  results: readonly FixtureResult[],
): FixtureResult[] {
  const criterionOrder = new Map<string, number>();
  for (const [index, criterion] of pack.criteria.entries()) {
    criterionOrder.set(criterion.id, index);
  }
  const sorted = [...results];
  sorted.sort((first, second) => {
    const firstOrder = criterionOrder.get(first.criterionId) ?? 0;
    const secondOrder = criterionOrder.get(second.criterionId) ?? 0;
    if (firstOrder !== secondOrder) {
      return firstOrder - secondOrder;
    }
    if (first.label !== second.label) {
      return first.label === "positive" ? -1 : 1;
    }
    return compareText(first.fixturePath, second.fixturePath);
  });
  return sorted;
}

/** Compare two strings by code unit, the same on every machine, unlike localeCompare (CS-18). */
function compareText(first: string, second: string): number {
  if (first < second) {
    return -1;
  }
  if (first > second) {
    return 1;
  }
  return 0;
}

/** Write one fixture as `<criterion> <label> <path>` (FR-50). */
function describeFixture(result: FixtureResult): string {
  return `${result.criterionId} ${result.label} ${result.fixturePath}`;
}

/** Write a verdict, or "not asked" when build skipped the criterion (FR-50, EV-4). */
function describeVerdict(verdict: Verdict | null): string {
  if (verdict === null) {
    return "not asked";
  }
  return verdict;
}

/** Name a fixture for an error: the criteria that list it and its path inside the pack directory (FR-4). */
function describeFixtureSource(
  directory: string,
  job: FixtureImageJob,
): string {
  const names: string[] = [];
  for (const entry of job.entries) {
    names.push(`criterion ${entry.criterionId} (${entry.label})`);
  }
  return `${join(directory, job.fixturePath)}, fixture of ${names.join(", ")}`;
}
