import { describe, expect, it } from "vitest";
import { hashPngHashes } from "./frozen-set.ts";
import {
  answersFileNameFor,
  answersFileNumber,
  criterionForQuestionId,
  findRewordedCriteria,
  keepCurrentAnswers,
  type LivePlanInput,
  olderAnswerCriteriaOf,
  type PlanCriterion,
  type PlanFixture,
  planLiveRun,
  planReplay,
  type RecordedAnswersFile,
  type SavedAnswersFile,
} from "./plan-run.ts";
import type { AskedQuestionHash } from "./question-hash.ts";
import { NO_RESPELLING, type Respelling } from "./spelling.ts";

/** Two criteria, each with one positive and one negative fixture of its own. */
const OLD_CRITERIA: PlanCriterion[] = [
  {
    criterion: "demo/first",
    positive: ["fixtures/first.positive.png"],
    negative: ["fixtures/first.negative.png"],
  },
  {
    criterion: "demo/second",
    positive: ["fixtures/second.positive.png"],
    negative: ["fixtures/second.negative.png"],
  },
];

/** A third criterion added later, with its own new fixtures. */
const NEW_CRITERION: PlanCriterion = {
  criterion: "demo/third",
  positive: ["fixtures/third.positive.png"],
  negative: ["fixtures/third.negative.png"],
};

/** A fake PNG hash for a fixture path, so each fixture has its own. */
function pngHashOf(fixture: string): string {
  return hashPngHashes([fixture]);
}

/** A fixture whose first answers file answers the given criteria. */
function scoredFixture(fixture: string, criteria: string[]): PlanFixture {
  return {
    fixture,
    pngSha256: pngHashOf(fixture),
    savedFiles: [
      {
        fileName: `${fixture.slice("fixtures/".length)}.answers.json`,
        imageSha256: pngHashOf(fixture),
        questionIds: criteria,
      },
    ],
    olderAnswerCriteria: [],
  };
}

/** A fixture with no saved answers file. */
function newFixture(fixture: string): PlanFixture {
  return {
    fixture,
    pngSha256: pngHashOf(fixture),
    savedFiles: [],
    olderAnswerCriteria: [],
  };
}

/** Every fixture path of these criteria. */
function fixturesOf(criteria: PlanCriterion[]): string[] {
  return criteria.flatMap((criterion) => [
    ...criterion.positive,
    ...criterion.negative,
  ]);
}

/** The plan input after a third criterion is added to a pack whose two criteria were scored. */
function inputWithNewCriterion(): LivePlanInput {
  const oldFixtures = fixturesOf(OLD_CRITERIA);
  const oldCriterionIds = OLD_CRITERIA.map((criterion) => criterion.criterion);
  const allCriteria = [...OLD_CRITERIA, NEW_CRITERION];
  return {
    packName: "demo",
    criteria: allCriteria,
    fixtures: [
      ...oldFixtures.map((fixture) => scoredFixture(fixture, oldCriterionIds)),
      ...fixturesOf([NEW_CRITERION]).map(newFixture),
    ],
    currentSetPngHashes: fixturesOf(allCriteria).map(pngHashOf),
    storedSetHash: hashPngHashes(oldFixtures.map(pngHashOf)),
    scoredPngHashes: oldFixtures.map(pngHashOf),
    rewordedCriteria: [],
    rerunSameSet: false,
  };
}

