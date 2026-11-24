// Unit tests of the recheck critic evaluation on template tells (EV-24). A stub stands in for the
// `claude` child process, so no model is asked (CS-21). The last block checks the committed work
// orders and answer file with file reads only.

import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import {
  findingStatus,
  parsePairAnswers,
  RECHECK_PROMPT_TEMPLATE,
  RECHECK_TELLS_DIRECTORY,
  runRecheckTells,
  workOrderFindingIds,
} from "./recheck-tells.ts";
import type { ClaudeRunner } from "./run-critic.ts";
import { parseTellsManifest } from "./tells.ts";

const REPOSITORY_DIRECTORY = resolve(import.meta.dirname, "..", "..");
const SKILL_DIRECTORY = join(
  REPOSITORY_DIRECTORY,
  "plugin",
  "skills",
  "design-critic",
);
const TELLS = parseTellsManifest(
  readFileSync(
    join(REPOSITORY_DIRECTORY, "packs", "_tells", "tells.json"),
    "utf8",
  ),
);

/** Returns the stdout that `claude -p --output-format json` prints for a final message. */
function claudeStdout(result: string): string {
  return JSON.stringify({
    type: "result",
    subtype: "success",
    is_error: false,
    result,
    modelUsage: { "claude-opus-5-5": {} },
    permission_denials: [],
  });
}

/** Returns the stdout of a judge call whose structured answer is `answer`. */
function judgeStdout(answer: unknown): string {
  return JSON.stringify({
    type: "result",
    subtype: "success",
    is_error: false,
    result: "",
    structured_output: answer,
    modelUsage: { "claude-opus-5-5": {} },
  });
}

/** Makes a copy of the committed recheck-tells folder without results, in a new temp folder. */
function copyOfInputs(): string {
  const folder = mkdtempSync(join(tmpdir(), "recheck-tells-test-"));
  cpSync(
    join(RECHECK_TELLS_DIRECTORY, "work-orders"),
    join(folder, "work-orders"),
    {
      recursive: true,
    },
  );
  cpSync(
    join(RECHECK_TELLS_DIRECTORY, "answers.json"),
    join(folder, "answers.json"),
  );
  return folder;
}

/** A stub `claude`: --version, a recheck that marks every finding closed, new problem, or a judge answer. */
const stub: ClaudeRunner = async (args) => {
  if (args[0] === "--version") {
    return { exitCode: 0, stdout: "2.0.0 (Claude Code)\n", stderr: "" };
  }
  if (args.includes("--json-schema")) {
    return {
      exitCode: 0,
      stdout: judgeStdout({
        reason: "stub",
        lists_as_new_problem: true,
        marks_closed_new_problem: false,
        praises: false,
      }),
      stderr: "",
    };
  }
  return {
    exitCode: 0,
    stdout: claudeStdout(
      "**First read.** Stub.\n\n**New problems.** A stub problem.",
    ),
    stderr: "",
  };
};

describe("findingStatus", () => {
  const recheck = [
    "**Finding status**",
    "- hero-flat: closed, new problem. The new shape is a tell.",
    "- **faint-text**: open. Still faint.",
    "- `table-gap`: closed. Fixed.",
  ].join("\n");

  it("reads the status of each finding, longest status first", () => {
    expect(findingStatus(recheck, "hero-flat")).toBe("closed, new problem");
    expect(findingStatus(recheck, "faint-text")).toBe("open");
    expect(findingStatus(recheck, "table-gap")).toBe("closed");
    expect(findingStatus(recheck, "other")).toBe("not found");
  });

  it("accepts a dash or parentheses before new problem and a numbered list marker", () => {
    const variants = [
      "1. hero-flat: closed - new problem. A tell.",
      "- hero-flat: closed (new problem: a tell).",
      "- hero-flat: Closed \u2014 new problem.",
    ];
    for (const line of variants) {
      expect(findingStatus(line, "hero-flat")).toBe("closed, new problem");
    }
    expect(findingStatus("2. table-gap: worse.", "table-gap")).toBe("worse");
  });

  it("reports unparsed, not closed, when other words follow closed", () => {
    expect(findingStatus("- hero-flat: closed by eye.", "hero-flat")).toBe(
      "unparsed",
    );
    expect(findingStatus("- hero-flat: mostly closed.", "hero-flat")).toBe(
      "unparsed",
    );
  });
});

