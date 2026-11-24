// Reads Jev's saved answers on fixture images through the agreement harness in replay mode, with
// no key and no request to TypeSafe (EV-4 rule 5). The overlap evaluation (EV-20) reads Jev's
// verdicts from it, and the detection evaluation (EV-14) reads the fired criteria it gives the
// critic as Jev evidence (FR-78). Needs dist/crit.js.

import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { parseDocument } from "yaml";
import { runHarness } from "../agreement/run-agreement.ts";
import type { Verdict } from "../agreement/score.ts";
import { RESPELLING } from "../agreement/spelling.ts";
import { readPinnedModel } from "../support/pinned-model-and-schema.ts";
import { runCritBundle } from "../support/run-crit-bundle.ts";
import type { DetectionCriterion, SelectedCriterion } from "./detect.ts";

/** One fixture image of one criterion, as selectCriteria in detect.ts returns it. */
export type JevReplayImage = {
  readonly criterion: DetectionCriterion;
  readonly scoredImage: SelectedCriterion["scored"][number];
};

/** One finding of a `crit report --json` document, with the fields the evaluations read. */
export type JevFinding = {
  readonly criterion: string;
  readonly title: string;
  readonly verdict: Verdict;
  readonly distribution: Record<string, number>;
  readonly confidence: number | null;
};

/** Jev's pinned model and its findings on each image, keyed by the image's display path. */
export type JevFindings = {
  readonly model: string;
  readonly findingsByImage: ReadonlyMap<string, readonly JevFinding[]>;
};

/**
 * Reads Jev's findings on these images through the agreement harness in replay mode, so the
 * harness's own rules apply: answers to an old question are dropped, renamed criterion ids are
 * mapped, and every report is checked against the report schema (EV-4 rule 5, R-4). Each pack is
 * copied to a temporary folder with every file linked except pack.yaml, whose fixture lists are cut
 * to the selected images, so the harness replays only those images. The question hash leaves the
 * fixture lists out, so the cut does not change which saved answers count. A wrapper around the
 * bundle runner keeps each report's findings, keyed by the image path that crit was given.
 */
export async function readJevFindingsByReplay(
  repositoryDirectory: string,
  images: readonly JevReplayImage[],
): Promise<JevFindings> {
  const harnessDirectory = join(repositoryDirectory, "evals", "agreement");
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "crit-overlap-"));
  try {
    const packsDirectory = join(temporaryDirectory, "packs");
    const emptyLabelsDirectory = join(temporaryDirectory, "labels");
    mkdirSync(emptyLabelsDirectory, { recursive: true });
    const packNames = [...new Set(images.map((image) => image.criterion.pack))];
    const packArguments: string[] = [];
    for (const packName of packNames) {
      const packImages = images.filter(
        (image) => image.criterion.pack === packName,
      );
      const copyDirectory = join(packsDirectory, packName);
      writeCutPack(
        join(repositoryDirectory, "packs", packName),
        copyDirectory,
        packImages,
      );
      packArguments.push("--pack", copyDirectory);
    }
    const findingByKey = new Map<string, JevFinding>();
    await runHarness(packArguments, {
      harnessDirectory,
      runsDirectory: join(harnessDirectory, "runs"),
      labelsDirectory: emptyLabelsDirectory,
      respelling: RESPELLING,
      runCrit: async (critArguments, environment, workingDirectory) => {
        const run = await runCritBundle(
          critArguments,
          environment,
          workingDirectory,
        );
        if (run.exitCode !== 0 && run.exitCode !== 1) {
          // The harness stops on this run and names the fixture.
          return run;
        }
        // critArguments is ["report", <image path>, ...].
        const imagePath = critArguments[1] ?? "";
        const displayPath = `packs/${relative(packsDirectory, imagePath)}`;
        // A cast, not a check: the harness checks every report against the report schema.
        const report = JSON.parse(run.stdout) as {
          findings: JevFinding[];
        };
        for (const finding of report.findings) {
          // A later report of the same image overrides an earlier one, as in the harness.
          findingByKey.set(`${displayPath}|${finding.criterion}`, finding);
        }
        return run;
      },
    });
    // Group the findings by image, in the order crit reported them.
    const findingsByImage = new Map<string, JevFinding[]>();
    for (const [key, finding] of findingByKey) {
      const displayPath = key.slice(0, key.indexOf("|"));
      const findings = findingsByImage.get(displayPath) ?? [];
      findings.push(finding);
      findingsByImage.set(displayPath, findings);
    }
    return { model: readPinnedModel(harnessDirectory), findingsByImage };
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

/**
 * Writes a copy of one pack: a link to every entry of the pack folder but pack.yaml, and a
 * pack.yaml whose criteria list only the selected fixtures, by the polarity of their file names.
 */
function writeCutPack(
  packDirectory: string,
  copyDirectory: string,
  packImages: readonly JevReplayImage[],
): void {
  mkdirSync(copyDirectory, { recursive: true });
  for (const entry of readdirSync(packDirectory)) {
    if (entry === "pack.yaml") {
      continue;
    }
    symlinkSync(join(packDirectory, entry), join(copyDirectory, entry));
  }
  const packYamlPath = join(packDirectory, "pack.yaml");
  const document = parseDocument(readFileSync(packYamlPath, "utf8"));
  const criteria = document.toJS()?.criteria;
  if (!Array.isArray(criteria)) {
    throw new Error(`${packYamlPath}: the pack has no criteria list`);
  }
  // From the last criterion to the first, so deleting one does not move the index of the next.
  for (let index = criteria.length - 1; index >= 0; index -= 1) {
    const criterion: { id?: unknown } = criteria[index];
    const positive: string[] = [];
    const negative: string[] = [];
    for (const image of packImages) {
      const fixture = image.scoredImage.image;
      if (
        image.criterion.id !== criterion.id ||
        fixture.labelPath === undefined
      ) {
        continue;
      }
      if (fixture.polarity === "positive") {
        positive.push(fixture.labelPath);
      } else {
        negative.push(fixture.labelPath);
      }
    }
    if (positive.length === 0 && negative.length === 0) {
      // A skipped criterion: drop it, so the harness does not replay its images.
      document.deleteIn(["criteria", index]);
      continue;
    }
    // setIn replaces one value in the YAML document and keeps every other field as it was.
    document.setIn(["criteria", index, "fixtures", "positive"], positive);
    document.setIn(["criteria", index, "fixtures", "negative"], negative);
  }
  writeFileSync(join(copyDirectory, "pack.yaml"), document.toString());
}
