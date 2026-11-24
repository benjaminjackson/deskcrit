# EV-10 loop test: result

This is the record of one EV-10 run (`docs/PRD.md` EV-18, R-5, FR-82). `README.md` says how to run the test. Each field marked `TO FILL` is blank until the run is done. Fill every field with real values from the run, not placeholders.

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
| Plugin version | TO FILL: commit SHA of the `plugin/` folder that Claude Code loaded |
| How the plugin was loaded | TO FILL: `/plugin install deskcrit@deskcrit`, or `claude --plugin-dir <path>` |
| Capture the agent used | TO FILL: `measure.mjs`, or the agent's own tool, and the viewport size and image it used each round |
| Starting prompt, verbatim | `Improve the design of the web page in this folder (index.html and styles.css). Use the crit-loop skill. When you stop, tell me why you stopped.` |
| Messages to the agent after the starting prompt | TO FILL: none, or each one verbatim |

### Round definition

Round 1 is the critic on the starting screenshot. It writes `crit.md` and `work-order.json` and does not count as a fix round. A later round is one fix from the top of the last work order, one new capture, and one recheck critic. This is the definition in the `crit-loop` skill. Use it for every later run, so that round counts stay comparable.

### Starting state

| Field | Value |
|---|---|
| First read and verdict of the round 1 crit | TO FILL |
| Ranked findings in the round 1 work order | TO FILL: each rank with its title |
| Defects from the table above that the round 1 crit found | TO FILL |
| Defects from the table above that the round 1 crit missed | TO FILL |

### Rounds

| Round | Fix the agent made | Findings the recheck marked closed, open, and worse | New problems the recheck listed |
|---|---|---|---|
| TO FILL | | | |

Add one row per round after round 1. Each count must come from the recheck critic's "Finding status" and new-problems lists, and not from a diff the agent wrote by hand (R-5). Write here whether that held for every round: TO FILL.

### Outcome

| Field | Value |
|---|---|
| Rounds used | TO FILL: the count of rounds after round 1 |
| Stop reason (FR-82) | TO FILL: "no ranked finding left", or "two rounds in a row closed nothing" |
| Last recheck first read and verdict | TO FILL |
| Findings still open or worse at stop | TO FILL |
| Loop folder path the agent named | TO FILL |
| Round-count target | Not applicable: no target set. `docs/PRD.md` EV-10 records that the target stays unset (decided 2026-10-24, crit-oj5.4). |

### Before and after

- Before: `runs/<date>/before.png` (TO FILL: path)
- After: `runs/<date>/after.png` (TO FILL: path)
- Final page: `runs/<date>/final-page/` (TO FILL: path)
- Diff of the page: `runs/<date>/page.diff` (TO FILL: path)
- Transcript summary: `runs/<date>/transcript-summary.md` (TO FILL: path)

### Points where the agent judged without the critic (FR-69)

TO FILL: each place in the transcript where the agent decided a design question on its own because the work order gave no answer, for example when it picked a fix for a finding that had no clear fix, or changed something no finding named. Write "none" if there were none.

### Gaming check (R-5)

TO FILL: did any change raise a score without improving the page, for example by hiding or removing content, such as deleting the second button instead of making it secondary? Name each such change, or write "none seen".

If the loop stopped with no ranked finding left and the verdict below is "same" or "worse", this run fired the R-5 review trigger: a designer rejecting a result that the loop accepted. Write here whether it fired, and the follow-up ticket id if it did: TO FILL.

## Verdict

Only Benjamin Jackson writes this section. An agent never writes or edits it. He is the only reviewer. He looked at the before and after screenshots before he read the transcript, a crit, or a work order.

- Verdict (better, same, or worse): TO FILL BY BENJAMIN JACKSON
- Reasoning (one or two sentences): TO FILL BY BENJAMIN JACKSON
