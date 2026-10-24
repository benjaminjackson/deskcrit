import { describe, expect, it } from "vitest";
import { CouldNotRunError } from "../shared/could-not-run-error.js";
import type { Criterion, Pack } from "../shared/pack.js";
import { boxQuestionIdFor, type Question } from "../shared/question.js";
import { IMAGE_STATE_PATH, type StateImage } from "../shared/state.js";
import { buildQuestions } from "./build.js";
import type { BuildInput } from "./types.js";

/** A small prepared image made by hand. The bytes are not a real PNG; build never reads them. */
function makeImage(): StateImage {
  return {
    format: "png",
    bytes: new Uint8Array([1, 2, 3, 4]),
    width: 800,
    height: 600,
  };
}

/** A noul criterion with the fields every test needs, and any overrides. */
function makeNoulCriterion(
  id: string,
  overrides: Partial<Criterion> = {},
): Criterion {
  return {
    id,
    title: `Title of ${id}`,
    source: "A source",
    question: {
      type: "noul",
      instructions: `In the image at screenshot, is ${id} wrong?`,
      criteria: { true: `${id} is wrong.`, false: `${id} is fine.` },
    },
    fail_when: { probability_at_least: 0.7 },
    fix: "Fix it.",
    ...overrides,
  };
}

/** A pack with the given criteria, and any overrides. */
function makePack(
  name: string,
  criteria: Criterion[],
  overrides: Partial<Pack> = {},
): Pack {
  return {
    name,
    version: "1.0.0",
    title: `The ${name} pack`,
    license: "MIT",
    criteria,
    ...overrides,
  };
}

/** A build input with no context and no facts, and any overrides. */
function makeInput(packs: Pack[], overrides: Partial<BuildInput> = {}) {
  const input: BuildInput = {
    packs,
    image: makeImage(),
    context: {},
    facts: undefined,
    ...overrides,
  };
  return input;
}

/** Return the question ids in order. */
function listIds(questions: readonly Question[]): string[] {
  const ids: string[] = [];
  for (const question of questions) {
    ids.push(question.id);
  }
  return ids;
}

/** Return true when a value holds a Uint8Array anywhere inside it. */
function containsBytes(value: unknown): boolean {
  if (value instanceof Uint8Array) {
    return true;
  }
  if (typeof value !== "object" || value === null) {
    return false;
  }
  for (const item of Object.values(value)) {
    if (containsBytes(item)) {
      return true;
    }
  }
  return false;
}

describe("FR-12, US-8: platform skips", () => {
  const packs = [
    makePack("screen-only", [makeNoulCriterion("a")], {
      applies_to: ["web", "app"],
    }),
    makePack("mixed", [
      makeNoulCriterion("print-ok", { applies_to: ["print", "web"] }),
      makeNoulCriterion("web-only", { applies_to: ["web"] }),
      makeNoulCriterion("everywhere"),
    ]),
  ];

  it("skips criteria the pack or criterion applies_to excludes, with a reason that names the platform and the level", () => {
    const result = buildQuestions(
      makeInput(packs, { context: { platform: "print" } }),
    );
    expect(result.skipped).toEqual([
      {
        criterion: "screen-only/a",
        reason: "the pack applies_to does not include platform print",
      },
      {
        criterion: "mixed/web-only",
        reason: "the criterion applies_to does not include platform print",
      },
    ]);
    expect(listIds(result.questions)).toEqual([
      "mixed/print-ok",
      "mixed/everywhere",
    ]);
  });

  it("keeps a criterion with no applies_to on any platform", () => {
    const result = buildQuestions(
      makeInput(packs, { context: { platform: "web" } }),
    );
    expect(result.skipped).toEqual([]);
    expect(result.questions).toHaveLength(4);
  });

  it("skips nothing for context reasons when no context is given", () => {
    const result = buildQuestions(makeInput(packs));
    expect(result.skipped).toEqual([]);
    expect(result.questions).toHaveLength(4);
  });
});

