// Disposable unit test of src/cli/help.ts (CS-22). It compares each command's Flags list with the
// option tables the parser in args.ts uses, so a flag added to the parser without a help line
// fails here even when no help text or usage line names it (FR-76). The durable check of the same
// rule, through the built bundle, is in evals/help-and-version.test.ts.

import { describe, expect, it } from "vitest";
import {
  type HelpTopic,
  REPORT_OPTIONS,
  SHARED_REPORT_OPTIONS,
} from "./args.js";
import { renderHelp } from "./help.js";

/** Returns the long flags of the Flags section of one help text, sorted, without --help. */
function listLongFlags(helpText: string): string[] {
  const flags: string[] = [];
  let insideFlags = false;
  for (const line of helpText.split("\n")) {
    if (line === "Flags:") {
      insideFlags = true;
      continue;
    }
    if (insideFlags && line === "") {
      break;
    }
    const match = /^ {2}--([a-z-]+)/.exec(line);
    if (insideFlags && match?.[1] !== undefined && match[1] !== "help") {
      flags.push(match[1]);
    }
  }
  flags.sort();
  return flags;
}

/** Returns the option names of a parser option table, sorted. */
function listOptionNames(options: object): string[] {
  const names = Object.keys(options);
  names.sort();
  return names;
}

describe("renderHelp Flags lists", () => {
  const expectedByTopic: [HelpTopic, string[]][] = [
    ["report", listOptionNames(REPORT_OPTIONS)],
    ["compare", listOptionNames(REPORT_OPTIONS)],
    ["gate", listOptionNames(SHARED_REPORT_OPTIONS)],
    // The packs commands take no option; their parser is given an empty table.
    ["packs-validate", []],
    ["packs-test", []],
  ];
  for (const [topic, optionNames] of expectedByTopic) {
    it(`${topic}: lists exactly the options its parser takes, plus --help`, () => {
      const helpText = renderHelp(topic);
      expect(listLongFlags(helpText)).toEqual(optionNames);
      expect(helpText).toContain("  --help, -h");
    });
  }
});
