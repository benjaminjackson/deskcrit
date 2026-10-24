import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";

/**
 * Runs one command with no arguments, and throws unless it exits with code 2, writes nothing to
 * stdout, and prints the usage line on stderr (FR-43, FR-59, FR-61).
 */
function expectUsageRun(command, commandArguments, workingDirectory) {
  const description = [command, ...commandArguments].join(" ");
  const result = spawnSync(command, commandArguments, {
    cwd: workingDirectory,
    encoding: "utf8",
  });
  if (result.status !== 2) {
    throw new Error(
      `${description} exited with ${result.status}, expected 2\n${result.stderr}`,
    );
  }
  if (result.stdout !== "") {
    throw new Error(`${description} printed ${JSON.stringify(result.stdout)}`);
  }
  if (!result.stderr.includes("usage: crit report")) {
    throw new Error(
      `${description} stderr has no usage line\n${result.stderr}`,
    );
  }
  console.log(`ok: ${description}`);
}

/**
 * Runs `packs validate` on each first-party pack with TYPESAFE_API_KEY unset, and throws unless
 * each run exits 0, prints the valid line on stdout, and writes nothing to stderr (FR-49, FR-59,
 * FR-60).
 */
function expectFirstPartyPacksValidate(
  command,
  commandPrefix,
  workingDirectory,
) {
  const environment = { ...process.env };
  delete environment.TYPESAFE_API_KEY;
  for (const packName of ["basics", "layout", "typography"]) {
    const packDirectory = resolve("packs", packName);
    const commandArguments = [
      ...commandPrefix,
      "packs",
      "validate",
      packDirectory,
    ];
    const description = [command, ...commandArguments].join(" ");
    const result = spawnSync(command, commandArguments, {
      cwd: workingDirectory,
      encoding: "utf8",
      env: environment,
    });
    if (result.status !== 0) {
      throw new Error(
        `${description} exited with ${result.status}, expected 0\n${result.stderr}`,
      );
    }
    if (
      !result.stdout.includes(`pack ${packName} is valid`) ||
      result.stderr !== ""
    ) {
      throw new Error(
        `${description} printed ${JSON.stringify(result.stdout)} and ${JSON.stringify(result.stderr)}`,
      );
    }
    console.log(`ok: ${description}`);
  }
}

/**
 * Runs the bundle on a real image and a real pack with TYPESAFE_API_KEY unset. main checks the
 * key after it loads the pack, so exit code 2 with the key message proves the bundled yaml and
 * Ajv code runs (NFR-14, FR-11). The stderr check for "Dynamic require" catches the CommonJS
 * require failure that the build banner fixes.
 */
function expectPackLoadsInBundle() {
  const workingDirectory = mkdtempSync(join(tmpdir(), "deskcrit-report-"));
  try {
    mkdirSync(join(workingDirectory, "minimal"));
    copyFileSync(
      "schemas/examples/valid/minimal.yaml",
      join(workingDirectory, "minimal", "pack.yaml"),
    );
    const environment = { ...process.env };
    delete environment.TYPESAFE_API_KEY;
    const commandArguments = [
      resolve("dist/crit.js"),
      "report",
      resolve("packs/_example/fixtures/example-contrast.positive.png"),
      "--pack",
      "minimal",
      "--json",
    ];
    const description = `node ${commandArguments.join(" ")}`;
    const result = spawnSync("node", commandArguments, {
      cwd: workingDirectory,
      encoding: "utf8",
      env: environment,
    });
    if (result.status !== 2) {
      throw new Error(
        `${description} exited with ${result.status}, expected 2\n${result.stderr}`,
      );
    }
    if (result.stdout !== "") {
      throw new Error(
        `${description} printed ${JSON.stringify(result.stdout)}`,
      );
    }
    if (result.stderr.includes("Dynamic require")) {
      throw new Error(
        `${description} hit a CommonJS require\n${result.stderr}`,
      );
    }
    if (!result.stderr.includes("TYPESAFE_API_KEY")) {
      throw new Error(
        `${description} stderr does not name TYPESAFE_API_KEY\n${result.stderr}`,
      );
    }
    console.log(`ok: ${description} loads the pack and stops for the key`);
  } finally {
    // The path comes from mkdtempSync, so it is never empty and sits inside the temp folder.
    rmSync(workingDirectory, { recursive: true, force: true });
  }
}

