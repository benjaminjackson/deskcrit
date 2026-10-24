// The one real TypeSafe adapter: it sends one request per image with the official SDK and turns
// the answer into crit's typed answers and usage (FR-19, FR-20, FR-23, AC-8). It reads no
// environment variable, file, or console: the CLI passes the key and the pinned model (CS-6, CS-19).

import {
  APIConnectionError,
  APIError,
  APITimeoutError,
  TypeSafeClient,
} from "@typesafe-ai/sdk";
import { CouldNotRunError } from "../../shared/could-not-run-error.js";
import { IMAGE_STATE_PATH } from "../../shared/state.js";
import type { AskRequest, AskResult, TypeSafeAdapter } from "../adapter.js";
import {
  buildTypeSafeRequest,
  chooseModelId,
  readTypeSafeResponse,
} from "./request.js";

/** The TypeSafe API address. Set here so the SDK never falls back to TYPESAFE_BASE_URL (CS-6). */
export const TYPESAFE_BASE_URL = "https://api.typesafe.ai";

/**
 * How long one request may take before the run stops, in milliseconds (FR-24). Provisional: the
 * PRD sets no timeout. M-1 measured at most 905 ms for an image request with twenty questions (JC-10).
 */
export const TYPESAFE_TIMEOUT_MS = 10_000;

/** What the CLI passes in: the key from TYPESAFE_API_KEY, and the model pinned in `.crit.yaml` if any (FR-22, CS-19). */
export type TypeSafeAdapterOptions = {
  readonly apiKey: string;
  readonly model?: string;
  readonly baseURL?: string;
};

/**
 * Make the real adapter (FR-20, CS-11). Every SDK default that could read the environment, log a
 * request body, retry, or send `jev-latest` is set by hand (CS-6, FR-22, NFR-14). An empty key is
 * a broken invariant, because the CLI checks for the key before it makes the adapter.
 */
export function createTypeSafeAdapter(
  options: TypeSafeAdapterOptions,
): TypeSafeAdapter {
  if (options.apiKey === "") {
    throw new Error("createTypeSafeAdapter needs a non-empty API key");
  }
  const model = chooseModelId(options.model);
  const client = new TypeSafeClient({
    apiKey: options.apiKey,
    baseURL: options.baseURL ?? TYPESAFE_BASE_URL,
    defaultModel: model,
    logLevel: "off",
    timeout: TYPESAFE_TIMEOUT_MS,
    retry: { maxRetries: 0 },
  });
  return {
    askQuestions: async (request: AskRequest): Promise<AskResult> => {
      const built = buildTypeSafeRequest(
        request.state,
        request.questions,
        model,
      );
      const startedAt = performance.now();
      let response: unknown;
      try {
        response = await client.systemOne(built.body, built.options);
      } catch (error) {
        throw describeTypeSafeFailure(error);
      }
      const latencyMs = performance.now() - startedAt;
      const preparedImage = request.state[IMAGE_STATE_PATH];
      const checked = readTypeSafeResponse(response, request.questions, {
        width: preparedImage.width,
        height: preparedImage.height,
      });
      return {
        answers: checked.answers,
        usage: { ...checked.usage, latency_ms: latencyMs },
      };
    },
  };
}

/**
 * Turn whatever the SDK threw into a CouldNotRunError built from fixed text and the HTTP status
 * only, never the SDK's message, body, headers, or request id, which can repeat the key (FR-24,
 * NFR-14, CS-19). The timeout check comes first, because a timeout is also a connection error.
 */
export function describeTypeSafeFailure(error: unknown): CouldNotRunError {
  if (error instanceof APITimeoutError) {
    return new CouldNotRunError(
      `TypeSafe did not answer within ${TYPESAFE_TIMEOUT_MS} ms`,
    );
  }
  if (error instanceof APIConnectionError) {
    return new CouldNotRunError("TypeSafe could not be reached (unreachable)");
  }
  if (error instanceof APIError) {
    return new CouldNotRunError(
      `TypeSafe returned HTTP ${error.status}: ${describeStatus(error.status)}`,
    );
  }
  return new CouldNotRunError("the TypeSafe call failed");
}

/** Give a short reason for an HTTP status, in words that hold nothing from the response (CS-19). */
function describeStatus(status: number): string {
  if (status === 401 || status === 403) {
    return "the API key was rejected";
  }
  if (status === 429) {
    return "rate limited";
  }
  if (status >= 500) {
    return "TypeSafe had a server error";
  }
  return "the request was rejected";
}
