import { expect, test } from "vitest";
import { CouldNotRunError } from "./could-not-run-error.js";

test("CouldNotRunError is an Error that keeps its name and message", () => {
  const error = new CouldNotRunError("cannot read design.png");
  expect(error).toBeInstanceOf(Error);
  expect(error).toBeInstanceOf(CouldNotRunError);
  expect(error.name).toBe("CouldNotRunError");
  expect(error.message).toBe("cannot read design.png");
});
