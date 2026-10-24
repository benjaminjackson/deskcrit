# deskcrit

`deskcrit` is a command-line critic, invoked as `crit`. It takes a picture of a design and a set of YAML criteria packs, turns each criterion into one typed question for TypeSafe's Jev model, asks all of them in one request, and reports what looks wrong, how sure the model is, where on the image, which source says so, and what usually fixes it. It has three modes. `report` judges one design. `compare` judges a before and an after and says whether each criterion got better, worse, or stayed the same. `gate` passes or fails against thresholds and sets the exit code. The work runs in four stages: prepare the image, build the questions from the packs, ask TypeSafe, and compose the findings into output. The primary user of the output is a coding agent, so the JSON is the main product and the readable report is secondary.

## Where things are

- `BRIEF.md` is the pitch: what the tool is, who it is for, the principles, the risks, and the milestones.
- `GUIDELINES.md` is the catalog of guidelines that the seven first-party packs encode. Each entry has a rule, a source, and a note on how it becomes a question.
- `docs/CONSTITUTION.md` is the coding standards. Read it before you write or review code, and cite its rules by ID (CS-n).
- `docs/PRD.md` is the behavioral specification with stable IDs. It is the source of truth for what to build. If `BRIEF.md` and `docs/PRD.md` disagree, `docs/PRD.md` wins and the disagreement is a defect to report.
- `README.md` is a two-line summary. Do not treat it as a specification.

Current state: the package scaffold exists. It has the build, lint, type check, and test tools, the four stages, and the `crit report` command. The first milestone is the spike described in `BRIEF.md` under Milestones: one screenshot, twenty hand-written questions, the danger-zone header, and a spreadsheet comparing Jev's answers with one designer's answers (PRD M-1). That spike decided whether the project continues. Its result is recorded in `docs/PRD.md` M-1: continue, decided by Benjamin Jackson on 2026-10-24, so M-2 work may start under the conditions listed there.

## Layout

These are the paths that exist today. `docs/CONSTITUTION.md` CS-5 holds the full planned folder layout, CS-1 the compiler flags, CS-2 the tools and lint rules, and CS-17 the exit code rule. PRD NFR-1 sets the supported Node releases. Add a path here in the pull request that creates it, because an agent reads this list to find its way and a missing path sends it to search; drop this rule if the list grows past what a reader can scan.

