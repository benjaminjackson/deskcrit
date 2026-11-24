import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  applyVerdicts,
  DROPPED_LINE_START,
  findingsFileText,
  parseVerdicts,
} from "../../plugin/skills/design-critic/scripts/refute.mjs";
import { parseChoice } from "./compare.ts";
import { buildDetectionQuestion } from "./detect.ts";
import {
  ensureRefutation,
  readSavedRefutation,
  refutationKey,
} from "./refute.ts";
import { rankedFindings, smallerThings, verdict } from "./repeat.ts";
import type { ClaudeRunner } from "./run-critic.ts";

// The check on ranked findings (PRD FR-81, ticket crit-0a0.3). The crit the user sees after the
// refuter must still read with the evaluation readers: the ranked list (repeat.ts), the judge
// prompt (detect.ts), and the last `Better:` line (compare.ts). The input crits are saved crits of
// skill commit 3a8d079, which the refuter evaluation in RESULTS.md also reads.

const RUNS = join(
  import.meta.dirname,
  "runs",
  "3a8d079b393465ca12ca83931416acd49717d971",
);
/** A one-image crit with 3 ranked findings. */
const THREE_FINDINGS = readFileSync(
  join(
    RUNS,
    "068b2ce5184e32c14e342af0b45f163129c24ff656bc80cad98276fa12b9141e",
    "1.md",
  ),
  "utf8",
);
/** A two-image compare crit with 3 ranked findings that ends with `Better: version 1` or 2. */
const COMPARE_CRIT = readFileSync(
  join(
    RUNS,
    "489a9a7e2f648c2598a9bea23662c6e9a734da5159ba0f75267f63e67f8455ba",
    "1.md",
  ),
  "utf8",
);
const SKILL_DIRECTORY = join(
  import.meta.dirname,
  "..",
  "..",
  "plugin",
  "skills",
  "design-critic",
);

const temporaryFolders: string[] = [];
afterEach(() => {
  for (const folder of temporaryFolders.splice(0)) {
    rmSync(folder, { recursive: true, force: true });
  }
});

/** Makes a new temporary folder that is removed after the test. */
function newFolder(): string {
  const folder = mkdtempSync(join(tmpdir(), "crit-refute-test-"));
  temporaryFolders.push(folder);
  return folder;
}

/** Returns the refuter's message as JSON text for the given verdict per finding. */
function message(verdicts: readonly ("keep" | "drop")[]): string {
  return JSON.stringify({
    findings: verdicts.map((value, index) => ({
      number: index + 1,
      verdict: value,
      evidence: `seen at place ${index + 1}`,
    })),
  });
}

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

describe("applying the refuter's verdicts", () => {
  it("drops a finding, numbers the rest from 1, keeps the other sections, and names it at the end", () => {
    const before = rankedFindings(THREE_FINDINGS);
    expect(before).toHaveLength(3);
    const after = applyVerdicts(
      THREE_FINDINGS,
      parseVerdicts(message(["keep", "drop", "keep"]), 3),
    );
    expect(rankedFindings(after)).toEqual([
      before[0]?.replace(/^1\./, "1."),
      before[2]?.replace(/^3\./, "2."),
    ]);
    expect(smallerThings(after)).toEqual(smallerThings(THREE_FINDINGS));
    expect(verdict(after)).toBe(verdict(THREE_FINDINGS));
    const lastLine = after.trimEnd().split("\n").at(-1) ?? "";
    expect(lastLine.startsWith(DROPPED_LINE_START)).toBe(true);
    expect(lastLine).toContain("seen at place 2");
    // The detection judge reads the whole crit after the refuter.
    const question = buildDetectionQuestion("title", "rule", "key", {
      runNumber: 1,
      critPath: "",
      metadataPath: "",
      crit: after,
      metadata: {},
    });
    expect(question.prompt).toContain(lastLine);
  });

  it("keeps the last Better: line of a compare crit last", () => {
    const choice = parseChoice(COMPARE_CRIT);
    expect(choice).not.toBe("undecided");
    const after = applyVerdicts(
      COMPARE_CRIT,
      parseVerdicts(message(["drop", "keep", "keep"]), 3),
    );
    expect(parseChoice(after)).toBe(choice);
    expect(rankedFindings(after)).toHaveLength(2);
    expect(after).toContain(DROPPED_LINE_START);
  });

  it("leaves a crit unchanged when nothing is dropped, and an empty ranked list when all are", () => {
    expect(
      applyVerdicts(
        THREE_FINDINGS,
        parseVerdicts(message(["keep", "keep", "keep"]), 3),
      ),
    ).toBe(THREE_FINDINGS);
    const allDropped = applyVerdicts(
      THREE_FINDINGS,
      parseVerdicts(message(["drop", "drop", "drop"]), 3),
    );
    expect(rankedFindings(allDropped)).toEqual([]);
    expect(smallerThings(allDropped)).toEqual(smallerThings(THREE_FINDINGS));
  });

  it("gives the refuter only the ranked findings", () => {
    const text = findingsFileText(THREE_FINDINGS);
    expect(text.startsWith("1. ")).toBe(true);
    expect(text).not.toContain("**Verdict");
    expect(text).not.toContain("**Smaller things");
  });
});

