// The Jev overlap evaluation (PRD EV-20, FR-78, OQ-27). For the variant-1 pair of each live
// criterion, the images that the detection evaluation (EV-14) scores, it joins two saved results:
// whether Jev fired on the image for that criterion, from the saved answers under
// evals/agreement/runs/, and whether the critic's crit says the defect is present, from the saved
// detection judge answers under evals/critic/runs/. It prints how many of Jev's fires the critic
// also raised with no help from Jev, the defects the critic raised that Jev left quiet, and the
// praise-text result (EV-16), against the bar that EV-20 proposes. OQ-27 is Benjamin Jackson's
// decision, so the output states figures and never a decision.
//
// --replay is the only mode. It runs the built crit bundle with --answers and no key, and reads
// saved judge answers; it asks no model and sends no request to TypeSafe.

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
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { parseDocument } from "yaml";
import { runHarness } from "../agreement/run-agreement.ts";
import { readFixtureOutcome, type Verdict } from "../agreement/score.ts";
import { RESPELLING } from "../agreement/spelling.ts";
import { readPinnedModel } from "../support/pinned-model-and-schema.ts";
import { runCritBundle } from "../support/run-crit-bundle.ts";
import {
  buildDetectionQuestion,
  type DefectMention,
  type DetectionCriterion,
  type FixtureImage,
  imageKey,
  judgeRule,
  parseDetectionAnswer,
  selectCriteria,
} from "./detect.ts";
import {
  JUDGE_MODEL,
  judgeAnswerPath,
  judgeKey,
  readJudgeAnswer,
} from "./judge.ts";
import { type PraiseTextOutput, runPraiseText } from "./praise-text.ts";
import { portablePath, readSavedCrits } from "./run-critic.ts";

const REPOSITORY_DIRECTORY = resolve(import.meta.dirname, "..", "..");
const EXIT_CODE_COULD_NOT_RUN = 2;

/** The skill commit of the baseline in evals/critic/BASELINE.md, whose saved runs this reads. */
export const BASELINE_SKILL_COMMIT = "01218fd9c4f11aa8d790a3a39289ee0266bfb3d1";

/** The share of Jev's fires that EV-20 proposes as the bar, as a fraction. */
const PROPOSED_SHARE = 0.95;

/** One scored image of one live criterion, as the detection evaluation selects it. */
export type OverlapImage = {
  readonly pack: string;
  readonly criterion: string;
  /** The path relative to the repository root, `packs/<pack>/fixtures/<name>.png`. */
  readonly displayPath: string;
  /** The path as pack.yaml writes it, `fixtures/<name>.png`. */
  readonly fixturePath: string;
  readonly truth: "shows-defect" | "no-defect";
};

/** A selected image with the criterion and fixture that detect.ts read it from, for the judge question. */
type SelectedImage = {
  readonly image: OverlapImage;
  readonly criterion: DetectionCriterion;
  readonly fixtureImage: FixtureImage;
};

/** One image joined with Jev's verdict, or undefined when no saved answer covers it, and the critic's answer. */
export type OverlapRow = {
  readonly image: OverlapImage;
  readonly jevVerdict: Verdict | undefined;
  readonly critic: DefectMention;
};

/** Jev's pinned model and its verdict for each image and criterion, keyed by jevVerdictKey. */
export type JevVerdicts = {
  readonly model: string;
  readonly verdictByKey: ReadonlyMap<string, Verdict>;
};

/** Where to read the repository and the critic runs, and how to read Jev and praise-text. Tests stub the last two. */
export type OverlapOptions = {
  readonly repositoryDirectory: string;
  readonly criticRunsDirectory: string;
  readonly skillCommit: string;
  readonly readJevVerdicts: (
    images: readonly OverlapImage[],
  ) => Promise<JevVerdicts>;
  readonly replayPraiseText: () => Promise<PraiseTextOutput>;
};

/** What the command prints on stdout and stderr, and its exit code. */
export type OverlapOutput = {
  readonly text: string;
  readonly errorText: string;
  readonly exitCode: number;
};

