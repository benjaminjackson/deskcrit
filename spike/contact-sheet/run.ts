// Runs the design critic on each contact sheet of the spike (crit-j8y.1), once per set and condition,
// and saves the crits in spike/contact-sheet/runs/. Condition "sheet" gives the critic the sheet
// alone. Condition "sheet-and-screens" gives it the sheet and then each screen at full size.
// The run-critic.ts command takes one image per run, so this script calls its ensureCrits directly
// with several images and a focus, as compare.ts does. Asks a model; never run in npm run ci.
// Usage: node spike/contact-sheet/run.ts run | replay
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  type CritRequest,
  ensureCrits,
  readSavedCrits,
  requestKeyOf,
  runClaudeProcess,
  skillCommit,
  currentRunIdentity,
} from "../../evals/critic/run-critic.ts";

const SPIKE_DIRECTORY = import.meta.dirname;
const REPOSITORY_DIRECTORY = resolve(SPIKE_DIRECTORY, "..", "..");
const SKILL_DIRECTORY = join(REPOSITORY_DIRECTORY, "plugin", "skills", "design-critic");
const RUNS_DIRECTORY = join(SPIKE_DIRECTORY, "runs");
const IMAGES_DIRECTORY = join(SPIKE_DIRECTORY, "images");

const NOTE = "Screens of one web app, an invoicing tool for small businesses, shown together as a set.";

/** Returns the focus line for a sheet of `tileCount` tiles, with or without the full-size screens. */
function focusFor(tileCount: number, withScreens: boolean): string {
  let imagesLine = `Image 1 is a contact sheet of ${tileCount} screens of one product, with each tile's number above it.`;
  if (withScreens) {
    imagesLine += ` Images 2 to ${tileCount + 1} are the same screens at full size, in tile order: image 2 is tile 1, image 3 is tile 2, and so on.`;
  }
  return (
    `${imagesLine} Judge the screens as a set: does the same kind of element look the same on every screen, ` +
    "and does content line up to the same columns and margins on every screen? Name each tile that breaks the pattern by its number, or say that none does. " +
    "End with one last line, `Breaks: tile <n>` (list every tile that breaks the pattern, separated by commas) or `Breaks: none`."
  );
}

/** Returns the requests of every set and condition, keyed by a short label. */
function requests(): Array<[string, CritRequest]> {
  const result: Array<[string, CritRequest]> = [];
  const setNames = readdirSync(IMAGES_DIRECTORY).sort();
  for (const setName of setNames) {
    const setDirectory = join(IMAGES_DIRECTORY, setName);
    const screenPaths = readdirSync(setDirectory)
      .filter((name) => name.startsWith("screen-"))
      .sort()
      .map((name) => join(setDirectory, name));
    const sheetPath = join(setDirectory, "sheet.png");
    result.push([
      `${setName} sheet`,
      { imagePaths: [sheetPath], note: NOTE, focus: focusFor(screenPaths.length, false) },
    ]);
    result.push([
      `${setName} sheet-and-screens`,
      { imagePaths: [sheetPath, ...screenPaths], note: NOTE, focus: focusFor(screenPaths.length, true) },
    ]);
  }
  return result;
}

const mode = process.argv[2];
const allRequests = requests();
if (mode === "run") {
  const commit = skillCommit(SKILL_DIRECTORY);
  // Start every request at once; there are only eight.
  const results = await Promise.all(
    allRequests.map(([, request]) =>
      ensureCrits(request, {
        runsDirectory: RUNS_DIRECTORY,
        skillDirectory: SKILL_DIRECTORY,
        skillCommit: commit,
        runClaude: runClaudeProcess,
      }),
    ),
  );
  allRequests.forEach(([label], index) => {
    for (const crit of results[index] ?? []) {
      console.log(`${label}: ${crit.critPath}`);
    }
  });
} else if (mode === "replay") {
  const commit = skillCommit(SKILL_DIRECTORY, true);
  for (const [label, request] of allRequests) {
    const saved = readSavedCrits(RUNS_DIRECTORY, commit, requestKeyOf(request), currentRunIdentity(false));
    for (const crit of saved) {
      const lastLine = crit.crit.trim().split("\n").at(-1);
      console.log(`${label}: ${lastLine}  (${crit.critPath})`);
    }
  }
} else {
  console.error("usage: node spike/contact-sheet/run.ts run | replay");
  process.exit(2);
}
