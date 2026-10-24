// The `crit report` pipeline: prepare, build, ask, and compose, then one renderer (FR-31, FR-65).
// It calls only the four stage entry functions and no stage internals, and takes the adapter as a
// parameter so tests can pass the stub (FR-20, FR-64). With --answers it takes recorded answers in
// place of ask, after it checks that they were saved from this image (FR-42, OQ-26 e). It writes nothing; main.ts writes the returned texts (CS-17, FR-24).

// The JSON import is bundled by esbuild, so package.json is never read from disk at run time.
import packageJson from "../../package.json" with { type: "json" };
// The stage functions come from the package entry point under their public names, so the CLI
// runs exactly what a library caller runs (FR-63, FR-65).
import {
  type AskResult,
  ask,
  build,
  CouldNotRunError,
  compose,
  prepare,
  type TypeSafeAdapter,
} from "../index.js";
import {
  checkRecordedAnswers,
  checkRecordedImage,
  fingerprintImage,
  writeAnswersFile,
} from "./answers-file.js";
import type { RecordedAnswers, ReportInputs } from "./read-inputs.js";
import { renderReportJson } from "./render-json.js";
import { renderReportText } from "./render-text.js";

/** The tool name the report records (section 8.1). */
const TOOL_NAME = "deskcrit";

/**
 * Where the answers come from: the ask stage through an adapter, or a recorded answers file that
 * --answers named, which makes no network call (FR-42, OQ-26).
 */
export type AnswerSource =
  | { readonly kind: "ask"; readonly adapter: TypeSafeAdapter }
  | { readonly kind: "recorded"; readonly recorded: RecordedAnswers };

/** What a report run gives main.ts to write: the report, and the answers file text for --save-answers (FR-42). */
export type ReportOutput = {
  readonly stdoutText: string;
  readonly answersFileText: string;
};

/**
 * Run the four stages on the inputs and return the report text, one JSON document with --json and
 * the readable report without it, and the answers file text (FR-31, FR-33, FR-42, FR-65, US-1).
 * Any stage error propagates, so no partial report is returned (FR-24). A fail verdict is not an
 * error: report exits 0 (FR-43).
 */
export async function runReport(
  inputs: ReportInputs,
  answerSource: AnswerSource,
): Promise<ReportOutput> {
  // The fingerprint is of the bytes as read from disk, and a replay checks it before prepare, so
  // answers from another image are refused with no image work (FR-42, OQ-26 e).
  const imageSha256 = fingerprintImage(inputs.imageBytes);
  if (answerSource.kind === "recorded") {
    checkRecordedImage(
      answerSource.recorded.answersFile,
      imageSha256,
      answerSource.recorded.fileName,
      inputs.imagePath,
    );
  }
  const prepared = await prepareNamingImage(
    inputs.imagePath,
    inputs.imageBytes,
  );
  const built = build({
    packs: inputs.packs,
    image: prepared,
    context: inputs.context,
    facts: inputs.facts,
  });
  let asked: AskResult;
  if (answerSource.kind === "ask") {
    asked = await ask(built.state, built.questions, answerSource.adapter);
  } else {
    asked = checkRecordedAnswers(
      answerSource.recorded.answersFile,
      built.questions,
      answerSource.recorded.fileName,
    );
  }
  const report = compose({
    packs: inputs.packs,
    built,
    prepared,
    asked,
    run: {
      tool: { name: TOOL_NAME, version: packageJson.version },
      imagePath: inputs.imagePath,
      context: inputs.context,
    },
  });
  let stdoutText: string;
  if (inputs.json) {
    stdoutText = renderReportJson(report);
  } else {
    stdoutText = renderReportText(report);
  }
  return { stdoutText, answersFileText: writeAnswersFile(asked, imageSha256) };
}

/**
 * Run prepare, and put the image path in front of its could-not-run message, so stderr names the
 * input (FR-4, FR-73).
 */
async function prepareNamingImage(
  imagePath: string,
  imageBytes: Uint8Array,
): ReturnType<typeof prepare> {
  try {
    return await prepare(imageBytes);
  } catch (error) {
    if (error instanceof CouldNotRunError) {
      throw new CouldNotRunError(`${imagePath}: ${error.message}`);
    }
    throw error;
  }
}
