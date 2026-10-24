// The build stage: parsed packs, the prepared image, the context, and the facts in; one state,
// the questions, and the skipped criteria out (FR-12 to FR-17). Build reads no file, makes no
// network call, and changes none of its arguments (CS-6, AC-7).

import { CouldNotRunError } from "../shared/could-not-run-error.js";
import type { Criterion, Pack } from "../shared/pack.js";
import { boxQuestionIdFor, type Question } from "../shared/question.js";
import {
  type Context,
  IMAGE_STATE_PATH,
  type State,
  type StateImage,
} from "../shared/state.js";
import type { BuildInput, BuildResult, Skipped } from "./types.js";

/** The default per-question context limit in TypeSafe tokens (NFR-11, JC-4). */
const MAX_CONTEXT_TOKENS_PER_QUESTION = 32_000;

/**
 * How many characters build counts as one token when it estimates the context size (NFR-11).
 * Provisional: there is no tokenizer in the stack, and 3 is on the safe side for JSON text.
 */
const CHARACTERS_PER_TOKEN_ESTIMATE = 3;

/** One criterion that passed the platform and facts checks, with the key that names it in output (FR-14). */
type KeptCriterion = {
  readonly key: string;
  readonly criterion: Criterion;
};

/** The criteria to ask and the criteria to skip, both in pack order, then criterion order (FR-12, FR-13). */
type CriterionSelection = {
  readonly kept: KeptCriterion[];
  readonly skipped: Skipped[];
};

/**
 * Build the one state and the questions for one prepared image (FR-12 to FR-17, NFR-9 to NFR-11,
 * US-7, US-8). It skips criteria for platform or missing facts, makes one question per kept
 * criterion plus a Box question when `locate` is true, and throws CouldNotRunError when the context
 * for a question is over the limit. The steps are separate functions so that asking per slice
 * (FR-71) can call them once per image.
 */
export function buildQuestions(input: BuildInput): BuildResult {
  checkPackNamesUnique(input.packs);
  const selection = selectCriteria(input.packs, input.context, input.facts);
  const state = buildState(input.image, input.context, input.facts);
  const questions = buildQuestionsForCriteria(selection.kept);
  checkContextSize(state, questions);
  return { state, questions, skipped: selection.skipped };
}

/**
 * Throw CouldNotRunError when two packs have the same name, because their question ids would
 * clash and compose could not tell their answers apart (FR-14, CS-16). The loader reads one pack
 * at a time, so it cannot see this.
 */
function checkPackNamesUnique(packs: readonly Pack[]): void {
  const seenNames = new Set<string>();
  for (const pack of packs) {
    if (seenNames.has(pack.name)) {
      throw new CouldNotRunError(
        `two packs are named ${pack.name}; each pack needs its own name`,
      );
    }
    seenNames.add(pack.name);
  }
}

/**
 * Split every criterion of every pack into the ones to ask and the ones to skip (FR-12, FR-13).
 * The platform check runs before the facts check, so a criterion that fails both is skipped once,
 * with the platform reason. The PRD does not set this order.
 */
function selectCriteria(
  packs: readonly Pack[],
  context: Context,
  facts: unknown,
): CriterionSelection {
  const kept: KeptCriterion[] = [];
  const skipped: Skipped[] = [];
  for (const pack of packs) {
    for (const criterion of pack.criteria) {
      const key = `${pack.name}/${criterion.id}`;
      const platformReason = findPlatformExclusion(
        pack,
        criterion,
        context.platform,
      );
      if (platformReason !== undefined) {
        skipped.push({ criterion: key, reason: platformReason });
        continue;
      }
      const missingPath = findMissingFactsPath(pack.name, criterion, facts);
      if (missingPath !== undefined) {
        skipped.push({
          criterion: key,
          reason: `requires ${missingPath}, which the facts file does not have`,
        });
        continue;
      }
      kept.push({ key, criterion });
    }
  }
  return { kept, skipped };
}

/**
 * Return why the pack or the criterion `applies_to` excludes the platform, or undefined when it
 * does not (FR-12, US-8). No platform in the context excludes nothing, and an absent `applies_to`
 * means every platform.
 */
