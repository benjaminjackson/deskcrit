// The JSON renderer for `crit report --json` (FR-31). It is pure: it returns a string and the
// command writes it (CS-6, CS-17). It adds, drops, rounds, and reorders nothing, because compose
// already built and sorted the document (FR-28, CS-18).

import type { Report } from "../compose/report.js";

/** How many spaces each level of the JSON output is indented. */
const JSON_INDENT_SPACES = 2;

/**
 * Turns the report document into one JSON document with a trailing newline, exactly as compose
 * built it, so it matches the section 8.1 schema (FR-31, CS-18).
 */
export function renderReportJson(report: Report): string {
  return `${JSON.stringify(report, null, JSON_INDENT_SPACES)}\n`;
}
