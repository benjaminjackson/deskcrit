# deskcrit: product requirements document

## 1. Document control

| Field | Value |
| --- | --- |
| Version | 0.3.2 |
| Status | Draft |
| Owner | Benjamin Jackson |
| Last updated | 2026-10-23 |

### Changelog

| Date | Version | Change |
| --- | --- | --- |
| 2026-10-23 | 0.1.0 | First draft, derived from [BRIEF.md](../BRIEF.md) and [GUIDELINES.md](../GUIDELINES.md). |
| 2026-10-23 | 0.2.0 | Applied twelve review findings. Defined the verdict rule and its predicates under FR-25, which resolves OQ-11. Defined how prepare pads a tall page's whole-page image in FR-8, with a note in OQ-1. Made a pack a directory with `pack.yaml` and `fixtures/`, and added the `view`, `compare`, and `fixtures` fields to the pack schema (FR-18, FR-36, FR-44, FR-47, FR-49, FR-50, FR-54, FR-55, US-6). Added `--save-answers` and `--answers` to FR-60, raised FR-42 to Must, and made EV-1 skip the volatile fields. Added a `usage` object to the adapter interface (FR-20, FR-23, FR-33, FR-64, AC-8). Corrected the guideline counts to 25 for accessibility and 239 in total (G-8, FR-55). Moved the pack schema and a loader for local pack directories into M-2. |
| 2026-10-23 | 0.2.1 | AC-7 now names the `--save-answers` file as the one file the CLI layer writes outside `crit packs`. Added OQ-17 with a proposed default for producing fixture images from HTML and CSS templates. |
| 2026-10-23 | 0.3.0 | FR-54 now defines the four accepted rights bases for fixture images, the capture metadata for a real page, the 2 MB cap, and the privacy rules. OQ-17 lists the accepted real-page sources. Added EV-13, the guideline count check, with its script under `evals/`. |
| 2026-10-23 | 0.3.1 | G-8 no longer carries a guideline count. EV-13 now counts headings as well as rule bullets and records the FR-55 phrasings the script depends on. |
| 2026-10-23 | 0.3.2 | Benjamin Jackson decided the open questions OQ-5, OQ-6, OQ-7, OQ-12, and OQ-15 as proposed, and decided that OQ-8 and OQ-10 are set after M-1 with provisional values until then. |

### How to update this document

This document is the behavioral specification for `deskcrit`. An agent must be able to delete the implementation and rebuild it from this document and the durable evaluations in section 12. Code does not override this document. When code and this document disagree, one of them is wrong, and the fix is a deliberate decision recorded here.

Follow these rules for every change:

1. Every requirement has a stable ID. IDs are never reused and never renumbered. A new requirement takes the next free number in its series.
2. Do not delete a requirement. Mark it `Removed`, and record the date and the reason in the same row.
3. Every change adds a row to the changelog with the date, the new version, and what changed.
4. Every requirement that encodes a constraint records why the constraint exists and what event would make us reconsider it. A constraint without a reason becomes a rule nobody dares to change.
5. Evidence from production, such as a measured latency or a drift in model answers, does not become a requirement by itself. A person reads the evidence and decides to change this document.
6. If two sources of authority disagree, record the conflict in section 15 as an open question. Do not resolve it silently.

ID series used in this document: `G` goals, `NG` non-goals, `P` personas, `US` user stories, `FR` functional requirements, `NFR` non-functional requirements, `JC` Jev and TypeSafe constraints, `AC` architecture constraints, `EV` evaluations, `R` risks and assumptions, `M` milestones, `OQ` open questions.

## 2. Summary

`deskcrit` is a command-line critic, run as `crit`, that judges a picture of a design against installed criteria packs. Each criterion in a pack is one narrow, typed question. `crit` sends all the questions for an image to TypeSafe's Jev model in one request, reads back a probability for every answer, and turns those probabilities into findings. Each finding says what looks wrong, how sure the model is, where on the image the problem is, which source the rule comes from, and what usually fixes it. The companion repository `deskcrit-packs` is a marketplace of versioned, citable packs that `crit` installs by name.

Problem statement: a coding agent that builds a user interface has no check for how that interface looks, so visual defects ship unnoticed.

## 3. Problem and background

A coding agent can check that a page renders and that its tests pass. It cannot check that the page looks right. Two headings can compete for attention, a button can sit grey on grey, and a chart can carry a legend it does not need. Nothing in the agent's loop reports these defects, so the agent ships the page or asks a person to look. The full argument is in [BRIEF.md, "Why this exists"](../BRIEF.md#why-this-exists).

Existing tools fall short in three ways:

- axe-core and Lighthouse check the accessibility rules that can be computed from the Document Object Model (DOM). They do not judge hierarchy, spacing, or colour harmony.
- A large vision model can answer "is this good?", but the answer is prose that the agent must parse. Each question costs too much money and time to ask a few hundred per change. The confidence the model states is not calibrated, so a loop cannot use it to decide whether to continue.
- No tool turns the design rules that books and standards already contain into checks an agent can run after every change.

Jev is TypeSafe's System One model. It answers narrow, typed questions over a state of text, JSON, and images. It returns a probability for every option and a confidence. TypeSafe trains it for calibrated probabilities and stable answers across runs, but makes no claim for design images. The bet behind `deskcrit` is that a design critique splits into a couple of hundred small visual judgments, and that Jev can answer them well enough to drive an agent's fix loop. Milestone M-1 tests that bet before other work starts.

## 4. Goals and non-goals

### Goals

| ID | Goal |
| --- | --- |
| G-1 | Give a coding agent a visual check it can run after every change and parse with no help. |
| G-2 | Tell the agent whether a change made each criterion better, worse, or the same, so it knows when to stop iterating. |
| G-3 | Let a person set a design bar that blocks a change in continuous integration (CI), a pre-commit hook, or a Claude Code hook. |
| G-4 | Ground every finding in a cited source and a fix hint that a person wrote. |
| G-5 | Make criteria portable data that anyone can write, review, publish, and install. |
| G-6 | Report a calibrated probability and confidence for every finding, and never a bare verdict without them. |
| G-7 | Make a run reproducible: the same image, pinned packs, and pinned model give the same verdicts. |
| G-8 | Ship seven first-party packs that encode the guidelines in [GUIDELINES.md](../GUIDELINES.md). FR-55 holds the counts. |

### Non-goals

| ID | Non-goal | Reason |
| --- | --- | --- |
| NG-1 | `crit` does not capture screenshots. | The caller already has a browser tool or Playwright. |
| NG-2 | `crit` does not measure. It computes no contrast ratio, pixel size, character count, or readability score. | Jev is unreliable at arithmetic and counting, and axe-core, Lighthouse, and readability libraries already measure. Callers pass measurements in through the facts file. |
| NG-3 | `crit` does not generate designs or apply fixes. | It reports. The agent fixes. |
| NG-4 | `crit` does not judge interaction. | It judges still images. A caller can supply stills of hover and focus states. |
| NG-5 | `crit` does not lint prose. | Reading level, tone, and terminology belong to a content linter. Wording is judged only where a usability heuristic depends on it. |
| NG-6 | `crit` does not certify legal conformance. | The accessibility pack asks about visible symptoms. A conformance claim needs measurement and a human audit. |
| NG-7 | No Model Context Protocol (MCP) server in v1. | The command-line interface (CLI) with JSON output covers the agent case. |
| NG-8 | `crit` does not render pages, read the DOM, or run axe-core. | These need a browser, and NFR-3 forbids a browser dependency. |
| NG-9 | No pack ships example images as Jev criteria in v1. | Image rights in a public marketplace are unresolved. See OQ-3. |

