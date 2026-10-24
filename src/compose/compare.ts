// Compare: it takes two finished reports, one for the before image and one for the after image,
// and says for each criterion whether the change made it better, worse, the same, or uncertain
// (FR-34 to FR-37, FR-39, section 8.2). It asks TypeSafe no new questions. It is pure: it reads no
// files and no clock, writes nothing, and does not change its inputs (CS-6). It reads each value
// with the verdict rule's own reader, so compare and report always agree about a finding's value
// (FR-25, FR-36).

import type { Answer } from "../shared/answer.js";
import { CouldNotRunError } from "../shared/could-not-run-error.js";
import type { Criterion, Pack, Predicate } from "../shared/pack.js";
import { type CriterionEntry, indexCriteriaByKey } from "./compose.js";
import type { Finding, Report, ReportSkipped, ReportUsage } from "./report.js";
import { readVerdictValue, type Verdict } from "./verdict.js";

/**
 * The version of the compare document shape. It changes only by adding optional fields (section
 * 8.2, AC-2, CS-15).
 */
export const COMPARE_SCHEMA_VERSION = "1.0.0";

/** The mode of the compare document (section 8.2, CS-15). */
export const COMPARE_MODE = "compare";

/**
 * The smallest move in the most probable level that counts as better or worse when the two score
 * verdicts are equal. It is one of the compare thresholds that CS-15 names (FR-36).
 */
export const SCORE_MIN_LEVEL_MOVE = 1;

/**
 * The smallest move in the probability of true that counts as better or worse when the two noul
 * verdicts are equal. It is one of the compare thresholds that CS-15 names (FR-36).
 */
export const NOUL_MIN_PROBABILITY_MOVE = 0.15;

/**
 * How far below NOUL_MIN_PROBABILITY_MOVE a move may fall and still count. A subtraction such as
 * 0.95 - 0.8 gives 0.1499999999999999 in floating-point numbers, and CS-18 forbids rounding, so
 * the comparison allows this small amount instead (FR-36, CS-15, CS-18).
 */
export const NOUL_MOVE_TOLERANCE = 1e-9;

/** What happened to one criterion between the two runs, with the wire names (FR-36, FR-37, CS-8). */
export type Change = "better" | "worse" | "same" | "uncertain";

/** Which way a score or noul value must move to be better (FR-36). */
export type BetterDirection = "lower" | "higher";

/**
 * One side of a change: the verdict, and the value the verdict rule reads. The value is the
 * probability of true for noul, the most probable level index for score, and the most probable
 * option for choice (FR-36, section 8.2).
 */
export type ChangeSide = {
  readonly verdict: Verdict;
  readonly value: number | string;
};

/** One criterion that both runs asked, and how it changed (FR-36, FR-37, section 8.2). */
export type CriterionChange = {
  readonly criterion: string;
  readonly change: Change;
  readonly before: ChangeSide;
  readonly after: ChangeSide;
  readonly model: string;
};

/** A criterion that only one run asked: the run that skipped it, and that run's reason (FR-36, section 8.2). */
export type CompareSkipped = {
  readonly criterion: string;
  readonly run: "before" | "after";
  readonly reason: string;
};

/** The count of each kind of change (FR-39, section 8.2). */
export type CompareSummary = {
  readonly improved: number;
  readonly regressed: number;
  readonly same: number;
  readonly uncertain: number;
};

/** One report without its own usage, as the compare document holds it (section 8.2). */
export type ReportWithoutUsage = Omit<Report, "usage">;

/** The whole compare document (section 8.2, US-3). */
export type CompareReport = {
  readonly schema_version: typeof COMPARE_SCHEMA_VERSION;
  readonly mode: typeof COMPARE_MODE;
  readonly tool: Report["tool"];
  readonly before: ReportWithoutUsage;
  readonly after: ReportWithoutUsage;
  readonly model: string;
  readonly changes: readonly CriterionChange[];
  readonly skipped: readonly CompareSkipped[];
  readonly summary: CompareSummary;
  readonly usage: ReportUsage;
};

/** What compare takes: the two finished reports and the packs both runs used (FR-35, FR-36). */
export type CompareInput = {
  readonly before: Report;
  readonly after: Report;
  readonly packs: readonly Pack[];
};

