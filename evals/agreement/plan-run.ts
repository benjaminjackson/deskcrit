// Which (fixture, criterion) pairs a live agreement run asks, and how the replay splits a fixture's
// saved answers files by criterion (EV-4 rule 5, crit-cy8.43, crit-q25.23). A pair is scored with
// a model when a saved answers file of that model for that fixture holds an answer to that
// criterion's current question, as the record file next to it says. A live run asks only the
// pairs that are not scored and writes them to a new file, so a saved file is never written
// again. A criterion whose question changed under the same id is reworded, and a live run asks it
// again about every fixture; a second rewording is refused (R-4). It does no I/O;
// run-agreement.ts reads and writes the files.

import { decideLiveRun } from "./frozen-set.ts";
import type { AskedQuestionHash } from "./question-hash.ts";
import {
  britishQuestionHashesFor,
  currentCriterionIdFor,
  NO_RESPELLING,
  type Respelling,
} from "./spelling.ts";

/** One criterion of a pack: its full id (`<pack>/<id>`) and its own fixture paths. */
export type PlanCriterion = {
  readonly criterion: string;
  readonly positive: readonly string[];
  readonly negative: readonly string[];
};

/** One saved answers file of a fixture: its file name and the question ids it answers. */
export type SavedAnswersFile = {
  readonly fileName: string;
  /** The image_sha256 the file records (FR-42, OQ-26 e). */
  readonly imageSha256: string;
  readonly questionIds: readonly string[];
};

/**
 * A saved answers file with its record file: for each criterion the file answers (`<pack>/<id>`),
 * the SHA-256 of the question it was asked (EV-4 rule 5, crit-q25.23).
 */
export type RecordedAnswersFile = SavedAnswersFile & {
  readonly questionSha256ByCriterion: ReadonlyMap<string, string>;
};

/** One fixture image of a pack: its path in the pack, the SHA-256 of its bytes, and its saved files. */
export type PlanFixture = {
  readonly fixture: string;
  readonly pngSha256: string;
  readonly savedFiles: readonly SavedAnswersFile[];
};

/** What the live run does with one fixture. */
export type LiveFixturePlan = {
  readonly fixture: string;
  /** The full criterion ids to ask about this fixture, in pack order. */
  readonly criteria: readonly string[];
  /** The file name the new answers go to, next to the fixture's other saved files. */
  readonly answersFileName: string;
  /** Saved files of this fixture to delete first; only --rerun-same-set fills this. */
  readonly fileNamesToDelete: readonly string[];
};

/** Everything the plan needs to know about one pack. */
export type LivePlanInput = {
  readonly packName: string;
  readonly criteria: readonly PlanCriterion[];
  readonly fixtures: readonly PlanFixture[];
  /** The sorted PNG hashes of the pack's rendered.json, or null when it has none. */
  readonly currentSetPngHashes: readonly string[] | null;
  /** The content of rendered.json.sha256, or null when there is none. */
  readonly storedSetHash: string | null;
  /** The scored PNG list, or null when there is none. */
  readonly scoredPngHashes: readonly string[] | null;
  /**
   * The criteria whose current question differs from every question asked for them before
   * (findRewordedCriteria). Their pairs are not scored, and asking them is allowed on a set whose
   * PNGs were all scored (EV-4 rule 5, R-4).
   */
  readonly rewordedCriteria: readonly string[];
  readonly rerunSameSet: boolean;
};

/** The suffix of the first answers file of a fixture, as the harness has always named it. */
const FIRST_ANSWERS_SUFFIX = ".answers.json";

/**
 * Return the criterion id a question id belongs to. A Box question's id is the criterion id with
 * `#box` added (src/shared/question.ts, boxQuestionIdFor), and every other question's id is the
 * criterion id itself.
 */
export function criterionForQuestionId(questionId: string): string {
  const boxSuffix = "#box";
  if (questionId.endsWith(boxSuffix)) {
    return questionId.slice(0, -boxSuffix.length);
  }
  return questionId;
}

/**
 * Return the file name of a fixture's first answers file, or of its nth one when n is 2 or more:
 * `<image>.answers.json`, then `<image>.answers-2.json`, `<image>.answers-3.json`, and so on.
 */
export function answersFileNameFor(imageFileName: string, n: number): string {
  if (n === 1) {
    return `${imageFileName}${FIRST_ANSWERS_SUFFIX}`;
  }
  return `${imageFileName}.answers-${String(n)}.json`;
}

/**
 * Return the number of a fixture's answers file from its name (1 for the first file, n for
 * `.answers-n.json`), or null when the name is not an answers file of that image.
 */
