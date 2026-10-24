import { readFileSync } from "node:fs";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, test } from "vitest";
import type { Answer } from "../shared/answer.js";
import type { Criterion, Pack } from "../shared/pack.js";
import type { Question } from "../shared/question.js";
import { type ComposeInput, compose } from "./compose.js";

// Disposable unit tests (CS-22) for compose (section 8.1, FR-26, FR-28, FR-33, FR-34).

const faintBodyText: Criterion = {
  id: "faint-body-text",
  title: "Body text reads as faint",
  source: "W3C, WCAG 2.2, Success Criterion 1.4.3 Contrast (Minimum)",
  link: "https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum",
  question: {
    type: "noul",
    instructions:
      "Looking at the image at `screenshot`, is the body text faint?",
    criteria: { true: "Faint.", false: "Not faint." },
  },
  fail_when: { probability_at_least: 0.7 },
  locate: true,
  locate_instructions: "Find the faint body text.",
  fix: "Darken the text or lighten the background. For the exact ratio, run axe-core; WCAG wants 4.5:1 for body text and 3:1 for large text.",
};

const singleFocalPoint: Criterion = {
  id: "single-focal-point",
  title: "One focal point",
  source: "Donis A. Dondis, A Primer of Visual Literacy (1973)",
  question: {
    type: "score",
    instructions:
      "Looking at the image at `screenshot`, how many elements compete?",
    levels: ["One.", "Two.", "Three or more."],
  },
  warn_when: { level_at_least: 1 },
  locate: true,
  locate_instructions: "Find the competing elements.",
  fix: "Pick the one thing the viewer must see first. Make it larger, higher-contrast, or more isolated, and demote the rest by one step in size or weight.",
};

const typographyPack: Pack = {
  name: "typography",
  version: "1.0.0",
  title: "Typography",
  license: "CC-BY-4.0",
  criteria: [faintBodyText, singleFocalPoint],
};

const questions: Question[] = [
  {
    id: "typography/faint-body-text",
    criterion: "typography/faint-body-text",
    instructions:
      "Looking at the image at `screenshot`, is the body text faint?",
    type: "noul",
    criteria: { true: "Faint.", false: "Not faint." },
  },
  {
    id: "typography/faint-body-text#box",
    criterion: "typography/faint-body-text",
    instructions: "Find the faint body text.",
    type: "box",
  },
  {
    id: "typography/single-focal-point",
    criterion: "typography/single-focal-point",
    instructions:
      "Looking at the image at `screenshot`, how many elements compete?",
    type: "score",
    levels: ["One.", "Two.", "Three or more."],
  },
  {
    id: "typography/single-focal-point#box",
    criterion: "typography/single-focal-point",
    instructions: "Find the competing elements.",
    type: "box",
  },
];

const answers: Answer[] = [
  {
    question_id: "typography/single-focal-point",
    model: "jev-1.14.0",
    type: "score",
    distribution: { "0": 0.22, "1": 0.63, "2": 0.15 },
    confidence: 0.72,
  },
  {
    question_id: "typography/faint-body-text",
    model: "jev-1.14.0",
    type: "noul",
    distribution: { true: 0.84, false: 0.16 },
    confidence: null,
  },
  {
    question_id: "typography/faint-body-text#box",
    model: "jev-1.14.0",
    type: "box",
    region: { x: 120, y: 540, width: 620, height: 180 },
    confidence: null,
  },
  {
    question_id: "typography/single-focal-point#box",
    model: "jev-1.14.0",
    type: "box",
    region: { x: 80, y: 60, width: 1280, height: 320 },
    confidence: 0.4,
  },
];

