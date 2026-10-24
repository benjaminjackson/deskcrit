// The consumer file for the type check in scripts/smoke.mjs (FR-63, US-13). It imports the stage
// functions and their input and output types from "deskcrit", the package name, as a caller's
// code would. Node resolves that name to this package through the "exports" field in
// package.json, so tsc reads the built declarations in dist/types/ and not the source. The smoke
// script only type-checks this file. Nothing runs it.

import {
  type Answer,
  type AskResult,
  ask,
  type BuildInput,
  type BuildResult,
  build,
  type ComposeInput,
  type Context,
  CouldNotRunError,
  compose,
  createStubAdapter,
  type Finding,
  loadPack,
  type Pack,
  type PreparedImage,
  prepare,
  type Question,
  type Report,
  type State,
  type TypeSafeAdapter,
  type Usage,
  type Verdict,
} from "deskcrit";

/**
 * Runs every stage by hand with each input and output written as its exported type, so tsc fails
 * when a signature or a type export is missing or changes shape.
 */
export async function runEveryStage(
  packText: string,
  imageBytes: Uint8Array,
): Promise<Report> {
  const pack: Pack = loadPack(packText, "example");
  const prepared: PreparedImage = await prepare(imageBytes);
  const context: Context = { platform: "web" };
  const buildInput: BuildInput = {
    packs: [pack],
    image: prepared,
    context,
    facts: undefined,
  };
  const built: BuildResult = build(buildInput);
  const state: State = built.state;
  const questions: Question[] = built.questions.slice(1);
  const adapter: TypeSafeAdapter = createStubAdapter();
  const asked: AskResult = await ask(state, questions, adapter);
  const answers: readonly Answer[] = asked.answers;
  const usage: Usage = asked.usage;
  const composeInput: ComposeInput = {
    packs: [pack],
    built: { questions, skipped: built.skipped },
    prepared,
    asked: { answers, usage },
    run: {
      tool: { name: "deskcrit", version: "0.0.0" },
      imagePath: "page.png",
      context,
    },
  };
  return compose(composeInput);
}

/** Reads the verdict of each finding, so the Finding and Verdict types are checked too. */
export function listVerdicts(report: Report): Verdict[] {
  const verdicts: Verdict[] = [];
  for (const finding of report.findings) {
    const typedFinding: Finding = finding;
    verdicts.push(typedFinding.verdict);
  }
  return verdicts;
}

/** Returns true when the error is the one a stage throws when the run cannot go on (FR-24). */
export function isCouldNotRun(error: unknown): boolean {
  return error instanceof CouldNotRunError;
}