export function answersFileNumber(
  imageFileName: string,
  fileName: string,
): number | null {
  if (fileName === `${imageFileName}${FIRST_ANSWERS_SUFFIX}`) {
    return 1;
  }
  const prefix = `${imageFileName}.answers-`;
  const suffix = ".json";
  if (!fileName.startsWith(prefix) || !fileName.endsWith(suffix)) {
    return null;
  }
  const digits = fileName.slice(prefix.length, -suffix.length);
  if (!/^[1-9][0-9]*$/.test(digits)) {
    return null;
  }
  const n = Number(digits);
  if (n < 2) {
    return null;
  }
  return n;
}

/** Return the part of a fixture path after its last slash, the image file name. */
function imageFileNameOf(fixture: string): string {
  const slash = fixture.lastIndexOf("/");
  return fixture.slice(slash + 1);
}

/**
 * Plan a live run on one pack (EV-4 rule 5). Return the fixtures to ask, each with only the
 * criteria it has no saved answer for, or throw an Error that says why the run is refused before
 * any request is sent. With rerunSameSet, which is only for repeating a run that broke, every criterion is asked
 * about every fixture again and the fixture's saved files are replaced. The saved files must hold
 * only answers to current questions (keepCurrentAnswers), so a reworded criterion has no answer.
 */
export function planLiveRun(input: LivePlanInput): LiveFixturePlan[] {
  const allCriteria = input.criteria.map((criterion) => criterion.criterion);
  if (input.rerunSameSet) {
    // A rerun asks every pair again, so with a rewording it would rewrite the answers of criteria
    // already decided. A rewording is scored by a normal live run (EV-4 rule 5, R-4).
    if (input.rewordedCriteria.length > 0) {
      throw new Error(
        `${input.packName}: --rerun-same-set cannot score the reworded ${input.rewordedCriteria.join(", ")}, because it would ask the decided criteria again; a rewording is scored by a normal live run without --rerun-same-set (EV-4 rule 5)`,
      );
    }
    return planRerun(input.fixtures, allCriteria);
  }
  if (input.currentSetPngHashes !== null) {
    const decision = decideLiveRun(
      input.currentSetPngHashes,
      input.storedSetHash,
      input.scoredPngHashes,
    );
    // A run that asks only reworded criteria may score a set whose PNGs were all scored (R-4).
    const asksOnlyRewordedCriteria = isRewordingRun(input);
    if (decision === "refuse-same-set" && !asksOnlyRewordedCriteria) {
      throw new Error(
        `${input.packName}: a live run with this model already scored this fixture set (rendered.json.sha256)`,
      );
    }
    if (decision === "refuse-all-scored" && !asksOnlyRewordedCriteria) {
      throw new Error(
        `${input.packName}: live runs with this model already scored every fixture in this set (scored-png-sha256.txt)`,
      );
    }
  }
  const scoredPngs = new Set<string>(input.scoredPngHashes ?? []);
  const plans: LiveFixturePlan[] = [];
  for (const fixture of input.fixtures) {
    const answered = answeredCriteria(input.packName, fixture);
    const missing: string[] = [];
    for (const criterion of input.criteria) {
      if (answered.has(criterion.criterion)) {
        continue;
      }
      const isOwnFixture =
        criterion.positive.includes(fixture.fixture) ||
        criterion.negative.includes(fixture.fixture);
      const isReworded = input.rewordedCriteria.includes(criterion.criterion);
      if (isOwnFixture && scoredPngs.has(fixture.pngSha256) && !isReworded) {
        throw new Error(
          `${input.packName}: ${criterion.criterion} has never been scored on its own fixture ${fixture.fixture}, but that PNG is in the scored PNG list, so the criterion looks like a rewording on fixtures already scored`,
        );
      }
      missing.push(criterion.criterion);
    }
    if (missing.length === 0) {
      continue;
    }
    plans.push({
      fixture: fixture.fixture,
      criteria: missing,
      answersFileName: nextAnswersFileName(fixture),
      fileNamesToDelete: [],
    });
  }
  if (plans.length === 0) {
    throw new Error(
      `${input.packName}: every pair of a fixture and a criterion already has a saved answer with this model, so no pair is left to ask`,
    );
  }
  return plans;
}

/**
 * Say whether every pair the run would ask belongs to a reworded criterion, and there is at least
 * one such pair. Only then may the run ask about a set whose PNGs were all scored (R-4).
 */