describe("FR-13, US-7: requires skips", () => {
  const packs = [
    makePack("layout", [
      makeNoulCriterion("reflow-at-320", {
        requires: ["facts.viewport_width"],
      }),
      makeNoulCriterion("nested", { requires: ["facts.viewport.height"] }),
      makeNoulCriterion("two-paths", {
        requires: ["facts.viewport_width", "facts.missing_one"],
      }),
      makeNoulCriterion("null-value", { requires: ["facts.nothing"] }),
      makeNoulCriterion("inherited", { requires: ["facts.constructor"] }),
    ]),
  ];

  it("asks a criterion whose paths are present, including nested paths and null values", () => {
    const facts = {
      viewport_width: 320,
      viewport: { height: 640 },
      nothing: null,
    };
    const result = buildQuestions(makeInput(packs, { facts }));
    expect(listIds(result.questions)).toEqual([
      "layout/reflow-at-320",
      "layout/nested",
      "layout/null-value",
    ]);
    expect(result.skipped).toEqual([
      {
        criterion: "layout/two-paths",
        reason:
          "requires facts.missing_one, which the facts file does not have",
      },
      {
        criterion: "layout/inherited",
        reason:
          "requires facts.constructor, which the facts file does not have",
      },
    ]);
  });

  it("skips a criterion whose path is absent and names the first missing path", () => {
    const result = buildQuestions(makeInput(packs, { facts: { other: 1 } }));
    const reflow = result.skipped.find(
      (entry) => entry.criterion === "layout/reflow-at-320",
    );
    expect(reflow?.reason).toBe(
      "requires facts.viewport_width, which the facts file does not have",
    );
    const twoPaths = result.skipped.find(
      (entry) => entry.criterion === "layout/two-paths",
    );
    expect(twoPaths?.reason).toBe(
      "requires facts.viewport_width, which the facts file does not have",
    );
    expect(listIds(result.questions)).not.toContain("layout/reflow-at-320");
  });

  it("skips every criterion with requires when no facts file is given", () => {
    const result = buildQuestions(makeInput(packs));
    expect(result.questions).toEqual([]);
    expect(result.skipped).toHaveLength(5);
  });

  it("throws CouldNotRunError that names the pack, criterion, and path when a requires path does not start with facts.", () => {
    const broken = [
      makePack("layout", [
        makeNoulCriterion("reflow", { requires: ["viewport_width"] }),
      ]),
    ];
    for (const facts of [undefined, { viewport_width: 320 }]) {
      expect(() => buildQuestions(makeInput(broken, { facts }))).toThrow(
        CouldNotRunError,
      );
      expect(() => buildQuestions(makeInput(broken, { facts }))).toThrow(
        "pack layout, criterion reflow: the requires path viewport_width does not start with facts.",
      );
    }
  });

  it("records a criterion that fails both checks once, with the platform reason", () => {
    const both = [
      makePack("both", [
        makeNoulCriterion("x", {
          applies_to: ["web"],
          requires: ["facts.viewport_width"],
        }),
      ]),
    ];
    const result = buildQuestions(
      makeInput(both, { context: { platform: "print" } }),
    );
    expect(result.skipped).toEqual([
      {
        criterion: "both/x",
        reason: "the criterion applies_to does not include platform print",
      },
    ]);
  });
});

