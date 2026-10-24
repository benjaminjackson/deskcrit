// The state that ask sends with every question: the prepared image once, the context, and the
// facts (FR-15, FR-17). This is deskcrit's own shape. Only src/ask/typesafe/ turns it into
// TypeSafe's request format (AC-8).

/**
 * The key in the state that holds the image. Questions refer to the image by this path in their
 * instructions, for example "Looking at the image at `screenshot`", and never carry a second copy
 * (FR-15, JC-6, NFR-10).
 */
export const IMAGE_STATE_PATH = "screenshot";

/** The prepared image: its bytes, format and pixel size after prepare (FR-6 to FR-8, JC-1). */
export type StateImage = {
  readonly format: "png" | "jpeg";
  readonly bytes: Uint8Array;
  readonly width: number;
  readonly height: number;
};

/** The optional context from flags or `.crit.yaml`, with the three keys FR-2 allows. */
export type Context = {
  readonly purpose?: string;
  readonly audience?: string;
  readonly platform?: string;
};

/**
 * Everything the questions are asked about: the image once under IMAGE_STATE_PATH, the context,
 * and the facts file unchanged (FR-3, FR-15, FR-17). It never holds HTML, a DOM dump, or source.
 */
export type State = {
  readonly [IMAGE_STATE_PATH]: StateImage;
  readonly context?: Context;
  readonly facts?: unknown;
};
