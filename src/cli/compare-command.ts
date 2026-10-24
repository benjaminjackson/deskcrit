// The `crit compare` command: run the report pipeline on the before image and on the after image,
// compare the two reports with the exported compare function, and render one document (FR-35,
// FR-36, FR-39, FR-42, FR-65, section 8.2). It holds no diff or verdict logic: every change comes
// from compare() in the package entry point, so the CLI and the library decide the same way
// (FR-63, CS-6). It writes nothing; main.ts writes the texts and sets the exit code (CS-17).

import { compare } from "../index.js";
import {
  checkRecordedImage,
  fingerprintImage,
  writeCompareAnswersFile,
} from "./answers-file.js";
import type { CompareInputs, ReportInputs } from "./read-inputs.js";
import { renderReportJson } from "./render-json.js";
import { renderCompareText } from "./render-text.js";
import { type AnswerSource, composeReport } from "./report-command.js";

/** What a compare run gives main.ts to write: the compare document, and the two-run answers file text for --save-answers (FR-42). */
export type CompareOutput = {
  readonly stdoutText: string;
  readonly answersFileText: string;
};

/**
 * Run the report pipeline on both images, one after the other, compare the two reports, and
 * return the compare document as JSON with --json or as the readable compare output without it,
 * with the two-run answers file text (FR-31, FR-35, FR-42, US-3). With recorded answers, both runs
 * are checked against their images before either image is prepared, so a wrong file is refused
 * with no image work (OQ-26 e). Any stage error propagates, so no partial output is returned
 * (FR-24).
 */
export async function runCompare(
  inputs: CompareInputs,
  beforeSource: AnswerSource,
  afterSource: AnswerSource,
): Promise<CompareOutput> {
  checkRecordedRunImage(inputs.before, beforeSource);
  checkRecordedRunImage(inputs.after, afterSource);
  const beforeComposed = await composeReport(inputs.before, beforeSource);
  const afterComposed = await composeReport(inputs.after, afterSource);
  // Both runs share one packs object (read-inputs.ts), so these are the packs both runs used (FR-35).
  const document = compare({
    before: beforeComposed.report,
    after: afterComposed.report,
    packs: inputs.before.packs,
  });
  let stdoutText: string;
  if (inputs.before.json) {
    stdoutText = renderReportJson(document);
  } else {
    stdoutText = renderCompareText(document);
  }
  const answersFileText = writeCompareAnswersFile(
    beforeComposed.recording,
    afterComposed.recording,
  );
  return { stdoutText, answersFileText };
}

/**
 * When the answers of one run come from a recorded file, stop the run unless that recorded run was
 * saved from this run's image (FR-42, OQ-26 e). An asked run has nothing to check.
 */
function checkRecordedRunImage(
  inputs: ReportInputs,
  answerSource: AnswerSource,
): void {
  if (answerSource.kind !== "recorded") {
    return;
  }
  checkRecordedImage(
    answerSource.recorded.recordedRun,
    fingerprintImage(inputs.imageBytes),
    answerSource.recorded.fileName,
    inputs.imagePath,
  );
}
