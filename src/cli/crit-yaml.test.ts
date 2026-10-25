// Disposable unit tests for parseCritYaml and checkCritYaml (FR-2, FR-22, FR-41, FR-51, OQ-25 a,
// CS-4, CS-7, CS-22).

import { describe, expect, it } from "vitest";
import { CouldNotRunError } from "../shared/could-not-run-error.js";
import { checkCritYaml, parseCritYaml } from "./crit-yaml.js";

describe("parseCritYaml", () => {
  it("reads every key, including screenshot and warn_fails_gate", () => {
    const text = [
      "packs: [typography, ./house-style]",
      "model: jev-1.14.0",
      "context:",
      "  purpose: landing page",
      "  platform: web",
      "screenshot: home.png",
      "warn_fails_gate: true",
    ].join("\n");
    expect(parseCritYaml(text)).toEqual({
      packs: ["typography", "./house-style"],
      model: "jev-1.14.0",
      context: { purpose: "landing page", platform: "web" },
      screenshot: "home.png",
      warn_fails_gate: true,
    });
  });

  it("reads warn_fails_gate: false as false (FR-41)", () => {
    expect(parseCritYaml("warn_fails_gate: false\n")).toEqual({
      warn_fails_gate: false,
    });
  });

  it("gives no settings for an empty file", () => {
    expect(parseCritYaml("")).toEqual({});
  });

  it("reads `no` as a string under the YAML 1.2 core schema (CS-4)", () => {
    expect(parseCritYaml("context:\n  audience: no\n")).toEqual({
      context: { audience: "no" },
    });
  });

  const badTexts: { name: string; text: string; message: string }[] = [
    {
      name: "a duplicate key",
      text: "model: a\nmodel: b\n",
      message: ".crit.yaml: DUPLICATE_KEY",
    },
    {
      name: "a custom tag",
      text: "model: !secret a\n",
      message: ".crit.yaml: TAG_RESOLVE_FAILED",
    },
    {
      name: "broken YAML",
      text: "packs: [a\n",
      message: ".crit.yaml:",
    },
    {
      name: "an unknown key",
      text: "colour: red\n",
      message: ".crit.yaml: unknown key colour",
    },
    {
      name: "an unknown context key",
      text: "context:\n  colour: red\n",
      message: ".crit.yaml: unknown context key colour",
    },
    {
      name: "a context value that is not a string",
      text: "context:\n  platform: 3\n",
      message: ".crit.yaml: context platform must be a string",
    },
    {
      name: "packs that is not a list",
      text: "packs: typography\n",
      message: ".crit.yaml: packs must be a list",
    },
    {
      name: "a model that is not a string",
      text: "model: 3\n",
      message: ".crit.yaml: model must be a non-empty string",
    },
    {
      name: "warn_fails_gate that is not a boolean",
      text: "warn_fails_gate: yes\n",
      message: ".crit.yaml: warn_fails_gate must be true or false",
    },
    {
      name: "a list at the top level",
      text: "- a\n",
      message: ".crit.yaml: expected a map",
    },
  ];
  for (const badText of badTexts) {
    it(`throws CouldNotRunError that names .crit.yaml for ${badText.name}`, () => {
      expect(() => parseCritYaml(badText.text)).toThrow(CouldNotRunError);
      expect(() => parseCritYaml(badText.text)).toThrow(badText.message);
    });
  }
});

describe("checkCritYaml", () => {
  it("accepts a parsed value with no keys", () => {
    expect(checkCritYaml({})).toEqual({});
  });
});
