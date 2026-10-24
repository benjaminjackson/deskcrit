// The pure checks behind `crit packs validate <dir>` (FR-49, US-6). It runs the one pack loader,
// then checks each criterion's fixtures against the list of files the CLI found in the pack
// directory. It reads no files and touches no process state (CS-6); src/cli/ does the reading.

import type { Pack, PackProblem } from "../shared/pack.js";
import { checkPack, type PackCheckPhase } from "./load-pack.js";

/**
 * The result of validating one pack's text. `phase` names the check that found the problems, or
 * "ok" when there are none. `pack` is present whenever the loader accepted the text, so the
 * caller can name the pack and count its criteria (FR-49, US-6).
 */
export type PackValidation =
  | {
      readonly phase: PackCheckPhase;
      readonly pack?: undefined;
      readonly problems: readonly PackProblem[];
    }
  | {
      readonly phase: "fixtures";
      readonly pack: Pack;
      readonly problems: readonly PackProblem[];
    }
  | {
      readonly phase: "ok";
      readonly pack: Pack;
      readonly problems: readonly [];
    };

/** The two fixture lists of a criterion, in the order the problems are reported (FR-49). */
const FIXTURE_KINDS = ["positive", "negative"] as const;

/**
 * Check one pack's YAML text with the loader, and when the loader accepts it, check the fixtures
 * of every criterion. `existingFiles` holds every file in the pack directory as a path relative to
 * that directory with "/" between folders. The loader's problems keep its own order, and fixture
 * problems come in criterion order (FR-36, FR-44, FR-45, FR-49, US-6).
 */
export function validatePackText(
  packYamlText: string,
  existingFiles: ReadonlySet<string>,
): PackValidation {
  const result = checkPack(packYamlText);
  if (!result.ok) {
    return { phase: result.phase, problems: result.problems };
  }
  const fixtureProblems = checkPackFixtures(result.pack, existingFiles);
  if (fixtureProblems.length > 0) {
    return { phase: "fixtures", pack: result.pack, problems: fixtureProblems };
  }
  return { phase: "ok", pack: result.pack, problems: [] };
}

/**
 * List the fixture problems of every criterion, in criterion order and then positive before
 * negative. A list that is missing or empty is a problem that names the criterion (FR-49). A path
 * that leaves the pack directory, or that names no file in `existingFiles`, is a problem too
 * (FR-49, decided 2026-10-24 under crit-q25.1).
 */
export function checkPackFixtures(
  pack: Pack,
  existingFiles: ReadonlySet<string>,
): PackProblem[] {
  const problems: PackProblem[] = [];
  for (const criterion of pack.criteria) {
    for (const kind of FIXTURE_KINDS) {
      const field = `fixtures.${kind}`;
      // `?.` reads `positive` only when `fixtures` is present, and gives undefined otherwise.
      const paths = criterion.fixtures?.[kind];
      if (paths === undefined || paths.length === 0) {
        problems.push({
          criterion: criterion.id,
          field,
          message: `the criterion has no ${kind} fixture; crit packs validate needs at least one`,
        });
        continue;
      }
      // entries() gives each path with its position, which names the field at fault.
      for (const [index, path] of paths.entries()) {
        const problemMessage = describeFixturePathProblem(path, existingFiles);
        if (problemMessage !== undefined) {
          problems.push({
            criterion: criterion.id,
            field: `${field}.${index}`,
            message: problemMessage,
          });
        }
      }
    }
  }
  return problems;
}

/**
 * Return why one fixture path is wrong, or undefined when it names a file in the pack directory.
 * An absolute path or a path with a ".." part could reach outside the pack, so it is refused
 * before the file list is consulted (FR-49).
 */
function describeFixturePathProblem(
  path: string,
  existingFiles: ReadonlySet<string>,
): string | undefined {
  const normalizedPath = normalizeFixturePath(path);
  if (normalizedPath === undefined) {
    return `${path} leaves the pack directory; give a path inside it`;
  }
  if (!existingFiles.has(normalizedPath)) {
    return `${path} is not a file in the pack directory`;
  }
  return undefined;
}

/**
 * Turn a fixture path into the "a/b.png" form the file list uses, dropping "." parts and repeated
 * slashes. Return undefined when the path is absolute (it starts with "/" or "\", or a drive letter
 * such as "C:"), uses "\" between folders, or has a ".." part, because each of those can name a
 * file outside the pack directory (FR-49).
 */
function normalizeFixturePath(path: string): string | undefined {
  if (path.startsWith("/") || path.includes("\\") || /^[A-Za-z]:/.test(path)) {
    return undefined;
  }
  const parts: string[] = [];
  for (const part of path.split("/")) {
    if (part === "..") {
      return undefined;
    }
    if (part === "" || part === ".") {
      continue;
    }
    parts.push(part);
  }
  return parts.join("/");
}
