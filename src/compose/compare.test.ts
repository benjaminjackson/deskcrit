// Disposable unit tests of compare (FR-34 to FR-37, FR-39, section 8.2, US-3). They use plain
// report and pack values, and no adapter, because compare asks TypeSafe nothing (CS-22).

import { describe, expect, test } from "vitest";
import { CouldNotRunError } from "../shared/could-not-run-error.js";
import type { Criterion, Pack, Predicate } from "../shared/pack.js";
import {
  type CompareInput,
  compare,
  readBetterDirection,
  summarizeChanges,
} from "./compare.js";
import type { Finding, Report, ReportUsage } from "./report.js";
import type { Verdict } from "./verdict.js";

const MODEL = "jev-1.14.0";
const PACK_NAME = "test";

/** Makes a noul criterion with the given predicates. */
function noulCriterion(
  id: string,
  predicates: {
    pass_when?: Predicate;
    fail_when?: Predicate;
    warn_when?: Predicate;
  },
): Criterion {
  return {
    id,
    title: `Title of ${id}`,
    source: "A source",
    question: {
      type: "noul",
      instructions: "Is there a defect?",
      criteria: { true: "There is a defect.", false: "There is none." },
    },
    fix: "Fix it.",
    ...predicates,
  };
}

/** Makes a score criterion with four levels and the given predicates. */
function scoreCriterion(
  id: string,
  predicates: {
    pass_when?: Predicate;
    fail_when?: Predicate;
    warn_when?: Predicate;
  },
): Criterion {
  return {
    id,
    title: `Title of ${id}`,
    source: "A source",
    question: {
      type: "score",
      instructions: "How bad is it?",
      levels: ["none", "some", "much", "all"],
    },
    fix: "Fix it.",
    ...predicates,
  };
}

/** Makes a choice criterion with two options. */
function choiceCriterion(id: string): Criterion {
  return {
    id,
    title: `Title of ${id}`,
    source: "A source",
    question: {
      type: "choice",
      instructions: "Which one?",
      criteria: [
        { option: "left", description: "On the left." },
        { option: "right", description: "On the right." },
      ],
    },
    fix: "Fix it.",
    fail_when: { option_is: "left" },
  };
}

/** Makes a pack that holds the given criteria. */
function makePack(criteria: Criterion[]): Pack {
  return {
    name: PACK_NAME,
    version: "1.0.0",
    title: "Test pack",
    license: "MIT",
    criteria,
  };
}

/** Makes a noul finding with the given probability of true. */
function noulFinding(
  id: string,
  verdict: Verdict,
  probabilityOfTrue: number,
): Finding {
  return baseFinding(id, verdict, {
    distribution: { true: probabilityOfTrue, false: 1 - probabilityOfTrue },
    confidence: null,
  });
}

/** Makes a score finding whose most probable level is `level` out of four. */
function scoreFinding(id: string, verdict: Verdict, level: number): Finding {
  const distribution: Record<string, number> = {};
  for (let index = 0; index < 4; index++) {
    distribution[String(index)] = index === level ? 0.7 : 0.1;
  }
  return baseFinding(id, verdict, { distribution, confidence: 0.9 });
}

/** Makes a choice finding whose most probable option is `option`. */
function choiceFinding(id: string, verdict: Verdict, option: string): Finding {
  const distribution =
    option === "left" ? { left: 0.8, right: 0.2 } : { left: 0.2, right: 0.8 };
  return baseFinding(id, verdict, { distribution, confidence: 0.9 });
}

/** Fills in the finding fields that compare does not read. */
function baseFinding(
  id: string,
  verdict: Verdict,
  answerFields: Pick<Finding, "distribution" | "confidence">,
): Finding {
  return {
    criterion: `${PACK_NAME}/${id}`,
    title: `Title of ${id}`,
    verdict,
    distribution: answerFields.distribution,
    confidence: answerFields.confidence,
    region: null,
    source: "A source",
    link: null,
    fix: "Fix it.",
    model: MODEL,
  };
}

/** Makes a report with the given findings, skipped list, and usage. */
function makeReport(
  findings: Finding[],
  options: {
    skipped?: Report["skipped"];
    usage?: ReportUsage;
    model?: string;
    packs?: Report["packs"];
  } = {},
): Report {
  return {
    schema_version: "1.0.0",
    mode: "report",
    tool: { name: "deskcrit", version: "0.1.0" },
    image: { path: "page.png", width: 1280, height: 800 },
    context: { platform: "web", purpose: "Sign up" },
    packs: options.packs ?? [{ name: PACK_NAME, version: "1.0.0" }],
    model: options.model ?? MODEL,
    findings,
    skipped: options.skipped ?? [],
    usage: options.usage ?? {
      requests: 1,
      input_tokens: 100,
      cost_usd: 0.001,
      latency_ms: 400,
    },
  };
}