## 5. Users and personas

**P-1: Coding agents, with Claude Code first.** The agent takes a screenshot with the tool it already has, runs `crit report --json`, fixes the top findings, takes a new screenshot, and runs `crit compare`. It stops when the gate passes or when nothing improves. It needs JSON with a stable shape, findings sorted so the most important come first, a probability and confidence it can trust, a region that tells it where to look, and a fix hint it can turn into a code change. This is the primary persona, and the output contract in section 8 is designed for it.

**P-2: People who build with agents.** They want a bar that their agent must clear before it reports that work is done. They install and pin packs, set thresholds in `.crit.yaml`, add `crit gate` to CI or a hook, and sometimes read the readable report. They need clear exit codes, readable output, visible cost, and the confidence to know that a gate failure means a real change and not model drift.

**P-3: Pack authors.** These are designers, accessibility specialists, and teachers who want to encode a critique checklist once and have every agent apply it. Many are not programmers. They need a YAML schema they can read, a validator that explains errors, fixture tests that show whether each criterion fires on the right images, and a generated README that shows their sources.

## 6. User stories

Each story has an ID and acceptance criteria in Given, When, Then form.

**US-1: Report for an agent.** As P-1, I want a JSON report of findings for one image, so that I can decide what to fix without parsing prose.

- Given an image and pinned packs, when I run `crit report <image> --json`, then stdout holds one JSON document that validates against the report schema in section 8, and the exit code is 0.
- Given the same run, when I read `findings`, then every finding has all the fields in FR-26, and findings are in the order FR-28 defines.
- Given a criterion that sets `locate: true` and does not pass, when the report is written, then that finding has a `region` in the pixel coordinates of the original image.

**US-2: Report for a person.** As P-2, I want a readable report, so that I can see what my agent sees without reading JSON.

- Given an image, when I run `crit report <image>` without `--json`, then the output groups findings by verdict, shows each finding's title, verdict, confidence, source, and fix hint, and ends with the cost and model line from FR-33.
- Given a terminal without colour support, when the report prints, then it is still readable as plain text.

**US-3: Compare in the fix loop.** As P-1, I want to know for every criterion whether my change made it better, worse, or the same, so that I know whether to keep iterating.

- Given a before image and an after image, when I run `crit compare <before> <after> --json`, then each applicable criterion has a `change` of `better`, `worse`, `same`, or `uncertain`.
- Given a criterion where the two order-swapped questions disagree, when the result is composed, then the criterion's confidence is lower than either single answer, and `agreement` is `false`.
- Given the compare result, when I read the summary, then it counts how many criteria improved, regressed, and stayed the same.

**US-4: Gate in CI and hooks.** As P-2, I want `crit gate` to exit non-zero when a design fails, so that CI, pre-commit, or a Claude Code hook holds the change.

- Given an image with no failing finding, when I run `crit gate <image>`, then the exit code is 0.
- Given an image with at least one finding whose verdict is `fail`, when I run `crit gate <image>`, then the exit code is 1 and the output lists the failing criteria.
- Given a missing image, an invalid pack, a missing API key, or an unreachable TypeSafe API, when I run `crit gate <image>`, then the exit code is 2 and stderr says what went wrong.

**US-5: Install and pin packs.** As P-2, I want to install packs by name and pin their versions, so that every run on every machine uses the same criteria.

- Given network access, when I run `crit packs add typography`, then the pack at its latest tagged version is in the local cache, and `.crit.yaml` lists `typography` with that exact version.
- Given a `.crit.yaml` that pins `typography` at `1.0.0`, when a newer version is published, then `crit report` still uses `1.0.0`.
- Given network access, when I run `crit packs search color`, then I see every pack in the index whose name, domains, or summary match, with its version.
- Given installed packs, when I run `crit packs list`, then I see each pinned pack, its version, and whether it is in the cache.

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

**US-11: Tile a tall page.** As P-1, I want a full-page screenshot judged in pieces, so that detail questions see the detail and layout questions see the whole page.

- Given an image taller than the TypeSafe limit allows after resizing, when it is prepared, then `crit` produces viewport-sized crops plus one downscaled whole-page image, each within the limits in NFR-7.
- Given a tiled image, when findings are merged, then each criterion appears once in `findings`, and its `region` is in the coordinates of the original image.

**US-12: House style inline.** As P-2, I want to define a small pack for my team's house style inside `.crit.yaml`, so that I do not need to publish a pack to use it.

- Given a `packs.inline` entry in `.crit.yaml` that follows the pack schema, when I run `crit report`, then its criteria are asked alongside installed packs and its findings use the pack name given inline.
- Given an inline pack that fails schema validation, when I run any `crit` command that loads packs, then the exit code is 2 and the error names the inline pack.

**US-13: Library API for custom loops.** As a developer building my own loop, I want the four pipeline stages as separate functions, so that I can insert my own steps between them.

- Given the npm package, when I import `prepare`, `build`, `ask`, and `compose`, then each is a function whose input and output types are exported.
- Given the output of `prepare` and `build`, when I call `ask` with a stub that implements the TypeSafe adapter interface in FR-20, then no network call is made.
- Given the four functions called in order, when I compare the result with `crit report --json` on the same inputs and the same model answers, then the two are identical.

**US-14: Claude Code fix loop.** As P-1 running in Claude Code, I want a skill that teaches me the loop and a hook that runs the gate, so that I check the design without being told to.

- Given the plugin is installed, when I finish a UI change, then the skill tells me to screenshot, run `crit report --json`, fix the top findings, screenshot again, and run `crit compare`.
- Given two rounds of compare with no criterion improved, when the loop checks its stop rule, then the loop stops and reports to the person.
- Given the optional hook is enabled, when a UI file changes, then the hook runs `crit gate`, and exit code 1 holds the change.

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
| FR-8 | When an image cannot fit those limits as one image without losing detail, prepare tiles it into viewport-sized crops and also produces one downscaled image of the whole page. The whole-page image is scaled so its long side is 1568 pixels. If its short side is then below 280 pixels, prepare pads the short side to 280 pixels with a flat colour sampled from the page's top-left pixel, centres the page in the padding, and records `padded: true` and `padding_px` for that tile in the `image` object of the output. Reason: TypeSafe rejects an image with a side under 280 pixels, and a tall page is the main case tiling exists for. Reconsider when: the spike (M-1) shows that padding changes layout verdicts. Then split the page into overlapping segments with an aspect ratio of at most 5.6:1 instead. | Must | US-11 | Brief, How it works; OQ-1 |
| FR-9 | Prepare records, for each tile, its offset and scale relative to the original image, so later stages can map regions back. | Must | US-11 | This document |
| FR-10 | Prepare is a pure function of the image bytes and its options: the same input gives byte-identical output. | Must | US-13 | NFR-5 |

