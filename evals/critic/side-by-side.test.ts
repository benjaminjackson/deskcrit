// Unit tests of the blind side-by-side (EV-19). Each test writes fake saved runs as
// <commit>/<image sha>/1.md and 1.json in its own temporary folder, with the metadata of the
// current run identity, and passes a fixed seed (CS-22). No model is asked.

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { currentDeepRunIdentity, deepRequestKey } from "./deep-run.ts";
import { goFurtherKey } from "./go-further.ts";
import { currentRunIdentity } from "./run-critic.ts";
import {
  checkKeyFile,
  isCandidateFirst,
  type KeyFile,
  recordPicks,
  runSideBySideCommand,
} from "./side-by-side.ts";

const BASE_COMMIT = "1111111aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const CANDIDATE_COMMIT = "2222222bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const FIXED_SEED = Buffer.alloc(32, 7);
const SCRIPT_FILE = join(import.meta.dirname, "side-by-side.ts");

/** Returns the SHA-256 of a string as hex, the way the runner keys a one-image request. */
function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

/** Writes one fake saved run of an image for a commit, with the current run identity. */
function writeRun(
  runsDirectory: string,
  commit: string,
  imageBytes: string,
  crit: string,
  skillDirectory = "plugin/skills/design-critic",
): void {
  const requestDirectory = join(runsDirectory, commit, sha256(imageBytes));
  mkdirSync(requestDirectory, { recursive: true });
  writeFileSync(join(requestDirectory, "1.md"), crit);
  writeFileSync(
    join(requestDirectory, "1.json"),
    JSON.stringify({
      ...currentRunIdentity(),
      skill_directory: skillDirectory,
      skill_commit: commit,
      total_cost_usd: 1.23,
    }),
  );
}

/** Makes a temporary folder with an images folder of `count` pages and a runs folder. */
function setUp(count: number) {
  const root = mkdtempSync(join(tmpdir(), "side-by-side-test-"));
  const imageFolder = join(root, "images");
  mkdirSync(imageFolder);
  const imageBytes: string[] = [];
  for (let index = 1; index <= count; index += 1) {
    const bytes = `fake image ${index}`;
    writeFileSync(join(imageFolder, `page-${index}.png`), bytes);
    imageBytes.push(bytes);
  }
  writeFileSync(join(imageFolder, "notes.txt"), "not an image");
  const runsDirectory = join(root, "runs");
  const outDirectory = join(root, "out");
  return { root, imageFolder, imageBytes, runsDirectory, outDirectory };
}

/** Writes a base crit and a candidate crit for every page. */
function writeBothSides(runsDirectory: string, imageBytes: readonly string[]) {
  for (const bytes of imageBytes) {
    writeRun(runsDirectory, BASE_COMMIT, bytes, `Base crit of ${bytes}.`);
    writeRun(
      runsDirectory,
      CANDIDATE_COMMIT,
      bytes,
      `Candidate crit of ${bytes}.`,
    );
  }
}

/** Runs prepare with the fixed seed and the given folders. */
function prepare(
  setup: ReturnType<typeof setUp>,
  base = BASE_COMMIT,
  candidate = CANDIDATE_COMMIT,
) {
  return runSideBySideCommand(
    ["prepare", "--base", base, "--candidate", candidate, setup.imageFolder],
    {
      runsDirectory: setup.runsDirectory,
      outDirectory: setup.outDirectory,
      randomSeed: () => FIXED_SEED,
    },
  );
}

/** Reads key.json from the out folder. */
function readKey(outDirectory: string): KeyFile {
  return checkKeyFile(
    JSON.parse(readFileSync(join(outDirectory, "key.json"), "utf8")),
  );
}

