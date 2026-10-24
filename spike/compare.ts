/*
 * M-1 spike comparison (beads crit-oj5.3, PRD M-1, R-2, OQ-1, OQ-2). Disposable:
 * this script exists only for the spike and may be deleted after it.
 *
 * It joins Benjamin Jackson's answers in spike/human_answers.csv with Jev's
 * answers in the four results files under spike/results/, one for each image
 * (the full-size slice spike/slice.png and the whole page spike/screenshot.png)
 * and each purpose condition (with and without the purpose line). Benjamin
 * answered from the slice, so the slice rows are the main comparison. The
 * whole-page rows show how much is lost when the whole page is shrunk (OQ-1).
 *
 * Command, from the repository root:
 *
 *   npm --prefix spike ci
 *   node spike/compare.ts
 *
 * It writes four CSV files under spike/, and writes nothing if any check fails:
 *
 *   comparison.csv         one row per question and Jev condition (80 rows),
 *                          grouped by question so the four Jev answers sit
 *                          under the human answer
 *   agreement_summary.csv  agreement per condition, per domain and overall
 *   run_costs.csv          tokens, cost and latency of every kept request
 *   cost_summary.csv       the min, median and max figures from each results
 *                          file's summary, copied unchanged
 *
 * Rules (FR-25 spirit: every verdict is plain code, never a model):
 *   - Jev's answer in one run is the distribution key with the highest
 *     probability. For a score question that is the most probable level, not
 *     the SDK score field, which is an expected value. A tie on the top
 *     probability gives the answer "tie", which matches nothing.
 *   - Jev's answer across runs is the answer given in the most runs. A tie
 *     between runs goes to the higher mean probability, and else is "tie".
 *   - agree is yes when Benjamin's answer key equals Jev's answer key. It is
 *     empty when Benjamin wrote "cannot tell". Rows where the note starts with
 *     "CUT by the designer" are counted as cut, apart from other cannot-tell
 *     rows, and both are left out of the agreement rate.
 *   - Confidence is the mean reported confidence for choice and score
 *     questions, and the mean derived confidence for noul questions, which
 *     report none.
 *
 * With --overview (crit-zs9), it reads the two results files under
 * spike/results/overview/ instead, the slice alone and the slice with the
 * whole-page overview, both with the purpose line, and applies the same rules
 * to them. It then writes overview_comparison.csv,
 * overview_agreement_summary.csv, overview_run_costs.csv and
 * overview_cost_summary.csv, and leaves the four files above unchanged. The
 * `image` column holds the variant name.
 *
 * Exit codes: 0 when the files are written, 1 when a check fails.
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { COLUMN_NAMES, formatCsv, parseCsv } from "./answer-sheet/csv.ts";
import {
  EXPECTED_QUESTION_COUNT,
  parseQuestionFile,
  type SpikeQuestion,
} from "./request.ts";

/** The spike folder. `import.meta.dirname` is the folder of this file. */
const SPIKE_FOLDER = import.meta.dirname;

/** The repository root. Results files name images relative to it. */
const REPOSITORY_ROOT = join(SPIKE_FOLDER, "..");

/** The answer Benjamin gives when he cannot judge a question (crit-oj5.5). */
const CANNOT_TELL = "cannot tell";

/** The start of a note that marks a question cut by the designer (crit-oj5.3 notes, 2026-10-24). */
const CUT_NOTE_PREFIX = "CUT by the designer";

/** The answer that stands for a tie, which matches no human answer. */
const TIE = "tie";

/** The number of runs each results file must keep (OQ-2: at least three; crit-oj5.2 kept five). */
const EXPECTED_RUN_COUNT = 5;

/** The two images, mapped from the path a results file names. The slice comes first because Benjamin answered from it. */
const IMAGE_NAMES: Record<string, string> = {
  "spike/slice.png": "slice",
  "spike/screenshot.png": "whole_page",
};

/** True when the script compares the crit-zs9 overview runs instead of the four M-1 conditions. */
const OVERVIEW_MODE = process.argv.includes("--overview");

/** The four M-1 Jev conditions, in the order the CSV files list them. */
const M1_CONDITIONS: { image: string; purpose: string }[] = [
  { image: "slice", purpose: "with_purpose" },
  { image: "slice", purpose: "without_purpose" },
  { image: "whole_page", purpose: "with_purpose" },
  { image: "whole_page", purpose: "without_purpose" },
];