/** Compares one criterion's before and after findings and returns its one change. */
function changeFor(criterion: Criterion, before: Finding, after: Finding) {
  const result = compare({
    before: makeReport([before]),
    after: makeReport([after]),
    packs: [makePack([criterion])],
  });
  expect(result.changes).toHaveLength(1);
  return result.changes[0];
}

/** Freezes a value and every object inside it, so a test fails if compare changes its input. */
function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const inner of Object.values(value)) {
      deepFreeze(inner);
    }
    Object.freeze(value);
  }
  return value;
}

const lowerBetterScore = scoreCriterion("crowding", {
  pass_when: { level_at_most: 0 },
});
const lowerBetterNoul = noulCriterion("contrast", {
  fail_when: { probability_at_least: 0.7 },
});
// A noul criterion whose pass_when makes a higher probability of true better (FR-36).
const higherBetterNoul = noulCriterion("contrast", {
  pass_when: { probability_at_least: 0.7 },
  fail_when: { probability_at_most: 0.3 },
});

describe("compareFinding through compare (FR-36, FR-37)", () => {
  const cases: Array<{
    name: string;
    criterion: Criterion;
    before: Finding;
    after: Finding;
    change: string;
  }> = [
    {
      name: "noul uncertain in before with a drop of 0.4 gives better",
      criterion: lowerBetterNoul,
      before: noulFinding("contrast", "uncertain", 0.5),
      after: noulFinding("contrast", "pass", 0.1),
      change: "better",
    },
    {
      name: "noul uncertain in before with a drop of exactly 0.15 gives better",
      criterion: lowerBetterNoul,
      before: noulFinding("contrast", "uncertain", 0.4),
      after: noulFinding("contrast", "pass", 0.25),
      change: "better",
    },
    {
      name: "noul uncertain in after with a drop of 0.4 gives better",
      criterion: lowerBetterNoul,
      before: noulFinding("contrast", "fail", 0.9),
      after: noulFinding("contrast", "uncertain", 0.5),
      change: "better",
    },
    {
      name: "noul uncertain in after with a rise of 0.15 gives worse",
      criterion: lowerBetterNoul,
      before: noulFinding("contrast", "pass", 0.2),
      after: noulFinding("contrast", "uncertain", 0.35),
      change: "worse",
    },
    {
      name: "noul uncertain in before with a rise of 0.57 gives worse",
      criterion: lowerBetterNoul,
      before: noulFinding("contrast", "uncertain", 0.38),
      after: noulFinding("contrast", "fail", 0.95),
      change: "worse",
    },
    {
      name: "noul uncertain in after with a rise under 0.15 gives same",
      criterion: lowerBetterNoul,
      before: noulFinding("contrast", "pass", 0.26),
      after: noulFinding("contrast", "uncertain", 0.31),
      change: "same",
    },
    {
      name: "noul uncertain in before with a drop under 0.15 gives same",
      criterion: lowerBetterNoul,
      before: noulFinding("contrast", "uncertain", 0.35),
      after: noulFinding("contrast", "pass", 0.21),
      change: "same",
    },
    {
      name: "noul uncertain on both sides with a drop of 0.34 gives better",
      criterion: lowerBetterNoul,
      before: noulFinding("contrast", "uncertain", 0.69),
      after: noulFinding("contrast", "uncertain", 0.35),
      change: "better",
    },
    {
      name: "noul uncertain on both sides with a rise of 0.29 gives worse",
      criterion: lowerBetterNoul,
      before: noulFinding("contrast", "uncertain", 0.39),
      after: noulFinding("contrast", "uncertain", 0.68),
      change: "worse",
    },
    {
      name: "noul uncertain on both sides with a move under 0.15 gives same",
      criterion: lowerBetterNoul,
      before: noulFinding("contrast", "uncertain", 0.45),
      after: noulFinding("contrast", "uncertain", 0.42),
      change: "same",
    },
    {
      name: "noul with higher better, uncertain in after, with a rise of 0.15 gives better",
      criterion: higherBetterNoul,
      before: noulFinding("contrast", "fail", 0.2),
      after: noulFinding("contrast", "uncertain", 0.35),
      change: "better",
    },
    {
      name: "noul with higher better, uncertain in before, with a drop of 0.4 gives worse",
      criterion: higherBetterNoul,
      before: noulFinding("contrast", "uncertain", 0.5),
      after: noulFinding("contrast", "fail", 0.1),
      change: "worse",
    },
    {
      name: "score uncertain in before gives uncertain whatever the level moved",
      criterion: lowerBetterScore,
      before: scoreFinding("crowding", "uncertain", 3),
      after: scoreFinding("crowding", "pass", 0),
      change: "uncertain",
    },
    {
      name: "choice uncertain in after gives uncertain",
      criterion: choiceCriterion("side"),
      before: choiceFinding("side", "pass", "right"),
      after: choiceFinding("side", "uncertain", "left"),
      change: "uncertain",
    },
    {
      name: "fail to pass gives better",
      criterion: lowerBetterNoul,
      before: noulFinding("contrast", "fail", 0.9),
      after: noulFinding("contrast", "pass", 0.1),
      change: "better",
    },
    {
      name: "pass to warn gives worse",
      criterion: scoreCriterion("crowding", {
        pass_when: { level_at_most: 0 },
        warn_when: { level_at_most: 1 },
      }),
      before: scoreFinding("crowding", "pass", 0),
      after: scoreFinding("crowding", "warn", 1),
      change: "worse",
    },
    {
      name: "equal fail with score level 3 to 2, lower better, gives better",
      criterion: lowerBetterScore,
      before: scoreFinding("crowding", "fail", 3),
      after: scoreFinding("crowding", "fail", 2),
      change: "better",
    },
    {
      name: "equal verdict with a score move of 0 gives same",
      criterion: lowerBetterScore,
      before: scoreFinding("crowding", "fail", 2),
      after: scoreFinding("crowding", "fail", 2),
      change: "same",
    },
    {
      name: "equal fail with score level 2 to 3 gives worse",
      criterion: lowerBetterScore,
      before: scoreFinding("crowding", "fail", 2),
      after: scoreFinding("crowding", "fail", 3),
      change: "worse",
    },
    {
      name: "equal noul move of exactly 0.15 down gives better",
      criterion: lowerBetterNoul,
      before: noulFinding("contrast", "fail", 0.95),
      after: noulFinding("contrast", "fail", 0.8),
      change: "better",
    },
    {
      name: "equal noul move of 0.14 gives same",
      criterion: lowerBetterNoul,
      before: noulFinding("contrast", "fail", 0.95),
      after: noulFinding("contrast", "fail", 0.81),
      change: "same",
    },
    {
      name: "equal noul move of -0.15 (a rise) gives worse",
      criterion: lowerBetterNoul,
      before: noulFinding("contrast", "fail", 0.8),
      after: noulFinding("contrast", "fail", 0.95),
      change: "worse",
    },
    {
      name: "equal choice verdict with a different option gives same",
      criterion: choiceCriterion("side"),
      before: choiceFinding("side", "pass", "right"),
      after: choiceFinding("side", "pass", "left"),
      change: "same",
    },
    {
      name: "US-3: single-focal-point level 2 to 0 gives better",
      criterion: scoreCriterion("single-focal-point", {
        pass_when: { level_at_most: 0 },
      }),
      before: scoreFinding("single-focal-point", "fail", 2),
      after: scoreFinding("single-focal-point", "pass", 0),
      change: "better",
    },
    {
      name: "warn_when probability_at_least 0.5 only: a rise gives worse",
      criterion: noulCriterion("busy", {
        warn_when: { probability_at_least: 0.5 },
      }),
      before: noulFinding("busy", "warn", 0.75),
      after: noulFinding("busy", "warn", 0.95),
      change: "worse",
    },
    {
      name: "warn_when probability_at_least 0.5 only: a fall gives better",
      criterion: noulCriterion("busy", {
        warn_when: { probability_at_least: 0.5 },
      }),
      before: noulFinding("busy", "warn", 0.95),
      after: noulFinding("busy", "warn", 0.75),
      change: "better",
    },
    {
      name: "pass_when level_at_least, equal pass, level 2 to 3 gives better",
      criterion: scoreCriterion("legible", {
        pass_when: { level_at_least: 2 },
      }),
      before: scoreFinding("legible", "pass", 2),
      after: scoreFinding("legible", "pass", 3),
      change: "better",
    },
    {
      name: "pass_when level_at_least, equal pass, level 3 to 2 gives worse",
      criterion: scoreCriterion("legible", {
        pass_when: { level_at_least: 2 },
      }),
      before: scoreFinding("legible", "pass", 3),
      after: scoreFinding("legible", "pass", 2),
      change: "worse",
    },
    {
      name: "pass_when probability_at_least, equal pass, exact 0.15 rise gives better",
      criterion: noulCriterion("clear", {
        pass_when: { probability_at_least: 0.7 },
      }),
      before: noulFinding("clear", "pass", 0.8),
      after: noulFinding("clear", "pass", 0.95),
      change: "better",
    },
    {
      name: "pass_when probability_at_least, equal pass, exact 0.15 fall gives worse",
      criterion: noulCriterion("clear", {
        pass_when: { probability_at_least: 0.7 },
      }),
      before: noulFinding("clear", "pass", 0.95),
      after: noulFinding("clear", "pass", 0.8),
      change: "worse",
    },
    {
      name: "pass_when probability_at_least, equal pass, 0.1 rise gives same",
      criterion: noulCriterion("clear", {
        pass_when: { probability_at_least: 0.7 },
      }),
      before: noulFinding("clear", "pass", 0.8),
      after: noulFinding("clear", "pass", 0.9),
      change: "same",
    },
  ];

  for (const testCase of cases) {
    test(testCase.name, () => {
      const result = changeFor(
        testCase.criterion,
        testCase.before,
        testCase.after,
      );
      expect(result?.change).toBe(testCase.change);
    });
  }

  test("0.95 - 0.8 is below 0.15 in floating point, so the tolerance matters (CS-18)", () => {
    expect(0.95 - 0.8).toBeLessThan(0.15);
  });

  test("each change holds the verdicts, the unrounded values, and the model (section 8.2)", () => {
    const result = changeFor(
      lowerBetterNoul,
      noulFinding("contrast", "fail", 0.95),
      noulFinding("contrast", "fail", 0.8),
    );
    expect(result).toEqual({
      criterion: "test/contrast",
      change: "better",
      before: { verdict: "fail", value: 0.95 },
      after: { verdict: "fail", value: 0.8 },
      model: MODEL,
    });
  });

  test("score and choice values are the level index and the option name (FR-36)", () => {
    const scoreChange = changeFor(
      lowerBetterScore,
      scoreFinding("crowding", "fail", 3),
      scoreFinding("crowding", "fail", 2),
    );
    expect(scoreChange?.before.value).toBe(3);
    expect(scoreChange?.after.value).toBe(2);
    const choiceChange = changeFor(
      choiceCriterion("side"),
      choiceFinding("side", "pass", "right"),
      choiceFinding("side", "fail", "left"),
    );
    expect(choiceChange?.before.value).toBe("right");
    expect(choiceChange?.after.value).toBe("left");
    expect(choiceChange?.change).toBe("worse");
  });
});