function isRewordingRun(input: LivePlanInput): boolean {
  let anyPair = false;
  for (const fixture of input.fixtures) {
    const answered = answeredCriteria(input.packName, fixture);
    for (const criterion of input.criteria) {
      if (answered.has(criterion.criterion)) {
        continue;
      }
      if (!input.rewordedCriteria.includes(criterion.criterion)) {
        return false;
      }
      anyPair = true;
    }
  }
  return anyPair;
}

/**
 * Return the criteria of a pack that are reworded: the asked list holds a question for the
 * criterion and its current question is not one of them (EV-4 rule 5, R-4). Throw when the list
 * already holds two counted questions for a criterion and its current question is a third, because
 * R-4 allows one rewording per criterion id, and throw when saved answers exist but the list does
 * not, because then no one can tell which questions were asked. askedQuestionHashes is null when
 * the pack has no asked list. A question asked under an id that respelling renamed counts for the
 * new id, and a British question that respelling lists is not counted (R-4, crit-q25.24).
 */
export function findRewordedCriteria(
  packName: string,
  currentQuestionSha256ByCriterion: ReadonlyMap<string, string>,
  askedQuestionHashes: readonly AskedQuestionHash[] | null,
  hasSavedAnswers: boolean,
  respelling: Respelling = NO_RESPELLING,
): string[] {
  if (askedQuestionHashes === null) {
    if (hasSavedAnswers) {
      throw new Error(
        `${packName}: saved answers exist but asked-question-sha256.txt does not, so the questions they answer are unknown (EV-4 rule 5)`,
      );
    }
    return [];
  }
  const reworded: string[] = [];
  for (const [criterion, currentHash] of currentQuestionSha256ByCriterion) {
    const askedHashes = new Set<string>();
    for (const entry of askedQuestionHashes) {
      if (currentCriterionIdFor(entry.criterion, respelling) === criterion) {
        askedHashes.add(entry.questionSha256);
      }
    }
    if (askedHashes.size === 0 || askedHashes.has(currentHash)) {
      continue;
    }
    // A question that changed spelling only is not a rewording, so its British form is not counted.
    const britishHashes = britishQuestionHashesFor(criterion, respelling);
    const countedHashes = new Set<string>();
    for (const askedHash of askedHashes) {
      if (!britishHashes.has(askedHash)) {
        countedHashes.add(askedHash);
      }
    }
    if (countedHashes.size >= 2) {
      throw new Error(
        `${packName}: ${criterion} was already asked ${String(countedHashes.size)} different questions, and its current question is new. R-4 allows one rewording per criterion id, so no request was sent.`,
      );
    }
    reworded.push(criterion);
  }
  return reworded;
}

/**
 * Return a saved file with only the answers to each criterion's current question, and the question
 * ids it leaves out (EV-4 rule 5, crit-q25.23). An answer counts when the record file gives its
 * criterion the same question hash as the pack does now. An answer under an id that respelling
 * renamed is always left out, because it answers the old text (R-4, crit-q25.24). An answer to any
 * other criterion that is not in the pack is kept, so planReplay can name it.
 */
export function keepCurrentAnswers(
  savedFile: RecordedAnswersFile,
  currentQuestionSha256ByCriterion: ReadonlyMap<string, string>,
  respelling: Respelling = NO_RESPELLING,
): { savedFile: SavedAnswersFile; questionIdsToDrop: string[] } {
  const kept: string[] = [];
  const questionIdsToDrop: string[] = [];
  for (const questionId of savedFile.questionIds) {
    const criterion = criterionForQuestionId(questionId);
    const recordedHash = savedFile.questionSha256ByCriterion.get(criterion);
    if (recordedHash === undefined) {
      // run-agreement.ts checks that the record covers every criterion the file answers.
      throw new Error(
        `${savedFile.fileName}: the question record has no entry for ${criterion}`,
      );
    }
    if (respelling.criterionIds.has(criterion)) {
      questionIdsToDrop.push(questionId);
      continue;
    }
    const currentHash = currentQuestionSha256ByCriterion.get(criterion);
    if (currentHash === undefined || currentHash === recordedHash) {
      kept.push(questionId);
    } else {
      questionIdsToDrop.push(questionId);
    }
  }
  return {
    savedFile: {
      fileName: savedFile.fileName,
      imageSha256: savedFile.imageSha256,
      questionIds: kept,
    },
    questionIdsToDrop,
  };
}