describe("prepare", () => {
  it("with --candidate-deep reads the deep crits of the same commit as the candidate", () => {
    const setup = setUp(2);
    for (const bytes of setup.imageBytes) {
      writeRun(
        setup.runsDirectory,
        BASE_COMMIT,
        bytes,
        `Single crit of ${bytes}.`,
      );
      const deepDirectory = join(
        setup.runsDirectory,
        BASE_COMMIT,
        deepRequestKey([sha256(bytes)], undefined, undefined),
      );
      mkdirSync(deepDirectory, { recursive: true });
      writeFileSync(join(deepDirectory, "1.md"), `Deep crit of ${bytes}.`);
      writeFileSync(
        join(deepDirectory, "1.json"),
        JSON.stringify({
          ...currentDeepRunIdentity(),
          mode: "deep",
          skill_directory: "plugin/skills/design-critic",
        }),
      );
    }
    // Without the flag the two sides are the same run folder, which prepare refuses.
    expect(prepare(setup, BASE_COMMIT, BASE_COMMIT).exitCode).toBe(2);
    const output = runSideBySideCommand(
      [
        "prepare",
        "--base",
        BASE_COMMIT,
        "--candidate",
        BASE_COMMIT,
        "--candidate-deep",
        setup.imageFolder,
      ],
      {
        runsDirectory: setup.runsDirectory,
        outDirectory: setup.outDirectory,
        randomSeed: () => FIXED_SEED,
      },
    );
    expect(output.errorText).toBe("");
    expect(output.exitCode).toBe(0);
    const key = readKey(setup.outDirectory);
    expect(key.candidate).toBe(`${BASE_COMMIT} deep mode`);
    for (const page of key.pages) {
      const text = readFileSync(
        join(setup.outDirectory, "pages", `page-${page.page}.md`),
        "utf8",
      );
      const critA = text.split("## Crit A")[1]?.split("## Crit B")[0] ?? "";
      expect(critA).toContain(page.a === "base" ? "Single crit" : "Deep crit");
    }
  });

  it("with --candidate-go-further reads the candidate's crits with the section joined in", () => {
    const setup = setUp(2);
    writeBothSides(setup.runsDirectory, setup.imageBytes);
    const goFurtherCommit = "3333333ccccccccccccccccccccccccccccccccc";
    const goFurtherDirectory = join(setup.root, "go-further");
    mkdirSync(join(goFurtherDirectory, goFurtherCommit), { recursive: true });
    setup.imageBytes.forEach((bytes, index) => {
      const key = goFurtherKey({
        critCommit: CANDIDATE_COMMIT,
        critKey: sha256(bytes),
        critRun: 1,
        crit: `Candidate crit of ${bytes}.`,
        imagePath: join(setup.imageFolder, `page-${index + 1}.png`),
      });
      writeFileSync(
        join(goFurtherDirectory, goFurtherCommit, `${key}.md`),
        `Joined crit of ${bytes}, from ${goFurtherCommit}.`,
      );
      writeFileSync(
        join(goFurtherDirectory, goFurtherCommit, `${key}.json`),
        JSON.stringify({ section: "**Where it could go further.** x" }),
      );
    });
    const output = runSideBySideCommand(
      [
        "prepare",
        "--base",
        BASE_COMMIT,
        "--candidate",
        CANDIDATE_COMMIT,
        "--candidate-go-further",
        goFurtherCommit,
        "--go-further-dir",
        goFurtherDirectory,
        setup.imageFolder,
      ],
      {
        runsDirectory: setup.runsDirectory,
        outDirectory: setup.outDirectory,
        randomSeed: () => FIXED_SEED,
      },
    );
    expect(output.errorText).toBe("");
    expect(output.exitCode).toBe(0);
    const key = readKey(setup.outDirectory);
    expect(key.candidate).toBe(
      `${CANDIDATE_COMMIT} with go-further ${goFurtherCommit}`,
    );
    for (const page of key.pages) {
      const text = readFileSync(
        join(setup.outDirectory, "pages", `page-${page.page}.md`),
        "utf8",
      );
      expect(text).toContain("Joined crit of");
      expect(text).not.toContain("Candidate crit of");
      expect(text).not.toContain(goFurtherCommit.slice(0, 7));
    }
    // A page with no joined crit counts as missing on the candidate side.
    const missingOutput = runSideBySideCommand(
      [
        "prepare",
        "--base",
        BASE_COMMIT,
        "--candidate",
        CANDIDATE_COMMIT,
        "--candidate-go-further",
        "4444444ddddddddddddddddddddddddddddddddd",
        "--go-further-dir",
        goFurtherDirectory,
        "--out",
        join(setup.root, "out-2"),
        setup.imageFolder,
      ],
      {
        runsDirectory: setup.runsDirectory,
        outDirectory: setup.outDirectory,
        randomSeed: () => FIXED_SEED,
      },
    );
    expect(missingOutput.exitCode).toBe(1);
    expect(missingOutput.errorText).toContain("no crit from candidate");
  });

  it("writes pages and picks.txt that name neither commit, and a key.json that names both", () => {
    const setup = setUp(2);
    const baseCrit = [
      `The base crit. Skill commit ${BASE_COMMIT} and ${CANDIDATE_COMMIT.toUpperCase()}.`,
      "Read plugin/skills/design-critic/references/checklist.md.",
      `Folder ${join(setup.runsDirectory, BASE_COMMIT)}.`,
    ].join("\n");
    const candidateCrit = [
      `The candidate crit. Short ${BASE_COMMIT.slice(0, 7)} and ${CANDIDATE_COMMIT.slice(0, 9)}.`,
      "Read /Users/x/github/crit-xyz/plugin/skills/design-critic/agents/critic.md first.",
    ].join("\n");
    for (const bytes of setup.imageBytes) {
      writeRun(setup.runsDirectory, BASE_COMMIT, bytes, baseCrit);
      writeRun(setup.runsDirectory, CANDIDATE_COMMIT, bytes, candidateCrit);
    }
    const output = prepare(setup);
    expect(output.errorText).toBe("");
    expect(output.exitCode).toBe(0);
    const pageNames = readdirSync(join(setup.outDirectory, "pages"));
    expect(pageNames).toEqual(["page-01.md", "page-02.md"]);
    const written = [
      ...pageNames.map((name) =>
        readFileSync(join(setup.outDirectory, "pages", name), "utf8"),
      ),
      readFileSync(join(setup.outDirectory, "picks.txt"), "utf8"),
    ];
    for (const text of written) {
      const lowerText = text.toLowerCase();
      for (const commit of [BASE_COMMIT, CANDIDATE_COMMIT]) {
        expect(lowerText).not.toContain(commit);
        expect(lowerText).not.toContain(commit.slice(0, 7));
      }
      expect(text).not.toContain("plugin/skills/design-critic");
      expect(text).not.toContain(setup.runsDirectory);
      expect(text).not.toContain("crit-xyz");
    }
    expect(written[0]).toContain("[removed]");
    expect(written[0]).toContain("The base crit.");
    expect(written[0]).toContain("The candidate crit.");
    expect(written[0]).toContain("## Crit A");
    expect(written[0]).toContain("## Crit B");
    expect(written[0]).toContain(join(setup.imageFolder, "page-1.png"));
    const key = readKey(setup.outDirectory);
    expect(key.base).toBe(BASE_COMMIT);
    expect(key.candidate).toBe(CANDIDATE_COMMIT);
    expect(key.seed).toBe(FIXED_SEED.toString("hex"));
    expect(written[2]).toContain("01 ?\n02 ?\n");
  });

  it("puts each crit under the letter that key.json records", () => {
    const setup = setUp(10);
    writeBothSides(setup.runsDirectory, setup.imageBytes);
    expect(prepare(setup).exitCode).toBe(0);
    const key = readKey(setup.outDirectory);
    for (const page of key.pages) {
      const text = readFileSync(
        join(setup.outDirectory, "pages", `page-${page.page}.md`),
        "utf8",
      );
      const critA = text.split("## Crit A")[1]?.split("## Crit B")[0] ?? "";
      const expectedWord = page.a === "base" ? "Base crit" : "Candidate crit";
      expect(critA).toContain(expectedWord);
    }
  });

  it("gives the same order for the same seed, and both orders over 10 pages", () => {
    const setup = setUp(10);
    const orders = new Map<string, boolean>();
    for (const bytes of setup.imageBytes) {
      const imageSha256 = sha256(bytes);
      const first = isCandidateFirst(FIXED_SEED, imageSha256);
      expect(isCandidateFirst(Buffer.from(FIXED_SEED), imageSha256)).toBe(
        first,
      );
      orders.set(imageSha256, first);
    }
    expect([...orders.values()]).toContain(true);
    expect([...orders.values()]).toContain(false);
    writeBothSides(setup.runsDirectory, setup.imageBytes);
    expect(prepare(setup).exitCode).toBe(0);
    const key = readKey(setup.outDirectory);
    for (const page of key.pages) {
      expect(page.a === "candidate").toBe(orders.get(page.image_sha256));
    }
  });

  it("exits 1, names the pages that lack a crit on one side, and writes nothing", () => {
    const setup = setUp(3);
    writeBothSides(setup.runsDirectory, setup.imageBytes.slice(0, 2));
    writeRun(setup.runsDirectory, BASE_COMMIT, "fake image 3", "Base only.");
    const output = prepare(setup);
    expect(output.exitCode).toBe(1);
    expect(output.errorText).toContain("page 03");
    expect(output.errorText).toContain(
      `no crit from candidate ${CANDIDATE_COMMIT}`,
    );
    expect(output.errorText).not.toContain("page 01");
    expect(output.errorText).toContain("run-critic.ts run");
    expect(output.errorText).toContain("with a different --note, are not used");
    expect(() => readdirSync(setup.outDirectory)).toThrow();
  });

  it("accepts the path of a run folder as a side", () => {
    const setup = setUp(2);
    writeBothSides(setup.runsDirectory, setup.imageBytes);
    const output = runSideBySideCommand(
      [
        "prepare",
        "--base",
        join(setup.runsDirectory, BASE_COMMIT),
        "--candidate",
        join(setup.runsDirectory, CANDIDATE_COMMIT),
        setup.imageFolder,
      ],
      {
        runsDirectory: join(setup.root, "no-runs-here"),
        outDirectory: setup.outDirectory,
        randomSeed: () => FIXED_SEED,
      },
    );
    expect(output.errorText).toBe("");
    expect(output.exitCode).toBe(0);
    expect(readKey(setup.outDirectory).candidate).toBe(CANDIDATE_COMMIT);
  });

  it("refuses an out folder that exists and is not empty, and leaves key.json unchanged", () => {
    const setup = setUp(2);
    writeBothSides(setup.runsDirectory, setup.imageBytes);
    expect(prepare(setup).exitCode).toBe(0);
    const keyBefore = readFileSync(
      join(setup.outDirectory, "key.json"),
      "utf8",
    );
    const second = prepare(setup);
    expect(second.exitCode).toBe(2);
    expect(second.errorText).toContain("is not empty");
    expect(readFileSync(join(setup.outDirectory, "key.json"), "utf8")).toBe(
      keyBefore,
    );
  });
});