/** The recorded inputs that rebuild the PRD section 8.1 example. */
function exampleInput(): ComposeInput {
  return {
    packs: [typographyPack],
    built: {
      questions,
      skipped: [
        {
          criterion: "layout/reflow-at-320",
          reason:
            "requires facts.viewport_width, which the facts file does not have",
        },
      ],
    },
    prepared: {
      originalWidth: 1440,
      originalHeight: 900,
      scaleFactor: 1,
      padded: false,
    },
    asked: {
      answers,
      usage: {
        input_tokens: 41250,
        cost_usd: 0.0017,
        latency_ms: 1840,
        model: "jev-1.14.0",
      },
    },
    run: {
      tool: { name: "deskcrit", version: "0.1.0" },
      imagePath: "home.png",
      context: {
        purpose: "landing page",
        audience: "small business owners",
        platform: "web",
      },
    },
  };
}

// The example from docs/PRD.md section 8.1, copied without changes.
const prdExampleReport = {
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

/** Returns the example input with the answers changed by the given function. */
function inputWithAnswers(
  changeAnswers: (original: Answer[]) => Answer[],
): ComposeInput {
  const input = exampleInput();
  return {
    ...input,
    asked: { ...input.asked, answers: changeAnswers([...answers]) },
  };
}

/** Returns the example input with one pack whose criteria are the given ones. */
function inputWithCriteria(criteria: Criterion[]): ComposeInput {
  return { ...exampleInput(), packs: [{ ...typographyPack, criteria }] };
}

/** Finds the finding for a criterion key in a report. */
function findingFor(input: ComposeInput, criterion: string) {
  const report = compose(input);
  const found = report.findings.find((each) => each.criterion === criterion);
  if (found === undefined) {
    throw new Error(`no finding for ${criterion}`);
  }
  return found;
}

describe("compose", () => {
  test("rebuilds the PRD section 8.1 example from recorded answers", () => {
    expect(compose(exampleInput())).toEqual(prdExampleReport);
  });

  test("the composed example passes schemas/report.schema.json", () => {
    const schemaText = readFileSync(
      new URL("../../schemas/report.schema.json", import.meta.url),
      "utf8",
    );
    const validate = new Ajv2020({ allErrors: true }).compile(
      JSON.parse(schemaText),
    );
    expect(validate(compose(exampleInput()))).toBe(true);
  });

  test("gives a null region for a pass verdict", () => {
    const input = inputWithAnswers((original) =>
      original.map((answer) =>
        answer.question_id === "typography/faint-body-text"
          ? {
              ...answer,
              type: "noul",
              distribution: { true: 0.1, false: 0.9 },
              confidence: null,
            }
          : answer,
      ),
    );
    const finding = findingFor(input, "typography/faint-body-text");
    expect(finding.verdict).toBe("pass");
    expect(finding.region).toBeNull();
  });

  test("gives a null region when the criterion does not set locate", () => {
    const withoutLocate: Criterion = { ...faintBodyText, locate: undefined };
    const input = inputWithCriteria([withoutLocate, singleFocalPoint]);
    const finding = findingFor(input, "typography/faint-body-text");
    expect(finding.verdict).toBe("fail");
    expect(finding.region).toBeNull();
  });

  test("an uncertain finding with locate keeps its region, distribution, and confidence", () => {
    const input = inputWithAnswers((original) =>
      original.map((answer) =>
        answer.question_id === "typography/single-focal-point"
          ? {
              ...answer,
              type: "score",
              distribution: { "0": 0.4, "1": 0.35, "2": 0.25 },
              confidence: 0.123456789,
            }
          : answer,
      ),
    );
    const finding = findingFor(input, "typography/single-focal-point");
    expect(finding.verdict).toBe("uncertain");
    expect(finding.distribution).toEqual({ "0": 0.4, "1": 0.35, "2": 0.25 });
    expect(finding.confidence).toBe(0.123456789);
    expect(finding.region).toEqual({ x: 80, y: 60, width: 1280, height: 320 });
  });

  test("maps regions to the original of a downscaled and padded image", () => {
    const input = exampleInput();
    const scaled: ComposeInput = {
      ...input,
      prepared: {
        originalWidth: 2880,
        originalHeight: 400,
        scaleFactor: 0.5,
        padded: true,
      },
    };
    const report = compose(scaled);
    expect(report.image).toEqual({
      path: "home.png",
      width: 2880,
      height: 400,
      padded: true,
    });
    const finding = findingFor(scaled, "typography/faint-body-text");
    // y 540 / 0.5 = 1080 is below the 400 px original, so the region is all in the padding.
    expect(finding.region).toBeNull();
    const focal = findingFor(scaled, "typography/single-focal-point");
    expect(focal.region).toEqual({ x: 160, y: 120, width: 2560, height: 280 });
  });

  test("leaves padded out when prepare did not pad", () => {
    expect("padded" in compose(exampleInput()).image).toBe(false);
  });

  test("takes each finding's model from its own answer", () => {
    const input = inputWithAnswers((original) =>
      original.map((answer) =>
        answer.question_id === "typography/faint-body-text"
          ? { ...answer, model: "jev-1.15.0" }
          : answer,
      ),
    );
    const report = compose(input);
    expect(report.model).toBe("jev-1.14.0");
    expect(findingFor(input, "typography/faint-body-text").model).toBe(
      "jev-1.15.0",
    );
  });

  test("usage has exactly four keys and no model", () => {
    const usage = compose(exampleInput()).usage;
    expect(Object.keys(usage).sort()).toEqual([
      "cost_usd",
      "input_tokens",
      "latency_ms",
      "requests",
    ]);
  });

  test("passes null token counts and cost through", () => {
    const input = exampleInput();
    const report = compose({
      ...input,
      asked: {
        ...input.asked,
        usage: { ...input.asked.usage, input_tokens: null, cost_usd: null },
      },
    });
    expect(report.usage).toEqual({
      requests: 1,
      input_tokens: null,
      cost_usd: null,
      latency_ms: 1840,
    });
  });

  test("keeps packs and skipped in the order given", () => {
    const input = exampleInput();
    const otherPack: Pack = {
      name: "alpha",
      version: "2.0.0",
      title: "Alpha",
      license: "MIT",
      criteria: [],
    };
    const report = compose({
      ...input,
      packs: [typographyPack, otherPack],
      built: {
        questions,
        skipped: [
          { criterion: "z/last", reason: "platform" },
          { criterion: "a/first", reason: "facts" },
        ],
      },
    });
    expect(report.packs).toEqual([
      { name: "typography", version: "1.0.0" },
      { name: "alpha", version: "2.0.0" },
    ]);
    expect(report.skipped).toEqual([
      { criterion: "z/last", reason: "platform" },
      { criterion: "a/first", reason: "facts" },
    ]);
  });

  test("throws a plain Error when a text answer is missing", () => {
    const input = inputWithAnswers((original) =>
      original.filter(
        (answer) => answer.question_id !== "typography/faint-body-text",
      ),
    );
    expect(() => compose(input)).toThrowError(
      new Error('No answer for question "typography/faint-body-text".'),
    );
  });

  test("throws a plain Error when a box answer is missing", () => {
    const input = inputWithAnswers((original) =>
      original.filter(
        (answer) => answer.question_id !== "typography/faint-body-text#box",
      ),
    );
    expect(() => compose(input)).toThrowError(
      new Error('No answer for box question "typography/faint-body-text#box".'),
    );
  });

  test("throws a plain Error when a question names a criterion in no pack", () => {
    const input = inputWithCriteria([singleFocalPoint]);
    expect(() => compose(input)).toThrowError(/which is in no pack/);
  });

  test("the same input gives a deep-equal report every time", () => {
    expect(compose(exampleInput())).toEqual(compose(exampleInput()));
  });

  test("does not change its input", () => {
    const input = exampleInput();
    const before = structuredClone(input);
    compose(input);
    expect(input).toEqual(before);
  });
});