/**
 * Compares two finished reports and returns the compare document (FR-34 to FR-37, FR-39, section
 * 8.2). It throws CouldNotRunError when the two reports do not come from the same model, packs, and
 * context, or name a criterion that is in no pack (FR-35, CS-16).
 */
export function compare(input: CompareInput): CompareReport {
  assertSameRun(input.before, input.after);
  const criteriaByKey = indexCriteriaByKey(input.packs);

  const beforeFindings = indexFindingsByCriterion(input.before.findings);
  const afterFindings = indexFindingsByCriterion(input.after.findings);
  const beforeSkipped = indexSkippedByCriterion(input.before.skipped);
  const afterSkipped = indexSkippedByCriterion(input.after.skipped);

  const allCriteria = new Set<string>();
  for (const key of beforeFindings.keys()) {
    allCriteria.add(key);
  }
  for (const key of afterFindings.keys()) {
    allCriteria.add(key);
  }

  const changes: CriterionChange[] = [];
  const skipped: CompareSkipped[] = [];
  for (const criterionKey of allCriteria) {
    const beforeFinding = beforeFindings.get(criterionKey);
    const afterFinding = afterFindings.get(criterionKey);
    if (beforeFinding !== undefined && afterFinding !== undefined) {
      const entry = findCriterion(criteriaByKey, criterionKey);
      changes.push(
        compareFinding(entry.criterion, beforeFinding, afterFinding),
      );
      continue;
    }
    if (beforeFinding === undefined) {
      skipped.push(
        skippedByOneRun(criterionKey, "before", beforeSkipped, "after"),
      );
    } else {
      skipped.push(
        skippedByOneRun(criterionKey, "after", afterSkipped, "before"),
      );
    }
  }
  // A criterion that both runs skipped is in neither list: there is nothing to compare, and
  // neither run asked it (section 8.2).

  changes.sort(compareByCriterion);
  skipped.sort(compareByCriterion);

  return {
    schema_version: COMPARE_SCHEMA_VERSION,
    mode: COMPARE_MODE,
    tool: input.before.tool,
    before: withoutUsage(input.before),
    after: withoutUsage(input.after),
    model: input.before.model,
    changes,
    skipped,
    summary: summarizeChanges(changes),
    usage: sumUsage(input.before.usage, input.after.usage),
  };
}

/**
 * Checks that the two reports come from the same model, the same packs in the same order, and the
 * same context, because compare is only fair on two runs that differ only in the image (FR-35). A
 * mismatch is input the caller got wrong, so it throws CouldNotRunError naming the field (CS-16).
 */
function assertSameRun(before: Report, after: Report): void {
  if (before.model !== after.model) {
    throw new CouldNotRunError(
      `The two reports must use the same model, but the before report has model "${before.model}" and the after report has model "${after.model}".`,
    );
  }
  let packsMatch = before.packs.length === after.packs.length;
  for (let index = 0; packsMatch && index < before.packs.length; index++) {
    const beforePack = before.packs[index];
    const afterPack = after.packs[index];
    if (
      beforePack === undefined ||
      afterPack === undefined ||
      beforePack.name !== afterPack.name ||
      beforePack.version !== afterPack.version
    ) {
      packsMatch = false;
    }
  }
  if (!packsMatch) {
    throw new CouldNotRunError(
      `The two reports must use the same packs, but the before report has packs ${JSON.stringify(before.packs)} and the after report has packs ${JSON.stringify(after.packs)}.`,
    );
  }
  if (
    before.context.purpose !== after.context.purpose ||
    before.context.audience !== after.context.audience ||
    before.context.platform !== after.context.platform
  ) {
    throw new CouldNotRunError(
      `The two reports must use the same context, but the before report has context ${JSON.stringify(before.context)} and the after report has context ${JSON.stringify(after.context)}.`,
    );
  }
}

/** Maps each finding to its "<pack name>/<criterion id>" key (FR-36). */
function indexFindingsByCriterion(
  findings: readonly Finding[],
): Map<string, Finding> {
  const findingsByCriterion = new Map<string, Finding>();
  for (const finding of findings) {
    findingsByCriterion.set(finding.criterion, finding);
  }
  return findingsByCriterion;
}

