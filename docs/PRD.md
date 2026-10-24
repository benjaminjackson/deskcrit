# deskcrit: product requirements document

## 1. Document control

| Field | Value |
| --- | --- |
| Status | Draft |
| Owner | Benjamin Jackson |
| Last updated | 2026-10-24 |

### How to update this document

This document is the behavioral specification for `deskcrit`. An agent must be able to delete the implementation and rebuild it from this document and the durable evaluations in section 12. Code does not override this document. When code and this document disagree, one of them is wrong, and the fix is a deliberate decision recorded here.

Follow these rules for every change:

1. Every requirement has a stable ID. IDs are never reused and never renumbered. A new requirement takes the next free number in its series.
2. Do not delete a requirement. Mark it `Removed`, and record the date and the reason in the same row.
3. Every requirement that encodes a constraint records its reason and its review trigger. A constraint without a reason becomes a rule nobody dares to change.
4. Evidence from production, such as a measured latency or a drift in model answers, does not become a requirement by itself. A person reads the evidence and decides to change this document.
5. If two sources of authority disagree, record the conflict in section 15 as an open question. Do not resolve it silently.

The git history is the changelog.

ID series used in this document: `G` goals, `NG` non-goals, `P` personas, `US` user stories, `FR` functional requirements, `NFR` non-functional requirements, `JC` Jev and TypeSafe constraints, `AC` architecture constraints, `EV` evaluations, `R` risks and assumptions, `M` milestones, `OQ` open questions.

## 2. Summary

`deskcrit` is a command-line critic, run as `crit`, that judges a picture of a design against criteria packs. Each criterion in a pack is one narrow, typed question. `crit` sends all the questions for an image to TypeSafe's Jev model in one request, reads back a probability for every answer, and turns those probabilities into findings. Each finding says what looks wrong, how sure the model is, where on the image the problem is, which source the rule comes from, and what usually fixes it. The first-party packs and their fixtures live in this repository under `packs/`.

Problem statement: a coding agent that builds a user interface has no check for how that interface looks, so visual defects ship unnoticed.

## 3. Problem and background

A coding agent can check that a page renders and that its tests pass. It cannot check that the page looks right. Two headings can compete for attention, a button can sit grey on grey, and a chart can carry a legend it does not need. Nothing in the agent's loop reports these defects, so the agent ships the page or asks a person to look. The full argument is in [BRIEF.md, "Why this exists"](../BRIEF.md#why-this-exists).

Existing tools fall short in three ways:

- axe-core and Lighthouse check the accessibility rules that can be computed from the Document Object Model (DOM). They do not judge hierarchy, spacing, or colour harmony.
- A large vision model can answer "is this good?", but the answer is prose that the agent must parse. Each question costs too much money and time to ask a few hundred per change. The confidence the model states is not calibrated, so a loop cannot use it to decide whether to continue.
- No tool turns the design rules that books and standards already contain into checks an agent can run after every change.

Jev is TypeSafe's System One model. It answers narrow, typed questions over a state of text, JSON, and images. It returns a probability for every option, and a confidence for choice and score answers. TypeSafe trains it for calibrated probabilities and stable answers across runs, but makes no claim for design images. The bet behind `deskcrit` is that a design critique splits into a couple of hundred small visual judgments, and that Jev can answer them well enough to drive an agent's fix loop. Milestone M-1 tests that bet before other work starts.

## 4. Goals and non-goals

### Goals

| ID | Goal |
| --- | --- |
| G-1 | Give a coding agent a visual check it can run after every change and parse with no help. |
| G-2 | Tell the agent whether a change made each criterion better, worse, or the same, so it knows when to stop iterating. |
| G-3 | Let a person set a design bar that blocks a change in continuous integration (CI), a pre-commit hook, or a Claude Code hook. |
| G-4 | Ground every finding in a cited source and a fix hint that a person wrote. |
| G-5 | Make criteria portable data that anyone can write, review, and run. |
| G-6 | Report a calibrated probability and confidence for every finding, and never a bare verdict without them. Changed 2026-10-24: a `noul` finding carries its probability and no confidence, because TypeSafe reports none for `noul` answers (FR-26). Before, every finding carried a confidence. |
| G-7 | Make a run reproducible: the same image, pinned packs, and pinned model give the same verdicts. |
| G-8 | Ship seven first-party packs that encode the guidelines in [GUIDELINES.md](../GUIDELINES.md). |

### Non-goals

| ID | Non-goal | Reason |
| --- | --- | --- |
| NG-1 | `crit` does not capture screenshots. | The caller already has a browser tool or Playwright. |
| NG-2 | `crit` does not measure. It computes no contrast ratio, pixel size, character count, or readability score. | Jev is unreliable at arithmetic and counting, and axe-core, Lighthouse, and readability libraries already measure. Callers pass measurements in through the facts file. |
| NG-3 | `crit` does not generate designs or apply fixes. | It reports. The agent fixes. |
| NG-4 | `crit` does not judge interaction. | It judges still images. A caller can supply stills of hover and focus states. |
| NG-5 | `crit` does not lint prose. | Reading level, tone, and terminology belong to a content linter. Changed 2026-10-24: wording is not judged at all, under NG-10. Before, wording was judged where a usability heuristic depended on it. |
| NG-6 | `crit` does not certify legal conformance. | The accessibility pack asks about visible symptoms. A conformance claim needs measurement and a human audit. |
| NG-7 | No Model Context Protocol (MCP) server in v1. | The command-line interface (CLI) with JSON output covers the agent case. |
| NG-8 | `crit` does not render pages, read the DOM, or run axe-core. | These need a browser, and NFR-3 forbids a browser dependency. |
| NG-9 | No pack ships example images as Jev criteria in v1. | Image rights in a public repository are unresolved. See OQ-3. |
| NG-10 | No criterion asks about what the content says or about detail too fine to see. Every criterion is a purely visual judgment. Decided 2026-10-24 by Benjamin Jackson during M-1. | In M-1, Benjamin cut `vague-link-text`, `text-baked-into-image`, and `headings-describe-content`, because they read the content or need fine detail. Jev still answered them with high probability where Benjamin could not tell: `text-baked-into-image` true at 0.96 and `vague-link-text` true at 0.79 (spike/comparison.csv, slice, with_purpose). A coding agent cannot check such an answer, and it acts on it anyway. Reconsider when: TypeSafe documents that Jev reads text and fine detail in images reliably. OQ-18 tracks the review of GUIDELINES.md against this rule. |

## 5. Users and personas

**P-1: Coding agents, with Claude Code first.** The agent takes a screenshot with the tool it already has, runs `crit report --json`, fixes the top findings, takes a new screenshot, and runs `crit compare`. It stops when the gate passes or when nothing improves. It needs JSON with a stable shape, findings sorted so the most important come first, a probability and confidence it can trust, a region that tells it where to look, and a fix hint it can turn into a code change. This is the primary persona, and the output contract in section 8 is designed for it.

**P-2: People who build with agents.** They want a bar that their agent must clear before it reports that work is done. They choose packs and the gate policy in `.crit.yaml`, add `crit gate` to CI or a hook, and sometimes read the readable report. They need clear exit codes, readable output, visible cost, and the confidence to know that a gate failure means a real change and not model drift.

**P-3: Pack authors.** These are designers, accessibility specialists, and teachers who want to encode a critique checklist once and have every agent apply it. Many are not programmers. They need a YAML schema they can read, a validator that explains errors, and fixture tests that show whether each criterion fires on the right images.

## 6. User stories

Each story has an ID and acceptance criteria in Given, When, Then form.

**US-1: Report for an agent.** As P-1, I want a JSON report of findings for one image, so that I can decide what to fix without parsing prose.

- Given an image and pinned packs, when I run `crit report <image> --json`, then stdout holds one JSON document that validates against the report schema in section 8, and the exit code is 0.
- Given the same run, when I read `findings`, then every finding has all the fields in FR-26, and findings are in the order FR-28 defines.
- Given a criterion that sets `locate: true` and does not pass, when the report is written, then that finding has a `region` in the pixel coordinates of the original image.

**US-2: Report for a person.** As P-2, I want a readable report, so that I can see what my agent sees without reading JSON.

- Given an image, when I run `crit report <image>` without `--json`, then the output groups findings by verdict, shows each finding's title, verdict, confidence (left out when it is null, FR-20), source, and fix hint, and ends with the cost and model line from FR-33.
- Given a terminal without colour support, when the report prints, then it is still readable as plain text.

**US-3: Compare in the fix loop.** As P-1, I want to know for every criterion whether my change made it better, worse, or the same, so that I know whether to keep iterating.

- Given a before image and an after image, when I run `crit compare <before> <after> --json`, then each applicable criterion has a `change` of `better`, `worse`, `same`, or `uncertain`.
- Given a `score` criterion such as `single-focal-point`, where level 0 passes, whose most probable level is 2 in the before report and 0 in the after report, when the result is composed, then its `change` is `better`.
- Given the compare result, when I read the summary, then it counts how many criteria improved, regressed, and stayed the same.

**US-4: Gate in CI and hooks.** As P-2, I want `crit gate` to exit non-zero when a design fails, so that CI, pre-commit, or a Claude Code hook holds the change.

- Given an image with no failing finding, when I run `crit gate <image>`, then the exit code is 0.
- Given an image with at least one finding whose verdict is `fail`, when I run `crit gate <image>`, then the exit code is 1 and the output lists the failing criteria.
- Given a missing image, an invalid pack, a missing API key, or an unreachable TypeSafe API, when I run `crit gate <image>`, then the exit code is 2 and stderr says what went wrong.

**US-5: Choose packs.** As P-2, I want to name the packs a project runs, so that every run on every machine uses the same criteria.

- Given a `.crit.yaml` that names `typography` and `layout`, when I run `crit report`, then only those packs are asked, and the report's `packs` lists their names and bundled versions.
- Given `--pack ./house-style`, when I run `crit report`, then `crit` validates that directory as a pack before it loads it. If validation fails, the exit code is 2 and stderr holds the error.

**US-6: Write and validate a pack.** As P-3, I want to validate my pack and test it against fixtures, so that I know each criterion fires on the images it should and stays quiet on the rest.

- Given a pack directory that holds `pack.yaml` and a `fixtures/` directory, when I run `crit packs validate <dir>`, then every schema error is reported with the criterion id and field name, and the exit code is 1 if any error exists.
- Given a criterion whose `fixtures` field lists one positive and one negative fixture, when I run `crit packs test <dir>`, then the positive fixture produces `warn` or `fail` and the negative fixture produces `pass`, or the test fails and reports which fixture disagreed.
- Given a criterion whose `fixtures` field has no positive fixture or no negative fixture, when I run `crit packs validate <dir>`, then validation fails and names that criterion.

**US-7: Pass a facts file.** As P-1, I want to hand `crit` measurements I made with other tools, so that packs can use exact figures that `crit` does not compute.

- Given `--facts facts.json`, when the request is built, then the file contents appear in the TypeSafe state unchanged under the key `facts`.
- Given a criterion that declares `requires: [facts.viewport_width]` and a facts file without that key, when the report is written, then the criterion is not asked and appears in `skipped` with the reason.
- Given a facts file that is not valid JSON, when I run `crit report`, then the exit code is 2.

**US-8: Skip criteria that do not apply.** As P-2, I want to say what the design is for, so that criteria that do not apply are not asked.

- Given `--context platform=print`, when packs are loaded, then every criterion whose pack or criterion `applies_to` excludes `print` is skipped and listed in `skipped` with the reason.
- Given `--context purpose="poster seen from three metres"`, when the request is built, then the purpose text is in the state for every question.
- Given no context, when packs are loaded, then no criterion is skipped for context reasons.

**US-9: Low confidence surfaces as uncertain.** As P-1, I want answers the model is unsure about to be marked, so that I can decide whether to act, ask a person, or skip.

- Given a criterion with `min_confidence: 0.6` and a Jev confidence of 0.5, when the finding is composed, then its verdict is `uncertain`, and its `distribution` and `confidence` are still present.
- Given an `uncertain` finding, when `crit gate` runs with default settings, then that finding does not cause exit code 1.

**US-10: See cost and model per run.** As P-2, I want every run to show its cost, latency, and model version, so that I can budget and spot model drift.

- Given any successful run, when output is written, then it includes the number of requests, the input tokens, the cost in US dollars, the wall-clock latency, and the model id that answered.
- Given a finding, when I read it, then its `model` field holds the versioned model id from the response.

**US-11: Tall page.** As P-1, I want `crit` to tell me when a page is too tall to judge at a readable size, so that I send it in parts and do not get findings from text too small to read.

- Given a screenshot that prepare would shrink to less than half its size, when it is prepared, then `crit` exits with code 2 and a message on stderr that says the image would shrink below half size and asks for the page in parts (FR-73).
- Given a screenshot that prepare shrinks to half its size or more, when it is prepared, then prepare downscales and pads it under FR-8, `crit` judges it as one image, and each finding's `region` is in the coordinates of the original image.
- Changed 2026-10-24 by Benjamin Jackson: before, this story asked for a full-page screenshot judged in one run without the person cutting it up, and OQ-1 then decided that `crit` cuts a tall page into slices. Slicing is removed (FR-70 to FR-72), and the caller cuts the page. Reason: see FR-73.

**US-12: House style inline.** Removed 2026-10-23. Inline packs are dropped, because `--pack <dir>` loads a house-style pack from a directory.

**US-13: Library API for custom loops.** As a developer building my own loop, I want the four pipeline stages as separate functions, so that I can insert my own steps between them.