### 7.3 Build

| ID | Requirement | Priority | Stories | Source |
| --- | --- | --- | --- | --- |
| FR-11 | Build loads exactly the packs and versions pinned in `.crit.yaml`, or the packs named with `--pack`, from the local cache. | Must | US-5 | Brief, How it works |
| FR-12 | Build drops every criterion whose `applies_to`, at pack or criterion level, does not include the stated platform, and records each one in `skipped` with the reason. | Must | US-8 | Brief, How it works |
| FR-13 | Build drops every criterion whose `requires` paths are absent from the facts file, and records each one in `skipped` with the missing path. | Must | US-7 | Brief, A pack |
| FR-14 | Build turns each remaining criterion into exactly one TypeSafe question of the type the pack declares. | Must | US-1 | Brief, Principles |
| FR-15 | Build places each image in the state once, and every question refers to it by its path in the state, never by a second copy. | Must | US-1 | JC-6 |
| FR-16 | Build adds a Box question for each criterion that sets `locate: true`. | Must | US-1 | Brief, How it works |
| FR-17 | Build puts the context and the facts file in the state next to the image. It never adds page HTML, a DOM dump, or source code to the state. | Must | US-7, US-8 | JC-4 |
| FR-18 | Build decides which tiles each criterion is asked on from the criterion's `view` field. `page` asks it on the downscaled whole-page image, `detail` asks it on each crop, and `both` asks it on both. The default is `page`. Reason: asking every criterion on every crop multiplies cost. Reconsider when: the spike (M-1) measures whether detail criteria such as legibility need crops at all. | Should | US-11 | Brief, How it works; OQ-1 |

### 7.4 Ask

| ID | Requirement | Priority | Stories | Source |
| --- | --- | --- | --- | --- |
| FR-19 | Ask sends one request per tile that holds every question for that tile, with the header `TypeSafe-Danger-Zone-Images: true`. | Must | US-1 | Brief, How it works; JC-7 |
| FR-20 | Ask calls TypeSafe through one interface. It takes a state and a list of questions. It returns the list of typed answers, each with its distribution, confidence, and model id, and a `usage` object with `input_tokens`, `cost_usd`, `latency_ms`, and `model`. A stub adapter returns zeros in `usage` and a stub model id. v1 has one real implementation of this interface, which uses the official TypeSafe JavaScript software development kit (SDK). | Must | US-13 | Brief, How it works; R-1 |
| FR-21 | Ask uses the three text primitives only: Noul for yes or no, Choice for one of a set, and Score for a degree along described levels. Box is used only for regions. | Must | US-1 | Brief, How it works |
| FR-22 | Ask sends the model id pinned in `.crit.yaml`. If no model is pinned, ask uses the newest versioned id `crit` was released against, never `jev-latest`. | Must | US-10 | NFR-6 |
| FR-23 | Ask records input tokens, cost, and latency for every request, from the `usage` object the adapter returns under FR-20. | Must | US-10 | Brief, Risks |
| FR-24 | When TypeSafe returns an error or cannot be reached, ask stops the run with exit code 2 and does not write a partial report. | Must | US-4 | This document |

### 7.5 Compose and output

| ID | Requirement | Priority | Stories | Source |
| --- | --- | --- | --- | --- |
| FR-25 | Compose turns each answer into a verdict in code from the distribution and the criterion's `fail_when`, `warn_when`, and `pass_when` thresholds, by the verdict rule below the finding fields table. The model never chooses the verdict. | Must | US-1 | Brief, Principles |
| FR-26 | Every finding has these fields: `criterion`, `title`, `verdict`, `distribution`, `confidence`, `region`, `source`, `link`, `fix`, `weight`, and `model`. See the table below. | Must | US-1, US-10 | Brief, Output |
| FR-27 | A finding whose confidence is below the criterion's `min_confidence` gets the verdict `uncertain`, whatever its thresholds say. Its distribution and confidence stay in the finding. | Must | US-9 | Brief, Output |
| FR-28 | Findings sort by severity first, in the order `fail`, `warn`, `uncertain`, `pass`. Within one severity they sort by confidence from high to low, then by weight from high to low, then by criterion id. | Must | US-1 | Brief, Output; OQ-6 |
| FR-29 | When a criterion is asked on several tiles, compose keeps one finding: the tile with the most severe verdict wins, and its region is mapped to the original image. | Must | US-11 | OQ-7 |
| FR-30 | Compose applies `weight` only to the order of findings and to the optional gate score in FR-41. Weight never changes a single finding's verdict. | Should | US-4 | This document |
| FR-31 | `--json` writes one JSON document to stdout that matches the schema in section 8. Without `--json`, `crit` writes the readable report. | Must | US-1, US-2 | Brief, Integration |
| FR-32 | The readable report shows each finding's title, verdict, confidence, source, and fix hint, groups findings by verdict, and works without colour. | Must | US-2 | Brief, Modes |
| FR-33 | Every run prints the number of requests, the input tokens, the cost in US dollars, the latency, and the model id, taken from the `usage` objects the adapter returns under FR-20. In JSON this is the `usage` object. | Must | US-10 | Brief, How we know it works |
| FR-34 | No finding or report text claims conformance with a standard or a measured value. | Must | US-2 | Brief, Risks; NG-6 |

Finding fields:

| Field | Type | What it holds |
| --- | --- | --- |
| `criterion` | string | Pack name and criterion id joined by `/`, for example `typography/single-focal-point`. |
| `title` | string | The criterion title from the pack. |
| `verdict` | string | One of `pass`, `warn`, `fail`, `uncertain`. Decided in code. |
| `distribution` | object | Jev's probability for each option or level, keyed by option name or level index, unchanged. |
| `confidence` | number | Jev's confidence in the distribution, from 0 to 1. |
| `region` | object or null | `x`, `y`, `width`, `height` in pixels of the original image, from a Box question. Null when the criterion does not set `locate` or the verdict is `pass`. |
| `source` | string | The book, standard, or paper the criterion cites. |
| `link` | string or null | The URL of the source when it is online. |
| `fix` | string | The fix hint the pack author wrote. |
| `weight` | number | The criterion's weight. Default 1. |
| `model` | string | The versioned model id from the response. |

Verdict rule for FR-25:

1. If the finding's confidence is below `min_confidence`, the verdict is `uncertain`, as FR-27 says.
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

The two example criteria in the brief give these verdicts. The examples assume a confidence at or above `min_confidence`.

| Criterion | Thresholds | Answer | Verdict | Why |
| --- | --- | --- | --- | --- |
| `faint-body-text`, `noul` | `fail_when: { probability_at_least: 0.7 }` | Probability of `true` is 0.8 | `fail` | `fail_when` matches. |
| `faint-body-text`, `noul` | Same | Probability of `true` is 0.3 | `pass` | No predicate matches, and the criterion has no `pass_when`. |
| `single-focal-point`, `score` | `pass_when: { level_at_most: 0 }`, `warn_when: { level_at_most: 1 }` | Most probable level is 0 | `pass` | `pass_when` matches. |
| `single-focal-point`, `score` | Same | Most probable level is 1 | `warn` | `pass_when` does not match, and `warn_when` matches. |
| `single-focal-point`, `score` | Same | Most probable level is 2 | `fail` | No predicate matches, and the criterion has `pass_when`. |