describe("planLiveRun", () => {
  it("asks only the new criterion about old fixtures and every criterion about new fixtures", () => {
    const plans = planLiveRun(inputWithNewCriterion());
    expect(plans).toEqual([
      {
        fixture: "fixtures/first.positive.png",
        criteria: ["demo/third"],
        answersFileName: "first.positive.png.answers-2.json",
        fileNamesToDelete: [],
      },
      {
        fixture: "fixtures/first.negative.png",
        criteria: ["demo/third"],
        answersFileName: "first.negative.png.answers-2.json",
        fileNamesToDelete: [],
      },
      {
        fixture: "fixtures/second.positive.png",
        criteria: ["demo/third"],
        answersFileName: "second.positive.png.answers-2.json",
        fileNamesToDelete: [],
      },
      {
        fixture: "fixtures/second.negative.png",
        criteria: ["demo/third"],
        answersFileName: "second.negative.png.answers-2.json",
        fileNamesToDelete: [],
      },
      {
        fixture: "fixtures/third.positive.png",
        criteria: ["demo/first", "demo/second", "demo/third"],
        answersFileName: "third.positive.png.answers.json",
        fileNamesToDelete: [],
      },
      {
        fixture: "fixtures/third.negative.png",
        criteria: ["demo/first", "demo/second", "demo/third"],
        answersFileName: "third.negative.png.answers.json",
        fileNamesToDelete: [],
      },
    ]);
  });

  it("counts a Box answer as an answer to its criterion", () => {
    const input = inputWithNewCriterion();
    const fixtures = input.fixtures.map((fixture) => ({
      ...fixture,
      savedFiles: fixture.savedFiles.map((savedFile) => ({
        ...savedFile,
        questionIds: [...savedFile.questionIds, "demo/first#box"],
      })),
    }));
    const plans = planLiveRun({ ...input, fixtures });
    expect(plans[0]?.criteria).toEqual(["demo/third"]);
  });

  it("names the next file after the highest one saved", () => {
    const input = inputWithNewCriterion();
    const first = scoredFixture("fixtures/first.positive.png", ["demo/first"]);
    const withTwoFiles: PlanFixture = {
      ...first,
      savedFiles: [
        ...first.savedFiles,
        {
          fileName: "first.positive.png.answers-2.json",
          imageSha256: first.pngSha256,
          questionIds: ["demo/second"],
        },
      ],
    };
    const plans = planLiveRun({
      ...input,
      fixtures: [withTwoFiles, ...input.fixtures.slice(1)],
    });
    expect(plans[0]?.answersFileName).toBe("first.positive.png.answers-3.json");
  });

  it("refuses a run with no pair left to ask", () => {
    const fixtures = fixturesOf(OLD_CRITERIA);
    const criterionIds = OLD_CRITERIA.map((criterion) => criterion.criterion);
    const input: LivePlanInput = {
      packName: "demo",
      criteria: OLD_CRITERIA,
      fixtures: fixtures.map((fixture) => scoredFixture(fixture, criterionIds)),
      currentSetPngHashes: null,
      storedSetHash: null,
      scoredPngHashes: null,
      rewordedCriteria: [],
      rerunSameSet: false,
    };
    expect(() => planLiveRun(input)).toThrow(/no pair is left to ask/);
  });

  it("refuses the exact set the stored set hash names", () => {
    const fixtures = fixturesOf(OLD_CRITERIA);
    const input: LivePlanInput = {
      packName: "demo",
      criteria: OLD_CRITERIA,
      // A run that stopped before any answer was saved.
      fixtures: fixtures.map(newFixture),
      currentSetPngHashes: fixtures.map(pngHashOf),
      storedSetHash: hashPngHashes(fixtures.map(pngHashOf)),
      scoredPngHashes: fixtures.map(pngHashOf),
      rewordedCriteria: [],
      rerunSameSet: false,
    };
    expect(() => planLiveRun(input)).toThrow(/already scored this fixture set/);
  });

  it("refuses a criterion asked for the first time about its own fixtures that were already scored", () => {
    // first was renamed to renamed on the same fixtures: a rewording under a new id.
    const oldFixtures = fixturesOf(OLD_CRITERIA);
    const renamed: PlanCriterion = {
      criterion: "demo/renamed",
      positive: ["fixtures/first.positive.png"],
      negative: ["fixtures/first.negative.png"],
    };
    const second = OLD_CRITERIA[1] as PlanCriterion;
    const input: LivePlanInput = {
      packName: "demo",
      criteria: [renamed, second, NEW_CRITERION],
      fixtures: [
        ...oldFixtures.map((fixture) =>
          scoredFixture(fixture, ["demo/first", "demo/second"]),
        ),
        ...fixturesOf([NEW_CRITERION]).map(newFixture),
      ],
      currentSetPngHashes: [...oldFixtures, ...fixturesOf([NEW_CRITERION])].map(
        pngHashOf,
      ),
      storedSetHash: hashPngHashes(oldFixtures.map(pngHashOf)),
      scoredPngHashes: oldFixtures.map(pngHashOf),
      rewordedCriteria: [],
      rerunSameSet: false,
    };
    expect(() => planLiveRun(input)).toThrow(
      /demo\/renamed has never been scored on its own fixture fixtures\/first\.positive\.png/,
    );
  });

  it("refuses a saved file that records another image", () => {
    const input = inputWithNewCriterion();
    const changed: PlanFixture = {
      ...(input.fixtures[0] as PlanFixture),
      pngSha256: pngHashOf("something else"),
    };
    expect(() =>
      planLiveRun({
        ...input,
        fixtures: [changed, ...input.fixtures.slice(1)],
      }),
    ).toThrow(/belong to another image/);
  });

  it("with --rerun-same-set asks every pair and lists the later files to delete", () => {
    const input = inputWithNewCriterion();
    const first = input.fixtures[0] as PlanFixture;
    const withTwoFiles: PlanFixture = {
      ...first,
      savedFiles: [
        ...first.savedFiles,
        {
          fileName: "first.positive.png.answers-2.json",
          imageSha256: first.pngSha256,
          questionIds: ["demo/third"],
        },
      ],
    };
    const plans = planLiveRun({
      ...input,
      fixtures: [withTwoFiles, ...input.fixtures.slice(1)],
      rerunSameSet: true,
    });
    expect(plans).toHaveLength(6);
    expect(plans[0]).toEqual({
      fixture: "fixtures/first.positive.png",
      criteria: ["demo/first", "demo/second", "demo/third"],
      answersFileName: "first.positive.png.answers.json",
      fileNamesToDelete: ["first.positive.png.answers-2.json"],
    });
    expect(plans[1]?.fileNamesToDelete).toEqual([]);
  });
});