describe("readBetterDirection (FR-36)", () => {
  test("level_at_most in pass_when means lower is better", () => {
    expect(
      readBetterDirection(
        scoreCriterion("a", { pass_when: { level_at_most: 1 } }),
      ),
    ).toBe("lower");
  });

  test("level_at_least in pass_when means higher is better", () => {
    expect(
      readBetterDirection(
        scoreCriterion("a", { pass_when: { level_at_least: 2 } }),
      ),
    ).toBe("higher");
  });

  test("probability_at_least in fail_when with no pass_when means lower is better", () => {
    expect(
      readBetterDirection(
        noulCriterion("a", { fail_when: { probability_at_least: 0.7 } }),
      ),
    ).toBe("lower");
  });

  test("probability_at_most in fail_when means higher is better", () => {
    expect(
      readBetterDirection(
        noulCriterion("a", { fail_when: { probability_at_most: 0.3 } }),
      ),
    ).toBe("higher");
  });

  test("pass_when wins over fail_when", () => {
    expect(
      readBetterDirection(
        noulCriterion("a", {
          pass_when: { probability_at_least: 0.7 },
          fail_when: { probability_at_most: 0.3 },
        }),
      ),
    ).toBe("higher");
  });

  test("a warn_when probability_at_least that is the only predicate means lower is better", () => {
    expect(
      readBetterDirection(
        noulCriterion("a", { warn_when: { probability_at_least: 0.5 } }),
      ),
    ).toBe("lower");
  });

  test("a criterion with no predicate throws a plain Error", () => {
    expect(() => readBetterDirection(noulCriterion("a", {}))).toThrow(Error);
    expect(() => readBetterDirection(noulCriterion("a", {}))).not.toThrow(
      CouldNotRunError,
    );
  });
});