- `package.json` declares the `deskcrit` and `crit` commands, the npm scripts, and the dev tool versions.
- `package-lock.json` pins every installed package for `npm ci`.
- `.npmrc` makes `npm install` save exact versions (CS-3).
- `tsconfig.json` holds the TypeScript settings for the type check.
- `biome.json` holds the lint and format settings.
- `vitest.config.ts` tells Vitest which unit tests to run.
- `tsconfig.lib.json` holds the TypeScript settings that write the library type declarations to `dist/types/`.
- `scripts/build.mjs` bundles the CLI, with the text of each `packs/*/pack.yaml`, into `dist/crit.js` and the library into `dist/index.js`, and writes the declarations to `dist/types/`. All of `dist/` is built and not committed.
- `scripts/smoke.mjs` runs the built bundle and the packed tarball under both command names. It runs `crit packs validate` on the basics, layout, and typography packs through the bundle and through the tarball under both command names. It also checks the built library: it runs the library stages and `crit report --json --answers` on the same inputs and compares the two reports (FR-65), and it type-checks `scripts/library-consumer.ts`, which imports from `deskcrit` by the package name (FR-63).
- `src/index.ts` is the package entry point. It only re-exports the stage functions `prepare`, `build`, `ask`, and `compose`, the stub adapter, `loadPack`, `CouldNotRunError`, and the stage types (FR-63, FR-64). `src/index.test.ts` checks it.
- `.github/workflows/ci.yml` runs `npm run ci` on each Node release in the CI matrix.
- `src/cli/main.ts` holds `main`, the one place that writes stdout and stderr and sets the exit code (CS-17).
- `src/cli/bin.ts` is the bundle entry file.
- `src/cli/args.ts` parses the command line with Node's `parseArgs`. `parseCommand` picks `crit report` or `crit packs validate`; `crit packs test` is still an unknown command.
- `src/cli/crit-yaml.ts` parses and checks the text of `.crit.yaml`.
- `src/cli/read-inputs.ts` does every file and environment read for `crit report`: the image, `.crit.yaml`, the pack directories, the facts file, and `TYPESAFE_API_KEY`.
- `src/cli/bundled-pack-texts.ts` holds `BUNDLED_PACK_TEXTS`, the name and `pack.yaml` text of each first-party pack. From source and under Vitest it reads `packs/` from disk; the CLI build in `scripts/build.mjs` replaces the whole file with the texts as strings, so `dist/crit.js` reads no pack file (FR-53). `src/cli/bundled-packs.ts` holds `listBundledPackSources` and `loadBundledPacks`, which parse the bundled packs that `.crit.yaml` names, or every bundled pack, with `loadPack` (FR-11, FR-51). `src/cli/bundled-packs.test.ts` checks it and checks what the built bundle holds.
- `src/cli/packs-validate-command.ts` holds `runPacksValidate`, the `crit packs validate <dir>` command (FR-49). It reads the pack directory itself, lists its files, and passes them to `src/packs/validate-pack.ts`. It never reads `TYPESAFE_API_KEY`.
- `src/cli/report-command.ts` holds `runReport`, which calls prepare, build, ask, and compose from `src/index.ts` and then one renderer, and imports no stage file (FR-65).
- `src/cli/render-json.ts` holds `renderReportJson` and `src/cli/render-text.ts` holds `renderReportText`, the pure functions that turn the report document into the `--json` output and the readable report (FR-31, FR-32, FR-33). `src/cli/prd-example-report.fixture.ts` is the PRD section 8.1 example that their tests share, and `src/cli/no-io.test.ts` checks that both renderers do no I/O.
- `src/shared/could-not-run-error.ts` holds `CouldNotRunError`.
- `src/prepare/prepare.ts` holds `prepareImage`, which checks, turns upright, strips, resizes, and pads one image, records its scale factor, and refuses an image it would shrink below half size.
- `src/shared/state.ts`, `src/shared/question.ts`, `src/shared/answer.ts`, and `src/shared/usage.ts` hold the State, Question, Answer, and Usage types that pass between the stages, and nothing else defines them.
- `src/shared/answers-mismatch.ts` holds `findAnswersMismatch`, the rule that a list of answers fits the questions build made. Ask and the `--answers` path both use it.
- `src/cli/answers-file.ts` holds the answers file that `--save-answers` writes and `--answers` reads (FR-42, OQ-26): `readAnswersFile`, the one function that checks its shape, `fingerprintImage` and `checkRecordedImage`, which refuse answers saved from another image before prepare runs, `checkRecordedAnswers`, and `writeAnswersFile`. It does no I/O; `src/cli/read-inputs.ts` reads the file and `src/cli/main.ts` writes it.
- `src/shared/pack.ts` holds the Pack, Criterion, PackQuestion, Predicate, and PackProblem types that the pack loader returns and build and compose read.
- `src/packs/load-pack.ts` holds `checkPack` and `loadPack`, which parse one pack's YAML text and check it against `schemas/pack.schema.json` and the rules the schema cannot express. It reads no files. `checkPack` names the phase that failed: `yaml`, `schema`, or `rules`.
- `src/packs/validate-pack.ts` holds `validatePackText` and `checkPackFixtures`, the pure checks of `crit packs validate`: the loader, then each criterion's positive and negative fixtures against the list of files in the pack directory (FR-49). `src/packs/no-io.test.ts` checks that `src/packs/` does no I/O.
- `src/build/build.ts` holds `buildQuestions`, which skips criteria by platform and facts, makes one question per criterion plus a Box question when `locate` is true, and builds the state with the image once. `src/build/types.ts` holds its input and output types. `src/build/no-io.test.ts` checks that build does no I/O and imports only `src/shared/`.
- `src/compose/compose.ts` holds `compose`, which turns the packs, the questions, the prepared-image record, and the answers into one report document. `src/compose/report.ts` holds the `Report` type, the wire shape of PRD section 8.1. `src/compose/verdict.ts` holds the verdict rule, `src/compose/map-region-to-original.ts` maps a Box region back to pixels of the original image, and `src/compose/sort-findings.ts` sorts findings in the FR-28 order. `src/compose/no-io.test.ts` checks that compose does no I/O and imports only `src/shared/`.
- `src/ask/adapter.ts` holds the `TypeSafeAdapter` type from FR-20, `src/ask/ask.ts` holds `ask`, and `src/ask/stub.ts` holds the stub adapter. `src/ask/no-io.test.ts` checks that no file in `src/ask/` outside `src/ask/typesafe/` imports the SDK or does I/O.
- `src/ask/typesafe/request.ts` builds the one TypeSafe request for an image and checks the response that comes back. `src/ask/typesafe/adapter.ts` holds `createTypeSafeAdapter`, the one real adapter, which sends that request with the SDK and turns SDK errors into `CouldNotRunError`. `src/ask/typesafe/no-io.test.ts` checks that only this folder imports the SDK.
- `schemas/pack.schema.json` is the pack JSON Schema (JSON Schema 2020-12), the checked form of the pack schema table in PRD section 7.8.
- `schemas/pack.schema.test.ts` checks the schema against the example packs in `schemas/examples/valid/` and `schemas/examples/invalid/`. Each invalid example breaks one rule, and its `# expect:` line names the error path and keyword.
- `schemas/report.schema.json` is the JSON Schema (draft 2020-12) for the document that `crit report --json` writes (PRD section 8.1). It is part of the slow layer.
- `src/schemas/report.schema.test.ts` is the disposable unit test that checks that schema with Ajv.
- `evals/golden.test.ts` is the EV-1 golden-output test: it runs `dist/crit.js` on each case in `evals/golden/cases/` and compares stdout, stderr, and the exit code with the stored files.
- `evals/schema.test.ts` is the EV-2 test: it validates the stdout of each JSON golden case against `schemas/report.schema.json`.
- `evals/fixture-declarations.test.ts` is the durable check of FR-54 rules 2 and 3: it runs the pure check from `packs/_renderer/defect.ts` on every pack's committed `fixtures/rendered.json` and `.defect.json` files, with no browser. `evals/guideline-ranges.test.ts` checks that each `Defect range` line in GUIDELINES.md matches its `.defect.json`.
- `evals/support/run-crit.ts` runs the bundle as a child process with only PATH in its environment and reads the golden cases.
- `evals/support/run-crit-bundle.ts` holds `runCritBundle`, which runs `dist/crit.js` as a child process in a given working directory and environment. The agreement harness and the adversarial check both use it.
- `evals/support/pinned-model-and-schema.ts` holds `readPinnedModel`, which reads the model that a folder's `.crit.yaml` pins, and `compileReportValidator`, which compiles `schemas/report.schema.json`. The agreement harness and the wobble check both use them.
- `evals/support/write-expected.mjs` rewrites the expected files of the golden cases; a person runs it by hand and reviews the diff, and an agent never runs it to make a test pass.
- `evals/golden/` holds the golden inputs: `images/`, `facts/`, `packs/` (packs written for the tests: `golden` and `needs-facts` for `crit report`, and `validate-ok`, `validate-errors`, and `validate-schema` for `crit packs validate`), `answers/page.answers.json` (recorded once with `--save-answers`), and `cases/<name>/` with `case.json` and the `expected.*` files.
- `spike/` holds the M-1 spike inputs: the prepared screenshot, the twenty questions, the page purpose, and its attribution.
- `spike/answer-sheet/` holds the disposable M-1 script that writes and checks `spike/human_answers.csv`, the sheet where Benjamin Jackson answers the twenty questions before he sees any Jev answer. It has its own `package.json`. Run `npm ci --prefix spike/answer-sheet` once first, then `node spike/answer-sheet/sheet.ts blank` or `check`.
- `spike/run.ts`, `spike/request.ts`, `spike/request.test.ts`, `spike/package.json`, and `spike/results/` are the disposable M-1 runner that asks Jev the twenty questions and keeps every run; `spike/` has its own dependencies, so run `npm --prefix spike ci` first.
- `spike/compare.ts` joins `spike/human_answers.csv` with the four results files (slice and whole page, with and without purpose) and writes `spike/comparison.csv`, `spike/agreement_summary.csv`, `spike/run_costs.csv`, and `spike/cost_summary.csv`; run `node spike/compare.ts` after `npm --prefix spike ci`, and do not edit the CSV files by hand.
- `spike/overview.ts` is the disposable crit-zs9 runner. It writes `spike/page-overview.png` (the whole page scaled to 410 x 1248 px with a red outline where `spike/slice.png` sits), asks the twenty questions about the slice alone and the slice with that overview, and keeps both runs in `spike/results/overview/`. `node spike/compare.ts --overview` compares them with `spike/human_answers.csv` by the same rules and writes the four `spike/overview_*.csv` files.
- `spike/text-size/` is the disposable crit-cy8.37 spike. `pages.ts` holds five throwaway page pairs (body text 11 px on the defect side, 16 to 18 px on the clean side, the same menu and button text on both). `run.ts render` renders them at 1280 x 800 px with the packs renderer's Playwright into `images/` and crops the paragraphs, `run.ts live` asks the three wordings in `questions.json` (committed before any answer) once per image and keeps each response in `results/`, and `run.ts summary` writes `summary.csv`. Run `npm --prefix spike ci` and `npm --prefix packs ci` first.
- `spike/prescreen/art-direction/` is the disposable crit-q25.17 pre-screen of the art-direction pack candidates, laid out like `spike/prescreen/ux/`. `photos/` holds the CC0 photos the pages use, with their sources in `ATTRIBUTION.md`. It is not EV-4 evidence.
- `spike/prescreen/dataviz/` is the disposable crit-q25.17 pre-screen of the dataviz pack candidates, laid out like `spike/prescreen/ux/`, with its charts as hand-written inline SVG in `pages.ts`. It is not EV-4 evidence.
- `spike/prescreen/color/` is the disposable crit-q25.17 pre-screen of the color pack candidates, laid out like `spike/prescreen/ux/`: `questions.json`, `pages.ts`, `run.ts render|live|summary`, `images/`, `results/`, `summary.csv`, and `verdicts.csv`. It is not EV-4 evidence.
- `spike/prescreen/accessibility/` is the disposable crit-q25.17 pre-screen of the accessibility pack candidates, laid out like `spike/prescreen/ux/`: `questions.json`, `pages.ts`, `run.ts render|live|summary`, `images/`, `results/`, and `summary.csv`. It is not EV-4 evidence.
- `spike/prescreen/ux/` is the disposable crit-q25.17 pre-screen of the ux pack candidates. `questions.json` (committed before any answer) holds one question per candidate, `pages.ts` two throwaway page pairs per candidate, and `run.ts render|live|summary` renders them, asks Jev once per image into `results/`, and writes `summary.csv` and `verdicts.csv`. It is not EV-4 evidence.
- `evals/wobble/` is the EV-6 wobble check. `run-wobble.ts` runs `dist/crit.js report --json` 5 times as a child process on `slice.png` with the 17 kept M-1 spike questions in `pack.yaml`, with this folder as its working directory, so crit reads `evals/wobble/.crit.yaml`, which pins only the model. It prints how far each question's option probabilities and reported confidence moved between runs, and exits 1 when the default `min_confidence` of 0.5 (OQ-10) does not sit above the largest confidence movement. `movement.ts` holds that arithmetic as pure functions. Run `npm run eval:wobble` once each time the pinned model changes. It asks TypeSafe 5 times, refuses to start without `TYPESAFE_API_KEY`, and `npm run ci` never runs it. `ATTRIBUTION.md` records where `slice.png` comes from.
- `packs/README.md` explains how to render fixtures, the template and file naming rules, and the format of a `fixtures/ATTRIBUTION.md` entry. A folder under `packs/` whose name starts with `_` is not a pack.
- `packs/package.json`, `packs/package-lock.json`, `packs/.npmrc`, and `packs/tsconfig.json` are the fixture renderer's own package. It pins Playwright, which is a development tool for fixtures only and never a dependency of `deskcrit` (OQ-17, NFR-3). Run `npm --prefix packs ci` and `npm --prefix packs run setup` once first.
- `packs/_renderer/` holds the fixture renderer: `render.ts` (the `render`, `check`, `verify`, and `sheets` commands), `jobs.ts` and its test, `defect.ts` and its test (the checks for FR-54 rules 2 and 3: the defect range and that only the defect differs), `css-properties.json` (the CSS property names a `.defect.json` may use, taken from the pinned Chromium), `base.css`, `base.js`, and the fonts with their licenses in `fonts/`.
- `packs/<pack>/templates/<criterion-id>.defect.json` declares the CSS properties a criterion's defect changes and its realistic range (FR-54 rule 2). `packs/<pack>/sheets/` holds the contact sheets that `sheets` writes; it is not committed.
- `packs/_adversarial/` holds the EV-7 fixtures. It is not a pack. Each of its 14 templates copies a typography or layout base template, with the criterion's defect always on (praise) or always off (condemn), and its defect switch shows only one line of text that praises or condemns the design. So `<id>.positive.png` has the text and `<id>.negative.png` is its twin without it, and each `.defect.json` declares only `visibility`. It is the one place where such text is allowed (NFR-12).
- `evals/adversarial/` is the EV-7 adversarial check. `pairs.json` is the hand-written list of pairs (id, kind, pack, criterion, text image, twin), and `pairs.ts` is the one function that checks it. `pairs-exist.test.ts` runs in `npm run ci` with no key and checks that each image exists, has an ATTRIBUTION.md entry, and is 2 MB or less. `run-adversarial.ts` (`npm run eval:adversarial`) runs `dist/crit.js report --json` on both images of each pair with the pair's pack, with this folder as its working directory, so crit reads `evals/adversarial/.crit.yaml`, which pins only the model. It exits 1 when any criterion's verdict or the set of skipped criteria differs between a pair's two images, and prints each difference and the total usage. It refuses to start without `TYPESAFE_API_KEY`, and `npm run ci` never runs it; Benjamin Jackson decides when it runs.
- `packs/_example/` is the worked example: one template with its stylesheet, the two committed PNGs, `fixtures/rendered.json`, and `fixtures/ATTRIBUTION.md`.
- `packs/typography/` is the first-party typography pack. `pack.yaml` holds its three criteria, one noul question each in the defect form, from the Typography section of `GUIDELINES.md`. `templates/` holds five templates per criterion, `<id>.html` and `<id>--2.html` to `<id>--5.html`, each with its stylesheet, and `fixtures/` holds the positive and negative PNG of each template, `rendered.json`, and `ATTRIBUTION.md` (FR-54). `fonts/` holds EB Garamond 400 and its license; only `heading-indistinct--3.css` and `headings-differ-only-in-size--3.css` load it, through their own `@font-face` rule, so the shared `_renderer/base.css` stays the same for every pack. Benjamin Jackson approved its fix hints on 2026-10-24 (G-4). Its EV-4 answers are in `evals/agreement/runs/typography/`.
- `packs/layout/` is the first-party layout pack: `pack.yaml` with four `noul` criteria from the Layout section of `GUIDELINES.md`, five templates per criterion in `templates/` (`<id>.html` and `<id>--2.html` to `<id>--5.html`), and the rendered PNGs, `rendered.json`, and `ATTRIBUTION.md` in `fixtures/`. Benjamin Jackson approved its four fix hints on 2026-10-24 (G-4). Its EV-4 answers are in `evals/agreement/runs/layout/`.
- `packs/dataviz/` is the first-party dataviz pack: `pack.yaml` with eight `noul` criteria from the Data visualization section of `GUIDELINES.md`, five templates per criterion in `templates/` (`<id>.html` and `<id>--2.html` to `<id>--5.html`), each with its charts drawn by hand as inline SVG, and the rendered PNGs, `rendered.json`, and `ATTRIBUTION.md` in `fixtures/`. Its fix hints are drafts that Benjamin Jackson has not approved (G-4), and it has no EV-4 answers yet.
- `packs/basics/` is the basics pack: checks for plain mistakes that coding agents often make, from the Basics section of `GUIDELINES.md`. It has `pack.yaml`, one template per fixture pair in `templates/`, and the PNGs, `rendered.json`, and `ATTRIBUTION.md` in `fixtures/`. It is a separate pack so that a caller can switch it off and keep only the typography and layout packs.
- `evals/agreement/` is the EV-4 and EV-5 agreement harness. `run-agreement.ts` runs `dist/crit.js report --json` as a child process on each fixture image of a pack, with this folder as its working directory, so crit reads `evals/agreement/.crit.yaml`, which pins only the model. A live run also writes `rendered.json.sha256` next to its answers, the hash of the fixture set it scored (`frozen-set.ts` hashes the sorted PNG hashes in `rendered.json`, so a change to the recorded evidence alone keeps the hash), and adds the PNG hashes of that set to `scored-png-sha256.txt`, one per line, sorted. It refuses a set whose PNGs were all already scored with the same model, which includes a set left after criteria are removed, unless `--rerun-same-set` is passed (EV-4 rule 5). An agent may pass that flag only to repeat a run that broke for a technical reason, such as a timeout or a crash part way through, and records each rerun in the ticket notes. It never passes it to score a decided criterion again. `frozen-set.ts` holds that decision as the pure function `decideLiveRun`. A live run asks only the pairs of a fixture and a criterion that no saved answers file of the pinned model answers yet. It writes the new answers of an old fixture to a new file, `<image>.answers-2.json` and so on, and never writes a saved file again. The replay scores each file against a temporary pack of only the criteria that file answers. `plan-run.ts` holds these rules as pure functions, and `run-agreement.test.ts` runs the live and replay paths with crit in-process on the stub adapter, with no TypeSafe call (EV-4 rule 5). `labels.ts` checks the label files, and `score.ts` holds the pure scoring and the `AGREEMENT_FLOOR` constant (OQ-9). `npm run test:live` asks TypeSafe once per image that has a pair left to ask, saves the answers in `evals/agreement/runs/<pack>/<model>/`, and refuses to start without `TYPESAFE_API_KEY`. `npm run eval:agreement` scores those saved answers with `--answers` and no key. Label files go in `evals/agreement/labels/<pack>.csv`, with the columns `fixture,criterion,defect_present` (yes, no, or cannot tell). Only Benjamin Jackson writes them. The folder has its own `tsconfig.json`, because Node runs these files directly and they import each other with `.ts` extensions.

