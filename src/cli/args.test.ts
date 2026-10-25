// Disposable unit tests for parseReportArguments and parseCommand (FR-49, FR-60, FR-2, FR-4, OQ-25 c and e, CS-22).

import { describe, expect, it } from "vitest";
import { CouldNotRunError } from "../shared/could-not-run-error.js";
import {
  COMPARE_USAGE,
  parseCommand,
  parseCompareArguments,
  parseReportArguments,
} from "./args.js";

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
      "purpose=poster seen from three meters",
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
        purpose: "poster seen from three meters",
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

  it("reads --save-answers and --answers, and allows both together (FR-42, FR-60, OQ-26)", () => {
    const parsed = parseReportArguments([
      "report",
      "home.png",
      "--save-answers",
      "out.json",
      "--answers",
      "in.json",
    ]);
    expect(parsed.saveAnswersPath).toBe("out.json");
    expect(parsed.answersPath).toBe("in.json");
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
      argv: ["report", "x.png", "--color"],
      message: "--color",
    },
    {
      name: "an unknown flag, in crit's own words (NFR-1)",
      argv: ["report", "x.png", "--color=red"],
      message: "unknown option --color\nusage: crit report <image>",
    },
    {
      name: "an unknown short flag",
      argv: ["report", "x.png", "-x"],
      message: "unknown option -x\nusage: crit report <image>",
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
      name: "--answers given twice",
      argv: ["report", "x.png", "--answers", "a.json", "--answers", "b.json"],
      message: "--answers is given more than once",
    },
    {
      name: "--save-answers given twice",
      argv: [
        "report",
        "x.png",
        "--save-answers",
        "a.json",
        "--save-answers=b.json",
      ],
      message: "--save-answers is given more than once",
    },
    {
      name: "an unknown context key",
      argv: ["report", "x.png", "--context", "color=red"],
      message: "unknown key color",
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

describe("parseCommand", () => {
  it("returns the report arguments for crit report", () => {
    const command = parseCommand(["report", "home.png"]);
    expect(command.command).toBe("report");
  });

  it("returns the directory for crit packs validate", () => {
    expect(parseCommand(["packs", "validate", "packs/basics"])).toEqual({
      command: "packs-validate",
      directory: "packs/basics",
    });
  });

  it("returns the directory for crit packs test", () => {
    expect(parseCommand(["packs", "test", "packs/basics"])).toEqual({
      command: "packs-test",
      directory: "packs/basics",
    });
  });

  it("returns the report arguments for crit gate, with no --save-answers (FR-60)", () => {
    const command = parseCommand(["gate", "home.png", "--answers", "a.json"]);
    expect(command.command).toBe("gate");
    if (command.command === "gate") {
      expect(command.args.answersPath).toBe("a.json");
      expect(command.args.saveAnswersPath).toBeUndefined();
    }
  });

  it("rejects --save-answers for crit gate in crit's own words (FR-60)", () => {
    expect(() =>
      parseCommand(["gate", "home.png", "--save-answers", "a.json"]),
    ).toThrow("unknown option --save-answers\nusage: crit gate <image>");
  });

  it("names an unknown flag of crit packs validate in crit's own words", () => {
    expect(() =>
      parseCommand(["packs", "validate", "packs/basics", "--json"]),
    ).toThrow("unknown option --json\nusage: crit packs validate <dir>");
  });

  it("lists every usage line when no command is given", () => {
    expect(() => parseCommand([])).toThrow("usage: crit report");
    expect(() => parseCommand([])).toThrow("usage: crit packs validate <dir>");
    expect(() => parseCommand([])).toThrow("usage: crit packs test <dir>");
  });

  const badPacksCommandLines: {
    name: string;
    argv: string[];
    message: string;
  }[] = [
    {
      name: "no packs subcommand",
      argv: ["packs"],
      message: "no packs command given",
    },
    {
      name: "an unknown packs subcommand",
      argv: ["packs", "add", "packs/basics"],
      message: "unknown command packs add",
    },
    {
      name: "packs test with no directory",
      argv: ["packs", "test"],
      message: "usage: crit packs test <dir>",
    },
    {
      name: "packs test with two directories",
      argv: ["packs", "test", "a", "b"],
      message: "unexpected argument b",
    },
    {
      name: "packs test with a flag, because it has no --answers or --json",
      argv: ["packs", "test", "a", "--answers", "x.json"],
      message: "usage: crit packs test <dir>",
    },
    {
      name: "no directory",
      argv: ["packs", "validate"],
      message: "no pack directory given",
    },
    {
      name: "two directories",
      argv: ["packs", "validate", "a", "b"],
      message: "unexpected argument b",
    },
    {
      name: "a flag",
      argv: ["packs", "validate", "a", "--json"],
      message: "--json",
    },
  ];
  for (const badCommandLine of badPacksCommandLines) {
    it(`throws CouldNotRunError for ${badCommandLine.name}`, () => {
      expect(() => parseCommand(badCommandLine.argv)).toThrow(CouldNotRunError);
      expect(() => parseCommand(badCommandLine.argv)).toThrow(
        badCommandLine.message,
      );
    });
  }
});

describe("parseCompareArguments (FR-42, FR-60)", () => {
  /** Return the message of the CouldNotRunError that parsing this command line throws. */
  function compareError(argv: string[]): string {
    try {
      parseCompareArguments(argv);
    } catch (error) {
      expect(error).toBeInstanceOf(CouldNotRunError);
      return error instanceof Error ? error.message : "";
    }
    throw new Error("expected CouldNotRunError");
  }

  it("reads the before and the after image and every report option", () => {
    expect(
      parseCompareArguments([
        "compare",
        "before.png",
        "after.png",
        "--pack",
        "./a",
        "--context",
        "platform=web",
        "--facts",
        "facts.json",
        "--json",
        "--save-answers",
        "out.json",
        "--answers",
        "in.json",
      ]),
    ).toEqual({
      beforePath: "before.png",
      afterPath: "after.png",
      packDirectories: ["./a"],
      contextFlags: { platform: "web" },
      factsPath: "facts.json",
      json: true,
      saveAnswersPath: "out.json",
      answersPath: "in.json",
    });
  });

  it("is what parseCommand gives for a line that starts with compare", () => {
    expect(parseCommand(["compare", "a.png", "b.png"])).toEqual({
      command: "compare",
      args: {
        beforePath: "a.png",
        afterPath: "b.png",
        packDirectories: [],
        contextFlags: {},
        factsPath: undefined,
        json: false,
        saveAnswersPath: undefined,
        answersPath: undefined,
      },
    });
  });

  it("says which image is missing, with the compare usage line", () => {
    expect(compareError(["compare"])).toBe(
      `no before image given\n${COMPARE_USAGE}`,
    );
    expect(compareError(["compare", "a.png"])).toBe(
      `no after image given\n${COMPARE_USAGE}`,
    );
  });

  it("rejects a third image, an unknown option, and a repeated --answers", () => {
    expect(compareError(["compare", "a.png", "b.png", "c.png"])).toBe(
      `unexpected argument c.png; give each --context pair its own flag\n${COMPARE_USAGE}`,
    );
    expect(compareError(["compare", "a.png", "b.png", "--color"])).toBe(
      `unknown option --color\n${COMPARE_USAGE}`,
    );
    expect(
      compareError([
        "compare",
        "a.png",
        "b.png",
        "--answers",
        "x",
        "--answers",
        "y",
      ]),
    ).toBe(`--answers is given more than once\n${COMPARE_USAGE}`);
  });
});
