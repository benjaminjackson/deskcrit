// The compose stage for crit report: it turns the packs, build's questions, prepare's record, and
// ask's answers into one report document (section 8.1, FR-26, FR-28, FR-33, FR-34). It is pure: it
// reads no files and no clock, and writes nothing (AC-7, CS-6). Its input types hold only the
// fields compose reads, so the real objects from the other stages fit them as they are, and no
// other stage's folder is imported (CS-5, CS-6).

import type { Answer, BoxAnswer, Region } from "../shared/answer.js";
import type { Criterion, Pack } from "../shared/pack.js";
import { boxQuestionIdFor, type Question } from "../shared/question.js";
import type { Context } from "../shared/state.js";
import type { Usage } from "../shared/usage.js";
import {
  mapRegionToOriginal,
  type OriginalSize,
  type PreparedFrame,
} from "./map-region-to-original.js";
import {
  type Finding,
  REPORT_MODE,
  REPORT_SCHEMA_VERSION,
  type Report,
  type ReportImage,
  type ReportPack,
  type ReportSkipped,
} from "./report.js";
import { sortFindings } from "./sort-findings.js";
import { decideVerdict } from "./verdict.js";

/** What compose takes. Each part holds only the fields compose reads (section 8.1, CS-6). */
export type ComposeInput = {
  /** The parsed packs, in the order given. */
  readonly packs: readonly Pack[];
  /** Build's questions and skipped criteria. A BuildResult fits here. */
  readonly built: {
    readonly questions: readonly Question[];
    readonly skipped: readonly ReportSkipped[];
  };
  /** Prepare's record of the image. A PreparedImage fits here. */
  readonly prepared: {
    readonly originalWidth: number;
    readonly originalHeight: number;
    readonly scaleFactor: number;
    readonly padded: boolean;
  };
  /** Ask's answers, one per question, and the adapter's usage object (FR-20). An AskResult fits here. */
  readonly asked: {
    readonly answers: readonly Answer[];
    readonly usage: Usage;
  };
  /** What the CLI supplies, because compose may not read package.json, argv, or the clock (CS-6, CS-18). */
  readonly run: {
    readonly tool: { readonly name: string; readonly version: string };
    readonly imagePath: string;
    readonly context: Context;
  };
};

/** One criterion with the pack it belongs to, found by its "<pack name>/<criterion id>" key (FR-26). */
type CriterionEntry = {
  readonly key: string;
  readonly criterion: Criterion;
};

/** The text answer types, which carry a distribution and decide the verdict (FR-21, FR-25). */
type TextAnswer = Exclude<Answer, BoxAnswer>;

/**
 * Builds the report document for one image: one finding per asked criterion, sorted by FR-28, with
 * the pack text copied as it is, the verdict from the verdict rule, regions in pixels of the
 * original image, and the run's usage and model id (section 8.1, FR-26, FR-28, FR-33, FR-34, US-1,
 * US-10, US-11). The same input always gives the same report (NFR-5).
 */
export function compose(input: ComposeInput): Report {
  const criteriaByKey = indexCriteriaByKey(input.packs);
  const answersByQuestionId = indexAnswersByQuestionId(input.asked.answers);
  const frame: PreparedFrame = {
    scaleFactor: input.prepared.scaleFactor,
  };
  const original: OriginalSize = {
    width: input.prepared.originalWidth,
    height: input.prepared.originalHeight,
  };

  const findings: Finding[] = [];
  for (const question of input.built.questions) {
    // A Box question only adds a region to its criterion's finding, so it makes no finding itself.
    if (question.type === "box") {
      continue;
    }
    const entry = criteriaByKey.get(question.criterion);
    if (entry === undefined) {
      throw new Error(
        `Question "${question.id}" names criterion "${question.criterion}", which is in no pack.`,
      );
    }
    const textAnswer = findTextAnswer(answersByQuestionId, question.id);
    const boxAnswer = findBoxAnswerIfNeeded(entry, answersByQuestionId);
    findings.push(buildFinding(entry, textAnswer, boxAnswer, frame, original));
  }

  const packs: ReportPack[] = [];
  for (const pack of input.packs) {
    packs.push({ name: pack.name, version: pack.version });
  }

  const skipped: ReportSkipped[] = [];
  for (const skippedCriterion of input.built.skipped) {
    skipped.push({
      criterion: skippedCriterion.criterion,
      reason: skippedCriterion.reason,
    });
  }

  const usage = input.asked.usage;
  return {
    schema_version: REPORT_SCHEMA_VERSION,
    mode: REPORT_MODE,
    tool: { name: input.run.tool.name, version: input.run.tool.version },
    image: buildReportImage(input),
    context: input.run.context,
    packs,
    model: usage.model,
    findings: sortFindings(findings),
    skipped,
    usage: {
      // A report covers one image, and ask sends one request per image (FR-19, FR-33).
      requests: 1,
      input_tokens: usage.input_tokens,
      cost_usd: usage.cost_usd,
      latency_ms: usage.latency_ms,
    },
  };
}