/** The two crit-zs9 variants. The `image` slot holds the variant name that each results file records. */
const OVERVIEW_CONDITIONS: { image: string; purpose: string }[] = [
  { image: "slice_alone", purpose: "with_purpose" },
  { image: "slice_with_overview", purpose: "with_purpose" },
];

/** The conditions this run of the script compares. */
let CONDITIONS = M1_CONDITIONS;
if (OVERVIEW_MODE) {
  CONDITIONS = OVERVIEW_CONDITIONS;
}

/** The folder under spike/ that holds the results files this run reads. */
let RESULTS_FOLDER_NAME = "results";
if (OVERVIEW_MODE) {
  RESULTS_FOLDER_NAME = join("results", "overview");
}

/** The prefix of every CSV file this run writes, so the overview files never replace the M-1 files. */
let OUTPUT_PREFIX = "";
if (OVERVIEW_MODE) {
  OUTPUT_PREFIX = "overview_";
}

/** The summary metrics that cost_summary.csv copies. */
const SUMMARY_METRICS = [
  "latency_ms",
  "request_input_tokens",
  "image_input_tokens_estimate",
  "cost_usd_per_request",
  "image_cost_usd_estimate",
];

/** One question from questions.yaml, with the domain and title that parseQuestionFile drops. */
type SheetQuestion = {
  question: SpikeQuestion;
  domain: string;
  title: string;
};

/** One row of Benjamin's sheet after the checks. `status` says whether it is judged, cut, or an ordinary cannot tell. */
type HumanAnswer = {
  answerText: string;
  answerKey: string;
  notes: string;
  status: "judged" | "cut" | "cannot_tell";
};

/** One question as a results file records it. */
type ResultQuestion = {
  id: string;
  type: string;
  model: string;
  distribution: Record<string, number>;
  confidence: number | null;
  derived_confidence: number | null;
};

/** One run in a results file. */
type ResultRun = {
  run: number;
  cold_start: boolean;
  started_at: string;
  model: string;
  model_matches_pinned: boolean;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  latency_ms: number;
  questions: ResultQuestion[];
};

/** The parts of a results file this script reads. */
type ResultsFile = {
  fileName: string;
  condition: string;
  image: { path: string; sha256: string; width: number; height: number };
  variant?: string;
  overview_image?: { path: string; sha256: string } | null;
  questions_file: { path: string; sha256: string };
  runs: ResultRun[];
  summary: Record<string, unknown>;
};

/** Jev's joined answer to one question in one condition. */
type JevAnswer = {
  answerKey: string;
  runAnswers: string[];
  meanDistribution: Record<string, number>;
  confidence: number | null;
  confidenceSource: string;
  models: string[];
};

/** One judged line of the comparison, kept for the summary. */
type ComparisonLine = {
  domain: string;
  type: string;
  status: HumanAnswer["status"];
  agree: string;
  isTie: boolean;
  runAgreementShare: number;
  runConsistencyShare: number;
  levelDistance: number | null;
};

/** Collects the reasons the script must refuse, so it can print all of them at once. */
const problems: string[] = [];

/** Records a reason to refuse. The script writes nothing when any is recorded. */
function addProblem(message: string): void {
  problems.push(message);
}

