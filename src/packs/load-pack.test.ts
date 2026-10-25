import { describe, expect, it } from "vitest";
import { CouldNotRunError } from "../shared/could-not-run-error.js";
import type { PackProblem } from "../shared/pack.js";
import { checkPack, loadPack } from "./load-pack.js";

/** The pack fields above the criteria list, shared by every test pack. */
const packHeader = `name: test-pack
version: 1.0.0
title: Test pack
license: MIT
criteria:
`;

/** A noul criterion that passes every check, as YAML lines indented to sit in the criteria list. */
const noulCriterion = `  - id: faint-body-text
    title: Body text has too little contrast
    source: W3C, WCAG 2.2, Success Criterion 1.4.3
    question:
      type: noul
      instructions: Is the body text in the image at image faint against its background?
      criteria:
        true: The body text is faint against its background.
        false: The body text stands out clearly from its background.
    fail_when:
      probability_at_least: 0.7
    fix: Darken the text or lighten the background until the text stands out.
`;

/** A score criterion that passes every check. */
const scoreCriterion = `  - id: single-focal-point
    title: The page has no single focal point
    source: Robin Williams, The Non-Designer's Design Book
    question:
      type: score
      instructions: How many elements in the image at image compete to be seen first?
      levels:
        - One element is clearly seen first.
        - Two elements compete to be seen first.
        - Three or more elements compete to be seen first.
    pass_when:
      level_at_most: 0
    warn_when:
      level_at_most: 1
    fix: Make one element larger or stronger than the rest.
`;

/** A choice criterion that passes every check. */
const choiceCriterion = `  - id: line-length
    title: Lines of body text are too long or too short
    source: Robert Bringhurst, The Elements of Typographic Style
    question:
      type: choice
      instructions: How long are the lines of body text in the image at image?
      criteria:
        short: Most lines hold fewer than 45 characters.
        comfortable: Most lines hold 45 to 75 characters.
        long: Most lines hold more than 75 characters.
    pass_when:
      option_is: comfortable
    min_confidence: 0.6
    fix: Set the text column width so lines hold 45 to 75 characters.
`;

/** Returns the problems for a pack that must be rejected, and fails the test when it loads. */
function readProblems(yamlText: string): PackProblem[] {
  const result = checkPack(yamlText);
  if (result.ok) {
    throw new Error("expected the pack to be rejected, but it loaded");
  }
  return result.problems;
}

/** Returns the criterion and field of each problem, the two things US-6 says a problem names. */
function readPlaces(
  yamlText: string,
): Array<{ criterion: string | undefined; field: string }> {
  const places: Array<{ criterion: string | undefined; field: string }> = [];
  for (const problem of readProblems(yamlText)) {
    places.push({ criterion: problem.criterion, field: problem.field });
  }
  return places;
}

