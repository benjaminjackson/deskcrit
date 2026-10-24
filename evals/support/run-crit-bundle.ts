// The child-process runner that the agreement harness (EV-4, EV-5) and the adversarial check (EV-7)
// share. It runs the built bundle and imports nothing from src/, so a rewrite of crit in another
// language must still pass the checks that use it (AC-6, CS-21). It imports only node: modules.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** The built bundle, found from this file's place in evals/support/. */
const CRIT_BUNDLE_PATH = join(
  fileURLToPath(new URL("../../", import.meta.url)),
  "dist",
  "crit.js",
);

/** What one run of crit gave back. A null exit code means crit stopped on a signal. */
export type CritRun = {
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number | null;
};

/**
 * Run the built crit bundle as a child process in the working directory given, so crit reads that
 * folder's .crit.yaml. The caller chooses the environment, so it decides whether the key reaches
 * crit (FR-42, NFR-14). This is the only function in these scripts that starts a process (AC-6).
 */
export async function runCritBundle(
  critArguments: readonly string[],
  environment: NodeJS.ProcessEnv,
  workingDirectory: string,
): Promise<CritRun> {
  if (!existsSync(CRIT_BUNDLE_PATH)) {
    throw new Error(
      `${CRIT_BUNDLE_PATH} does not exist; run npm run build first`,
    );
  }
  const result = spawnSync(
    process.execPath,
    [CRIT_BUNDLE_PATH, ...critArguments],
    {
      cwd: workingDirectory,
      env: environment,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  if (result.error !== undefined) {
    throw new Error(`crit could not start: ${result.error.message}`);
  }
  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.status,
  };
}