/** Returns the SHA-256 of a file as hex, to tie each results file to the image and questions it used (M-1). */
function hashFile(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/** Reads questions.yaml with the same checks as the runner (CS-4, CS-7), and keeps each question's domain and title for the sheet check. */
function readQuestions(): SheetQuestion[] {
  const text = readFileSync(join(SPIKE_FOLDER, "questions.yaml"), "utf8");
  const parsedYaml: unknown = parse(text, { schema: "core", uniqueKeys: true });
  const questions = parseQuestionFile(parsedYaml);
  const rawEntries = parsedYaml as { domain: string; title: string }[];
  const sheetQuestions: SheetQuestion[] = [];
  for (let index = 0; index < questions.length; index += 1) {
    const question = questions[index];
    const rawEntry = rawEntries[index];
    if (question === undefined || rawEntry === undefined) {
      throw new Error("questions.yaml changed while it was read");
    }
    sheetQuestions.push({
      question,
      domain: rawEntry.domain,
      title: rawEntry.title,
    });
  }
  return sheetQuestions;
}

/** Returns the distribution keys a question must have: true and false for noul, the option labels for choice, and level indices for score. */
function listExpectedKeys(question: SpikeQuestion): string[] {
  if (question.type === "noul") {
    return ["true", "false"];
  }
  if (question.type === "choice") {
    return Object.keys(question.options);
  }
  const levelKeys: string[] = [];
  for (let index = 0; index < question.levels.length; index += 1) {
    levelKeys.push(String(index));
  }
  return levelKeys;
}

/** Turns Benjamin's answer text into the key Jev's distribution uses (JC-3, JC-5). A score level text maps to its index, so sheet option 1 is index 0. Returns null when the text is not an option. */
function findAnswerKey(
  question: SpikeQuestion,
  answerText: string,
): string | null {
  if (question.type === "score") {
    const levelIndex = question.levels.indexOf(answerText);
    if (levelIndex === -1) {
      return null;
    }
    return String(levelIndex);
  }
  if (listExpectedKeys(question).includes(answerText)) {
    return answerText;
  }
  return null;
}

/** Reads and checks Benjamin's sheet against questions.yaml, and returns one answer per question in file order (M-1). */
function readHumanAnswers(sheetQuestions: SheetQuestion[]): HumanAnswer[] {
  const rows = parseCsv(
    readFileSync(join(SPIKE_FOLDER, "human_answers.csv"), "utf8"),
  );
  const header = rows[0];
  if (header === undefined || header.join(",") !== COLUMN_NAMES.join(",")) {
    addProblem(
      "human_answers.csv: the header is not the crit-oj5.5 column list",
    );
    return [];
  }
  const dataRows = rows.slice(1);
  if (dataRows.length !== sheetQuestions.length) {
    addProblem(
      `human_answers.csv: ${dataRows.length} rows, expected ${sheetQuestions.length}`,
    );
    return [];
  }
  const answers: HumanAnswer[] = [];
  for (let index = 0; index < dataRows.length; index += 1) {
    const row = dataRows[index] ?? [];
    const sheetQuestion = sheetQuestions[index];
    if (sheetQuestion === undefined) {
      continue;
    }
    // `?? ""` uses an empty string when the row is too short.
    const questionId = row[COLUMN_NAMES.indexOf("question_id")] ?? "";
    const domain = row[COLUMN_NAMES.indexOf("domain")] ?? "";
    const questionText = row[COLUMN_NAMES.indexOf("question_text")] ?? "";
    const answerText = row[COLUMN_NAMES.indexOf("human_answer")] ?? "";
    const notes = row[COLUMN_NAMES.indexOf("human_notes")] ?? "";
    const label = `human_answers.csv row ${index + 1} (${questionId})`;
    if (questionId !== sheetQuestion.question.id) {
      addProblem(`${label}: expected id ${sheetQuestion.question.id}`);
      continue;
    }
    if (
      domain !== sheetQuestion.domain ||
      questionText !== sheetQuestion.title
    ) {
      addProblem(
        `${label}: domain or question_text differs from questions.yaml`,
      );
      continue;
    }
    const isCut = notes.startsWith(CUT_NOTE_PREFIX);
    if (answerText === CANNOT_TELL) {
      let status: HumanAnswer["status"] = "cannot_tell";
      if (isCut) {
        status = "cut";
      }
      answers.push({ answerText, answerKey: "", notes, status });
      continue;
    }
    if (isCut) {
      addProblem(
        `${label}: the note says CUT but the answer is not "${CANNOT_TELL}"`,
      );
      continue;
    }
    const answerKey = findAnswerKey(sheetQuestion.question, answerText);
    if (answerKey === null) {
      addProblem(
        `${label}: "${answerText}" is not an option or "${CANNOT_TELL}"`,
      );
      continue;
    }
    answers.push({ answerText, answerKey, notes, status: "judged" });
  }
  return answers;
}

/** Reads every results file, checks its hashes, runs and question ids, and returns them keyed by "image/purpose" (M-1, OQ-1, OQ-2). */
function readResultsFiles(
  sheetQuestions: SheetQuestion[],
): Map<string, ResultsFile> {
  const resultsFolder = join(SPIKE_FOLDER, RESULTS_FOLDER_NAME);
  const questionsHash = hashFile(join(SPIKE_FOLDER, "questions.yaml"));
  const resultsByCondition = new Map<string, ResultsFile>();
  const fileNames = readdirSync(resultsFolder).filter((name) =>
    name.endsWith(".json"),
  );
  for (const fileName of fileNames.sort()) {
    const results = JSON.parse(
      readFileSync(join(resultsFolder, fileName), "utf8"),
    ) as ResultsFile;
    results.fileName = fileName;
    let imageName = IMAGE_NAMES[results.image.path];
    if (OVERVIEW_MODE) {
      imageName = results.variant;
    }
    if (imageName === undefined) {
      addProblem(`${fileName}: unknown image path ${results.image.path}`);
      continue;
    }
    const conditionKey = `${imageName}/${results.condition}`;
    if (resultsByCondition.has(conditionKey)) {
      addProblem(`${fileName}: a second results file for ${conditionKey}`);
      continue;
    }
    if (
      hashFile(join(REPOSITORY_ROOT, results.image.path)) !==
      results.image.sha256
    ) {
      addProblem(
        `${fileName}: image sha256 differs from ${results.image.path}`,
      );
    }
    const overviewImage = results.overview_image;
    if (
      overviewImage !== undefined &&
      overviewImage !== null &&
      hashFile(join(REPOSITORY_ROOT, overviewImage.path)) !==
        overviewImage.sha256
    ) {
      addProblem(
        `${fileName}: overview image sha256 differs from ${overviewImage.path}`,
      );
    }
    if (results.questions_file.sha256 !== questionsHash) {
      addProblem(
        `${fileName}: questions sha256 differs from spike/questions.yaml`,
      );
    }
    if (results.runs.length !== EXPECTED_RUN_COUNT) {
      addProblem(
        `${fileName}: ${results.runs.length} runs, expected ${EXPECTED_RUN_COUNT}`,
      );
    }
    for (const run of results.runs) {
      checkRun(fileName, run, sheetQuestions);
    }
    resultsByCondition.set(conditionKey, results);
  }
  for (const condition of CONDITIONS) {
    const conditionKey = `${condition.image}/${condition.purpose}`;
    if (!resultsByCondition.has(conditionKey)) {
      addProblem(
        `spike/${RESULTS_FOLDER_NAME}: no results file for ${conditionKey}`,
      );
    }
  }
  return resultsByCondition;
}

/** Checks that one run holds the twenty questions in order, each with the expected distribution keys. Warns, but does not refuse, when the model differs from the pinned one. */
function checkRun(
  fileName: string,
  run: ResultRun,
  sheetQuestions: SheetQuestion[],
): void {
  const label = `${fileName} run ${run.run}`;
  if (!run.model_matches_pinned) {
    console.warn(
      `warning: ${label} used model ${run.model}, not the pinned model`,
    );
  }
  if (run.questions.length !== EXPECTED_QUESTION_COUNT) {
    addProblem(
      `${label}: ${run.questions.length} questions, expected ${EXPECTED_QUESTION_COUNT}`,
    );
    return;
  }
  for (let index = 0; index < sheetQuestions.length; index += 1) {
    const expected = sheetQuestions[index]?.question;
    const recorded = run.questions[index];
    if (expected === undefined || recorded === undefined) {
      continue;
    }
    if (recorded.id !== expected.id || recorded.type !== expected.type) {
      addProblem(
        `${label}: question ${index + 1} is ${recorded.id}, expected ${expected.id}`,
      );
      continue;
    }
    const recordedKeys = Object.keys(recorded.distribution).sort().join(",");
    const expectedKeys = listExpectedKeys(expected).sort().join(",");
    if (recordedKeys !== expectedKeys) {
      addProblem(
        `${label} ${expected.id}: distribution keys ${recordedKeys}, expected ${expectedKeys}`,
      );
    }
  }
}

/** Returns the key with the highest probability, or "tie" when two keys share the top probability. */
function pickTopKey(probabilities: Record<string, number>): string {
  let topKey = TIE;
  let topProbability = -1;
  let isTied = false;
  for (const [key, probability] of Object.entries(probabilities)) {
    if (probability > topProbability) {
      topKey = key;
      topProbability = probability;
      isTied = false;
    } else if (probability === topProbability) {
      isTied = true;
    }
  }
  if (isTied) {
    return TIE;
  }
  return topKey;
}

/** Returns the mean of the numbers that are not null, or null when every value is null. */
function averageNumbers(values: (number | null)[]): number | null {
  let total = 0;
  let count = 0;
  for (const value of values) {
    if (value !== null) {
      total += value;
      count += 1;
    }
  }
  if (count === 0) {
    return null;
  }
  return total / count;
}

/** Joins Jev's five runs for one question into one answer: the most common run answer, with ties broken by mean probability (M-1, OQ-2). */
function joinJevRuns(
  results: ResultsFile,
  questionIndex: number,
  question: SpikeQuestion,
): JevAnswer {
  const runAnswers: string[] = [];
  const confidences: (number | null)[] = [];
  const models: string[] = [];
  const probabilityTotals: Record<string, number> = {};
  for (const run of results.runs) {
    const recorded = run.questions[questionIndex];
    if (recorded === undefined) {
      continue;
    }
    runAnswers.push(pickTopKey(recorded.distribution));
    if (question.type === "noul") {
      confidences.push(recorded.derived_confidence);
    } else {
      confidences.push(recorded.confidence);
    }
    if (!models.includes(recorded.model)) {
      models.push(recorded.model);
    }
    for (const [key, probability] of Object.entries(recorded.distribution)) {
      probabilityTotals[key] = (probabilityTotals[key] ?? 0) + probability;
    }
  }
  const meanDistribution: Record<string, number> = {};
  for (const key of listExpectedKeys(question)) {
    meanDistribution[key] = (probabilityTotals[key] ?? 0) / runAnswers.length;
  }
  const runCounts: Record<string, number> = {};
  for (const answer of runAnswers) {
    runCounts[answer] = (runCounts[answer] ?? 0) + 1;
  }
  const mostRuns = Math.max(...Object.values(runCounts));
  const leadingAnswers: string[] = [];
  for (const [answer, count] of Object.entries(runCounts)) {
    if (count === mostRuns && answer !== TIE) {
      leadingAnswers.push(answer);
    }
  }
  let answerKey = TIE;
  if (leadingAnswers.length === 1) {
    answerKey = leadingAnswers[0] ?? TIE;
  } else if (leadingAnswers.length > 1) {
    const leadingProbabilities: Record<string, number> = {};
    for (const answer of leadingAnswers) {
      leadingProbabilities[answer] = meanDistribution[answer] ?? 0;
    }
    answerKey = pickTopKey(leadingProbabilities);
  }
  let confidenceSource = "reported";
  if (question.type === "noul") {
    confidenceSource = "derived";
  }
  return {
    answerKey,
    runAnswers,
    meanDistribution,
    confidence: averageNumbers(confidences),
    confidenceSource,
    models,
  };
}

/** Counts how many entries of a list equal a value. */
function countMatches(values: string[], wanted: string): number {
  let count = 0;
  for (const value of values) {
    if (value === wanted) {
      count += 1;
    }
  }
  return count;
}

/** Formats a number with three decimals, or an empty string for null. */
function formatDecimal(value: number | null): string {
  if (value === null) {
    return "";
  }
  return value.toFixed(3);
}

/** Formats a raw value copied from a results file without rounding (M-1: figures copied unchanged). Null becomes an empty string. */
function formatRaw(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

/** Says how far apart two score levels are, so crit-oj5.4 can choose an agreement rule for OQ-9 later. */
function describeDistance(distance: number | null): string {
  if (distance === null) {
    return "";
  }
  if (distance === 0) {
    return "same";
  }
  if (distance === 1) {
    return "one_apart";
  }
  return "further";
}

/** Builds the comparison rows and the lines the summary counts, one per question and condition, grouped by question (M-1, FR-25). */
function buildComparison(
  sheetQuestions: SheetQuestion[],
  humanAnswers: HumanAnswer[],
  resultsByCondition: Map<string, ResultsFile>,
): { rows: string[][]; linesByCondition: Map<string, ComparisonLine[]> } {
  const rows: string[][] = [
    [
      "question_id",
      "domain",
      "type",
      "question_text",
      "human_answer",
      "human_key",
      "human_status",
      "human_notes",
      "image",
      "purpose",
      "jev_answer",
      "jev_distribution",
      "jev_confidence",
      "jev_confidence_source",
      "run_answers",
      "run_agreement",
      "run_consistency",
      "agree",
      "level_distance",
      "distance_band",
      "model_id",
    ],
  ];
  const linesByCondition = new Map<string, ComparisonLine[]>();
  for (let index = 0; index < sheetQuestions.length; index += 1) {
    const sheetQuestion = sheetQuestions[index];
    const human = humanAnswers[index];
    if (sheetQuestion === undefined || human === undefined) {
      continue;
    }
    const question = sheetQuestion.question;
    for (const condition of CONDITIONS) {
      const conditionKey = `${condition.image}/${condition.purpose}`;
      const results = resultsByCondition.get(conditionKey);
      if (results === undefined) {
        continue;
      }
      const jev = joinJevRuns(results, index, question);
      const runCount = jev.runAnswers.length;
      const consistentRuns = countMatches(jev.runAnswers, jev.answerKey);
      let agree = "";
      let agreeingRuns = 0;
      let levelDistance: number | null = null;
      if (human.status === "judged") {
        agreeingRuns = countMatches(jev.runAnswers, human.answerKey);
        agree = "no";
        if (human.answerKey === jev.answerKey) {
          agree = "yes";
        }
        if (question.type === "score" && jev.answerKey !== TIE) {
          levelDistance = Math.abs(
            Number(human.answerKey) - Number(jev.answerKey),
          );
        }
      }
      const distributionParts: string[] = [];
      for (const [key, probability] of Object.entries(jev.meanDistribution)) {
        distributionParts.push(`${key}=${probability.toFixed(3)}`);
      }
      let runAgreement = "";
      if (human.status === "judged") {
        runAgreement = `${agreeingRuns}/${runCount}`;
      }
      let levelDistanceText = "";
      if (levelDistance !== null) {
        levelDistanceText = String(levelDistance);
      }
      rows.push([
        question.id,
        sheetQuestion.domain,
        question.type,
        sheetQuestion.title,
        human.answerText,
        human.answerKey,
        human.status,
        human.notes,
        condition.image,
        condition.purpose,
        jev.answerKey,
        distributionParts.join(";"),
        formatDecimal(jev.confidence),
        jev.confidenceSource,
        jev.runAnswers.join("|"),
        runAgreement,
        `${consistentRuns}/${runCount}`,
        agree,
        levelDistanceText,
        describeDistance(levelDistance),
        jev.models.join("|"),
      ]);
      const lines = linesByCondition.get(conditionKey) ?? [];
      lines.push({
        domain: sheetQuestion.domain,
        type: question.type,
        status: human.status,
        agree,
        isTie: jev.answerKey === TIE,
        runAgreementShare: agreeingRuns / runCount,
        runConsistencyShare: consistentRuns / runCount,
        levelDistance,
      });
      linesByCondition.set(conditionKey, lines);
    }
  }
  return { rows, linesByCondition };
}

/** Builds one summary row from the comparison lines of one condition and domain. Every count after `excluded` covers judged questions only (M-1, R-2). */
function summarizeLines(lines: ComparisonLine[]): string[] {
  let cut = 0;
  let excluded = 0;
  const judgedLines: ComparisonLine[] = [];
  for (const line of lines) {
    if (line.status === "cut") {
      cut += 1;
    } else if (line.status === "cannot_tell") {
      excluded += 1;
    } else {
      judgedLines.push(line);
    }
  }
  let ties = 0;
  let agreeCount = 0;
  let runAgreementTotal = 0;
  let runConsistencyTotal = 0;
  let scoreQuestions = 0;
  let scoreSame = 0;
  let scoreOneApart = 0;
  let scoreFurther = 0;
  for (const line of judgedLines) {
    if (line.isTie) {
      ties += 1;
    }
    if (line.agree === "yes") {
      agreeCount += 1;
    }
    runAgreementTotal += line.runAgreementShare;
    runConsistencyTotal += line.runConsistencyShare;
    if (line.type === "score") {
      scoreQuestions += 1;
      const band = describeDistance(line.levelDistance);
      if (band === "same") {
        scoreSame += 1;
      } else if (band === "one_apart") {
        scoreOneApart += 1;
      } else if (band === "further") {
        scoreFurther += 1;
      }
    }
  }
  const judged = judgedLines.length;
  let agreeRate: number | null = null;
  let meanRunAgreement: number | null = null;
  let meanRunConsistency: number | null = null;
  if (judged > 0) {
    agreeRate = agreeCount / judged;
    meanRunAgreement = runAgreementTotal / judged;
    meanRunConsistency = runConsistencyTotal / judged;
  }
  return [
    String(lines.length),
    String(cut),
    String(excluded),
    String(judged),
    String(ties),
    String(agreeCount),
    formatDecimal(agreeRate),
    formatDecimal(meanRunAgreement),
    formatDecimal(meanRunConsistency),
    String(scoreQuestions),
    String(scoreSame),
    String(scoreOneApart),
    String(scoreFurther),
  ];
}

/** Builds agreement_summary.csv: for each condition, one row per domain in questions.yaml order, then an overall row (M-1, R-2, OQ-1, OQ-2). */
function buildAgreementSummary(
  sheetQuestions: SheetQuestion[],
  linesByCondition: Map<string, ComparisonLine[]>,
  resultsByCondition: Map<string, ResultsFile>,
): string[][] {
  const domains: string[] = [];
  for (const sheetQuestion of sheetQuestions) {
    if (!domains.includes(sheetQuestion.domain)) {
      domains.push(sheetQuestion.domain);
    }
  }
  const rows: string[][] = [
    [
      "image",
      "purpose",
      "domain",
      "questions",
      "cut",
      "excluded",
      "judged",
      "ties",
      "agree_count",
      "agree_rate",
      "mean_run_agreement",
      "mean_run_consistency",
      "score_questions",
      "score_same",
      "score_one_apart",
      "score_further",
      "image_path",
      "image_sha256",
      "image_long_edge_px",
      "questions_sha256",
    ],
  ];
  for (const condition of CONDITIONS) {
    const conditionKey = `${condition.image}/${condition.purpose}`;
    const lines = linesByCondition.get(conditionKey) ?? [];
    const results = resultsByCondition.get(conditionKey);
    if (results === undefined) {
      continue;
    }
    const fileColumns = [
      results.image.path,
      results.image.sha256,
      String(Math.max(results.image.width, results.image.height)),
      results.questions_file.sha256,
    ];
    for (const domain of domains) {
      const domainLines = lines.filter((line) => line.domain === domain);
      rows.push([
        condition.image,
        condition.purpose,
        domain,
        ...summarizeLines(domainLines),
        ...fileColumns,
      ]);
    }
    rows.push([
      condition.image,
      condition.purpose,
      "overall",
      ...summarizeLines(lines),
      ...fileColumns,
    ]);
  }
  return rows;
}

/** Recounts the agree column of comparison.csv and checks it against the summary, so a counting slip refuses instead of reaching crit-oj5.4. */
function recountAgreement(
  comparisonRows: string[][],
  summaryRows: string[][],
): void {
  const header = comparisonRows[0] ?? [];
  const summaryHeader = summaryRows[0] ?? [];
  const recounted: Record<string, number> = {};
  for (const row of comparisonRows.slice(1)) {
    if (row[header.indexOf("agree")] !== "yes") {
      continue;
    }
    const prefix = `${row[header.indexOf("image")]}/${row[header.indexOf("purpose")]}`;
    const domainKey = `${prefix}/${row[header.indexOf("domain")]}`;
    recounted[domainKey] = (recounted[domainKey] ?? 0) + 1;
    recounted[`${prefix}/overall`] = (recounted[`${prefix}/overall`] ?? 0) + 1;
  }
  for (const row of summaryRows.slice(1)) {
    const key = `${row[0]}/${row[1]}/${row[2]}`;
    const summaryCount = Number(row[summaryHeader.indexOf("agree_count")]);
    if ((recounted[key] ?? 0) !== summaryCount) {
      addProblem(
        `recount: ${key} has ${recounted[key] ?? 0} yes rows, summary says ${summaryCount}`,
      );
    }
  }
}

/** Builds run_costs.csv: every kept request, field for field, plus the one text-only baseline from the whole-page files. It copies only named fields, so no header or raw output gets in (CS-19, NFR-4). */
function buildRunCosts(
  resultsByCondition: Map<string, ResultsFile>,
): string[][] {
  const rows: string[][] = [
    [
      "image",
      "purpose",
      "run",
      "cold_start",
      "started_at",
      "model",
      "model_matches_pinned",
      "input_tokens",
      "output_tokens",
      "cost_usd",
      "latency_ms",
    ],
  ];
  for (const condition of CONDITIONS) {
    const results = resultsByCondition.get(
      `${condition.image}/${condition.purpose}`,
    );
    if (results === undefined) {
      continue;
    }
    for (const run of results.runs) {
      rows.push([
        condition.image,
        condition.purpose,
        formatRaw(run.run),
        formatRaw(run.cold_start),
        formatRaw(run.started_at),
        formatRaw(run.model),
        formatRaw(run.model_matches_pinned),
        formatRaw(run.input_tokens),
        formatRaw(run.output_tokens),
        formatRaw(run.cost_usd),
        formatRaw(run.latency_ms),
      ]);
    }
  }
  if (OVERVIEW_MODE) {
    // The overview runs sent no text-only baseline.
    return rows;
  }
  const baselines: Record<string, unknown>[] = [];
  for (const purpose of ["with_purpose", "without_purpose"]) {
    const results = resultsByCondition.get(`whole_page/${purpose}`);
    const baseline = results?.summary.baseline_text_only as
      | Record<string, unknown>
      | undefined;
    if (baseline === undefined || baseline.input_tokens === undefined) {
      addProblem(`whole_page/${purpose}: no text-only baseline in the summary`);
      continue;
    }
    baselines.push(baseline);
  }
  const firstBaseline = baselines[0];
  if (firstBaseline === undefined) {
    return rows;
  }
  for (const baseline of baselines) {
    if (JSON.stringify(baseline) !== JSON.stringify(firstBaseline)) {
      addProblem(
        "whole_page: the two results files hold different text-only baselines",
      );
    }
  }
  rows.push([
    "none",
    "none",
    "baseline_text_only",
    "",
    "",
    formatRaw(firstBaseline.model),
    "",
    formatRaw(firstBaseline.input_tokens),
    formatRaw(firstBaseline.output_tokens),
    formatRaw(firstBaseline.cost_usd),
    formatRaw(firstBaseline.latency_ms),
  ]);
  return rows;
}

/** Builds cost_summary.csv from each results file's summary, copied unchanged (M-1, NFR-4). Counts go in `value`; spreads go in min, median and max. */
function buildCostSummary(
  resultsByCondition: Map<string, ResultsFile>,
): string[][] {
  const rows: string[][] = [
    ["image", "purpose", "metric", "min", "median", "max", "value"],
  ];
  for (const condition of CONDITIONS) {
    const results = resultsByCondition.get(
      `${condition.image}/${condition.purpose}`,
    );
    if (results === undefined) {
      continue;
    }
    const prefix = [condition.image, condition.purpose];
    rows.push([...prefix, "runs", "", "", "", formatRaw(results.summary.runs)]);
    rows.push([
      ...prefix,
      "model_mismatch_runs",
      "",
      "",
      "",
      formatRaw(results.summary.model_mismatch_runs),
    ]);
    for (const metric of SUMMARY_METRICS) {
      const spread = results.summary[metric] as
        | Record<string, unknown>
        | null
        | undefined;
      // `?.` reads the field only when the spread is not null; the slice files have null estimates because the slice run skipped the baseline.
      rows.push([
        ...prefix,
        metric,
        formatRaw(spread?.min),
        formatRaw(spread?.median),
        formatRaw(spread?.max),
        "",
      ]);
    }
  }
  return rows;
}

/** Runs the checks, builds the four CSV files, and writes them only when every check passed (M-1). */
function main(): void {
  const sheetQuestions = readQuestions();
  const humanAnswers = readHumanAnswers(sheetQuestions);
  const resultsByCondition = readResultsFiles(sheetQuestions);
  if (problems.length > 0) {
    reportProblemsAndExit();
  }
  const comparison = buildComparison(
    sheetQuestions,
    humanAnswers,
    resultsByCondition,
  );
  const summaryRows = buildAgreementSummary(
    sheetQuestions,
    comparison.linesByCondition,
    resultsByCondition,
  );
  recountAgreement(comparison.rows, summaryRows);
  const runCostRows = buildRunCosts(resultsByCondition);
  const costSummaryRows = buildCostSummary(resultsByCondition);
  if (problems.length > 0) {
    reportProblemsAndExit();
  }
  writeFileSync(
    join(SPIKE_FOLDER, `${OUTPUT_PREFIX}comparison.csv`),
    formatCsv(comparison.rows),
  );
  writeFileSync(
    join(SPIKE_FOLDER, `${OUTPUT_PREFIX}agreement_summary.csv`),
    formatCsv(summaryRows),
  );
  writeFileSync(
    join(SPIKE_FOLDER, `${OUTPUT_PREFIX}run_costs.csv`),
    formatCsv(runCostRows),
  );
  writeFileSync(
    join(SPIKE_FOLDER, `${OUTPUT_PREFIX}cost_summary.csv`),
    formatCsv(costSummaryRows),
  );
  console.log(
    `wrote spike/${OUTPUT_PREFIX}comparison.csv, ${OUTPUT_PREFIX}agreement_summary.csv, ${OUTPUT_PREFIX}run_costs.csv, ${OUTPUT_PREFIX}cost_summary.csv`,
  );
}

/** Prints every recorded problem and exits with code 1, before any file is written. The return type `never` means the function does not return. */
function reportProblemsAndExit(): never {
  for (const problem of problems) {
    console.error(problem);
  }
  process.exit(1);
}

main();