### 7.6 Compare

| ID | Requirement | Priority | Stories | Source |
| --- | --- | --- | --- | --- |
| FR-35 | Compare runs prepare, build, and ask on the before image and on the after image, and reports both sets of findings. | Must | US-3 | Brief, How it works |
| FR-36 | Compare then asks one Choice per applicable criterion with both images in the state, under the paths `before` and `after`. The question text is the criterion's `compare.instructions`. `crit` sets the options to `better`, `worse`, and `same`, in that order before swapping, and never writes question text itself. In compare mode, a criterion without a `compare` block is skipped and listed in `skipped` with the reason `no_compare_question`. | Must | US-3 | Brief, How it works |
| FR-37 | Compare asks each Choice twice: once with the before image first and the options in one order, once with the images and options swapped. It maps both answers to the same labels before combining them. | Must | US-3 | JC-3 |
| FR-38 | When the two ordered answers pick different options, compare sets `agreement` to false and reports a confidence lower than either answer alone. When the combined confidence is below `min_confidence`, `change` is `uncertain`. | Must | US-3, US-9 | JC-3; OQ-8 |
| FR-39 | Compare reports a summary with the count of criteria that improved, regressed, stayed the same, and were uncertain. | Must | US-3, US-14 | This document |

### 7.7 Gate

| ID | Requirement | Priority | Stories | Source |
| --- | --- | --- | --- | --- |
| FR-40 | `crit gate <image>` runs a report and exits 0 when no finding has the verdict `fail`, 1 when at least one does, and 2 when it could not run. | Must | US-4 | Brief, Integration |
| FR-41 | `.crit.yaml` may set a gate policy: a list of criteria or packs that must pass, whether `warn` fails the gate, whether `uncertain` fails the gate, and an optional minimum weighted score. The default fails only on `fail`. | Should | US-4, US-9 | OQ-5 |
| FR-42 | Thresholds and gate policy are read from data at compose time, so changing them never needs a new request to TypeSafe. `--save-answers <file>` writes every raw answer from the ask stage, and the `usage` object, to a JSON file. `--answers <file>` skips the ask stage, runs compose on that file, and makes no network call. | Must | US-4 | Brief, Principles; EV-1 |
| FR-43 | The exit codes 0, 1, and 2 mean the same thing for every command. `report` and `compare` exit 0 when they ran, whatever the verdicts. | Must | US-4 | Brief, Integration |

### 7.8 Packs and marketplace

| ID | Requirement | Priority | Stories | Source |
| --- | --- | --- | --- | --- |
| FR-44 | A pack is a directory that holds `pack.yaml` and a `fixtures/` directory. `pack.yaml` follows the pack schema below. A pack contains no executable code, and the loader rejects any field the schema does not define. | Must | US-5, US-6 | Brief, Principles |
| FR-45 | Every criterion has `id`, `title`, `source`, `question`, `fix`, and at least one of `fail_when`, `warn_when`, or `pass_when`. | Must | US-6 | Brief, A pack |
| FR-46 | The validator rejects a question whose instructions ask the model to count, do arithmetic, or name a hex colour, and reports the criterion. | Should | US-6 | JC-2 |
| FR-47 | `crit packs add <name>[@version]` fetches the pack at its tagged version into the local cache and pins it in `.crit.yaml`. It fetches `pack.yaml` only. The fixtures stay in the marketplace repository. | Must | US-5 | Brief, The marketplace repo |
| FR-48 | `crit packs list` shows pinned packs, their versions, and whether each is cached. `crit packs search <term>` searches the marketplace `index.json` by name, domain, and summary. | Must | US-5 | Brief, The marketplace repo |
| FR-49 | `crit packs validate <dir>` checks a pack against the schema. It fails when a criterion's `fixtures` field has no positive fixture or no negative fixture. It warns when a criterion has no `compare` block. | Should | US-6 | Brief, The marketplace repo |
| FR-50 | `crit packs test <dir>` runs each criterion on the fixtures its `fixtures` field lists. It fails when a positive fixture does not produce `fail` or `warn`, or a negative fixture does not produce `pass`, and it names every fixture that disagreed. When a fixture is not on disk, `crit packs test` fetches it from the marketplace repository first. | Should | US-6 | Brief, The marketplace repo |
| FR-51 | `.crit.yaml` pins each pack to an exact version and pins the model id. A run never resolves a version range. | Must | US-5 | Brief, The marketplace repo; NFR-5 |
| FR-52 | `.crit.yaml` may define packs inline under `packs.inline` with the same schema as a published pack. | Should | US-12 | Brief, Open questions; OQ-4 |
| FR-53 | The `deskcrit-packs` repository has one directory per pack, an `index.json` listing each pack's name, version, domains, and summary, a CI job that validates and fixture-tests every pack, a generated README per pack that lists every criterion's source, and a changelog per pack. | Must | US-5, US-6 | Brief, The marketplace repo |
| FR-54 | A pull request to `deskcrit-packs` that adds a criterion must list one positive fixture that triggers it and one negative fixture that does not in the criterion's `fixtures` field, with both images under the pack's `fixtures/` directory. Every pack declares a license. Every fixture image has a sidecar entry in the pack's `fixtures/ATTRIBUTION.md` with a rights basis from a closed list of four: own work licensed under the pack license, public domain with the source named, an open license that permits redistribution and commercial use (CC0, CC BY, CC BY-SA, the UK Open Government Licence, or MIT or Apache licensed documentation) with the attribution text, or written permission from the owner attached to the pull request. Fair use or fair dealing is never a basis, because it is a defence and cannot be passed on under MIT. CC NC and CC ND images are refused. A fixture captured from a live page also records the source URL, capture date, viewport, device scale factor, and browser version, and is captured once and committed, never re-fetched in CI. No fixture shows a face of a real person, personal data, or a logged-in state. Each fixture file is at most 2 MB. Reason: the marketplace repo is public and MIT licensed, and one takedown would remove a fixture and break the test that depends on it. Review trigger: a takedown notice, or a fixture type the four bases cannot cover. | Must | US-6 | Brief, The marketplace repo |
| FR-55 | Seven first-party packs ship in v1, encoding the guidelines in [GUIDELINES.md](../GUIDELINES.md): `typography` with 36, `layout` with 33, `color` with 30, `accessibility` with 25, `ux` with 47, `dataviz` with 25, and `art-direction` with 43. That is 239 guidelines in total. Every criterion in a first-party pack has a `compare` block. | Must | US-1 | Brief, First-party packs |
| FR-56 | A criterion that encodes a folk rule, such as the rule of thirds or the Z-pattern, says so in its title or source and has a weight below 1. | Should | US-1 | Brief, Principles |
| FR-57 | The `accessibility` pack records the version of each standard it encodes. | Must | US-5 | Brief, Risks |
| FR-58 | Packs that ship example images as Jev criteria. | Won't | none | NG-9; OQ-3 |

Pack schema:

| Field | Level | Required | Meaning |
| --- | --- | --- | --- |
| `name` | pack | yes | Lowercase pack name, unique in the marketplace. |
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
| `question.criteria` | criterion | for `noul` and `choice` | What each option means. For `noul`, keys `true` and `false`. |
| `question.levels` | criterion | for `score` | Ordered list of level descriptions, index 0 first. |
| `fail_when`, `warn_when`, `pass_when` | criterion | at least one | Each holds one predicate, such as `probability_at_least` or `level_at_most`. See the verdict rule under FR-25. |
| `min_confidence` | criterion | no | Below this, the verdict is `uncertain`. |
| `locate` | criterion | no | When true, ask a Box question for the region. |
| `weight` | criterion | no | Number, default 1. |
| `requires` | criterion | no | List of facts paths the criterion needs, for example `facts.viewport_width`. |
| `fix` | criterion | yes | Fix hint written by a person. |
| `view` | criterion | no | Which tiles the criterion is asked on: `page`, `detail`, or `both`. Default `page`. See FR-18. |
| `compare.instructions` | criterion | no, but every first-party criterion has it | The text of the compare Choice, written by a person against the state paths `before` and `after`. See FR-36. |
| `fixtures.positive` | criterion | for `crit packs validate` | List of image paths, relative to the pack directory, that the criterion must flag. |
| `fixtures.negative` | criterion | for `crit packs validate` | List of image paths, relative to the pack directory, that the criterion must pass. |

The loader does not need `fixtures` at run time, so an inline pack under FR-52 may leave it out.

Example `compare` block and `fixtures` field for `faint-body-text`:

```yaml
compare:
  instructions: Comparing `after` with `before`, does body text in `after` stand out from its background more clearly (better), less clearly (worse), or about the same (same)?
fixtures:
  positive: [fixtures/faint-body-text/grey-on-grey.png]
  negative: [fixtures/faint-body-text/dark-on-white.png]
```

### 7.9 CLI

| ID | Requirement | Priority | Stories | Source |
| --- | --- | --- | --- | --- |
| FR-59 | The package declares two commands, `deskcrit` and `crit`, which behave the same. | Must | US-1 | Brief, Stack |
| FR-60 | The commands are `crit report <image> [--pack <name>...] [--context <key=value>...] [--facts <file>] [--json] [--save-answers <file>] [--answers <file>]`, `crit compare <before> <after>` with the same options, `crit gate <image>` with the options of `report` except `--save-answers` and `--answers`, and `crit packs add, list, search, validate, test`. FR-42 defines `--save-answers` and `--answers`. | Must | US-1 to US-6 | Brief, Integration |
| FR-61 | Errors go to stderr. Only the report goes to stdout, so `crit report --json` output can be piped to a JSON parser. | Must | US-1 | This document |
| FR-62 | A flag, a command, or an exit code, once released, is only removed after a deprecation period of at least one minor release in which it still works and prints a warning on stderr. | Must | US-4 | AC-2 |

### 7.10 Library API

| ID | Requirement | Priority | Stories | Source |
| --- | --- | --- | --- | --- |
| FR-63 | The package exports `prepare`, `build`, `ask`, and `compose` as separate functions, plus the TypeScript types of their inputs and outputs. | Must | US-13 | Brief, Integration |
| FR-64 | `ask` takes the TypeSafe adapter as an argument, so a caller can pass a stub or another backend. Every adapter returns the answers and the `usage` object that FR-20 defines. | Must | US-13 | FR-20 |
| FR-65 | The CLI is built only from the four exported functions, so the library and the CLI give identical results on identical inputs. | Must | US-13 | This document |

### 7.11 Claude Code plugin

| ID | Requirement | Priority | Stories | Source |
| --- | --- | --- | --- | --- |
| FR-66 | The plugin ships a skill that teaches the loop: build, screenshot, `crit report --json`, fix the top findings, screenshot, `crit compare`. | Must | US-14 | Brief, Integration |
| FR-67 | The skill stops the loop when the gate passes or when two rounds in a row show no criterion improved. | Must | US-14 | Brief, Integration |
| FR-68 | The plugin ships an optional hook that runs `crit gate` after a UI file changes. | Should | US-14 | Brief, Integration |
| FR-69 | The plugin runs the CLI and holds no judgment logic of its own. | Must | US-14 | Brief, Integration |

## 8. Output contract

The JSON output is the user interface for agents, and it changes slowly. Every document has a `schema_version` that follows semantic versioning. Within a major version the shape only changes by adding optional fields. Removing or renaming a field, changing a field's type, or changing the meaning of a verdict needs a new major version and a deprecation period under FR-62. The JSON schema files for report, compare, and gate are durable artifacts, stored in the repository and checked by EV-2.

### 8.1 Report

The report has these top-level fields: `schema_version`, `mode` with the value `report`, `tool` with name and version, `image` with path, size, and tile count, plus `padded: true` and `padding_px` when prepare padded the whole-page image under FR-8, `context`, `packs` with name and version, `model`, `findings`, `skipped`, and `usage`.

Example with two findings. The numbers are illustrative.

```json
{
  "schema_version": "1.0.0",
  "mode": "report",
  "tool": { "name": "deskcrit", "version": "0.1.0" },
  "image": { "path": "home.png", "width": 1440, "height": 900, "tiles": 1 },
  "context": { "purpose": "landing page", "audience": "small business owners", "platform": "web" },
  "packs": [ { "name": "typography", "version": "1.0.0" } ],
  "model": "jev-1.14",
  "findings": [
    {
      "criterion": "typography/faint-body-text",
      "title": "Body text reads as faint",
      "verdict": "fail",
      "distribution": { "true": 0.84, "false": 0.16 },
      "confidence": 0.91,
      "region": { "x": 120, "y": 540, "width": 620, "height": 180 },
      "source": "W3C, WCAG 2.2, Success Criterion 1.4.3 Contrast (Minimum)",
      "link": "https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum",
      "fix": "Darken the text or lighten the background. For the exact ratio, run axe-core; WCAG wants 4.5:1 for body text and 3:1 for large text.",
      "weight": 1,
      "model": "jev-1.14"
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
      "weight": 2,
      "model": "jev-1.14"
    }
  ],
  "skipped": [
    { "criterion": "layout/reflow-at-320", "reason": "requires facts.viewport_width, which the facts file does not have" }
  ],
  "usage": { "requests": 1, "input_tokens": 41250, "cost_usd": 0.0017, "latency_ms": 1840 }
}
```

### 8.2 Compare

The compare document has `schema_version`, `mode` with the value `compare`, `tool`, `before` and `after`, each a report without its own `usage`, `model`, `changes`, `summary`, and `usage`. Each entry in `changes` has `criterion`, `change` with the value `better`, `worse`, `same`, or `uncertain`, `distribution` over those three labels, `confidence`, `agreement` as a boolean, and `model`. `summary` has the counts `improved`, `regressed`, `same`, and `uncertain`.

### 8.3 Gate

The gate document is a report with `mode` set to `gate` and one more field, `gate`, which holds `passed` as a boolean, `policy` as the policy that was applied, and `blocking` as the list of criterion ids that caused a failure. The exit code agrees with `passed`.

## 9. Non-functional requirements

