# deskcrit

`deskcrit` is a command-line critic, invoked as `crit`. It takes a picture of a design and a set of YAML criteria packs, turns each criterion into one typed question for TypeSafe's Jev model, asks all of them in one request, and reports what looks wrong, how sure the model is, where on the image, which source says so, and what usually fixes it. It has three modes. `report` judges one design. `compare` judges a before and an after and says whether each criterion got better, worse, or stayed the same. `gate` passes or fails against thresholds and sets the exit code. The work runs in four stages: prepare the image, build the questions from the packs, ask TypeSafe, and compose the findings into output. The primary user of the output is a coding agent, so the JSON is the main product and the readable report is secondary.

## Where things are

- `BRIEF.md` is the pitch: what the tool is, who it is for, the principles, the risks, and the milestones.
- `GUIDELINES.md` is the catalog of guidelines that the seven first-party packs encode. Each entry has a rule, a source, and a note on how it becomes a question.
- `docs/PRD.md` is the behavioral specification with stable IDs. It is the source of truth for what to build. If `BRIEF.md` and `docs/PRD.md` disagree, `docs/PRD.md` wins and the disagreement is a defect to report.
- `README.md` is a two-line summary. Do not treat it as a specification.

Current state: there is no source code yet. The first milestone is the spike described in `BRIEF.md` under Milestones: one screenshot, twenty hand-written questions, the danger-zone header, and a spreadsheet comparing Jev's answers with two designers' answers. That spike decides whether the project continues. Do not build the full pipeline before the spike result is recorded in `docs/PRD.md`.

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
- The TypeSafe call sits behind one interface that takes a state and a list of questions and returns a list of typed answers and a `usage` object (PRD FR-20). Nothing outside `src/ask/typesafe` imports the SDK.
- The test runner, the bundler, and the linter are not chosen yet. When one is chosen, record it here in the same pull request, with the reason and what would make it wrong.
- Do not restate general coding style here. The naming, comment, and commit-message rules in the user's global `CLAUDE.md` apply.

## Docs hygiene

- Check every prose document you change with the slop judge before you commit. The command is `sloplint check --judge --markdown -o json --register "a coding agent building deskcrit" <file>`. The judge sends the file text to api.typesafe.ai. On 2026-10-23, Benjamin Jackson approved sending `BRIEF.md`, `docs/PRD.md`, this file, and pack READMEs to the judge, so these files need no further consent. Ask before you send any other file. Use the same reader string for every file.
- The judge key is already configured on this machine. Do not look for it, do not print it, and do not read `.env`.
- Keep this file true. When a rule here stops being true, delete it in the same pull request that makes it false. Do not add a rule that is not true today, because a wrong instruction steers a generator more confidently than a missing one [Fowler 26].
- Do not keep a second hand-written copy of the specification. Documents other than `docs/PRD.md` point to it and do not restate it [Fowler 25].

## Open decisions

The test runner and bundler are not chosen. Other open questions are in `docs/PRD.md` section 15.