/** A handwritten key with known orders: page 01 base is A, 02 candidate is A, 03 base is A. */
const HANDWRITTEN_KEY: KeyFile = {
  key_file_version: 1,
  seed: "00",
  base: BASE_COMMIT,
  candidate: CANDIDATE_COMMIT,
  pages: [
    {
      page: "01",
      image_sha256: "x1",
      image_path: "/a.png",
      a: "base",
      b: "candidate",
    },
    {
      page: "02",
      image_sha256: "x2",
      image_path: "/b.png",
      a: "candidate",
      b: "base",
    },
    {
      page: "03",
      image_sha256: "x3",
      image_path: "/c.png",
      a: "base",
      b: "candidate",
    },
    {
      page: "04",
      image_sha256: "x4",
      image_path: "/d.png",
      a: "candidate",
      b: "base",
    },
  ],
};

describe("hideSideNames", () => {
  it("keeps a side value that is a bare word and removes one that is a path", () => {
    const setup = setUp(1);
    writeRun(
      setup.runsDirectory,
      "main",
      "fake image 1",
      "The main point is spacing.",
    );
    writeRun(
      setup.runsDirectory,
      CANDIDATE_COMMIT,
      "fake image 1",
      "Another crit.",
    );
    const output = prepare(setup, "main");
    expect(output.errorText).toBe("");
    const text = readFileSync(
      join(setup.outDirectory, "pages", "page-01.md"),
      "utf8",
    );
    expect(text).toContain("The main point is spacing.");
  });
});