describe("planReplay", () => {
  const packCriteria = ["demo/first", "demo/second", "demo/third"];

  it("replays a file that answers every criterion with the whole pack", () => {
    const plans = planReplay("demo", packCriteria, "fixtures/a.png", [
      {
        fileName: "a.png.answers.json",
        questionIds: ["demo/first", "demo/second", "demo/third"],
      },
    ]);
    expect(plans).toEqual([
      {
        fileName: "a.png.answers.json",
        criteria: packCriteria,
        coversWholePack: true,
      },
    ]);
  });

  it("splits a fixture's files by the criteria each one answers", () => {
    const plans = planReplay("demo", packCriteria, "fixtures/a.png", [
      {
        fileName: "a.png.answers.json",
        questionIds: ["demo/second", "demo/first"],
      },
      {
        fileName: "a.png.answers-2.json",
        questionIds: ["demo/third", "demo/third#box"],
      },
    ]);
    expect(plans).toEqual([
      {
        fileName: "a.png.answers.json",
        criteria: ["demo/first", "demo/second"],
        coversWholePack: false,
      },
      {
        fileName: "a.png.answers-2.json",
        criteria: ["demo/third"],
        coversWholePack: false,
      },
    ]);
  });

  it("refuses a fixture with no saved file", () => {
    expect(() =>
      planReplay("demo", packCriteria, "fixtures/a.png", []),
    ).toThrow(/no saved answers; record them with npm run test:live/);
  });

  it("refuses a criterion with no answer", () => {
    expect(() =>
      planReplay("demo", packCriteria, "fixtures/a.png", [
        {
          fileName: "a.png.answers.json",
          questionIds: ["demo/first", "demo/second"],
        },
      ]),
    ).toThrow(/no saved answer for demo\/third/);
  });

  it("refuses two files that answer the same criterion", () => {
    expect(() =>
      planReplay("demo", packCriteria, "fixtures/a.png", [
        {
          fileName: "a.png.answers.json",
          questionIds: ["demo/first", "demo/second", "demo/third"],
        },
        { fileName: "a.png.answers-2.json", questionIds: ["demo/third"] },
      ]),
    ).toThrow(/both answer demo\/third/);
  });

  it("refuses an answer to a criterion that is not in the pack", () => {
    expect(() =>
      planReplay("demo", packCriteria, "fixtures/a.png", [
        {
          fileName: "a.png.answers.json",
          questionIds: ["demo/first", "demo/second", "demo/third", "demo/gone"],
        },
      ]),
    ).toThrow(/demo\/gone is not in the pack/);
  });
});

describe("answers file names", () => {
  it("names the first file as the harness always has and numbers the later ones", () => {
    expect(answersFileNameFor("a.png", 1)).toBe("a.png.answers.json");
    expect(answersFileNameFor("a.png", 2)).toBe("a.png.answers-2.json");
    expect(answersFileNumber("a.png", "a.png.answers.json")).toBe(1);
    expect(answersFileNumber("a.png", "a.png.answers-12.json")).toBe(12);
  });

  it("does not read other files as answers files of the image", () => {
    expect(answersFileNumber("a.png", "b.png.answers.json")).toBeNull();
    expect(answersFileNumber("a.png", "a.png.answers-1.json")).toBeNull();
    expect(answersFileNumber("a.png", "a.png.answers-02.json")).toBeNull();
    expect(answersFileNumber("a.png", ".a.png.answers.json.1.tmp")).toBeNull();
  });

  it("maps a Box question id to its criterion", () => {
    expect(criterionForQuestionId("demo/first#box")).toBe("demo/first");
    expect(criterionForQuestionId("demo/first")).toBe("demo/first");
  });
});

