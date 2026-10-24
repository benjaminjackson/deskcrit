// Pure scoring for the agreement harness (EV-4, EV-5, FR-50, OQ-9). Values in, values out: no
// file, process, or network access. It compares verdicts with fixture kinds and human labels only,
// and never counts or measures anything about an image (NG-2, NFR-9).

import type { FixtureLabel } from "./labels.ts";

/**
 * The agreement floor per criterion in EV-5. Decided 2026-10-24 by Benjamin Jackson (OQ-9): a
 * criterion at or above it may ship with `fail`, and below it ships with `warn` as its most severe
 * verdict. There is no self-consistency floor (OQ-9, EV-6).
 */
export const AGREEMENT_FLOOR = 0.8;

/** The minimum number of labelled designs EV-5 needs across the first-party domains (EV-5, M-3). */
export const EV5_MINIMUM_DESIGNS = 100;

/** The seven first-party domains, one per pack (FR-55). EV-5 needs designs in each of them. */
export const FIRST_PARTY_DOMAINS: readonly string[] = [
  "typography",
  "layout",
  "color",
  "accessibility",
  "ux",
  "dataviz",
  "art-direction",
];

/** A finding's verdict, as the report schema names it (FR-25, FR-27). */
export type Verdict = "pass" | "warn" | "fail" | "uncertain";

/** Whether a fixture is listed as one the criterion must flag or one it must pass (FR-50). */
export type FixtureKind = "positive" | "negative";

/** One criterion of a pack, with its full id `pack/criterion` and its fixture paths (FR-50). */
export type PackCriterionFixtures = {
  readonly criterion: string;
  readonly positive: readonly string[];
  readonly negative: readonly string[];
};

/**
 * The verdicts one crit run gave for one fixture image, keyed by full criterion id. A criterion
 * that was skipped has no entry (FR-12, FR-13).
 */
export type FixtureVerdicts = ReadonlyMap<string, Verdict>;

/** The verdicts of every fixture image in a pack, keyed by fixture path relative to the pack. */
export type VerdictsByFixture = ReadonlyMap<string, FixtureVerdicts>;

/** What one EV-4 check of one fixture found. `not asked` means the report had no finding. */
export type FixtureOutcome = "fired" | "quiet" | "not asked";

/** One row of the EV-4 table: one criterion on one of its own fixtures (EV-4, FR-50). */
export type FixtureTestRow = {
  readonly criterion: string;
  readonly fixture: string;
  readonly kind: FixtureKind;
  readonly verdict: Verdict | null;
  readonly outcome: FixtureOutcome;
  readonly agrees: boolean;
};

/** The agreement of one criterion with the human labels on its pack's fixtures (EV-5). */
export type CriterionAgreement = {
  readonly criterion: string;
  /** Labels of yes or no that have a verdict, so they are scored. */
  readonly labelled: number;
  readonly agreed: number;
  /** agreed / labelled, unrounded, or null when nothing was scored (CS-18). */
  readonly agreement: number | null;
  /** Scored labels whose verdict was uncertain, on a defect or a clean fixture (FR-27). */
  readonly uncertain: number;
  /** Labels of "cannot tell", left out of the figure and counted (EV-5). */
  readonly cannot_tell: number;
  /** Labels whose criterion the run did not ask, left out and counted (FR-12, FR-13). */
  readonly not_asked: number;
  /** True at or above AGREEMENT_FLOOR, false below it, null when nothing was scored (OQ-9). */
  readonly meets_floor: boolean | null;
};

/** The labelled designs in one domain: fixtures with at least one yes or no label (EV-5). */
export type DomainCoverage = {
  readonly domain: string;
  readonly designs: number;
  readonly cannot_tell: number;
};

/** How far the labelled set reaches toward the EV-5 minimum of 100 designs in seven domains. */
export type Coverage = {
  readonly domains: readonly DomainCoverage[];
  readonly total_designs: number;
  readonly domains_with_designs: number;
  readonly minimum_met: boolean;
};

/**
 * Decide whether a verdict on a fixture fired or stayed quiet. `fail` and `warn` fire; `pass` and
 * `uncertain` are quiet, because uncertain means the model did not raise the defect (FR-50, EV-4).
 */
export function readFixtureOutcome(verdict: Verdict): FixtureOutcome {
  switch (verdict) {
    case "fail":
      return "fired";
    case "warn":
      return "fired";
    case "pass":
      return "quiet";
    case "uncertain":
      return "quiet";
    default: {
      // `never` is the type with no values: if a new verdict is added, this line fails to compile.
      const unhandled: never = verdict;
      throw new Error(`unknown verdict ${String(unhandled)}`);
    }
  }
}

/**
 * Decide whether a verdict agrees with what is expected of the fixture: a defect (positive fixture,
 * or a "yes" label) must fire, and a clean design (negative fixture, or a "no" label) must stay
 * quiet. Uncertain on a clean design agrees; uncertain on a defect does not (FR-50, EV-4, EV-5).
 */
export function verdictAgrees(
  defectPresent: boolean,
  verdict: Verdict,
): boolean {
  const outcome = readFixtureOutcome(verdict);
  if (defectPresent) {
    return outcome === "fired";
  }
  return outcome === "quiet";
}

