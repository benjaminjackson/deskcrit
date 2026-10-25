// The scored questions whose text changed from British to US spelling and nothing else, and the
// criterion ids that changed the same way (PRD R-4, NFR-15, crit-q25.24). A spelling change is
// asked again on every fixture by a normal live run, but it does not use the criterion's one
// rewording, so the agreement harness leaves the old question out when it counts rewordings. A
// renamed id inherits the questions asked under its old id, and the answers saved under the old
// id are left out of the replay. spelling.test.ts checks every entry against a frozen copy of
// its US question, made from pack.yaml when it was respelled, and checks that the asked list holds
// the British question. It does no I/O.

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
export const RESPELLED_QUESTIONS: readonly RespelledQuestion[] = [
  {
    criterion: "basics/text-reads-faint",
    britishQuestionSha256:
      "aa7e0e517c8d1d078161b29fc927850dfe065605da3f74d5b62c4b5a7ec68e3a",
    usQuestionSha256:
      "6301cf08aa6a0e84bf20590003f16437e2e8848d13cad28b309c925eeb2ae327",
  },
  {
    criterion: "basics/centered-or-right-paragraphs",
    britishQuestionSha256:
      "a8705b88a639af28e4bb338cf93c9b04f09114ea1428ad8fc60fb4e3322c693d",
    usQuestionSha256:
      "23c658dd53e918e0c6607851bf44bbfa296a09bc90e7e2aaae907d3e1d202a25",
  },
  {
    criterion: "dataviz/rainbow-for-ordered-values",
    britishQuestionSha256:
      "3e2d7d56666f38aa332982a92991364cf60709ab7f0eeb6fb1e84fabb885ee3c",
    usQuestionSha256:
      "5dd253eb5fc5e2399a81e1adf127e8a798b65fe928bdbc6529d52ef4735ff7b3",
  },
  {
    criterion: "dataviz/color-without-meaning",
    britishQuestionSha256:
      "5d7334f6c0baa6144157607cbf0282a0ef13cf95ee3ef574eb94914901480e42",
    usQuestionSha256:
      "8f183b6b644bf6770bd9de96a948a00adcf80e3e9954fd673e1b35be03ca09e9",
  },
  {
    criterion: "layout/everything-centered",
    britishQuestionSha256:
      "93f00813dbca920369dbe6bbc3ce6071d792ed1de91855fb1e631e853e95fc2d",
    usQuestionSha256:
      "51b9ad979bf1d19652d6dbd687b8a28f9899ee2f8d562bb3607bc136d01eeafe",
  },
  {
    criterion: "typography/heading-indistinct",
    britishQuestionSha256:
      "f5a9219212822cdfacfe6e9fd0dd0a8138f2edd1febc2e789177b6a3c1093a2d",
    usQuestionSha256:
      "82abce7b2925384d9453e5555d8e8523a59793c3bb5d23ddf95b1ed64bda4bd1",
  },
  {
    criterion: "typography/headings-differ-only-in-size",
    britishQuestionSha256:
      "54913596b574e25e211a3926bb163f89f50efe1d382272cfe1e63583273034e2",
    usQuestionSha256:
      "8767fcd6a486f1b8c177c3faef6e29ba66af342bf2069f9c150e8f1dc8be57ef",
  },
];

/** The criterion ids that changed spelling only, old id to new id (R-4, crit-q25.24). */
export const RESPELLED_CRITERION_IDS: ReadonlyMap<string, string> = new Map<
  string,
  string
>([
  ["basics/centred-or-right-paragraphs", "basics/centered-or-right-paragraphs"],
  ["dataviz/colour-without-meaning", "dataviz/color-without-meaning"],
  ["layout/everything-centred", "layout/everything-centered"],
]);

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
 * rewording (R-4). A British hash is left out of the count only when its US question was asked or
 * is the current question, so a listed respelling that was never asked cannot hide a rewording.
 */
export function britishQuestionHashesFor(
  criterion: string,
  respelling: Respelling,
  askedHashes: ReadonlySet<string>,
  currentHash: string,
): Set<string> {
  const hashes = new Set<string>();
  for (const question of respelling.questions) {
    if (question.criterion !== criterion) {
      continue;
    }
    const usQuestionCounts =
      askedHashes.has(question.usQuestionSha256) ||
      question.usQuestionSha256 === currentHash;
    if (usQuestionCounts) {
      hashes.add(question.britishQuestionSha256);
    }
  }
  return hashes;
}