/** Maps each skipped entry of one report to its criterion key (FR-36, section 8.2). */
function indexSkippedByCriterion(
  skipped: readonly ReportSkipped[],
): Map<string, ReportSkipped> {
  const skippedByCriterion = new Map<string, ReportSkipped>();
  for (const entry of skipped) {
    skippedByCriterion.set(entry.criterion, entry);
  }
  return skippedByCriterion;
}

/** Finds the criterion behind a finding. A finding for a criterion in no pack throws CouldNotRunError (FR-35, CS-16). */
function findCriterion(
  criteriaByKey: ReadonlyMap<string, CriterionEntry>,
  criterionKey: string,
): CriterionEntry {
  const entry = criteriaByKey.get(criterionKey);
  if (entry === undefined) {
    throw new CouldNotRunError(
      `The reports have a finding for criterion "${criterionKey}", which is in none of the packs given to compare.`,
    );
  }
  return entry;
}

/**
 * Builds the skipped entry for a criterion that only one run asked, with the reason from the run
 * that skipped it (FR-36, section 8.2). When that run neither asked nor skipped the criterion, the
 * two reports did not come from the same packs, so it throws CouldNotRunError (FR-35, CS-16).
 */
function skippedByOneRun(
  criterionKey: string,
  skippingRun: "before" | "after",
  skippingRunSkipped: ReadonlyMap<string, ReportSkipped>,
  askingRun: "before" | "after",
): CompareSkipped {
  const entry = skippingRunSkipped.get(criterionKey);
  if (entry === undefined) {
    throw new CouldNotRunError(
      `Criterion "${criterionKey}" has a finding in the ${askingRun} report but is neither a finding nor skipped in the ${skippingRun} report.`,
    );
  }
  return { criterion: criterionKey, run: skippingRun, reason: entry.reason };
}

/**
 * Decides the change for one criterion that both runs asked (FR-36, FR-37). It checks, in order:
 * an uncertain verdict on either side, then the verdict order fail, warn, pass, then the value move
 * for score and noul. A choice criterion with equal verdicts is always the same.
 */
function compareFinding(
  criterion: Criterion,
  before: Finding,
  after: Finding,
): CriterionChange {
  const beforeValue = readFindingValue(criterion, before);
  const afterValue = readFindingValue(criterion, after);
  return {
    criterion: before.criterion,
    change: decideChange(criterion, before, after, beforeValue, afterValue),
    before: { verdict: before.verdict, value: beforeValue },
    after: { verdict: after.verdict, value: afterValue },
    model: after.model,
  };
}

/** Applies the order of FR-37 first, then the verdict order, then the value move of FR-36. */
function decideChange(
  criterion: Criterion,
  before: Finding,
  after: Finding,
  beforeValue: number | string,
  afterValue: number | string,
): Change {
  if (before.verdict === "uncertain" || after.verdict === "uncertain") {
    return "uncertain";
  }

  const beforeRank = rankVerdict(before.verdict);
  const afterRank = rankVerdict(after.verdict);
  if (afterRank > beforeRank) {
    return "better";
  }
  if (afterRank < beforeRank) {
    return "worse";
  }

  const questionType = criterion.question.type;
  switch (questionType) {
    case "choice": {
      // Options have no order, so an equal verdict is always the same (FR-36, JC-3).
      return "same";
    }
    case "score": {
      return decideValueMove(
        criterion,
        readNumber(criterion, beforeValue),
        readNumber(criterion, afterValue),
        SCORE_MIN_LEVEL_MOVE,
        0,
      );
    }
    case "noul": {
      return decideValueMove(
        criterion,
        readNumber(criterion, beforeValue),
        readNumber(criterion, afterValue),
        NOUL_MIN_PROBABILITY_MOVE,
        NOUL_MOVE_TOLERANCE,
      );
    }
    default: {
      // `never` is the type with no values. If a new question type is added and not handled
      // above, this line stops compiling (CS-9).
      const unhandledType: never = questionType;
      throw new Error(`Unknown question type: ${String(unhandledType)}`);
    }
  }
}

