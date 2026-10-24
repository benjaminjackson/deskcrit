// The M-1 spike runner (crit-oj5.2). It asks Jev the twenty questions in spike/questions.yaml
// about spike/screenshot.png, with and without the purpose line, and writes every run to
// spike/results/. Disposable spike code: it does its own file and network I/O, because CS-5 and
// CS-6 govern src/, which the spike does not create.
//
// Usage, from the repository root:
//   node spike/run.ts --dry-run      checks inputs and both requests; needs no key, sends nothing
//   node spike/run.ts --runs 5       live and paid; needs TYPESAFE_API_KEY

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { APIError, image, TypeSafeClient, VERSION } from "@typesafe-ai/sdk";
import { parse } from "yaml";
import {
  type BuiltRequest,
  buildRequest,
  buildStandInResponse,
  buildTextOnlyRequest,
  type Condition,
  checkImageSize,
  computeCostUsd,
  EXPECTED_QUESTION_COUNT,
  PINNED_MODEL,
  PRICE_USD_PER_INPUT_TOKEN,
  parseQuestionFile,
  parseResponse,
  type QuestionRecord,
  readPngSize,
  readWireRequest,
  type SpikeQuestion,
  summarizeNumbers,
  type WireRequest,
} from "./request.ts";

/** The smallest run count the ticket allows per condition (EV-6, OQ-9). */
const MINIMUM_RUNS = 3;

/** The run count per condition, decided by Benjamin Jackson on 2026-10-23. */
const DEFAULT_RUNS = 5;

/** Timeout for one attempt. The SDK default of 10 s is too short for an image request. */
const REQUEST_TIMEOUT_MS = 120_000;

/** One kept request, as it goes into a results file (CS-10). */
type RunRecord = {
  run: number;
  cold_start: boolean;
  started_at: string;
  model: string;
  model_matches_pinned: boolean;
  raw_response_file: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  latency_ms: number;
  questions: QuestionRecord[];
};

/** The inputs every request shares, read once at the start. */
type SpikeInputs = {
  imageBytes: Uint8Array;
  imageInfo: {
    path: string;
    sha256: string;
    width: number;
    height: number;
    bytes: number;
  };
  questionsInfo: { path: string; sha256: string; count: number };
  questions: SpikeQuestion[];
  purpose: string;
};

/** The parsed command-line flags. */
type Flags = { dryRun: boolean; runs: number };

/** Read --dry-run and --runs N from argv, or throw on anything else. */
function readFlags(argv: string[]): Flags {
  let dryRun = false;
  let runs = DEFAULT_RUNS;
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (flag === "--dry-run") {
      dryRun = true;
    } else if (flag === "--runs") {
      runs = Number(argv[index + 1]);
      index++;
      if (!Number.isInteger(runs) || runs < MINIMUM_RUNS) {
        throw new Error(
          `--runs must be a whole number of at least ${MINIMUM_RUNS}`,
        );
      }
    } else {
      throw new Error(
        `unknown flag ${String(flag)}; use --dry-run or --runs N`,
      );
    }
  }
  return { dryRun, runs };
}

/** Return the sha256 of some bytes as hex, so a reviewer can see the inputs match crit-oj5.1. */
function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Read and check the screenshot, the questions, and the purpose line. No request is built yet. */
async function readInputs(): Promise<SpikeInputs> {
  const imageBytes = new Uint8Array(
    await readFile(new URL("./screenshot.png", import.meta.url)),
  );
  const size = readPngSize(imageBytes);
  checkImageSize(size.width, size.height);
  const questionBytes = new Uint8Array(
    await readFile(new URL("./questions.yaml", import.meta.url)),
  );
  // CS-4: the YAML 1.2 core schema, and duplicate keys are an error.
  const parsedYaml: unknown = parse(new TextDecoder().decode(questionBytes), {
    schema: "core",
    uniqueKeys: true,
  });
  const questions = parseQuestionFile(parsedYaml);
  const purpose = (
    await readFile(new URL("./purpose.txt", import.meta.url), "utf8")
  ).trim();
  if (purpose === "" || purpose.includes("\n")) {
    throw new Error("spike/purpose.txt must hold exactly one line");
  }
  return {
    imageBytes,
    imageInfo: {
      path: "spike/screenshot.png",
      sha256: hashBytes(imageBytes),
      width: size.width,
      height: size.height,
      bytes: imageBytes.byteLength,
    },
    questionsInfo: {
      path: "spike/questions.yaml",
      sha256: hashBytes(questionBytes),
      count: questions.length,
    },
    questions,
    purpose,
  };
}