describe("reading the refuter's message", () => {
  it("accepts a fenced JSON object", () => {
    const verdicts = parseVerdicts(
      `\`\`\`json\n${message(["keep", "drop"])}\n\`\`\``,
      2,
    );
    expect(verdicts.map((entry) => entry.verdict)).toEqual(["keep", "drop"]);
  });

  it("refuses a missing, repeated, or out-of-range number, a wrong verdict, and missing evidence", () => {
    expect(() => parseVerdicts(message(["keep"]), 2)).toThrow(
      "finding 2 has no verdict",
    );
    expect(() => parseVerdicts(message(["keep", "keep", "keep"]), 2)).toThrow(
      "not a ranked finding",
    );
    const repeated = JSON.stringify({
      findings: [
        { number: 1, verdict: "keep", evidence: "a" },
        { number: 1, verdict: "drop", evidence: "b" },
      ],
    });
    expect(() => parseVerdicts(repeated, 2)).toThrow("two verdicts");
    const wrongVerdict = JSON.stringify({
      findings: [{ number: 1, verdict: "maybe", evidence: "a" }],
    });
    expect(() => parseVerdicts(wrongVerdict, 1)).toThrow("not keep or drop");
    const noEvidence = JSON.stringify({
      findings: [{ number: 1, verdict: "keep", evidence: " " }],
    });
    expect(() => parseVerdicts(noEvidence, 1)).toThrow("no evidence");
    expect(() => parseVerdicts("I could not check.", 1)).toThrow(
      "no JSON object",
    );
  });
});

describe("the refuter runner, with a stub child process", () => {
  const imagePath = join(
    import.meta.dirname,
    "..",
    "..",
    "packs",
    "basics",
    "fixtures",
    "text-reads-faint.negative.png",
  );
  const input = {
    critCommit: "c".repeat(40),
    critKey: "k",
    critRun: 1,
    crit: THREE_FINDINGS,
    imagePath,
  };

  it("saves the refutation once, and a second call starts no child", async () => {
    const runsDirectory = newFolder();
    const calls: (readonly string[])[] = [];
    const runner: ClaudeRunner = async (args) => {
      calls.push(args);
      if (args[0] === "--version") {
        return { stdout: "2.0.0", stderr: "", exitCode: 0 };
      }
      return {
        stdout: claudeStdout(message(["keep", "keep", "drop"])),
        stderr: "",
        exitCode: 0,
      };
    };
    const options = {
      runsDirectory,
      skillDirectory: SKILL_DIRECTORY,
      refuterCommit: "r".repeat(40),
      runClaude: runner,
    };
    const first = await ensureRefutation(input, options);
    expect(first.droppedCount).toBe(1);
    expect(first.rankedCount).toBe(3);
    expect(calls).toHaveLength(2);
    // The prompt names the refuter's instructions and no fixture name.
    const prompt = calls[1]?.at(-1) ?? "";
    expect(prompt).toContain("/agents/refuter.md");
    expect(prompt).toContain("image-1.png");
    expect(prompt).not.toContain("text-reads-faint");
    const second = await ensureRefutation(input, options);
    expect(calls).toHaveLength(2);
    expect(second).toEqual(first);
    expect(
      readSavedRefutation(runsDirectory, "r".repeat(40), refutationKey(input)),
    ).toEqual(first);
    expect(rankedFindings(first.refutedCrit)).toHaveLength(2);
  });

  it("saves nothing when the message is not a verdict for each finding", async () => {
    const runsDirectory = newFolder();
    const runner: ClaudeRunner = async (args) => {
      if (args[0] === "--version") {
        return { stdout: "2.0.0", stderr: "", exitCode: 0 };
      }
      return {
        stdout: claudeStdout(message(["keep"])),
        stderr: "",
        exitCode: 0,
      };
    };
    await expect(
      ensureRefutation(input, {
        runsDirectory,
        skillDirectory: SKILL_DIRECTORY,
        refuterCommit: "r".repeat(40),
        runClaude: runner,
      }),
    ).rejects.toThrow("finding 2 has no verdict");
    expect(existsSync(join(runsDirectory, "r".repeat(40), "refute"))).toBe(
      false,
    );
  });
});
