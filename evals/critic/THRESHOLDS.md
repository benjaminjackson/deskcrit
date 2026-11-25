# Threshold evaluation (crit-576.13)

The question: does the measured facts file, with its `violations` list (FR-79), harm the critic's call where a number and the eye disagree? And does the critic use the facts near a numeric rule?

`evals/critic/thresholds.ts` runs the design critic on 12 images, 3 times with the image alone and 3 times with the image and its facts file, at one skill commit. So the facts file is the only difference between the two conditions. A judge reads each crit and says whether it calls the case's defect present, absent, uncertain (borderline, or "measure it"), or does not mention it, and where the crit raises it. A second judge question reads the number the crit states for the measured quantity. The judge prompts name the defect in words and hold no rule number.

Replay with no model call:

```
npm run eval:critic:thresholds
```

## The cases

Every case, band, and count below is this evaluation's own choice (crit-576.13), not a rule from the PRD. The measured value comes from the committed facts file, except for the photo case, where `render-thresholds.ts` takes the median contrast between the text color and the screenshot pixels behind the text, with the text hidden. A rerun of `render-thresholds.ts` after crit-y75 changes the violations note and may add short-last-line entries, so the committed files in `thresholds/facts/` stay as they are, because their hashes are in the saved run keys.

| image | kind | defect asked about | measured | right call | facts show |
|---|---|---|---|---|---|
| `exempt-disabled-text` | exempt | low text contrast | 2.21:1 | absent | no violation; the block has the note "exempt from the contrast minimum: disabled control" |
| `exempt-logo` | exempt | low text contrast | 2.11:1 | absent | no violation; the note says "logo or image" |
| `exempt-large-text` | exempt | low text contrast | 3.74:1 at 44 px | absent | no violation; large text needs 3:1 |
| `harm-photo-text` | harm | low text contrast | 1.23:1 median behind the text | present | no violation; contrast "not measurable: background image" |
| `harm-thin-text` | harm | thin or faint text | 4.81:1, 13 px, weight 300 | present | no violation |
| `harm-jammed-targets` | harm | controls too small or too close | 25 px, touching | present | no violation |
| `text-contrast-near-fail` | near | low text contrast | 3.90:1 | present | text-contrast violation |
| `text-contrast-near-pass` | near | low text contrast | 5.17:1 | absent | no violation |
| `line-length-near-fail` | near | lines too long | 91 characters | present | line-length violation |
| `line-length-near-pass` | near | lines too long | 68 characters | absent | no violation |
| `target-size-near-fail` | near | controls too small | 20 px | present | target-size violation |
| `target-size-near-pass` | near | controls too small | 28 px | absent | no violation |

The near bands sit about 10 to 20 percent from the rule's number: contrast 3.7 to 4.1 against 5.0 to 5.6, line length 84 to 95 against 60 to 70, target size 19 to 21 against 27 to 30. measure.mjs rounds contrast to two places and counts whole characters and pixels, so each side is well clear of its error. The harm and exempt values are set to be plainly on one side: the right call for an exempt case is no defect, and for a harm case it is a defect, which is the owner's ruling for this evaluation, not a measured fact.

How hints are kept out: the critic sees the image as `image-1.png` and the facts as `facts.json`. measure-fixtures.ts's `keepFixtureViewport` replaces the source with `page.html` and keeps only the desktop viewport. The test checks every selector, example, and quoted text in each facts file, and every class name in each template, against a list of topic words (`HINT_PATTERN` in thresholds.ts). The pages' visible text is ordinary product copy.

## What we expect, written before any live run

- Exempt cases. With the image alone, the critic may call the pale logo hard to read, because it looks pale, and may let the disabled button and the 44 px headline pass. With facts, the risk is that the critic quotes 2.21, 2.11, or 3.74 against 4.5 and calls a defect the rule exempts. We expect the facts condition to be right as often as the image condition, or less often on the large headline, because 3.74 is below 4.5 and the facts give no rule for large text except through the missing violation.
- Harm cases. With the image alone, we expect the photo text called on all 3 runs, the thin text on about 2 of 3, and the jammed targets on 1 of 3 at most. With facts, the photo text should still be called, because the file says not measurable. The thin text and the jammed targets are where harm can show: the file says the text passes 4.5:1 and the targets pass 24 px, and the critic may take that as an all-clear. We expect fewer right calls with facts on these two.
- Near pairs. With the image alone, we expect "looks faint" or "looks long" on both sides of each pair, so few pairs right in the same run, and some uncertain calls. With facts, we expect both sides right on all 3 runs for all 3 rules, and stated numbers that match the measured value within 0.1 for contrast and 1 for characters or pixels.
- Crowd-out. With facts, the near-fail violations may take ranked places from other findings. We expect a small drop, under one finding per crit, in ranked findings not about the measured defect.

## Results

Run on 2026-11-23 at skill commit `4dd9634d`, the commit that added the `violations` list and its sentence in critic.md. All 72 critic runs finished. None ended in a refusal, and none failed for a usage limit. Output of `npm run eval:critic:thresholds`:

```
skill commit 4dd9634d5396c2d2703e3d93aa9ffd2471851c51, judge model claude-opus-5-5, 3 runs per image and condition, 12 images

calls by case kind: right, and uncertain (not counted as right or wrong); brackets give runs 1 to 3
kind    condition  right          uncertain
exempt  image      7/9 [1 3 3]    1/9 [1 0 0]
exempt  facts      8/9 [3 2 3]    0/9 [0 0 0]
harm    image      9/9 [3 3 3]    0/9 [0 0 0]
harm    facts      9/9 [3 3 3]    0/9 [0 0 0]
near    image      14/18 [5 4 5]  4/18 [1 2 1]
near    facts      18/18 [6 6 6]  0/18 [0 0 0]

near pairs: both images right in the same run
defect         condition  both right
text-contrast  image      1/3 [0 0 1]
text-contrast  facts      3/3 [1 1 1]
line-length    image      3/3 [1 1 1]
line-length    facts      3/3 [1 1 1]
target-size    image      1/3 [1 0 0]
target-size    facts      3/3 [1 1 1]

crowd-out: mean ranked findings not about the case's defect, and where the crit raises the defect (counts of crits)
kind    condition  other ranked  ranked  smaller things  elsewhere  not raised  list unreadable
exempt  image      3             0       1               0          8           0
exempt  facts      2.75          0       1               0          8           1
harm    image      1.44          9       0               0          0           0
harm    facts      1.44          9       0               0          0           0
near    image      1.83          10      1               2          5           0
near    facts      1.78          9       0               0          9           0

numbers the crits state for the measured quantity (cases measured from the facts file)
kind    condition  crits stating one  median error  largest error
exempt  image      2/9                0.26          0.26
exempt  facts      7/9                0             0
harm    image      3/6                1             1
harm    facts      6/6                0             0
near    image      12/18              1             8
near    facts      15/18              0             0.5

per image: calls by run (P present, A absent, U uncertain, N not mentioned) and stated numbers
image                    measured  expected  image calls  facts calls  image numbers   facts numbers
exempt-disabled-text     2.21      absent    A A A        A A N        - - -           2.21 - -
exempt-logo              2.11      absent    P A N        A P A        - - -           2.11 2.11 2.11
exempt-large-text        3.74      absent    U A A        A A A        - 4 4           3.74 3.74 3.74
harm-photo-text          1.23      present   P P P        P P P        - - -           - - -
harm-thin-text           4.81      present   P P P        P P P        - - -           4.81 4.81 4.81
harm-jammed-targets      25        present   P P P        P P P        24 24 24        25 25 25
text-contrast-near-fail  3.9       present   P P P        P P P        4.5 - 4.5       3.9 3.9 3.9
text-contrast-near-pass  5.17      absent    U U A        A A A        - - -           5.17 5.17 5.17
line-length-near-fail    91        present   P P P        P P P        92 92 92        91 91 91
line-length-near-pass    68        absent    A A A        A A A        68.5 66.5 67.5  67.5 67.5 67.5
target-size-near-fail    20        present   P P P        P P P        16 17 20        20 20 20
target-size-near-pass    28        absent    N U U        N N N        - - 20          - - -
```

What it shows:

- Harm. No harm found. The critic called all three harm cases on every run in both conditions, always in the ranked list. With facts, it called the thin text while it quoted 4.81, and the touching targets while it quoted 25 px. The facts did not act as an all-clear. This is better than the expectation above, which predicted fewer right calls with facts on these two.
- Exempt. Facts 8 of 9 right, image alone 7 of 9 with 1 uncertain. The one wrong call with facts is the logo on run 2: the crit quotes 2.11, says logos are exempt, and calls it faded by eye as a taste note under Smaller things. The one wrong call without facts is also the logo. The large headline at 3.74 was right on all 3 runs with facts; without facts, one run called it borderline.
- Near pairs. With facts, both images were right in all 9 pair runs. Without facts, text contrast and target size were right in 1 of 3 pair runs each, because the pass image was called uncertain or flagged. Line length was right 3 of 3 in both conditions.
- Numbers. With facts, stated numbers match the measured value: median error 0 in every kind, largest 0.5 (a line length given as a range). Without facts, the critic guessed: 16 and 17 px for a 20 px button, 24 px for a 25 px button, and "right at 4.5:1, possibly just under" for a 3.9:1 text.
- Crowd-out. No sign of it. Ranked findings not about the case's defect: 1.78 with facts against 1.83 without for the near cases, and the same 1.44 for the harm cases. One exempt crit with facts had a ranked list the script could not read, and the crowd-out mean leaves it out.

Limits: 3 runs per image and one image per case, so each cell is a small count, and one changed run moves a rate by a third. Only one critic model and one judge model were used. The judge decides present, absent, and uncertain, and no person checked its answers.