/**
 * Returns the SHA-256 of a file's bytes as lowercase hexadecimal, the image fingerprint an answers
 * file records (FR-42, OQ-26 e).
 */
function fingerprintFile(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

/**
 * Runs the bundle offline with --answers and an environment that holds only PATH, so there is no
 * TYPESAFE_API_KEY and no other setting (FR-42, CS-21). It checks exit code 0, empty stderr, JSON
 * stdout whose model is the file's usage model, the same stdout on a second run (NFR-5), and exit
 * code 2 naming the file once one answer is deleted (FR-4).
 */
function expectOfflineRunWithAnswers() {
  const workingDirectory = mkdtempSync(join(tmpdir(), "deskcrit-answers-"));
  try {
    mkdirSync(join(workingDirectory, "minimal"));
    copyFileSync(
      "schemas/examples/valid/minimal.yaml",
      join(workingDirectory, "minimal", "pack.yaml"),
    );
    const answersFile = {
      answers_file_version: 1,
      image_sha256: fingerprintFile(
        "packs/_example/fixtures/example-contrast.positive.png",
      ),
      answers: [
        {
          type: "noul",
          question_id: "minimal/faint-body-text",
          model: "jev-recorded",
          distribution: { true: 0.9, false: 0.1 },
          confidence: null,
        },
      ],
      usage: {
        input_tokens: 100,
        cost_usd: 0.001,
        latency_ms: 0,
        model: "jev-recorded",
      },
    };
    const answersPath = join(workingDirectory, "answers.json");
    writeFileSync(answersPath, `${JSON.stringify(answersFile, null, 2)}\n`);
    const commandArguments = [
      resolve("dist/crit.js"),
      "report",
      resolve("packs/_example/fixtures/example-contrast.positive.png"),
      "--pack",
      "minimal",
      "--json",
      "--answers",
      "answers.json",
    ];
    const description = `env -i PATH=... node ${commandArguments.join(" ")}`;
    const runOffline = () =>
      spawnSync("node", commandArguments, {
        cwd: workingDirectory,
        encoding: "utf8",
        env: { PATH: process.env.PATH },
      });
    const first = runOffline();
    if (first.status !== 0 || first.stderr !== "") {
      throw new Error(
        `${description} exited with ${first.status}, expected 0 and no stderr\n${first.stderr}`,
      );
    }
    const report = JSON.parse(first.stdout);
    if (report.model !== answersFile.usage.model) {
      throw new Error(
        `${description} gave model ${report.model}, expected ${answersFile.usage.model}`,
      );
    }
    const second = runOffline();
    if (second.status !== 0 || second.stdout !== first.stdout) {
      throw new Error(`${description} gave different output on a second run`);
    }
    console.log(`ok: ${description} runs offline and repeats its output`);

    answersFile.answers = [];
    writeFileSync(answersPath, `${JSON.stringify(answersFile, null, 2)}\n`);
    const broken = runOffline();
    if (broken.status !== 2 || broken.stdout !== "") {
      throw new Error(
        `${description} with no answers exited with ${broken.status}, expected 2 and no stdout`,
      );
    }
    if (!broken.stderr.includes("answers file answers.json")) {
      throw new Error(
        `${description} with no answers does not name the file\n${broken.stderr}`,
      );
    }
    console.log(
      `ok: ${description} with an answer deleted exits 2 and names the file`,
    );
  } finally {
    // The path comes from mkdtempSync, so it is never empty and sits inside the temp folder.
    rmSync(workingDirectory, { recursive: true, force: true });
  }
}

/**
 * Checks that the library bundle does not hold the TypeSafe SDK, because the entry point does not
 * export the real adapter, so a caller who passes the stub or another backend gets no SDK code
 * (FR-64, AC-8).
 */
function expectLibraryLeavesOutSdk() {
  const librarySource = readFileSync("dist/index.js", "utf8");
  if (librarySource.includes("@typesafe-ai/sdk")) {
    throw new Error("dist/index.js holds the TypeSafe SDK");
  }
  console.log("ok: dist/index.js does not hold the TypeSafe SDK");
}

/**
 * Imports dist/index.js in a new node process whose environment holds only PATH, and checks that
 * the import writes nothing to stdout or stderr (AC-7, CS-6).
 */
function expectLibraryImportIsQuiet() {
  const libraryUrl = pathToFileURL(resolve("dist/index.js")).href;
  const result = spawnSync(
    "node",
    [
      "--input-type=module",
      "-e",
      `await import(${JSON.stringify(libraryUrl)});`,
    ],
    { encoding: "utf8", env: { PATH: process.env.PATH } },
  );
  if (result.status !== 0 || result.stdout !== "" || result.stderr !== "") {
    throw new Error(
      `importing dist/index.js exited with ${result.status} and wrote output\n${result.stdout}${result.stderr}`,
    );
  }
  console.log("ok: importing dist/index.js writes nothing");
}

/**
 * Runs the stages from the built library on one image, two packs, a context, and a facts file,
 * with the stub adapter, and writes the stub's answers to an answers file. Then it runs the built
 * CLI with --json and --answers on the same inputs, in a folder with only PATH in the environment.
 * The two reports must be deeply equal and both must fit schemas/report.schema.json (FR-65,
 * NFR-5, EV-2).
 */
async function expectLibraryMatchesCli() {
  const library = await import(pathToFileURL(resolve("dist/index.js")).href);
  const workingDirectory = mkdtempSync(join(tmpdir(), "deskcrit-parity-"));
  try {
    const packSources = [
      { label: "minimal", source: "schemas/examples/valid/minimal.yaml" },
      {
        label: "accessibility",
        source: "schemas/examples/valid/full-noul.yaml",
      },
    ];
    const packs = [];
    for (const pack of packSources) {
      mkdirSync(join(workingDirectory, pack.label));
      copyFileSync(
        pack.source,
        join(workingDirectory, pack.label, "pack.yaml"),
      );
      packs.push(
        library.loadPack(readFileSync(pack.source, "utf8"), pack.label),
      );
    }
    const imageName = "page.png";
    copyFileSync(
      "packs/_example/fixtures/example-contrast.positive.png",
      join(workingDirectory, imageName),
    );
    const context = { purpose: "Sign up for the newsletter", platform: "web" };
    const facts = { viewport_width: 1280 };
    writeFileSync(join(workingDirectory, "facts.json"), JSON.stringify(facts));

    const imageBytes = new Uint8Array(
      readFileSync(join(workingDirectory, imageName)),
    );
    const prepared = await library.prepare(imageBytes);
    const built = library.build({ packs, image: prepared, context, facts });
    const asked = await library.ask(
      built.state,
      built.questions,
      library.createStubAdapter(),
    );
    const answersFile = {
      answers_file_version: 1,
      image_sha256: fingerprintFile(join(workingDirectory, imageName)),
      answers: asked.answers,
      usage: asked.usage,
    };
    writeFileSync(
      join(workingDirectory, "answers.json"),
      `${JSON.stringify(answersFile, null, 2)}\n`,
    );
    const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
    const libraryReport = library.compose({
      packs,
      built,
      prepared,
      asked,
      run: {
        tool: { name: "deskcrit", version: packageJson.version },
        imagePath: imageName,
        context,
      },
    });

    const commandArguments = [
      resolve("dist/crit.js"),
      "report",
      imageName,
      "--pack",
      "minimal",
      "--pack",
      "accessibility",
      "--context",
      `purpose=${context.purpose}`,
      "--context",
      `platform=${context.platform}`,
      "--facts",
      "facts.json",
      "--json",
      "--answers",
      "answers.json",
    ];
    const result = spawnSync("node", commandArguments, {
      cwd: workingDirectory,
      encoding: "utf8",
      env: { PATH: process.env.PATH },
    });
    if (result.status !== 0 || result.stderr !== "") {
      throw new Error(
        `the CLI parity run exited with ${result.status}, expected 0 and no stderr\n${result.stderr}`,
      );
    }
    const cliReport = JSON.parse(result.stdout);
    // Round-trip the library report through JSON, as the CLI output is, so that both sides
    // compare as plain JSON values.
    const libraryReportJson = JSON.parse(JSON.stringify(libraryReport));
    if (libraryReportJson.findings.length === 0) {
      throw new Error(
        "the parity run made no findings, so it compares nothing",
      );
    }
    assert.deepStrictEqual(cliReport, libraryReportJson);

    const schema = JSON.parse(
      readFileSync("schemas/report.schema.json", "utf8"),
    );
    const validate = new Ajv2020({ allErrors: true, strict: true }).compile(
      schema,
    );
    for (const [name, report] of [
      ["library", libraryReportJson],
      ["CLI", cliReport],
    ]) {
      if (!validate(report)) {
        throw new Error(
          `the ${name} report does not fit the report schema\n${JSON.stringify(validate.errors, null, 2)}`,
        );
      }
    }
    console.log(
      "ok: the library and the CLI give the same report, and both fit the report schema",
    );
  } finally {
    // The path comes from mkdtempSync, so it is never empty and sits inside the temp folder.
    rmSync(workingDirectory, { recursive: true, force: true });
  }
}

/**
 * Type-checks scripts/library-consumer.ts, which imports from "deskcrit" by the package name, so
 * tsc resolves it through package.json "exports" to the built declarations (FR-63, US-13). It
 * runs with strict and nodenext and without skipLibCheck, so the declarations are checked too.
 * --ignoreConfig makes tsc use only these flags and not tsconfig.json.
 */
function expectConsumerTypeChecks() {
  const result = spawnSync(
    "npx",
    [
      "--no-install",
      "tsc",
      "--ignoreConfig",
      "--noEmit",
      "--strict",
      "--module",
      "nodenext",
      "--moduleResolution",
      "nodenext",
      "--target",
      "es2024",
      "--lib",
      "es2024",
      "--types",
      "node",
      "scripts/library-consumer.ts",
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(
      `tsc rejected scripts/library-consumer.ts\n${result.stdout}${result.stderr}`,
    );
  }
  console.log('ok: a consumer that imports from "deskcrit" passes tsc');
}

/**
 * Checks the built bundle the way a user meets it: dist/ holds one file, node
 * runs it, and npx runs the packed tarball under both bin names with no
 * separate install step (FR-59, NFR-2).
 */
async function runSmokeChecks() {
  // The CLI is still one file, dist/crit.js. The library adds dist/index.js and dist/types/, and
  // no other file, so the CLI bundle has no chunks next to it (NFR-2, FR-63).
  const distFiles = readdirSync("dist").sort();
  const expectedDistFiles = ["crit.js", "index.js", "types"];
  if (distFiles.join(",") !== expectedDistFiles.join(",")) {
    throw new Error(
      `dist/ should hold only ${expectedDistFiles}, found: ${distFiles}`,
    );
  }
  console.log(`ok: dist/ holds only ${expectedDistFiles.join(", ")}`);

  expectUsageRun("node", ["dist/crit.js"], process.cwd());
  expectPackLoadsInBundle();
  expectFirstPartyPacksValidate("node", ["dist/crit.js"], process.cwd());
  expectOfflineRunWithAnswers();
  expectLibraryLeavesOutSdk();
  expectLibraryImportIsQuiet();
  await expectLibraryMatchesCli();
  expectConsumerTypeChecks();

  const packDirectory = mkdtempSync(join(tmpdir(), "deskcrit-pack-"));
  const emptyDirectory = mkdtempSync(join(tmpdir(), "deskcrit-npx-"));
  try {
    const packResult = spawnSync(
      "npm",
      ["pack", "--pack-destination", packDirectory],
      { encoding: "utf8" },
    );
    if (packResult.status !== 0) {
      throw new Error(`npm pack failed\n${packResult.stderr}`);
    }
    const tarballName = readdirSync(packDirectory)[0];
    if (tarballName === undefined) {
      throw new Error("npm pack wrote no tarball");
    }
    const tarballPath = resolve(packDirectory, tarballName);
    for (const binName of ["crit", "deskcrit"]) {
      expectUsageRun(
        "npx",
        ["--yes", "--package", tarballPath, binName],
        emptyDirectory,
      );
      expectFirstPartyPacksValidate(
        "npx",
        ["--yes", "--package", tarballPath, binName],
        emptyDirectory,
      );
    }
  } finally {
    // Both paths come from mkdtempSync, so they are never empty and always
    // sit inside the system temp folder.
    rmSync(packDirectory, { recursive: true, force: true });
    rmSync(emptyDirectory, { recursive: true, force: true });
  }
}

await runSmokeChecks();