describe("a reworded criterion (EV-4 rule 5, R-4, crit-q25.23)", () => {
  /** Criteria A and B, each with one positive and one negative fixture of its own. */
  const criteria: PlanCriterion[] = [
    {
      criterion: "demo/A",
      positive: ["fixtures/A.positive.png"],
      negative: ["fixtures/A.negative.png"],
    },
    {
      criterion: "demo/B",
      positive: ["fixtures/B.positive.png"],
      negative: ["fixtures/B.negative.png"],
    },
  ];
  const questionA = hashPngHashes(["question A"]);
  const oldQuestionB = hashPngHashes(["old question B"]);
  const newQuestionB = hashPngHashes(["new question B"]);
  const thirdQuestionB = hashPngHashes(["third question B"]);
  /** The pack now: A as it was, B reworded. */
  const currentQuestions = new Map<string, string>([
    ["demo/A", questionA],
    ["demo/B", newQuestionB],
  ]);
  /** The asked list after the first run: one question for each criterion. */
  const askedOnce: AskedQuestionHash[] = [
    { questionSha256: questionA, criterion: "demo/A" },
    { questionSha256: oldQuestionB, criterion: "demo/B" },
  ];

  /** The first answers file of a fixture: A and B, with B asked its old question. */
  function firstFile(fixture: string): RecordedAnswersFile {
    return {
      fileName: `${fixture.slice("fixtures/".length)}.answers.json`,
      imageSha256: pngHashOf(fixture),
      questionIds: ["demo/A", "demo/B"],
      questionSha256ByCriterion: new Map([
        ["demo/A", questionA],
        ["demo/B", oldQuestionB],
      ]),
    };
  }

  /** The second answers file of a fixture: B alone, asked its new question. */
  function secondFile(fixture: string): RecordedAnswersFile {
    return {
      fileName: `${fixture.slice("fixtures/".length)}.answers-2.json`,
      imageSha256: pngHashOf(fixture),
      questionIds: ["demo/B"],
      questionSha256ByCriterion: new Map([["demo/B", newQuestionB]]),
    };
  }

  /** The plan input for a live run after B is reworded, with every fixture scored once. */
  function rewordedInput(): LivePlanInput {
    const fixtures = fixturesOf(criteria);
    const planFixtures: PlanFixture[] = [];
    for (const fixture of fixtures) {
      const current = keepCurrentAnswers(firstFile(fixture), currentQuestions);
      planFixtures.push({
        fixture,
        pngSha256: pngHashOf(fixture),
        savedFiles: [current.savedFile],
        olderAnswerCriteria: olderAnswerCriteriaOf(current.questionIdsToDrop),
      });
    }
    return {
      packName: "demo",
      criteria,
      fixtures: planFixtures,
      currentSetPngHashes: fixtures.map(pngHashOf),
      storedSetHash: hashPngHashes(fixtures.map(pngHashOf)),
      scoredPngHashes: fixtures.map(pngHashOf),
      rewordedCriteria: findRewordedCriteria(
        "demo",
        currentQuestions,
        askedOnce,
        true,
      ),
      rerunSameSet: false,
    };
  }

  it("finds the criterion whose current question was never asked", () => {
    expect(
      findRewordedCriteria("demo", currentQuestions, askedOnce, true),
    ).toEqual(["demo/B"]);
  });

  it("plans a live run that asks only the reworded criterion on every fixture of the pack", () => {
    expect(planLiveRun(rewordedInput())).toEqual([
      {
        fixture: "fixtures/A.positive.png",
        criteria: ["demo/B"],
        answersFileName: "A.positive.png.answers-2.json",
        fileNamesToDelete: [],
      },
      {
        fixture: "fixtures/A.negative.png",
        criteria: ["demo/B"],
        answersFileName: "A.negative.png.answers-2.json",
        fileNamesToDelete: [],
      },
      {
        fixture: "fixtures/B.positive.png",
        criteria: ["demo/B"],
        answersFileName: "B.positive.png.answers-2.json",
        fileNamesToDelete: [],
      },
      {
        fixture: "fixtures/B.negative.png",
        criteria: ["demo/B"],
        answersFileName: "B.negative.png.answers-2.json",
        fileNamesToDelete: [],
      },
    ]);
  });

  it("refuses --rerun-same-set with a rewording and names the reworded criterion", () => {
    expect(() =>
      planLiveRun({ ...rewordedInput(), rerunSameSet: true }),
    ).toThrow(
      /--rerun-same-set cannot score the reworded demo\/B.*normal live run/,
    );
  });

  it("still refuses the scored set when a pair of a criterion that is not reworded is unscored", () => {
    const input = rewordedInput();
    const withNewCriterion: PlanCriterion = {
      criterion: "demo/C",
      positive: ["fixtures/A.positive.png"],
      negative: ["fixtures/A.negative.png"],
    };
    expect(() =>
      planLiveRun({ ...input, criteria: [...criteria, withNewCriterion] }),
    ).toThrow(/already scored this fixture set/);
  });

  it("replays A from the first file and B from the second, ignoring the old answers to B", () => {
    const currentFirst = keepCurrentAnswers(
      firstFile("fixtures/A.positive.png"),
      currentQuestions,
    );
    expect(currentFirst.questionIdsToDrop).toEqual(["demo/B"]);
    const currentSecond = keepCurrentAnswers(
      secondFile("fixtures/A.positive.png"),
      currentQuestions,
    );
    const plans = planReplay(
      "demo",
      ["demo/A", "demo/B"],
      "fixtures/A.positive.png",
      [currentFirst.savedFile, currentSecond.savedFile],
    );
    expect(plans).toEqual([
      {
        fileName: "A.positive.png.answers.json",
        criteria: ["demo/A"],
        coversWholePack: false,
      },
      {
        fileName: "A.positive.png.answers-2.json",
        criteria: ["demo/B"],
        coversWholePack: false,
      },
    ]);
  });

  it("stops the replay when no saved file answers the reworded criterion's current question", () => {
    const currentFirst = keepCurrentAnswers(
      firstFile("fixtures/A.positive.png"),
      currentQuestions,
    );
    expect(() =>
      planReplay("demo", ["demo/A", "demo/B"], "fixtures/A.positive.png", [
        currentFirst.savedFile,
      ]),
    ).toThrow(
      /no saved answer for demo\/B to its current question; record it with npm run test:live/,
    );
  });

  it("refuses a second rewording of the same criterion and names it", () => {
    const askedTwice: AskedQuestionHash[] = [
      ...askedOnce,
      { questionSha256: newQuestionB, criterion: "demo/B" },
    ];
    const thirdQuestions = new Map<string, string>([
      ["demo/A", questionA],
      ["demo/B", thirdQuestionB],
    ]);
    expect(() =>
      findRewordedCriteria("demo", thirdQuestions, askedTwice, true),
    ).toThrow(/demo\/B .*R-4 allows one rewording per criterion id/);
  });

  it("keeps a criterion reworded when its new question was already asked in part", () => {
    const askedTwice: AskedQuestionHash[] = [
      ...askedOnce,
      { questionSha256: newQuestionB, criterion: "demo/B" },
    ];
    expect(
      findRewordedCriteria("demo", currentQuestions, askedTwice, true),
    ).toEqual(["demo/B"]);
    // With one question per id, the current question is the first one and nothing is reworded.
    const firstQuestions = new Map<string, string>([
      ["demo/A", questionA],
      ["demo/B", oldQuestionB],
    ]);
    expect(
      findRewordedCriteria("demo", firstQuestions, askedOnce, true),
    ).toEqual([]);
  });

  it("refuses a third question after a rewording run that stopped part way", () => {
    const askedTwice: AskedQuestionHash[] = [
      ...askedOnce,
      { questionSha256: newQuestionB, criterion: "demo/B" },
    ];
    const thirdQuestions = new Map<string, string>([
      ["demo/A", questionA],
      ["demo/B", thirdQuestionB],
    ]);
    expect(() =>
      findRewordedCriteria("demo", thirdQuestions, askedTwice, true),
    ).toThrow(/R-4 allows one rewording per criterion id/);
  });

  /**
   * The plan input after a rewording run of B that stopped part way: the asked list holds B's old
   * and new questions, and the first two fixtures already have a second file with B's new answer.
   */
  function halfRewordedInput(answeredFixtures: number): LivePlanInput {
    const fixtures = fixturesOf(criteria);
    const askedTwice: AskedQuestionHash[] = [
      ...askedOnce,
      { questionSha256: newQuestionB, criterion: "demo/B" },
    ];
    const planFixtures: PlanFixture[] = [];
    for (const [index, fixture] of fixtures.entries()) {
      const first = keepCurrentAnswers(firstFile(fixture), currentQuestions);
      const savedFiles: SavedAnswersFile[] = [first.savedFile];
      if (index < answeredFixtures) {
        savedFiles.push(
          keepCurrentAnswers(secondFile(fixture), currentQuestions).savedFile,
        );
      }
      planFixtures.push({
        fixture,
        pngSha256: pngHashOf(fixture),
        savedFiles,
        olderAnswerCriteria: olderAnswerCriteriaOf(first.questionIdsToDrop),
      });
    }
    return {
      packName: "demo",
      criteria,
      fixtures: planFixtures,
      currentSetPngHashes: fixtures.map(pngHashOf),
      storedSetHash: hashPngHashes(fixtures.map(pngHashOf)),
      scoredPngHashes: fixtures.map(pngHashOf),
      rewordedCriteria: findRewordedCriteria(
        "demo",
        currentQuestions,
        askedTwice,
        true,
      ),
      rerunSameSet: false,
    };
  }

  it("resumes a rewording run that stopped part way and asks only the fixtures left", () => {
    const input = halfRewordedInput(2);
    expect(input.rewordedCriteria).toEqual(["demo/B"]);
    expect(planLiveRun(input)).toEqual([
      {
        fixture: "fixtures/B.positive.png",
        criteria: ["demo/B"],
        answersFileName: "B.positive.png.answers-2.json",
        fileNamesToDelete: [],
      },
      {
        fixture: "fixtures/B.negative.png",
        criteria: ["demo/B"],
        answersFileName: "B.negative.png.answers-2.json",
        fileNamesToDelete: [],
      },
    ]);
  });

  it("refuses --rerun-same-set while the reworded criterion has fixtures left to ask", () => {
    expect(() =>
      planLiveRun({ ...halfRewordedInput(2), rerunSameSet: true }),
    ).toThrow(/--rerun-same-set cannot score the reworded demo\/B/);
  });

  it("still refuses a finished reworded criterion that lost every answer on its own scored fixture", () => {
    // B's rewording is finished. B.positive.png lost all its files, so it has no answer to B at
    // all, which is not a rewording pair. A new criterion C with a new fixture changes the set.
    const finished = halfRewordedInput(4);
    const withNewCriterion: PlanCriterion = {
      criterion: "demo/C",
      positive: ["fixtures/C.positive.png"],
      negative: [],
    };
    const fixtures: PlanFixture[] = [];
    for (const fixture of finished.fixtures) {
      if (fixture.fixture === "fixtures/B.positive.png") {
        fixtures.push(newFixture(fixture.fixture));
      } else {
        fixtures.push(fixture);
      }
    }
    fixtures.push(newFixture("fixtures/C.positive.png"));
    expect(() =>
      planLiveRun({
        ...finished,
        criteria: [...criteria, withNewCriterion],
        fixtures,
        currentSetPngHashes: [
          ...(finished.currentSetPngHashes ?? []),
          pngHashOf("fixtures/C.positive.png"),
        ],
      }),
    ).toThrow(
      /demo\/B has never been scored on its own fixture fixtures\/B\.positive\.png/,
    );
  });

  it("plans --rerun-same-set as before once the reworded criterion is answered on every fixture", () => {
    const input = halfRewordedInput(4);
    const plans = planLiveRun({ ...input, rerunSameSet: true });
    expect(plans.map((plan) => plan.criteria)).toEqual([
      ["demo/A", "demo/B"],
      ["demo/A", "demo/B"],
      ["demo/A", "demo/B"],
      ["demo/A", "demo/B"],
    ]);
    expect(plans[0]).toEqual({
      fixture: "fixtures/A.positive.png",
      criteria: ["demo/A", "demo/B"],
      answersFileName: "A.positive.png.answers.json",
      fileNamesToDelete: ["A.positive.png.answers-2.json"],
    });
  });

  it("refuses saved answers with no asked list, and allows a first run with neither", () => {
    expect(() =>
      findRewordedCriteria("demo", currentQuestions, null, true),
    ).toThrow(/asked-question-sha256\.txt does not/);
    expect(findRewordedCriteria("demo", currentQuestions, null, false)).toEqual(
      [],
    );
  });

  it("does not read a record file as an answers file", () => {
    expect(
      answersFileNumber("a.png", "a.png.answers.questions.json"),
    ).toBeNull();
    expect(
      answersFileNumber("a.png", "a.png.answers-2.questions.json"),
    ).toBeNull();
  });
});

