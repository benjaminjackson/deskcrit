// The report example from docs/PRD.md section 8.1, copied without changes, as the shared input for
// the renderer unit tests (CS-22). If the PRD example changes, change this copy in the same pull
// request. Only tests import this file.

import type { Report } from "../compose/report.js";

/** The PRD section 8.1 example report: one `noul` fail with a link, one `score` warn without one. */
export const prdExampleReport: Report = {
  schema_version: "1.0.0",
  mode: "report",
  tool: { name: "deskcrit", version: "0.1.0" },
  image: { path: "home.png", width: 1440, height: 900 },
  context: {
    purpose: "landing page",
    audience: "small business owners",
    platform: "web",
  },
  packs: [{ name: "typography", version: "1.0.0" }],
  model: "jev-1.14.0",
  findings: [
    {
      criterion: "typography/faint-body-text",
      title: "Body text reads as faint",
      verdict: "fail",
      distribution: { true: 0.84, false: 0.16 },
      confidence: null,
      region: { x: 120, y: 540, width: 620, height: 180 },
      source: "W3C, WCAG 2.2, Success Criterion 1.4.3 Contrast (Minimum)",
      link: "https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum",
      fix: "Darken the text or lighten the background. For the exact ratio, run axe-core; WCAG wants 4.5:1 for body text and 3:1 for large text.",
      model: "jev-1.14.0",
    },
    {
      criterion: "typography/single-focal-point",
      title: "One focal point",
      verdict: "warn",
      distribution: { "0": 0.22, "1": 0.63, "2": 0.15 },
      confidence: 0.72,
      region: { x: 80, y: 60, width: 1280, height: 320 },
      source: "Donis A. Dondis, A Primer of Visual Literacy (1973)",
      link: null,
      fix: "Pick the one thing the viewer must see first. Make it larger, higher-contrast, or more isolated, and demote the rest by one step in size or weight.",
      model: "jev-1.14.0",
    },
  ],
  skipped: [
    {
      criterion: "layout/reflow-at-320",
      reason:
        "requires facts.viewport_width, which the facts file does not have",
    },
  ],
  usage: {
    requests: 1,
    input_tokens: 41250,
    cost_usd: 0.0017,
    latency_ms: 1840,
  },
};
