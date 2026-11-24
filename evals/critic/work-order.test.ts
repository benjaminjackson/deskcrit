import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Ajv2020 } from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";
import {
  checkWorkOrder,
  countRankedItems,
  FINDING_FIELDS,
  run,
} from "../../plugin/skills/design-critic/scripts/work-order.mjs";
import { rankedFindings } from "./repeat.ts";

// The durable check of the work order (PRD FR-80, ticket crit-0a0.4). Its input is the work order
// that one live run of the design-critic skill wrote for evals/loop-test/bad-page/, committed in
// evals/critic/work-order/bad-page/ with the crit, the image, the facts file, and the Jev evidence
// file it was written from. Only the folder part of each path in work-order.json was changed, to a
// path relative to that folder, so the files can be checked on any machine.

const repositoryRoot = join(import.meta.dirname, "..", "..");
const caseFolder = join(import.meta.dirname, "work-order", "bad-page");
const workOrderPath = join(caseFolder, "work-order.json");

/** Reads and parses a JSON file. JSON.parse returns "any", which is stored as a record. */
function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf8"));
}

/** Compiles schemas/work-order.schema.json for draft 2020-12. */
function compileValidator() {
  const ajv = new Ajv2020({ allErrors: true });
  return ajv.compile(
    readJson(join(repositoryRoot, "schemas", "work-order.schema.json")),
  );
}

/** Returns the findings list of a work order. */
function findingsOf(
  workOrder: Record<string, unknown>,
): Record<string, unknown>[] {
  return workOrder.findings as Record<string, unknown>[];
}

describe("the committed live work order for the loop-test bad page", () => {
  const workOrder = readJson(workOrderPath);
  const critText = readFileSync(join(caseFolder, "crit.md"), "utf8");

  it("validates against schemas/work-order.schema.json", () => {
    const validate = compileValidator();
    expect(validate(workOrder), JSON.stringify(validate.errors)).toBe(true);
  });

  it("has one entry with the same rank for each ranked finding of the prose crit", () => {
    const ranked = rankedFindings(critText);
    const ranks = findingsOf(workOrder)
      .map((finding) => finding.rank)
      .filter((rank) => rank !== null);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranks).toEqual(ranked.map((_, index) => index + 1));
  });

  it("passes the skill's own check: ranks match the crit and every box is real", () => {
    expect(run([workOrderPath])).toEqual({ lines: ["ok"], exitCode: 0 });
  });

  it("counts the crit's ranked items as the critic evaluations do", () => {
    expect(countRankedItems(critText)).toBe(rankedFindings(critText).length);
  });
});

describe("schemas/work-order.schema.json", () => {
  const validate = compileValidator();
  const workOrder = readJson(workOrderPath);

  /** Returns a deep copy of the committed work order, with the first finding changed by `change`. */
  function withFirstFinding(
    change: (finding: Record<string, unknown>) => void,
  ): Record<string, unknown> {
    const copy = structuredClone(workOrder);
    const first = findingsOf(copy)[0];
    if (first === undefined) {
      throw new Error("the committed work order has no finding");
    }
    change(first);
    return copy;
  }

  it("lists the same required finding fields as scripts/work-order.mjs", () => {
    const schema = readJson(
      join(repositoryRoot, "schemas", "work-order.schema.json"),
    );
    const definitions = schema.$defs as Record<string, { required: string[] }>;
    expect(definitions.finding?.required).toEqual(FINDING_FIELDS);
  });

  it("rejects a box when box_source is none", () => {
    const broken = withFirstFinding((finding) => {
      finding.location = {
        description: "the lead paragraph",
        viewport: "desktop",
        selector: null,
        box: [0, 0, 10, 10],
        box_source: "none",
        crop: null,
      };
    });
    expect(validate(broken)).toBe(false);
  });

  it("accepts a finding with no box when box_source is none", () => {
    const noBox = withFirstFinding((finding) => {
      finding.location = {
        description: "the whole page",
        viewport: null,
        selector: null,
        box: null,
        box_source: "none",
        crop: null,
      };
    });
    expect(validate(noBox), JSON.stringify(validate.errors)).toBe(true);
  });

  it("rejects a facts box with no selector", () => {
    const broken = withFirstFinding((finding) => {
      finding.location = {
        description: "the lead paragraph",
        viewport: "desktop",
        selector: null,
        box: [0, 0, 10, 10],
        box_source: "facts",
        crop: null,
      };
    });
    expect(validate(broken)).toBe(false);
  });

  it("rejects a measured value with no facts field", () => {
    const broken = withFirstFinding((finding) => {
      finding.current = { value: "2.5:1", measured: true, facts_field: null };
    });
    expect(validate(broken)).toBe(false);
  });

  it("rejects a finding without a closing check", () => {
    const broken = withFirstFinding((finding) => {
      delete finding.closed_when;
    });
    expect(validate(broken)).toBe(false);
  });
});

describe("scripts/work-order.mjs", () => {
  const workOrder = readJson(workOrderPath);

  it("refuses a box that is not the facts box of its selector", () => {
    const facts = readJson(join(caseFolder, "facts.json"));
    const copy = structuredClone(workOrder);
    const factsFinding = findingsOf(copy).find(
      (finding) =>
        (finding.location as Record<string, unknown>).box_source === "facts",
    );
    if (factsFinding === undefined) {
      throw new Error("the committed work order has no facts box");
    }
    (factsFinding.location as Record<string, unknown>).box = [1, 1, 5, 5];
    const image = copy.image as { width: number; height: number };
    const problems = checkWorkOrder(
      copy,
      readFileSync(join(caseFolder, "crit.md"), "utf8"),
      [image.width, image.height],
      facts,
      () => undefined,
    );
    expect(problems.join("\n")).toContain("is not the facts box of");
  });

  it("refuses a work order that ranks fewer findings than the crit", () => {
    const copy = structuredClone(workOrder);
    copy.findings = findingsOf(copy).filter((finding) => finding.rank !== 1);
    const image = copy.image as { width: number; height: number };
    const problems = checkWorkOrder(
      copy,
      readFileSync(join(caseFolder, "crit.md"), "utf8"),
      [image.width, image.height],
      readJson(join(caseFolder, "facts.json")),
      () => undefined,
    );
    expect(problems.join("\n")).toContain("the crit ranks");
  });
});