/**
 * Builds one finding from its criterion, its text answer, and its Box answer when the criterion
 * locates and did not pass (FR-26, FR-27, FR-34). The distribution and confidence pass through
 * unrounded (CS-18), and the text comes from the pack with nothing added (FR-34).
 */
function buildFinding(
  entry: CriterionEntry,
  textAnswer: TextAnswer,
  boxAnswer: BoxAnswer | undefined,
  frame: PreparedFrame,
  original: OriginalSize,
): Finding {
  const criterion = entry.criterion;
  const verdict = decideVerdict(criterion, textAnswer);

  let region: Region | null = null;
  if (boxAnswer !== undefined && verdict !== "pass") {
    region = mapRegionToOriginal(boxAnswer.region, frame, original);
  }

  let link: string | null = null;
  if (criterion.link !== undefined) {
    link = criterion.link;
  }

  return {
    criterion: entry.key,
    title: criterion.title,
    verdict,
    distribution: textAnswer.distribution,
    confidence: textAnswer.confidence,
    region,
    source: criterion.source,
    link,
    fix: criterion.fix,
    model: textAnswer.model,
  };
}

/** Builds the report's image: the path and the original size, with `padded: true` only when prepare padded (section 8.1, FR-8). */
function buildReportImage(input: ComposeInput): ReportImage {
  const path = input.run.imagePath;
  const width = input.prepared.originalWidth;
  const height = input.prepared.originalHeight;
  if (input.prepared.padded) {
    return { path, width, height, padded: true };
  }
  return { path, width, height };
}

/** Maps each "<pack name>/<criterion id>" key to its criterion, the same key build gives each question (FR-14, FR-26). */
function indexCriteriaByKey(
  packs: readonly Pack[],
): Map<string, CriterionEntry> {
  const criteriaByKey = new Map<string, CriterionEntry>();
  for (const pack of packs) {
    for (const criterion of pack.criteria) {
      const key = `${pack.name}/${criterion.id}`;
      criteriaByKey.set(key, { key, criterion });
    }
  }
  return criteriaByKey;
}

/** Maps each answer to the id of the question it answers (FR-20). */
function indexAnswersByQuestionId(
  answers: readonly Answer[],
): Map<string, Answer> {
  const answersByQuestionId = new Map<string, Answer>();
  for (const answer of answers) {
    answersByQuestionId.set(answer.question_id, answer);
  }
  return answersByQuestionId;
}

/**
 * Returns the text answer for a question. Ask already checks one answer per question, so a missing
 * or Box answer here is a broken invariant and throws a plain Error (CS-16).
 */
function findTextAnswer(
  answersByQuestionId: Map<string, Answer>,
  questionId: string,
): TextAnswer {
  const answer = answersByQuestionId.get(questionId);
  if (answer === undefined) {
    throw new Error(`No answer for question "${questionId}".`);
  }
  if (answer.type === "box") {
    throw new Error(`Question "${questionId}" got a box answer.`);
  }
  return answer;
}

/**
 * Returns the Box answer for a criterion that sets `locate: true`, or undefined when it does not
 * (FR-16, FR-26). A missing or wrong answer for a Box question build made throws a plain Error (CS-16).
 */
function findBoxAnswerIfNeeded(
  entry: CriterionEntry,
  answersByQuestionId: Map<string, Answer>,
): BoxAnswer | undefined {
  if (entry.criterion.locate !== true) {
    return undefined;
  }
  const boxQuestionId = boxQuestionIdFor(entry.key);
  const answer = answersByQuestionId.get(boxQuestionId);
  if (answer === undefined) {
    throw new Error(`No answer for box question "${boxQuestionId}".`);
  }
  if (answer.type !== "box") {
    throw new Error(
      `Box question "${boxQuestionId}" got a ${answer.type} answer.`,
    );
  }
  return answer;
}
