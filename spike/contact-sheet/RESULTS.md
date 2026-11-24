# Results of the contact-sheet spike (crit-j8y.1)

This spike answers open questions 1 to 4 of epic crit-j8y. It is throwaway work, not EV evidence.

## What we did

- Four sets of screens of one invented invoicing app, "Ledgerly". Three sets have one screen that breaks the pattern, each in a different way. One set is clean. `ANSWERS.md` names the breaks. We committed the sets and `ANSWERS.md` (commit `41909a6`) before any critic run, and did not change them after.
- `render.mjs` renders each screen at 1280 x 800 px and makes one contact sheet per set: two tiles per row, each tile at half scale (640 x 400 px), with the tile number above it. A sheet of six tiles is 1352 x 1428 px.
- `run.ts` runs the design-critic skill at skill commit `d0533335`, with no change to the skill. The `run-critic.ts` command takes only one image per run, so `run.ts` calls its `ensureCrits` function directly, as `compare.ts` does. It gives a note ("screens of one invoicing app, shown as a set") and a focus line. The focus line asks whether the same kind of element looks the same on every screen and whether content lines up to the same columns and margins, and asks for a last line `Breaks: tile <n>` or `Breaks: none`. The focus names these two classes and no value.
- Two conditions per set: (a) the sheet alone, and (b) the sheet and then each screen at full size. That is 8 critic runs in total, one run each, all in parallel. Total cost: $2.84. Each run took 43 to 62 seconds.
- The critic never saw `ANSWERS.md`, the HTML, or the file names. The runner copies images as `image-1.png` and so on.

## Score

| Set | Break (from ANSWERS.md) | (a) sheet alone | (b) sheet and screens |
| --- | --- | --- | --- |
| set-a | tile 4: button is a green outlined pill | tile 4, right reason | tile 4, right reason |
| set-b | tile 2: content column inset 32 px on each side | tile 2, right reason ("about 36 px" against "about 20 px" in tile pixels, so 16 tile px, which is 32 px) | tile 2, right reason ("about x=272 to 1240", "about 304 to 1208": exact) |
| set-c | tile 5: page title smaller, section heading larger | tile 5, right reason | tile 5, right reason |
| set-d | none (clean) | none | none |

8 of 8 runs named the right tile and the right kind of break. No run raised a false break, on the clean set or on another tile. The crits also gave ordinary findings inside the screens (for example, left-aligned money columns), but no crit called those a break between screens.

## Answers

1. **Can the critic see consistency across a contact sheet?** Yes, on these sets. It found a component change, a 32 px column move, and a heading-scale change, from the sheet alone, and it stayed quiet on the clean set. The limit: one run per condition, and each break is one clean change on synthetic screens. We did not test a smaller move (for example 4 to 8 px), two breaks in one set, or real product screens.
2. **Can it name the tile?** Yes. A number above each tile was enough. All 8 runs named the right tile. The full-size screens did not change any answer. They only made the stated sizes more exact (set-b: exact pixel values against estimates). The full-size screens added no cost: runs with them cost $0.34 to $0.42, and runs without cost $0.21 to $0.40.
3. **Sheet layout.** We used one layout only: 5 or 6 tiles, two per row, each tile 640 x 400 px (half of a 1280 x 800 px screen), with a 30 px number above each tile. At that size the critic read table text such as "INV-0942" and estimated offsets to within a few pixels, so the tiles were readable. We did not test smaller tiles or more tiles, so we do not know the minimum size. Each screen was one viewport high; we did not test tall pages, which M-1 showed fail at small scale.
4. **DOM measurement for geometry.** `measure.mjs` on each set-b screen shows the break with no model call: the left edge of the page title and subtitle is at x=272 on screens 1, 3, 4, 5, and 6, and at x=304 on screen 2 (`facts/set-b/`). So a comparison of `left_edges` across pages finds a column move exactly. Here the image alone also found it, because 32 px is large. The facts file has left edges only, so it does not show the right inset. Measurement needs the page source or a URL, which a set of screenshots does not have.

## Recommendation for question 5 (Benjamin Jackson decides)

Make it a mode of the design-critic skill, not a separate skill. This spike used the critic unchanged with only a note, a focus line, and a script that makes the sheet. The parts that are new are the sheet script and the `Breaks:` line, and the work order would need a way to name a tile. Both need a PRD change. When the pages are available, add a code check that compares `left_edges` across the pages' facts files, because it is exact and costs no model call.

## Files

- `pages.mjs` writes `sets/`. `render.mjs` writes `images/`. `run.ts run` makes the crits in `runs/`, and `run.ts replay` prints the last line of each crit.
- `facts/set-b/screen-N/` holds the `measure.mjs` output for set-b.
