# Follow-up crit spike: results (crit-yuf.1)

The question: when a second Opus agent reads the image and the finished first crit, does it find the problems the first crit did not raise?

Answer: not enough to use. It recovered 3 of 16 known misses and 1 of 9 missed defects. It gave no false alarm on the 9 clean images. Most of its new findings are about the copy and about content the page does not give, not the problems that other runs of the critic find.

## What ran

- `follow-up.md` was committed (f20b912) before any run and was not changed after. `run.ts` was committed (e8e809f) before the run.
- The follow-up ran with the critic's isolation, model (`claude-opus-5-5`), and allowed commands (Read, `crop.mjs`, `entries.mjs`). It read the checklist of the current skill folder. No run had a facts file.
- First crits are saved runs only. I picked the commits (the spike brief named the rule, not the commits):
  - Measure 1: run 1 of the repeat images at `3f0e7ca5`, the newest commit with repeat runs. `critic.md` has not changed since that commit. 9 of the 10 images: run C of `mixed-level-of-detail.negative.png` has no ranked list, so that image has no saved repeat judge answer.
  - Measure 2: run 1 of the detection images at `aefb4967` (live criteria, the newest commit with live detection runs) and `3a8d079b` (removed criteria, the newest commit with removed detection runs).
- Runs: 27 follow-up runs (9 repeat images, 9 quiet positives, 9 matching negatives) and 25 judge calls (9 recall, 16 detection; a follow-up with "Nothing new." needs no judge call). Cost: 3.49 USD for the follow-ups and 0.50 USD for the judge, 3.99 USD in all. No run was repeated.
- Replay: `node spike/follow-up/run.ts --replay --show-unmatched` prints every table below with no model call.

## Measure 1: recall of known misses

A known miss is a group in the saved repeat judge answer that holds a finding of run 2 or run 3 and no finding of run 1. A judge call per image matched each new finding to a known miss, to a finding of run 1, or to none.

| Image | Known misses | New findings | Misses recovered | Same as run 1 | Match nothing |
|---|---|---|---|---|---|
| accessibility/chart-without-text.positive | 5 | 1 | 1 | 0 | 0 |
| basics/all-caps-long-text.positive | 1 | 3 | 0 | 0 | 3 |
| basics/centered-or-right-paragraphs.negative | 3 | 2 | 1 | 0 | 1 |
| color/accent-overused.positive | 2 | 2 | 1 | 0 | 1 |
| dataviz/bar-axis-not-at-zero.negative | 1 | 1 | 0 | 0 | 1 |
| dataviz/bare-kpi-number.positive | 1 | 1 | 0 | 0 | 1 |
| layout/everything-centered.negative | 2 | 1 | 0 | 0 | 1 |
| typography/heading-indistinct.positive | 1 | 2 | 0 | 0 | 2 |
| ux/actions-look-like-plain-text.negative | 0 | 2 | 0 | 0 | 2 |
| **Total** | **16** | **15** | **3 (19%)** | **0** | **12** |

The follow-up never repeated a finding of run 1. It recovered 3 of 16 known misses: the identical "Learn more" links (WCAG 2.4.4), the last-crossing line that covers only one landing, and the conversion delta that contradicts the KPI row. 5 of the 9 images got no recovered miss.

## Measure 2: detection where the first crit stayed quiet

The detection judge question of EV-14 read the follow-up's new findings in place of a crit.

| Group | Criterion | First crit on positive | Follow-up on positive | First crit on negative | Follow-up on negative |
|---|---|---|---|---|---|
| live | accessibility/running-text-italic-or-underlined | absent | not mentioned | not mentioned | not mentioned |
| live | color/saturated-large-areas | not mentioned | **present** | absent | not mentioned |
| live | layout/everything-centered | absent | not mentioned | absent | not mentioned |
| live | layout/no-dominant-element | absent | not mentioned | absent | not mentioned |
| live | typography/headings-differ-only-in-size | not mentioned | not mentioned | absent | absent |
| removed | typography/display-kerning-gap | not mentioned | not mentioned | absent | not mentioned |
| removed | typography/display-ligature-missing | not mentioned | not mentioned | absent | not mentioned |
| removed | typography/faux-italic-display | not mentioned | not mentioned | not mentioned | not mentioned |
| removed | typography/rag-staircase | absent | not mentioned | absent | not mentioned |

On the positives, the follow-up raised 1 of 9 defects that the first crit missed (live 1 of 5, removed 0 of 4). On the negatives, it raised the defect on 0 of 9. But it wrote 1 to 3 other new findings on 8 of the 9 negatives. It wrote "Nothing new." on 3 of 27 runs.

## Measure 3: noise

I read all 12 new findings of measure 1 that match nothing. I checked them against the crit text. I checked two against the image or a fact: the icon styles in `accent-overused` (a crop shows the calendar icon as an outline and the other three as solid shapes) and the weekday count in `bare-kpi-number` (September 2026 starts on a Tuesday, so it has five Tuesdays and five Wednesdays). I did not check the other 10 against the image.

- Real and worth a line (6): the icon styles do not match (taste, small); the weekday totals include five Tuesdays and five Wednesdays (sharp, but true only if the bars are totals); the feature list repeats the paragraph above it; the table has no total row; the cancel answer says when but not how; the contact page gives no email address or phone number.
- Real but small (3): the route never says that the boat comes back; the fare is not given (two images, same template text).
- Weak (3): "in calm weather" raises a question; the pickup-change answer has no cutoff; the form does not say how it uses the email address.

None invents a fact, a figure, or a source. 10 of the 12 are about the copy or about content the page leaves out. Only 1 is about the visual design (the icons) and 1 about the data (the weekday count). The 3 known misses it recovered are also about copy or data.

## Verdict

Not fruitful, by the starting definition (Benjamin Jackson still confirms it): "it recovers a clear share of known misses and adds few false alarms on negatives". The second half holds: 0 of 9 false alarms on the target defect. The first half does not: 3 of 16 known misses (19%) and 1 of 9 missed defects. A second sample of the critic would find more of the known misses, because the known misses are by definition what other samples found.

What the follow-up does well is different from what the spike asked. When it is told not to repeat the crit, it reads the copy as a stranger would, and it finds content gaps and copy problems that the critic leaves out. If that is worth having, it is a question for a copy-focused step, not for this spike. The blind side-by-side (measure 4) did not run, because measures 1 to 3 are not fruitful. No recommendation on where the findings go in the crit.

## Limits

- One run per image, 16 known misses, and 9 quiet positives. A difference of one or two is noise.
- The recall judge decides what counts as the same problem. I did not re-check its matches by hand.
- The known misses come from runs 2 and 3 only, so a real problem that no run found is not in the ground truth. Some of the 12 unmatched findings are real problems of this kind.