const HELP_TEXT = `Jev overlap evaluation (EV-20).

Usage:
  node evals/critic/overlap.ts --replay

For the variant-1 pair of each live criterion, it joins Jev's verdict from the saved answers under
evals/agreement/runs/ (replayed through dist/crit.js with --answers and no key) with the critic's
saved detection judge answer at skill commit ${BASELINE_SKILL_COMMIT}, and prints how many of
Jev's fires the critic also raised, the defects the critic raised that Jev left quiet, and the
praise-text result. It asks no model and sends no request to TypeSafe. Run npm run build first.

Exit codes: 0 the figures printed, 2 without --replay, or something is missing.
`;

/** Returns the key of one image and criterion in JevVerdicts: the display path and `<pack>/<criterion>`. */
export function jevVerdictKey(
  displayPath: string,
  pack: string,
  criterion: string,
): string {
  return `${displayPath}|${pack}/${criterion}`;
}

/** Returns whether a verdict counts as Jev reporting the defect: fail and warn do, pass and uncertain do not (EV-4). */
function jevFired(verdict: Verdict): boolean {
  return readFixtureOutcome(verdict) === "fired";
}

/** Returns a share as a percent to one place with its counts, or `- (0/0)` when the count is zero. */
function formatShare(numerator: number, denominator: number): string {
  if (denominator === 0) {
    return "- (0/0)";
  }
  return `${((numerator / denominator) * 100).toFixed(1)}% (${numerator}/${denominator})`;
}

/** Returns one list line for an image: its path, its criterion, Jev's verdict, and the critic's answer. */
function describeRow(row: OverlapRow): string {
  return `  ${row.image.displayPath} (${row.image.pack}/${row.image.criterion}): Jev ${row.jevVerdict ?? "no answer"}, critic ${row.critic}`;
}

/**
 * Returns the report text from the joined rows and the praise-text replay: the definitions, the
 * four figures with their lists, the bar line, and the limit of the sample (EV-20).
 */
export function renderOverlap(
  rows: readonly OverlapRow[],
  jevModel: string,
  skillCommit: string,
  praiseText: PraiseTextOutput,
): string {
  const noAnswer: OverlapRow[] = [];
  let firesOnDefect = 0;
  let firesOnClean = 0;
  let firesAlsoRaised = 0;
  const firesCriticMissed: OverlapRow[] = [];
  const raisedJevQuiet: OverlapRow[] = [];
  for (const row of rows) {
    if (row.jevVerdict === undefined) {
      noAnswer.push(row);
      continue;
    }
    const fired = jevFired(row.jevVerdict);
    const showsDefect = row.image.truth === "shows-defect";
    if (fired && !showsDefect) {
      firesOnClean += 1;
    }
    if (fired && showsDefect) {
      firesOnDefect += 1;
      if (row.critic === "present") {
        firesAlsoRaised += 1;
      } else {
        firesCriticMissed.push(row);
      }
    }
    if (!fired && showsDefect && row.critic === "present") {
      raisedJevQuiet.push(row);
    }
  }
  const showsDefectCount = rows.filter(
    (row) => row.image.truth === "shows-defect",
  ).length;
  const praiseLines = praiseText.text.trimEnd().split("\n");
  const praiseResult = praiseLines[praiseLines.length - 1] ?? "";
  // runPraiseText exits 1 only when a pair fails; 0 means no pair failed (EV-16).
  const praisePassed = praiseText.exitCode === 0;
  const sharePercent =
    firesOnDefect === 0 ? undefined : (firesAlsoRaised / firesOnDefect) * 100;
  let shareAgainstBar = "there is no Jev fire to take a share of";
  if (sharePercent !== undefined) {
    const side = sharePercent >= PROPOSED_SHARE * 100 ? "at or above" : "below";
    shareAgainstBar = `the share is ${sharePercent.toFixed(1)}%, ${side} 95%`;
  }
  const praiseAgainstBar = praisePassed
    ? "praise-text has no failed pair"
    : "praise-text has a failed pair";

  const lines: string[] = [];
  lines.push(
    `skill commit ${skillCommit}, judge model ${JUDGE_MODEL}, Jev model ${jevModel}`,
  );
  lines.push(
    `images: ${rows.length}, the variant-1 pair of each live criterion; ${showsDefectCount} show the defect and ${rows.length - showsDefectCount} do not (a label in evals/agreement/labels/ wins over the file name)`,
  );
  lines.push(
    "Jev fired: verdict fail or warn, as evals/agreement/score.ts counts it; pass and uncertain are quiet.",
  );
  lines.push(
    "Critic raised: the detection judge answer is present; absent and not_mentioned are not raised.",
  );
  lines.push(`images with no Jev answer: ${noAnswer.length}`);
  for (const row of noAnswer) {
    lines.push(describeRow(row));
  }
  lines.push("");
  lines.push(
    `1. Jev fires: ${firesOnDefect + firesOnClean} of ${rows.length - noAnswer.length} images with a Jev answer; ${firesOnDefect} on images that show the defect, ${firesOnClean} on images that do not`,
  );
  lines.push(
    `2. Jev's fires on images that show the defect that the critic also raised: ${formatShare(firesAlsoRaised, firesOnDefect)}`,
  );
  lines.push(`   the critic missed: ${firesCriticMissed.length}`);
  for (const row of firesCriticMissed) {
    lines.push(`  ${describeRow(row)}`);
  }
  lines.push(
    `3. defects the critic raised that Jev left quiet, on images that show the defect: ${raisedJevQuiet.length}`,
  );
  for (const row of raisedJevQuiet) {
    lines.push(`  ${describeRow(row)}`);
  }
  lines.push(`4. praise-text (EV-16): ${praiseResult}`);
  lines.push("");
  lines.push(
    `Proposed bar (EV-20, not decided; OQ-27 is Benjamin Jackson's): 95% or more of Jev's fires raised by the critic, and praise-text passed. Here ${shareAgainstBar}, and ${praiseAgainstBar}.`,
  );
  lines.push(
    "Limit of the sample: one pair per criterion, one critic run per image, and the critic's repeat-run figures in evals/critic/BASELINE.md (EV-17) show how much one run moves.",
  );
  return `${lines.join("\n")}\n`;
}

