// Checks every entry of spelling.ts (PRD R-4, NFR-15, crit-q25.24): each listed question changed
// from British to US spelling and nothing else, the British question is the one the asked list
// recorded, and each renamed id is its old id respelled. A change that is not only spelling
// cannot enter the lists, because the British hash would not match. The British forms in this
// file quote the old text (CS-26).

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  hashCriterionQuestion,
  parseAskedQuestionHashes,
} from "./question-hash.ts";
import { RESPELLED_CRITERION_IDS, RESPELLED_QUESTIONS } from "./spelling.ts";

/** The folder of this file; import.meta.url is this file's own address. */
const HARNESS_DIRECTORY = dirname(fileURLToPath(import.meta.url));

/** The model whose asked lists hold the British questions. */
const MODEL = "jev-1.14.0";

/** The only respellings allowed, US form to British form, in lower case (R-4). */
const US_TO_BRITISH = new Map<string, string>([
  ["color", "colour"],
  ["colors", "colours"],
  ["colored", "coloured"],
  ["center", "centre"],
  ["centers", "centres"],
  ["centered", "centred"],
  ["gray", "grey"],
]);

/** The same respellings, British form to US form. */
const BRITISH_TO_US = new Map<string, string>();
for (const [us, british] of US_TO_BRITISH) {
  BRITISH_TO_US.set(british, us);
}

/**
 * Return text with every whole word in the map respelled, keeping a capital first letter. Only
 * lower case and capitalized words are respelled, as the PRD R-4 row says.
 */
function respellWords(
  text: string,
  words: ReadonlyMap<string, string>,
): string {
  return text.replace(/[A-Za-z]+/g, (word) => {
    const lower = word.toLowerCase();
    const replacement = words.get(lower);
    if (replacement === undefined) {
      return word;
    }
    if (word === lower) {
      return replacement;
    }
    const capitalized = lower.charAt(0).toUpperCase() + lower.slice(1);
    if (word === capitalized) {
      return replacement.charAt(0).toUpperCase() + replacement.slice(1);
    }
    return word;
  });
}

/** Return a copy of a parsed YAML value with every string in it respelled by the map. */
function respellValue(
  value: unknown,
  words: ReadonlyMap<string, string>,
): unknown {
  if (typeof value === "string") {
    return respellWords(value, words);
  }
  if (Array.isArray(value)) {
    const items: unknown[] = [];
    for (const item of value) {
      items.push(respellValue(item, words));
    }
    return items;
  }
  if (typeof value === "object" && value !== null) {
    const fields: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(value)) {
      fields[key] = respellValue(field, words);
    }
    return fields;
  }
  return value;
}

/**
 * The question fields of each respelled criterion as pack.yaml held them when they were respelled,
 * in US spelling (crit-q25.24). A later rewording changes pack.yaml and not this copy.
 */