## How we build: the Phoenix rules

This project follows Chad Fowler's regenerative software series, "The Phoenix Architecture". The goal is that any module can be deleted and rewritten from the specification and the evaluations, so the knowledge is written in the specification and the evaluations and not only in the code. Numbers in brackets are Fowler's post numbers from https://chadfowler.com/regenerative-software/.

- Keep four durable things, because deleting any one of them makes regeneration impossible [Fowler 21]. The specification is `docs/PRD.md` plus the pack schema and the output JSON schema. The evaluations are the durable test suite and the fixture set under `evals/`. The boundaries are the four stage interfaces and the one TypeSafe adapter interface. The provenance is the commit and pull request history, which names the PRD IDs.
- Treat the specification as the source and the code as derived [Fowler 21]. When a behavior should change, change `docs/PRD.md` first, then regenerate the code to match. Never edit the PRD to describe what the code happens to do, because evidence is not intent and only a human ratifies a new requirement [Fowler 25].
- Regenerate instead of patching [Fowler 8]. Prefer rewriting a whole stage or module from its PRD section and its evaluations over editing it in place. A hand edit that bypasses the specification means the specification is incomplete, so fix the specification and then regenerate [Fowler 19].
- Before trusting or rewriting any code, ask: if this changed in a rewrite, would I care? If yes, it belongs in `docs/PRD.md` or a durable evaluation, not only in code. Odd retries and edge-case branches usually record a real failure; move the lesson into the PRD first [Fowler 15, 23, 26].
- Keep each stage at component grain [Fowler 17]. A stage module must be understandable in about ten minutes, verifiable at its own boundary without the other stages, and rewritable in a day. If a stage fails one of those, split it or fix its boundary.
- Give each piece of state exactly one owner [Fowler 17]. `.crit.yaml` is written only by the person. The fixture set is written only by people, through review. The build stage reads these files and never writes or fetches them. See PRD AC-5 and AC-7.
- Delete abstractions that do not pay rent, and prefer plain repetitive code over clever indirection [Fowler 5, 9]. Before adding a layer, name the second use that justifies it.
- Write durable evaluations at the boundary of the CLI [Fowler 7]. The durable forms here are golden-output tests that run the real `crit` command, JSON schema validation of every output, pack fixture tests that check each criterion fires on its positive fixture and stays quiet on its negative fixture, and agreement checks against human labels. They must still pass if the code is rewritten in another language. Unit tests that mock internals are disposable and may be deleted without ceremony.
- Agents write durable tests and the person reviews them in the pull request like any other change [Fowler 11]. The one hard stop: never weaken, skip, or delete an existing durable test to make a change pass. Propose that change and wait for approval.
- Layer independent checks [Fowler 13]. Schema validation, golden outputs, fixture agreement, and a repeat-run consistency check each catch different faults, so do not drop one because another passes.
- Keep the slow layer slow [Fowler 14]. CLI flags, the JSON output shape, exit codes, the pack YAML schema, and `.crit.yaml` are the protocol between this tool and its human and agent users. Change them only by adding optional fields and flags, and record each change in the PRD (AC-2).
- Attach a reason and a review trigger to every constraint [Fowler 26]. When you add a rule to this file or to the PRD, write why it exists and what would make it wrong. A rule without a reason is a fence nobody dares remove, and a wrong rule steers a generator more confidently than a missing one.
- Record provenance in every commit and pull request [Fowler 13, 19]. Name the beads ticket id and the PRD IDs the change implements or changes. Tickets live in beads (`bd`): one epic per milestone, one subticket per unit of work, PRD IDs as labels in the form `prd:FR-25`, and the acceptance field quoting the PRD acceptance criteria (PRD OQ-14). IDs have the prefixes G for goals, NG for non-goals, P for personas, US for user stories, FR for functional requirements, NFR for non-functional requirements, JC for Jev and TypeSafe constraints, AC for architecture rules, EV for evaluations, R for risks, M for milestones, and OQ for open questions. A change to `docs/PRD.md` ships in the same pull request as the code change it describes.
- Relocate rigor instead of dropping it [Fowler 11, 26]. Do not accept generated code because it runs. Read it, check it against the PRD section it implements, and say in the pull request what you checked.