/**
 * Make the client with every default that could distort the spike set by hand: the base URL, the
 * model, logging off (debug logs request bodies), a long timeout, and no retries, so one latency
 * is one attempt. A dry run passes a placeholder key and a fetch that never touches the network.
 */
function makeClient(
  apiKey: string,
  fetchOverride: typeof fetch | undefined,
): TypeSafeClient {
  return new TypeSafeClient({
    apiKey,
    baseURL: "https://api.typesafe.ai",
    defaultModel: PINNED_MODEL,
    logLevel: "off",
    timeout: REQUEST_TIMEOUT_MS,
    retry: { maxRetries: 0 },
    fetch: fetchOverride,
  });
}

/**
 * Turn an ISO timestamp into a string that is safe in a file name, for example
 * 2026-10-23T14-05-09-123Z. Each live run gets its own files, so a second run never overwrites
 * the paid runs of the first.
 */
function toFileStamp(isoTimestamp: string): string {
  return isoTimestamp.replaceAll(":", "-").replaceAll(".", "-");
}

/**
 * Write one raw response body to spike/results/raw/ before it is parsed, so a parse failure keeps
 * the paid data. The body is the parsed JSON the server returned: it holds no key and no headers.
 * The "wx" flag makes the write fail if the file already exists, so nothing is overwritten.
 */
async function writeRawResponse(
  fileName: string,
  raw: unknown,
): Promise<string> {
  const folder = new URL("./results/raw/", import.meta.url);
  await mkdir(folder, { recursive: true });
  await writeFile(
    new URL(fileName, folder),
    `${JSON.stringify(raw, null, 2)}\n`,
    { flag: "wx" },
  );
  return `spike/results/raw/${fileName}`;
}

/**
 * Send one request, time it on the wall clock, keep the raw response, and check it. A model that
 * differs from the pinned one is recorded and flagged, not thrown, so the paid answer is kept
 * (FR-22, FR-26). With a null rawFileName (the dry run) nothing is written.
 */
async function sendRequest(
  client: TypeSafeClient,
  request: BuiltRequest,
  questions: SpikeQuestion[],
  runNumber: number,
  coldStart: boolean,
  rawFileName: string | null,
): Promise<RunRecord> {
  const startedAt = new Date().toISOString();
  const before = performance.now();
  const raw: unknown = await client.systemOne(request.body, request.options);
  const after = performance.now();
  let rawResponseFile: string | null = null;
  if (rawFileName !== null) {
    rawResponseFile = await writeRawResponse(rawFileName, raw);
  }
  const parsed = parseResponse(raw, questions);
  const modelMatchesPinned = parsed.model === PINNED_MODEL;
  if (!modelMatchesPinned) {
    console.error(
      `warning: server answered with model ${parsed.model}, not ${PINNED_MODEL}; flagged in the results`,
    );
  }
  return {
    run: runNumber,
    cold_start: coldStart,
    started_at: startedAt,
    model: parsed.model,
    model_matches_pinned: modelMatchesPinned,
    raw_response_file: rawResponseFile,
    input_tokens: parsed.input_tokens,
    output_tokens: parsed.output_tokens,
    cost_usd: computeCostUsd(parsed.input_tokens),
    latency_ms: Math.round((after - before) * 10) / 10,
    questions: parsed.questions,
  };
}

/** Collect the non-null numbers from a list, for the summary. */
function keepNumbers(values: (number | null)[]): number[] {
  const numbers: number[] = [];
  for (const value of values) {
    if (value !== null) {
      numbers.push(value);
    }
  }
  return numbers;
}