const US_QUESTIONS = new Map<string, object>([
  [
    "basics/text-reads-faint",
    {
      question: {
        type: "noul",
        instructions:
          "In the image at screenshot: Is there text that is pale against its background, such as light gray text on white?",
        criteria: {
          true: "Some text is pale against its background, such as light gray text on white.",
          false: "All text stands out clearly from its background.",
        },
      },
    },
  ],
  [
    "basics/centered-or-right-paragraphs",
    {
      question: {
        type: "noul",
        instructions:
          "In the image at screenshot: Is a paragraph of four or more lines centered or right-aligned?",
        criteria: {
          true: "A paragraph of four or more lines is centered or right-aligned.",
          false: "Every paragraph of four or more lines is set flush left.",
        },
      },
    },
  ],
  [
    "dataviz/rainbow-for-ordered-values",
    {
      question: {
        type: "noul",
        instructions:
          "In the image at screenshot, does a chart or map show values that run from low to high with a rainbow of unrelated hues, such as red, yellow, green, and blue, instead of one color that grows lighter or darker?",
        criteria: {
          true: "A chart or map shows values that run from low to high with a rainbow of unrelated hues, so the colors do not read as an order from low to high.",
          false:
            "Values that run from low to high are shown with one color, or two, that grow lighter or darker in order, or the image shows no such chart or map.",
        },
      },
    },
  ],
  [
    "dataviz/color-without-meaning",
    {
      question: {
        type: "noul",
        instructions:
          "In the image at screenshot, are the bars or marks of a single series drawn in many different colors that encode nothing, when one color would show the same data?",
        criteria: {
          true: "The bars or marks of a single series are drawn in many different colors that encode nothing, and one color would show the same data.",
          false:
            "Each chart uses color only to tell apart series or categories that the legend or labels name, or draws a single series in one color, or the image shows no chart.",
        },
      },
    },
  ],
  [
    "layout/everything-centered",
    {
      question: {
        type: "noul",
        instructions:
          "In the image at screenshot, is every block on the page, including headings, paragraphs of several lines, and buttons, centered on one vertical axis?",
        criteria: {
          true: "Every block on the page, including headings, paragraphs of several lines, and buttons, is centered on one vertical axis.",
          false:
            "At least one heading, paragraph, or button is not centered on the page's vertical axis.",
        },
      },
    },
  ],
  [
    "typography/heading-indistinct",
    {
      question: {
        type: "noul",
        instructions:
          "In the image at screenshot: Is there a short line standing on its own above a paragraph, where a heading would go, that is set in the same size, weight, and color as the paragraph text under it? Judge only what is visible.",
        criteria: {
          true: "A short line stands on its own above a paragraph, where a heading would go, in the same size, weight, and color as the paragraph text.",
          false:
            "Every short line that stands on its own above a paragraph is larger, bolder, or a different color from the paragraph text.",
        },
      },
    },
  ],
  [
    "typography/headings-differ-only-in-size",
    {
      question: {
        type: "noul",
        instructions:
          "In the image at screenshot: Are the headings set in the same weight, style, and color as the body text, so that they differ from it only in size? Judge only what is visible.",
        criteria: {
          true: "The headings have the same weight, style, and color as the body text and differ from it only in size.",
          false:
            "The headings differ from the body text in weight, style, typeface, or color as well as in size.",
        },
      },
    },
  ],
]);

/** Return the old id of a criterion that a respelling renamed, or the id itself. */
function oldIdOf(criterion: string): string {
  for (const [oldId, newId] of RESPELLED_CRITERION_IDS) {
    if (newId === criterion) {
      return oldId;
    }
  }
  return criterion;
}

describe("the respelled questions (R-4, crit-q25.24)", () => {
  it("has one US question copy for each listed question", () => {
    const listed = RESPELLED_QUESTIONS.map((entry) => entry.criterion).sort();
    expect([...US_QUESTIONS.keys()].sort()).toEqual(listed);
  });

  for (const entry of RESPELLED_QUESTIONS) {
    it(`${entry.criterion}: the old question is the new one with only listed words respelled`, () => {
      const usQuestion = US_QUESTIONS.get(entry.criterion);
      if (usQuestion === undefined) {
        throw new Error(`no US question copy for ${entry.criterion}`);
      }
      expect(hashCriterionQuestion(usQuestion)).toBe(entry.usQuestionSha256);
      const britishQuestion = respellValue(usQuestion, US_TO_BRITISH);
      if (typeof britishQuestion !== "object" || britishQuestion === null) {
        throw new Error("respelling a question gave no object");
      }
      expect(hashCriterionQuestion(britishQuestion)).toBe(
        entry.britishQuestionSha256,
      );
      expect(entry.britishQuestionSha256).not.toBe(entry.usQuestionSha256);
    });

    it(`${entry.criterion}: the asked list recorded the British question under the old id`, () => {
      const [pack] = entry.criterion.split("/");
      const askedListPath = join(
        HARNESS_DIRECTORY,
        "runs",
        pack ?? "",
        MODEL,
        "asked-question-sha256.txt",
      );
      const asked = parseAskedQuestionHashes(
        readFileSync(askedListPath, "utf8"),
      );
      expect(asked).toContainEqual({
        questionSha256: entry.britishQuestionSha256,
        criterion: oldIdOf(entry.criterion),
      });
    });
  }
});

describe("the respelled criterion ids (R-4, crit-q25.24)", () => {
  it("lists at least one renamed id", () => {
    expect(RESPELLED_CRITERION_IDS.size).toBeGreaterThan(0);
  });

  for (const [oldId, newId] of RESPELLED_CRITERION_IDS) {
    it(`${oldId} becomes ${newId} by spelling alone`, () => {
      expect(newId).not.toBe(oldId);
      expect(respellWords(oldId, BRITISH_TO_US)).toBe(newId);
      const respelledQuestion = RESPELLED_QUESTIONS.find(
        (entry) => entry.criterion === newId,
      );
      expect(respelledQuestion).toBeDefined();
    });
  }
});