describe("checkPack", () => {
  it("loads one criterion of each question type to the expected value", () => {
    const result = checkPack(
      packHeader + noulCriterion + scoreCriterion + choiceCriterion,
    );
    expect(result).toEqual({
      ok: true,
      pack: {
        name: "test-pack",
        version: "1.0.0",
        title: "Test pack",
        license: "MIT",
        criteria: [
          {
            id: "faint-body-text",
            title: "Body text has too little contrast",
            source: "W3C, WCAG 2.2, Success Criterion 1.4.3",
            question: {
              type: "noul",
              instructions:
                "Is the body text in the image at image faint against its background?",
              criteria: {
                true: "The body text is faint against its background.",
                false: "The body text stands out clearly from its background.",
              },
            },
            fail_when: { probability_at_least: 0.7 },
            fix: "Darken the text or lighten the background until the text stands out.",
          },
          {
            id: "single-focal-point",
            title: "The page has no single focal point",
            source: "Robin Williams, The Non-Designer's Design Book",
            question: {
              type: "score",
              instructions:
                "How many elements in the image at image compete to be seen first?",
              levels: [
                "One element is clearly seen first.",
                "Two elements compete to be seen first.",
                "Three or more elements compete to be seen first.",
              ],
            },
            pass_when: { level_at_most: 0 },
            warn_when: { level_at_most: 1 },
            fix: "Make one element larger or stronger than the rest.",
          },
          {
            id: "line-length",
            title: "Lines of body text are too long or too short",
            source: "Robert Bringhurst, The Elements of Typographic Style",
            question: {
              type: "choice",
              instructions:
                "How long are the lines of body text in the image at image?",
              criteria: [
                {
                  option: "short",
                  description: "Most lines hold fewer than 45 characters.",
                },
                {
                  option: "comfortable",
                  description: "Most lines hold 45 to 75 characters.",
                },
                {
                  option: "long",
                  description: "Most lines hold more than 75 characters.",
                },
              ],
            },
            pass_when: { option_is: "comfortable" },
            min_confidence: 0.6,
            fix: "Set the text column width so lines hold 45 to 75 characters.",
          },
        ],
      },
    });
  });

  it("loads the faint-body-text and single-focal-point examples from the verdict rule table", () => {
    expect(checkPack(packHeader + noulCriterion).ok).toBe(true);
    expect(checkPack(packHeader + scoreCriterion).ok).toBe(true);
  });

  it("keeps the YAML order of choice options", () => {
    const yamlText =
      packHeader +
      choiceCriterion
        .replace("short:", "zeta:")
        .replace("comfortable:", "mid:")
        .replace("long:", "alpha:")
        .replace("option_is: comfortable", "option_is: mid");
    const result = checkPack(yamlText);
    if (!result.ok) {
      throw new Error(JSON.stringify(result.problems));
    }
    const question = result.pack.criteria[0]?.question;
    if (question?.type !== "choice") {
      throw new Error("expected a choice question");
    }
    const optionNames: string[] = [];
    for (const option of question.criteria) {
      optionNames.push(option.option);
    }
    expect(optionNames).toEqual(["zeta", "mid", "alpha"]);
  });

  it("rejects a choice option name that looks like an integer, because an object would reorder it", () => {
    const yamlText =
      packHeader +
      choiceCriterion
        .replace("comfortable:", "2:")
        .replace("option_is: comfortable", 'option_is: "2"');
    expect(readPlaces(yamlText)).toEqual([
      { criterion: "line-length", field: "question.criteria.2" },
    ]);
    expect(() => loadPack(yamlText, "packs/test-pack")).toThrow(
      /^packs\/test-pack: invalid pack\n {2}criterion line-length, field question\.criteria\.2: the option name "2" looks like an integer/,
    );
  });

  it("gives the same result and the same problems for the same text", () => {
    const validText = packHeader + noulCriterion + choiceCriterion;
    expect(checkPack(validText)).toEqual(checkPack(validText));
    const invalidText = `${packHeader + noulCriterion}    extra: 1\n  - id: Bad\n`;
    expect(readProblems(invalidText)).toEqual(readProblems(invalidText));
  });

  describe("YAML parsing (NFR-13, CS-4)", () => {
    it.each(["!foo", "!!js/function", "!!binary", "!!timestamp", "!!set"])(
      "rejects the custom tag %s",
      (tag) => {
        const yamlText = (packHeader + noulCriterion).replace(
          "title: Body text",
          `title: ${tag} Body text`,
        );
        expect(readPlaces(yamlText)).toContainEqual({
          criterion: undefined,
          field: "yaml",
        });
      },
    );

    it("rejects a duplicate key", () => {
      const yamlText = (packHeader + noulCriterion).replace(
        "    fix:",
        "    title: Again\n    fix:",
      );
      expect(readPlaces(yamlText)).toEqual([
        { criterion: undefined, field: "yaml" },
      ]);
    });

    it('rejects true: and "true": in one map as a duplicate key', () => {
      const yamlText = (packHeader + noulCriterion).replace(
        "        false:",
        '        "true": Again.\n        false:',
      );
      expect(readPlaces(yamlText)).toEqual([
        { criterion: undefined, field: "yaml" },
      ]);
    });

    it("rejects a second YAML document", () => {
      const yamlText = `${packHeader + noulCriterion}---\nname: other\n`;
      expect(readPlaces(yamlText)).toContainEqual({
        criterion: undefined,
        field: "yaml",
      });
    });

    it("rejects an alias", () => {
      const yamlText = (packHeader + noulCriterion).replace(
        "    title: Body text has too little contrast",
        "    title: &shared Body text has too little contrast\n    link: *shared",
      );
      expect(readProblems(yamlText)).toEqual([
        {
          criterion: undefined,
          field: "yaml",
          message: "aliases (*name) are not allowed in a pack",
        },
      ]);
    });

    it("keeps unquoted no, off, and yes as strings, and the noul keys as the strings true and false", () => {
      const yamlText = (packHeader + noulCriterion)
        .replace("title: Body text has too little contrast", "title: no")
        .replace(
          "source: W3C, WCAG 2.2, Success Criterion 1.4.3",
          "source: off",
        )
        .replace(
          "fix: Darken the text or lighten the background until the text stands out.",
          "fix: yes",
        );
      const result = checkPack(yamlText);
      if (!result.ok) {
        throw new Error(JSON.stringify(result.problems));
      }
      const criterion = result.pack.criteria[0];
      expect(criterion?.title).toBe("no");
      expect(criterion?.source).toBe("off");
      expect(criterion?.fix).toBe("yes");
      const question = criterion?.question;
      if (question?.type !== "noul") {
        throw new Error("expected a noul question");
      }
      expect(Object.keys(question.criteria)).toEqual(["true", "false"]);
    });
  });

  describe("unknown fields (FR-44)", () => {
    it("rejects an unknown pack field", () => {
      const yamlText = `script: run.sh\n${packHeader}${noulCriterion}`;
      expect(readPlaces(yamlText)).toEqual([
        { criterion: undefined, field: "script" },
      ]);
    });

    it("rejects an unknown criterion field", () => {
      const yamlText = `${packHeader + noulCriterion}    run: rm -rf /\n`;
      expect(readPlaces(yamlText)).toEqual([
        { criterion: "faint-body-text", field: "run" },
      ]);
    });

    it("rejects an unknown question field", () => {
      const yamlText = (packHeader + noulCriterion).replace(
        "      type: noul",
        "      type: noul\n      hint: Look closely.",
      );
      expect(readPlaces(yamlText)).toEqual([
        { criterion: "faint-body-text", field: "question.hint" },
      ]);
    });

    it("rejects an unknown predicate field", () => {
      const yamlText = (packHeader + noulCriterion).replace(
        "      probability_at_least: 0.7",
        "      probability_above: 0.7",
      );
      expect(readPlaces(yamlText)).toEqual([
        { criterion: "faint-body-text", field: "fail_when.probability_above" },
      ]);
    });

    it("rejects an unknown fixtures field", () => {
      const yamlText = `${packHeader + noulCriterion}    fixtures:\n      maybe: [a.png]\n`;
      expect(readPlaces(yamlText)).toEqual([
        { criterion: "faint-body-text", field: "fixtures.maybe" },
      ]);
    });
  });

  describe("required criterion fields (FR-45)", () => {
    it.each(["title", "source", "fix"])(
      "rejects a criterion without %s",
      (fieldName) => {
        const lines: string[] = [];
        for (const line of noulCriterion.split("\n")) {
          if (!line.startsWith(`    ${fieldName}:`)) {
            lines.push(line);
          }
        }
        expect(readPlaces(packHeader + lines.join("\n"))).toEqual([
          { criterion: "faint-body-text", field: fieldName },
        ]);
      },
    );

    it("rejects a criterion without id, and names the field from the pack root", () => {
      const yamlText = (packHeader + noulCriterion).replace(
        "  - id: faint-body-text\n    title:",
        "  - title:",
      );
      expect(readPlaces(yamlText)).toEqual([
        { criterion: undefined, field: "criteria.0.id" },
      ]);
    });

    it("rejects a criterion without question", () => {
      const lines: string[] = [];
      let insideQuestion = false;
      for (const line of noulCriterion.split("\n")) {
        if (line.startsWith("    question:")) {
          insideQuestion = true;
          continue;
        }
        if (insideQuestion && line.startsWith("      ")) {
          continue;
        }
        insideQuestion = false;
        lines.push(line);
      }
      expect(readPlaces(packHeader + lines.join("\n"))).toEqual([
        { criterion: "faint-body-text", field: "question" },
      ]);
    });

    it("rejects a criterion with none of fail_when, warn_when, pass_when", () => {
      const yamlText = (packHeader + noulCriterion).replace(
        "    fail_when:\n      probability_at_least: 0.7\n",
        "",
      );
      expect(readPlaces(yamlText)).toEqual([
        {
          criterion: "faint-body-text",
          field: "fail_when | warn_when | pass_when",
        },
      ]);
    });
  });

  describe("common-sense criteria (FR-45)", () => {
    /** The noul test criterion with its source set to Common sense, a reason, and warn_when in place of fail_when. */
    const commonSenseCriterion = noulCriterion
      .replace(
        "    source: W3C, WCAG 2.2, Success Criterion 1.4.3\n",
        "    source: Common sense\n    reason: Faint text is hard to read.\n",
      )
      .replace("    fail_when:", "    warn_when:");

    it("loads a common-sense criterion with a reason and only warn_when", () => {
      expect(checkPack(packHeader + commonSenseCriterion).ok).toBe(true);
    });

    it.each(["fail_when", "pass_when"])(
      "rejects a common-sense criterion that also has %s, because it may only warn",
      (fieldName) => {
        const yamlText = `${packHeader}${commonSenseCriterion}    ${fieldName}:\n      probability_at_least: 0.9\n`;
        expect(readProblems(yamlText)).toEqual([
          {
            criterion: "faint-body-text",
            field: fieldName,
            message:
              "is not allowed on a common-sense criterion, which may only warn (FR-45)",
          },
        ]);
      },
    );

    it.each(["common sense", "Common Sense", " Common sense", "Common sense."])(
      "rejects the near miss %j of Common sense, so it cannot have fail_when",
      (nearMiss) => {
        const yamlText = (packHeader + noulCriterion).replace(
          "    source: W3C, WCAG 2.2, Success Criterion 1.4.3\n",
          `    source: ${JSON.stringify(nearMiss)}\n`,
        );
        expect(readProblems(yamlText)).toEqual([
          {
            criterion: "faint-body-text",
            field: "source",
            message: "write the source as exactly `Common sense` (FR-45)",
          },
        ]);
      },
    );

    it("rejects a common-sense criterion without a reason", () => {
      const yamlText = (packHeader + commonSenseCriterion).replace(
        "    reason: Faint text is hard to read.\n",
        "",
      );
      expect(readPlaces(yamlText)).toEqual([
        { criterion: "faint-body-text", field: "reason" },
      ]);
    });
  });

  describe("predicates (verdict rule under FR-25)", () => {
    it("rejects a predicate with no keys", () => {
      const yamlText = (packHeader + noulCriterion).replace(
        "    fail_when:\n      probability_at_least: 0.7\n",
        "    fail_when: {}\n",
      );
      expect(readProblems(yamlText)).toEqual([
        {
          criterion: "faint-body-text",
          field: "fail_when",
          message: "must hold exactly one predicate",
        },
      ]);
    });

    it("rejects a predicate with two keys", () => {
      const yamlText = (packHeader + noulCriterion).replace(
        "      probability_at_least: 0.7\n",
        "      probability_at_least: 0.7\n      probability_at_most: 0.9\n",
      );
      expect(readPlaces(yamlText)).toEqual([
        { criterion: "faint-body-text", field: "fail_when" },
      ]);
    });

    it.each([
      [
        "noul",
        noulCriterion,
        "fail_when:\n      probability_at_least: 0.7",
        "level_at_most: 1",
      ],
      [
        "noul",
        noulCriterion,
        "fail_when:\n      probability_at_least: 0.7",
        "option_is: short",
      ],
      [
        "score",
        scoreCriterion,
        "pass_when:\n      level_at_most: 0",
        "probability_at_most: 0.2",
      ],
      [
        "score",
        scoreCriterion,
        "pass_when:\n      level_at_most: 0",
        "option_in: [short]",
      ],
      [
        "choice",
        choiceCriterion,
        "pass_when:\n      option_is: comfortable",
        "probability_at_least: 0.5",
      ],
      [
        "choice",
        choiceCriterion,
        "pass_when:\n      option_is: comfortable",
        "level_at_least: 1",
      ],
    ])(
      "rejects on a %s question the predicate %s replaced by %s",
      (_questionType, criterionText, oldPredicate, newPredicate) => {
        const fieldName = oldPredicate.split(":")[0] ?? "";
        const predicateKind = newPredicate.split(":")[0] ?? "";
        const yamlText =
          packHeader +
          criterionText.replace(
            oldPredicate,
            `${fieldName}:\n      ${newPredicate}`,
          );
        const places = readPlaces(yamlText);
        expect(places).toContainEqual({
          criterion: expect.any(String),
          field: `${fieldName}.${predicateKind}`,
        });
        for (const place of places) {
          expect(place.field.startsWith(fieldName)).toBe(true);
        }
      },
    );

    it("rejects an option_is that names no option in question.criteria", () => {
      const yamlText = (packHeader + choiceCriterion).replace(
        "option_is: comfortable",
        "option_is: comfy",
      );
      expect(readPlaces(yamlText)).toEqual([
        { criterion: "line-length", field: "pass_when.option_is" },
      ]);
    });

    it("rejects an option_in that names no option in question.criteria", () => {
      const yamlText = (packHeader + choiceCriterion).replace(
        "option_is: comfortable",
        "option_in: [comfortable, medium]",
      );
      expect(readPlaces(yamlText)).toEqual([
        { criterion: "line-length", field: "pass_when.option_in" },
      ]);
    });

    it("rejects a level past the last level in question.levels", () => {
      const yamlText = (packHeader + scoreCriterion).replace(
        "level_at_most: 1",
        "level_at_most: 3",
      );
      expect(readPlaces(yamlText)).toEqual([
        { criterion: "single-focal-point", field: "warn_when.level_at_most" },
      ]);
    });
  });

  describe("direction of pass_when and fail_when (FR-36)", () => {
    it("rejects pass_when probability_at_most with fail_when probability_at_most", () => {
      const yamlText = (packHeader + noulCriterion).replace(
        "      probability_at_least: 0.7\n",
        "      probability_at_most: 0.5\n    pass_when:\n      probability_at_most: 0.2\n",
      );
      expect(readPlaces(yamlText)).toEqual([
        { criterion: "faint-body-text", field: "pass_when, fail_when" },
      ]);
    });

    it("loads pass_when probability_at_most with fail_when probability_at_least", () => {
      const yamlText = (packHeader + noulCriterion).replace(
        "      probability_at_least: 0.7\n",
        "      probability_at_least: 0.7\n    pass_when:\n      probability_at_most: 0.2\n",
      );
      expect(checkPack(yamlText).ok).toBe(true);
    });

    it("rejects pass_when level_at_most with fail_when level_at_most", () => {
      const yamlText = (packHeader + scoreCriterion).replace(
        "    warn_when:\n      level_at_most: 1\n",
        "    fail_when:\n      level_at_most: 1\n",
      );
      expect(readPlaces(yamlText)).toEqual([
        { criterion: "single-focal-point", field: "pass_when, fail_when" },
      ]);
    });

    it("loads pass_when level_at_most with fail_when level_at_least", () => {
      const yamlText = (packHeader + scoreCriterion).replace(
        "    warn_when:\n      level_at_most: 1\n",
        "    fail_when:\n      level_at_least: 2\n",
      );
      expect(checkPack(yamlText).ok).toBe(true);
    });
  });

  describe("question shape (section 7.8)", () => {
    it("rejects a noul question without criteria", () => {
      const yamlText = (packHeader + noulCriterion).replace(
        "      criteria:\n        true: The body text is faint against its background.\n        false: The body text stands out clearly from its background.\n",
        "",
      );
      expect(readPlaces(yamlText)).toEqual([
        { criterion: "faint-body-text", field: "question.criteria" },
      ]);
    });

    it("rejects a noul question without the false key", () => {
      const yamlText = (packHeader + noulCriterion).replace(
        "        false: The body text stands out clearly from its background.\n",
        "",
      );
      expect(readPlaces(yamlText)).toEqual([
        { criterion: "faint-body-text", field: "question.criteria.false" },
      ]);
    });

    it("rejects a choice question without criteria", () => {
      const yamlText = (packHeader + choiceCriterion).replace(
        "      criteria:\n        short: Most lines hold fewer than 45 characters.\n        comfortable: Most lines hold 45 to 75 characters.\n        long: Most lines hold more than 75 characters.\n",
        "",
      );
      expect(readPlaces(yamlText)).toEqual([
        { criterion: "line-length", field: "question.criteria" },
      ]);
    });

    it("rejects a score question without levels", () => {
      const yamlText = (packHeader + scoreCriterion).replace(
        "      levels:\n        - One element is clearly seen first.\n        - Two elements compete to be seen first.\n        - Three or more elements compete to be seen first.\n",
        "",
      );
      expect(readPlaces(yamlText)).toEqual([
        { criterion: "single-focal-point", field: "question.levels" },
      ]);
    });

    it("rejects a score question that also has criteria", () => {
      const yamlText = (packHeader + scoreCriterion).replace(
        "      levels:",
        "      criteria:\n        a: A.\n      levels:",
      );
      expect(readPlaces(yamlText)).toEqual([
        { criterion: "single-focal-point", field: "question.criteria" },
      ]);
    });
  });

  it("rejects a criterion id that repeats an earlier one in the pack", () => {
    const yamlText =
      packHeader +
      noulCriterion +
      noulCriterion.replace(
        "probability_at_least: 0.7",
        "probability_at_least: 0.8",
      );
    expect(readPlaces(yamlText)).toEqual([
      { criterion: "faint-body-text", field: "id" },
    ]);
  });

  it("rejects min_confidence on a noul criterion (FR-27, OQ-21)", () => {
    const yamlText = `${packHeader + noulCriterion}    min_confidence: 0.6\n`;
    expect(readPlaces(yamlText)).toEqual([
      { criterion: "faint-body-text", field: "min_confidence" },
    ]);
  });

  it("rejects locate: true without locate_instructions (FR-16)", () => {
    const yamlText = `${packHeader + noulCriterion}    locate: true\n`;
    expect(readPlaces(yamlText)).toEqual([
      { criterion: "faint-body-text", field: "locate_instructions" },
    ]);
  });
});

