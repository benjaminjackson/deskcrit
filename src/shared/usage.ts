/**
 * The usage object an adapter returns for one ask call (FR-20, FR-23). It carries the model id and
 * no request count. Compose builds the report's usage object from it, counts requests, and moves
 * the model id to the report's `model` field (FR-33). `input_tokens` and `cost_usd` are null when
 * TypeSafe returned no token count, so the cost is unknown and the paid answers are kept (FR-23).
 */
export type Usage = {
  readonly input_tokens: number | null;
  readonly cost_usd: number | null;
  readonly latency_ms: number;
  readonly model: string;
};
