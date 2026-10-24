// The `crit report` pipeline: prepare, build, ask, and compose, then one renderer (FR-31, FR-65).
// It calls only the four stage entry functions and no stage internals, and takes the adapter as a
// parameter so tests can pass the stub (FR-20, FR-64). It writes nothing; main.ts writes the
// returned text once (CS-17, FR-24).

// The JSON import is bundled by esbuild, so package.json is never read from disk at run time.
import packageJson from "../../package.json" with { type: "json" };
import type { TypeSafeAdapter } from "../ask/adapter.js";
import { ask } from "../ask/ask.js";
import { buildQuestions } from "../build/build.js";
import { compose } from "../compose/compose.js";
import { prepareImage } from "../prepare/prepare.js";
import { CouldNotRunError } from "../shared/could-not-run-error.js";
import type { ReportInputs } from "./read-inputs.js";
import { renderReportJson } from "./render-json.js";
import { renderReportText } from "./render-text.js";

/** The tool name the report records (section 8.1). */
const TOOL_NAME = "deskcrit";

/**
 * Run the four stages on the inputs and return the report text: one JSON document with --json,
 * the readable report without it (FR-31, FR-33, FR-65, US-1). Any stage error propagates, so no
 * partial report is returned (FR-24). A fail verdict is not an error: report exits 0 (FR-43).
 */
export async function runReport(
  inputs: ReportInputs,
  adapter: TypeSafeAdapter,
): Promise<string> {
  const prepared = await prepareNamingImage(
    inputs.imagePath,
    inputs.imageBytes,
  );
  const built = buildQuestions({
    packs: inputs.packs,
    image: prepared,
    context: inputs.context,
    facts: inputs.facts,
  });
  const asked = await ask(built.state, built.questions, adapter);
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
  if (inputs.json) {
    return renderReportJson(report);
  }
  return renderReportText(report);
}

/**
 * Run prepare, and put the image path in front of its could-not-run message, so stderr names the
 * input (FR-4, FR-73).
 */
async function prepareNamingImage(
  imagePath: string,
  imageBytes: Uint8Array,
): ReturnType<typeof prepareImage> {
  try {
    return await prepareImage(imageBytes);
  } catch (error) {
    if (error instanceof CouldNotRunError) {
      throw new CouldNotRunError(`${imagePath}: ${error.message}`);
    }
    throw error;
  }
}
