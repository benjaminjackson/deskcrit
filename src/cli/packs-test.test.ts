// Disposable unit tests for `crit packs test <dir>` (FR-50, FR-53, EV-4, US-6, CS-22). Verdicts
// come from the stub adapter, the only fake, so no test needs a key or the network.

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TypeSafeAdapter } from "../ask/adapter.js";
import { createStubAdapter } from "../ask/stub.js";
import type { Verdict } from "../compose/verdict.js";
import type { NoulAnswer } from "../shared/answer.js";
import { CouldNotRunError } from "../shared/could-not-run-error.js";
import type { Criterion, Pack } from "../shared/pack.js";
import { main } from "./main.js";
import {
  type FixtureResult,
  fixtureAgrees,
  listFixtureJobs,
  renderPacksTestReport,
  restrictPack,
  runPacksTest,
} from "./packs-test.js";

/** One criterion section of a test pack.yaml, with its fixtures lists. */
function criterionYaml(
  id: string,
  positive: readonly string[],
  negative: readonly string[],
  extraLines = "",
): string {
  return `  - id: ${id}
    title: Test criterion ${id}
    source: A test source
    question:
      type: noul
      instructions: Is the image at image red?
      criteria:
        true: The image is red.
        false: The image is not red.
    fail_when:
      probability_at_least: 0.7
    fix: Make it another colour.
${extraLines}    fixtures:
      positive:
${positive.map((path) => `        - ${path}`).join("\n")}
      negative:
${negative.map((path) => `        - ${path}`).join("\n")}
`;
}

/** A whole test pack.yaml with these criterion sections. */
function packYaml(criterionSections: readonly string[]): string {
  return `name: test-pack
version: 1.0.0
title: Test pack
license: MIT
criteria:
${criterionSections.join("")}`;
}

/** A small plain criterion value for the pure functions. */
function makeCriterion(
  id: string,
  positive: readonly string[],
  negative: readonly string[],
): Criterion {
  return {
    id,
    title: id,
    source: "A test source",
    question: {
      type: "noul",
      instructions: "Is the image at image red?",
      criteria: { true: "red", false: "not red" },
    },
    fail_when: { probability_at_least: 0.7 },
    fix: "Change it.",
    fixtures: { positive, negative },
  };
}

/** A pack value holding these criteria. */
function makePack(criteria: readonly Criterion[]): Pack {
  return {
    name: "test-pack",
    version: "1.0.0",
    title: "Test pack",
    license: "MIT",
    criteria,
  };
}

/** A noul answer with this probability of true, as the stub returns it. */
function noulAnswer(questionId: string, probabilityTrue: number): NoulAnswer {
  return {
    type: "noul",
    question_id: questionId,
    model: "stub",
    distribution: { true: probabilityTrue, false: 1 - probabilityTrue },
    confidence: null,
  };
}

/**
 * An adapter that answers each request with the next stub in the list. packs test asks one request
 * per fixture image in path order, so the list order is the path order.
 */
function makeSequenceAdapter(
  answersPerRequest: readonly (readonly NoulAnswer[])[],
): TypeSafeAdapter {
  let requestIndex = 0;
  return {
    askQuestions: async (request) => {
      const answers = answersPerRequest[requestIndex];
      requestIndex += 1;
      if (answers === undefined) {
        throw new Error("more requests than the test expected");
      }
      return createStubAdapter({ answers }).askQuestions(request);
    },
  };
}

