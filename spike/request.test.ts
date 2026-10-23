// Cheap checks for the spike request builder (CS-20). No key and no network: the SDK sends into a
// fetch that records the bytes. Disposable, like the rest of spike/.

import assert from "node:assert/strict";
import { test } from "node:test";
import { Image, image, TypeSafeClient } from "@typesafe-ai/sdk";
import {
  buildRequest,
  buildStandInResponse,
  DANGER_ZONE_HEADERS,
  PINNED_MODEL,
  parseQuestionFile,
  parseResponse,
  readWireRequest,
  type SpikeQuestion,
  type WireRequest,
} from "./request.ts";

/** The smallest valid PNG header bytes; the SDK only needs non-empty bytes to build a request. */
const PNG_BYTES = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
]);

/** Make twenty questions in the questions.yaml shape: one score, one choice, and eighteen noul. */
function makeQuestionFile(): unknown[] {
  const entries: unknown[] = [
    {
      id: "score-one",
      question: {
        type: "score",
        instructions: "How long?",
        levels: ["fine", "long", "too long"],
      },
    },
    {
      id: "choice-one",
      question: {
        type: "choice",
        instructions: "Which?",
        criteria: { even: "Even.", sparse: "Sparse." },
      },
    },
  ];
  for (let index = 0; index < 18; index++) {
    entries.push({
      id: `noul-${index}`,
      question: {
        type: "noul",
        instructions: "In the image at screenshot, is it bad?",
        criteria: { true: "Bad.", false: "Fine." },
      },
    });
  }
  return entries;
}

/** Count Image objects anywhere inside a value, to show the image is in the state exactly once. */
function countImages(value: unknown): number {
  if (value instanceof Image) {
    return 1;
  }
  if (typeof value !== "object" || value === null) {
    return 0;
  }
  let count = 0;
  for (const child of Object.values(value)) {
    count += countImages(child);
  }
  return count;
}

/** Send one built request through the real SDK into a recording fetch and return the wire view. */
async function captureWire(
  questions: SpikeQuestion[],
  purpose: string | null,
): Promise<WireRequest> {
  const captured: WireRequest[] = [];
  const client = new TypeSafeClient({
    apiKey: "test-placeholder",
    logLevel: "off",
    retry: { maxRetries: 0 },
    fetch: async (_url, init) => {
      captured.push(
        readWireRequest(
          init?.headers,
          new Uint8Array(await new Response(init?.body).arrayBuffer()),
        ),
      );
      return new Response(JSON.stringify(buildStandInResponse(questions)), {
        headers: { "content-type": "application/json" },
      });
    },
  });
  const request = buildRequest(image(PNG_BYTES), purpose, questions);
  await client.systemOne(request.body, request.options);
  const wire = captured[0];
  assert.ok(wire);
  return wire;
}

test("buildRequest pins the model, adds the header, and holds the image once", () => {
  const questions = parseQuestionFile(makeQuestionFile());
  const withPurpose = buildRequest(image(PNG_BYTES), "A page.", questions);
  const withoutPurpose = buildRequest(image(PNG_BYTES), null, questions);
  assert.equal(PINNED_MODEL, "jev-1.14.0");
  assert.equal(withPurpose.body.model, PINNED_MODEL);
  assert.deepEqual(withPurpose.options.headers, DANGER_ZONE_HEADERS);
  assert.equal(countImages(withPurpose.body.state), 1);
  assert.equal(countImages(withPurpose.body.questions), 0);
  assert.deepEqual(Object.keys(withPurpose.body.state), [
    "screenshot",
    "purpose",
  ]);
  assert.deepEqual(Object.keys(withoutPurpose.body.state), ["screenshot"]);
  assert.equal(Object.keys(withPurpose.body.questions).length, 20);
});

test("the wire request carries the header, the pinned model, and one image part", async () => {
  const questions = parseQuestionFile(makeQuestionFile());
  const wire = await captureWire(questions, null);
  assert.equal(wire.danger_zone_header, "true");
  assert.equal(wire.model, "jev-1.14.0");
  assert.equal(wire.image_part_count, 1);
  assert.equal(wire.image_reference_count, 1);
  assert.equal(wire.question_count, 20);
  assert.equal(wire.content_type, "multipart/form-data");
});

test("parseResponse maps noul to true and false and marks its confidence as not reported", () => {
  const questions = parseQuestionFile(makeQuestionFile());
  // A JSON round trip gives a plain copy of the stand-in answer that the test can change.
  const raw = JSON.parse(JSON.stringify(buildStandInResponse(questions)));
  raw.answers["noul-0"] = { type: "noul", noul: 0.2 };
  raw.usage = { input_tokens: 1000, output_tokens: null };
  const answers = parseResponse(raw, questions);
  const noulRecord = answers.questions.find((record) => record.id === "noul-0");
  assert.deepEqual(noulRecord?.distribution, { true: 0.2, false: 1 - 0.2 });
  assert.equal(noulRecord?.confidence, null);
  assert.equal(noulRecord?.confidence_reported, false);
  assert.equal(noulRecord?.derived_confidence, 0.8);
  assert.throws(() =>
    parseResponse({ model: PINNED_MODEL, usage: {}, answers: {} }, questions),
  );
});