- Given the npm package, when I import `prepare`, `build`, `ask`, and `compose`, then each is a function whose input and output types are exported.
- Given the output of `prepare` and `build`, when I call `ask` with a stub that implements the TypeSafe adapter interface in FR-20, then no network call is made.
- Given the four functions called in order, when I compare the result with `crit report --json` on the same inputs and the same model answers, then the two are identical.

**US-14: Claude Code fix loop.** As P-1 running in Claude Code, I want a skill that teaches me the loop and a hook that runs the gate, so that I check the design without being told to.

- Given the plugin is installed, when I finish a UI change, then the skill tells me to screenshot, run `crit report --json`, fix the top findings, screenshot again, and run `crit compare`.
- Given two rounds of compare with no criterion improved, when the loop checks its stop rule, then the loop stops and reports to the person.
- Given the optional hook is enabled, when a UI file changes, then the hook runs `crit gate` on the image at the `screenshot` path in `.crit.yaml`, and a gate failure holds the change.

## 7. Functional requirements

Priorities use MoSCoW for v1: Must, Should, Could, Won't. The source column says where a requirement comes from: the brief, a Jev or TypeSafe constraint from section 10, or this document when the brief left a gap.

### 7.1 Inputs

| ID | Requirement | Priority | Stories | Source |
| --- | --- | --- | --- | --- |
| FR-1 | `crit` accepts one image file per report or gate run, and two for compare, in PNG or JPEG format. | Must | US-1, US-3, US-4 | Brief, Inputs |
| FR-2 | `crit` accepts optional context with three keys: `purpose`, `audience`, and `platform`, from flags or `.crit.yaml`. Flags override the file. | Must | US-8 | Brief, Inputs |
| FR-3 | `crit` accepts an optional facts file of JSON and places it in the state unchanged under `facts`. `crit` never computes, edits, or checks the meaning of a fact. | Must | US-7 | Brief, Inputs |
| FR-4 | Any input that cannot be read or parsed stops the run with exit code 2 and a message on stderr that names the input. | Must | US-4, US-7 | This document |

### 7.2 Prepare

| ID | Requirement | Priority | Stories | Source |
| --- | --- | --- | --- | --- |
| FR-5 | Prepare rejects a file that is not a valid PNG or JPEG with exit code 2. | Must | US-4 | Brief, How it works |
| FR-6 | Prepare strips all image metadata and rotates the image upright using its orientation tag before the tag is removed. | Must | US-1 | JC-1 |
| FR-7 | Prepare resizes every image it sends so each side is between 280 and 1568 pixels, keeping the aspect ratio. | Must | US-1, US-11 | JC-1 |
| FR-8 | When an image is taller or wider than the limits allow at full size, prepare downscales it so its long side is 1568 pixels. If the short side is then below 280 pixels, prepare pads the short side to 280 pixels with a flat colour sampled from the page's top-left pixel, places the page at the top-left of the padded image, and sets `padded: true` in the `image` object of the output. Prepare records the scale factor it applied, so compose can map a Box answer back to the pixel coordinates of the original image. Reason: TypeSafe rejects an image with a side under 280 pixels, and top-left placement keeps the region offset at zero. Reconsider when: M-1 shows that a downscaled whole page loses the detail that legibility criteria need. Then OQ-1 decides whether to add viewport-sized crops. Changed 2026-10-24: this review trigger fired in M-1. At 515 x 1568 px the spike page's body text is about 6 px high, and Benjamin Jackson could not judge it (spike/ATTRIBUTION.md). OQ-1 records the decision. Changed 2026-10-24: FR-73 refuses an image that this downscale would shrink below half size, and `crit` does not cut a page into slices. Before, FR-70 cut a tall page into slices and this row made the downscaled whole page that `page` criteria were asked on (FR-71). The removed FR-9, FR-18, and FR-29 are not restored. | Must | US-11 | Brief, How it works; OQ-1 |
| FR-9 | Removed 2026-10-23. Tile offsets are not needed, because v1 has no crops. See OQ-1. | Removed | | |
| FR-10 | Prepare is a pure function of the image bytes and its options: the same input gives byte-identical output. | Must | US-13 | NFR-5 |
| FR-70 | Removed 2026-10-24 by Benjamin Jackson. Prepare does not cut a tall page into slices. Reason: `crit` sees only pixels and cannot tell where a cut is safe. A cut through a paragraph or just under a heading looks like a typography defect, such as `paragraph-runt`, `heading-floats`, or `heading-lines-collide`, and gives false findings. The caller has the page structure, so the caller cuts the page (FR-73). Before: when an image was still taller than 1568 pixels after its width was scaled to at most 1568 pixels, prepare cut it from top to bottom into full-width slices no taller than 1568 pixels, recorded each slice's index, top offset, height, and scale factor, and also made the downscaled whole page. | Removed | | |
| FR-73 | Prepare refuses an image that it would have to shrink to less than half its size under FR-8, that is, with a scale factor below 0.5. It stops the run with exit code 2 and a message on stderr that says the image would shrink below half size and asks the caller to send the page in parts, such as one screenshot for each section or each screen height. An image with a scale factor of 0.5 or more is prepared as FR-8 says. Added 2026-10-24 by Benjamin Jackson, when FR-70 to FR-72 were removed. Reason: shrinking a tall page to fit makes its text too small to judge. A 1440 x 8000 px page becomes about 282 x 1568 px. At 515 x 1568 px the M-1 page's body text was about 6 px high, and no one could judge it (OQ-1). `crit` cannot cut the page safely itself, because it sees only pixels (FR-70). A retina screenshot of one screen still fits, with a scale factor of about 0.55 to 0.7. Reconsider when: callers cannot cut pages themselves, or TypeSafe accepts larger images (JC-1). | Must | US-11 | OQ-1 |

### 7.3 Build

| ID | Requirement | Priority | Stories | Source |
| --- | --- | --- | --- | --- |
| FR-11 | The CLI reads the first-party packs bundled in the npm package that `.crit.yaml` names, plus any local pack directory named with `--pack <dir>`, parses them, and passes the parsed packs to build. When `.crit.yaml` names no packs and no `--pack` is given, the CLI reads every bundled pack. Build reads no files. Changed 2026-10-23: build no longer loads packs, because AC-7 forbids I/O in build. | Must | US-5 | Brief, How it works; AC-7 |
| FR-12 | Build drops every criterion whose `applies_to`, at pack or criterion level, does not include the stated platform, and records each one in `skipped` with the reason. | Must | US-8 | Brief, How it works |
| FR-13 | Build drops every criterion whose `requires` paths are absent from the facts file, and records each one in `skipped` with the missing path. A required path whose key is in the facts file with a blank value (`null`, an empty string, or only spaces) stops the run with exit code 2, and the message names the key and the criterion and tells the caller to give a value or remove the key (OQ-24). A blank key that no criterion requires is not checked. Changed 2026-10-24 by Benjamin Jackson: before, FR-13 said nothing about a blank value, and build counted a key with any value as present. Reason: a blank value is a fact the person has not given, and silently asking the criterion with nothing to check would hide the gap. Reconsider when: EV-1 shows a real facts file that needs a blank value for a key. | Must | US-7 | Brief, A pack |
| FR-14 | Build turns each remaining criterion into exactly one TypeSafe question of the type the pack declares. | Must | US-1 | Brief, Principles |
| FR-15 | Build places each image in the state once, and every question refers to it by its path in the state, never by a second copy. | Must | US-1 | JC-6 |
| FR-16 | Build adds a Box question for each criterion that sets `locate: true`. The Box question sends the criterion's `locate_instructions`, which the pack schema requires when `locate` is true. It never falls back to `question.instructions`. Changed 2026-10-23 by Benjamin Jackson: before, the row did not say what the Box question asks. Reason: yes or no and score wording does not name a thing to mark, so a fallback would guess with no warning. Review trigger: TypeSafe adds a way to get a region from the main question. | Must | US-1 | Brief, How it works |
| FR-17 | Build puts the context and the facts file in the state next to the image. It never adds page HTML, a DOM dump, or source code to the state. | Must | US-7, US-8 | JC-4 |
| FR-74 | When build would ask no question, because every criterion was skipped under FR-12 or FR-13, it stops the run with exit code 2 and a stderr message that lists each skipped criterion with its reason. Added 2026-10-24 by Benjamin Jackson. Reason: a run that checked nothing is not a pass, and `crit gate` must not exit 0 on it. Reconsider when: a caller needs an empty report on purpose. | Must | US-7, US-8 | FR-43 |
| FR-18 | Removed 2026-10-23. The `view` field chose between crops and the whole page, and v1 has no crops. See OQ-1. | Removed | | |
| FR-71 | Removed 2026-10-24 by Benjamin Jackson. A criterion has no `view` field, and the pack schema does not define one. Reason: with no slices (FR-70), every criterion is asked on the one prepared image, so `view` has nothing to choose. Before: a criterion could set `view` to `slice` or `page`, with `slice` when absent, and on a cut page build asked a `slice` criterion on each slice and a `page` criterion on the downscaled whole page. | Removed | | |

### 7.4 Ask

