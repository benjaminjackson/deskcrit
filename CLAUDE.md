# deskcrit

`deskcrit` is a command-line critic, invoked as `crit`. It takes a picture of a design and a set of YAML criteria packs, turns each criterion into one typed question for TypeSafe's Jev model, asks all of them in one request, and reports what looks wrong, how sure the model is, where on the image, which source says so, and what usually fixes it. It has three modes. `report` judges one design. `compare` judges a before and an after and says whether each criterion got better, worse, or stayed the same. `gate` passes or fails against thresholds and sets the exit code. The work runs in four stages: prepare the image, build the questions from the packs, ask TypeSafe, and compose the findings into output. The primary user of the output is a coding agent, so the JSON is the main product and the readable report is secondary.

## Where things are

- `BRIEF.md` is the pitch: what the tool is, who it is for, the principles, the risks, and the milestones.
- `GUIDELINES.md` is the catalog of guidelines that the seven first-party packs encode. Each entry has a rule, a source, and a note on how it becomes a question.
- `docs/PRD.md` is the behavioral specification with stable IDs. It is the source of truth for what to build. If `BRIEF.md` and `docs/PRD.md` disagree, `docs/PRD.md` wins and the disagreement is a defect to report.
- `README.md` is a two-line summary. Do not treat it as a specification.

Current state: there is no source code yet. The first milestone is the spike described in `BRIEF.md` under Milestones: one screenshot, twenty hand-written questions, the danger-zone header, and a spreadsheet comparing Jev's answers with two designers' answers. That spike decides whether the project continues. Do not build the full pipeline before the spike result is recorded in `docs/PRD.md`.

Planned layout, not present today. Update this list in the same pull request that creates each path.

- `src/prepare`, `src/build`, `src/ask`, `src/compose`: one module per pipeline stage.
- `src/ask/typesafe`: the single adapter that talks to TypeSafe, behind the interface the `ask` stage defines.
- `schemas/`: the pack YAML schema and the output JSON schema.
- `evals/`: the durable tests, the fixture images, and the human labels.

## How we build: the Phoenix rules

This project follows Chad Fowler's regenerative software series, "The Phoenix Architecture". The goal is that any module can be deleted and rewritten from the specification and the evaluations, so the knowledge is written in the specification and the evaluations and not only in the code. Numbers in brackets are Fowler's post numbers from https://chadfowler.com/regenerative-software/.

- Keep four durable things, because deleting any one of them makes regeneration impossible [Fowler 21]. The specification is `docs/PRD.md` plus the pack schema and the output JSON schema. The evaluations are the durable test suite and the fixture set under `evals/`. The boundaries are the four stage interfaces and the one TypeSafe adapter interface. The provenance is the commit and pull request history, which names the PRD IDs.
- Treat the specification as the source and the code as derived [Fowler 21]. When a behavior should change, change `docs/PRD.md` first, then regenerate the code to match. Never edit the PRD to describe what the code happens to do, because evidence is not intent and only a human ratifies a new requirement [Fowler 25].
- Regenerate instead of patching [Fowler 8]. Prefer rewriting a whole stage or module from its PRD section and its evaluations over editing it in place. A hand edit that bypasses the specification means the specification is incomplete, so fix the specification and then regenerate [Fowler 19].
- Apply the Deletion Test before you trust any code [Fowler 15]. Ask what you would rely on to judge a regenerated version correct. If the answer is the old code, write the missing rule into the PRD or a durable evaluation.
- Apply the regeneration test to every decision [Fowler 26]. Ask: if I regenerated the system tomorrow and this changed, would I care? If yes, it belongs in the PRD or a durable evaluation and not only in code. If no, it is an implementation choice and needs no record.
- Keep each stage at component grain [Fowler 17]. A stage module must be understandable in about ten minutes, verifiable at its own boundary without the other stages, and rewritable in a day. If a stage fails one of those, split it or fix its boundary.
- Give each piece of state exactly one owner [Fowler 17]. The pack cache is written only by the `crit packs` commands. `.crit.yaml` is written only by `crit packs add` and by the person. The fixture set is written only by people, through review. The build stage reads these files and never writes or fetches them. See PRD AC-5 and AC-7.
- Delete abstractions that do not pay rent, and prefer plain repetitive code over clever indirection [Fowler 5, 9]. Before adding a layer, name the second use that justifies it.
- Write durable evaluations at the boundary of the CLI [Fowler 7]. The durable forms here are golden-output tests that run the real `crit` command, JSON schema validation of every output, pack fixture tests that check each criterion fires on its positive fixture and stays quiet on its negative fixture, and agreement checks against human labels. They must still pass if the code is rewritten in another language. Unit tests that mock internals are disposable and may be deleted without ceremony.
- Humans write or approve the durable tests, and the agent writes the implementation to pass them [Fowler 11]. If the durable tests do not pass, the code does not ship. Do not weaken, skip, or regenerate a durable test to make a change pass. Propose the change and wait for approval.
- Layer independent checks [Fowler 13]. Schema validation, golden outputs, fixture agreement, and a repeat-run consistency check each catch different faults, so do not drop one because another passes.
- Keep the slow layer slow [Fowler 14]. CLI flags, the JSON output shape, exit codes, the pack YAML schema, and `.crit.yaml` are the protocol between this tool and its human and agent users. Change them only in ways that are additive, optional, and reversible, announce each change in the PRD and the changelog, and never rename or remove anything without a deprecation period.
- Attach a reason, an owner, and a review trigger to every constraint [Fowler 26]. When you add a rule to this file or to the PRD, write why it exists and what would make it wrong. A rule without a reason is a fence nobody dares remove, and a wrong rule steers a generator more confidently than a missing one.
- Record provenance in every commit and pull request [Fowler 13, 19]. Name the PRD IDs the change implements or changes. IDs have the prefixes G for goals, NG for non-goals, P for personas, US for user stories, FR for functional requirements, NFR for non-functional requirements, JC for Jev and TypeSafe constraints, AC for architecture rules, EV for evaluations, R for risks, M for milestones, and OQ for open questions. A change to `docs/PRD.md` ships in the same pull request as the code change it describes.
- Relocate rigor instead of dropping it [Fowler 11, 26]. Do not accept generated code because it runs. Read it, check it against the PRD section it implements, and say in the pull request what you checked.
- Before rewriting a stage that already works, ask what its current code knows that the PRD does not [Fowler 23]. Odd retries, timeouts, and edge-case branches usually record a real failure. Move each such lesson into the PRD or an evaluation first, then regenerate.