function findPlatformExclusion(
  pack: Pack,
  criterion: Criterion,
  platform: string | undefined,
): string | undefined {
  if (platform === undefined) {
    return undefined;
  }
  if (pack.applies_to !== undefined && !pack.applies_to.includes(platform)) {
    return `the pack applies_to does not include platform ${platform}`;
  }
  if (
    criterion.applies_to !== undefined &&
    !criterion.applies_to.includes(platform)
  ) {
    return `the criterion applies_to does not include platform ${platform}`;
  }
  return undefined;
}

/**
 * Return the first `requires` path, in the order listed, that the facts do not have, or undefined
 * when all are there (FR-13, US-7). A key whose value is null or empty counts as present. When no
 * facts file was given, every path is missing. A path that does not start with "facts." throws a
 * plain Error, because that is a broken invariant: the pack schema rejects such a path when the
 * pack loads (OQ-24 d), and every pack reaches build through the loader.
 */
function findMissingFactsPath(
  packName: string,
  criterion: Criterion,
  facts: unknown,
): string | undefined {
  if (criterion.requires === undefined) {
    return undefined;
  }
  for (const path of criterion.requires) {
    if (!path.startsWith("facts.")) {
      throw new Error(
        `pack ${packName}, criterion ${criterion.id}: the requires path ${path} does not start with facts.`,
      );
    }
    if (!hasFactsPath(facts, path)) {
      return path;
    }
  }
  return undefined;
}

/**
 * Return true when the facts hold the key at a path such as "facts.viewport.width" (FR-13). The
 * first segment "facts" names the facts file itself, so the walk starts below it. The caller has
 * already checked that the path starts with "facts.".
 */
function hasFactsPath(facts: unknown, path: string): boolean {
  if (facts === undefined) {
    return false;
  }
  const segments = path.split(".");
  let current: unknown = facts;
  for (const segment of segments.slice(1)) {
    if (typeof current !== "object" || current === null) {
      return false;
    }
    // Object.hasOwn checks the object's own keys only, so "facts.constructor" does not count as
    // present because every object inherits a constructor.
    if (!Object.hasOwn(current, segment)) {
      return false;
    }
    current = Reflect.get(current, segment);
  }
  return true;
}

/**
 * Build the state: the image once under IMAGE_STATE_PATH, the given context keys, and the facts
 * object unchanged, and nothing else (FR-15, FR-17, NFR-10, US-7). Only the four image fields are
 * copied, so prepare's other fields stay out. Absent context keys and absent facts are left out.
 */
function buildState(
  image: StateImage,
  context: Context,
  facts: unknown,
): State {
  const stateImage: StateImage = {
    format: image.format,
    bytes: image.bytes,
    width: image.width,
    height: image.height,
  };
  const state: {
    [IMAGE_STATE_PATH]: StateImage;
    context?: Context;
    facts?: unknown;
  } = {
    [IMAGE_STATE_PATH]: stateImage,
  };
  const stateContext = copyGivenContext(context);
  if (stateContext !== undefined) {
    state.context = stateContext;
  }
  if (facts !== undefined) {
    state.facts = facts;
  }
  return state;
}

/** Copy only the context keys that were given, or return undefined when none was (FR-2, FR-17). */
function copyGivenContext(context: Context): Context | undefined {
  const copied: { purpose?: string; audience?: string; platform?: string } = {};
  let anyGiven = false;
  if (context.purpose !== undefined) {
    copied.purpose = context.purpose;
    anyGiven = true;
  }
  if (context.audience !== undefined) {
    copied.audience = context.audience;
    anyGiven = true;
  }
  if (context.platform !== undefined) {
    copied.platform = context.platform;
    anyGiven = true;
  }
  if (!anyGiven) {
    return undefined;
  }
  return copied;
}

/**
 * Turn each kept criterion into its one question, followed by its Box question when `locate` is
 * true, in the order given (FR-14, FR-16). It throws a plain Error on a duplicate question id,
 * because that is a broken invariant: checkPackNamesUnique keeps pack names unique, the loader
 * keeps criterion ids unique within a pack, and the id pattern has no "#" to clash with a Box id.
 */