| ID | Requirement | Reason | Reconsider when |
| --- | --- | --- | --- |
| NFR-1 | `crit` runs on every Node.js release that is in active or maintenance long-term support on the release date. | Most agent environments have a supported Node.js. | A target environment lacks Node.js. |
| NFR-2 | `crit` ships as one bundled JavaScript file that runs with `npx deskcrit` with no separate install step. The image library `sharp` is the only native dependency. | An agent can run it on any machine with Node.js. | `sharp` cannot be bundled for a common platform. |
| NFR-3 | `crit` has no browser dependency. | Capture is the caller's job, and a browser makes the install heavy. | Never in v1. |
| NFR-4 | Every run reports its latency and cost. No latency or cost target is set until milestone M-1 measures them, because TypeSafe publishes no image latency and the token cost of an image is unknown. | Unknown figures cannot be targets. | M-1 completes. Then this row gets a target. |
| NFR-5 | The same prepared image, the same pinned packs, the same pinned model, and the same context give the same verdicts. Prepare, build, and compose are deterministic. Ask is the only stage whose output may vary, and EV-6 measures how much. | Agents and gates need repeatable results. | Jev self-consistency on the fixture set falls below the floor in EV-6. |
| NFR-6 | A project with a `.crit.yaml` never sends `jev-latest`. It sends the pinned versioned model id. | Model updates change accuracy, so thresholds are tuned per version. | TypeSafe guarantees stable answers across model releases. |
| NFR-7 | Every image sent has each side between 280 and 1568 pixels, is PNG or JPEG, is upright, and has no metadata. | TypeSafe's image limits. Metadata can leak private data. | TypeSafe changes its limits. |
| NFR-8 | Every request with an image carries the header `TypeSafe-Danger-Zone-Images: true`. | TypeSafe requires the opt-in for image support. | TypeSafe makes image support generally available. |
| NFR-9 | No question asks for arithmetic, counting, or a hex colour. A number a criterion needs comes from the facts file. | Jev is unreliable at these tasks. | TypeSafe documents that a Jev version is reliable at them. |
| NFR-10 | The state holds each image once, and questions refer to it by path. | Each image reference adds the image again to the expanded request. | TypeSafe changes how references expand. |
| NFR-11 | The context for each question stays under 32,000 tokens. Build stops with exit code 2 if a facts file would exceed it. | The default per-question context limit is 32,000 tokens. | TypeSafe raises the limit. |
| NFR-12 | Text inside the design, such as "this design is excellent", does not change the verdict. EV-7 measures this on adversarial fixtures. | TypeSafe documents that content can steer the model. | Never. |
| NFR-13 | A pack contains no executable code. The loader parses YAML into data only, with no custom tags. | A pack from a stranger is safe to install and reviewable by a non-programmer. | Never. |
| NFR-14 | `crit` reads the TypeSafe API key from the environment and never writes it to output, logs, or the cache. | Output is pasted into issues and agent transcripts. | Never. |

## 10. Jev and TypeSafe constraints

These come from TypeSafe's published limits and known weaknesses for `jev-1.13` and `jev-1.14`, as recorded in [BRIEF.md](../BRIEF.md#jev-specific-constraints-the-design-respects). This document does not add claims about TypeSafe beyond the brief.

| ID | Constraint | Design response |
| --- | --- | --- |
| JC-1 | Images must have each side between 280 and 1568 pixels, in PNG or JPEG, upright. | Prepare resizes, rotates, strips metadata, and tiles. FR-6 to FR-8, NFR-7. |
| JC-2 | Jev is unreliable at arithmetic, counting, and hex colours. | Packs ask about visible symptoms. Numbers come from the facts file. FR-46, NFR-9. |
| JC-3 | Choice option order can sway the answer. | Compare asks each question twice with order swapped, and disagreement lowers confidence. FR-37, FR-38. |
| JC-4 | Per-question context is 32,000 tokens by default. | The state is the image, the context, and the facts file only. FR-17, NFR-11. |
| JC-5 | Instructions are read literally, and criteria must align with them. A Noul where true means no underperforms. | Pack review and fixture tests check each criterion. The schema guide says `true` is the defect. FR-45, FR-50. |
| JC-6 | Each use of an image reference adds the image again to the expanded request. | The image goes in the state once and questions point at it by path. FR-15, NFR-10. |
| JC-7 | Image support needs the opt-in header and is labelled not production-ready. Limits and request format can change between releases. | One adapter interface, the header on every image request, and the model id on every finding. FR-19, FR-20, NFR-8. |
| JC-8 | Accuracy changes as models update. | Pin the model, tune thresholds per model version, never use `jev-latest` in a pinned project. FR-22, NFR-6. |
| JC-9 | Text in the design can steer the model. | Adversarial fixtures in the evaluation set. NFR-12, EV-7. |
| JC-10 | TypeSafe publishes about 100 ms for text requests and no figure for image requests. Price is $0.042 per million input tokens, with output free. | Print latency and cost on every run. Set targets after M-1. NFR-4. |
| JC-11 | Questions in one request are evaluated independently and in parallel. | One request per tile with every question for that tile. FR-19. |

## 11. Architecture constraints

An agent must be able to delete `prepare`, `build`, `ask`, `compose`, or the pack loader and rebuild it from this document and evaluations EV-1 to EV-7. The six items in the table below must survive that deletion. A change to any of them needs review by the owner named in section 1 and a row in the changelog in section 1.

### 11.1 Durable and disposable

| Durable | Where it lives |
| --- | --- |
| This document | `docs/PRD.md` |
| The pack schema | A JSON Schema file in the repository, checked by EV-3 |
| The output JSON schemas for report, compare, and gate | JSON Schema files in the repository, checked by EV-2 |
| The CLI commands, flags, and exit codes | FR-59 to FR-62, checked by EV-1 |
| The fixture set and the durable evaluations | Section 12 |
| The TypeSafe adapter interface | FR-20 |

Disposable: the implementation of every module, including prepare, build, ask, compose, the renderers, the pack loader, the cache, and the plugin's skill text. Unit tests of those implementations are disposable too.

### 11.2 Component rules

| ID | Rule |
| --- | --- |
| AC-1 | Each pipeline stage, prepare, build, ask, and compose, is a separate component that can be rewritten without changing the others. Stages talk only through the typed values the library API exports. |
| AC-2 | The CLI surface and the JSON output are the slowest layer. Changes are additive, optional, and reversible, with visible deprecation. FR-62. |
| AC-3 | A person or an agent can understand each component's purpose and rules in about ten minutes. A component that grows past that is split. |
| AC-4 | Each component can be verified at its own boundary without the others. Prepare is tested with image files, build with packs and a prepared image, ask with a stub adapter, and compose with recorded answers. |
| AC-5 | Each piece of state has one owner that writes it. The pack cache is written only by `crit packs`. `.crit.yaml` is written only by `crit packs add` and by the person. The fixture set is written only by people, through review. |
| AC-6 | Durable evaluations run against the CLI and the JSON files, not against internal functions. A rewrite in another language would still pass them. |
| AC-7 | Prepare, build, and compose are pure functions with no hidden state. Network access happens only in ask. File writes happen only in `crit packs`, in the CLI layer that writes the report to stdout, and in the CLI layer that writes the `--save-answers` file (FR-42). No stage writes a file. |
| AC-8 | Only the adapter behind FR-20 knows TypeSafe's request format and how TypeSafe reports usage. No pack field and no other module depends on either. Other modules read usage only from the `usage` object the adapter returns. |