/**
 * Decides better, worse, or same from a value move when the verdicts are equal (FR-36). A move of
 * at least `minimumMove` in the better direction is better, the same move the other way is worse,
 * and anything smaller is the same. `tolerance` absorbs floating-point error without rounding (CS-18).
 */
function decideValueMove(
  criterion: Criterion,
  beforeValue: number,
  afterValue: number,
  minimumMove: number,
  tolerance: number,
): Change {
  const direction = readBetterDirection(criterion);
  let improvement: number;
  if (direction === "lower") {
    improvement = beforeValue - afterValue;
  } else {
    improvement = afterValue - beforeValue;
  }
  if (improvement >= minimumMove - tolerance) {
    return "better";
  }
  if (-improvement >= minimumMove - tolerance) {
    return "worse";
  }
  return "same";
}

/** The place of each decided verdict in the order of FR-36: fail is lowest and pass is highest. */
function rankVerdict(verdict: Exclude<Verdict, "uncertain">): number {
  switch (verdict) {
    case "fail": {
      return 0;
    }
    case "warn": {
      return 1;
    }
    case "pass": {
      return 2;
    }
    default: {
      const unhandledVerdict: never = verdict;
      throw new Error(`Unknown verdict: ${String(unhandledVerdict)}`);
    }
  }
}

/**
 * Reads which way a score or noul value must move to be better (FR-36). It reads the first of
 * pass_when, fail_when, and warn_when that the criterion has. An *_at_most in pass_when, or an
 * *_at_least in fail_when or warn_when, means lower is better, and the opposite kinds mean higher
 * is better. The loader makes sure every criterion has one predicate, so a criterion with none,
 * or with an option predicate, throws a plain Error (CS-16).
 */
export function readBetterDirection(criterion: Criterion): BetterDirection {
  if (criterion.pass_when !== undefined) {
    return directionFromPredicate(criterion, criterion.pass_when, "pass");
  }
  if (criterion.fail_when !== undefined) {
    return directionFromPredicate(criterion, criterion.fail_when, "not_pass");
  }
  if (criterion.warn_when !== undefined) {
    return directionFromPredicate(criterion, criterion.warn_when, "not_pass");
  }
  throw new Error(
    `Criterion "${criterion.id}" has no pass_when, fail_when, or warn_when.`,
  );
}

/**
 * Turns one predicate into the better direction (FR-36). `role` says whether the predicate names
 * the passing values ("pass") or the failing or warning values ("not_pass").
 */
function directionFromPredicate(
  criterion: Criterion,
  predicate: Predicate,
  role: "pass" | "not_pass",
): BetterDirection {
  let lowerSide: boolean;
  // `"key" in predicate` tells TypeScript which of the one-key predicate shapes this is.
  if ("level_at_most" in predicate || "probability_at_most" in predicate) {
    lowerSide = true;
  } else if (
    "level_at_least" in predicate ||
    "probability_at_least" in predicate
  ) {
    lowerSide = false;
  } else {
    throw new Error(
      `Criterion "${criterion.id}" has an option predicate, which has no better direction.`,
    );
  }
  // A pass predicate on the lower side means lower is better. A fail or warn predicate on the
  // higher side also means lower is better.
  if (role === "pass") {
    if (lowerSide) {
      return "lower";
    }
    return "higher";
  }
  if (lowerSide) {
    return "higher";
  }
  return "lower";
}

/**
 * Reads the value the verdict rule reads from one finding, with the verdict rule's own reader, so
 * there is no second copy of the rule (FR-25, FR-36). The value is never rounded (CS-18).
 */
function readFindingValue(
  criterion: Criterion,
  finding: Finding,
): number | string {
  const value = readVerdictValue(
    criterion,
    answerFromFinding(criterion, finding),
  );
  switch (value.type) {
    case "noul": {
      return value.probabilityOfTrue;
    }
    case "score": {
      return value.levelIndex;
    }
    case "choice": {
      return value.option;
    }
    default: {
      const unhandledValue: never = value;
      throw new Error(`Unknown value: ${JSON.stringify(unhandledValue)}`);
    }
  }
}

