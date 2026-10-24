// The report document that compose returns, in the wire shape of docs/PRD.md section 8.1 and
// schemas/report.schema.json. Field names are the wire names, in snake_case (CS-10). The JSON
// renderer (crit-cy8.10) writes this object as it is.

import type { Region } from "../shared/answer.js";
import type { Context } from "../shared/state.js";
import type { Verdict } from "./verdict.js";

/**
 * The version of the report shape. The PRD 8.1 example gives "1.0.0", and the shape changes only
 * by adding optional fields (section 8, AC-2, CS-15).
 */
export const REPORT_SCHEMA_VERSION = "1.0.0";

/** The mode of this document. The gate document reuses the shape with mode "gate" (section 8.1, 8.3, CS-15). */
export const REPORT_MODE = "report";

/** The image that was judged: its path and its original size. `padded` is present only when true (FR-8). */
export type ReportImage = {
  readonly path: string;
  readonly width: number;
  readonly height: number;
  readonly padded?: true;
};

/** One pack the run used, by name and version (section 8.1). */
export type ReportPack = {
  readonly name: string;
  readonly version: string;
};

/** One judged criterion, with the ten fields of FR-26. `region` is in pixels of the original image (FR-8). */
export type Finding = {
  readonly criterion: string;
  readonly title: string;
  readonly verdict: Verdict;
  readonly distribution: Readonly<Record<string, number>>;
  readonly confidence: number | null;
  readonly region: Region | null;
  readonly source: string;
  readonly link: string | null;
  readonly fix: string;
  readonly model: string;
};

/** A criterion that build did not ask, and why (FR-12, FR-13). */
export type ReportSkipped = {
  readonly criterion: string;
  readonly reason: string;
};

/** What the run cost (FR-33). It holds no model id: that is in the top-level `model` field. */
export type ReportUsage = {
  readonly requests: number;
  readonly input_tokens: number | null;
  readonly cost_usd: number | null;
  readonly latency_ms: number;
};

/** The whole report document (section 8.1, US-1). */
export type Report = {
  readonly schema_version: typeof REPORT_SCHEMA_VERSION;
  readonly mode: typeof REPORT_MODE;
  readonly tool: { readonly name: string; readonly version: string };
  readonly image: ReportImage;
  readonly context: Context;
  readonly packs: readonly ReportPack[];
  readonly model: string;
  readonly findings: readonly Finding[];
  readonly skipped: readonly ReportSkipped[];
  readonly usage: ReportUsage;
};