describe("a criterion respelled from British to US spelling (R-4, crit-q25.24)", () => {
  // The British spellings in this block stand for the old question and id (CS-26).
  const questionA = hashPngHashes(["question A"]);
  const britishQuestionB = hashPngHashes(["Is the colour of B wrong?"]);
  const usQuestionB = hashPngHashes(["Is the color of B wrong?"]);
  const rewordedQuestionB = hashPngHashes(["Does B use the wrong color?"]);
  const secondRewordingB = hashPngHashes(["Is B the wrong color?"]);

  /** A respelled under its own id: B's question changed spelling only. */
  const respelledInPlace: Respelling = {
    questions: [
      {
        criterion: "demo/B",
        britishQuestionSha256: britishQuestionB,
        usQuestionSha256: usQuestionB,
      },
    ],
    criterionIds: new Map<string, string>(),
  };

  /** B renamed from demo/colour-B to demo/color-B, and its question respelled. */
  const respelledAndRenamed: Respelling = {
    questions: [
      {
        criterion: "demo/color-B",
        britishQuestionSha256: britishQuestionB,
        usQuestionSha256: usQuestionB,
      },
    ],
    criterionIds: new Map<string, string>([["demo/colour-B", "demo/color-B"]]),
  };

  /** The asked list after the first run, with B asked in British spelling under the given id. */
  function askedBefore(criterionB: string): AskedQuestionHash[] {
    return [
      { questionSha256: questionA, criterion: "demo/A" },
      { questionSha256: britishQuestionB, criterion: criterionB },
    ];
  }

  it("asks a respelled question again without counting the British question as a rewording", () => {
    const current = new Map<string, string>([
      ["demo/A", questionA],
      ["demo/B", usQuestionB],
    ]);
    expect(
      findRewordedCriteria(
        "demo",
        current,
        askedBefore("demo/B"),
        true,
        respelledInPlace,
      ),
    ).toEqual(["demo/B"]);
  });

  it("allows one real rewording after the respelling, then refuses the next", () => {
    const askedAfterRespelling: AskedQuestionHash[] = [
      ...askedBefore("demo/B"),
      { questionSha256: usQuestionB, criterion: "demo/B" },
    ];
    const reworded = new Map<string, string>([
      ["demo/A", questionA],
      ["demo/B", rewordedQuestionB],
    ]);
    expect(
      findRewordedCriteria(
        "demo",
        reworded,
        askedAfterRespelling,
        true,
        respelledInPlace,
      ),
    ).toEqual(["demo/B"]);
    // Without the respelling entry the same history already holds two questions, so it is refused.
    expect(() =>
      findRewordedCriteria("demo", reworded, askedAfterRespelling, true),
    ).toThrow(/demo\/B .*R-4 allows one rewording per criterion id/);

    const askedAfterRewording: AskedQuestionHash[] = [
      ...askedAfterRespelling,
      { questionSha256: rewordedQuestionB, criterion: "demo/B" },
    ];
    const rewordedAgain = new Map<string, string>([
      ["demo/A", questionA],
      ["demo/B", secondRewordingB],
    ]);
    expect(() =>
      findRewordedCriteria(
        "demo",
        rewordedAgain,
        askedAfterRewording,
        true,
        respelledInPlace,
      ),
    ).toThrow(/demo\/B .*R-4 allows one rewording per criterion id/);
  });

  it("counts the British question when the listed US question was never asked", () => {
    // The current question is a real rewording, not the listed US question, so the British
    // question and the earlier rewording both count, and a second rewording is refused.
    const askedWithRewording: AskedQuestionHash[] = [
      ...askedBefore("demo/B"),
      { questionSha256: rewordedQuestionB, criterion: "demo/B" },
    ];
    const rewordedAgain = new Map<string, string>([
      ["demo/A", questionA],
      ["demo/B", secondRewordingB],
    ]);
    expect(() =>
      findRewordedCriteria(
        "demo",
        rewordedAgain,
        askedWithRewording,
        true,
        respelledInPlace,
      ),
    ).toThrow(/demo\/B .*R-4 allows one rewording per criterion id/);
  });

  /** Criteria A and the renamed B, each with one positive and one negative fixture of its own. */
  const renamedCriteria: PlanCriterion[] = [
    {
      criterion: "demo/A",
      positive: ["fixtures/A.positive.png"],
      negative: ["fixtures/A.negative.png"],
    },
    {
      criterion: "demo/color-B",
      positive: ["fixtures/color-B.positive.png"],
      negative: ["fixtures/color-B.negative.png"],
    },
  ];
  const renamedCurrent = new Map<string, string>([
    ["demo/A", questionA],
    ["demo/color-B", usQuestionB],
  ]);

  /** The first answers file of a fixture: A, and B under its old id in British spelling. */
  function firstFileBeforeRename(fixture: string): RecordedAnswersFile {
    return {
      fileName: `${fixture.slice("fixtures/".length)}.answers.json`,
      imageSha256: pngHashOf(fixture),
      questionIds: ["demo/A", "demo/colour-B"],
      questionSha256ByCriterion: new Map([
        ["demo/A", questionA],
        ["demo/colour-B", britishQuestionB],
      ]),
    };
  }

  /** The live plan input after the rename, with every fixture scored once under the old id. */
  function renamedInput(respelling: Respelling): LivePlanInput {
    const fixtures = fixturesOf(renamedCriteria);
    const planFixtures: PlanFixture[] = [];
    for (const fixture of fixtures) {
      const current = keepCurrentAnswers(
        firstFileBeforeRename(fixture),
        renamedCurrent,
        respelling,
      );
      planFixtures.push({
        fixture,
        pngSha256: pngHashOf(fixture),
        savedFiles: [current.savedFile],
        olderAnswerCriteria: olderAnswerCriteriaOf(
          current.questionIdsToDrop,
          respelling,
        ),
      });
    }
    return {
      packName: "demo",
      criteria: renamedCriteria,
      fixtures: planFixtures,
      currentSetPngHashes: fixtures.map(pngHashOf),
      storedSetHash: hashPngHashes(fixtures.map(pngHashOf)),
      scoredPngHashes: fixtures.map(pngHashOf),
      rewordedCriteria: findRewordedCriteria(
        "demo",
        renamedCurrent,
        askedBefore("demo/colour-B"),
        true,
        respelling,
      ),
      rerunSameSet: false,
    };
  }

  it("keeps a respelled and renamed criterion reworded after its run stopped part way", () => {
    const askedAfterBrokenRun: AskedQuestionHash[] = [
      ...askedBefore("demo/colour-B"),
      { questionSha256: usQuestionB, criterion: "demo/color-B" },
    ];
    expect(
      findRewordedCriteria(
        "demo",
        renamedCurrent,
        askedAfterBrokenRun,
        true,
        respelledAndRenamed,
      ),
    ).toEqual(["demo/color-B"]);
  });

  it("lets a renamed id inherit the old id's question and asks it on every scored fixture", () => {
    const input = renamedInput(respelledAndRenamed);
    expect(input.rewordedCriteria).toEqual(["demo/color-B"]);
    const plans = planLiveRun(input);
    expect(plans.map((plan) => plan.criteria)).toEqual([
      ["demo/color-B"],
      ["demo/color-B"],
      ["demo/color-B"],
      ["demo/color-B"],
    ]);
    expect(plans.map((plan) => plan.answersFileName)).toEqual([
      "A.positive.png.answers-2.json",
      "A.negative.png.answers-2.json",
      "color-B.positive.png.answers-2.json",
      "color-B.negative.png.answers-2.json",
    ]);
  });

  it("leaves the answers under the old id out of the replay", () => {
    const currentFirst = keepCurrentAnswers(
      firstFileBeforeRename("fixtures/A.positive.png"),
      renamedCurrent,
      respelledAndRenamed,
    );
    expect(currentFirst.questionIdsToDrop).toEqual(["demo/colour-B"]);
    const secondFile: SavedAnswersFile = {
      fileName: "A.positive.png.answers-2.json",
      imageSha256: pngHashOf("fixtures/A.positive.png"),
      questionIds: ["demo/color-B"],
    };
    expect(
      planReplay(
        "demo",
        ["demo/A", "demo/color-B"],
        "fixtures/A.positive.png",
        [currentFirst.savedFile, secondFile],
      ),
    ).toEqual([
      {
        fileName: "A.positive.png.answers.json",
        criteria: ["demo/A"],
        coversWholePack: false,
      },
      {
        fileName: "A.positive.png.answers-2.json",
        criteria: ["demo/color-B"],
        coversWholePack: false,
      },
    ]);
  });

  it("still refuses a rename that is not in the map", () => {
    const input = renamedInput(NO_RESPELLING);
    expect(input.rewordedCriteria).toEqual([]);
    // The whole set is scored and no criterion is reworded, so the set guard refuses the run.
    expect(() => planLiveRun(input)).toThrow(/already scored this fixture set/);
    // With no stored set, the rule about a criterion's own scored fixtures refuses it.
    expect(() =>
      planLiveRun({
        ...input,
        currentSetPngHashes: null,
        storedSetHash: null,
      }),
    ).toThrow(
      /demo\/color-B has never been scored on its own fixture .*looks like a rewording/,
    );
    const currentFirst = keepCurrentAnswers(
      firstFileBeforeRename("fixtures/A.positive.png"),
      renamedCurrent,
    );
    expect(() =>
      planReplay(
        "demo",
        ["demo/A", "demo/color-B"],
        "fixtures/A.positive.png",
        [currentFirst.savedFile],
      ),
    ).toThrow(/demo\/colour-B is not in the pack/);
  });
});
