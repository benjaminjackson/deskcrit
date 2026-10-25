// The scored questions whose text changed from British to US spelling and nothing else, and the
// criterion ids that changed the same way (PRD R-4, NFR-15, crit-q25.24). A spelling change is
// asked again on every fixture by a normal live run, but it does not use the criterion's one
// rewording, so the agreement harness leaves the old question out when it counts rewordings. A
// renamed id inherits the questions asked under its old id, and the answers saved under the old
// id are left out of the replay. spelling.test.ts checks every entry against pack.yaml. It does
// no I/O.

/** One question that changed spelling only: the criterion (`<pack>/<id>`) and both hashes. */
export type RespelledQuestion = {
  /** The criterion id now, after any rename. */
  readonly criterion: string;
  /** The hash of the question in British spelling, as the asked list records it. */
  readonly britishQuestionSha256: string;
  /** The hash of the question in US spelling, as pack.yaml asks it now. */
  readonly usQuestionSha256: string;
};

/** The spelling changes the harness applies: the respelled questions and the renamed ids. */
export type Respelling = {
  readonly questions: readonly RespelledQuestion[];
  /** Each old criterion id (`<pack>/<id>`) mapped to its new id, both pack-qualified. */
  readonly criterionIds: ReadonlyMap<string, string>;
};

/** The questions that changed spelling only (R-4, crit-q25.24). */
export const RESPELLED_QUESTIONS: readonly RespelledQuestion[] = [];

/** The criterion ids that changed spelling only, old id to new id (R-4, crit-q25.24). */
export const RESPELLED_CRITERION_IDS: ReadonlyMap<string, string> = new Map<
  string,
  string
>();

/** The spelling changes the real harness applies. */
export const RESPELLING: Respelling = {
  questions: RESPELLED_QUESTIONS,
  criterionIds: RESPELLED_CRITERION_IDS,
};

/** No spelling change, for callers and tests that have none. */
export const NO_RESPELLING: Respelling = {
  questions: [],
  criterionIds: new Map<string, string>(),
};

/**
 * Return the criterion id a recorded id stands for now: its new id when a spelling change renamed
 * it, and the id itself otherwise (R-4).
 */
export function currentCriterionIdFor(
  recordedCriterion: string,
  respelling: Respelling,
): string {
  // `??` gives the right side when the left side is undefined, here when the id was not renamed.
  return respelling.criterionIds.get(recordedCriterion) ?? recordedCriterion;
}

/**
 * Return the British question hashes listed for a criterion, which do not count toward its one
 * rewording (R-4).
 */
export function britishQuestionHashesFor(
  criterion: string,
  respelling: Respelling,
): Set<string> {
  const hashes = new Set<string>();
  for (const question of respelling.questions) {
    if (question.criterion === criterion) {
      hashes.add(question.britishQuestionSha256);
    }
  }
  return hashes;
}