/**
 * Builds the answer that a finding came from, so readVerdictValue can read it (FR-25, FR-36). A
 * finding that does not fit its criterion's question type means compose broke, so it throws a
 * plain Error (CS-16).
 */
function answerFromFinding(criterion: Criterion, finding: Finding): Answer {
  const questionType = criterion.question.type;
  switch (questionType) {
    case "noul": {
      const probabilityOfTrue = finding.distribution.true;
      const probabilityOfFalse = finding.distribution.false;
      if (probabilityOfTrue === undefined || probabilityOfFalse === undefined) {
        throw new Error(
          `The finding for noul criterion "${finding.criterion}" has no probability for true or false.`,
        );
      }
      return {
        type: "noul",
        question_id: finding.criterion,
        model: finding.model,
        distribution: { true: probabilityOfTrue, false: probabilityOfFalse },
        confidence: null,
      };
    }
    case "score":
    case "choice": {
      if (finding.confidence === null) {
        throw new Error(
          `The finding for ${questionType} criterion "${finding.criterion}" has no confidence.`,
        );
      }
      return {
        type: questionType,
        question_id: finding.criterion,
        model: finding.model,
        distribution: finding.distribution,
        confidence: finding.confidence,
      };
    }
    default: {
      const unhandledType: never = questionType;
      throw new Error(`Unknown question type: ${String(unhandledType)}`);
    }
  }
}

/** Narrows a score or noul value to a number. A string here means the reader broke, so it throws (FR-36). */
function readNumber(criterion: Criterion, value: number | string): number {
  if (typeof value !== "number") {
    throw new Error(
      `Criterion "${criterion.id}" has a ${criterion.question.type} value that is not a number.`,
    );
  }
  return value;
}

/**
 * Counts each kind of change (FR-39). better counts as improved and worse as regressed. It is a
 * plain loop (CS-12).
 */
export function summarizeChanges(
  changes: readonly CriterionChange[],
): CompareSummary {
  let improved = 0;
  let regressed = 0;
  let same = 0;
  let uncertain = 0;
  for (const entry of changes) {
    switch (entry.change) {
      case "better": {
        improved += 1;
        break;
      }
      case "worse": {
        regressed += 1;
        break;
      }
      case "same": {
        same += 1;
        break;
      }
      case "uncertain": {
        uncertain += 1;
        break;
      }
      default: {
        const unhandledChange: never = entry.change;
        throw new Error(`Unknown change: ${String(unhandledChange)}`);
      }
    }
  }
  return { improved, regressed, same, uncertain };
}

/**
 * Adds the usage of the two runs (FR-33, section 8.2). Requests and latency always add. Input
 * tokens and cost are null when either run does not know them, because a sum with an unknown part
 * is unknown.
 */
function sumUsage(before: ReportUsage, after: ReportUsage): ReportUsage {
  let inputTokens: number | null = null;
  if (before.input_tokens !== null && after.input_tokens !== null) {
    inputTokens = before.input_tokens + after.input_tokens;
  }
  let costUsd: number | null = null;
  if (before.cost_usd !== null && after.cost_usd !== null) {
    costUsd = before.cost_usd + after.cost_usd;
  }
  return {
    requests: before.requests + after.requests,
    input_tokens: inputTokens,
    cost_usd: costUsd,
    latency_ms: before.latency_ms + after.latency_ms,
  };
}

/** Returns a copy of one report's fields without its usage, for the before and after fields (section 8.2). */
function withoutUsage(report: Report): ReportWithoutUsage {
  return {
    schema_version: report.schema_version,
    mode: report.mode,
    tool: report.tool,
    image: report.image,
    context: report.context,
    packs: report.packs,
    model: report.model,
    findings: report.findings,
    skipped: report.skipped,
  };
}

/** Orders two entries by criterion key, by UTF-16 code unit, so the order is the same on every machine (section 8.2, CS-18). */
function compareByCriterion(
  first: { readonly criterion: string },
  second: { readonly criterion: string },
): number {
  if (first.criterion < second.criterion) {
    return -1;
  }
  if (first.criterion > second.criterion) {
    return 1;
  }
  return 0;
}