## Product rules that must not be broken

The text in `docs/PRD.md` governs. This list is only an index to it.

- JC-1 to JC-11: the Jev and TypeSafe constraints
- NG-2, NFR-9: no measurement, counting, or arithmetic in `crit`
- FR-14: one question per criterion
- FR-15, NFR-10: each image in the state once
- FR-19, NFR-8: the danger-zone header on every image request
- FR-37, FR-38: compare asks twice with the order swapped
- FR-22, NFR-6: never `jev-latest`, always a pinned model id
- FR-26: the model id on every finding
- FR-44, NFR-13: packs are data with no code
- FR-45, FR-56: every criterion cites a source
- G-4, FR-45: fix hints are written by people
- FR-25, FR-27: verdicts are decided in code
- NG-5: no content linting

## Stack and conventions

- The language is TypeScript on Node. The tool ships as a single bundled file that runs with `npx` and needs no install step.
- Use the official TypeSafe JavaScript SDK for the API and `sharp` for resizing and tiling images. There is no browser dependency, and `crit` does not capture screenshots.
- The npm package is `deskcrit`. It declares two commands, `deskcrit` and `crit`. All documentation and examples use `crit`.
- Exit codes are fixed: 0 for pass, 1 for fail, 2 for could not run. Treat them as part of the slow layer described above.
- The TypeSafe call sits behind one interface that takes a state and a list of questions and returns a list of typed answers and a `usage` object (PRD FR-20). Nothing outside `src/ask/typesafe` imports the SDK.
- The test runner, the bundler, and the linter are not chosen yet. When one is chosen, record it here in the same pull request, with the reason and what would make it wrong.
- Do not restate general coding style here. The naming, comment, and commit-message rules in the user's global `CLAUDE.md` apply.

## Docs hygiene

- Check every prose document you change with the slop judge before you commit. The command is `sloplint check --judge --markdown -o json --register "<reader>" <file>`. The judge sends the file text to api.typesafe.ai. On 2026-10-23, Benjamin Jackson approved sending `BRIEF.md`, `docs/PRD.md`, this file, and pack READMEs to the judge, so these files need no further consent. Ask before you send any other file. Use this reader for each file:
  - `docs/PRD.md`: "an engineer or coding agent implementing deskcrit from this document"
  - `CLAUDE.md`: "Claude Code, a coding agent starting a session in this repository"
  - `BRIEF.md`: "a person deciding whether to build or fund deskcrit"
  - A pack README: "a pack author or a designer reviewing the pack"
- The judge key is already configured on this machine. Do not look for it, do not print it, and do not read `.env`.
- Never renumber or reuse a PRD ID. When a requirement is dropped, mark it withdrawn and keep its ID.
- Keep this file true. When a rule here stops being true, delete it in the same pull request that makes it false. Do not add a rule that is not true today, because a wrong instruction steers a generator more confidently than a missing one [Fowler 26].
- Do not keep a second hand-written copy of the specification. Documents other than `docs/PRD.md` point to it and do not restate it [Fowler 25].

## Open decisions

Fowler's series does not settle these, and this repository has not either. Do not guess. Raise the question, then record the answer in `docs/PRD.md` and remove the item from this list.

- The test runner and the bundler, as noted above.

The dependency policy, the local state layout, and the provenance format have proposed defaults in `docs/PRD.md` as OQ-12, OQ-13, and OQ-14.

The remaining open questions, such as tiling tall pages and how much context a visual question needs, are listed in `docs/PRD.md` and in the Open questions section of `BRIEF.md`.