/**
 * Returns the scored images of the variant-1 pair of each live criterion, with the truth the
 * detection evaluation gives them (EV-14). Removed criteria have no Jev answers and are left out.
 */
function selectOverlapImages(repositoryDirectory: string): SelectedImage[] {
  const { selected } = selectCriteria(repositoryDirectory, 1);
  const images: SelectedImage[] = [];
  for (const entry of selected) {
    if (entry.criterion.group !== "live") {
      continue;
    }
    for (const scoredImage of entry.scored) {
      const fixturePath = scoredImage.image.labelPath;
      if (fixturePath === undefined) {
        throw new Error(
          `${scoredImage.image.displayPath} is a live image with no fixture path`,
        );
      }
      images.push({
        image: {
          pack: entry.criterion.pack,
          criterion: entry.criterion.id,
          displayPath: scoredImage.image.displayPath,
          fixturePath,
          truth: scoredImage.truth,
        },
        criterion: entry.criterion,
        fixtureImage: scoredImage.image,
      });
    }
  }
  return images;
}

/**
 * Reads Jev's verdicts on these images through the agreement harness in replay mode, so the
 * harness's own rules apply: answers to an old question are dropped, renamed criterion ids are
 * mapped, and every report is checked against the report schema (EV-4 rule 5, R-4). Each pack is
 * copied to a temporary folder with every file linked except pack.yaml, whose fixture lists are cut
 * to the selected images, so the harness replays only those images. The question hash leaves the
 * fixture lists out, so the cut does not change which saved answers count. A wrapper around the
 * bundle runner reads each report's verdicts, keyed by the image path that crit was given.
 */