describe("record", () => {
  it("maps each pick through the key and counts the wins", () => {
    const picks = "# comment\n01 A\n\n02 a\n03 B\n4 none\n";
    const output = recordPicks(HANDWRITTEN_KEY, picks);
    expect(output.errorText).toBe("");
    expect(output.exitCode).toBe(0);
    const lines = output.text.split("\n");
    expect(lines).toContain("01    A     base");
    expect(lines).toContain("02    A     candidate");
    expect(lines).toContain("03    B     candidate");
    expect(lines).toContain("04    none  no difference");
    // Collapse the table padding, so the check reads the cells and not the spaces.
    const cells = lines.map((line) => line.replace(/\s+/g, " "));
    expect(cells).toContain(`base ${BASE_COMMIT} 1`);
    expect(cells).toContain(`candidate ${CANDIDATE_COMMIT} 2`);
    expect(cells).toContain("no difference 1");
  });

  it("lists every problem: a missing page, a duplicate, a ? left, a bad value, and an unknown page", () => {
    const picks = "01 A\n01 B\n02 ?\n03 maybe\n09 A\n";
    const output = recordPicks(HANDWRITTEN_KEY, picks);
    expect(output.exitCode).toBe(1);
    expect(output.text).toBe("");
    expect(output.errorText).toContain("page 01 is picked twice");
    expect(output.errorText).toContain("page 02 still has ?");
    expect(output.errorText).toContain('"03 maybe" is not');
    expect(output.errorText).toContain("page 09 is not in key.json");
    expect(output.errorText).toContain("page 03 has no pick");
    expect(output.errorText).toContain("page 04 has no pick");
    expect(output.errorText).not.toContain("page 02 has no pick");
  });

  it("reads key.json and picks.txt from the out folder through the command line", () => {
    const setup = setUp(2);
    writeBothSides(setup.runsDirectory, setup.imageBytes);
    expect(prepare(setup).exitCode).toBe(0);
    writeFileSync(join(setup.outDirectory, "picks.txt"), "01 A\n02 none\n");
    const output = runSideBySideCommand(["record"], {
      runsDirectory: setup.runsDirectory,
      outDirectory: setup.outDirectory,
      randomSeed: () => {
        throw new Error("record needs no seed");
      },
    });
    expect(output.errorText).toBe("");
    expect(output.exitCode).toBe(0);
    const firstPage = readKey(setup.outDirectory).pages[0];
    expect(output.text).toContain(`01    A     ${firstPage?.a}`);
  });
});

describe("the command line", () => {
  it("exits 0 on --help and names prepare and record", () => {
    const help = execFileSync("node", [SCRIPT_FILE, "--help"], {
      encoding: "utf8",
    });
    expect(help).toContain("prepare");
    expect(help).toContain("record");
    // The runs folder is absolute, so run-critic.ts saves there from any current folder.
    expect(help).toContain(
      `--runs-dir ${join(import.meta.dirname, "side-by-side", "runs")} IMAGE_FILES`,
    );
    expect(help).toContain("Do not open key.json");
  });
});