/** Build the whole results file for one condition, with every run kept and a summary (EV-6). */
function buildResultsFile(
  condition: Condition,
  inputs: SpikeInputs,
  createdAt: string,
  runs: RunRecord[],
  baseline: RunRecord | null,
): unknown {
  const latencies: number[] = [];
  const inputTokens: (number | null)[] = [];
  const costs: (number | null)[] = [];
  const imageTokenEstimates: number[] = [];
  let modelMismatchRuns = 0;
  for (const run of runs) {
    latencies.push(run.latency_ms);
    inputTokens.push(run.input_tokens);
    costs.push(run.cost_usd);
    if (!run.model_matches_pinned) {
      modelMismatchRuns++;
    }
    if (
      run.input_tokens !== null &&
      baseline !== null &&
      baseline.input_tokens !== null
    ) {
      imageTokenEstimates.push(run.input_tokens - baseline.input_tokens);
    }
  }
  let imageTokenNote =
    "request input_tokens minus the text-only baseline input_tokens, per run; the baseline has the string (no image) where the image is, so the difference is the image's tokens less the few tokens of that string";
  if (condition === "with_purpose") {
    imageTokenNote +=
      "; in this condition it also holds the tokens of the purpose line, so the without_purpose file gives the cleaner figure";
  }
  let baselineSummary: unknown = null;
  if (baseline !== null) {
    baselineSummary = {
      note: "one request with the same twenty questions, the string (no image) in place of the image, no purpose, and no danger-zone header; compare its input_tokens with a without_purpose run to estimate the tokens the image costs",
      model: baseline.model,
      input_tokens: baseline.input_tokens,
      output_tokens: baseline.output_tokens,
      cost_usd: baseline.cost_usd,
      latency_ms: baseline.latency_ms,
    };
  }
  let purpose: string | null = null;
  if (condition === "with_purpose") {
    purpose = inputs.purpose;
  }
  return {
    ticket: "crit-oj5.2",
    condition,
    created_at: createdAt,
    model_requested: PINNED_MODEL,
    sdk: `@typesafe-ai/sdk@${VERSION}`,
    node_version: process.version,
    image: inputs.imageInfo,
    questions_file: inputs.questionsInfo,
    purpose,
    cost_source: `computed from usage.input_tokens at $${PRICE_USD_PER_INPUT_TOKEN * 1_000_000} per million input tokens (JC-10); the SDK reports no cost`,
    latency_source:
      "wall clock around client.systemOne, including image upload and compression, with retries off",
    confidence_note:
      "noul answers report no confidence: confidence is null, confidence_reported is false, and derived_confidence is max(p, 1 - p), computed by this script and not reported by Jev (decided 2026-10-23; the product rule waits on crit-dmm)",
    runs,
    summary: {
      runs: runs.length,
      latency_ms: summarizeNumbers(latencies),
      model_mismatch_runs: modelMismatchRuns,
      request_input_tokens: summarizeNumbers(keepNumbers(inputTokens)),
      image_input_tokens_estimate: summarizeNumbers(imageTokenEstimates),
      image_input_tokens_estimate_note: imageTokenNote,
      cost_usd_per_image: summarizeNumbers(keepNumbers(costs)),
      baseline_text_only: baselineSummary,
    },
  };
}

/** Write both results files. Called after every request, so a crash keeps the runs already paid for. */
async function writeResults(
  inputs: SpikeInputs,
  createdAt: string,
  runsByCondition: Record<Condition, RunRecord[]>,
  baseline: RunRecord | null,
): Promise<string[]> {
  const folder = new URL("./results/", import.meta.url);
  await mkdir(folder, { recursive: true });
  const stamp = toFileStamp(createdAt);
  const written: string[] = [];
  const conditions: [Condition, string][] = [
    ["with_purpose", "with-purpose"],
    ["without_purpose", "without-purpose"],
  ];
  for (const [condition, slug] of conditions) {
    const fileName = `${stamp}-${slug}.json`;
    const contents = buildResultsFile(
      condition,
      inputs,
      createdAt,
      runsByCondition[condition],
      baseline,
    );
    await writeFile(
      new URL(fileName, folder),
      `${JSON.stringify(contents, null, 2)}\n`,
    );
    written.push(`spike/results/${fileName}`);
  }
  return written;
}

/** Turn any thrown value into a short line with no key, no headers, and no raw body (CS-19, NFR-14). */
function describeFailure(error: unknown): string {
  if (error instanceof APIError) {
    return `TypeSafe request failed: HTTP ${error.status} (${error.constructor.name})`;
  }
  if (error instanceof Error && error.constructor === Error) {
    // Plain Errors come from this script's own checks, whose messages hold no secrets.
    return `spike failed: ${error.message}`;
  }
  if (error instanceof Error) {
    return `TypeSafe request failed: ${error.constructor.name}`;
  }
  return "spike failed: unknown error";
}

/**
 * Dry run: send both condition requests and the baseline through the real SDK into a fetch that
 * records the bytes and returns a stand-in answer. It prints what the wire would carry, writes no
 * results, and needs no key.
 */