describe("FR-14, NFR-9, JC-3: one question per criterion", () => {
  const noul = makeNoulCriterion("faint");
  const choice: Criterion = {
    ...makeNoulCriterion("columns"),
    question: {
      type: "choice",
      instructions:
        "In the image at screenshot, how many columns does the text use?",
      criteria: [
        { option: "2", description: "Two columns." },
        { option: "one", description: "One column." },
        { option: "1", description: "Also one column." },
      ],
    },
    fail_when: { option_is: "2" },
  };
  const score: Criterion = {
    ...makeNoulCriterion("focal"),
    question: {
      type: "score",
      instructions: "In the image at screenshot, how clear is the focal point?",
      levels: ["Clear.", "Somewhat clear.", "Not clear."],
    },
    fail_when: { level_at_least: 2 },
  };
  const result = buildQuestions(
    makeInput([makePack("p", [noul, choice, score])]),
  );

  it("makes exactly one question of the declared type for each criterion, in order", () => {
    expect(result.questions).toEqual([
      {
        id: "p/faint",
        criterion: "p/faint",
        type: "noul",
        instructions: "In the image at screenshot, is faint wrong?",
        criteria: { true: "faint is wrong.", false: "faint is fine." },
      },
      {
        id: "p/columns",
        criterion: "p/columns",
        type: "choice",
        instructions:
          "In the image at screenshot, how many columns does the text use?",
        criteria: [
          { option: "2", description: "Two columns." },
          { option: "one", description: "One column." },
          { option: "1", description: "Also one column." },
        ],
      },
      {
        id: "p/focal",
        criterion: "p/focal",
        type: "score",
        instructions:
          "In the image at screenshot, how clear is the focal point?",
        levels: ["Clear.", "Somewhat clear.", "Not clear."],
      },
    ]);
  });

  it("keeps the pack's choice option order, including integer-like option names", () => {
    const columns = result.questions[1];
    if (columns?.type !== "choice") {
      throw new Error("expected a choice question");
    }
    const names: string[] = [];
    for (const choiceOption of columns.criteria) {
      names.push(choiceOption.option);
    }
    expect(names).toEqual(["2", "one", "1"]);
  });
});

describe("FR-16: Box questions", () => {
  it("adds one Box question with locate_instructions right after the criterion's question", () => {
    const located = makeNoulCriterion("faint", {
      locate: true,
      locate_instructions: "The block of body text that is faint.",
    });
    const result = buildQuestions(makeInput([makePack("p", [located])]));
    expect(result.questions).toHaveLength(2);
    expect(result.questions[1]).toEqual({
      id: boxQuestionIdFor("p/faint"),
      criterion: "p/faint",
      type: "box",
      instructions: "The block of body text that is faint.",
    });
    let nonBoxCount = 0;
    for (const question of result.questions) {
      if (question.type !== "box") {
        nonBoxCount += 1;
      }
    }
    expect(nonBoxCount).toBe(1);
  });

  it("adds no Box question when locate is false or absent", () => {
    const result = buildQuestions(
      makeInput([
        makePack("p", [
          makeNoulCriterion("off", { locate: false }),
          makeNoulCriterion("absent"),
        ]),
      ]),
    );
    expect(listIds(result.questions)).toEqual(["p/off", "p/absent"]);
  });

  it("throws a plain Error when locate is true without locate_instructions, because the loader forbids it", () => {
    const broken = makeNoulCriterion("faint", { locate: true });
    expect(() => buildQuestions(makeInput([makePack("p", [broken])]))).toThrow(
      "p/faint sets locate: true but has no locate_instructions",
    );
  });
});

describe("FR-15, NFR-10: the image is in the state once", () => {
  it("puts the image under IMAGE_STATE_PATH with the same bytes, and no question holds bytes", () => {
    const image = makeImage();
    const preparedImage = {
      ...image,
      originalWidth: 1600,
      originalHeight: 1200,
      scaleFactor: 0.5,
      padded: false,
    };
    const result = buildQuestions(
      makeInput(
        [
          makePack("p", [
            makeNoulCriterion("a", {
              locate: true,
              locate_instructions: "The faint text.",
            }),
          ]),
        ],
        { image: preparedImage },
      ),
    );
    expect(result.state[IMAGE_STATE_PATH].bytes).toBe(image.bytes);
    expect(Object.keys(result.state[IMAGE_STATE_PATH]).sort()).toEqual([
      "bytes",
      "format",
      "height",
      "width",
    ]);
    expect(containsBytes(result.questions)).toBe(false);
  });
});

