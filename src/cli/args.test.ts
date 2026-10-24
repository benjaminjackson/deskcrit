// Disposable unit tests for parseReportArguments (FR-60, FR-2, FR-4, OQ-25 c and e, CS-22).

import { describe, expect, it } from "vitest";
import { CouldNotRunError } from "../shared/could-not-run-error.js";
import { parseReportArguments } from "./args.js";

describe("parseReportArguments", () => {
  it("reads the image, repeated --pack and --context, --facts, and --json", () => {
    const parsed = parseReportArguments([
      "report",
      "home.png",
      "--pack",
      "./a",
      "--pack",
      "./b",
      "--context",
      "purpose=poster seen from three metres",
      "--context",
      "platform=web",
      "--facts",
      "facts.json",
      "--json",
    ]);
    expect(parsed).toEqual({
      imagePath: "home.png",
      packDirectories: ["./a", "./b"],
      contextFlags: {
        purpose: "poster seen from three metres",
        platform: "web",
      },
      factsPath: "facts.json",
      json: true,
    });
  });

  it("gives defaults when only the image is given", () => {
    expect(parseReportArguments(["report", "home.png"])).toEqual({
      imagePath: "home.png",
      packDirectories: [],
      contextFlags: {},
      factsPath: undefined,
      json: false,
    });
  });

  it("splits a pair on the first = so the value may hold =", () => {
    const parsed = parseReportArguments([
      "report",
      "home.png",
      "--context",
      "purpose=a=b",
    ]);
    expect(parsed.contextFlags).toEqual({ purpose: "a=b" });
  });

  const badCommandLines: { name: string; argv: string[]; message: string }[] = [
    { name: "no arguments", argv: [], message: "no command given" },
    {
      name: "an unknown command",
      argv: ["judge", "x.png"],
      message: "unknown command judge",
    },
    { name: "no image", argv: ["report"], message: "no image given" },
    {
      name: "two pairs after one --context",
      argv: ["report", "x.png", "--context", "purpose=a", "platform=web"],
      message: "unexpected argument platform=web",
    },
    {
      name: "an unknown flag",
      argv: ["report", "x.png", "--colour"],
      message: "--colour",
    },
    {
      name: "a flag with no value",
      argv: ["report", "x.png", "--pack"],
      message: "--pack",
    },
    {
      name: "a pair with no =",
      argv: ["report", "x.png", "--context", "platform"],
      message: "--context platform: expected key=value",
    },
    {
      name: "a pair with an empty key",
      argv: ["report", "x.png", "--context", "=web"],
      message: "--context =web: the key is empty",
    },
    {
      name: "an unknown context key",
      argv: ["report", "x.png", "--context", "colour=red"],
      message: "unknown key colour",
    },
  ];
  for (const badCommandLine of badCommandLines) {
    it(`throws CouldNotRunError for ${badCommandLine.name}`, () => {
      expect(() => parseReportArguments(badCommandLine.argv)).toThrow(
        CouldNotRunError,
      );
      expect(() => parseReportArguments(badCommandLine.argv)).toThrow(
        badCommandLine.message,
      );
    });
  }
});