export async function readJevVerdictsByReplay(
  repositoryDirectory: string,
  images: readonly OverlapImage[],
): Promise<JevVerdicts> {
  const harnessDirectory = join(repositoryDirectory, "evals", "agreement");
  const temporaryDirectory = mkdtempSync(join(tmpdir(), "crit-overlap-"));
  try {
    const packsDirectory = join(temporaryDirectory, "packs");
    const emptyLabelsDirectory = join(temporaryDirectory, "labels");
    mkdirSync(emptyLabelsDirectory, { recursive: true });
    const packNames = [...new Set(images.map((image) => image.pack))];
    const packArguments: string[] = [];
    for (const packName of packNames) {
      const packImages = images.filter((image) => image.pack === packName);
      const copyDirectory = join(packsDirectory, packName);
      writeCutPack(
        join(repositoryDirectory, "packs", packName),
        copyDirectory,
        packImages,
      );
      packArguments.push("--pack", copyDirectory);
    }
    const verdictByKey = new Map<string, Verdict>();
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
        // critArguments is ["report", <image path>, ...]; the harness stops on a bad run itself.
        const imagePath = critArguments[1] ?? "";
        const displayPath = `packs/${relative(packsDirectory, imagePath)}`;
        let report: unknown;
        try {
          report = JSON.parse(run.stdout);
        } catch {
          return run;
        }
        for (const finding of readFindings(report)) {
          // A later report of the same image overrides an earlier one, as in the harness.
          verdictByKey.set(
            `${displayPath}|${finding.criterion}`,
            finding.verdict,
          );
        }
        return run;
      },
    });
    return { model: readPinnedModel(harnessDirectory), verdictByKey };
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

/** Returns the criterion and verdict of each finding of a report; the harness checks the schema. */
function readFindings(
  report: unknown,
): { criterion: string; verdict: Verdict }[] {
  const findings: { criterion: string; verdict: Verdict }[] = [];
  if (typeof report !== "object" || report === null) {
    return findings;
  }
  if (!("findings" in report) || !Array.isArray(report.findings)) {
    return findings;
  }
  for (const finding of report.findings) {
    const criterion: unknown = finding?.criterion;
    const verdict: unknown = finding?.verdict;
    if (
      typeof criterion === "string" &&
      (verdict === "pass" ||
        verdict === "warn" ||
        verdict === "fail" ||
        verdict === "uncertain")
    ) {
      findings.push({ criterion, verdict });
    }
  }
  return findings;
}

/**
 * Writes a copy of one pack: a link to every entry of the pack folder but pack.yaml, and a pack.yaml
 * whose criteria list only the selected fixtures. It throws when pack.yaml's name is not the folder
 * name, because the harness reads saved answers by that name and detect.ts by the folder name.
 */
function writeCutPack(
  packDirectory: string,
  copyDirectory: string,
  packImages: readonly OverlapImage[],
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
  const parsed: unknown = document.toJS();
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("name" in parsed) ||
    !("criteria" in parsed) ||
    !Array.isArray(parsed.criteria)
  ) {
    throw new Error(`${packYamlPath}: not a pack`);
  }
  const packName = relative(join(packDirectory, ".."), packDirectory);
  if (parsed.name !== packName) {
    throw new Error(
      `${packYamlPath}: the name ${String(parsed.name)} is not the folder name ${packName}`,
    );
  }
  parsed.criteria.forEach((criterion: unknown, index: number) => {
    const criterionId =
      typeof criterion === "object" && criterion !== null && "id" in criterion
        ? criterion.id
        : undefined;
    const criterionImages = packImages.filter(
      (image) => image.criterion === criterionId,
    );
    const positive = criterionImages
      .filter((image) => image.displayPath.endsWith(".positive.png"))
      .map((image) => image.fixturePath);
    const negative = criterionImages
      .filter((image) => image.displayPath.endsWith(".negative.png"))
      .map((image) => image.fixturePath);
    if (positive.length === 0 || negative.length === 0) {
      throw new Error(
        `${packYamlPath}: criterion ${String(criterionId)} has no selected positive or negative image`,
      );
    }
    // setIn replaces one value in the YAML document and keeps every other field as it was.
    document.setIn(["criteria", index, "fixtures", "positive"], positive);
    document.setIn(["criteria", index, "fixtures", "negative"], negative);
  });
  writeFileSync(join(copyDirectory, "pack.yaml"), document.toString());
}