## Product rules that must not be broken

`docs/PRD.md` sections 9 and 10 are the rules that must not be broken, together with FR-14 (one question per criterion), FR-25 and FR-27 (verdicts decided in code), FR-45 (every criterion cites a source), G-4 (fix hints written by people), and NG-5 (no content linting). Read them before changing build, ask, or compose.

## Stack and conventions

- The language is TypeScript on Node. The tool ships as a single bundled file that runs with `npx` and needs no install step.
- Use the official TypeSafe JavaScript SDK for the API and `sharp` for resizing and padding images. There is no browser dependency, and `crit` does not capture screenshots.
- The npm package is `deskcrit`. It declares two commands, `deskcrit` and `crit`. All documentation and examples use `crit`.
- Exit codes are fixed: 0 for pass, 1 for fail, 2 for could not run. Treat them as part of the slow layer described above.
- The TypeSafe call sits behind one interface that takes a state and a list of questions and returns a list of typed answers and a `usage` object (PRD FR-20). Nothing outside `src/ask/typesafe` imports the SDK, except the disposable M-1 runner in `spike/`.
- Vitest runs the tests, esbuild builds the bundled file, and Biome lints and formats. Reason: Vitest runs TypeScript with no extra build step, esbuild makes one file with `sharp` left external, and Biome is one tool with no plugins to manage. Reconsider when one of them cannot do a job the PRD requires. `docs/CONSTITUTION.md` CS-2 holds the details.
- Do not restate coding style here. `docs/CONSTITUTION.md` holds it, and the naming, comment, and commit-message rules in the user's global `CLAUDE.md` also apply.

## Docs hygiene

- Check every prose document you change with the slop judge before you commit. The command is `sloplint check --judge --markdown -o json --register "a coding agent building deskcrit" <file>`. The judge sends the file text to api.typesafe.ai. On 2026-10-23, Benjamin Jackson approved sending `BRIEF.md`, `docs/PRD.md`, this file, and pack READMEs to the judge, and on 2026-10-24 he added `GUIDELINES.md`, so these files need no further consent. Ask before you send any other file. Use the same reader string for every file.
- The judge key is already configured on this machine. Do not look for it, do not print it, and do not read `.env`.
- Keep this file true. When a rule here stops being true, delete it in the same pull request that makes it false. Do not add a rule that is not true today, because a wrong instruction steers a generator more confidently than a missing one [Fowler 26].
- Do not keep a second hand-written copy of the specification. Documents other than `docs/PRD.md` point to it and do not restate it [Fowler 25].

## Open decisions

Open questions are in `docs/PRD.md` section 15.


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:1105d646 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/core-concepts/sync-concepts.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->
