import { expect, test } from "vitest";
import { main } from "./main.js";

test("main returns exit code 0 for no arguments", () => {
  expect(main([])).toBe(0);
});
