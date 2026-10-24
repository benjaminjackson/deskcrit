// The overview spike runner (crit-zs9, PRD M-1). It asks Jev the twenty questions in
// spike/questions.yaml about spike/slice.png two ways, both with the purpose line: once with the
// slice alone, and once with the slice plus a downscaled copy of the whole page
// (spike/page-overview.png) that has an outline where the slice sits. Each question judges the
// image at `slice`; the overview variant adds one sentence that lets the question use `page` as
// context only. Every other word of each question is the same as in questions.yaml.
// Disposable spike code: it does its own file and network I/O, because CS-5 and CS-6 govern src/.
//
// Usage, from the repository root:
//   node spike/overview.ts make-image   writes spike/page-overview.png from spike/screenshot.png
//   node spike/overview.ts dry-run      builds and checks both requests; needs no key, sends nothing
//   node spike/overview.ts live         live and paid; needs TYPESAFE_API_KEY

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import {
  APIError,
  type Image,
  image,
  type Questions,
  TypeSafeClient,
  TypeSafeError,
  VERSION,
} from "@typesafe-ai/sdk";
import sharp from "sharp";
import { parse } from "yaml";
import {
  type BuiltRequest,
  buildStandInResponse,
  checkImageSize,
  computeCostUsd,
  DANGER_ZONE_HEADERS,
  IMAGE_AREA_MAX,
  PINNED_MODEL,
  PRICE_USD_PER_INPUT_TOKEN,
  parseQuestionFile,
  parseResponse,
  type QuestionRecord,
  readPngSize,
  readWireRequest,
  type SpikeQuestion,
  summarizeNumbers,
  toSdkQuestion,
} from "./request.ts";

/** Runs per variant, the same count the M-1 runs kept, so compare.ts joins them the same way. */
const RUNS = 5;

/** Timeout for one attempt. The SDK default of 10 s is too short for an image request. */
const REQUEST_TIMEOUT_MS = 120_000;

/** The repository root, so paths in the results read the same from any folder. */
const REPOSITORY_ROOT = fileURLToPath(new URL("..", import.meta.url));

/** The opening every question in questions.yaml has, and what each variant puts in its place. */
const ORIGINAL_OPENING = "In the image at screenshot, ";
const SLICE_OPENING = "In the image at `slice`, ";

/**
 * The one sentence the overview variant adds before each question. It names `page` as context for
 * where the slice sits and nothing more, so the question still judges `slice` alone.
 */
const OVERVIEW_SENTENCE =
  "The image at `page` is the whole page, scaled down, with a red outline around the part shown in `slice`; use `page` only as context for where `slice` sits on the page. ";

/** The page height in CSS px, from spike/ATTRIBUTION.md. Both captures are 1280 x 3899 CSS px. */
const PAGE_HEIGHT_CSS_PX = 3899;

/** The crop rectangle of spike/slice.png in CSS px, from spike/ATTRIBUTION.md. */
const SLICE_TOP_CSS_PX = 520;
const SLICE_BOTTOM_CSS_PX = 2040;

/**
 * The height of the overview image. The slice is 1280 x 1520 = 1,945,600 px, so the overview may
 * hold at most 2,458,624 - 1,945,600 = 513,024 px to keep the two images inside the area limit
 * together. 1248 px high gives 410 x 1248 = 511,680 px.
 */
const OVERVIEW_HEIGHT_PX = 1248;

/** The outline's line width in px, and its colour. A plain red line, nothing else drawn. */
const OUTLINE_WIDTH_PX = 4;
const OUTLINE_COLOUR = "#ff0000";

/** The two variants, in the order the results and the CSV files list them. */
type Variant = "slice_alone" | "slice_with_overview";

/** One kept request, as it goes into a results file (the same fields run.ts writes). */
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

/** Facts about one image file, recorded in each results file. */
type ImageInfo = {
  path: string;
  sha256: string;
  width: number;
  height: number;
  bytes: number;
};

/** Everything both requests need, read once at the start. */
type Inputs = {
  sliceBytes: Uint8Array;
  sliceInfo: ImageInfo;
  overviewBytes: Uint8Array;
  overviewInfo: ImageInfo;
  questionsSha256: string;
  questions: SpikeQuestion[];
  purpose: string;
};

/** Return the sha256 of some bytes as hex. */
function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Write spike/page-overview.png: spike/screenshot.png scaled to 1248 px high, with a red outline
 * around the rows that spike/slice.png holds (CSS rows 520 to 2040 across the full width).
 */