describe("skipped criteria (FR-36, section 8.2)", () => {
  const pack = makePack([lowerBetterNoul, lowerBetterScore]);

  test("a criterion only the before run asked goes in skipped with run after", () => {
    const result = compare({
      before: makeReport([noulFinding("contrast", "fail", 0.9)]),
      after: makeReport([], {
        skipped: [{ criterion: "test/contrast", reason: "needs facts" }],
      }),
      packs: [pack],
    });
    expect(result.changes).toEqual([]);
    expect(result.skipped).toEqual([
      { criterion: "test/contrast", run: "after", reason: "needs facts" },
    ]);
  });

  test("a criterion only the after run asked goes in skipped with run before", () => {
    const result = compare({
      before: makeReport([], {
        skipped: [{ criterion: "test/contrast", reason: "platform" }],
      }),
      after: makeReport([noulFinding("contrast", "fail", 0.9)]),
      packs: [pack],
    });
    expect(result.skipped).toEqual([
      { criterion: "test/contrast", run: "before", reason: "platform" },
    ]);
  });

  test("a criterion both runs skipped is in neither list", () => {
    const skipped = [{ criterion: "test/contrast", reason: "platform" }];
    const result = compare({
      before: makeReport([], { skipped }),
      after: makeReport([], { skipped }),
      packs: [pack],
    });
    expect(result.changes).toEqual([]);
    expect(result.skipped).toEqual([]);
  });

  test("a criterion in one report and nowhere in the other throws CouldNotRunError", () => {
    expect(() =>
      compare({
        before: makeReport([noulFinding("contrast", "fail", 0.9)]),
        after: makeReport([]),
        packs: [pack],
      }),
    ).toThrow(CouldNotRunError);
  });

  test("a finding for a criterion in no pack throws CouldNotRunError", () => {
    expect(() =>
      compare({
        before: makeReport([noulFinding("contrast", "fail", 0.9)]),
        after: makeReport([noulFinding("contrast", "fail", 0.9)]),
        packs: [makePack([lowerBetterScore])],
      }),
    ).toThrow(CouldNotRunError);
  });
});

