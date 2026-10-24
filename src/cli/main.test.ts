// Disposable unit tests for `crit report` through main, with the stub adapter as the only fake
// (CS-22). They cover the inputs, the context merge, the exit codes, and the output streams
// (FR-1 to FR-4, FR-22, FR-24, FR-31, FR-33, FR-43, FR-51, FR-61, US-1, US-5, US-7, US-8, NFR-14).

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AskRequest, TypeSafeAdapter } from "../ask/adapter.js";
import { createStubAdapter, type StubOptions } from "../ask/stub.js";
import type { TypeSafeAdapterOptions } from "../ask/typesafe/adapter.js";
import { CouldNotRunError } from "../shared/could-not-run-error.js";
import { main } from "./main.js";

/** The repository root, so the tests can find the example packs, the image, and the schema. */
const repositoryRoot = join(import.meta.dirname, "..", "..");

/** A fake key. The tests check that it never reaches stdout or stderr (NFR-14). */
const FAKE_API_KEY = "sk-test-do-not-print-0123456789";

/** An environment that holds the fake key. */
const environmentWithKey = { TYPESAFE_API_KEY: FAKE_API_KEY };

/** What one run of main wrote, the exit code it set, and what reached the adapter. */
type RunResult = {
  stdout: string;
  stderr: string;
  exitCode: number | string | null | undefined;
  adapterOptions: TypeSafeAdapterOptions[];
  requests: AskRequest[];
};

let workingDirectory = "";
let stdoutText = "";
let stderrText = "";

beforeEach(() => {
  workingDirectory = mkdtempSync(join(tmpdir(), "crit-report-test-"));
  copyExamplePack("minimal.yaml", "minimal");
  copyExamplePack("full-noul.yaml", "accessibility");
  copyFileSync(
    join(
      repositoryRoot,
      "packs/_example/fixtures/example-contrast.positive.png",
    ),
    join(workingDirectory, "page.png"),
  );
  stdoutText = "";
  stderrText = "";
  vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
    stdoutText += String(chunk);
    return true;
  });
  vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
    stderrText += String(chunk);
    return true;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
  // workingDirectory comes from mkdtempSync, so it is never empty and sits in the temp folder.
  rmSync(workingDirectory, { recursive: true, force: true });
});

/** Copy one example pack from schemas/examples/valid/ into <workingDirectory>/<directory>/pack.yaml. */
function copyExamplePack(exampleName: string, directory: string): void {
  mkdirSync(join(workingDirectory, directory));
  copyFileSync(
    join(repositoryRoot, "schemas/examples/valid", exampleName),
    join(workingDirectory, directory, "pack.yaml"),
  );
}

/** Write a file in the working directory. */
function writeWorkingFile(name: string, text: string): void {
  writeFileSync(join(workingDirectory, name), text);
}

/**
 * Run main with a stub adapter wrapped so the test sees the options the factory got and every
 * request ask sent (FR-22, FR-64).
 */
async function runCrit(
  argv: string[],
  environment: Record<string, string | undefined> = environmentWithKey,
  stubOptions: StubOptions = {},
): Promise<RunResult> {
  const adapterOptions: TypeSafeAdapterOptions[] = [];
  const requests: AskRequest[] = [];
  const createAdapter = (options: TypeSafeAdapterOptions): TypeSafeAdapter => {
    adapterOptions.push(options);
    const stub = createStubAdapter(stubOptions);
    return {
      askQuestions: async (request) => {
        requests.push(request);
        return stub.askQuestions(request);
      },
    };
  };
  await main(argv, environment, createAdapter, workingDirectory);
  return {
    stdout: stdoutText,
    stderr: stderrText,
    exitCode: process.exitCode,
    adapterOptions,
    requests,
  };
}

/** Parse --json stdout and return it as a plain object for the assertions. */
function parseReport(stdout: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(stdout);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("stdout is not a JSON object");
  }
  return Object.fromEntries(Object.entries(parsed));
}

