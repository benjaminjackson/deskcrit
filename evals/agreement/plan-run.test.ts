import { describe, expect, it } from "vitest";
import { hashPngHashes } from "./frozen-set.ts";
import {
  answersFileNameFor,
  answersFileNumber,
  criterionForQuestionId,
  type LivePlanInput,
  type PlanCriterion,
  type PlanFixture,
  planLiveRun,
  planReplay,
} from "./plan-run.ts";

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
  };
}

/** A fixture with no saved answers file. */
function newFixture(fixture: string): PlanFixture {
  return { fixture, pngSha256: pngHashOf(fixture), savedFiles: [] };
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
