/**
 * The usage object an adapter returns for one ask call (FR-20, FR-23). It carries the model id and
 * no request count. Compose builds the report's usage object from it, counts requests, and moves
 * the model id to the report's `model` field (FR-33).
 */
export type Usage = {
  readonly input_tokens: number;
  readonly cost_usd: number;
  readonly latency_ms: number;
  readonly model: string;
};
