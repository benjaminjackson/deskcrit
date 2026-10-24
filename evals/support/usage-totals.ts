// The summed usage that the agreement harness (EV-4, EV-5) and the compare agreement script (EV-9)
// print once at the end of a run (FR-26, FR-33). It is plain arithmetic on values and imports
// nothing, so both scripts share it instead of keeping two copies.

/** The usage object of one crit document, as the report and compare schemas write it (FR-23, FR-33). */
export type RunUsage = {
  readonly requests: number;
  readonly input_tokens: number | null;
  readonly cost_usd: number | null;
  readonly latency_ms: number;
};

/** The summed usage of every crit run, null where any run had no token count or cost (FR-23, FR-33). */
export type UsageTotals = {
  requests: number;
  input_tokens: number | null;
  cost_usd: number | null;
  latency_ms: number;
};

/** Add one document's usage to the totals; a null token count or cost makes that total null (FR-33). */
export function addUsage(totals: UsageTotals, usage: RunUsage): void {
  totals.requests += usage.requests;
  totals.latency_ms += usage.latency_ms;
  if (totals.input_tokens === null || usage.input_tokens === null) {
    totals.input_tokens = null;
  } else {
    totals.input_tokens += usage.input_tokens;
  }
  if (totals.cost_usd === null || usage.cost_usd === null) {
    totals.cost_usd = null;
  } else {
    totals.cost_usd += usage.cost_usd;
  }
}
