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
| Date | 2026-11-24 |
| Person who ran it | Benjamin Jackson |
| Plugin version | `4a9dc619da91c6305dabff2576875b023a7df08a` |
| How the plugin was loaded | `claude -p --plugin-dir /Users/ben/github/crit/plugin`. This run was headless (`claude -p`, stream-json output saved as `transcript.jsonl`), not an interactive session, so it has no `/export` file. Permission mode `acceptEdits`, allowed tools `Read Edit Write Glob Grep Agent Skill Bash(node *) Bash(ls *) Bash(mkdir *) Bash(cp *) Bash(git diff *) Bash(git status *) Bash(git log *)`. The run is a smoke test for crit-7hw.4: the fixer added no new element, so the new template-tell checks of a new element never fired. EV-24 and EV-25 (crit-7hw.5, crit-7hw.6) test those checks. |
| Capture the agent used | `measure.mjs` with no viewport flag in both rounds: `desktop.png` (1280 x 800 px), `phone.png` (390 x 844 px), `tablet.png` (768 x 1024 px), `widescreen.png` (1920 x 1080 px), and `facts.json`. All four images and the facts file went to each critic, the work-order agent, and the recheck. |
| Starting prompt, verbatim | `Improve the design of the web page in this folder (index.html and styles.css). Use the crit-loop skill. When you stop, tell me why you stopped.` |
| Messages to the agent after the starting prompt | none |

### Round definition

Round 1 is the critic on the starting screenshot. It writes `crit.md` and `work-order.json` and does not count as a fix round. A later round is one fix from the top of the last work order, one new capture, and one recheck critic. This is the definition in the `crit-loop` skill. Use it for every later run, so that round counts stay comparable.

### Starting state

| Field | Value |
|---|---|
| First read and verdict of the round 1 crit | First read: the eye lands on the headline and drops to two identical blue buttons, where it stops, because nothing says which one to press; it feels like a wireframe, with thin regular-weight type, most words in pale gray, and three cards in heavy black boxes; on the phone the last card runs off the right edge. Verdict: "It doesn't do its job yet." The selling words are too faint to read, and the phone layout is broken. |
| Ranked findings in the round 1 work order | 1. The phone page is wider than the phone. 2. Most of the words are too faint to read comfortably. 3. Two equal primary buttons. 4. The lead paragraph is set wide and centered. 5. Heavy black boxes around the feature cards, and black rules across the page. With rank null: the section label ranks below the card titles; nothing in the nav marks the current page; single short words alone on the last line of two cards; the hero is the stock template. |
| Defects from the table above that the round 1 crit found | `text-reads-faint` (rank 2), `competing-primary-buttons` (rank 3), `centered-or-right-paragraphs` (rank 4), `heavy-rules-and-boxes` (rank 5), `heading-indistinct` (rank null, section label), `no-current-location-shown` (rank null). `everything-centered` in part: rank 4 names the centered paragraphs, and the rank-null stock-hero finding names the hero stacked on one centered axis, but no finding names the centered logo and menu. |
| Defects from the table above that the round 1 crit missed | `headings-differ-only-in-size`. The first read says "thin regular-weight type", but no finding names it, and "What's working" praises the type scale. The crit also found two problems not in the table: the phone page overflows its viewport (rank 1), and single words sit alone on card last lines. |

### Rounds

| Round | Fix the agent made | Findings the recheck marked closed, open, and worse | New problems the recheck listed |
|---|---|---|---|
| 2 | Fixed all nine findings in one pass: rewrote most of `styles.css` (one flush-left 960 px column, darker text, 40 px bold h1, 18 px lead at 60ch, outline second button, 24 px bold section title, pale filled cards with no outline, no header or footer rules, underlined current nav item, `text-wrap: pretty` on card text, cards in one column below 640 px), and in `index.html` added `aria-current="page"` on Home and primary and secondary classes on the two buttons. | 8 closed, 1 open (stock-hero-template, rank null), 0 worse, 0 closed with a new problem | None |

Add one row per round after round 1. Each count must come from the recheck critic's "Finding status" and new-problems lists, and not from a diff the agent wrote by hand (R-5). Write here whether that held for every round: it held. The counts come from the recheck's "Finding status" list in `.crit-loop/round-2/crit.md`.

### Outcome

| Field | Value |
|---|---|
| Rounds used | 1 |
| Stop reason (FR-82) | no ranked finding left |
| Last recheck first read and verdict | First read: the eye lands on the bold black headline, drops to the paragraph, then to the blue "Start free trial" button, the only filled color; a calm, plain landing page that feels orderly and easy to trust; the same order holds in one column on the phone; on desktop and widescreen the hero text leaves empty space on its right. Verdict: "The fixes worked." The only thing left is a matter of taste: the layout is still a generic headline, paragraph, and buttons over three equal cards. |
| Findings still open or worse at stop | stock-hero-template, open, rank null. It needs content specific to Quillfern, which only the owner has, so the agent left it open and said so at the stop. |
| Loop folder path the agent named | `/Users/ben/scratch/crit-loop-test-headless/.crit-loop/`. The permission settings refused the system temp folder, so the agent put the loop folder in the project. |
| Round-count target | Not applicable: no target set. `docs/PRD.md` EV-10 records that the target stays unset (decided 2026-10-24, crit-oj5.4). |

### Before and after

- Before: `runs/2026-11-24/before.png`
- After: `runs/2026-11-24/after.png`
- Final page: `runs/2026-11-24/final-page/`
- Diff of the page: `runs/2026-11-24/page.diff`
- Transcript summary: `runs/2026-11-24/transcript-summary.md`

### Points where the agent judged without the critic (FR-69)

- The loop folder: the system temp folder was refused, and the agent chose `.crit-loop/` in the project ("my choice").
- The h1: the agent made it 40 px, weight 700, #171717, with `max-width: 18ch` and -0.01em letter spacing. No finding named the h1; the round 1 crit missed `headings-differ-only-in-size`.
- Body and nav text: the agent darkened the body text from #333333 to #262626 and set the nav to #404040. Finding 2 named only the #a3a3a3 text.
- The header: the agent put the logo on the left and the nav on the right in one row. No finding named the header layout.
- Sizes and spacing that no finding set: the lead at 18 px, the card titles at 18 px weight 600, the hero and section padding, and an 8 px radius on the cards.
- Choices inside a direction: an outline (not a text) button for "Book a demo", and a pale fill (#f5f5f4) in place of the card outlines.
- Before the HTML edit, the agent checked its new styles against the "Template tells" section of `references/checklist.md` and wrote that they "pass the template-tell check". It added no new element, so the crit-loop rule for a new element did not apply.

### Gaming check (R-5)

None seen. `page.diff` changes no text and removes no element. The second button stays, now as an outline button. The agent added no content and left the stock-hero finding open.

If the loop stopped with no ranked finding left and the verdict below is "same" or "worse", this run fired the R-5 review trigger: a designer rejecting a result that the loop accepted. Write here whether it fired, and the follow-up ticket id if it did: it did not fire. The loop stopped with no ranked finding left, and the verdict is "better".

## Verdict

Only Benjamin Jackson writes this section. An agent never writes or edits it. He is the only reviewer. He looked at the before and after screenshots before he read the transcript, a crit, or a work order.

- Verdict (better, same, or worse): Better.
- Reasoning (one or two sentences): "Looking good!"