describe("the compare document (section 8.2, FR-33, FR-39)", () => {
  const criteria = [
    noulCriterion("b-noul", { fail_when: { probability_at_least: 0.7 } }),
    noulCriterion("a-noul", { fail_when: { probability_at_least: 0.7 } }),
    scoreCriterion("c-score", { pass_when: { level_at_most: 0 } }),
    noulCriterion("z-skip", { fail_when: { probability_at_least: 0.7 } }),
    noulCriterion("m-skip", { fail_when: { probability_at_least: 0.7 } }),
    choiceCriterion("d-choice"),
  ];
  const packs = [makePack(criteria)];
  const before = makeReport(
    [
      noulFinding("b-noul", "fail", 0.9),
      scoreFinding("c-score", "fail", 2),
      noulFinding("a-noul", "uncertain", 0.5),
      noulFinding("z-skip", "fail", 0.9),
      choiceFinding("d-choice", "pass", "right"),
    ],
    {
      skipped: [{ criterion: "test/m-skip", reason: "platform" }],
      usage: {
        requests: 1,
        input_tokens: 100,
        cost_usd: 0.001,
        latency_ms: 400,
      },
    },
  );
  const after = makeReport(
    [
      noulFinding("a-noul", "pass", 0.1),
      noulFinding("m-skip", "fail", 0.9),
      scoreFinding("c-score", "fail", 3),
      noulFinding("b-noul", "pass", 0.1),
      choiceFinding("d-choice", "uncertain", "right"),
    ],
    {
      skipped: [{ criterion: "test/z-skip", reason: "needs facts" }],
      usage: {
        requests: 2,
        input_tokens: 50,
        cost_usd: 0.002,
        latency_ms: 300,
      },
    },
  );

  test("changes and skipped are sorted by criterion", () => {
    const result = compare({ before, after, packs });
    expect(result.changes.map((entry) => entry.criterion)).toEqual([
      "test/a-noul",
      "test/b-noul",
      "test/c-score",
      "test/d-choice",
    ]);
    expect(result.skipped.map((entry) => entry.criterion)).toEqual([
      "test/m-skip",
      "test/z-skip",
    ]);
  });

  test("the summary counts match the changes", () => {
    const result = compare({ before, after, packs });
    expect(result.summary).toEqual({
      improved: 2,
      regressed: 1,
      same: 0,
      uncertain: 1,
    });
  });

  test("usage is the sum over both runs", () => {
    const result = compare({ before, after, packs });
    expect(result.usage.requests).toBe(3);
    expect(result.usage.input_tokens).toBe(150);
    expect(result.usage.cost_usd).toBeCloseTo(0.003, 12);
    expect(result.usage.latency_ms).toBe(700);
    expect(result.usage).not.toHaveProperty("model");
  });

  test("input_tokens and cost_usd are null when either run does not know them", () => {
    const result = compare({
      before: makeReport([], {
        usage: {
          requests: 1,
          input_tokens: null,
          cost_usd: 0.001,
          latency_ms: 1,
        },
      }),
      after: makeReport([], {
        usage: { requests: 1, input_tokens: 10, cost_usd: null, latency_ms: 2 },
      }),
      packs,
    });
    expect(result.usage).toEqual({
      requests: 2,
      input_tokens: null,
      cost_usd: null,
      latency_ms: 3,
    });
  });

  test("the document has the section 8.2 fields, and before and after have no usage", () => {
    const result = compare({ before, after, packs });
    expect(result.schema_version).toBe("1.0.0");
    expect(result.mode).toBe("compare");
    expect(result.tool).toEqual(before.tool);
    expect(result.model).toBe(MODEL);
    expect(result.before).not.toHaveProperty("usage");
    expect(result.after).not.toHaveProperty("usage");
    expect(result.before.findings).toEqual(before.findings);
    expect(result.after.image).toEqual(after.image);
  });

  test("compare does not change its inputs (CS-6)", () => {
    const input: CompareInput = deepFreeze({ before, after, packs });
    expect(() => compare(input)).not.toThrow();
  });

  test("summarizeChanges counts each kind (FR-39)", () => {
    const side = { verdict: "fail" as const, value: 1 };
    const changes = [
      {
        criterion: "a",
        change: "better" as const,
        before: side,
        after: side,
        model: MODEL,
      },
      {
        criterion: "b",
        change: "better" as const,
        before: side,
        after: side,
        model: MODEL,
      },
      {
        criterion: "c",
        change: "same" as const,
        before: side,
        after: side,
        model: MODEL,
      },
      {
        criterion: "d",
        change: "worse" as const,
        before: side,
        after: side,
        model: MODEL,
      },
    ];
    expect(summarizeChanges(changes)).toEqual({
      improved: 2,
      regressed: 1,
      same: 1,
      uncertain: 0,
    });
  });
});