/** Plan a --rerun-same-set run: every criterion about every fixture, replacing every saved file. */
function planRerun(
  fixtures: readonly PlanFixture[],
  allCriteria: readonly string[],
): LiveFixturePlan[] {
  const plans: LiveFixturePlan[] = [];
  for (const fixture of fixtures) {
    const imageFileName = imageFileNameOf(fixture.fixture);
    const firstFileName = answersFileNameFor(imageFileName, 1);
    const fileNamesToDelete: string[] = [];
    for (const savedFile of fixture.savedFiles) {
      // The first file is replaced by the write itself, so only the later files are deleted.
      if (savedFile.fileName !== firstFileName) {
        fileNamesToDelete.push(savedFile.fileName);
      }
    }
    plans.push({
      fixture: fixture.fixture,
      criteria: allCriteria,
      answersFileName: firstFileName,
      fileNamesToDelete,
    });
  }
  return plans;
}

/**
 * Return the criterion ids a fixture's saved files answer. Throw when a saved file records another
 * image, because the fixture changed after it was scored, which FR-54 does not allow.
 */
function answeredCriteria(packName: string, fixture: PlanFixture): Set<string> {
  const answered = new Set<string>();
  for (const savedFile of fixture.savedFiles) {
    if (savedFile.imageSha256 !== fixture.pngSha256) {
      throw new Error(
        `${packName}: the saved answers ${savedFile.fileName} belong to another image than ${fixture.fixture}`,
      );
    }
    for (const questionId of savedFile.questionIds) {
      answered.add(criterionForQuestionId(questionId));
    }
  }
  return answered;
}

/** Return the name of the fixture's next answers file: one more than the highest saved number. */
function nextAnswersFileName(fixture: PlanFixture): string {
  const imageFileName = imageFileNameOf(fixture.fixture);
  let highest = 0;
  for (const savedFile of fixture.savedFiles) {
    const n = answersFileNumber(imageFileName, savedFile.fileName);
    if (n !== null && n > highest) {
      highest = n;
    }
  }
  return answersFileNameFor(imageFileName, highest + 1);
}

/** How the replay scores one saved answers file of a fixture. */
export type ReplayFilePlan = {
  readonly fileName: string;
  /** The full criterion ids the file answers, in pack order. */
  readonly criteria: readonly string[];
  /** True when the file answers every criterion of the pack, so the pack itself replays it. */
  readonly coversWholePack: boolean;
};

/**
 * Plan the replay of one fixture (EV-4 rule 5, FR-42). Return each saved file with the criteria it
 * answers, or throw an Error when the fixture has no saved file, when a file answers a criterion
 * that is not in the pack, when two files answer the same criterion, or when a criterion of the
 * pack has no answer. A file that answers nothing, because keepCurrentAnswers left out all of its
 * answers to old questions, is skipped.
 */
export function planReplay(
  packName: string,
  packCriteria: readonly string[],
  fixture: string,
  savedFiles: readonly Pick<SavedAnswersFile, "fileName" | "questionIds">[],
): ReplayFilePlan[] {
  if (savedFiles.length === 0) {
    throw new Error(
      `${packName} fixture ${fixture}: no saved answers; record them with npm run test:live`,
    );
  }
  const fileByCriterion = new Map<string, string>();
  const plans: ReplayFilePlan[] = [];
  for (const savedFile of savedFiles) {
    const fileCriteria = new Set<string>();
    for (const questionId of savedFile.questionIds) {
      const criterion = criterionForQuestionId(questionId);
      if (!packCriteria.includes(criterion)) {
        throw new Error(
          `${packName} fixture ${fixture}: ${savedFile.fileName} answers ${questionId}, but ${criterion} is not in the pack. Removing a criterion means removing its answers from the saved answers files by hand, as commit 21984a3 did.`,
        );
      }
      fileCriteria.add(criterion);
    }
    if (fileCriteria.size === 0) {
      continue;
    }
    for (const criterion of fileCriteria) {
      const earlierFile = fileByCriterion.get(criterion);
      if (earlierFile !== undefined) {
        throw new Error(
          `${packName} fixture ${fixture}: ${earlierFile} and ${savedFile.fileName} both answer ${criterion}`,
        );
      }
      fileByCriterion.set(criterion, savedFile.fileName);
    }
    const criteriaInPackOrder = packCriteria.filter((criterion) =>
      fileCriteria.has(criterion),
    );
    plans.push({
      fileName: savedFile.fileName,
      criteria: criteriaInPackOrder,
      coversWholePack: criteriaInPackOrder.length === packCriteria.length,
    });
  }
  for (const criterion of packCriteria) {
    if (!fileByCriterion.has(criterion)) {
      throw new Error(
        `${packName} fixture ${fixture}: no saved answer for ${criterion} to its current question; record it with npm run test:live`,
      );
    }
  }
  return plans;
}