describe("RECHECK_PROMPT_TEMPLATE", () => {
  it("is the step 3 prompt of crit-loop SKILL.md without the facts line", () => {
    const skill = readFileSync(
      join(REPOSITORY_DIRECTORY, "plugin", "skills", "crit-loop", "SKILL.md"),
      "utf8",
    );
    // The prompt is the first fenced block after "3. Start a fresh recheck critic", indented by
    // three spaces under the list item.
    const afterStep = skill.slice(
      skill.indexOf("3. Start a fresh recheck critic"),
    );
    const block = afterStep.split("```")[1];
    if (block === undefined) {
      throw new Error("no prompt block after step 3");
    }
    const prompt = block
      .split("\n")
      .slice(1)
      .map((line) => line.replace(/^ {3}/, ""))
      .filter((line) => !line.startsWith("Measured facts file:"))
      .join("\n")
      .trim();
    expect(RECHECK_PROMPT_TEMPLATE).toBe(prompt);
  });
});

describe("parsePairAnswers", () => {
  it("refuses a finding id without an expected close", () => {
    const text = JSON.stringify(
      TELLS.map((tell) => ({
        template: tell.template,
        tell_closes_finding: false,
        finding_id: "x",
      })),
    );
    expect(() => parsePairAnswers(text, TELLS)).toThrow(/finding_id/);
  });

  it("refuses a missing pair", () => {
    expect(() => parsePairAnswers("[]", TELLS)).toThrow(/no entry/);
  });
});

