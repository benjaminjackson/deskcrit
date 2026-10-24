// Disposable unit tests for the adapter's failure path (FR-24, NFR-14, CS-19). The unreachable test
// runs the real SDK against a closed local port. The status tests pass real SDK error objects,
// built as plain values, so no fake SDK or fake server is needed (CS-22).

import {
  APIConnectionError,
  APITimeoutError,
  AuthenticationError,
  InternalServerError,
  RateLimitError,
} from "@typesafe-ai/sdk";
import { expect, test } from "vitest";
import { CouldNotRunError } from "../../shared/could-not-run-error.js";
import { IMAGE_STATE_PATH, type State } from "../../shared/state.js";
import { createTypeSafeAdapter, describeTypeSafeFailure } from "./adapter.js";

const knownKey = "ts-test-key-0123456789abcdef";

const state: State = {
  [IMAGE_STATE_PATH]: {
    format: "png",
    bytes: new Uint8Array([137, 80, 78, 71, 1, 2, 3]),
    width: 400,
    height: 300,
  },
};

/** Build response headers that repeat the key and the danger-zone header, as a careless server might. */
function buildLeakyHeaders(): Headers {
  return new Headers({
    authorization: `Bearer ${knownKey}`,
    "typesafe-danger-zone-images": "true",
    "x-typesafe-request-id": "request-123",
  });
}

test("an unreachable TypeSafe throws CouldNotRunError that says so and holds no key", async () => {
  // Port 9 is the discard port, closed on a normal machine, so the connection is refused at once.
  const adapter = createTypeSafeAdapter({
    apiKey: knownKey,
    baseURL: "http://127.0.0.1:9",
  });
  const attempt = adapter.askQuestions({
    state,
    questions: [
      {
        id: "layout/crowded",
        criterion: "layout/crowded",
        type: "noul",
        instructions: "Is the image at `screenshot` crowded?",
        criteria: { true: "Crowded.", false: "Not crowded." },
      },
    ],
  });
  await expect(attempt).rejects.toBeInstanceOf(CouldNotRunError);
  await expect(attempt).rejects.toThrow(/unreachable/);
  await attempt.catch((error: unknown) => {
    expect(String(error)).not.toContain(knownKey);
  });
});

test("an HTTP error becomes the status and a short reason, with nothing from the response", () => {
  const sdkError = new AuthenticationError(
    401,
    { error: `bad key ${knownKey}` },
    buildLeakyHeaders(),
    `401 bad key ${knownKey}`,
  );
  const error = describeTypeSafeFailure(sdkError);
  expect(error).toBeInstanceOf(CouldNotRunError);
  expect(error.message).toBe(
    "TypeSafe returned HTTP 401: the API key was rejected",
  );
  expect(error.message).not.toContain(knownKey);
  expect(error.message.toLowerCase()).not.toContain("danger-zone");
  expect(error.message).not.toContain("request-123");
});

test("rate limits and server errors keep their status", () => {
  const rateLimited = describeTypeSafeFailure(
    new RateLimitError(429, null, new Headers()),
  );
  expect(rateLimited.message).toBe("TypeSafe returned HTTP 429: rate limited");
  const serverError = describeTypeSafeFailure(
    new InternalServerError(503, null, new Headers()),
  );
  expect(serverError.message).toBe(
    "TypeSafe returned HTTP 503: TypeSafe had a server error",
  );
});

test("a timeout and a connection error say what happened and nothing else", () => {
  const timedOut = describeTypeSafeFailure(new APITimeoutError(10_000));
  expect(timedOut.message).toMatch(/did not answer within/);
  const unreachable = describeTypeSafeFailure(
    new APIConnectionError(`connect failed with key ${knownKey}`),
  );
  expect(unreachable.message).toBe(
    "TypeSafe could not be reached (unreachable)",
  );
});

test("any other thrown value becomes a fixed message", () => {
  const error = describeTypeSafeFailure(new Error(`boom ${knownKey}`));
  expect(error).toBeInstanceOf(CouldNotRunError);
  expect(error.message).toBe("the TypeSafe call failed");
});

test("an empty API key is refused before any request", () => {
  expect(() => createTypeSafeAdapter({ apiKey: "" })).toThrow(/API key/);
});
