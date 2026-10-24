// `crit packs validate <dir>` (FR-49, FR-60, US-6). It reads the pack directory, hands the text of
// pack.yaml and the list of files in the directory to the pure checks in src/packs/, and returns
// the text for stdout and stderr. main.ts writes them and sets the exit code (CS-17). It never
// reads TYPESAFE_API_KEY and makes no network call (FR-60, CS-6).

import type { Dirent } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { validatePackText } from "../packs/validate-pack.js";
import { CouldNotRunError } from "../shared/could-not-run-error.js";
import type { PackProblem } from "../shared/pack.js";

/** The file in a pack directory that holds the pack (FR-44). */
const PACK_FILE_NAME = "pack.yaml";

/** What one validate run found: whether the pack is valid, and the text for each stream. */
export type PacksValidateOutput = {
  readonly valid: boolean;
  readonly stdoutText: string;
  readonly stderrText: string;
};

/**
 * Validate the pack in `directory`, resolved against the working directory. A valid pack gives
 * one line on stdout. An invalid pack gives one line per problem on stderr and valid false, so
 * main exits 1. A missing directory, an unreadable pack.yaml, or a pack.yaml that is not YAML the
 * loader accepts throws CouldNotRunError naming the path, so main exits 2 (FR-4, FR-43, FR-49,
 * FR-61, US-6).
 */
export async function runPacksValidate(
  directory: string,
  workingDirectory: string,
): Promise<PacksValidateOutput> {
  const packDirectory = resolve(workingDirectory, directory);
  const packFileLabel = join(directory, PACK_FILE_NAME);
  await checkIsDirectory(packDirectory, directory);
  const packYamlText = await readPackFile(packDirectory, packFileLabel);
  const existingFiles = await listFilesInDirectory(packDirectory, directory);

  const validation = validatePackText(packYamlText, existingFiles);
  if (validation.phase === "yaml") {
    const lines = [`${packFileLabel}: cannot parse YAML`];
    for (const problem of validation.problems) {
      lines.push(`  ${describeProblem(problem)}`);
    }
    throw new CouldNotRunError(lines.join("\n"));
  }
  if (validation.phase === "ok") {
    const criterionCount = validation.pack.criteria.length;
    return {
      valid: true,
      stdoutText: `${directory}: pack ${validation.pack.name} is valid (${criterionCount} criteria)\n`,
      stderrText: "",
    };
  }
  let stderrText = "";
  for (const problem of validation.problems) {
    stderrText += `crit: ${packFileLabel}: ${describeProblem(problem)}\n`;
  }
  return { valid: false, stdoutText: "", stderrText };
}

/** Throw CouldNotRunError naming the directory when it does not exist or is not a directory (FR-4). */
async function checkIsDirectory(
  packDirectory: string,
  directoryLabel: string,
): Promise<void> {
  let isDirectory = false;
  try {
    isDirectory = (await stat(packDirectory)).isDirectory();
  } catch {
    isDirectory = false;
  }
  if (!isDirectory) {
    throw new CouldNotRunError(`${directoryLabel}: no such pack directory`);
  }
}

/** Read <directory>/pack.yaml, and throw CouldNotRunError naming that path when it cannot be read (FR-4). */
async function readPackFile(
  packDirectory: string,
  packFileLabel: string,
): Promise<string> {
  try {
    return await readFile(join(packDirectory, PACK_FILE_NAME), "utf8");
  } catch {
    throw new CouldNotRunError(`${packFileLabel}: cannot read file`);
  }
}

/**
 * List every file under the pack directory as a path relative to it with "/" between folders, so
 * the pure fixture check can look each fixture path up (FR-49). Only plain files count: a folder
 * or a symbolic link is not a fixture.
 */
async function listFilesInDirectory(
  packDirectory: string,
  directoryLabel: string,
): Promise<ReadonlySet<string>> {
  let entries: Dirent[];
  try {
    entries = await readdir(packDirectory, {
      recursive: true,
      withFileTypes: true,
    });
  } catch {
    throw new CouldNotRunError(`${directoryLabel}: cannot list files`);
  }
  const files = new Set<string>();
  for (const entry of entries) {
    if (!entry.isFile()) {
      continue;
    }
    // parentPath is the folder that holds the entry. Splitting on the platform separator and
    // joining with "/" gives the same form on Windows as on macOS and Linux.
    const relativePath = relative(
      packDirectory,
      join(entry.parentPath, entry.name),
    );
    files.add(relativePath.split(sep).join("/"));
  }
  return files;
}

/** Write one problem as "criterion <id>, field <path>: <message>", or "field <path>: <message>" for the pack as a whole (US-6). */
function describeProblem(problem: PackProblem): string {
  if (problem.criterion === undefined) {
    return `field ${problem.field}: ${problem.message}`;
  }
  return `criterion ${problem.criterion}, field ${problem.field}: ${problem.message}`;
}
