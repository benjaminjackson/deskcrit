// The line that `crit --version` prints (FR-75). The build writes the short git commit id into the
// bundle with an esbuild `define`, so this file reads no file and runs no git command at run time.

import packageJson from "../../package.json" with { type: "json" };

/**
 * The short git commit id that scripts/build.mjs puts in place of this name, or undefined when the
 * build had no git checkout. `declare` tells the compiler the name exists without defining it.
 * From source and under Vitest nothing defines it, so describeVersion checks it with `typeof`,
 * which gives "undefined" for a name that does not exist instead of throwing.
 */
declare const CRIT_BUILD_COMMIT: string | undefined;

/**
 * Return the version line without its newline: `deskcrit <version> <commit>`, or `deskcrit
 * <version>` when the build had no commit id (FR-75). The package version stays 0.0.0 until the
 * first release, so the commit id is what tells a reader which crit ran.
 */
export function describeVersion(): string {
  const versionText = `deskcrit ${packageJson.version}`;
  if (typeof CRIT_BUILD_COMMIT === "string" && CRIT_BUILD_COMMIT !== "") {
    return `${versionText} ${CRIT_BUILD_COMMIT}`;
  }
  return versionText;
}
