# EV-10 loop test: result

This is the record of one EV-10 run (`docs/PRD.md` EV-10, R-5, FR-66, FR-67, M-5). `README.md` says how to run the test. Each field marked `TO FILL` is blank until the run is done. Fill every field with real values from the run, not placeholders.

## The bad page

The page in `bad-page/` starts with these defects. Each one is a plain mistake that a coding agent often makes, and each targets one criterion of a bundled pack. They were picked from the criteria text in `packs/*/pack.yaml` and `GUIDELINES.md` only, with no pack scores, answers, or labels.

| Defect on the page | Pack | Criterion |
|---|---|---|
| The lead paragraph, the card text, and the footer are light gray (`#a3a3a3`) on white. | basics | `text-reads-faint` |
| "Start free trial" and "Book a demo" are the same filled blue button, side by side. | basics | `competing-primary-buttons` |
| The four-line lead paragraph is centered. | basics | `centered-or-right-paragraphs` |
| The page heading and the card headings are regular weight and the same color as the body text, so they differ from it only in size. | typography | `headings-differ-only-in-size` |
| "Why studios use Quillfern" stands above the cards like a heading, in the same size, weight, and color as body text. | typography | `heading-indistinct` |
| Every block, from the logo and menu to the card text, is centered on one axis. | layout | `everything-centered` |
| Each card has a 2 px near-black outline, and 2 px near-black rules divide the header and the footer. | layout | `heavy-rules-and-boxes` |
| The menu shows every item the same, with nothing to mark the page the visitor is on. | ux | `no-current-location-shown` |

## The run

| Field | Value |
|---|---|
| Date | TO FILL (YYYY-MM-DD) |
| Person who ran it | Benjamin Jackson |
| crit version | TO FILL: `tool.version` from the first `crit report --json`, and the commit SHA of the clone `crit` was built from |
| Plugin version | TO FILL: commit SHA of the `plugin/` folder that Claude Code loaded |
| How the plugin was loaded | TO FILL: `/plugin install deskcrit@deskcrit`, or `claude --plugin-dir <path>` |
| Pinned model id (FR-22, FR-26) | TO FILL: `model` from the first `crit report --json`; `.crit.yaml` pins `jev-1.14.0` |
| Packs | basics, typography, layout, ux (bundled with the CLI, from `.crit.yaml`; record the versions from `packs` in the first report: TO FILL) |
| Screenshot size the agent used | TO FILL |
| Starting prompt, verbatim | `Improve the design of the web page in this folder (index.html and styles.css). Use the crit-loop skill. When you stop, tell me why you stopped.` |
| Messages to the agent after the starting prompt | TO FILL: none, or each one verbatim |

### Round definition

A round is one fix, one new screenshot, one `crit compare`, and one `crit gate`. The first round, `crit report` and `crit gate` on the starting screenshot, does not count. This is the definition in the `crit-loop` skill. Use it for every later run, so that round counts stay comparable.

### Starting state

| Field | Value |
|---|---|
| First `crit gate` result | TO FILL: passed or failed, and `gate.blocking` |
| First report findings | TO FILL: each criterion id with its verdict |
| Defects from the table above that the first report found | TO FILL |
| Defects from the table above that the first report missed | TO FILL |

### Rounds

| Round | Fix the agent made | `crit compare` summary (improved, regressed, same, uncertain; FR-39) | `crit gate` counts (fail, warn, pass, uncertain) | `gate.passed` |
|---|---|---|---|---|
| TO FILL | | | | |

Add one row per round. Each summary must come from `crit compare` output, which compares two full reports, and not from a diff the agent wrote by hand (R-5). Write here whether that held for every round: TO FILL.

### Outcome

| Field | Value |
|---|---|
| Rounds to clear the gate | TO FILL: the count, or "did not clear" |
| Stop reason (FR-67) | TO FILL: "the gate passed", or "two rounds in a row with no criterion improved" |
| Last `crit compare` summary | TO FILL |
| Last `gate.blocking` | TO FILL |
| Criteria skipped in any round | TO FILL |
| EV-10 round-count target | Not applicable: no target set. `docs/PRD.md` EV-10 records that the target stays unset (decided 2026-10-24, crit-oj5.4). |

### Before and after

- Before: `runs/<date>/before.png` (TO FILL: path)
- After: `runs/<date>/after.png` (TO FILL: path)
- Final page: `runs/<date>/final-page/` (TO FILL: path)
- Diff of the page: `runs/<date>/page.diff` (TO FILL: path)
- Transcript summary: `runs/<date>/transcript-summary.md` (TO FILL: path)

### Points where the agent judged without crit (FR-69)

TO FILL: each place in the transcript where the agent decided a design question on its own because the plugin or `crit` gave no answer, for example when it picked a fix for a finding that had no clear fix, or changed something no finding named. Write "none" if there were none.

### Gaming check (R-5)

TO FILL: did any change raise a score without improving the page, for example by hiding or removing content, such as deleting the second button instead of making it secondary? Name each such change, or write "none seen".

If the gate passed and the verdict below is "same" or "worse", this run fired the R-5 review trigger: "EV-10 shows a designer rejecting results that cleared the gate." Write here whether it fired, and the follow-up ticket id if it did: TO FILL.

## Verdict

Only Benjamin Jackson writes this section. An agent never writes or edits it. He is the only reviewer. He looked at the before and after screenshots before he read any `crit` output.

- Verdict (better, same, or worse): TO FILL BY BENJAMIN JACKSON
- Reasoning (one or two sentences): TO FILL BY BENJAMIN JACKSON