/** Write a 300 by 300 px PNG of one colour, so prepare accepts it. */
async function writePng(path: string): Promise<void> {
  const bytes = await sharp({
    create: {
      width: 300,
      height: 300,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .png()
    .toBuffer();
  writeFileSync(path, bytes);
}

let workingDirectory = "";
let packDirectory = "";

beforeEach(() => {
  workingDirectory = mkdtempSync(join(tmpdir(), "crit-packs-test-"));
  packDirectory = join(workingDirectory, "pack");
  mkdirSync(join(packDirectory, "fixtures"), { recursive: true });
});

afterEach(() => {
  rmSync(workingDirectory, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("fixtureAgrees", () => {
  const cases: {
    label: "positive" | "negative";
    verdict: Verdict;
    agrees: boolean;
  }[] = [
    { label: "positive", verdict: "fail", agrees: true },
    { label: "positive", verdict: "warn", agrees: true },
    { label: "positive", verdict: "pass", agrees: false },
    { label: "positive", verdict: "uncertain", agrees: false },
    { label: "negative", verdict: "fail", agrees: false },
    { label: "negative", verdict: "warn", agrees: false },
    { label: "negative", verdict: "pass", agrees: true },
    { label: "negative", verdict: "uncertain", agrees: true },
  ];
  for (const testCase of cases) {
    it(`gives ${testCase.agrees} for ${testCase.verdict} on a ${testCase.label} fixture`, () => {
      expect(fixtureAgrees(testCase.label, testCase.verdict)).toBe(
        testCase.agrees,
      );
    });
  }
});

describe("listFixtureJobs", () => {
  it("groups the criteria that name one image into one job, sorted by path", () => {
    const pack = makePack([
      makeCriterion("first", ["fixtures/z.png"], ["fixtures/shared.png"]),
      makeCriterion("second", ["fixtures/shared.png"], ["fixtures/a.png"]),
    ]);
    expect(listFixtureJobs(pack)).toEqual([
      {
        fixturePath: "fixtures/a.png",
        entries: [{ criterionId: "second", label: "negative" }],
      },
      {
        fixturePath: "fixtures/shared.png",
        entries: [
          { criterionId: "first", label: "negative" },
          { criterionId: "second", label: "positive" },
        ],
      },
      {
        fixturePath: "fixtures/z.png",
        entries: [{ criterionId: "first", label: "positive" }],
      },
    ]);
  });
});

describe("restrictPack", () => {
  it("keeps only the named criteria, in pack order", () => {
    const pack = makePack([
      makeCriterion("first", ["a.png"], ["b.png"]),
      makeCriterion("second", ["c.png"], ["d.png"]),
      makeCriterion("third", ["e.png"], ["f.png"]),
    ]);
    const restricted = restrictPack(pack, new Set(["third", "first"]));
    const ids = restricted.criteria.map((criterion) => criterion.id);
    expect(ids).toEqual(["first", "third"]);
  });
});

describe("renderPacksTestReport", () => {
  it("names every disagreement in order, counts the agreements, and lists uncertain negatives", () => {
    const pack = makePack([
      makeCriterion("first", [], []),
      makeCriterion("second", [], []),
    ]);
    const results: FixtureResult[] = [
      {
        criterionId: "second",
        fixturePath: "fixtures/s.png",
        label: "positive",
        verdict: null,
        agreed: false,
      },
      {
        criterionId: "first",
        fixturePath: "fixtures/n.png",
        label: "negative",
        verdict: "uncertain",
        agreed: true,
      },
      {
        criterionId: "first",
        fixturePath: "fixtures/p.png",
        label: "positive",
        verdict: "pass",
        agreed: false,
      },
      {
        criterionId: "first",
        fixturePath: "fixtures/m.png",
        label: "negative",
        verdict: "pass",
        agreed: true,
      },
    ];
    const text = renderPacksTestReport(pack, results, {
      requests: 3,
      costUsd: null,
    });
    expect(text).toBe(
      [
        "first positive fixtures/p.png: pass",
        "second positive fixtures/s.png: not asked",
        "test-pack: 2 agreed, 2 disagreed, 1 uncertain on a negative fixture (counted as agreed)",
        "uncertain on a negative fixture: first negative fixtures/n.png",
        "usage: 3 requests, cost unknown",
        "",
      ].join("\n"),
    );
  });
});

describe("runPacksTest", () => {
  it("asks one request per image and reports each fixture's verdict from compose", async () => {
    writeFileSync(
      join(packDirectory, "pack.yaml"),
      packYaml([
        criterionYaml("red", ["fixtures/a.png"], ["fixtures/b.png"]),
        criterionYaml("redder", ["fixtures/c.png"], ["fixtures/d.png"]),
      ]),
    );
    for (const name of ["a", "b", "c", "d"]) {
      await writePng(join(packDirectory, "fixtures", `${name}.png`));
    }
    let adapterModel: string | undefined = "not called";
    const adapter = makeSequenceAdapter([
      [noulAnswer("test-pack/red", 1)],
      [noulAnswer("test-pack/red", 0.5)],
      [noulAnswer("test-pack/redder", 0)],
      [noulAnswer("test-pack/redder", 1)],
    ]);
    const output = await runPacksTest("pack", workingDirectory, (model) => {
      adapterModel = model;
      return adapter;
    });
    expect(adapterModel).toBeUndefined();
    expect(output.anyDisagreement).toBe(true);
    expect(output.stdoutText).toBe(
      [
        "redder positive fixtures/c.png: pass",
        "redder negative fixtures/d.png: fail",
        "test-pack: 2 agreed, 2 disagreed, 1 uncertain on a negative fixture (counted as agreed)",
        "uncertain on a negative fixture: red negative fixtures/b.png",
        "usage: 4 requests, cost $0.000000",
        "",
      ].join("\n"),
    );
  });

  it("reports no disagreement when every fixture agrees, and passes the pinned model", async () => {
    writeFileSync(join(workingDirectory, ".crit.yaml"), "model: jev-1.14.0\n");
    writeFileSync(
      join(packDirectory, "pack.yaml"),
      packYaml([criterionYaml("red", ["fixtures/a.png"], ["fixtures/b.png"])]),
    );
    await writePng(join(packDirectory, "fixtures", "a.png"));
    await writePng(join(packDirectory, "fixtures", "b.png"));
    let adapterModel: string | undefined;
    const adapter = makeSequenceAdapter([
      [noulAnswer("test-pack/red", 0.9)],
      [noulAnswer("test-pack/red", 0.1)],
    ]);
    const output = await runPacksTest("pack", workingDirectory, (model) => {
      adapterModel = model;
      return adapter;
    });
    expect(adapterModel).toBe("jev-1.14.0");
    expect(output.anyDisagreement).toBe(false);
  });

  it("counts a criterion that build skips as a disagreement shown as not asked, and sends it no request", async () => {
    writeFileSync(
      join(packDirectory, "pack.yaml"),
      packYaml([
        criterionYaml("red", ["fixtures/a.png"], ["fixtures/b.png"]),
        criterionYaml(
          "needs-brand",
          ["fixtures/c.png"],
          ["fixtures/d.png"],
          "    requires:\n      - facts.brand\n",
        ),
      ]),
    );
    for (const name of ["a", "b", "c", "d"]) {
      await writePng(join(packDirectory, "fixtures", `${name}.png`));
    }
    const output = await runPacksTest("pack", workingDirectory, () =>
      makeSequenceAdapter([
        [noulAnswer("test-pack/red", 1)],
        [noulAnswer("test-pack/red", 0)],
      ]),
    );
    expect(output.anyDisagreement).toBe(true);
    expect(output.stdoutText).toBe(
      [
        "needs-brand positive fixtures/c.png: not asked",
        "needs-brand negative fixtures/d.png: not asked",
        "test-pack: 2 agreed, 2 disagreed, 0 uncertain on a negative fixture (counted as agreed)",
        "usage: 2 requests, cost $0.000000",
        "",
      ].join("\n"),
    );
  });

  it("refuses a pack whose every criterion build skips, before it makes the adapter", async () => {
    writeFileSync(
      join(packDirectory, "pack.yaml"),
      packYaml([
        criterionYaml(
          "needs-brand",
          ["fixtures/a.png"],
          ["fixtures/b.png"],
          "    requires:\n      - facts.brand\n",
        ),
      ]),
    );
    await writePng(join(packDirectory, "fixtures", "a.png"));
    await writePng(join(packDirectory, "fixtures", "b.png"));
    const run = runPacksTest("pack", workingDirectory, () => {
      throw new Error("the adapter must not be made");
    });
    await expect(run).rejects.toThrow("nothing to ask");
  });

  const refusedPacks: { name: string; yaml: string; message: string }[] = [
    {
      name: "a missing fixture",
      yaml: packYaml([
        criterionYaml("red", ["fixtures/a.png"], ["fixtures/missing.png"]),
      ]),
      message: "fixtures/missing.png is not a file in the pack directory",
    },
    {
      name: "a path that leaves the pack directory",
      yaml: packYaml([
        criterionYaml("red", ["fixtures/a.png"], ["../outside.png"]),
      ]),
      message: "../outside.png leaves the pack directory",
    },
    {
      name: "a pack the schema rejects",
      yaml: "name: test-pack\nversion: 1.0.0\n",
      message: "the pack is not valid",
    },
  ];
  for (const refusedPack of refusedPacks) {
    it(`refuses ${refusedPack.name} before it makes the adapter`, async () => {
      writeFileSync(join(packDirectory, "pack.yaml"), refusedPack.yaml);
      await writePng(join(packDirectory, "fixtures", "a.png"));
      writeFileSync(join(workingDirectory, "outside.png"), "x");
      const run = runPacksTest("pack", workingDirectory, () => {
        throw new Error("the adapter must not be made");
      });
      await expect(run).rejects.toThrow(CouldNotRunError);
      await expect(
        runPacksTest("pack", workingDirectory, () => {
          throw new Error("the adapter must not be made");
        }),
      ).rejects.toThrow(refusedPack.message);
    });
  }

  it("refuses a fixture that prepare cannot decode, naming the criterion and the path", async () => {
    writeFileSync(
      join(packDirectory, "pack.yaml"),
      packYaml([criterionYaml("red", ["fixtures/a.png"], ["fixtures/b.png"])]),
    );
    await writePng(join(packDirectory, "fixtures", "a.png"));
    writeFileSync(join(packDirectory, "fixtures", "b.png"), "not an image");
    const run = runPacksTest("pack", workingDirectory, () => {
      throw new Error("the adapter must not be made");
    });
    await expect(run).rejects.toThrow(
      "pack/fixtures/b.png, fixture of criterion red (negative)",
    );
  });
});

describe("crit packs test through main", () => {
  let stdoutText = "";
  let stderrText = "";

  beforeEach(async () => {
    stdoutText = "";
    stderrText = "";
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      stdoutText += String(chunk);
      return true;
    });
    vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
      stderrText += String(chunk);
      return true;
    });
    writeFileSync(
      join(packDirectory, "pack.yaml"),
      packYaml([criterionYaml("red", ["fixtures/a.png"], ["fixtures/b.png"])]),
    );
    await writePng(join(packDirectory, "fixtures", "a.png"));
    await writePng(join(packDirectory, "fixtures", "b.png"));
    process.exitCode = undefined;
  });

  afterEach(() => {
    process.exitCode = undefined;
  });

  it("exits 2 with nothing on stdout when the key is missing", async () => {
    await main(
      ["packs", "test", "pack"],
      {},
      () => createStubAdapter(),
      workingDirectory,
    );
    expect(process.exitCode).toBe(2);
    expect(stdoutText).toBe("");
    expect(stderrText).toContain("TYPESAFE_API_KEY is not set");
  });

  it("exits 2 with nothing on stdout when TypeSafe fails", async () => {
    await main(
      ["packs", "test", "pack"],
      { TYPESAFE_API_KEY: "test-key" },
      () =>
        createStubAdapter({
          failWith: new CouldNotRunError("TypeSafe returned 500"),
        }),
      workingDirectory,
    );
    expect(process.exitCode).toBe(2);
    expect(stdoutText).toBe("");
    expect(stderrText).toContain("TypeSafe returned 500");
  });

  it("exits 1 when a fixture disagrees, and 0 when every fixture agrees", async () => {
    await main(
      ["packs", "test", "pack"],
      { TYPESAFE_API_KEY: "test-key" },
      () => createStubAdapter(),
      workingDirectory,
    );
    expect(process.exitCode).toBe(1);
    expect(stdoutText).toContain("red positive fixtures/a.png: pass");

    process.exitCode = undefined;
    await main(
      ["packs", "test", "pack"],
      { TYPESAFE_API_KEY: "test-key" },
      () =>
        makeSequenceAdapter([
          [noulAnswer("test-pack/red", 1)],
          [noulAnswer("test-pack/red", 0)],
        ]),
      workingDirectory,
    );
    expect(process.exitCode).toBe(0);
  });
});