### 11.3 Recorded constraint: TypeScript on Node.js

| Field | Value |
| --- | --- |
| Constraint | The implementation is TypeScript on Node.js. |
| Reason | A single bundled file runs with `npx` on any machine with Node.js. `sharp` handles the resize. TypeSafe ships an official JavaScript SDK. |
| Owner | Benjamin Jackson |
| Reconsider when | TypeSafe ships an SDK or image support that makes another runtime simpler, or `sharp` stops being the simplest way to resize in Node.js. |

## 12. Evaluation plan

Evaluations come in three tiers. Ephemeral unit tests check one implementation and are deleted with it. Durable evaluations define correctness and survive any rewrite. Live evaluations watch real runs for drift.

### 12.1 Ephemeral tests

Unit tests for each module, written next to the module. They are disposable. A rewrite deletes them and writes new ones. No requirement in this document may be checked only by an ephemeral test.

### 12.2 Durable evaluations

| ID | Evaluation | Pass condition |
| --- | --- | --- |
| EV-1 | Golden-output tests of the CLI. Run each command on fixed images with `--answers <file>` and a recorded answer file, and compare stdout, stderr, and exit code with stored expected output. The test serialises the JSON with sorted keys before it compares. The volatile fields `usage.latency_ms` and `tool.version` are left out of the comparison. | Identical JSON outside the volatile fields, and identical exit codes. |
| EV-2 | Every JSON document the CLI writes validates against the report, compare, or gate schema. | 100 percent valid. |
| EV-3 | Every first-party pack and every pack in `deskcrit-packs` validates against the pack schema. | 100 percent valid. |
| EV-13 | The guideline counts in the GUIDELINES.md section table and in FR-55 match the number of entries in each section of GUIDELINES.md, counted both by `###` heading and by `- **Rule:**` bullet. Run `evals/check-guideline-counts.sh`. The script reads FR-55 literally, so FR-55 must keep the phrasings "`pack` with N" and "That is N guidelines in total". | Exit 0. |
| EV-4 | Pack fixture tests: each criterion fires on its positive fixtures and stays quiet on its negative fixtures. | Every fixture agrees with its label, or the criterion is demoted under EV-5. |
| EV-5 | Agreement between Jev and human labels on the fixture set, per criterion. The fixture set has at least 100 designs with human-labelled defects across the seven domains, and at least 30 before-and-after pairs with a human preference. | Each criterion at or above the agreement floor may ship with `fail`. Below the floor it ships with `warn` as its most severe verdict, or does not ship. The floor is set in OQ-9. |
| EV-6 | Self-consistency: each criterion asked several times on the same fixture with the same model. | The verdict matches across runs at or above the self-consistency floor in OQ-9. |
| EV-7 | Adversarial fixtures with text that praises or condemns the design. | Verdicts match the same design without the text. |
| EV-8 | Taste-gap fixtures: designs that pass every rule and are still judged bad by designers. | Recorded, not gated. They show how far the packs fall short of taste. |
| EV-9 | Compare order bias: each before-and-after pair run in both orders. | `change` agrees with the human preference at or above the floor, and swapping the inputs swaps `better` and `worse`. |
| EV-10 | The loop test: Claude Code with `crit` and the plugin on a deliberately bad page. | Count of rounds to clear the gate, and a designer agrees the result is better. Target set after M-1. |

### 12.3 Live evaluations

| ID | Evaluation | What it watches |
| --- | --- | --- |
| EV-11 | Cost and latency per run, from the `usage` object, on a typical landing page. | Budget and slowdowns. |
| EV-12 | Model version drift: when TypeSafe releases a new model version, run EV-5 and EV-6 on it before any project pins it. | Changed agreement. Thresholds are re-tuned and pack changelogs say why. |

## 13. Assumptions, dependencies, and risks

| ID | Risk or assumption | Mitigation | Revisit when |
| --- | --- | --- | --- |
| R-1 | TypeSafe image support is not production-ready. It needs an opt-in header, and its limits and format can change. This is the central dependency. | One adapter interface, the model id on every finding, thresholds pinned per model version, no `jev-latest`. | TypeSafe changes the image request format, or another API returns calibrated probabilities for many questions over one image in one request. |
| R-2 | We do not know how well Jev judges design images. No published results exist, and TypeSafe's cookbooks cover text. | Milestone M-1 measures agreement before other code is written. | M-1 results. Agreement below the floor on most criteria stops the project. |
| R-3 | "Reads as faint" disagrees with the 4.5:1 contrast line in both directions. | The report never claims conformance, and fix hints name the measuring tool. FR-34. | Never. |
| R-4 | Jev answers the question as written, so a vague criterion gives the same wrong answer every run. | Pack CI with positive and negative fixtures. FR-49, FR-50, EV-4. | A criterion fails EV-4 twice after rewording. Then remove it. |
| R-5 | Gaming: an agent raises the score without improving the page, for example by hiding a second call to action. | Order-swapped compare, and taste-gap fixtures in EV-8. | EV-10 shows a designer rejecting results that cleared the gate. |
| R-6 | Cost per run is unknown until M-1, because the token cost of an image request is unknown. | Every run prints its cost. FR-33. | M-1 results. If a full run costs too much, packs are split by mode. |
| R-7 | Guidelines change. WCAG 2.2 came in 2023, EN 301 549 v4.1.1 in 2026, and the ADA Title II dates moved in April 2026. | Packs are versioned, and the accessibility pack records the standard version it encodes. FR-57. | Any cited standard publishes a new version. |
| R-8 | Assumption: callers can produce a screenshot. | NG-1. Claude Code has a browser tool and Playwright. | A common caller cannot capture. |
| R-9 | Dependency: the official TypeSafe JavaScript SDK and `sharp`. | Both sit behind narrow interfaces. | Either is abandoned or breaks the single-file bundle. |

## 14. Milestones and release plan

| ID | Milestone | Exit criterion | Delivers |
| --- | --- | --- | --- |
| M-1 | Spike. One screenshot, twenty hand-written questions across domains, the danger-zone header, and a spreadsheet of Jev's answers against two designers' answers. | A written decision to continue or stop, with agreement figures, measured image latency, and measured token cost per image. NFR-4 gets its targets. | R-2, R-6, JC-10 answered. |
| M-2 | Report. Prepare, build, ask, and compose, with JSON and readable output. The pack schema and a pack loader that reads a local pack directory, with no cache and no marketplace. The `typography` and `layout` packs first. | EV-1, EV-2, and EV-3 pass for report. `typography` and `layout` pass EV-3, and pass EV-5 when run with `crit report` on their fixtures. | FR-1 to FR-34, with FR-11 reading local pack directories only. FR-42, FR-44, FR-45, FR-59 to FR-61, FR-63 to FR-65. US-1, US-2, US-7 to US-11, US-13. |
| M-3 | Packs and marketplace. The `crit packs` commands, the pack cache, the `deskcrit-packs` repository with CI and fixtures, and the remaining five first-party packs. | All seven packs pass EV-3, EV-4, and EV-5. `crit packs add` works from the marketplace. | FR-11 with the pack cache, FR-46 to FR-58. US-5, US-6, US-12. |
| M-4 | Compare and gate. Order-swapped comparison, thresholds, and exit codes. | EV-1 and EV-2 pass for compare and gate. EV-9 passes. | FR-35 to FR-41, FR-43, FR-62. US-3, US-4. |
| M-5 | Claude Code plugin. Skill and hook. The loop test. | EV-10 has been run and recorded. | FR-66 to FR-69. US-14. |