describe("OQ-24 (d): requires paths start with facts.", () => {
  it("loads a requires path that starts with facts.", () => {
    const yamlText = `${packHeader + noulCriterion}    requires: [facts.viewport_width]\n`;
    expect(checkPack(yamlText).ok).toBe(true);
  });

  it("rejects a requires path that does not start with facts., naming the criterion and the field", () => {
    const yamlText = `${packHeader + noulCriterion}    requires: [viewport_width]\n`;
    expect(readPlaces(yamlText)).toEqual([
      { criterion: "faint-body-text", field: "requires.0" },
    ]);
  });
});

describe("loadPack", () => {
  it("returns the pack when it is valid", () => {
    const pack = loadPack(packHeader + noulCriterion, "packs/test-pack");
    expect(pack.name).toBe("test-pack");
  });

  it("throws CouldNotRunError with a message that names the pack label and each problem (FR-4, US-5, US-6)", () => {
    const yamlText = `${packHeader + noulCriterion}    min_confidence: 0.6\n`;
    expect(() => loadPack(yamlText, "packs/test-pack")).toThrow(
      CouldNotRunError,
    );
    expect(() => loadPack(yamlText, "packs/test-pack")).toThrow(
      /^packs\/test-pack: invalid pack\n {2}criterion faint-body-text, field min_confidence: /,
    );
  });
});