describe("FR-17, US-7, US-8: context and facts in the state", () => {
  const packs = [makePack("p", [makeNoulCriterion("a")])];

  it("puts the facts object in the state unchanged under the key facts", () => {
    const facts = { viewport_width: 320, fonts: ["Inter"] };
    const result = buildQuestions(makeInput(packs, { facts }));
    expect(result.state.facts).toBe(facts);
    expect(result.state.facts).toEqual({
      viewport_width: 320,
      fonts: ["Inter"],
    });
  });

  it("puts the purpose text in the state that every question is asked with", () => {
    const result = buildQuestions(
      makeInput(packs, {
        context: { purpose: "poster seen from three metres" },
      }),
    );
    expect(result.state.context).toEqual({
      purpose: "poster seen from three metres",
    });
  });

  it("holds only the image, the context, and the facts", () => {
    const result = buildQuestions(
      makeInput(packs, {
        context: { purpose: "a", audience: "b", platform: "web" },
        facts: { x: 1 },
      }),
    );
    expect(Object.keys(result.state).sort()).toEqual([
      "context",
      "facts",
      IMAGE_STATE_PATH,
    ]);
    expect(result.state.context).toEqual({
      purpose: "a",
      audience: "b",
      platform: "web",
    });
  });

  it("leaves out context and facts when none was given", () => {
    const result = buildQuestions(makeInput(packs));
    expect(Object.keys(result.state)).toEqual([IMAGE_STATE_PATH]);
  });
});

describe("NFR-11, CS-16: context size", () => {
  const packs = [makePack("p", [makeNoulCriterion("a")])];

  it("throws CouldNotRunError that names the facts file when the facts would pass the limit", () => {
    const facts = { notes: "x".repeat(100_000) };
    let caught: unknown;
    try {
      buildQuestions(makeInput(packs, { facts }));
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(CouldNotRunError);
    expect(String(caught)).toContain("the facts file");
    expect(String(caught)).toContain("32000-token limit");
  });

  it("throws CouldNotRunError that names the context when the context alone passes the limit", () => {
    expect(() =>
      buildQuestions(
        makeInput(packs, { context: { purpose: "y".repeat(100_000) } }),
      ),
    ).toThrow(/the estimated size of the context is about/);
  });

  it("accepts a small facts file", () => {
    const result = buildQuestions(
      makeInput(packs, { facts: { viewport_width: 320 } }),
    );
    expect(result.questions).toHaveLength(1);
  });
});

describe("CS-18, CS-6: determinism and no argument changes", () => {
  it("gives equal output for equal input and leaves the input unchanged", () => {
    const packs = [
      makePack("a", [
        makeNoulCriterion("one", {
          locate: true,
          locate_instructions: "The faint text.",
        }),
      ]),
      makePack("b", [makeNoulCriterion("two", { applies_to: ["print"] })]),
    ];
    const input = makeInput(packs, {
      context: { platform: "web", purpose: "a landing page" },
      facts: { viewport_width: 320 },
    });
    const before = structuredClone(input);
    const first = buildQuestions(input);
    const second = buildQuestions(input);
    expect(second).toEqual(first);
    expect(input).toEqual(before);
  });

  it("returns no questions and the normal state when every criterion is skipped", () => {
    const result = buildQuestions(
      makeInput(
        [makePack("p", [makeNoulCriterion("a", { applies_to: ["print"] })])],
        {
          context: { platform: "web" },
        },
      ),
    );
    expect(result.questions).toEqual([]);
    expect(result.state.context).toEqual({ platform: "web" });
  });

  it("throws CouldNotRunError that names the pack when two packs have the same name", () => {
    const packs = [
      makePack("p", [makeNoulCriterion("a")]),
      makePack("p", [makeNoulCriterion("b")]),
    ];
    expect(() => buildQuestions(makeInput(packs))).toThrow(CouldNotRunError);
    expect(() => buildQuestions(makeInput(packs))).toThrow(
      "two packs are named p",
    );
  });
});