| ID | Requirement | Priority | Stories | Source |
| --- | --- | --- | --- | --- |
| FR-19 | Ask sends one request per image that holds every question for that image, with the header `TypeSafe-Danger-Zone-Images: true`. | Must | US-1 | Brief, How it works; JC-7 |
| FR-20 | Ask calls TypeSafe through one interface. It takes a state and a list of questions. It returns the list of typed answers, each with its distribution, its confidence for a `choice` or `score` answer, and its model id, and a `usage` object with `input_tokens`, `cost_usd`, `latency_ms`, and `model`. A `noul` answer carries no confidence, and the adapter makes none up. A stub adapter returns zeros in `usage` and a stub model id. v1 has one real implementation of this interface, which uses the official TypeSafe JavaScript software development kit (SDK). Changed 2026-10-24 by Benjamin Jackson: before, every answer carried a confidence. Reason: TypeSafe reports no confidence for a `noul` answer, because its probability already carries the uncertainty (https://docs.typesafe.ai/confidence). The max(p, 1 − p) in the spike files was the spike's own guess, and nothing in `crit` uses it. This settles the `noul` part of the question that crit-dmm raised. Box confidence is still open in OQ-21. Reconsider when: TypeSafe reports a confidence for `noul` answers. | Must | US-13 | Brief, How it works; R-1 |
| FR-21 | Ask uses the three text primitives only: Noul for yes or no, Choice for one of a set, and Score for a degree along described levels. Box is used only for regions. | Must | US-1 | Brief, How it works |
| FR-22 | Ask sends the model id pinned in `.crit.yaml`. If no model is pinned, ask uses the newest versioned id `crit` was released against, never `jev-latest`. | Must | US-10 | NFR-6 |
| FR-23 | Ask records input tokens, cost, and latency for every request, from the `usage` object the adapter returns under FR-20. The adapter computes the cost from the input tokens at the JC-10 price, because TypeSafe reports no cost. When TypeSafe returns no input token count, the adapter keeps the answers and sets `input_tokens` and `cost_usd` to null, which means the cost is unknown. Changed 2026-10-24 by Benjamin Jackson: before, the row did not say what happens with no count, and the adapter stopped the run with exit code 2. Reason: the SDK types the count as a number or null, and stopping the run throws away answers that were already paid for. Reconsider when: TypeSafe guarantees a token count on every response, or reports the cost itself. | Must | US-10 | Brief, Risks |
| FR-24 | When TypeSafe returns an error or cannot be reached, ask stops the run with exit code 2 and does not write a partial report. | Must | US-4 | This document |

### 7.5 Compose and output

| ID | Requirement | Priority | Stories | Source |
| --- | --- | --- | --- | --- |
| FR-25 | Compose turns each answer into a verdict in code from the distribution and the criterion's `fail_when`, `warn_when`, and `pass_when` thresholds, by the verdict rule below the finding fields table. The model never chooses the verdict. | Must | US-1 | Brief, Principles |
| FR-26 | Every finding has these fields: `criterion`, `title`, `verdict`, `distribution`, `confidence`, `region`, `source`, `link`, `fix`, and `model`. See the table below. `confidence` is null for a `noul` finding. Changed 2026-10-24 by Benjamin Jackson: before, every finding carried a numeric confidence. Reason and review trigger: as in FR-20. A `noul` probability above 0.3 and below 0.7 gives `uncertain` (step 1 of the verdict rule). Changed 2026-10-24: a `slice` field was added and then removed with slicing (FR-72), so a finding still has no field that names its image. Changed 2026-10-24: for a `noul` finding, TypeSafe sends only the probability of `true`, with two decimals, and the adapter derives `false` as 1 - `true` and rounds it to the precision of `true`, two decimals, so `true` plus `false` is exactly 1. Reason: a derived value should not carry float noise, such as 0.07999999999999996, that the model never sent. Reconsider when: TypeSafe starts sending both values or sends `true` with more decimals. | Must | US-1, US-10 | Brief, Output |
| FR-27 | A `choice` or `score` finding whose confidence is below the criterion's `min_confidence` gets the verdict `uncertain`, whatever its thresholds say. Its distribution and confidence stay in the finding. The loader rejects a `noul` criterion that sets `min_confidence`. Changed 2026-10-24: `min_confidence` applies to `choice` and `score` findings only, because a `noul` finding has no confidence (FR-26). Before, it applied to every finding. Changed 2026-10-24 by Benjamin Jackson (OQ-21): the loader rejects `min_confidence` on a `noul` criterion. Before, the loader accepted it and it had no effect. Reason: a field that does nothing misleads the pack author. Reconsider when: TypeSafe reports a confidence for `noul` answers. | Must | US-9 | Brief, Output |
| FR-28 | Findings sort by severity first, in the order `fail`, `warn`, `uncertain`, `pass`. Within one severity, findings that have a confidence come first, from high to low confidence, and `noul` findings, which have none, come after them. Ties then sort by criterion id. Changed 2026-10-24 by Benjamin Jackson (OQ-21): before, the second key was confidence from high to low, which did not say where a `noul` finding goes. Reason: a finding with a confidence can be ranked by it, and a `noul` finding cannot. Reconsider when: TypeSafe reports a confidence for `noul` answers. | Must | US-1 | Brief, Output; OQ-6, OQ-21 |
| FR-29 | Removed 2026-10-23. Merging findings across tiles is not needed, because v1 has no crops. See OQ-1. | Removed | | |
| FR-30 | Removed 2026-10-23. Weight affected only sort ties and an unset gate score. | Removed | | |
| FR-31 | `--json` writes one JSON document to stdout that matches the schema in section 8. Without `--json`, `crit` writes the readable report. | Must | US-1, US-2 | Brief, Integration |
| FR-32 | The readable report shows each finding's title, verdict, confidence, source, and fix hint, groups findings by verdict, and works without colour. A `noul` finding has no confidence (FR-20), so its line shows `Defect probability:` with the probability of `true`, which is the probability that the defect is present (section 7.8, `question.criteria`), to two decimals, such as `Defect probability: 0.82`, where a `choice` or `score` finding shows `Confidence:`. After the Pass group, a Skipped group headed like the other groups, such as `Skipped (2)`, lists each skipped criterion on one line with its pack and criterion id and its reason, in the order the JSON lists them (FR-12, FR-13). A run that skipped nothing shows no Skipped group. Changed 2026-10-24 by Benjamin Jackson: before, the readable report left out skipped criteria and showed nothing on a `noul` finding where other findings showed a confidence. Reason: a person could read all pass while half the criteria were never asked, and a `noul` finding showed no number at all. Changed 2026-10-24 by Benjamin Jackson: the label is `Defect probability:` and not `Probability:`, because every `noul` question asks about the defect. Reconsider when: a readable report with the Skipped group is too long to scan, or a person reads the probability as a confidence. | Must | US-2 | Brief, Modes |
| FR-33 | Every run prints the number of requests, the input tokens, the cost in US dollars, the latency, and the model id, taken from the `usage` objects the adapter returns under FR-20. In JSON this is the `usage` object, which holds `requests`, `input_tokens`, `cost_usd`, and `latency_ms`. Compose counts `requests`. The model id goes in the report's top-level `model` field and in each finding, not in `usage`. In the compare document, `usage` holds the sums over both runs. `input_tokens` and `cost_usd` are null when the cost is unknown under FR-23, and a compare sum is null when either run's value is null. The readable report then says the cost is unknown. Changed 2026-10-24 by Benjamin Jackson: before, both fields were always numbers. Reason: FR-23 now keeps the answers when TypeSafe returns no token count. Changed 2026-10-23: the adapter's `usage` under FR-20 carries `model`, and this row now says where the model id goes in the output. | Must | US-10 | Brief, How we know it works |
| FR-34 | No finding or report text claims conformance with a standard or a measured value. | Must | US-2 | Brief, Risks; NG-6 |
| FR-72 | Removed 2026-10-24 by Benjamin Jackson. Compose makes one finding for each criterion, and a region maps back to the original image by the scale factor alone (FR-8). Reason: as in FR-70. Before: on a cut page, compose made one finding for each slice where a `slice` criterion fired, named its slice by its index, and mapped its region back through the slice's scale factor and top offset. | Removed | | |

Finding fields:

| Field | Type | What it holds |
| --- | --- | --- |
| `criterion` | string | Pack name and criterion id joined by `/`, for example `typography/single-focal-point`. |
| `title` | string | The criterion title from the pack. |
| `verdict` | string | One of `pass`, `warn`, `fail`, `uncertain`. Decided in code. |
| `distribution` | object | Jev's probability for each option or level, keyed by option name or level index, unchanged. |
| `confidence` | number or null | Jev's confidence in the distribution, from 0 to 1, as TypeSafe reports it. Null for a `noul` finding (FR-26). |
| `region` | object or null | `x`, `y`, `width`, `height` in pixels of the original image, from a Box question. Null when the criterion does not set `locate` or the verdict is `pass`. Changed 2026-10-24: a region on a slice mapped back through the slice's offset and scale factor (FR-72). That rule is removed with slicing, and every region again comes from the one prepared image. |
| `source` | string | The book, standard, or paper the criterion cites. |
| `link` | string or null | The URL of the source when it is online. |
| `fix` | string | The fix hint the pack author wrote. |
| `model` | string | The versioned model id from the response. |

Verdict rule for FR-25:

1. If the finding is a `choice` or `score` finding and its confidence is below `min_confidence`, the verdict is `uncertain`, as FR-27 says. If the finding is a `noul` finding whose probability of `true` is above 0.3 and below 0.7, the verdict is `uncertain`; 0.3 and 0.7 themselves are outside that band. No predicate is checked for either. Changed 2026-10-24 by Benjamin Jackson (OQ-21): before, step 1 covered choice and score only, and a `noul` near-tie got a firm verdict. He chose that a `noul` near-tie is treated the same as a low-confidence choice or score answer. Reason: TypeSafe's documentation suggests 0.7 as the cut-off for yes and 0.3 for no (https://docs.typesafe.ai/confidence), so a probability between them is the model saying it is not sure. Reconsider when: TypeSafe changes the cut-offs it suggests, or EV-5 shows that `noul` findings in that band agree with people at or above the floor in OQ-9.
2. Otherwise compose reads one value from the distribution. For a `noul` question, the value is the probability of `true`. For a `score` question, it is the most probable level. For a `choice` question, it is the most probable option. On a tie, the lower index wins: the lower level index, or the option listed first in `question.criteria`.
3. Compose checks `pass_when`, then `warn_when`, then `fail_when`, in that order. The first predicate that matches gives the verdict.
4. If no predicate matches, the verdict is `fail` when the criterion defines `pass_when`, and `pass` when it does not.

Each of `pass_when`, `warn_when`, and `fail_when` holds one predicate. The loader rejects a predicate that does not fit the question type.

| Predicate | Question type | Matches when |
| --- | --- | --- |
| `probability_at_least: <n>` | `noul` | The probability of `true` is at least n. |
| `probability_at_most: <n>` | `noul` | The probability of `true` is at most n. |
| `level_at_most: <i>` | `score` | The most probable level has an index of at most i. |
| `level_at_least: <i>` | `score` | The most probable level has an index of at least i. |
| `option_is: <name>` | `choice` | The most probable option is the named option. |
| `option_in: [<names>]` | `choice` | The most probable option is one of the named options. |

The two example criteria in the brief give these verdicts. The examples assume a confidence at or above `min_confidence` for choice and score answers. A `noul` answer has no confidence (FR-20).

| Criterion | Thresholds | Answer | Verdict | Why |
| --- | --- | --- | --- | --- |
| `faint-body-text`, `noul` | `fail_when: { probability_at_least: 0.7 }` | Probability of `true` is 0.8 | `fail` | `fail_when` matches. |
| `faint-body-text`, `noul` | Same | Probability of `true` is 0.3 | `pass` | 0.3 is not above 0.3, so step 1 does not apply. No predicate matches, and the criterion has no `pass_when`. |
| `faint-body-text`, `noul` | Same | Probability of `true` is 0.5 | `uncertain` | 0.5 is above 0.3 and below 0.7 (step 1), so no predicate is checked. |
| `single-focal-point`, `score` | `pass_when: { level_at_most: 0 }`, `warn_when: { level_at_most: 1 }` | Most probable level is 0 | `pass` | `pass_when` matches. |
| `single-focal-point`, `score` | Same | Most probable level is 1 | `warn` | `pass_when` does not match, and `warn_when` matches. |
| `single-focal-point`, `score` | Same | Most probable level is 2 | `fail` | No predicate matches, and the criterion has `pass_when`. |

### 7.6 Compare

| ID | Requirement | Priority | Stories | Source |
| --- | --- | --- | --- | --- |
| FR-35 | Compare runs the full report pipeline on the before image and on the after image, with the same packs, context, and model. | Must | US-3 | Brief, How it works |
| FR-36 | For each criterion present in both reports, compare reads from each report the value that the verdict rule under FR-25 reads: the probability of `true` for `noul`, the most probable level for `score`, and the most probable option for `choice`. It first compares the two verdicts in the order fail, warn, pass: a move toward pass is `better` and a move toward fail is `worse`. When the verdicts are equal, it compares the values. For `score` and `noul` the direction that counts as better is the one the criterion's own predicates point at. Compare reads it from `pass_when` when the criterion has one, otherwise from `fail_when`, otherwise from `warn_when`. A `level_at_most` or `probability_at_most` in `pass_when` means lower is better. A `level_at_least` or `probability_at_least` in `fail_when`, or in a `warn_when` that is the only predicate, means lower is better. The opposite predicates mean higher is better. The pack loader rejects a criterion whose `pass_when` and `fail_when` point in opposite directions. Changed 2026-10-23: before this change, a criterion whose only predicate was `warn_when: { probability_at_least: n }` read as higher is better, so compare called a regression `better`. A value move of at least one level for `score` or 0.15 for `noul` in the better direction is `better`, in the worse direction is `worse`, and anything else is `same`. For `choice` an equal verdict is always `same`, because options have no order. A criterion asked in only one of the two reports is not in `changes`; it is listed in the compare document's `skipped` list with which run skipped it and why. Reason: this needs no new questions, no second question type, and no order swapping. Reconsider when: M-1 or the first before-and-after pairs in EV-9 show that single-image deltas miss changes designers see. Then the fallback is a pairwise Choice question with both images in the state, asked twice with the options swapped. | Must | US-3 | This document |
| FR-37 | `change` is `uncertain` when either report's finding for that criterion is `uncertain`. | Must | US-3, US-9 | FR-27 |
| FR-38 | Removed 2026-10-23. Order-swapped pairwise comparison is deferred. See FR-36. | Removed | | |
| FR-39 | Compare reports a summary with the count of criteria that improved, regressed, stayed the same, and were uncertain. | Must | US-3, US-14 | This document |

### 7.7 Gate

| ID | Requirement | Priority | Stories | Source |
| --- | --- | --- | --- | --- |
| FR-40 | `crit gate <image>` runs a report and exits 0 when no finding has the verdict `fail`, 1 when at least one does, and 2 when it could not run. | Must | US-4 | Brief, Integration |
| FR-41 | `.crit.yaml` may set `warn_fails_gate: true`, which makes `warn` verdicts fail the gate. The default fails only on `fail`. Nothing else is configurable in v1. Reason: no user has asked for more, and every knob is a thing a gate can be gamed through. Reconsider when: a project needs a per-criterion policy. | Should | US-4, US-9 | OQ-5 |
| FR-42 | Thresholds and gate policy are read from data at compose time, so changing them never needs a new request to TypeSafe. `--save-answers <file>` writes every raw answer from the ask stage, the `usage` object, and the SHA-256 fingerprint of the original image bytes to a JSON file. `--answers <file>` skips the ask stage, runs compose on that file, and makes no network call. When the image's fingerprint is not the one in the file, `--answers` stops with exit code 2 before prepare runs, and the message names the file and says that it belongs to another image. For `crit compare`, the file holds two runs, labelled `before` and `after`. Changed 2026-10-23: compare answers files added, so EV-1 can run compare offline. Changed 2026-10-24 by Benjamin Jackson: the image fingerprint and its check added (OQ-26 e). | Must | US-4 | Brief, Principles; EV-1 |
| FR-43 | The exit codes 0, 1, and 2 mean the same thing for every command. `report` and `compare` exit 0 when they ran, whatever the verdicts. | Must | US-4 | Brief, Integration |

### 7.8 Packs

| ID | Requirement | Priority | Stories | Source |
| --- | --- | --- | --- | --- |
| FR-44 | A pack is a directory that holds `pack.yaml` and a `fixtures/` directory. `pack.yaml` follows the pack schema below. The CLI bundles only each first-party pack's `pack.yaml`; the fixtures stay in the repository under `packs/<name>/fixtures/` because they serve `crit packs validate` and `crit packs test`, not a run. A pack contains no executable code, and the loader rejects any field the schema does not define. | Must | US-5, US-6 | Brief, Principles |
| FR-45 | Every criterion has `id`, `title`, `source`, `question`, `fix`, and at least one of `fail_when`, `warn_when`, or `pass_when`. | Must | US-6 | Brief, A pack |
| FR-46 | Removed 2026-10-23. A word-list lint for counting and hex colours is not needed, because the fixture tests under EV-4 catch a bad criterion. | Removed | | |
| FR-47 | Removed 2026-10-23. The pack cache and `crit packs add` are not needed, because packs are bundled with the CLI. See FR-11. | Removed | | |
| FR-48 | Removed 2026-10-23. `crit packs list` and `crit packs search` are not needed, because packs are bundled with the CLI. See FR-11. | Removed | | |
| FR-49 | `crit packs validate <dir>` checks a pack against the schema. It fails when a criterion's `fixtures` field has no positive fixture or no negative fixture. | Should | US-6 | Brief, The marketplace repo |
| FR-50 | `crit packs test <dir>` runs each criterion on the fixtures its `fixtures` field lists. It fails when a positive fixture does not produce `fail` or `warn`, or a negative fixture does not produce `pass`, and it names every fixture that disagreed. A negative fixture that produces `uncertain` counts as quiet, so it does not make the run fail, and the run counts those fixtures separately in its output. Changed 2026-10-24 by Benjamin Jackson ("Quiet, but counted"): before, a negative fixture had to produce `pass`, and `uncertain` counted as a disagreement. Reason: `uncertain` means the model did not raise the defect, and a report that shows it separately keeps the doubt visible without stopping a pack author for it. Reconsider when: EV-5 shows that criteria with many `uncertain` negatives disagree with people more often than the rest. | Should | US-6 | Brief, The marketplace repo |
| FR-51 | `.crit.yaml` names the packs to run and pins the model id. It may also set `screenshot`, the image path that the hook in FR-68 reads. The pack versions are the ones bundled with the installed CLI version, which the report records in `packs`. | Must | US-5 | Brief, The marketplace repo; NFR-5 |
| FR-52 | Removed 2026-10-23. Inline packs are not needed, because `--pack <dir>` covers house style. | Removed | | |
| FR-53 | The `packs/` directory of this repository holds the source of the seven first-party packs, one directory per pack, each with its `pack.yaml` and `fixtures/`. A CI job runs `crit packs validate` on every pack in every pull request. `crit packs test` asks Jev, so it runs under `npm run test:live` or in a CI job that a person starts by hand, and a pull request that changes a pack records the output of that run. Changed 2026-10-23: `crit packs test` no longer runs on every pull request, because CI must not spend money on each one (CS-21). The CLI build bundles each pack's `pack.yaml` from `packs/`. There is no `index.json`, no generated README, and no per-pack changelog. Reason: one publisher exists, one repository keeps pack versions and CLI versions in step with no cross-repository copy, and a reader can open `pack.yaml`. Changed 2026-10-23: the separate `deskcrit-packs` repository is folded into `packs/`. Reconsider when: a second publisher wants to ship a pack, or the fixtures make a clone of this repository too slow. Then move `packs/` to its own repository. | Must | US-5, US-6 | Brief, The marketplace repo |
| FR-54 | A pull request that adds a criterion to a pack under `packs/` must list at least one positive fixture that triggers it and at least one negative fixture that does not in the criterion's `fixtures` field, with the images under the pack's `fixtures/` directory. Every criterion in a first-party pack carries 5 positive and 5 negative fixtures. Changed 2026-10-24 by Benjamin Jackson: before, the pull request listed exactly one positive and one negative fixture, and no count was set for first-party packs. Reason: at 5 and 5 per criterion, the agreement floor of 0.8 (OQ-9) means at least 8 of 10 fixtures agree, so one wrong label no longer moves a criterion across the floor by itself. A third-party pack pull request still needs only one of each. Reconsider when: Benjamin Jackson may raise the count to 10 positive and 10 negative per criterion (about 700 images for typography and layout) after the first EV-5 run, if the rates at 5 and 5 are too unsteady to trust. Every pack declares a license. Every fixture image has a sidecar entry in the pack's `fixtures/ATTRIBUTION.md` with a rights basis from a closed list of four: own work licensed under the pack license, public domain with the source named, an open license that permits redistribution and commercial use (CC0, CC BY, CC BY-SA, the UK Open Government Licence, or MIT or Apache licensed documentation) with the attribution text, or written permission from the owner attached to the pull request. Fair use or fair dealing is never a basis, because it is a defence and cannot be passed on under MIT. CC NC and CC ND images are refused. A fixture captured from a live page also records the source URL, capture date, viewport, device scale factor, and browser version, and is captured once and committed, never re-fetched in CI. No fixture shows a face of a real person, personal data, or a logged-in state. Each fixture file is at most 2 MB. Reason: the repository is public and MIT licensed, and one takedown would remove a fixture and break the test that depends on it. Review trigger: a takedown notice, or a fixture type the four bases cannot cover. Fixtures are made blind to the scores, by four rules here and a fifth in EV-4. Changed 2026-10-24 by Benjamin Jackson (crit-cy8.38): before, no rule said when a fixture may change, and on 2026-10-24 agents changed the basics fixtures after they read Jev's scores, until the fixtures passed. Examples are body text cut to 3 px, grey text that is almost invisible, abstract grids, and loud stripes. Benjamin's words: "That's gaming the test. These tests need better constraints." A scored run is a run of `npm run test:live` whose answers are kept under `evals/agreement/runs/`. Rule 1: a fixture is written and committed before any scored run uses it, and is never changed because of a score. A fixture may be replaced only for a reason that the pull request states without reference to any answer from Jev, and only before the next scored run. Rule 2: each criterion in [GUIDELINES.md](../GUIDELINES.md) states the realistic range of its defect, such as body text at 11 to 14 px or a contrast ratio of 2.5 to 4.4:1, in one `Defect range` line per criterion in a fixed form that a test can parse. Each positive fixture sits inside that range. Each negative fixture sits on the side of the range that is free of the defect, which the range names as clean above or clean below, at or past the first value one step beyond the range at the precision the range is written in. For faint text with a contrast range of 2.5 to 4.4, clean above, a negative must be 4.5 or more, so a negative at 1.8 or at 4.45 fails. A contrast range that ends one step below a WCAG minimum, such as 4.4 for body text, makes the clean side start at that minimum. Changed 2026-10-24 by Benjamin Jackson: before, a negative fixture had only to sit outside the range, on either side. Reason: a negative that is fainter or smaller than every positive, or that sits just past the edge of the range, is not a clean example of a design free of the defect, so it does not test whether the criterion stays quiet on good work. Reconsider when: a defect has bad values on both sides of a clean band, such as text that is both too small and too large, so that one clean side cannot describe it. The range and the properties that the defect changes are also declared in machine form next to the criterion's templates, in `packs/<pack>/templates/<criterion-id>.defect.json`, and not in `pack.yaml`, because `crit` never reads them. A test fails when the GUIDELINES.md line and the `.defect.json` file state different ranges, so the two copies cannot drift apart. Where the renderer can measure the range, as for a font size, a contrast ratio, or an offset, `npm --prefix packs run verify` fails a fixture outside it. Rule 3: the positive and the negative fixture of a pair differ only in the declared defect properties, and `verify` fails a pair whose computed styles differ in any other property. Rule 4: before the first scored run of a pack, `npm --prefix packs run sheets -- <pack>` writes one contact sheet per criterion, with each positive and negative pair side by side. An agent first looks through the sheets for obvious extremes, such as text too small or too pale to be real, working from a folder that holds only the sheets and no scores. Then Benjamin Jackson checks every sheet for realism. A replacement fixture under rule 1 gets his check too, together with its rule 1 reason, which names no answer from Jev. The rules apply to fixtures made before 2026-10-24 as well. The basics pack, whose fixtures were changed after scoring, gets the rule 4 check and then one new scored run, which decides under rule 5. Reason: an instruction to rework every fixture that misses the cut-off and run again rewards a defect that is easier to see, not one that is more real, so the scores then measure the fixtures and not the criterion. Reconsider when: most defects in a pack have a range that the renderer cannot measure, so that rules 2 and 3 are checked only by eye, or the realism check in rule 4 holds a pack back for more than a week. | Must | US-6 | Brief, The marketplace repo |
| FR-55 | Seven first-party packs ship in v1, encoding the guidelines in [GUIDELINES.md](../GUIDELINES.md), one pack per section of that catalog: `typography`, `layout`, `color`, `accessibility`, `ux`, `dataviz`, and `art-direction`. | Must | US-1 | Brief, First-party packs |
| FR-56 | A criterion that encodes a folk rule, such as the rule of thirds or the Z-pattern, says so in its title or source and defines `warn_when` only, never `fail_when`, so its most severe verdict is `warn`. | Should | US-1 | Brief, Principles |
| FR-57 | The `accessibility` pack records the version of each standard it encodes, in the `source` text of each criterion, for example `W3C, WCAG 2.2, Success Criterion 1.4.3`. Changed 2026-10-23: the version goes in `source`, so the pack schema needs no new field. | Must | US-5 | Brief, Risks |
| FR-58 | Packs that ship example images as Jev criteria. | Won't | none | NG-9; OQ-3 |

Pack schema:

| Field | Level | Required | Meaning |
| --- | --- | --- | --- |
| `name` | pack | yes | Lowercase pack name, unique among the packs a run loads. |
| `version` | pack | yes | Semantic version of the pack. |
| `title` | pack | yes | Human-readable title. |
| `applies_to` | pack, criterion | no | List of platforms, for example `web`, `print`, `slides`. Absent means all. |
| `license` | pack | yes | License identifier. |
| `criteria` | pack | yes | List of criteria. |
| `id` | criterion | yes | Lowercase id, unique within the pack. |
| `title` | criterion | yes | Short name of the defect or quality. |
| `source` | criterion | yes | Book, standard, or paper cited. |
| `link` | criterion | no | URL of the source. |
| `question.type` | criterion | yes | `noul`, `choice`, or `score`. |
| `question.instructions` | criterion | yes | One literal, atomic question. Refers to the image by its state path. |
| `question.criteria` | criterion | for `noul` and `choice` | What each option means. For `noul`, keys `true` and `false`. A `noul` question asks whether the defect is present, so `true` always means the defect is there and `false` means it is not. Added 2026-10-24 by Benjamin Jackson. Reason: a reader or agent must be able to read `distribution.true` in the JSON with no lookup of the question. A question about the good case, such as whether a heading is clearly larger than the body text, made 0.97 read the wrong way round. Reconsider when: a criterion cannot be phrased as a defect. |
| `question.levels` | criterion | for `score` | Ordered list of level descriptions, index 0 first. |
| `fail_when`, `warn_when`, `pass_when` | criterion | at least one | Each holds one predicate, such as `probability_at_least` or `level_at_most`. See the verdict rule under FR-25. |
| `min_confidence` | criterion | no | Below this, the verdict is `uncertain`. Applies to choice and score answers. The loader rejects it on a `noul` criterion (FR-27). Changed 2026-10-24: before, this row said OQ-21 held what it means for `noul`. |
| `locate` | criterion | no | When true, ask a Box question for the region. |
| `locate_instructions` | criterion | when `locate` is true | What the Box question asks to mark, for example "the block of body text that is faint". Added 2026-10-23 (FR-16, an optional field under AC-2). |
| `requires` | criterion | no | List of facts paths the criterion needs, for example `facts.viewport_width`. Each path starts with `facts.`, and the loader rejects a pack with any other path (OQ-24). Changed 2026-10-24 by Benjamin Jackson: before, the schema did not check the prefix, and build stopped with `CouldNotRunError` when it met such a path. |
| `fix` | criterion | yes | Fix hint written by a person. |
| `fixtures.positive` | criterion | for `crit packs validate` | List of image paths, relative to the pack directory, that the criterion must flag. |
| `fixtures.negative` | criterion | for `crit packs validate` | List of image paths, relative to the pack directory, that the criterion must pass. |

Example `fixtures` field for `faint-body-text`:

```yaml
fixtures:
  positive: [fixtures/faint-body-text/grey-on-grey.png]
  negative: [fixtures/faint-body-text/dark-on-white.png]
```

### 7.9 CLI

| ID | Requirement | Priority | Stories | Source |
| --- | --- | --- | --- | --- |
| FR-59 | The package declares two commands, `deskcrit` and `crit`, which behave the same. | Must | US-1 | Brief, Stack |
| FR-60 | The commands are `crit report <image> [--pack <dir>...] [--context <key=value>...] [--facts <file>] [--json] [--save-answers <file>] [--answers <file>]`, `crit compare <before> <after>` with the same options, `crit gate <image>` with the options of `report` except `--save-answers`, and `crit packs validate <dir>` and `crit packs test <dir>`. FR-42 defines `--save-answers` and `--answers`. Changed 2026-10-23: `crit gate` accepts `--answers`, so EV-1 can run gate offline. | Must | US-1 to US-6 | Brief, Integration |
| FR-61 | Errors go to stderr. Only the report goes to stdout, so `crit report --json` output can be piped to a JSON parser. | Must | US-1 | This document |
| FR-62 | Removed 2026-10-23. A deprecation policy waits for 1.0. | Removed | | |

### 7.10 Library API

| ID | Requirement | Priority | Stories | Source |
| --- | --- | --- | --- | --- |
| FR-63 | The package exports `prepare`, `build`, `ask`, `compose`, `compare`, and `gate` as separate functions, plus the TypeScript types of their inputs and outputs. `compare` and `gate` take finished reports and call no other stage. Changed 2026-10-23: `compare` and `gate` added, so that the CLI is built only from exported functions in every mode. | Must | US-13 | Brief, Integration |
| FR-64 | `ask` takes the TypeSafe adapter as an argument, so a caller can pass a stub or another backend. Every adapter returns the answers and the `usage` object that FR-20 defines. | Must | US-13 | FR-20 |
| FR-65 | The CLI is built only from the six exported functions in FR-63, so the library and the CLI give identical results on identical inputs. | Must | US-13 | This document |

### 7.11 Claude Code plugin

| ID | Requirement | Priority | Stories | Source |
| --- | --- | --- | --- | --- |
| FR-66 | The plugin ships a skill that teaches the loop: build, screenshot, `crit report --json`, fix the top findings, screenshot, `crit compare`. | Must | US-14 | Brief, Integration |
| FR-67 | The skill stops the loop when the gate passes or when two rounds in a row show no criterion improved. | Must | US-14 | Brief, Integration |
| FR-68 | The plugin ships an optional hook that runs `crit gate` on the image at the `screenshot` path in `.crit.yaml` after a UI file changes. When no file is at that path, the hook does nothing. The skill tells the agent to save its latest screenshot at that path. The hook turns a `crit gate` exit code 1 into the exit code that makes Claude Code block the change, and reports exit code 2 as an error that does not block. Changed 2026-10-23: the image source is defined, because `crit` takes no screenshots (NG-1). | Should | US-14 | Brief, Integration |
| FR-69 | The plugin runs the CLI and holds no judgment logic of its own. | Must | US-14 | Brief, Integration |

## 8. Output contract

The JSON output is the user interface for agents, and it changes slowly. Every document has a `schema_version` that follows semantic versioning. Within one major version of `schema_version`, the shape changes only by adding optional fields. A change that removes, renames, or retypes a field needs a new major version. The JSON schema files for report, compare, and gate are durable artifacts, stored in the repository and checked by EV-2.

### 8.1 Report

The report has these top-level fields: `schema_version`, `mode` with the value `report`, `tool` with name and version, `image` with path and size, plus `padded: true` when prepare padded the image under FR-8, `context`, `packs` with name and version, `model`, `findings`, `skipped`, and `usage`.

Example with two findings. The numbers are illustrative.

```json
{
  "schema_version": "1.0.0",
  "mode": "report",
  "tool": { "name": "deskcrit", "version": "0.1.0" },
  "image": { "path": "home.png", "width": 1440, "height": 900 },
  "context": { "purpose": "landing page", "audience": "small business owners", "platform": "web" },
  "packs": [ { "name": "typography", "version": "1.0.0" } ],
  "model": "jev-1.14.0",
  "findings": [
    {
      "criterion": "typography/faint-body-text",
      "title": "Body text reads as faint",
      "verdict": "fail",
      "distribution": { "true": 0.84, "false": 0.16 },
      "confidence": null,
      "region": { "x": 120, "y": 540, "width": 620, "height": 180 },
      "source": "W3C, WCAG 2.2, Success Criterion 1.4.3 Contrast (Minimum)",
      "link": "https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum",
      "fix": "Darken the text or lighten the background. For the exact ratio, run axe-core; WCAG wants 4.5:1 for body text and 3:1 for large text.",
      "model": "jev-1.14.0"
    },
    {
      "criterion": "typography/single-focal-point",
      "title": "One focal point",
      "verdict": "warn",
      "distribution": { "0": 0.22, "1": 0.63, "2": 0.15 },
      "confidence": 0.72,
      "region": { "x": 80, "y": 60, "width": 1280, "height": 320 },
      "source": "Donis A. Dondis, A Primer of Visual Literacy (1973)",
      "link": null,
      "fix": "Pick the one thing the viewer must see first. Make it larger, higher-contrast, or more isolated, and demote the rest by one step in size or weight.",
      "model": "jev-1.14.0"
    }
  ],
  "skipped": [
    { "criterion": "layout/reflow-at-320", "reason": "requires facts.viewport_width, which the facts file does not have" }
  ],
  "usage": { "requests": 1, "input_tokens": 41250, "cost_usd": 0.0017, "latency_ms": 1840 }
}
```

### 8.2 Compare

The compare document has `schema_version`, `mode` with the value `compare`, `tool`, `before` and `after`, each a report without its own `usage`, `model`, `changes`, `summary`, and `usage`. Each entry in `changes` has `criterion`, `change` with the value `better`, `worse`, `same`, or `uncertain`, `before` and `after`, each holding the verdict and the value read under FR-36, and `model`. `skipped` lists every criterion that only one run asked, with the run and the reason. `summary` has the counts `improved`, `regressed`, `same`, and `uncertain`. Each `skipped` entry has `criterion`, `run` with the value `before` or `after`, and `reason`. `changes` and `skipped` sort by criterion. `usage` holds the sums over both runs (FR-33).

### 8.3 Gate

The gate document is a report with `mode` set to `gate` and one more field, `gate`, which holds `passed` as a boolean, `policy` with the one key `warn_fails_gate` as it was applied, and `blocking` as the list of criterion ids that caused a failure. The exit code agrees with `passed`.

## 9. Non-functional requirements

| ID | Requirement | Reason | Reconsider when |
| --- | --- | --- | --- |
| NFR-1 | `crit` runs on every Node.js release that is in active or maintenance long-term support on the release date. The `engines` field in `package.json` sets only a minimum: `>=` the oldest Node.js release in active or maintenance long-term support. The CI matrix covers every Node.js release in active or maintenance long-term support, and it is updated within 30 days of a release entering or leaving long-term support, not only when a new version of `deskcrit` is published to npm. Dropping a Node.js major release from `engines` needs a new major version of `deskcrit`, because users who pin a major version expect it to keep running where it ran. This agrees with AC-2, which allows only additive changes. Changed 2026-10-23: added the rule for when `engines` and the CI matrix change; before, the row named no such rule. | Most agent environments have a supported Node.js. An exact list of long-term support majors in `engines` blocks Current releases such as 25 and 27. A CI list updated only when a release is published lags new long-term support releases. | A target environment lacks Node.js. Node.js changes its release schedule, or npm adds a better way to state supported runtimes. |
| NFR-2 | `crit` ships as one bundled JavaScript file that runs with `npx deskcrit` with no separate install step. The image library `sharp` is the only native dependency. | An agent can run it on any machine with Node.js. | `sharp` cannot be bundled for a common platform. |
| NFR-3 | `crit` has no browser dependency. | Capture is the caller's job, and a browser makes the install heavy. | Never in v1. |
| NFR-4 | Every run reports its latency and cost. Each image request, with every question for that image, takes a median of under 1 s and at most 3 s, and costs under $0.002. Decided 2026-10-24 by Benjamin Jackson. Before, no target was set until M-1 measured the figures. | In M-1, one request with twenty questions took a median of 417 ms on the full-size slice and 311 ms on the shrunk whole page, and at most 905 ms on a cold start. It cost $0.00030 on the slice and $0.00018 on the whole page (spike/cost_summary.csv, latency_ms and cost_usd_per_request, with_purpose). The targets leave room for full packs, whose text grows with the question count. | The first measured full seven-pack run, a new pinned model version, or a change to TypeSafe's price or image limits (JC-7, JC-10). |
| NFR-5 | The same prepared image, the same pinned packs, the same pinned model, and the same context give the same verdicts. Prepare, build, and compose are deterministic. Ask is the only stage whose output may vary, and EV-6 measures how much. | Agents and gates need repeatable results. | EV-6 shows that run-to-run movement reaches the default `min_confidence` in OQ-10. Changed 2026-10-24: before, the trigger was self-consistency below a floor in EV-6, and that floor is dropped (OQ-9). |
| NFR-6 | A project with a `.crit.yaml` never sends `jev-latest`. It sends the pinned versioned model id. | Model updates change accuracy, so thresholds are tuned per version. | TypeSafe guarantees stable answers across model releases. |
| NFR-7 | Every image sent has each side between 280 and 1568 pixels, is PNG or JPEG, is upright, and has no metadata. | TypeSafe's image limits. Metadata can leak private data. | TypeSafe changes its limits. |
| NFR-8 | Every request with an image carries the header `TypeSafe-Danger-Zone-Images: true`. | TypeSafe requires the opt-in for image support. | TypeSafe makes image support generally available. |
| NFR-9 | No question asks for arithmetic, counting, or a hex colour. A number a criterion needs comes from the facts file. | Jev is unreliable at these tasks. | TypeSafe documents that a Jev version is reliable at them. |
| NFR-10 | The state holds each image once, and questions refer to it by path. | Each image reference adds the image again to the expanded request. | TypeSafe changes how references expand. |
| NFR-11 | The context for each question stays under 32,000 tokens. Build stops with exit code 2 if a facts file would exceed it. | The default per-question context limit is 32,000 tokens. | TypeSafe raises the limit. |
| NFR-12 | Text inside the design, such as "this design is excellent", does not change the verdict. EV-7 measures this on adversarial fixtures. | TypeSafe documents that content can steer the model. | Never. |
| NFR-13 | A pack contains no executable code. The loader parses YAML into data only, with no custom tags. | A pack from a stranger is safe to load and reviewable by a non-programmer. | Never. |
| NFR-14 | `crit` reads the TypeSafe API key from the `TYPESAFE_API_KEY` environment variable and never writes it to output or logs. | Output is pasted into issues and agent transcripts. | Never. |

## 10. Jev and TypeSafe constraints

These come from TypeSafe's published limits and known weaknesses for `jev-1.13.0` and `jev-1.14.0`, as recorded in [BRIEF.md](../BRIEF.md#jev-specific-constraints-the-design-respects) (BRIEF.md uses the short names `jev-1.13` and `jev-1.14` and is kept as first written). This document adds claims about TypeSafe beyond the brief only where it cites TypeSafe's documentation (FR-20, OQ-10).

| ID | Constraint | Design response |
| --- | --- | --- |
| JC-1 | Images must have each side between 280 and 1568 pixels, in PNG or JPEG, upright. | Prepare resizes, rotates, strips metadata, pads a short side, and refuses an image it would shrink below half size. FR-6 to FR-8, FR-73, NFR-7. |
| JC-2 | Jev is unreliable at arithmetic, counting, and hex colours. | Packs ask about visible symptoms. Numbers come from the facts file. Fixture tests catch a criterion that asks the model to count. NFR-9, EV-4. |
| JC-3 | Choice option order can sway the answer. | In report mode a pack lists its `choice` options in a fixed order, and reordering them is a new pack version, so a verdict never shifts for an unchanged design within one version. Compare under FR-36 compares verdicts first, so an option swap that leaves the verdict alone reports `same`. If pairwise questions are added under FR-36's review trigger, they are asked twice with the options swapped. |
| JC-4 | Per-question context is 32,000 tokens by default. | The state is the image, the context, and the facts file only. FR-17, NFR-11. |
| JC-5 | Instructions are read literally, and criteria must align with them. A Noul where true means no underperforms. | Pack review and fixture tests check each criterion. The schema guide says `true` is the defect. FR-45, FR-50. |
| JC-6 | Each use of an image reference adds the image again to the expanded request. | The image goes in the state once and questions point at it by path. FR-15, NFR-10. |
| JC-7 | Image support needs the opt-in header and is labelled not production-ready. Limits and request format can change between releases. | One adapter interface, the header on every image request, and the model id on every finding. FR-19, FR-20, NFR-8. |
| JC-8 | Accuracy changes as models update. | Pin the model, tune thresholds per model version, never use `jev-latest` in a pinned project. FR-22, NFR-6. |
| JC-9 | Text in the design can steer the model. | Adversarial fixtures in the evaluation set. NFR-12, EV-7. |
| JC-10 | TypeSafe publishes about 100 ms for text requests and no figure for image requests. Price is $0.042 per million input tokens, with output free. Measured in M-1 on 2026-10-24 with `jev-1.14.0`: an image request with twenty questions took a median of 394 to 417 ms on the 1280 x 1520 px slice and 311 to 397 ms on the 515 x 1568 px whole page, and at most 905 ms on a cold start. A text-only request with the same twenty questions took 249 ms (spike/cost_summary.csv, latency_ms; spike/run_costs.csv, baseline_text_only). | Print latency and cost on every run. Targets are set in NFR-4. Changed 2026-10-24: before, targets waited for M-1. |
| JC-11 | Questions in one request are evaluated independently and in parallel. | One request per image with every question for that image. FR-19. |

## 11. Architecture constraints

An agent must be able to delete `prepare`, `build`, `ask`, `compose`, or the pack loader and rebuild it from this document and evaluations EV-1 to EV-7. The six items in the table below must survive that deletion. A change to any of them needs review by the owner named in section 1.

### 11.1 Durable and disposable

| Durable | Where it lives |
| --- | --- |
| This document | `docs/PRD.md` |
| The pack schema | A JSON Schema file in the repository, checked by EV-3 |
| The output JSON schemas for report, compare, and gate | JSON Schema files in the repository, checked by EV-2 |
| The CLI commands, flags, and exit codes | FR-59 to FR-61, checked by EV-1 |
| The fixture set and the durable evaluations | Section 12 |
| The TypeSafe adapter interface | FR-20 |

Disposable: the implementation of every module, including prepare, build, ask, compose, the renderers, the pack loader, and the plugin's skill text. Unit tests of those implementations are disposable too.

### 11.2 Component rules

| ID | Rule |
| --- | --- |
| AC-1 | Each pipeline stage, prepare, build, ask, and compose, is a separate component that can be rewritten without changing the others. Stages talk only through the typed values the library API exports. |
| AC-2 | The CLI surface and the JSON output change only by adding optional fields and flags. The package exports (`src/index.ts` and the `exports` map in `package.json`) may change before version 1.0, and each change is noted in this PRD. At version 1.0 they join the slow layer and change only by adding. Changed 2026-10-24 by Benjamin Jackson: before, this rule named only the CLI surface and the JSON output, and the package exports were not covered. Reason: the package is at version 0.0.0, and `compare` and `gate` will still change the types that pass between the stages. Reconsider when: the version reaches 1.0, or an outside project depends on the library. |
| AC-3 | A person or an agent can understand each component's purpose and rules in about ten minutes. A component that grows past that is split. |
| AC-4 | Each component can be verified at its own boundary without the others. Prepare is tested with image files, build with packs and a prepared image, ask with a stub adapter, and compose with recorded answers. |
| AC-5 | Each piece of state has one owner that writes it. `.crit.yaml` is written only by the person. The fixture set is written only by people, through review. |
| AC-6 | Durable evaluations run against the CLI and the JSON files, not against internal functions. A rewrite in another language would still pass them. |
| AC-7 | Prepare, build, and compose are pure functions with no hidden state. Network access happens only in ask. File writes happen only in the CLI layer that writes the report to stdout and in the CLI layer that writes the `--save-answers` file (FR-42). No stage writes a file. |
| AC-8 | Only the adapter behind FR-20 knows TypeSafe's request format and how TypeSafe reports usage. No pack field and no other module depends on either. Other modules read usage only from the `usage` object the adapter returns. |

### 11.3 Recorded constraint: TypeScript on Node.js

The implementation is TypeScript on Node.js, because one bundled file runs with `npx`, `sharp` resizes images, and TypeSafe ships an official JavaScript SDK. Reconsider if TypeSafe ships an SDK or image support that makes another runtime simpler.

## 12. Evaluation plan

Evaluations come in two tiers. Ephemeral unit tests, in section 12.1, check one module's implementation and are deleted with it. Durable evaluations, EV-1 to EV-10 in section 12.2, run against the `crit` command and its JSON output, so they still pass after any rewrite.

### 12.1 Ephemeral tests

Each module, such as prepare or compose, has unit tests written next to it. A rewrite of the module deletes its unit tests and writes new ones. No requirement in this document may be checked only by an ephemeral test.

### 12.2 Durable evaluations

| ID | Evaluation | Pass condition |
| --- | --- | --- |
| EV-1 | Golden-output tests of the CLI. Run each command on fixed images with `--answers <file>` and a recorded answer file, and compare stdout, stderr, and exit code with stored expected output. The test serialises the JSON with sorted keys before it compares. The volatile fields `usage.latency_ms` and `tool.version` are left out of the comparison. | Identical JSON outside the volatile fields, and identical exit codes. |
| EV-2 | Every JSON document the CLI writes validates against the report, compare, or gate schema. | 100 percent valid. |
| EV-3 | Every first-party pack validates against the pack schema. | 100 percent valid. |
| EV-13 | Removed 2026-10-23. The guideline counts no longer appear outside GUIDELINES.md, so there is nothing to keep in sync. | Removed. |
| EV-4 | Pack fixture tests: each criterion fires on its positive fixtures and stays quiet on its negative fixtures. A verdict of `uncertain` on a negative fixture counts as quiet and is counted separately. Changed 2026-10-24 by Benjamin Jackson ("Quiet, but counted"): before, only `pass` was quiet. Reason and review trigger: see FR-50. The fixtures follow the blind rules in FR-54. Rule 5: the first scored run on a pack's frozen fixture set decides, once, whether each criterion ships with `fail`, ships with `warn` (EV-5), or is removed (R-4). The frozen set is the list of PNG hashes in the pack's `fixtures/rendered.json` at the commit that the run used. No criterion is run again on the same set to get a better result. The one exception is the second blind wording of seven layout criteria in the R-4 row ("Blind wording, same pairs", 2026-10-24); it is closed and is not a precedent. A larger fixture set, such as 10 positive and 10 negative per criterion (FR-54), must contain every fixture of the old set unchanged, and its new fixtures are written blind under rule 1. Each scored run keeps a SHA-256 of the sorted PNG hashes of its frozen set next to its answers, so the set it used can be checked later. A change to the evidence fields of `rendered.json` that leaves every PNG the same does not make a new set. The agreement harness refuses a live run on a set that a stored hash shows was already scored with the same model, unless `--rerun-same-set` is passed, for example after a run that stopped part way. Only a person passes that flag, and an agent never does. Ratified 2026-10-24 by Benjamin Jackson. Reason: an agent that can rerun a scored set can run it until it passes, which is the loop rule 5 forbids. Reconsider when: runs that stop part way become common enough that a person rerunning by hand holds packs back. Changed 2026-10-24 by Benjamin Jackson (crit-cy8.38): before, this row did not say how many runs may decide. Reason: when a run can be repeated until it passes, the pass shows how often the run was repeated, not how well the criterion works. Reconsider when: EV-6 shows that two runs on the same frozen set give different decisions for a criterion, so that one run is too noisy to decide. | Every fixture agrees with its label, or the criterion is demoted under EV-5. |
| EV-5 | Agreement between Jev and human labels on the fixture set, per criterion. The fixture set has at least 100 designs with human-labelled defects across the seven domains, and at least 30 before-and-after pairs with a human preference. When TypeSafe releases a new model version, EV-5 and EV-6 run on it before any project pins it. | Each criterion at or above the agreement floor may ship with `fail`. Below the floor it ships with `warn` as its most severe verdict. The floor is set in OQ-9. It applies from the first EV-5 run on, and was not applied to the M-1 spike. Changed 2026-10-24 by Benjamin Jackson ("Quiet, but counted"): before, only `pass` on a negative fixture agreed with its label. Now an `uncertain` verdict on a negative fixture counts as agreeing, and the run reports how many there were. Reason and review trigger: see FR-50. Changed 2026-10-24 by Benjamin Jackson: before, the row did not say how the 100-design minimum applies while only some packs exist. Now the 100-design minimum and the spread across seven domains apply once all seven first-party packs exist, which is milestone M-3. M-2 measures EV-5 on two of the seven domains, typography and layout, and does not claim the full EV-5. Each first-party criterion carries 5 positive and 5 negative fixtures (FR-54). Reason: only typography and layout exist at M-2, so a spread across seven domains cannot be met, and measuring on more fixtures now is better than relying on EV-4 alone. Reconsider when: Benjamin Jackson may raise the count to 10 positive and 10 negative per criterion (about 700 images for typography and layout) after the first EV-5 run, if the rates at 5 and 5 are too unsteady to trust. |
| EV-6 | Wobble check, run once each time the pinned model version changes: ask the M-1 spike questions (spike/questions.yaml) 5 times on the same image with the same model, and measure how far the probabilities move between runs. Changed 2026-10-24 by Benjamin Jackson: before, EV-6 asked each criterion several times to measure self-consistency against a floor. `crit` asks Jev once per image and never repeats a run, in the product or in the regular evaluations. Reason: Jev is trained to give the same answer each run, so repeat runs measure server noise, not doubt in the model. In M-1, no option probability on a kept question moved more than 0.11 between runs, and reported confidence moved at most 0.22 (spike/results/2026-10-24T04-40-39-982Z-slice-with-purpose.json and -slice-without-purpose.json). Reconsider when: TypeSafe stops training Jev to give stable answers across runs, or a pinned model version fails this check. | The default `min_confidence` in OQ-10 still sits above the largest movement. |
| EV-7 | Adversarial fixtures with text that praises or condemns the design. | Verdicts match the same design without the text. |
| EV-8 | Removed 2026-10-23. Taste-gap fixtures are research, not an evaluation. | Removed. |
| EV-9 | Compare on the human-labelled before-and-after pairs in the fixture set. | On the 30 human-labelled before-and-after pairs, `change` agrees with the human preference at or above the floor in OQ-9. |
| EV-10 | The loop test: Claude Code with `crit` and the plugin on a deliberately bad page. | Count of rounds to clear the gate, and a designer agrees the result is better. Decided 2026-10-24: the round-count target stays unset, because M-1 ran no loop test and there is nothing to set it from. Before, the target was to be set after M-1. Reconsider when: the first EV-10 run, in M-2 or later. |
| EV-11 | Removed 2026-10-23. FR-33 already prints the cost and latency of every run. | Removed. |
| EV-12 | Removed 2026-10-23. EV-5 now runs on each new model version before any project pins it. | Removed. |

## 13. Assumptions, dependencies, and risks

| ID | Risk or assumption | Mitigation | Revisit when |
| --- | --- | --- | --- |
| R-1 | TypeSafe image support is not production-ready. It needs an opt-in header, and its limits and format can change. This is the central dependency. | One adapter interface, the model id on every finding, thresholds pinned per model version, no `jev-latest`. | TypeSafe changes the image request format, or another API returns calibrated probabilities for many questions over one image in one request. |
| R-2 | We do not know how well Jev judges design images. No published results exist, and TypeSafe's cookbooks cover text. | Milestone M-1 measures agreement before other code is written. Outcome, 2026-10-24: on the full-size slice Jev agreed with Benjamin Jackson on 10 of 17 questions, with and without the purpose line. It agreed on 7 of 8 yes-or-no questions, 1 of 3 choice questions, and 2 of 6 graded questions. All 4 graded misses were exactly one level milder than Benjamin, and none was further off (spike/agreement_summary.csv, slice, overall; spike/comparison.csv). Benjamin decided to continue (M-1). Watch the one-level-milder bias on graded criteria: EV-5 calibrates each graded criterion against its own fixtures, and no pack shifts its thresholds globally to make up for it. | EV-5 results on the fixture set. Changed 2026-10-24: before, this cell said "M-1 results. Agreement below the floor on most criteria stops the project." That made the OQ-9 floor, set after the spike figures were read, a stop rule for M-1. The M-1 decision rested on Benjamin's judgment of the figures instead, and the floor applies from EV-5 on. |
| R-3 | "Reads as faint" disagrees with the 4.5:1 contrast line in both directions. | The report never claims conformance, and fix hints name the measuring tool. FR-34. | Never. |
| R-4 | Jev answers the question as written, so a vague criterion gives the same wrong answer every run. | Pack CI with positive and negative fixtures. FR-49, FR-50, EV-4. | A criterion fails EV-4 twice after rewording. Then remove it. Changed 2026-10-24 by Benjamin Jackson (crit-cy8.38): before, the row did not limit the runs after a rewording. Now a question may be reworded once after it fails. The scored run after that rewording decides under EV-4 rule 5, and there are no further runs. The fixtures stay frozen. Reason: a rewording is written after the author reads the scores, so each extra rewording and run tunes the question to the fixtures. Reconsider when: a criterion fails because of a wording fault that is found only after the deciding run. Changed 2026-10-24 by Benjamin Jackson ("Blind wording, same pairs"): before, each question got one rewording and no more. Now the seven layout criteria that failed after their one rewording (crowded-unrelated-elements, figure-merges-with-ground, groups-not-separated, inconsistent-repeated-styles, off-grid-block, uneven-gutters, and white-space-scattered) each get one more wording. It is written blind from GUIDELINES.md alone, in general terms, and it is scored on the same frozen fixtures by a run that a person starts with `--rerun-same-set`. That run decides, and there are no further tries. Reason: the first rewordings asked about measured geometry that the model cannot judge by eye, so the fault was in the wording style and not in the rules. Reconsider when: the second blind rewording fails for most of these seven criteria, which would show that the rules cannot be judged at this image size. Outcome, recorded after that change: the run on 2026-10-24 (commit 86c0a50) found all seven criteria still failing, so all seven were removed. That meets the change's own "Reconsider when" trigger, so the exception is closed and is not a precedent. |
| R-5 | Gaming: an agent raises the score without improving the page, for example by hiding a second call to action. | Compare reads each criterion from two full reports, and in EV-10 a designer checks that the result is better. | EV-10 shows a designer rejecting results that cleared the gate. |
| R-6 | Cost per run is unknown until M-1, because the token cost of an image request is unknown. | Every run prints its cost. FR-33. Outcome, 2026-10-24: one request with twenty questions cost $0.00030 on the full-size slice (7,129 input tokens) and $0.00018 on the shrunk whole page (4,193 input tokens) (spike/cost_summary.csv, with_purpose). The slice image is about 5,090 of those tokens: 7,098 without the purpose line minus 2,008 for the same questions with no image (spike/run_costs.csv). From about 100 text tokens per question, a full run of about 200 questions on one slice is near 25,000 tokens, about $0.001. This is an estimate, because M-1 measured no full run. One image costs one request. The estimate is far under the NFR-4 cost target. | The first measured full seven-pack run. If it costs more than the NFR-4 target, packs are split by mode. Changed 2026-10-24: before, the trigger was M-1 results. Changed 2026-10-24 by Benjamin Jackson's decision to remove slicing (FR-73): before, the mitigation said a tall page cut into slices under OQ-1 costs one request per slice plus one for the whole page. Now `crit` asks once per image, and the caller sends a tall page in parts. |
| R-7 | Guidelines change. WCAG 2.2 came in 2023, EN 301 549 v4.1.1 in 2026, and the ADA Title II dates moved in April 2026. | Packs are versioned, and the accessibility pack records the standard version it encodes. FR-57. | Any cited standard publishes a new version. |
| R-8 | Removed 2026-10-23. NG-1 already says that callers produce the screenshot. | Removed | Removed |
| R-9 | Removed 2026-10-23. Section 11.3 and OQ-12 already name the TypeSafe SDK and `sharp`. | Removed | Removed |

## 14. Milestones and release plan

| ID | Milestone | Exit criterion | Delivers |
| --- | --- | --- | --- |
| M-1 | Spike. One screenshot, twenty hand-written questions across domains, the danger-zone header, and a spreadsheet of Jev's answers against one designer's answers. Changed 2026-10-23 from two designers to one: the owner, Benjamin Jackson, is the only designer available, and the spike must not wait for a second. Without a second designer there is no figure for how well two people agree, so the decision reads Jev's agreement against one person's judgment. Reconsider when: a second designer is available, or the agreement figures are too close to the continue-or-stop line to decide. Then a second designer answers the same twenty questions. | A written decision to continue or stop, with agreement figures, measured image latency, and measured token cost per image. NFR-4 gets its targets. Decided 2026-10-24 by Benjamin Jackson: continue to M-2. His words: "Sounds good. Continue!!!", in reply to this summary: Jev is fast and cheap; it matches the designer on clear yes-or-no visual questions (7 of 8 on the slice); it is too forgiving on graded questions (4 of 6 missed, all one level milder); its confidence marks unsure answers; a whole tall page shrinks too far, so `crit` looks at pages in slices; criteria are visual only; and one page with one designer is a small sample, so `crit` is tested on 100 or more labelled designs before anyone trusts it widely. His conditions: slices for tall pages (OQ-1), a default `min_confidence` of 0.5 (OQ-10), and the wide labelled test in EV-5 before trust. Changed 2026-10-24 for the spike itself: the whole page at 515 x 1568 px shrinks body text to about 6 px, so Benjamin answered from a full-size slice, `spike/slice.png`, 1280 x 1520 px (spike/ATTRIBUTION.md; crit-oj5.6). He cut 3 of the 20 questions under NG-10, so 17 were compared. Figures, all with `jev-1.14.0` and 5 runs per condition: on the slice, agreement was 10 of 17 (0.588) with and without the purpose line. By domain, with the purpose line, it was typography 3 of 3, layout 2 of 3, color 1 of 3, accessibility none judged (all 3 cut), ux 1 of 3, dataviz 2 of 3, and art-direction 1 of 2. On the whole page, agreement was 11 of 17 (0.647) both ways (spike/agreement_summary.csv). An image request took a median of 417 ms on the slice and at most 905 ms on a cold start. It used 7,129 input tokens, about 5,090 of them for the image, and cost $0.00030 (spike/cost_summary.csv; spike/run_costs.csv). No numeric stop rule was applied. The decision is Benjamin's judgment of these figures, and the floors in OQ-9 apply from EV-5 on. Changed 2026-10-24: Benjamin Jackson reversed the slices-for-tall-pages condition (OQ-1). `crit` does not cut pages, and it refuses an image it would shrink below half size (FR-73). | R-2, R-6, JC-10 answered. |
| M-2 | Report. Prepare, build, ask, and compose, with JSON and readable output. The pack schema and a pack loader that reads a local pack directory. The `typography` and `layout` packs first. | EV-1, EV-2, and EV-3 pass for report. `typography` and `layout` pass EV-3, and pass EV-5 when run with `crit report` on their fixtures. EV-5 passes on two of the seven domains, typography and layout. M-2 does not claim the full EV-5. Changed 2026-10-24 by Benjamin Jackson: before, the exit said only that the two packs pass EV-5. Reason: the full EV-5 needs all seven domains, and only two packs exist at M-2. Reconsider when: the remaining five packs are added in M-3, where all seven packs must pass EV-5. | FR-1 to FR-34 except the removed FR-9, FR-18, FR-29, and FR-30, with FR-11 reading local pack directories only. FR-73 and FR-74 (FR-70 to FR-72 are removed). FR-42, FR-44, FR-45, FR-59 to FR-61, FR-63 to FR-65. US-1, US-2, US-7 to US-11, US-13. |
| M-3 | Packs. The `crit packs validate` and `crit packs test` commands, the `packs/` directory with CI and fixtures, the first-party packs bundled in the CLI build, and the remaining five first-party packs. | All seven packs pass EV-3, EV-4, and EV-5. `crit report` runs the bundled packs that `.crit.yaml` names. | FR-11 with bundled packs, FR-49 to FR-51, FR-53 to FR-58. US-5, US-6. |
| M-4 | Compare and gate. Compare as a diff of two reports, the gate policy, and exit codes. | EV-1 and EV-2 pass for compare and gate. EV-9 passes. | FR-35 to FR-37, FR-39 to FR-41, FR-43. US-3, US-4. |
| M-5 | Claude Code plugin. Skill and hook. The loop test. | EV-10 has been run and recorded. | FR-66 to FR-69. US-14. |

## 15. Open questions

| ID | Question | Proposed default |
| --- | --- | --- |
| OQ-1 | Tall pages: does a downscaled whole page keep enough detail, or does `crit` need viewport-sized crops? | Decided 2026-10-24 by Benjamin Jackson: a downscaled whole page does not keep enough detail, so prepare refuses an image that it would shrink below half size, and the caller sends the page in parts (FR-73). Evidence: at 515 x 1568 px the spike page's body text is about 6 px high, and Benjamin could not answer from it (spike/ATTRIBUTION.md). Jev was less sure on the whole page: on `body-text-looks-small` its probability of false was 0.90 on the slice and 0.67 on the whole page. The whole page agreed with Benjamin on `primary-action-clear` where the slice did not (spike/comparison.csv, with_purpose). This is a judgment, not an agreement figure, because on each image Benjamin saw what Jev saw. FR-8's review trigger fired. Changed 2026-10-24 by Benjamin Jackson: before, this cell decided that `crit` cuts a page taller than 1568 px into full-width slices, asks detail questions on each slice, and asks page-level questions, such as focal point, density, primary action, and cohesion, on the downscaled whole page (FR-70 to FR-72, now removed). Reason for the reversal: `crit` sees only pixels and cannot tell where a cut is safe. A cut through a paragraph or just under a heading looks like a typography defect, such as `paragraph-runt`, `heading-floats`, or `heading-lines-collide`, and gives false findings. The caller has the page structure, so the caller cuts the page (FR-73). Before that, crops were deferred, and M-1 was to decide whether they were needed. Reconsider when: callers cannot cut pages themselves, or TypeSafe accepts larger images (JC-1). |
| OQ-2 | How much context does a visual question get: the image only, or the image plus a one-line purpose? | Decided 2026-10-24 by Benjamin Jackson: a question gets the image only by default, and the one-line purpose is optional context (FR-2). Evidence: agreement was the same 10 of 17 with and without the purpose line on the slice, and 11 of 17 both ways on the whole page (spike/agreement_summary.csv, overall). The purpose line cost 31 tokens: 7,129 against 7,098 (spike/cost_summary.csv). Reason: the purpose line changed no answer that matters, and making it required adds a step for every user. Before: the decision waited for the spike, and packs were written assuming the purpose is present. Reconsider when: EV-5 shows a criterion that agrees with people better with the purpose line than without it. |
| OQ-3 | May packs ship example images as Jev criteria? | No in v1, because of image rights. FR-58. Revisit after v1. |
| OQ-4 | May a project define its own pack inline in `.crit.yaml`? | Resolved 2026-10-23. No. FR-52 is removed. A project loads its own pack from a directory with `--pack <dir>`. |
| OQ-5 | What does the gate fail on? The brief says "thresholds" but does not define a project-level threshold or how `weight` combines. | Resolved 2026-10-23. The gate fails on any `fail` verdict. An optional policy in `.crit.yaml` may loosen that later. FR-41. |
| OQ-6 | Where does `uncertain` sort relative to `warn` and `pass`? The brief does not say. | Resolved 2026-10-23. The order is fail, warn, uncertain, pass. FR-28. |
| OQ-7 | How are findings merged across tiles? The brief does not say. | Resolved 2026-10-23. The most severe verdict wins, and each tile's region is kept. FR-29 is removed because v1 has no crops. This decision applies if crops are added after M-1 under OQ-1. Changed 2026-10-24: OQ-19 replaced this rule for slices with one finding per slice, and then slicing was removed (FR-70 to FR-72). `crit` cuts no image, so no findings merge. Before, this cell said the most severe verdict wins. |
| OQ-8 | By how much does disagreement between the two ordered compare answers lower confidence? | This question applies only if pairwise compare questions are added under FR-36's review trigger. Decided 2026-10-23: the rule is set from before-and-after pairs; M-1 ran none, so it waits for the EV-5 pairs. Until then the implementation uses a provisional rule, the lower of the two confidences multiplied by the probability mass the two answers share, held in one named constant and marked provisional in code. |
| OQ-9 | What are the agreement floor and the self-consistency floor? | Decided 2026-10-24 by Benjamin Jackson: the agreement floor is 0.8 per criterion in EV-5. Below it, a criterion ships with `warn` as its most severe verdict. This is a policy choice, not a measured figure, because the spike has one answer per question and cannot measure a per-criterion rate. Reason: a coding agent acts on every `fail`, so a `fail` should be right four times in five. There is no self-consistency floor. Jev is trained to give the same answer each run, so repeat runs measure server noise, not doubt in the model, and EV-6 is now a wobble check. Before: both floors were to be set after M-1 from the spike's figures. Reconsider when: the first EV-5 run on the fixture set. |
| OQ-10 | What is the default `min_confidence` when a criterion does not set one? | Decided 2026-10-24 by Benjamin Jackson: the default `min_confidence` is 0.5, for `choice` and `score` findings. It is read on the confidence TypeSafe reports (https://docs.typesafe.ai/confidence). For a Choice with n options, confidence is (p_max − 1/n) / (1 − 1/n), where p_max is the probability of the chosen option. For a Score, it is 1 minus the probability-weighted distance in levels from the most likely level, divided by the same average distance for an even spread, and it is never below 0. TypeSafe's documentation uses 0.5 as the floor for an answer the model is truly unsure of. On the slice with the purpose line, 0.5 held back 5 of the 9 `choice` and `score` answers, and 4 of those 5 disagreed with Benjamin (spike/comparison.csv). It also sits above the largest run-to-run movement of reported confidence in M-1, 0.22 (EV-6). A `noul` finding has no confidence, so `min_confidence` does not apply to it. Its near-ties are handled by the probability cut-offs in its thresholds (FR-26). Before: a provisional 0.6, the value in the brief's example, held in one named constant until M-1. Reconsider when: EV-5 shows that answers at or above 0.5 disagree with people often, or EV-6 shows movement that reaches 0.5. |
| OQ-11 | How do threshold objects work for `choice` questions? The brief shows `probability_at_least` and `level_at_most` only. | Resolved 2026-10-23. A `choice` criterion uses `option_is` or `option_in`. See the verdict rule under FR-25. |
| OQ-12 | Dependency policy. Fowler's rules say only that a dependency must work with the build and must not bind the project to one tool. | Resolved 2026-10-23, changed the same day. There is no fixed limit on runtime dependencies. Use a maintained library instead of writing code for a solved problem, such as JSON Schema validation. package.json is the list. A new runtime dependency is a pull request review question, not a document rule. `sharp` and the TypeSafe SDK are pinned to exact versions, because a new version can change the prepared image bytes (FR-10) or the request format (JC-7). |
| OQ-13 | Local state layout. | Resolved 2026-10-23. There is no pack cache. `.crit.yaml` in the project root is the only state. |
| OQ-14 | Provenance format: how does a change record which requirement and which evaluation it serves? | Resolved 2026-10-23. Each commit message and pull request names the FR, NFR, or US IDs it serves and the EV IDs that check it. Work is tracked in beads with `bd`: one epic per milestone M-n, one subticket per unit of work. A ticket carries its PRD IDs as labels in the form `prd:FR-25`, and its acceptance field quotes the acceptance criteria of those IDs. A commit names its ticket id and its PRD IDs, so a reader can walk from a line of code to the ticket to the requirement. Beads is not yet initialised in this repository; `bd init` is the first step of M-1. |
| OQ-15 | `crit packs validate` and `crit packs test` are not named in the brief, which names only `add`, `list`, and `search`. | Resolved 2026-10-23. Both ship as Should in M-3, because pack authors need a local check before CI. FR-49, FR-50. |
| OQ-16 | The brief's example criterion `single-focal-point` asks "how many elements compete", which reads as a counting question and conflicts with JC-2. | Resolved 2026-10-23. Reword it to ask whether one element dominates, with the same three levels: one element clearly dominates, two compete at similar weight, three or more compete or nothing stands out. The pack author does this during M-2. |
| OQ-17 | The brief does not say how fixture images are produced. Hand-collected screenshots are slow to gather, carry rights questions, and rarely come in matched pairs. | Resolved 2026-10-23, as proposed here. Produce most fixtures from source under `packs/`: one HTML and CSS template per criterion, rendered by a pinned Playwright Chromium with fonts shipped in the repo, with one parameter that turns the defect on or off, so the positive and the negative differ only in the defect. Charts use inline SVG in the same templates. The rendered PNGs are committed so the fixture tests do not depend on a renderer. The `art-direction` pack and a share of every pack use real or licensed screenshots as well, because rendered pages are cleaner than production pages and illustration style cannot be rendered from a template. The renderer is a development dependency in its own `package.json` under `packs/`, never a dependency of the `deskcrit` package, so NG-1 and NFR-3 still hold. For the real-page share, take pages only from sources whose license FR-54 accepts: United States federal government sites (public domain, and a rich source of real defects), GOV.UK and the GOV.UK Design System (Open Government Licence and MIT), the design system demo pages of USWDS, Carbon, Primer, and Material, Figma Community files (CC BY 4.0 by default), Wikipedia and MDN (CC BY-SA), and for posters, type, charts, and illustration the open access collections of the Library of Congress, the Smithsonian, the Metropolitan Museum, the Rijksmuseum, and Wikimedia Commons with a per-file license check. Bad real examples come mainly from government pages and from contributors who own the page. Never use a living company's page as a bad example without written permission. Decided before M-3. |
| OQ-18 | Which entries in GUIDELINES.md read the content or need fine detail, and so break NG-10? Is a guideline missing for unrelated elements that crowd each other? | Review the catalog against NG-10 and mark each entry that breaks it before an M-2 pack encodes it. Add a guideline for elements that crowd their neighbours, citing Refactoring UI, "Start with too much white space", and Robin Williams on proximity in The Non-Designer's Design Book, with one criterion in the `layout` pack. Evidence: on `edges-misaligned`, Benjamin Jackson noted that two elements in the top left sit uncomfortably close, the text below the diagram (spike/human_answers.csv), and no current guideline or question covers it. Benjamin approved this on 2026-10-24 as a recommendation. Done 2026-10-24 (crit-cy8.26): GUIDELINES.md marks 34 entries `Not encoded (NG-10)`, each with its reason. They are 13 typography entries, 11 layout entries, the three M-1 cuts, and seven entries in other sections on the same topics: reflow, four on target size, rule of thirds in art direction, and the F-pattern half of scannability. The wall-of-text half of scannability stays askable. The layout section has a new crowding entry, "Unrelated elements do not crowd each other", cited to Refactoring UI and Williams. |
| OQ-19 | When a tall page is cut into slices under OQ-1, how do the findings from several slices merge into one finding per criterion, and how does a Box region on a slice map back to the original image? | Reversed 2026-10-24 by Benjamin Jackson: `crit` does not cut a page into slices (FR-70 to FR-72 removed, FR-73 added), so there are no slice findings to merge and no slice offsets to map. Reason: `crit` sees only pixels and cannot tell where a cut is safe. A cut through a paragraph or just under a heading looks like a typography defect, such as `paragraph-runt`, `heading-floats`, or `heading-lines-collide`, and gives false findings. The caller has the page structure, so the caller cuts the page (FR-73). Before: decided earlier on 2026-10-24 that findings do not merge, that `crit` reports one finding per slice that fires, and that each region maps back through the slice's offset and scale factor. Before that, this cell proposed OQ-7's rule as a starting point. Reconsider when: as FR-73. |
| OQ-20 | How does a criterion say whether it is asked on each slice or on the downscaled whole page, and which FR rows describe slicing? | Reversed 2026-10-24 by Benjamin Jackson: the `view` field is removed with slicing (FR-71 removed), and every criterion is asked on the one prepared image. FR-18 stays removed. Reason: as in OQ-19. Before: decided earlier on 2026-10-24 that an optional criterion field `view`, with the values `slice` or `page` and `slice` when absent, chose between each slice and the downscaled whole page. Reconsider when: as FR-73. |
| OQ-21 | A `noul` finding has no confidence (FR-26). What follows from that? | Partly decided 2026-10-24 by Benjamin Jackson. Three of the four questions are decided. First, a `noul` probability of `true` above 0.3 and below 0.7 gives the verdict `uncertain` before any predicate is checked (step 1 of the verdict rule under FR-25). TypeSafe's documentation suggests 0.7 for yes and 0.3 for no (https://docs.typesafe.ai/confidence). Second, the loader rejects `min_confidence` on a `noul` criterion (FR-27). Third, within one severity, `noul` findings sort after findings that have a confidence (FR-28). Reason: these follow TypeSafe's own reading of a `noul` probability, and none needs a confidence that TypeSafe does not report. Reconsider when: TypeSafe reports a confidence for `noul` answers or changes the cut-offs it suggests. Still open: what does a Box answer's confidence hold, given that the SDK returns a number or null (crit-dmm)? Proposed default: `crit` does not read it, and no finding field holds it. Decide before compose is written. Before, this cell listed all four questions as not decided. |
| OQ-22 | Details of slicing that the OQ-19 and OQ-20 decisions leave open. (a) How prepare chooses slice heights, and whether slices overlap. (b) Whether the 1568 px height test in FR-70 reads the original height or the height after the width is scaled. (c) Which verdicts count as a slice firing under FR-72. (d) What a `slice` criterion gives when no slice fires. (e) The name of the finding field that names the slice, and when it is present. (f) How findings of one criterion from several slices sort under FR-28. | Closed 2026-10-24 by Benjamin Jackson: slicing is removed (FR-70 to FR-72), so none of these details apply. Before: not decided, with these proposed defaults: (a) the fewest slices that fit, all of one height, with no overlap; (b) the height after the width is scaled; (c) `fail`, `warn`, and `uncertain` fire; (d) one `pass` finding from slice 0 when no slice fires; (e) an integer field `slice`, present only on a cut page; (f) sort by slice index after criterion id. |
| OQ-23 | How do compare and gate read a report that has several findings for one criterion (FR-72)? FR-36 compares the finding for each criterion in two reports, and the gate document lists criterion ids in `blocking`. | Closed 2026-10-24 by Benjamin Jackson's decision to remove slicing: with slicing removed (FR-72), a report has one finding for each criterion, so this question does not arise. Before: not decided, with the proposed default that compare reads each criterion's most severe finding in each report and the gate lists each blocking criterion id once. |
| OQ-24 | Build skips criteria under FR-12 and FR-13, but the PRD does not say four details of how. (a) When a criterion fails both the platform check and the `requires` check, which reason goes in `skipped`? (b) Does a `requires` key whose value is `null` or an empty string count as present? (c) How does a context key that was not given appear in the state? (d) Should the pack schema require every `requires` path to start with `facts.`? | (a) to (d) are decided on 2026-10-24 by Benjamin Jackson. He confirmed (a), (c), and (d) as proposed and changed (b). Build follows these: (a) Build runs the platform check first and skips the criterion once, with the platform reason. Reason: the report lists one `skipped` entry for each criterion, and a page that is not on the platform has no use for the facts. (b) A key that the facts file holds with a value counts as present, and a key the object only inherits, such as `constructor`, does not. Build checks each key with `Object.hasOwn`. A required key held with a blank value (`null`, an empty string, or only spaces) stops the run with exit code 2 and a `CouldNotRunError` that names the key and the criterion and tells the caller to give a value or remove the key. An absent key still skips the criterion. A blank key that no criterion requires is not checked. Changed 2026-10-24 by Benjamin Jackson: before, a key with any value, including `null` or an empty string, counted as present. Reason: a blank value is a fact the person has not given, so the run stops and says which one, and does not ask a criterion with nothing to check. Reconsider when: EV-1 shows a real facts file that needs a blank value for a key. (c) Build leaves out a context key that was not given, and leaves out `context` when no key was given. Reason: an empty value tells Jev nothing and adds tokens. (d) Decided 2026-10-24 by Benjamin Jackson: the pack schema requires every `requires` path to start with `facts.`, so the loader rejects such a pack with a problem that names the criterion and the field. Reason: the mistake is in the pack, so it is caught when the pack loads, like any other malformed pack, and not later when build runs. This is a stricter pack schema, a slow-layer change (AC-2). Reconsider when: a pack needs a `requires` path outside the facts file. The EV-1 golden tests will freeze the reason text for (a) and (b). Reconsider (a) and (c) when: EV-1 is written. |
| OQ-25 | The PRD does not fix five details of `crit report` input. (a) The keys and value types of `.crit.yaml`. (b) Where the CLI looks for `.crit.yaml`. (c) What happens with an unknown `--context` key. (d) What happens when no pack is named at all, while no packs are bundled. (e) Whether `--context` takes several pairs after one flag. | Decided 2026-10-24 by Benjamin Jackson: he confirmed (a) to (e) as proposed, and crit-cy8.11 built them. (a) `.crit.yaml` is a map with the optional keys `packs` (a list of pack names), `model` (a string), `context` (a map with the optional string keys `purpose`, `audience`, and `platform`), `screenshot` (a string), and `warn_fails_gate` (a boolean). Any other key stops the run with exit code 2. `screenshot` and `warn_fails_gate` are accepted and not acted on until FR-68 and FR-41 are built. Reason: a misspelled key that is silently ignored makes a setting look applied when it is not. Reconsider when: a second tool needs to keep its own keys in the file. (b) The CLI reads `.crit.yaml` from the current directory only and does not look in parent directories. Reason: OQ-13 puts the file in the project root, and a coding agent runs `crit` from there. Reconsider when: people run `crit` from subdirectories and expect the file to be found. (c) A `--context` key other than `purpose`, `audience`, or `platform` stops the run with exit code 2. Reason: FR-2 names three keys, and a typo such as `platfrom` would otherwise turn off the platform skip without a word. Reconsider when: FR-2 gets more keys. (d) With no `--pack` and no packs in `.crit.yaml`, the run stops with exit code 2 and the message "no packs: pass --pack <dir> or name packs in .crit.yaml". Reason: FR-11 reads every bundled pack in this case, but no pack is bundled until crit-q25.3, and a run with no packs checks nothing (FR-74). Reconsider when: crit-q25.3 bundles packs. (e) Each pair needs its own flag, as in `--context purpose=x --context platform=web`. A second pair after one flag, as in `--context a=b c=d`, is an extra argument and stops the run with exit code 2. Reason: the standard Node argument parser takes one value per flag, and an image path can look like a pair. Reconsider when: users ask for the shorter form. |
| OQ-26 | FR-42 does not fix six details of the `crit report` answers file. (a) Its layout. (b) Whether `--answers` replays answers through an adapter or skips ask. (c) What happens when the file does not fit the questions that build makes. (d) What happens when `--save-answers` and `--answers` are both given. (e) Whether a replay checks the model id or the image. (f) Whether the file gets a JSON Schema in `schemas/`. | Decided 2026-10-24 by Benjamin Jackson. He decided (e) himself and changed it. He gave (a) to (d) and (f) to the builder on 2026-10-24 ("ask me questions that will help you answer these yourself"), and they are decided as proposed. crit-cy8.12 built (a) to (d) and (f), and crit-cy8.32 built (e). (a) The file is one JSON object with exactly four keys: `answers_file_version`, which is 1, `image_sha256`, the fingerprint of (e), `answers`, the list of answers in the FR-20 shape, and `usage`, the adapter's usage object with `input_tokens`, `cost_usd`, `latency_ms`, and `model`. No key is optional and no other key is allowed. `--save-answers` writes the keys in that order, the answers in the order ask returned them with a fixed field order for each type, and a two-space indent with a final newline. The CLI reads the version first and rejects any other version with exit code 2. The version stays 1 after `image_sha256` was added, because no answers file had shipped outside this repository. Reason: golden tests record the file (EV-1, CS-10), and a version key costs one line now and lets a later layout be rejected clearly instead of misread. Reconsider when: `crit compare` needs its `before` and `after` runs in the file (FR-42), which is version 2. (b) `--answers` skips ask, and the CLI hands the file's answers to compose in place of ask's result. There is no replay adapter. Reason: FR-42 says the stage is skipped, and the CLI then reads no key and makes no adapter, so no code path can reach the network. Reconsider when: a test needs to replay answers through the adapter interface itself. (c) A file whose answers do not fit the questions of this run stops the run with exit code 2 and a message that names the file. The rule is the one ask applies to an adapter: one answer for each question, the question's type, and distribution keys equal to the current options or level indexes. Reason: a missing or extra criterion means the packs changed since the file was saved, and a report built on the wrong answers looks right and is wrong. Reconsider when: people want to replay an old file after they add a criterion. (d) Both flags together are allowed, and the CLI writes the replayed answers to the `--save-answers` file. Each flag may appear once, and a second one stops the run with exit code 2, because the argument parser keeps only the last value and would drop a file without a word. Reason: it is the plain result of the two flags, and it lets a person bring an old file up to the current layout. Reconsider when: someone overwrites a recorded file by mistake. (e) `--save-answers` records `image_sha256`, the SHA-256 of the original image bytes as read from disk, before prepare, written as 64 lowercase hexadecimal characters. `--answers` computes the same fingerprint for the image it is given and compares it with the file before prepare runs. When they differ, the run stops with exit code 2 and a message that names the file and says that it belongs to another image. A replay does not check the model id, and the report's model comes from the file. Changed 2026-10-24 by Benjamin Jackson: before, a replay checked neither the image nor the model id, so a file saved from one image gave a report on another. Reason: a report on one image built from another image's answers looks right and is wrong, and the check before prepare refuses it with no image work. The model id is not checked because the file is the record of which model answered. Reconsider when: people need to replay one file on an image that differs only in bytes, such as the same screenshot saved again with other compression. (f) No JSON Schema for the answers file. The CLI checks the shape in one function (CS-7), and the golden cases in `evals/golden/` check its error messages through the built command. Reason: only `crit` reads and writes the file, so a second description of its shape would be a second copy to keep in step. Before: the trigger was that crit-cy8.14 records answers files for the golden tests, and those tests now check the file through the command instead. Reconsider when: a program other than `crit` reads or writes the file. |

## 16. Glossary

| Term | Meaning |
| --- | --- |
| Jev | TypeSafe's System One model. It answers typed questions over a state and returns a probability per option, and a confidence for choice and score answers. |
| System One | TypeSafe's name for its family of fast judgment models that return typed answers instead of generated text. |
| Noul | The TypeSafe question type for yes or no. |
| Choice | The TypeSafe question type for one option from a set. |
| Score | The TypeSafe question type for a degree along described levels. |
| Box | The TypeSafe question type that returns a bounding box on an image. |
| State | The data sent with a request: the image, the context, and the facts file. |
| Pack | A versioned directory with a `pack.yaml` of criteria, with sources and fix hints, and a `fixtures/` directory. It holds no code. The first-party packs ship inside the npm package, and `--pack <dir>` loads any other pack from a directory. |
| Criterion | One rule in a pack, asked as one question. |
| Finding | The result for one criterion on one image, with the fields in FR-26. |
| Slice | In the M-1 spike, the full-size 1280 x 1520 px top part of the page, judged beside the shrunk whole page. Changed 2026-10-24: before, a slice was also a band that prepare cut under FR-70, which is removed. |
| Verdict | `pass`, `warn`, `fail`, or `uncertain`, decided in code from the distribution and thresholds. |
| Fixture | An image with a human label, used to test criteria and measure agreement. |
| Gate | The `crit gate` command, which passes or fails a design with an exit code. |
| Facts file | JSON the caller measured with other tools, passed in unchanged. |
| Conservation layer | The parts that must survive a rewrite: the interfaces, schemas, flags, exit codes, and evaluations. The term is Chad Fowler's. |
