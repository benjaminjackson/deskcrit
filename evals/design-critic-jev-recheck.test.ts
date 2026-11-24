// Checks plugin/skills/design-critic/scripts/jev-recheck.mjs, the Jev recheck of the crit-loop
// skill (FR-78, FR-82): only the criteria that fired on the before image are named, a criterion
// that still fires means the fix failed, and one that stopped firing counts only when Jev's
// probability fell by 0.3 or more. It runs the script with --after-report, so no crit and no key.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
  parseEvidence,
  RECHECK_HEADING,
  recheckState,
  recheckText,
} from "../plugin/skills/design-critic/scripts/jev-recheck.mjs";

const recheckScript = join(
  import.meta.dirname,
  "..",
  "plugin/skills/design-critic/scripts/jev-recheck.mjs",
);

/** An evidence file as jev-evidence.mjs writes it: three criteria fired on the before image. */
const EVIDENCE = [
  "Jev evidence: high-confidence present; you set the location, severity, and rank.",
  "- Text reads as faint (Jev's probability 0.97)",
  "- Body text too small (Jev's probability 0.90)",
  "- Buttons look alike (Jev's probability 0.80)",
  "",
].join("\n");

/** A made-up after report: one still fires, one fell by 0.6, one fell by only 0.2, one is new. */
const AFTER_REPORT = {
  findings: [
    {
      title: "Text reads as faint",
      verdict: "fail",
      distribution: { true: 0.95, false: 0.05 },
    },
    {
      title: "Body text too small",
      verdict: "pass",
      distribution: { true: 0.3, false: 0.7 },
    },
    {
      title: "Buttons look alike",
      verdict: "pass",
      distribution: { true: 0.6, false: 0.4 },
    },
    {
      title: "A new defect",
      verdict: "fail",
      distribution: { true: 0.99, false: 0.01 },
    },
  ],
};

const workFolder = mkdtempSync(join(tmpdir(), "jev-recheck-test-"));

afterAll(() => {
  rmSync(workFolder, { recursive: true, force: true });
});

describe("parseEvidence", () => {
  it("reads each fired criterion's title and probability, and skips the heading", () => {
    expect(parseEvidence(EVIDENCE)).toEqual([
      { title: "Text reads as faint", probability: 0.97 },
      { title: "Body text too small", probability: 0.9 },
      { title: "Buttons look alike", probability: 0.8 },
    ]);
  });

  it("keeps a criterion whose probability was not given", () => {
    expect(parseEvidence("- Odd one (Jev's probability not given)")).toEqual([
      { title: "Odd one", probability: undefined },
    ]);
  });
});

describe("recheckState", () => {
  it("says still fires for a warn or fail verdict, whatever the probability", () => {
    expect(
      recheckState(0.97, { verdict: "warn", distribution: { true: 0.1 } }),
    ).toBe("still fires");
  });

  it("counts a fall of exactly 0.3 as stopped firing", () => {
    expect(
      recheckState(0.97, { verdict: "pass", distribution: { true: 0.67 } }),
    ).toBe("stopped firing");
  });

  it("does not count a fall under 0.3", () => {
    expect(
      recheckState(0.97, { verdict: "pass", distribution: { true: 0.68 } }),
    ).toBe("fell too little");
  });

  it("does not count a quiet criterion when a probability is missing", () => {
    expect(
      recheckState(undefined, { verdict: "pass", distribution: { true: 0.1 } }),
    ).toBe("fell too little");
  });

  it("says no answer when the after report has no such criterion", () => {
    expect(recheckState(0.97, undefined)).toBe("no answer");
  });
});

describe("recheckText", () => {
  it("names only the before fires, each with its state and both probabilities", () => {
    expect(recheckText(EVIDENCE, AFTER_REPORT)).toBe(
      [
        RECHECK_HEADING,
        "- Text reads as faint: still fires; the fix failed (before 0.97, after 0.95)",
        "- Body text too small: stopped firing (before 0.90, after 0.30)",
        "- Buttons look alike: does not count as stopped firing; the probability did not fall by 0.3 or more (before 0.80, after 0.60)",
        "",
      ].join("\n"),
    );
  });

  it("gives an empty text when the evidence file names no criterion", () => {
    expect(recheckText("Jev evidence: nothing\n", AFTER_REPORT)).toBe("");
  });
});

describe("the script", () => {
  it("writes the recheck file from a saved report and prints its path", () => {
    const evidencePath = join(workFolder, "evidence.txt");
    const reportPath = join(workFolder, "after.json");
    const outPath = join(workFolder, "recheck.txt");
    writeFileSync(evidencePath, EVIDENCE);
    writeFileSync(reportPath, JSON.stringify(AFTER_REPORT));
    const run = spawnSync(
      "node",
      [
        recheckScript,
        evidencePath,
        "--after-report",
        reportPath,
        "--out",
        outPath,
      ],
      { encoding: "utf8" },
    );
    expect(run.status).toBe(0);
    expect(run.stdout).toBe(`${outPath}\n`);
    expect(readFileSync(outPath, "utf8")).toBe(
      recheckText(EVIDENCE, AFTER_REPORT),
    );
  });

  it("prints nothing and exits 0 without the key", () => {
    const run = spawnSync("node", [recheckScript, "missing.txt", "after.png"], {
      encoding: "utf8",
      env: { PATH: process.env.PATH ?? "" },
    });
    expect(run.status).toBe(0);
    expect(run.stdout).toBe("");
    expect(run.stderr).toContain("TYPESAFE_API_KEY is not set");
  });

  it("gives the usage error for a wrong command line", () => {
    const run = spawnSync("node", [recheckScript, "only-one.txt"], {
      encoding: "utf8",
      env: { PATH: process.env.PATH ?? "" },
    });
    expect(run.status).toBe(2);
    expect(run.stderr).toContain("usage:");
  });
});
