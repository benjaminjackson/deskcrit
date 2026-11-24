// Unit tests of the go-further runner (OQ-28). A stub stands in for the `claude` child process, so
// no model is asked (CS-21).

import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkSection,
  ensureGoFurther,
  joinSection,
  readSavedGoFurther,
} from "./go-further.ts";
import type { ClaudeRunner } from "./run-critic.ts";

const SKILL_DIRECTORY = join(
  import.meta.dirname,
  "..",
  "..",
  "plugin",
  "skills",
  "design-critic",
);

const CRIT = [
  "**First read.** The eye lands on the headline.",
  "",
  "**What would move it most**",
  "1. The button is faint: defect.",
  "",
  "**What's working.** The grid.",
  "",
  "**Couldn't judge from a still.** Hover states.",
  "",
  "**Checklist.**",
  "Text: 3 lines, 3 yes",
  "",
].join("\n");

const SECTION =
  "**Where it could go further.**\n1. Builds on finding 1: let the orange own the page. Taste.";

/** Returns a new empty temporary folder. */
function newFolder(): string {
  return mkdtempSync(join(tmpdir(), "go-further-test-"));
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

describe("joining the section", () => {
  it("puts the section after What's working and before Couldn't judge", () => {
    const joined = joinSection(CRIT, SECTION);
    const working = joined.indexOf("**What's working.**");
    const section = joined.indexOf("**Where it could go further.**");
    const couldNot = joined.indexOf("**Couldn't judge");
    expect(working).toBeLessThan(section);
    expect(section).toBeLessThan(couldNot);
    expect(joined).toContain(`The grid.\n\n${SECTION}\n\n**Couldn't judge`);
  });

  it("puts the section before Checklist when the crit has no Couldn't judge", () => {
    const crit = CRIT.replace(
      "**Couldn't judge from a still.** Hover states.\n\n",
      "",
    );
    expect(joinSection(crit, SECTION)).toContain(
      `The grid.\n\n${SECTION}\n\n**Checklist.**`,
    );
  });

  it("refuses a crit that already holds the section", () => {
    expect(() => joinSection(joinSection(CRIT, SECTION), SECTION)).toThrow(
      /already/,
    );
  });
});

describe("checking the section", () => {
  it("keeps the section and the Nothing beyond the findings form", () => {
    expect(checkSection(`\n${SECTION}\n`)).toBe(SECTION);
    const nothing =
      "**Where it could go further.** Nothing beyond the findings.";
    expect(checkSection(nothing)).toBe(nothing);
  });

  it("refuses a preface and a copy of the crit", () => {
    expect(() => checkSection(`Here is the section.\n${SECTION}`)).toThrow(
      /does not start/,
    );
    expect(() => checkSection(`${SECTION}\n\n**Checklist.** x`)).toThrow(
      /another section/,
    );
  });
});

describe("the go-further runner, with a stub child process", () => {
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
    crit: CRIT,
    imagePath,
  };

  it("saves the joined crit once, and a second call starts no child", async () => {
    const folder = newFolder();
    const calls: (readonly string[])[] = [];
    const runner: ClaudeRunner = async (args) => {
      calls.push(args);
      if (args[0] === "--version") {
        return { stdout: "2.0.0", stderr: "", exitCode: 0 };
      }
      return { stdout: claudeStdout(SECTION), stderr: "", exitCode: 0 };
    };
    const options = {
      goFurtherDirectory: folder,
      skillDirectory: SKILL_DIRECTORY,
      goFurtherCommit: "g".repeat(40),
      runClaude: runner,
    };
    const first = await ensureGoFurther(input, options);
    expect(first.section).toBe(SECTION);
    expect(first.joinedCrit).toBe(joinSection(CRIT, SECTION));
    expect(calls).toHaveLength(2);
    // The prompt names the second step's instructions and no fixture name.
    const prompt = calls[1]?.at(-1) ?? "";
    expect(prompt).toContain("/agents/go-further.md");
    expect(prompt).toContain("image-1.png");
    expect(prompt).not.toContain("text-reads-faint");
    const second = await ensureGoFurther(input, options);
    expect(second).toEqual(first);
    expect(calls).toHaveLength(2);
    expect(readSavedGoFurther(folder, "g".repeat(40), first.key)).toEqual(
      first,
    );
  });

  it("saves nothing when the message is not the section", async () => {
    const folder = newFolder();
    const runner: ClaudeRunner = async (args) =>
      args[0] === "--version"
        ? { stdout: "2.0.0", stderr: "", exitCode: 0 }
        : { stdout: claudeStdout("I could not."), stderr: "", exitCode: 0 };
    await expect(
      ensureGoFurther(input, {
        goFurtherDirectory: folder,
        skillDirectory: SKILL_DIRECTORY,
        goFurtherCommit: "g".repeat(40),
        runClaude: runner,
      }),
    ).rejects.toThrow(/does not start/);
    expect(readdirSync(folder)).toEqual([]);
  });
});