describe("runRecheckTells with a stub critic and a stub judge", () => {
  it("runs live, saves each recheck once, and replays with no child process", async () => {
    const folder = copyOfInputs();
    const options = {
      repositoryDirectory: REPOSITORY_DIRECTORY,
      recheckTellsDirectory: folder,
      skillDirectory: SKILL_DIRECTORY,
      runClaude: stub,
    };
    const live = await runRecheckTells(["--skill-commit", "abc"], options);
    expect(live.errorText).toBe("");
    expect(live.exitCode).toBe(0);
    expect(live.text).toContain(`Total`);
    expect(live.text).toContain(`1.00 (${TELLS.length}/${TELLS.length})`);
    const saved = readdirSync(join(folder, "results", "abc")).filter((name) =>
      name.endsWith(".md"),
    );
    expect(saved).toHaveLength(TELLS.length);

    const noChild: ClaudeRunner = async () => {
      throw new Error("replay started a child process");
    };
    const replay = await runRecheckTells(
      ["--replay", "--skill-commit", "abc"],
      {
        ...options,
        runClaude: noChild,
      },
    );
    expect(replay.exitCode).toBe(0);
    expect(replay.text).toBe(live.text);
  });

  it("names a failed recheck run, goes on with the others, and exits 2", async () => {
    const folder = copyOfInputs();
    let calls = 0;
    const failingOnce: ClaudeRunner = async (
      args,
      environment,
      workingDirectory,
    ) => {
      if (args[0] === "-p" && !args.includes("--json-schema")) {
        calls += 1;
        if (calls === 1) {
          return { exitCode: 1, stdout: "", stderr: "usage limit" };
        }
      }
      return stub(args, environment, workingDirectory);
    };
    const output = await runRecheckTells(
      ["--skill-commit", "abc", "--parallel", "1"],
      {
        repositoryDirectory: REPOSITORY_DIRECTORY,
        recheckTellsDirectory: folder,
        skillDirectory: SKILL_DIRECTORY,
        runClaude: failingOnce,
      },
    );
    expect(output.exitCode).toBe(2);
    expect(output.errorText).toMatch(/recheck run failed: .*usage limit/);
    expect(output.errorText).not.toContain("missing recheck of");
    const saved = readdirSync(join(folder, "results", "abc")).filter((name) =>
      name.endsWith(".md"),
    );
    expect(saved).toHaveLength(TELLS.length - 1);
  });

  it("names a failed judge call, judges the other pairs, and exits 2", async () => {
    const folder = copyOfInputs();
    let judgeCalls = 0;
    const judgeFailsOnce: ClaudeRunner = async (
      args,
      environment,
      workingDirectory,
    ) => {
      if (args.includes("--json-schema")) {
        judgeCalls += 1;
        if (judgeCalls === 1) {
          return { exitCode: 1, stdout: "", stderr: "usage limit" };
        }
      }
      return stub(args, environment, workingDirectory);
    };
    const output = await runRecheckTells(
      ["--skill-commit", "abc", "--parallel", "1"],
      {
        repositoryDirectory: REPOSITORY_DIRECTORY,
        recheckTellsDirectory: folder,
        skillDirectory: SKILL_DIRECTORY,
        runClaude: judgeFailsOnce,
      },
    );
    expect(output.exitCode).toBe(2);
    expect(judgeCalls).toBe(TELLS.length);
    expect(output.errorText).toMatch(
      new RegExp(`^judge failed: ${TELLS[0]?.template}: `, "m"),
    );
    const total = TELLS.length - 1;
    expect(output.text).toContain(`1.00 (${total}/${total})`);
  });

  it("counts closed-new-problem only when the status line agrees with the judge", async () => {
    const folder = copyOfInputs();
    const judgeSaysClosed: ClaudeRunner = async (
      args,
      environment,
      workingDirectory,
    ) => {
      if (args.includes("--json-schema")) {
        return {
          exitCode: 0,
          stdout: judgeStdout({
            reason: "stub",
            lists_as_new_problem: true,
            marks_closed_new_problem: true,
            praises: false,
          }),
          stderr: "",
        };
      }
      return stub(args, environment, workingDirectory);
    };
    const output = await runRecheckTells(["--skill-commit", "abc"], {
      repositoryDirectory: REPOSITORY_DIRECTORY,
      recheckTellsDirectory: folder,
      skillDirectory: SKILL_DIRECTORY,
      runClaude: judgeSaysClosed,
    });
    // The stub recheck has no "Finding status" line, so no expected finding reads
    // "closed, new problem", and the judge's yes alone does not count.
    const expected = parsePairAnswers(
      readFileSync(join(folder, "answers.json"), "utf8"),
      TELLS,
    ).filter((answer) => answer.tellClosesFinding).length;
    expect(output.text).toMatch(
      new RegExp(`^Total .* 0\\.00 \\(0/${expected}\\)`, "m"),
    );
  });

  it("exits 2 on a replay with nothing saved", async () => {
    const folder = copyOfInputs();
    mkdirSync(join(folder, "results"), { recursive: true });
    writeFileSync(join(folder, "results", ".keep"), "");
    const output = await runRecheckTells(
      ["--replay", "--skill-commit", "abc"],
      {
        repositoryDirectory: REPOSITORY_DIRECTORY,
        recheckTellsDirectory: folder,
        skillDirectory: SKILL_DIRECTORY,
        runClaude: stub,
      },
    );
    expect(output.exitCode).toBe(2);
    expect(output.errorText).toContain("missing recheck of");
  });
});

describe("the committed work orders and answer file", () => {
  const schema = JSON.parse(
    readFileSync(
      join(REPOSITORY_DIRECTORY, "schemas", "work-order.schema.json"),
      "utf8",
    ),
  );
  const validate = new Ajv2020({ strict: false }).compile(schema);
  const answers = parsePairAnswers(
    readFileSync(join(RECHECK_TELLS_DIRECTORY, "answers.json"), "utf8"),
    TELLS,
  );

  it("has one work order per pair and no other", () => {
    const names = readdirSync(
      join(RECHECK_TELLS_DIRECTORY, "work-orders"),
    ).sort();
    expect(names).toEqual(TELLS.map((tell) => `${tell.template}.json`).sort());
  });

  it.each(TELLS.map((tell, index) => [tell.template, index] as const))(
    "%s validates and holds the finding its answer names",
    (template, index) => {
      const text = readFileSync(
        join(RECHECK_TELLS_DIRECTORY, "work-orders", `${template}.json`),
        "utf8",
      );
      const valid = validate(JSON.parse(text));
      expect(validate.errors ?? []).toEqual([]);
      expect(valid).toBe(true);
      const findingId = answers[index]?.findingId;
      if (findingId !== null && findingId !== undefined) {
        expect(workOrderFindingIds(text)).toContain(findingId);
      }
    },
  );
});