/** Parses the command line, joins Jev's verdicts with the critic's answers, and returns the report (EV-20). */
export async function runOverlap(
  argv: readonly string[],
  options: OverlapOptions,
): Promise<OverlapOutput> {
  const parsed = parseArgs({
    args: [...argv],
    options: { replay: { type: "boolean", default: false } },
    strict: true,
    allowPositionals: false,
  });
  if (parsed.values.replay !== true) {
    return {
      text: "",
      errorText: HELP_TEXT,
      exitCode: EXIT_CODE_COULD_NOT_RUN,
    };
  }
  const selectedImages = selectOverlapImages(options.repositoryDirectory);
  const images = selectedImages.map((selectedImage) => selectedImage.image);
  const commit = options.skillCommit;

  // The critic side first: a missing crit or judge answer stops the run before the Jev replay.
  const missing: string[] = [];
  const criticAnswers: (DefectMention | undefined)[] = [];
  for (const { image, criterion, fixtureImage } of selectedImages) {
    const key = imageKey(fixtureImage);
    const saved = readSavedCrits(options.criticRunsDirectory, commit, key)[0];
    if (saved === undefined) {
      missing.push(
        `missing crit: ${image.pack}/${image.criterion}, ${image.displayPath}, at skill commit ${commit}`,
      );
      criticAnswers.push(undefined);
      continue;
    }
    const question = buildDetectionQuestion(
      criterion.title,
      judgeRule(criterion.question),
      key,
      saved,
    );
    const answer = readJudgeAnswer(
      question,
      parseDetectionAnswer,
      options.criticRunsDirectory,
      commit,
    );
    if (answer === undefined) {
      const answerPath = judgeAnswerPath(
        options.criticRunsDirectory,
        commit,
        judgeKey(question),
      );
      missing.push(
        `missing judge answer: ${image.pack}/${image.criterion}, ${image.displayPath}: ${portablePath(answerPath, 3)}`,
      );
    }
    criticAnswers.push(answer?.says_defect);
  }

  const praiseText = await options.replayPraiseText();
  if (praiseText.exitCode === EXIT_CODE_COULD_NOT_RUN) {
    missing.push(
      `praise-text replay could not run: ${praiseText.errorText.trim()}`,
    );
  }
  if (missing.length > 0) {
    return {
      text: "",
      errorText: `${missing.join("\n")}\n`,
      exitCode: EXIT_CODE_COULD_NOT_RUN,
    };
  }

  const jev = await options.readJevVerdicts(images);
  const rows: OverlapRow[] = [];
  images.forEach((image, index) => {
    const critic = criticAnswers[index];
    if (critic === undefined) {
      throw new Error(`${image.displayPath} has no critic answer`);
    }
    rows.push({
      image,
      jevVerdict: jev.verdictByKey.get(
        jevVerdictKey(image.displayPath, image.pack, image.criterion),
      ),
      critic,
    });
  });
  return {
    text: renderOverlap(rows, jev.model, commit, praiseText),
    errorText: "",
    exitCode: 0,
  };
}

/** Returns the options of the real command: this repository, its runs, the bundle, and praise-text's replay. */
export function defaultOverlapOptions(
  repositoryDirectory: string,
): OverlapOptions {
  const criticRunsDirectory = join(
    repositoryDirectory,
    "evals",
    "critic",
    "runs",
  );
  return {
    repositoryDirectory,
    criticRunsDirectory,
    skillCommit: BASELINE_SKILL_COMMIT,
    readJevVerdicts: (images) =>
      readJevVerdictsByReplay(repositoryDirectory, images),
    replayPraiseText: () =>
      runPraiseText(["--replay", "--skill-commit", BASELINE_SKILL_COMMIT], {
        repositoryDirectory,
        runsDirectory: criticRunsDirectory,
        skillDirectory: join(
          repositoryDirectory,
          "plugin",
          "skills",
          "design-critic",
        ),
        // The replay starts no child process, so this runner throws if anything calls it.
        runClaude: async () => {
          throw new Error("the praise-text replay must not start claude");
        },
      }),
  };
}

/** Runs the command, writes its output, and sets the exit code: 2 when anything stopped the run. */
export async function main(): Promise<void> {
  try {
    const output = await runOverlap(
      process.argv.slice(2),
      defaultOverlapOptions(REPOSITORY_DIRECTORY),
    );
    process.stdout.write(output.text);
    process.stderr.write(output.errorText);
    process.exitCode = output.exitCode;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`overlap stopped: ${message}\n`);
    process.exitCode = EXIT_CODE_COULD_NOT_RUN;
  }
}

// Run only when node starts this file, not when a test imports it.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