describe("the same run check (FR-35)", () => {
  const packs = [makePack([lowerBetterNoul])];

  test("different models throw CouldNotRunError naming the model", () => {
    expect(() =>
      compare({
        before: makeReport([]),
        after: makeReport([], { model: "jev-1.13.0" }),
        packs,
      }),
    ).toThrow(/model/);
    expect(() =>
      compare({
        before: makeReport([]),
        after: makeReport([], { model: "jev-1.13.0" }),
        packs,
      }),
    ).toThrow(CouldNotRunError);
  });

  test("different packs throw CouldNotRunError naming the packs", () => {
    const run = () =>
      compare({
        before: makeReport([]),
        after: makeReport([], {
          packs: [{ name: PACK_NAME, version: "2.0.0" }],
        }),
        packs,
      });
    expect(run).toThrow(CouldNotRunError);
    expect(run).toThrow(/packs/);
  });

  test("packs given to compare that differ from the reports' packs throw CouldNotRunError", () => {
    const otherVersion: Pack = {
      ...makePack([lowerBetterNoul]),
      version: "2.0.0",
    };
    const run = () =>
      compare({
        before: makeReport([]),
        after: makeReport([]),
        packs: [otherVersion],
      });
    expect(run).toThrow(CouldNotRunError);
    expect(run).toThrow(/packs/);
    expect(() =>
      compare({ before: makeReport([]), after: makeReport([]), packs: [] }),
    ).toThrow(CouldNotRunError);
  });

  test("different contexts throw CouldNotRunError naming the context", () => {
    const after: Report = {
      ...makeReport([]),
      context: { platform: "ios", purpose: "Sign up" },
    };
    const run = () => compare({ before: makeReport([]), after, packs });
    expect(run).toThrow(CouldNotRunError);
    expect(run).toThrow(/context/);
  });
});
