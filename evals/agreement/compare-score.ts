// Pure scoring for the compare agreement script (EV-9, FR-36, FR-37, OQ-9). Values in, values out:
// no file, process, or network access. It compares the change values of `crit compare` with one
// human preference per pair, and never measures anything about an image (NG-2, NFR-9).

import type { Change, CriterionChange } from "../../src/index.ts";
import type { HumanPreference } from "./compare-labels.ts";
import { AGREEMENT_FLOOR } from "./score.ts";

/** How one pair came out: its scored changes agree with the preference, disagree, or are uncertain (EV-9). */
export type PairOutcome = "agree" | "disagree" | "uncertain";

/** One criterion that a pair was scored on, and the change compare gave it (FR-36, FR-37). */
export type ScoredChange = {
  readonly criterion: string;
  readonly change: Change;
};

/** The outcome of one pair and the changes it was scored on, in the order compare wrote them (EV-9). */
export type PairScore = {
  readonly outcome: PairOutcome;
  readonly scored: readonly ScoredChange[];
};

/** The counts of each outcome over every pair, and the agreement rate (EV-9, FR-37). */
export type AgreementSummary = {
  readonly agreed: number;
  readonly disagreed: number;
  readonly uncertain: number;
  readonly total: number;
  /** agreed / total, unrounded, so uncertain counts as not agreeing; null when no pair was scored. */
  readonly rate: number | null;
};

/**
 * Return the change a human preference expects of each scored criterion: after is better, before
 * is worse, and same is same (EV-9, FR-36).
 */
export function expectedChange(preference: HumanPreference): Change {
  switch (preference) {
    case "after":
      return "better";
    case "before":
      return "worse";
    case "same":
      return "same";
    default: {
      // `never` is the type with no values, so this line fails to compile if a preference is
      // added to HumanPreference and not handled above (CS-9).
      const unhandled: never = preference;
      throw new Error(`unknown preference ${String(unhandled)}`);
    }
  }
}

/**
 * Score one pair against its human preference. The scored criteria are the pair's targets, or
 * every criterion in `changes` when the pair has no target. A criterion in `skipped`, asked in only
 * one run, is never scored (FR-36). For a targeted pair, any definite change other than the
 * expected one makes the pair disagree; otherwise any uncertain change makes it uncertain (FR-37);
 * otherwise it agrees. A pair with no target is built so that no criterion in the packs covers its
 * one change. With a preference of same it is scored the same way, with same expected of every
 * change. With a preference of after or before, the person saw a difference the packs do not
 * cover, so the pair disagrees whatever the changes are. A target that is not in `changes`, or an
 * empty list of scored criteria, is a fault in the pair list or the packs, so it throws. Decided
 * 2026-10-24 by the orchestrator of crit-8cu.4 and recorded in the EV-9 note in docs/PRD.md.
 * Reconsider when: Benjamin Jackson finds that a pair should count as agreeing although a target
 * moved the wrong way, or that a pair with no target should allow a change in a criterion nobody
 * aimed at.
 */
export function scorePair(
  targets: readonly string[],
  changes: readonly CriterionChange[],
  skipped: readonly string[],
  preference: HumanPreference,
): PairScore {
  const scored: ScoredChange[] = [];
  if (targets.length === 0) {
    for (const change of changes) {
      scored.push({ criterion: change.criterion, change: change.change });
    }
  } else {
    for (const target of targets) {
      const change = changes.find((entry) => entry.criterion === target);
      if (change !== undefined) {
        scored.push({ criterion: target, change: change.change });
        continue;
      }
      if (skipped.includes(target)) {
        throw new Error(
          `target ${target} was asked in only one run, so the pair cannot be scored`,
        );
      }
      throw new Error(`target ${target} is not in the compare document`);
    }
  }
  if (scored.length === 0) {
    throw new Error(
      "the pair has no criterion to score, because the compare document has no change",
    );
  }
  if (targets.length === 0 && preference !== "same") {
    // The person saw a difference that no criterion in the packs covers, so no change can agree.
    return { outcome: "disagree", scored };
  }
  const expected = expectedChange(preference);
  let anyUncertain = false;
  for (const entry of scored) {
    if (entry.change === "uncertain") {
      anyUncertain = true;
    } else if (entry.change !== expected) {
      return { outcome: "disagree", scored };
    }
  }
  if (anyUncertain) {
    return { outcome: "uncertain", scored };
  }
  return { outcome: "agree", scored };
}

/**
 * Count each outcome and divide the agreed pairs by all pairs, so an uncertain pair counts as not
 * agreeing in the rate but is reported on its own (EV-9, FR-37).
 */
export function summarizeAgreement(
  outcomes: readonly PairOutcome[],
): AgreementSummary {
  let agreed = 0;
  let disagreed = 0;
  let uncertain = 0;
  for (const outcome of outcomes) {
    switch (outcome) {
      case "agree":
        agreed += 1;
        break;
      case "disagree":
        disagreed += 1;
        break;
      case "uncertain":
        uncertain += 1;
        break;
      default: {
        const unhandled: never = outcome;
        throw new Error(`unknown outcome ${String(unhandled)}`);
      }
    }
  }
  const total = outcomes.length;
  const rate = total === 0 ? null : agreed / total;
  return { agreed, disagreed, uncertain, total, rate };
}

/** Say whether the agreement rate is at or above AGREEMENT_FLOOR, the floor OQ-9 set (EV-9, OQ-9). */
export function meetsAgreementFloor(summary: AgreementSummary): boolean {
  if (summary.rate === null) {
    return false;
  }
  return summary.rate >= AGREEMENT_FLOOR;
}
