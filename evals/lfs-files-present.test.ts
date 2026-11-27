// The check that this checkout holds the real images and not Git LFS pointer files (crit-yi0).
// The images under evals/, packs/, and spike/ are Git LFS files, and .lfsconfig stops their
// download by default so that a plugin install stays small. A checkout that never downloaded
// them holds a small text file in place of each image. Then the other tests fail with errors
// that do not name the cause, and the 2 MB fixture size check passes on a pointer by mistake.
// This test names the cause and the fix. It reads one file only.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

/** The repository root, one folder above evals/. */
const REPOSITORY_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** A committed image that .gitattributes makes a Git LFS file. */
const SAMPLE_IMAGE = "evals/wobble/slice.png";

/** The first line of every Git LFS pointer file. */
const POINTER_FIRST_LINE = "version https://git-lfs.github.com/spec/v1";

/** The eight bytes that every PNG file starts with. */
const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/** The commands that download the real images, as README.md gives them. */
const SETUP_COMMANDS = 'git config lfs.fetchexclude "" && git lfs pull';

it("holds the real images, not Git LFS pointer files", () => {
  const fileBytes = readFileSync(join(REPOSITORY_ROOT, SAMPLE_IMAGE));
  const isPointer =
    fileBytes.subarray(0, POINTER_FIRST_LINE.length).toString("utf8") ===
    POINTER_FIRST_LINE;
  if (isPointer) {
    throw new Error(
      `${SAMPLE_IMAGE} is a Git LFS pointer file, so this checkout has no images. ` +
        `Install git-lfs, then run in the repository root: ${SETUP_COMMANDS}`,
    );
  }
  const startsAsPng = fileBytes
    .subarray(0, PNG_SIGNATURE.length)
    .equals(PNG_SIGNATURE);
  expect(
    startsAsPng,
    `${SAMPLE_IMAGE} does not start with the PNG signature`,
  ).toBe(true);
});
