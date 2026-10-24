// A disposable check of the package entry point (FR-63, FR-64, FR-65, US-13). It runs the stages
// through src/index.ts the way a library caller would, and it reads src/index.ts to check that the entry
// point only re-exports. src/cli/no-io.test.ts checks that the CLI report command imports the
// stages only from the entry point.
// The check of the built file is in scripts/smoke.mjs, because it needs the build.

import { readFileSync } from "node:fs";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  type AskRequest,
  type AskResult,
  ask,
  build,
  createStubAdapter,
  loadPack,
  type Pack,
  prepare,
  type Question,
  STUB_MODEL_ID,
  type TypeSafeAdapter,
} from "./index.js";

/** Reads one file relative to the repository root, which is where Vitest runs. */
function readText(path: string): string {
  return readFileSync(path, "utf8");
}

/** Loads the two example packs that the tests below build questions from. */
function loadExamplePacks(): Pack[] {
  const minimal = loadPack(
    readText("schemas/examples/valid/minimal.yaml"),
    "minimal",
  );
  const accessibility = loadPack(
    readText("schemas/examples/valid/full-noul.yaml"),
    "accessibility",
  );
  return [minimal, accessibility];
}

/**
 * Makes an adapter that keeps every request it gets and answers through the stub, so a test can
 * see the exact question list that ask sent (US-13).
 */
function createRecordingAdapter(): {
  adapter: TypeSafeAdapter;
  requests: AskRequest[];
} {
  const requests: AskRequest[] = [];
  const stub = createStubAdapter();
  const adapter: TypeSafeAdapter = {
    askQuestions: async (request: AskRequest): Promise<AskResult> => {
      requests.push(request);
      return stub.askQuestions(request);
    },
  };
  return { adapter, requests };
}

/** Runs prepare and build on the example image and packs, as a library caller would. */
async function prepareAndBuild() {
  const imageBytes = new Uint8Array(
    readFileSync("packs/_example/fixtures/example-contrast.positive.png"),
  );
  const prepared = await prepare(imageBytes);
  const built = build({
    packs: loadExamplePacks(),
    image: prepared,
    context: { platform: "web", purpose: "Sign up for the newsletter" },
    facts: { viewport_width: 1280 },
  });
  return { prepared, built };
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("the library chain", () => {
  test("ask sends the question list the caller edited after build (US-13, AC-1)", async () => {
    const { built } = await prepareAndBuild();
    // Build makes three questions: one per criterion and one Box question for the criterion
    // that has locate set. The caller drops the first one and reverses the rest.
    expect(built.questions.length).toBe(3);
    const editedQuestions: Question[] = built.questions.slice(1).reverse();
    const recording = createRecordingAdapter();

    const result = await ask(built.state, editedQuestions, recording.adapter);

    expect(recording.requests.length).toBe(1);
    const sentIds = recording.requests[0]?.questions.map(
      (question) => question.id,
    );
    expect(sentIds).toEqual(editedQuestions.map((question) => question.id));
    expect(result.answers.map((answer) => answer.question_id)).toEqual(sentIds);
  });

  test("ask runs with the stub and TYPESAFE_API_KEY unset and no network (FR-20, FR-64)", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", undefined);
    vi.stubGlobal("fetch", () => {
      throw new Error("the stub must not use the network");
    });
    const { built } = await prepareAndBuild();

    const result = await ask(built.state, built.questions, createStubAdapter());

    expect(result.answers.length).toBe(built.questions.length);
    expect(result.usage.model).toBe(STUB_MODEL_ID);
  });
});

describe("the entry point source", () => {
  const indexSource = readText("src/index.ts");

  test("holds only comments and re-exports (CS-2, FR-63)", () => {
    // Join each multi-line export into one statement, then drop the comments, so every
    // statement left must be an `export ... from "...";`.
    const withoutComments = indexSource
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    const statements = withoutComments
      .split(";")
      .map((statement) => statement.trim())
      .filter((statement) => statement !== "");
    for (const statement of statements) {
      expect(statement).toMatch(/^export (type )?\{[^}]*\} from "\.\/[^"]+"$/);
    }
  });

  test("does not reach the process, Node built-ins, or the console (AC-7, CS-6)", () => {
    expect(indexSource).not.toMatch(/\bprocess\b/);
    expect(indexSource).not.toMatch(/["']node:/);
    expect(indexSource).not.toMatch(/\bconsole\b/);
  });

  test("does not export the real TypeSafe adapter (FR-64)", () => {
    expect(indexSource).not.toMatch(/typesafe\//);
  });
});
