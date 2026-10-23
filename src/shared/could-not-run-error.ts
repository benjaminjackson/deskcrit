/**
 * Marks a run that cannot go on, such as bad input, an unreadable file, or a
 * TypeSafe error. The CLI maps it to exit code 2 (FR-4, FR-24, NFR-11, CS-16).
 */
export class CouldNotRunError extends Error {
  /** Builds the error with a message that names the input at fault, and sets the name so logs show the class (CS-16). */
  constructor(message: string) {
    super(message);
    this.name = "CouldNotRunError";
  }
}