function buildQuestionsForCriteria(kept: readonly KeptCriterion[]): Question[] {
  const questions: Question[] = [];
  const seenIds = new Set<string>();
  for (const keptCriterion of kept) {
    const criterionQuestions: Question[] = [
      buildQuestionFromCriterion(keptCriterion),
    ];
    if (keptCriterion.criterion.locate === true) {
      criterionQuestions.push(buildBoxQuestion(keptCriterion));
    }
    for (const question of criterionQuestions) {
      if (seenIds.has(question.id)) {
        throw new Error(`duplicate question id ${question.id}`);
      }
      seenIds.add(question.id);
      questions.push(question);
    }
  }
  return questions;
}

/**
 * Make the one question for a criterion, of the type the pack declares, with the pack's text and
 * option order unchanged (FR-14, FR-21, NFR-9, JC-3). Its id is the criterion key.
 */
function buildQuestionFromCriterion(keptCriterion: KeptCriterion): Question {
  const key = keptCriterion.key;
  const packQuestion = keptCriterion.criterion.question;
  switch (packQuestion.type) {
    case "noul":
      return {
        id: key,
        criterion: key,
        type: "noul",
        instructions: packQuestion.instructions,
        criteria: {
          true: packQuestion.criteria.true,
          false: packQuestion.criteria.false,
        },
      };
    case "choice": {
      const options: { option: string; description: string }[] = [];
      for (const choice of packQuestion.criteria) {
        options.push({
          option: choice.option,
          description: choice.description,
        });
      }
      return {
        id: key,
        criterion: key,
        type: "choice",
        instructions: packQuestion.instructions,
        criteria: options,
      };
    }
    case "score":
      return {
        id: key,
        criterion: key,
        type: "score",
        instructions: packQuestion.instructions,
        levels: [...packQuestion.levels],
      };
    default: {
      // `never` is the type with no values. If every question type has a case above, the
      // compiler knows this line cannot run; a new type with no case makes this a compile error.
      const unhandled: never = packQuestion;
      throw new Error(`unknown question type: ${JSON.stringify(unhandled)}`);
    }
  }
}

/**
 * Make the Box question for a criterion that sets `locate: true`. It sends `locate_instructions`
 * and never falls back to `question.instructions` (FR-16, FR-21).
 */
function buildBoxQuestion(keptCriterion: KeptCriterion): Question {
  const locateInstructions = keptCriterion.criterion.locate_instructions;
  if (locateInstructions === undefined) {
    // The loader requires locate_instructions when locate is true, so this is a broken invariant.
    throw new Error(
      `${keptCriterion.key} sets locate: true but has no locate_instructions`,
    );
  }
  return {
    id: boxQuestionIdFor(keptCriterion.key),
    criterion: keptCriterion.key,
    type: "box",
    instructions: locateInstructions,
  };
}

/**
 * Throw CouldNotRunError when the context text for any question would pass the per-question limit
 * (NFR-11, JC-4, CS-16). The count is an estimate of the context, the facts, and the question's
 * own text. It leaves out the image, because its token cost is not known (NFR-4).
 */
function checkContextSize(state: State, questions: readonly Question[]): void {
  let sharedText = "";
  if (state.context !== undefined) {
    sharedText += JSON.stringify(state.context);
  }
  if (state.facts !== undefined) {
    sharedText += JSON.stringify(state.facts);
  }
  for (const question of questions) {
    const tokens = estimateTokens(sharedText + JSON.stringify(question));
    if (tokens > MAX_CONTEXT_TOKENS_PER_QUESTION) {
      let input = "the context";
      if (state.facts !== undefined) {
        input = "the facts file and the context";
      }
      throw new CouldNotRunError(
        `the estimated size of ${input} is about ${tokens} tokens for question ${question.id}, over the ${MAX_CONTEXT_TOKENS_PER_QUESTION}-token limit per question (NFR-11)`,
      );
    }
  }
}

/** Estimate the token count of a text from its length (NFR-11). This is an estimate, not a tokenizer count. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARACTERS_PER_TOKEN_ESTIMATE);
}