## 15. Open questions

| ID | Question | Proposed default | Who decides |
| --- | --- | --- | --- |
| OQ-1 | Tiling tall pages: judge each viewport-sized crop and merge, or judge a downscaled whole page for layout and crops for detail? | The brief's prepare stage already does both. M-1 tries both and keeps what agrees better with designers. Note, 2026-10-23: FR-8 now pads the whole-page image of a tall page to 280 pixels on its short side. If M-1 shows that padding changes layout verdicts, prepare splits the page into overlapping segments with an aspect ratio of at most 5.6:1 instead. | Benjamin Jackson, after M-1 |
| OQ-2 | How much context does a visual question get: the image only, or the image plus a one-line purpose? | Image plus purpose. Packs are written assuming the purpose is present. | Benjamin Jackson, after M-1 |
| OQ-3 | May packs ship example images as Jev criteria? | No in v1, because of image rights. FR-58. | Benjamin Jackson, after v1 |
| OQ-4 | May a project define its own pack inline in `.crit.yaml`? | Yes, with the same schema. FR-52. | Benjamin Jackson |
| OQ-5 | What does the gate fail on? The brief says "thresholds" but does not define a project-level threshold or how `weight` combines. | Resolved 2026-10-23. The gate fails on any `fail` verdict. An optional policy in `.crit.yaml` may loosen that later. FR-41. | Benjamin Jackson |
| OQ-6 | Where does `uncertain` sort relative to `warn` and `pass`? The brief does not say. | Resolved 2026-10-23. The order is fail, warn, uncertain, pass. FR-28. | Benjamin Jackson |
| OQ-7 | How are findings merged across tiles? The brief does not say. | Resolved 2026-10-23. The most severe verdict wins, and each tile's region is kept. FR-29. | Benjamin Jackson, after M-1 |
| OQ-8 | By how much does disagreement between the two ordered compare answers lower confidence? | Decided 2026-10-23: the rule is set after M-1 from the before-and-after pairs. Until then the implementation uses a provisional rule, the lower of the two confidences multiplied by the probability mass the two answers share, held in one named constant and marked provisional in code. | Benjamin Jackson, after M-4 |
| OQ-9 | What are the agreement floor and the self-consistency floor? | Set after M-1 from the spike's figures. | Benjamin Jackson, after M-1 |
| OQ-10 | What is the default `min_confidence` when a criterion does not set one? | Decided 2026-10-23: the value is set after M-1 from the spike's figures. Until then the implementation uses a provisional 0.6, the value in the brief's example, held in one named constant and marked provisional in code. | Benjamin Jackson |
| OQ-11 | How do threshold objects work for `choice` questions? The brief shows `probability_at_least` and `level_at_most` only. | Resolved 2026-10-23. A `choice` criterion uses `option_is` or `option_in`. See the verdict rule under FR-25. | Benjamin Jackson |
| OQ-12 | Dependency policy. Fowler's rules say only that a dependency must work with the build and must not bind the project to one tool. | Resolved 2026-10-23. Runtime dependencies are the TypeSafe SDK, `sharp`, and a YAML parser. Any new runtime dependency needs a changelog row here with its reason and review trigger. | Benjamin Jackson |
| OQ-13 | Local state layout. | The pack cache lives in the user cache directory under `deskcrit/packs/<name>/<version>/`. `.crit.yaml` lives in the project root. Nothing else is written. | Benjamin Jackson |
| OQ-14 | Provenance format: how does a change record which requirement and which evaluation it serves? | Each commit message and pull request names the FR, NFR, or US IDs it serves and the EV IDs that check it. | Benjamin Jackson |
| OQ-15 | `crit packs validate` and `crit packs test` are not named in the brief, which names only `add`, `list`, and `search`. | Resolved 2026-10-23. Both ship as Should in M-3, because pack authors need a local check before CI. FR-49, FR-50. | Benjamin Jackson |
| OQ-16 | The brief's example criterion `single-focal-point` asks "how many elements compete", which reads as a counting question and conflicts with JC-2. | Reword it to ask whether one element dominates, with the same three levels. | Pack author, during M-2 |
| OQ-17 | The brief does not say how fixture images are produced. Hand-collected screenshots are slow to gather, carry rights questions, and rarely come in matched pairs. | Produce most fixtures from source in `deskcrit-packs`: one HTML and CSS template per criterion, rendered by a pinned Playwright Chromium with fonts shipped in the repo, with one parameter that turns the defect on or off, so the positive and the negative differ only in the defect. Charts use inline SVG in the same templates. The rendered PNGs are committed so the fixture tests do not depend on a renderer. The `art-direction` pack and a share of every pack use real or licensed screenshots as well, because rendered pages are cleaner than production pages and illustration style cannot be rendered from a template. The renderer is a development dependency of `deskcrit-packs` only, so NG-1 still holds. For the real-page share, take pages only from sources whose license FR-54 accepts: United States federal government sites (public domain, and a rich source of real defects), GOV.UK and the GOV.UK Design System (Open Government Licence and MIT), the design system demo pages of USWDS, Carbon, Primer, and Material, Figma Community files (CC BY 4.0 by default), Wikipedia and MDN (CC BY-SA), and for posters, type, charts, and illustration the open access collections of the Library of Congress, the Smithsonian, the Metropolitan Museum, the Rijksmuseum, and Wikimedia Commons with a per-file license check. Bad real examples come mainly from government pages and from contributors who own the page. Never use a living company's page as a bad example without written permission. | Benjamin Jackson, before M-3 |

## 16. Glossary

| Term | Meaning |
| --- | --- |
| Jev | TypeSafe's System One model. It answers typed questions over a state and returns a probability per option and a confidence. |
| System One | TypeSafe's name for its family of fast judgment models that return typed answers instead of generated text. |
| Noul | The TypeSafe question type for yes or no. |
| Choice | The TypeSafe question type for one option from a set. |
| Score | The TypeSafe question type for a degree along described levels. |
| Box | The TypeSafe question type that returns a bounding box on an image. |
| State | The data sent with a request: the image, the context, and the facts file. |
| Pack | A versioned directory with a `pack.yaml` of criteria, with sources and fix hints, and a `fixtures/` directory. It holds no code. |
| Criterion | One rule in a pack, asked as one question. |
| Finding | The result for one criterion on one image, with the fields in FR-26. |
| Verdict | `pass`, `warn`, `fail`, or `uncertain`, decided in code from the distribution and thresholds. |
| Fixture | An image with a human label, used to test criteria and measure agreement. |
| Gate | The `crit gate` command, which passes or fails a design with an exit code. |
| Facts file | JSON the caller measured with other tools, passed in unchanged. |
| Tile | One crop or downscaled copy of a large image, sent as its own request. |
| Conservation layer | The parts that must survive a rewrite: the interfaces, schemas, flags, exit codes, and evaluations. The term is Chad Fowler's. |