describe("a run that works", () => {
  it("writes one JSON document that validates against the report schema, and exits 0 (US-1, FR-31, FR-33)", async () => {
    const result = await runCrit([
      "report",
      "page.png",
      "--pack",
      "minimal",
      "--json",
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout.endsWith("}\n")).toBe(true);
    const schemaText = readFileSync(
      join(repositoryRoot, "schemas/report.schema.json"),
      "utf8",
    );
    const schema: object = JSON.parse(schemaText);
    const validate = new Ajv2020({ strict: false }).compile(schema);
    const report: unknown = JSON.parse(result.stdout);
    const valid = validate(report);
    expect(validate.errors ?? []).toEqual([]);
    expect(valid).toBe(true);
    const reportObject = parseReport(result.stdout);
    expect(reportObject.model).toBe("stub");
    expect(reportObject.usage).toEqual({
      requests: 1,
      input_tokens: 0,
      cost_usd: 0,
      latency_ms: 0,
    });
  });

  it("writes the readable report without --json (FR-31)", async () => {
    const result = await runCrit(["report", "page.png", "--pack", "minimal"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Body text is too faint to read");
    expect(() => JSON.parse(result.stdout)).toThrow();
  });

  it("exits 0 when a criterion fails (FR-43)", async () => {
    const result = await runCrit(
      ["report", "page.png", "--pack", "minimal", "--json"],
      environmentWithKey,
      {
        answers: [
          {
            type: "noul",
            question_id: "minimal/faint-body-text",
            model: "stub",
            distribution: { true: 1, false: 0 },
            confidence: null,
          },
        ],
      },
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('"verdict": "fail"');
  });

  it("passes the model pinned in .crit.yaml to the adapter factory, with the key (FR-22, FR-51)", async () => {
    writeWorkingFile(".crit.yaml", "model: jev-9.9.9\n");
    const result = await runCrit(["report", "page.png", "--pack", "minimal"]);
    expect(result.exitCode).toBe(0);
    expect(result.adapterOptions).toEqual([
      { apiKey: FAKE_API_KEY, model: "jev-9.9.9" },
    ]);
  });

  it("gives the factory no model when .crit.yaml pins none (FR-22)", async () => {
    const result = await runCrit(["report", "page.png", "--pack", "minimal"]);
    expect(result.adapterOptions).toEqual([{ apiKey: FAKE_API_KEY }]);
  });

  it("accepts screenshot and warn_fails_gate in .crit.yaml without acting on them (FR-41, FR-51)", async () => {
    writeWorkingFile(
      ".crit.yaml",
      "screenshot: other.png\nwarn_fails_gate: true\n",
    );
    const result = await runCrit(["report", "page.png", "--pack", "minimal"]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
  });

  it("loads a pack that .crit.yaml names when it is a local pack directory (FR-11)", async () => {
    writeWorkingFile(".crit.yaml", "packs: [minimal]\n");
    const result = await runCrit(["report", "page.png", "--json"]);
    expect(result.exitCode).toBe(0);
    expect(parseReport(result.stdout).packs).toEqual([
      { name: "minimal", version: "1.0.0" },
    ]);
  });
});

describe("context and facts (FR-2, FR-3, US-7, US-8)", () => {
  it("lets a --context flag override .crit.yaml and keeps the file's other keys", async () => {
    writeWorkingFile(
      ".crit.yaml",
      "context:\n  purpose: from the file\n  audience: designers\n",
    );
    const result = await runCrit([
      "report",
      "page.png",
      "--pack",
      "minimal",
      "--context",
      "purpose=poster seen from three metres",
      "--json",
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.requests[0]?.state.context).toEqual({
      purpose: "poster seen from three metres",
      audience: "designers",
    });
    expect(parseReport(result.stdout).context).toEqual({
      purpose: "poster seen from three metres",
      audience: "designers",
    });
  });

  it("puts the purpose text in the state every question is asked with (US-8)", async () => {
    const result = await runCrit([
      "report",
      "page.png",
      "--pack",
      "minimal",
      "--context",
      "purpose=poster seen from three metres",
    ]);
    expect(result.requests).toHaveLength(1);
    expect(result.requests[0]?.state.context?.purpose).toBe(
      "poster seen from three metres",
    );
  });

  it("skips a criterion whose applies_to excludes the platform, with the reason (US-8)", async () => {
    const result = await runCrit([
      "report",
      "page.png",
      "--pack",
      "minimal",
      "--pack",
      "accessibility",
      "--context",
      "platform=print",
      "--json",
    ]);
    expect(result.exitCode).toBe(0);
    expect(parseReport(result.stdout).skipped).toEqual([
      {
        criterion: "accessibility/faint-body-text",
        reason: "the pack applies_to does not include platform print",
      },
    ]);
  });

  it("skips nothing for context reasons when no context is given (US-8)", async () => {
    writeWorkingFile("facts.json", '{"viewport_width": 1280}');
    const result = await runCrit([
      "report",
      "page.png",
      "--pack",
      "minimal",
      "--pack",
      "accessibility",
      "--facts",
      "facts.json",
      "--json",
    ]);
    expect(result.exitCode).toBe(0);
    expect(parseReport(result.stdout).skipped).toEqual([]);
  });

  it("puts the facts file in the state unchanged under facts (FR-3, US-7)", async () => {
    const factsText =
      '{"z_last": [3, 2, 1], "viewport_width": 1280, "nested": {"b": null, "a": ""}}';
    writeWorkingFile("facts.json", factsText);
    const result = await runCrit([
      "report",
      "page.png",
      "--pack",
      "minimal",
      "--facts",
      "facts.json",
    ]);
    expect(result.exitCode).toBe(0);
    const facts = result.requests[0]?.state.facts;
    expect(facts).toEqual(JSON.parse(factsText));
    expect(JSON.stringify(facts)).toBe(JSON.stringify(JSON.parse(factsText)));
  });
});

describe("could not run: exit 2, a message that names the input, and empty stdout (FR-4, FR-24, FR-61)", () => {
  const cases: {
    name: string;
    argv: string[];
    files?: Record<string, string>;
    environment?: Record<string, string | undefined>;
    message: string;
  }[] = [
    { name: "no arguments", argv: [], message: "usage: crit report" },
    {
      name: "a missing image",
      argv: ["report", "missing.png", "--pack", "minimal"],
      message: "missing.png: cannot read image",
    },
    {
      name: "a file that is not an image",
      argv: ["report", "not-an-image.png", "--pack", "minimal"],
      files: { "not-an-image.png": "hello" },
      message: "not-an-image.png: the image is not a valid PNG or JPEG",
    },
    {
      name: "facts that are not valid JSON (US-7)",
      argv: ["report", "page.png", "--pack", "minimal", "--facts", "bad.json"],
      files: { "bad.json": "{not json" },
      message: "bad.json: the facts file is not valid JSON",
    },
    {
      name: "a missing facts file",
      argv: ["report", "page.png", "--pack", "minimal", "--facts", "nope.json"],
      message: "nope.json: cannot read facts file",
    },
    {
      name: "an invalid .crit.yaml",
      argv: ["report", "page.png", "--pack", "minimal"],
      files: { ".crit.yaml": "colour: red\n" },
      message: ".crit.yaml: unknown key colour",
    },
    {
      name: "a --pack directory with no pack.yaml",
      argv: ["report", "page.png", "--pack", "nowhere"],
      message: "--pack nowhere: no pack.yaml in that directory",
    },
    {
      name: "a --pack directory that fails validation (US-5)",
      argv: ["report", "page.png", "--pack", "broken"],
      files: { "broken/pack.yaml": "name: broken\n" },
      message: "broken: invalid pack",
    },
    {
      name: "a .crit.yaml pack that cannot be found (FR-11)",
      argv: ["report", "page.png"],
      files: { ".crit.yaml": "packs: [typography]\n" },
      message: "pack typography named in .crit.yaml was not found",
    },
    {
      name: "no packs at all (OQ-25 d)",
      argv: ["report", "page.png"],
      message: "no packs: pass --pack <dir> or name packs in .crit.yaml",
    },
    {
      name: "two packs with the same name",
      argv: ["report", "page.png", "--pack", "minimal"],
      files: { ".crit.yaml": "packs: [minimal]\n" },
      message:
        "two packs are named minimal: --pack minimal and pack minimal in .crit.yaml",
    },
    {
      name: "a bad --context pair",
      argv: [
        "report",
        "page.png",
        "--pack",
        "minimal",
        "--context",
        "colour=red",
      ],
      message: "--context colour=red: unknown key colour",
    },
    {
      name: "a missing TYPESAFE_API_KEY (NFR-14)",
      argv: ["report", "page.png", "--pack", "minimal"],
      environment: {},
      message: "TYPESAFE_API_KEY is not set",
    },
    {
      name: "an empty TYPESAFE_API_KEY",
      argv: ["report", "page.png", "--pack", "minimal"],
      environment: { TYPESAFE_API_KEY: "" },
      message: "TYPESAFE_API_KEY is not set",
    },
    {
      name: "every criterion skipped (FR-74)",
      argv: [
        "report",
        "page.png",
        "--pack",
        "accessibility",
        "--context",
        "platform=print",
      ],
      message:
        "nothing to ask: every criterion was skipped\n  accessibility/faint-body-text: the pack applies_to does not include platform print",
    },
  ];
  for (const testCase of cases) {
    it(testCase.name, async () => {
      for (const [name, text] of Object.entries(testCase.files ?? {})) {
        const directory = name.split("/").slice(0, -1).join("/");
        if (directory !== "") {
          mkdirSync(join(workingDirectory, directory), { recursive: true });
        }
        writeWorkingFile(name, text);
      }
      const result = await runCrit(
        testCase.argv,
        testCase.environment ?? environmentWithKey,
      );
      expect(result.exitCode).toBe(2);
      expect(result.stdout).toBe("");
      expect(result.stderr).toContain(testCase.message);
      expect(result.stderr.startsWith("crit: ")).toBe(true);
      expect(result.stderr).not.toContain(FAKE_API_KEY);
    });
  }

  it("exits 2 with no partial report when the adapter fails (FR-24)", async () => {
    const result = await runCrit(
      ["report", "page.png", "--pack", "minimal", "--json"],
      environmentWithKey,
      { failWith: new CouldNotRunError("TypeSafe returned HTTP 503") },
    );
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe("crit: TypeSafe returned HTTP 503\n");
  });

  it("exits 2 and prints the stack for a plain Error, which is a bug (CS-16)", async () => {
    const result = await runCrit(
      ["report", "page.png", "--pack", "minimal"],
      environmentWithKey,
      { failWith: new Error("broken invariant") },
    );
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Error: broken invariant");
    expect(result.stderr).toContain("at ");
  });

  it("exits 2 with fixed text, not the raw error, when the adapter factory throws (CS-19)", async () => {
    const throwingFactory = (): TypeSafeAdapter => {
      throw new Error(
        `bad client config, Authorization: Bearer ${FAKE_API_KEY}`,
      );
    };
    await main(
      ["report", "page.png", "--pack", "minimal"],
      environmentWithKey,
      throwingFactory,
      workingDirectory,
    );
    expect(process.exitCode).toBe(2);
    expect(stdoutText).toBe("");
    expect(stderrText).toBe("crit: could not set up the TypeSafe client\n");
    expect(stderrText).not.toContain(FAKE_API_KEY);
  });

  it("never writes the key to stdout on success (NFR-14)", async () => {
    const result = await runCrit([
      "report",
      "page.png",
      "--pack",
      "minimal",
      "--json",
    ]);
    expect(result.stdout).not.toContain(FAKE_API_KEY);
  });
});

describe("--save-answers and --answers (FR-42, CS-21)", () => {
  /** Read a file from the working directory as text. */
  function readWorkingFile(name: string): string {
    return readFileSync(join(workingDirectory, name), "utf8");
  }

  /** Return true when the working directory holds a file of this name. */
  function workingFileExists(name: string): boolean {
    return existsSync(join(workingDirectory, name));
  }

  /** Forget what earlier runs wrote, so the next run's streams can be checked alone. */
  function clearStreams(): void {
    stdoutText = "";
    stderrText = "";
    process.exitCode = undefined;
  }

  /** A factory that fails the test if main calls it, which proves --answers makes no adapter. */
  const forbiddenFactory = (): TypeSafeAdapter => {
    throw new Error("the adapter factory must not be called with --answers");
  };

  it("writes the raw answers and the adapter's usage to the file, and the report to stdout", async () => {
    const result = await runCrit([
      "report",
      "page.png",
      "--pack",
      "minimal",
      "--json",
      "--save-answers",
      "answers.json",
    ]);
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(parseReport(result.stdout).model).toBe("stub");
    const saved: unknown = JSON.parse(readWorkingFile("answers.json"));
    expect(saved).toEqual({
      answers_file_version: 1,
      answers: [
        {
          type: "noul",
          question_id: "minimal/faint-body-text",
          model: "stub",
          distribution: { true: 0, false: 1 },
          confidence: null,
        },
      ],
      usage: { input_tokens: 0, cost_usd: 0, latency_ms: 0, model: "stub" },
    });
    expect(readWorkingFile("answers.json")).not.toContain(FAKE_API_KEY);
  });

  it("gives the same stdout from the file with no key and no adapter, twice in a row (EV-1, NFR-5)", async () => {
    const saved = await runCrit([
      "report",
      "page.png",
      "--pack",
      "minimal",
      "--json",
      "--save-answers",
      "answers.json",
    ]);
    const argv = [
      "report",
      "page.png",
      "--pack",
      "minimal",
      "--json",
      "--answers",
      "answers.json",
    ];
    const outputs: string[] = [];
    for (let run = 0; run < 2; run += 1) {
      clearStreams();
      await main(argv, {}, forbiddenFactory, workingDirectory);
      expect(process.exitCode).toBe(0);
      expect(stderrText).toBe("");
      outputs.push(stdoutText);
    }
    expect(outputs[0]).toBe(saved.stdout);
    expect(outputs[1]).toBe(saved.stdout);
  });

  it("gives new verdicts from the same file when the pack's thresholds change (FR-42)", async () => {
    writeWorkingFile(
      "answers.json",
      `${JSON.stringify({
        answers_file_version: 1,
        answers: [
          {
            type: "noul",
            question_id: "minimal/faint-body-text",
            model: "jev-1",
            distribution: { true: 0.8, false: 0.2 },
            confidence: null,
          },
        ],
        usage: {
          input_tokens: 10,
          cost_usd: 0.1,
          latency_ms: 5,
          model: "jev-1",
        },
      })}\n`,
    );
    const argv = [
      "report",
      "page.png",
      "--pack",
      "minimal",
      "--json",
      "--answers",
      "answers.json",
    ];
    await main(argv, {}, forbiddenFactory, workingDirectory);
    expect(process.exitCode).toBe(0);
    const firstReport = parseReport(stdoutText);
    expect(firstReport.model).toBe("jev-1");
    expect(firstReport.usage).toEqual({
      requests: 1,
      input_tokens: 10,
      cost_usd: 0.1,
      latency_ms: 5,
    });
    expect(stdoutText).toContain('"verdict": "fail"');
    const packText = readWorkingFile("minimal/pack.yaml");
    writeWorkingFile(
      "minimal/pack.yaml",
      packText.replace(
        "probability_at_least: 0.7",
        "probability_at_least: 0.9",
      ),
    );
    clearStreams();
    await main(argv, {}, forbiddenFactory, workingDirectory);
    expect(process.exitCode).toBe(0);
    expect(stdoutText).not.toContain('"verdict": "fail"');
  });

  it("writes the replayed answers again when both flags are given (OQ-26)", async () => {
    await runCrit([
      "report",
      "page.png",
      "--pack",
      "minimal",
      "--save-answers",
      "first.json",
    ]);
    clearStreams();
    await main(
      [
        "report",
        "page.png",
        "--pack",
        "minimal",
        "--answers",
        "first.json",
        "--save-answers",
        "second.json",
      ],
      {},
      forbiddenFactory,
      workingDirectory,
    );
    expect(process.exitCode).toBe(0);
    expect(readWorkingFile("second.json")).toBe(readWorkingFile("first.json"));
  });

  it("exits 2, names the file, and writes nothing when the answers file is not JSON (FR-4, FR-43)", async () => {
    writeWorkingFile("answers.json", "{ broken");
    await main(
      ["report", "page.png", "--pack", "minimal", "--answers", "answers.json"],
      {},
      forbiddenFactory,
      workingDirectory,
    );
    expect(process.exitCode).toBe(2);
    expect(stdoutText).toBe("");
    expect(stderrText).toBe(
      "crit: answers file answers.json is not valid JSON\n",
    );
  });

  it("exits 2 and names the file when it is missing (FR-4)", async () => {
    await main(
      ["report", "page.png", "--pack", "minimal", "--answers", "absent.json"],
      {},
      forbiddenFactory,
      workingDirectory,
    );
    expect(process.exitCode).toBe(2);
    expect(stdoutText).toBe("");
    expect(stderrText).toBe("crit: answers file absent.json cannot be read\n");
  });

  it("exits 2 and names the file when its answers do not fit this run's questions (OQ-26)", async () => {
    writeWorkingFile(
      "answers.json",
      `${JSON.stringify({
        answers_file_version: 1,
        answers: [],
        usage: { input_tokens: 0, cost_usd: 0, latency_ms: 0, model: "stub" },
      })}\n`,
    );
    await main(
      ["report", "page.png", "--pack", "minimal", "--answers", "answers.json"],
      {},
      forbiddenFactory,
      workingDirectory,
    );
    expect(process.exitCode).toBe(2);
    expect(stdoutText).toBe("");
    expect(stderrText).toContain("answers file answers.json does not fit");
    expect(stderrText).toContain(
      "no answer for question minimal/faint-body-text",
    );
  });

  it("writes no answers file and no stdout when the adapter fails (FR-24)", async () => {
    const result = await runCrit(
      [
        "report",
        "page.png",
        "--pack",
        "minimal",
        "--json",
        "--save-answers",
        "answers.json",
      ],
      environmentWithKey,
      { failWith: new CouldNotRunError("TypeSafe returned HTTP 503") },
    );
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(workingFileExists("answers.json")).toBe(false);
  });

  it("exits 2, names the path, and writes no stdout when the answers file cannot be written (FR-4)", async () => {
    const result = await runCrit([
      "report",
      "page.png",
      "--pack",
      "minimal",
      "--save-answers",
      "no-such-directory/answers.json",
    ]);
    expect(result.exitCode).toBe(2);
    expect(result.stdout).toBe("");
    expect(result.stderr).toBe(
      "crit: answers file no-such-directory/answers.json cannot be written\n",
    );
  });
});