/**
 * Build the EV-4 table: for each criterion, the verdict on each of its positive and negative
 * fixtures, whether it fired or stayed quiet, and whether that agrees with the fixture's kind. A
 * criterion that the run did not ask on a fixture is a disagreement with outcome "not asked"
 * (EV-4, FR-50).
 */
export function scoreFixtureTests(
  criteria: readonly PackCriterionFixtures[],
  verdictsByFixture: VerdictsByFixture,
): FixtureTestRow[] {
  const rows: FixtureTestRow[] = [];
  for (const criterion of criteria) {
    for (const fixture of criterion.positive) {
      rows.push(
        scoreOneFixture(
          criterion.criterion,
          fixture,
          "positive",
          verdictsByFixture,
        ),
      );
    }
    for (const fixture of criterion.negative) {
      rows.push(
        scoreOneFixture(
          criterion.criterion,
          fixture,
          "negative",
          verdictsByFixture,
        ),
      );
    }
  }
  return rows;
}

/** Score one criterion on one of its own fixtures for the EV-4 table (EV-4, FR-50). */
function scoreOneFixture(
  criterion: string,
  fixture: string,
  kind: FixtureKind,
  verdictsByFixture: VerdictsByFixture,
): FixtureTestRow {
  const verdict = verdictsByFixture.get(fixture)?.get(criterion);
  if (verdict === undefined) {
    return {
      criterion,
      fixture,
      kind,
      verdict: null,
      outcome: "not asked",
      agrees: false,
    };
  }
  const outcome = readFixtureOutcome(verdict);
  const agrees = verdictAgrees(kind === "positive", verdict);
  return { criterion, fixture, kind, verdict, outcome, agrees };
}

/**
 * Score EV-5 for one pack: per criterion, how many yes-or-no labels agree with the verdict. A
 * "cannot tell" label and a label whose criterion was not asked are left out and counted. Labels
 * hold the bare criterion id, so `packName` joins them to the report's `pack/criterion` ids. The
 * result lists every criterion in `criterionIds` order (EV-5, FR-50, FR-27, OQ-9).
 */
export function scoreAgreement(
  packName: string,
  criterionIds: readonly string[],
  labels: readonly FixtureLabel[],
  verdictsByFixture: VerdictsByFixture,
): CriterionAgreement[] {
  const results: CriterionAgreement[] = [];
  for (const criterionId of criterionIds) {
    const fullCriterion = `${packName}/${criterionId}`;
    let labelled = 0;
    let agreed = 0;
    let uncertain = 0;
    let cannotTell = 0;
    let notAsked = 0;
    for (const label of labels) {
      if (label.criterion !== criterionId) {
        continue;
      }
      if (label.defect_present === "cannot tell") {
        cannotTell += 1;
        continue;
      }
      const verdict = verdictsByFixture.get(label.fixture)?.get(fullCriterion);
      if (verdict === undefined) {
        notAsked += 1;
        continue;
      }
      labelled += 1;
      if (verdict === "uncertain") {
        uncertain += 1;
      }
      if (verdictAgrees(label.defect_present === "yes", verdict)) {
        agreed += 1;
      }
    }
    let agreement: number | null = null;
    let meetsFloor: boolean | null = null;
    if (labelled > 0) {
      agreement = agreed / labelled;
      meetsFloor = agreement >= AGREEMENT_FLOOR;
    }
    results.push({
      criterion: fullCriterion,
      labelled,
      agreed,
      agreement,
      uncertain,
      cannot_tell: cannotTell,
      not_asked: notAsked,
      meets_floor: meetsFloor,
    });
  }
  return results;
}

/**
 * Count the labelled designs per domain and check them against the EV-5 minimum: at least 100
 * designs in total, with designs in each of the seven first-party domains. A design counts when
 * it has at least one yes or no label (EV-5, M-2, M-3).
 */
export function measureCoverage(
  labelsByDomain: ReadonlyMap<string, readonly FixtureLabel[]>,
): Coverage {
  const domains: DomainCoverage[] = [];
  let totalDesigns = 0;
  let domainsWithDesigns = 0;
  for (const domain of FIRST_PARTY_DOMAINS) {
    const labels = labelsByDomain.get(domain) ?? [];
    const designs = new Set<string>();
    let cannotTell = 0;
    for (const label of labels) {
      if (label.defect_present === "cannot tell") {
        cannotTell += 1;
      } else {
        designs.add(label.fixture);
      }
    }
    domains.push({ domain, designs: designs.size, cannot_tell: cannotTell });
    totalDesigns += designs.size;
    if (designs.size > 0) {
      domainsWithDesigns += 1;
    }
  }
  const minimumMet =
    totalDesigns >= EV5_MINIMUM_DESIGNS &&
    domainsWithDesigns === FIRST_PARTY_DOMAINS.length;
  return {
    domains,
    total_designs: totalDesigns,
    domains_with_designs: domainsWithDesigns,
    minimum_met: minimumMet,
  };
}

/**
 * Return the one model id that every report and finding in a scoring run carries, and refuse a
 * run whose ids differ or that does not match the id pinned in `.crit.yaml` (FR-22, FR-26, NFR-6).
 */
export function findSingleModel(
  pinnedModel: string,
  modelIds: readonly string[],
): string {
  for (const modelId of modelIds) {
    if (modelId !== pinnedModel) {
      throw new Error(
        `the run carries model ${modelId}, but .crit.yaml pins ${pinnedModel}; one scoring run must use one model`,
      );
    }
  }
  return pinnedModel;
}