async function runDry(inputs: SpikeInputs): Promise<void> {
  const captured: WireRequest[] = [];
  const recordingFetch = async (
    _url: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const body = new Uint8Array(await new Response(init?.body).arrayBuffer());
    captured.push(readWireRequest(init?.headers, body));
    return new Response(
      JSON.stringify(buildStandInResponse(inputs.questions)),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      },
    );
  };
  const client = makeClient("dry-run-placeholder-not-a-key", recordingFetch);
  const screenshot = image(inputs.imageBytes);
  const requests: [string, BuiltRequest][] = [
    [
      "with_purpose",
      buildRequest(screenshot, inputs.purpose, inputs.questions),
    ],
    ["without_purpose", buildRequest(screenshot, null, inputs.questions)],
    ["baseline_text_only", buildTextOnlyRequest(inputs.questions)],
  ];
  for (const [label, request] of requests) {
    await sendRequest(client, request, inputs.questions, 1, false, null);
    const wire = captured[captured.length - 1];
    if (wire === undefined) {
      throw new Error(`no request was captured for ${label}`);
    }
    let stateKeys = "";
    if (typeof wire.state === "object" && wire.state !== null) {
      stateKeys = Object.keys(wire.state).join(", ");
    }
    console.log(
      `${label}: model ${String(wire.model)}, ${wire.question_count} questions, ${wire.image_part_count} image part(s), ${wire.image_reference_count} image reference(s) in the JSON, ` +
        `danger-zone header ${wire.danger_zone_header ?? "absent"}, body ${wire.content_type}, state keys [${stateKeys}]`,
    );
  }
  console.log(
    `image ${inputs.imageInfo.path}: ${inputs.imageInfo.width}x${inputs.imageInfo.height} px, ${inputs.imageInfo.bytes} bytes, sha256 ${inputs.imageInfo.sha256}`,
  );
  console.log(
    `questions ${inputs.questionsInfo.path}: ${inputs.questionsInfo.count} of ${EXPECTED_QUESTION_COUNT}, sha256 ${inputs.questionsInfo.sha256}`,
  );
  console.log(
    `dry run: ${captured.length} requests built and checked; nothing was sent and no results were written`,
  );
}

/**
 * Live run: interleave the two conditions (run i with purpose, then run i without), so server
 * warm-up and drift fall evenly on both, then send the one text-only baseline. Results are
 * rewritten after every request.
 */
async function runLive(
  inputs: SpikeInputs,
  runs: number,
  apiKey: string,
): Promise<void> {
  const client = makeClient(apiKey, undefined);
  const screenshot = image(inputs.imageBytes);
  const withPurpose = buildRequest(
    screenshot,
    inputs.purpose,
    inputs.questions,
  );
  const withoutPurpose = buildRequest(screenshot, null, inputs.questions);
  const createdAt = new Date().toISOString();
  const stamp = toFileStamp(createdAt);
  let isFirstRequest = true;
  const runsByCondition: Record<Condition, RunRecord[]> = {
    with_purpose: [],
    without_purpose: [],
  };
  let written: string[] = [];
  for (let runNumber = 1; runNumber <= runs; runNumber++) {
    const conditionRequests: [Condition, BuiltRequest][] = [
      ["with_purpose", withPurpose],
      ["without_purpose", withoutPurpose],
    ];
    for (const [condition, request] of conditionRequests) {
      const record = await sendRequest(
        client,
        request,
        inputs.questions,
        runNumber,
        isFirstRequest,
        `${stamp}-${condition}-run-${runNumber}.json`,
      );
      isFirstRequest = false;
      runsByCondition[condition].push(record);
      written = await writeResults(inputs, createdAt, runsByCondition, null);
      console.log(
        `${condition} run ${runNumber}: ${record.latency_ms} ms, ${String(record.input_tokens)} input tokens`,
      );
    }
  }
  const baseline = await sendRequest(
    client,
    buildTextOnlyRequest(inputs.questions),
    inputs.questions,
    1,
    false,
    `${stamp}-baseline_text_only.json`,
  );
  written = await writeResults(inputs, createdAt, runsByCondition, baseline);
  console.log(
    `baseline_text_only: ${baseline.latency_ms} ms, ${String(baseline.input_tokens)} input tokens`,
  );
  console.log(`wrote ${written.join(" and ")}`);
}

/** Read the flags and inputs, then do a dry run or a live run. Exit code 2 means it could not run. */
async function main(): Promise<void> {
  try {
    const flags = readFlags(process.argv.slice(2));
    const inputs = await readInputs();
    if (flags.dryRun) {
      await runDry(inputs);
      return;
    }
    const apiKey = process.env.TYPESAFE_API_KEY;
    if (apiKey === undefined || apiKey === "") {
      console.error("TYPESAFE_API_KEY is not set");
      process.exitCode = 2;
      return;
    }
    await runLive(inputs, flags.runs, apiKey);
  } catch (error) {
    console.error(describeFailure(error));
    process.exitCode = 2;
  }
}

await main();