async function makeOverviewImage(): Promise<void> {
  const screenshotPath = `${REPOSITORY_ROOT}spike/screenshot.png`;
  const resized = await sharp(screenshotPath)
    .resize({ height: OVERVIEW_HEIGHT_PX })
    .png()
    .toBuffer({ resolveWithObject: true });
  const width = resized.info.width;
  const height = resized.info.height;
  const pxPerCssPx = height / PAGE_HEIGHT_CSS_PX;
  const top = Math.round(SLICE_TOP_CSS_PX * pxPerCssPx);
  const bottom = Math.round(SLICE_BOTTOM_CSS_PX * pxPerCssPx);
  // An SVG rectangle strokes half its line on each side of its edge, so inset it by half the
  // line width to keep the whole line inside the image.
  const half = OUTLINE_WIDTH_PX / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
<rect x="${half}" y="${top + half}" width="${width - OUTLINE_WIDTH_PX}" height="${bottom - top - OUTLINE_WIDTH_PX}" fill="none" stroke="${OUTLINE_COLOUR}" stroke-width="${OUTLINE_WIDTH_PX}"/>
</svg>`;
  const outlined = await sharp(resized.data)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .png()
    .toBuffer();
  await writeFile(`${REPOSITORY_ROOT}spike/page-overview.png`, outlined);
  console.log(
    `wrote spike/page-overview.png: ${width}x${height} px, outline rows ${top} to ${bottom}`,
  );
}

/** Read one PNG under the repository root, check its size, and describe it. */
async function readImage(
  repositoryPath: string,
): Promise<{ bytes: Uint8Array; info: ImageInfo }> {
  const bytes = new Uint8Array(
    await readFile(`${REPOSITORY_ROOT}${repositoryPath}`),
  );
  const size = readPngSize(bytes);
  checkImageSize(size.width, size.height);
  return {
    bytes,
    info: {
      path: repositoryPath,
      sha256: hashBytes(bytes),
      width: size.width,
      height: size.height,
      bytes: bytes.byteLength,
    },
  };
}

/** Read and check both images, the questions, and the purpose line. */
async function readInputs(): Promise<Inputs> {
  const slice = await readImage("spike/slice.png");
  const overview = await readImage("spike/page-overview.png");
  const totalArea =
    slice.info.width * slice.info.height +
    overview.info.width * overview.info.height;
  if (totalArea > IMAGE_AREA_MAX) {
    throw new Error(
      `the two images hold ${totalArea} px together, over ${IMAGE_AREA_MAX} px`,
    );
  }
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
    sliceBytes: slice.bytes,
    sliceInfo: slice.info,
    overviewBytes: overview.bytes,
    overviewInfo: overview.info,
    questionsSha256: hashBytes(questionBytes),
    questions,
    purpose,
  };
}

/**
 * Return the instructions one variant sends for one question. Only the opening changes from
 * questions.yaml; the overview variant also puts the one context sentence in front.
 */
function rewordInstructions(original: string, variant: Variant): string {
  if (!original.startsWith(ORIGINAL_OPENING)) {
    throw new Error(`question does not start with "${ORIGINAL_OPENING}"`);
  }
  const rest = original.slice(ORIGINAL_OPENING.length);
  if (variant === "slice_alone") {
    return `${SLICE_OPENING}${rest}`;
  }
  return `${OVERVIEW_SENTENCE}${SLICE_OPENING}${rest}`;
}

/** Turn the questions into the SDK's map of question name to question for one variant. */
function buildQuestions(
  questions: SpikeQuestion[],
  variant: Variant,
): Questions {
  const result: Questions = {};
  for (const question of questions) {
    const sdkQuestion = toSdkQuestion(question);
    sdkQuestion.instructions = rewordInstructions(
      question.instructions,
      variant,
    );
    result[question.id] = sdkQuestion;
  }
  return result;
}

/** Build one variant's request: the slice, the page overview only in that variant, and the purpose. */
function buildVariantRequest(
  variant: Variant,
  slice: Image,
  overview: Image,
  inputs: Inputs,
): BuiltRequest {
  let state: Record<string, Image | string>;
  if (variant === "slice_alone") {
    state = { slice, purpose: inputs.purpose };
  } else {
    state = { slice, page: overview, purpose: inputs.purpose };
  }
  return {
    body: {
      model: PINNED_MODEL,
      state,
      questions: buildQuestions(inputs.questions, variant),
    },
    options: { headers: { ...DANGER_ZONE_HEADERS } },
  };
}

/** Make the client: fixed base URL and model, logging off, a long timeout, and no retries. */
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

/** Write one raw response body to spike/results/overview/raw/ before it is parsed. Never overwrites. */
async function writeRawResponse(
  fileName: string,
  raw: unknown,
): Promise<string> {
  const folder = new URL("./results/overview/raw/", import.meta.url);
  await mkdir(folder, { recursive: true });
  await writeFile(
    new URL(fileName, folder),
    `${JSON.stringify(raw, null, 2)}\n`,
    { flag: "wx" },
  );
  return `spike/results/overview/raw/${fileName}`;
}

/** Send one request, time it, keep the raw response, and check it. */
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
  return {
    run: runNumber,
    cold_start: coldStart,
    started_at: startedAt,
    model: parsed.model,
    model_matches_pinned: parsed.model === PINNED_MODEL,
    raw_response_file: rawResponseFile,
    input_tokens: parsed.input_tokens,
    output_tokens: parsed.output_tokens,
    cost_usd: computeCostUsd(parsed.input_tokens),
    latency_ms: Math.round((after - before) * 10) / 10,
    questions: parsed.questions,
  };
}

/** Collect the non-null numbers from a list. */
function keepNumbers(values: (number | null)[]): number[] {
  const numbers: number[] = [];
  for (const value of values) {
    if (value !== null) {
      numbers.push(value);
    }
  }
  return numbers;
}

/**
 * Build one variant's results file. The fields compare.ts reads have the same names and meaning
 * as in the files run.ts writes; `variant` says which of the two this is, and `questions_file`
 * names questions.yaml, the source every reworded question comes from.
 */
function buildResultsFile(
  variant: Variant,
  inputs: Inputs,
  createdAt: string,
  runs: RunRecord[],
  sentInstructions: Record<string, string>,
): unknown {
  const latencies: number[] = [];
  const inputTokens: (number | null)[] = [];
  const costs: (number | null)[] = [];
  let modelMismatchRuns = 0;
  for (const run of runs) {
    latencies.push(run.latency_ms);
    inputTokens.push(run.input_tokens);
    costs.push(run.cost_usd);
    if (!run.model_matches_pinned) {
      modelMismatchRuns++;
    }
  }
  let overviewImage: ImageInfo | null = null;
  if (variant === "slice_with_overview") {
    overviewImage = inputs.overviewInfo;
  }
  return {
    ticket: "crit-zs9",
    variant,
    condition: "with_purpose",
    created_at: createdAt,
    model_requested: PINNED_MODEL,
    sdk: `@typesafe-ai/sdk@${VERSION}`,
    node_version: process.version,
    image: inputs.sliceInfo,
    overview_image: overviewImage,
    questions_file: {
      path: "spike/questions.yaml",
      sha256: inputs.questionsSha256,
      count: inputs.questions.length,
    },
    wording_note: `each question's instructions are the questions.yaml text with "${ORIGINAL_OPENING}" replaced by "${SLICE_OPENING}"; the slice_with_overview variant also puts this sentence first: "${OVERVIEW_SENTENCE.trim()}"`,
    sent_instructions: sentInstructions,
    purpose: inputs.purpose,
    cost_source: `computed from usage.input_tokens at $${PRICE_USD_PER_INPUT_TOKEN * 1_000_000} per million input tokens (JC-10); the SDK reports no cost`,
    latency_source:
      "wall clock around client.systemOne, including image upload and compression, with retries off",
    runs,
    summary: {
      runs: runs.length,
      latency_ms: summarizeNumbers(latencies),
      model_mismatch_runs: modelMismatchRuns,
      request_input_tokens: summarizeNumbers(keepNumbers(inputTokens)),
      image_input_tokens_estimate: null,
      cost_usd_per_request: summarizeNumbers(keepNumbers(costs)),
      image_cost_usd_estimate: null,
      order_note:
        "each run sends one slice_alone and one slice_with_overview request; odd runs send slice_alone first and even runs send slice_with_overview first",
      baseline_text_only: null,
    },
  };
}

