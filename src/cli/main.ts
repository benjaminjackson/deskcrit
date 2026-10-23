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
 * Runs main, writes stdout once, then sets the exit code instead of ending the
 * process early, so output is never cut off. This is the only place that sets
 * the exit code (FR-61, CS-17).
 */
export function run(argv: string[]): void {
  const exitCode = main(argv);
  process.stdout.write("deskcrit: no commands yet (crit-cy8.11 adds them)\n");
  process.exitCode = exitCode;
}
