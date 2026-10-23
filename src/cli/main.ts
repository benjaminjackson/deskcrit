import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";

const PLACEHOLDER_OUTPUT = "deskcrit: no commands yet (crit-cy8.11 adds them)";

/**
 * Runs the command for the given arguments and returns the exit code. For now
 * it is a placeholder that proves the toolchain works; crit-cy8.11 adds the
 * real commands (FR-59, CS-17).
 */
export function main(_argv: string[]): number {
  // The placeholder ignores its arguments, and the leading underscore tells the
  // linter that is on purpose. crit-cy8.11 parses them.
  return 0;
}

/**
 * Runs main with the process arguments, writes stdout once, and sets the exit
 * code instead of ending the process early, so output is never cut off (FR-61, CS-17).
 */
export function runMain(): void {
  const exitCode = main(process.argv.slice(2));
  process.stdout.write(`${PLACEHOLDER_OUTPUT}\n`);
  process.exitCode = exitCode;
}

/**
 * Says whether this file is the program that Node was asked to run, and not a
 * module that another file (such as a test) imported (NFR-2).
 */
function isEntryPoint(): boolean {
  const scriptPath = process.argv[1];
  if (scriptPath === undefined) {
    return false;
  }
  // npx runs the bundle through a symlink in node_modules/.bin, so compare the
  // real path of the script with the path of this module (import.meta.url).
  return realpathSync(scriptPath) === fileURLToPath(import.meta.url);
}

if (isEntryPoint()) {
  runMain();
}