/** Return each question's instructions as one variant sends them, keyed by question id. */
function listSentInstructions(request: BuiltRequest): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [id, question] of Object.entries(request.body.questions)) {
    result[id] = String(question.instructions);
  }
  return result;
}

/** Turn any thrown value into a short line with no key, no headers, and no raw body (CS-19). */
function describeFailure(error: unknown): string {
  if (error instanceof APIError) {
    return `TypeSafe request failed: HTTP ${error.status} (${error.constructor.name})`;
  }
  if (error instanceof TypeSafeError) {
    return `TypeSafe request failed: ${error.constructor.name}`;
  }
  if (error instanceof Error) {
    return `spike failed: ${error.constructor.name}: ${error.message}`;
  }
  return "spike failed: unknown error";
}

/** Send both requests through the real SDK into a fetch that records the bytes. Sends nothing. */
async function runDry(inputs: Inputs): Promise<void> {
  const recordingFetch = async (
    _url: string | URL | Request,
    init?: RequestInit,
  ): Promise<Response> => {
    const body = new Uint8Array(await new Response(init?.body).arrayBuffer());
    const wire = readWireRequest(init?.headers, body);
    let stateKeys = "";
    if (typeof wire.state === "object" && wire.state !== null) {
      stateKeys = Object.keys(wire.state).join(", ");
    }
    console.log(
      `model ${String(wire.model)}, ${wire.question_count} questions, ${wire.image_part_count} image part(s), ${wire.image_reference_count} image reference(s), danger-zone header ${wire.danger_zone_header ?? "absent"}, state keys [${stateKeys}]`,
    );
    return new Response(
      JSON.stringify(buildStandInResponse(inputs.questions)),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
  const client = makeClient("dry-run-placeholder-not-a-key", recordingFetch);
  const slice = image(inputs.sliceBytes);
  const overview = image(inputs.overviewBytes);
  for (const variant of ["slice_alone", "slice_with_overview"] as const) {
    const request = buildVariantRequest(variant, slice, overview, inputs);
    process.stdout.write(`${variant}: `);
    await sendRequest(client, request, inputs.questions, 1, false, null);
    const first = Object.values(listSentInstructions(request))[0];
    console.log(`  first question: ${String(first)}`);
  }
  console.log("dry run: nothing was sent and no results were written");
}

/** Live run: five runs of both variants, alternating which goes first, results rewritten after every request. */
async function runLive(inputs: Inputs, apiKey: string): Promise<void> {
  const client = makeClient(apiKey, undefined);
  const slice = image(inputs.sliceBytes);
  const overview = image(inputs.overviewBytes);
  const requests: Record<Variant, BuiltRequest> = {
    slice_alone: buildVariantRequest("slice_alone", slice, overview, inputs),
    slice_with_overview: buildVariantRequest(
      "slice_with_overview",
      slice,
      overview,
      inputs,
    ),
  };
  const createdAt = new Date().toISOString();
  const stamp = createdAt.replaceAll(":", "-").replaceAll(".", "-");
  const runsByVariant: Record<Variant, RunRecord[]> = {
    slice_alone: [],
    slice_with_overview: [],
  };
  const folder = new URL("./results/overview/", import.meta.url);
  await mkdir(folder, { recursive: true });
  let isFirstRequest = true;
  for (let runNumber = 1; runNumber <= RUNS; runNumber++) {
    const order: Variant[] = ["slice_alone", "slice_with_overview"];
    if (runNumber % 2 === 0) {
      order.reverse();
    }
    for (const variant of order) {
      const record = await sendRequest(
        client,
        requests[variant],
        inputs.questions,
        runNumber,
        isFirstRequest,
        `${stamp}-${variant}-run-${runNumber}.json`,
      );
      isFirstRequest = false;
      runsByVariant[variant].push(record);
      const contents = buildResultsFile(
        variant,
        inputs,
        createdAt,
        runsByVariant[variant],
        listSentInstructions(requests[variant]),
      );
      await writeFile(
        new URL(`${stamp}-${variant.replaceAll("_", "-")}.json`, folder),
        `${JSON.stringify(contents, null, 2)}\n`,
      );
      console.log(
        `${variant} run ${runNumber}: ${record.latency_ms} ms, ${String(record.input_tokens)} input tokens`,
      );
    }
  }
  console.log(`wrote spike/results/overview/${stamp}-*.json`);
}

/** Read the command, then make the image, do a dry run, or do a live run. Exit code 2 means it could not run. */
async function main(): Promise<void> {
  try {
    const command = process.argv[2];
    if (command === "make-image") {
      await makeOverviewImage();
      return;
    }
    if (command !== "dry-run" && command !== "live") {
      throw new Error("use make-image, dry-run, or live");
    }
    const inputs = await readInputs();
    if (command === "dry-run") {
      await runDry(inputs);
      return;
    }
    const apiKey = process.env.TYPESAFE_API_KEY;
    if (apiKey === undefined || apiKey === "") {
      console.error("TYPESAFE_API_KEY is not set");
      process.exitCode = 2;
      return;
    }
    await runLive(inputs, apiKey);
  } catch (error) {
    console.error(describeFailure(error));
    process.exitCode = 2;
  }
}

await main();
