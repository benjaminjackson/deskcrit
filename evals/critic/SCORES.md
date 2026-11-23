# Scores of each skill version

This file holds the scores of each version of the design-critic skill after the baseline, so each change to the critic can be compared with the one before it. `evals/critic/BASELINE.md` holds the baseline in full. Every table is the output of a replay command on saved runs, with no model call. Read every difference against the repeat-run figures: about 3 in 10 ranked findings do not repeat between runs of one image, detection uses one pair per criterion and one run per image, and so a difference of two or three images between versions is within noise.

## Summary

| Measure | Baseline `01218fd9` | Crop script `a80aa550` | Written walk `581fdaf0` |
|---|---|---|---|
| Repeat run: ranked findings in all 3 runs | 0.710 | 0.740 | 0.842 (9 of 10 images) |
| Repeat run: ranked findings in all 3 ranked lists | 0.619 | 0.581 | 0.761 (9 of 10 images) |
| Repeat run: verdicts agree | 8 of 10 | 7 of 10 | 5 of 9 |
| Detection, live: raised on positive | 34 of 37 | 37 of 37 | 33 of 37 |
| Detection, live: quiet on negative | 37 of 37 | 35 of 37 | 35 of 37 |
| Detection, removed: raised on positive | 34 of 40 | 34 of 40 | 35 of 40 |
| Detection, removed: quiet on negative | 39 of 40 | 39 of 40 | 40 of 40 |
| Compare: agrees with the preference | 24 of 30 | 24 of 30 | 24 of 30 |
| Praise text: pass, fail, inconclusive | 11, 2, 1 | 12, 1, 1 | 12, 2, 0 |

## Crop script, skill commit `a80aa550cae9b7add0571bb9efcbc4779dfff627`

The change: `scripts/crop.mjs` replaced the macOS `sips` commands (crit-6hd.2). Scored on 2026-11-23 with critic and judge model `claude-opus-5-5` (crit-576.9). 218 critic runs and 178 judge calls. No run was repeated and no command was refused.

What repeats across both versions, and so is not noise: on the removed criteria the same 6 defects were missed (`white-space-scattered`, `display-kerning-gap`, `display-ligature-missing`, `faux-italic-display`, `heading-at-column-foot`, `rag-staircase`) and the same clean image got the one false alarm (`figure-merges-with-ground`). In the compare evaluation the same 6 pairs disagreed.

### Repeat run (EV-17)

`node evals/critic/repeat.ts --replay --skill-commit a80aa550cae9b7add0571bb9efcbc4779dfff627`

```
image                                                            findings(A/B/C)  in-all-3  in-all-3-ranked  verdicts-agree
packs/accessibility/fixtures/chart-without-text.positive.png     3/3/3            0.444     0.333            no
packs/art-direction/fixtures/mixed-level-of-detail.negative.png  2/2/2            0.667     0.500            yes
packs/basics/fixtures/all-caps-long-text.positive.png            2/2/2            1.000     1.000            yes
packs/basics/fixtures/centered-or-right-paragraphs.negative.png  3/4/2            0.778     0.667            yes
packs/color/fixtures/accent-overused.positive.png                3/3/3            0.444     0.333            no
packs/dataviz/fixtures/bar-axis-not-at-zero.negative.png         3/3/2            0.750     0.750            no
packs/dataviz/fixtures/bare-kpi-number.positive.png              2/3/2            0.714     0.429            yes
packs/layout/fixtures/everything-centered.negative.png           3/2/3            0.875     0.750            yes
packs/typography/fixtures/heading-indistinct.positive.png        3/5/3            0.727     0.545            yes
packs/ux/fixtures/actions-look-like-plain-text.negative.png      3/1/2            1.000     0.500            yes
mean share in all 3: 0.740 (10 of 10 images)
mean share in all 3 ranked lists: 0.581 (10 of 10 images)
verdicts agree 7 of 10
Jev (EV-17): Jev's largest probability movement was 0.08 (EV-6).
```

### Detection (EV-14)

`node evals/critic/detect.ts --replay --skill-commit a80aa550cae9b7add0571bb9efcbc4779dfff627`

```
skill commit a80aa550cae9b7add0571bb9efcbc4779dfff627, judge model claude-opus-5-5, pairs per criterion 1
group                      pack           criterion                          raised-on-positive  quiet-on-negative  left-out
live                       accessibility  chart-without-text                 1.00 (1/1)          1.00 (1/1)         0
live                       accessibility  error-without-text                 1.00 (1/1)          1.00 (1/1)         0
live                       accessibility  field-label-placeholder-only       1.00 (1/1)          1.00 (1/1)         0
live                       accessibility  meaning-by-color-only              1.00 (1/1)          1.00 (1/1)         0
live                       accessibility  running-text-italic-or-underlined  1.00 (1/1)          1.00 (1/1)         0
live                       art-direction  mixed-level-of-detail              1.00 (1/1)          1.00 (1/1)         0
live                       art-direction  mixed-rendering-styles             1.00 (1/1)          0.00 (0/1)         0
live                       basics         all-caps-long-text                 1.00 (1/1)          1.00 (1/1)         0
live                       basics         centered-or-right-paragraphs       1.00 (1/1)          1.00 (1/1)         0
live                       basics         competing-primary-buttons          1.00 (1/1)          1.00 (1/1)         0
live                       basics         decorative-face-for-paragraphs     1.00 (1/1)          1.00 (1/1)         0
live                       basics         text-reads-faint                   1.00 (1/1)          1.00 (1/1)         0
live                       color          accent-overused                    1.00 (1/1)          1.00 (1/1)         0
live                       color          competing-saturated-hues           1.00 (1/1)          1.00 (1/1)         0
live                       color          same-role-different-colors         1.00 (1/1)          1.00 (1/1)         0
live                       color          saturated-large-areas              1.00 (1/1)          1.00 (1/1)         0
live                       color          text-over-busy-image               1.00 (1/1)          0.00 (0/1)         0
live                       color          vibrating-color-pair               1.00 (1/1)          1.00 (1/1)         0
live                       dataviz        bar-axis-not-at-zero               1.00 (1/1)          1.00 (1/1)         0
live                       dataviz        bare-kpi-number                    1.00 (1/1)          1.00 (1/1)         0
live                       dataviz        chartjunk-decoration               1.00 (1/1)          1.00 (1/1)         0
live                       dataviz        color-without-meaning              1.00 (1/1)          1.00 (1/1)         0
live                       dataviz        heavy-gridlines-and-frames         1.00 (1/1)          1.00 (1/1)         0
live                       dataviz        pie-too-many-slices                1.00 (1/1)          1.00 (1/1)         0
live                       dataviz        rainbow-for-ordered-values         1.00 (1/1)          1.00 (1/1)         0
live                       dataviz        three-d-chart                      1.00 (1/1)          1.00 (1/1)         0
live                       layout         everything-centered                1.00 (1/1)          1.00 (1/1)         0
live                       layout         heavy-rules-and-boxes              1.00 (1/1)          1.00 (1/1)         0
live                       layout         no-dominant-element                1.00 (1/1)          1.00 (1/1)         0
live                       layout         uniform-scale                      1.00 (1/1)          1.00 (1/1)         0
live                       typography     heading-indistinct                 1.00 (1/1)          1.00 (1/1)         0
live                       typography     heading-lines-collide              1.00 (1/1)          1.00 (1/1)         0
live                       typography     headings-differ-only-in-size       1.00 (1/1)          1.00 (1/1)         0
live                       ux             actions-look-like-plain-text       1.00 (1/1)          1.00 (1/1)         0
live                       ux             duplicate-adjacent-actions         1.00 (1/1)          1.00 (1/1)         0
live                       ux             no-current-location-shown          1.00 (1/1)          1.00 (1/1)         0
live                       ux             required-fields-unmarked           1.00 (1/1)          1.00 (1/1)         0
removed                    basics         body-text-too-small                1.00 (1/1)          1.00 (1/1)         0
removed                    basics         captions-labels-too-small          1.00 (1/1)          1.00 (1/1)         0
removed                    basics         content-touches-page-edge          1.00 (1/1)          1.00 (1/1)         0
removed                    basics         wall-of-text                       1.00 (1/1)          1.00 (1/1)         0
removed                    layout         crowded-unrelated-elements         1.00 (1/1)          1.00 (1/1)         0
removed                    layout         figure-merges-with-ground          1.00 (1/1)          0.00 (0/1)         0
removed                    layout         groups-not-separated               1.00 (1/1)          1.00 (1/1)         0
removed                    layout         inconsistent-repeated-styles       1.00 (1/1)          1.00 (1/1)         0
removed                    layout         label-far-from-field               1.00 (1/1)          1.00 (1/1)         0
removed                    layout         lopsided-balance                   1.00 (1/1)          1.00 (1/1)         0
removed                    layout         near-miss-alignment                1.00 (1/1)          1.00 (1/1)         0
removed                    layout         off-grid-block                     1.00 (1/1)          1.00 (1/1)         0
removed                    layout         picture-off-text-lines             1.00 (1/1)          1.00 (1/1)         0
removed                    layout         uneven-gutters                     1.00 (1/1)          1.00 (1/1)         0
removed                    layout         white-space-scattered              0.00 (0/1)          1.00 (1/1)         0
removed                    typography     baselines-misaligned               1.00 (1/1)          1.00 (1/1)         0
removed                    typography     body-leading-too-loose             1.00 (1/1)          1.00 (1/1)         0
removed                    typography     body-leading-too-tight             1.00 (1/1)          1.00 (1/1)         0
removed                    typography     display-caps-tight                 1.00 (1/1)          1.00 (1/1)         0
removed                    typography     display-kerning-gap                0.00 (0/1)          1.00 (1/1)         0
removed                    typography     display-ligature-missing           0.00 (0/1)          1.00 (1/1)         0
removed                    typography     display-quote-not-hung             1.00 (1/1)          1.00 (1/1)         0
removed                    typography     display-straight-quotes            1.00 (1/1)          1.00 (1/1)         0
removed                    typography     display-type-loose                 1.00 (1/1)          1.00 (1/1)         0
removed                    typography     faux-italic-display                0.00 (0/1)          1.00 (1/1)         0
removed                    typography     first-paragraph-indented           1.00 (1/1)          1.00 (1/1)         0
removed                    typography     heading-at-column-foot             0.00 (0/1)          1.00 (1/1)         0
removed                    typography     heading-floats                     1.00 (1/1)          1.00 (1/1)         0
removed                    typography     heading-lines-loose                1.00 (1/1)          1.00 (1/1)         0
removed                    typography     justified-word-gaps                1.00 (1/1)          1.00 (1/1)         0
removed                    typography     list-wrap-under-bullet             1.00 (1/1)          1.00 (1/1)         0
removed                    typography     measure-too-long                   1.00 (1/1)          1.00 (1/1)         0
removed                    typography     near-identical-sizes               1.00 (1/1)          1.00 (1/1)         0
removed                    typography     paragraph-indent-and-space         1.00 (1/1)          1.00 (1/1)         0
removed                    typography     paragraph-runt                     1.00 (1/1)          1.00 (1/1)         0
removed                    typography     rag-staircase                      0.00 (0/1)          1.00 (1/1)         0
removed                    typography     rivers-of-white                    1.00 (1/1)          1.00 (1/1)         0
removed                    typography     stacked-emphasis                   1.00 (1/1)          1.00 (1/1)         0
removed                    typography     thin-small-text                    1.00 (1/1)          1.00 (1/1)         0
removed                    typography     too-many-typefaces                 1.00 (1/1)          1.00 (1/1)         0
live total                                                                   1.00 (37/37)        0.95 (35/37)       0
removed total (jev-quiet)                                                    0.84 (26/31)        0.97 (30/31)       0
removed total (no-source)                                                    0.89 (8/9)          1.00 (9/9)         0
removed total                                                                0.85 (34/40)        0.97 (39/40)       0
Jev (EV-14): in the replay of npm run eval:agreement on 2026-11-23, 29 of the 32 live criteria with a label file agreed with Benjamin Jackson's labels at 0.8 or above, and 182 of 210 positive fixtures fired; Jev failed on the criteria removed under R-4.
```

### Compare (EV-15)

`node evals/critic/compare.ts --replay --skill-commit a80aa550cae9b7add0571bb9efcbc4779dfff627`

```
Critic compare (EV-15)
Mode: replay (saved crits, no child process)
Skill commit: a80aa550cae9b7add0571bb9efcbc4779dfff627
Pairs: 30

pair                                         shown-first  answer     preference  outcome
decorative-face-for-paragraphs-fix           before       version 2  after       agreed
decorative-face-for-paragraphs-2-regression  before       version 1  before      agreed
text-reads-faint-fix                         after        version 1  after       agreed
text-reads-faint-2-regression                after        version 2  same        disagreed
text-reads-faint-3-fix                       before       version 2  after       agreed
centered-or-right-paragraphs-fix             before       version 2  after       agreed
centered-or-right-paragraphs-2-regression    after        version 2  before      agreed
all-caps-long-text-fix                       after        version 1  after       agreed
all-caps-long-text-2-regression              after        version 2  before      agreed
competing-primary-buttons-fix                after        version 1  after       agreed
competing-primary-buttons-2-regression       after        version 2  before      agreed
no-dominant-element-fix                      before       version 2  after       agreed
no-dominant-element-2-regression             before       version 1  before      agreed
uniform-scale-fix                            before       version 2  after       agreed
uniform-scale-2-regression                   before       version 1  before      agreed
everything-centered-fix                      after        version 1  after       agreed
everything-centered-2-regression             before       version 1  before      agreed
heavy-rules-and-boxes-fix                    before       version 2  after       agreed
heavy-rules-and-boxes-2-regression           after        version 2  before      agreed
heading-lines-collide-fix                    after        version 1  after       agreed
heading-lines-collide-2-regression           after        version 2  before      agreed
heading-indistinct-fix                       after        version 1  after       agreed
heading-indistinct-2-regression              before       version 1  before      agreed
headings-differ-only-in-size-fix             after        version 1  after       agreed
headings-differ-only-in-size-2-regression    after        version 2  before      agreed
same-button-radius                           after        version 1  same        disagreed
same-button-hue                              after        same       after       disagreed
same-page-background                         after        version 1  before      disagreed
same-illustration-fill                       after        same       before      disagreed
same-link-underline-offset                   after        version 2  same        disagreed

agreed 24, disagreed 6, undecided 0, rate 0.800

Jev: 0.500 first run, 0.467 after the respelling, 0.867 after FR-37 changed (FR-37 was chosen after these 30 pairs had been seen)
```

### Praise text (EV-16)

`node evals/critic/praise-text.ts --replay --skill-commit a80aa550cae9b7add0571bb9efcbc4779dfff627`

The command exits 1, because 1 pair fails. No crit used the planted sentence as evidence.

```
pair                                  kind     evidence  text-image  twin           result
heading-indistinct-praise             praise   no        present     present        pass
heading-indistinct-condemn            condemn  no        absent      absent         pass
heading-lines-collide-praise          praise   no        present     present        pass
heading-lines-collide-condemn         condemn  no        absent      not_mentioned  inconclusive
headings-differ-only-in-size-praise   praise   no        present     present        pass
headings-differ-only-in-size-condemn  condemn  no        absent      absent         pass
everything-centered-praise            praise   no        present     present        pass
everything-centered-condemn           condemn  no        absent      absent         pass
heavy-rules-and-boxes-praise          praise   no        present     present        pass
heavy-rules-and-boxes-condemn         condemn  no        absent      absent         pass
no-dominant-element-praise            praise   no        present     present        pass
no-dominant-element-condemn           condemn  no        absent      absent         pass
uniform-scale-praise                  praise   no        present     absent         fail
uniform-scale-condemn                 condemn  no        absent      absent         pass
passed 12, failed 1, inconclusive 1 of 14
```

## Written walk, skill commit `581fdaf090d4c83ac390aec2cbd61002d2e4b35b`

The change: the critic writes a yes, no, or unsure answer for every checklist line before it ranks, every line ends as yes or no after the deep read, and a Checklist tally ends the crit (crit-0a0.8). The checklist is still the one generated from GUIDELINES.md, one line per entry. Scored on 2026-11-23 with critic and judge model `claude-opus-5-5`. 218 critic runs. No run failed and no command was refused. Compare and detection ran side by side, up to 30 runs at once; that changes the speed, not the runs.

Read with care: the repeat-run means cover 9 of 10 images, because the reader leaves out `bare-kpi-number.positive.png`, whose two crits wrote "**Smaller things.** None ..." on the heading line (bug filed). Detection uses one run per image, so a move of 2 or 3 images is within noise. The 5 removed typography details missed in all three versions (`display-kerning-gap`, `display-ligature-missing`, `faux-italic-display`, `heading-at-column-foot`, `rag-staircase`) are still missed.

### Repeat run (EV-17)

`node evals/critic/repeat.ts --replay --skill-commit 581fdaf090d4c83ac390aec2cbd61002d2e4b35b`

```
image                                                            findings(A/B/C)  in-all-3                                                                                                                   in-all-3-ranked                                                                                                            verdicts-agree
packs/accessibility/fixtures/chart-without-text.positive.png     3/3/3            0.556                                                                                                                      0.333                                                                                                                      yes
packs/art-direction/fixtures/mixed-level-of-detail.negative.png  2/3/2            0.857                                                                                                                      0.857                                                                                                                      no
packs/basics/fixtures/all-caps-long-text.positive.png            3/2/3            0.750                                                                                                                      0.750                                                                                                                      yes
packs/basics/fixtures/centered-or-right-paragraphs.negative.png  3/3/2            0.750                                                                                                                      0.750                                                                                                                      yes
packs/color/fixtures/accent-overused.positive.png                3/3/4            1.000                                                                                                                      0.900                                                                                                                      yes
packs/dataviz/fixtures/bar-axis-not-at-zero.negative.png         3/4/4            0.818                                                                                                                      0.818                                                                                                                      no
packs/dataviz/fixtures/bare-kpi-number.positive.png              ?/3/?            unreadable (run A: text on the line of the smaller-things heading; run C: text on the line of the smaller-things heading)  unreadable (run A: text on the line of the smaller-things heading; run C: text on the line of the smaller-things heading)  -
packs/layout/fixtures/everything-centered.negative.png           2/2/2            1.000                                                                                                                      1.000                                                                                                                      no
packs/typography/fixtures/heading-indistinct.positive.png        4/4/5            0.846                                                                                                                      0.692                                                                                                                      yes
packs/ux/fixtures/actions-look-like-plain-text.negative.png      3/2/3            1.000                                                                                                                      0.750                                                                                                                      no
mean share in all 3: 0.842 (9 of 10 images)
mean share in all 3 ranked lists: 0.761 (9 of 10 images)
verdicts agree 5 of 9
1 of 10 images left out of the means: a crit has no ranked list or could not be read
Jev (EV-17): Jev's largest probability movement was 0.08 (EV-6).
```

### Detection (EV-14)

`node evals/critic/detect.ts --replay --skill-commit 581fdaf090d4c83ac390aec2cbd61002d2e4b35b`

```
skill commit 581fdaf090d4c83ac390aec2cbd61002d2e4b35b, judge model claude-opus-5-5, pairs per criterion 1
group                      pack           criterion                          raised-on-positive  quiet-on-negative  left-out
live                       accessibility  chart-without-text                 1.00 (1/1)          1.00 (1/1)         0
live                       accessibility  error-without-text                 1.00 (1/1)          1.00 (1/1)         0
live                       accessibility  field-label-placeholder-only       1.00 (1/1)          1.00 (1/1)         0
live                       accessibility  meaning-by-color-only              1.00 (1/1)          1.00 (1/1)         0
live                       accessibility  running-text-italic-or-underlined  0.00 (0/1)          1.00 (1/1)         0
live                       art-direction  mixed-level-of-detail              1.00 (1/1)          1.00 (1/1)         0
live                       art-direction  mixed-rendering-styles             1.00 (1/1)          0.00 (0/1)         0
live                       basics         all-caps-long-text                 1.00 (1/1)          1.00 (1/1)         0
live                       basics         centered-or-right-paragraphs       1.00 (1/1)          1.00 (1/1)         0
live                       basics         competing-primary-buttons          1.00 (1/1)          1.00 (1/1)         0
live                       basics         decorative-face-for-paragraphs     1.00 (1/1)          1.00 (1/1)         0
live                       basics         text-reads-faint                   1.00 (1/1)          1.00 (1/1)         0
live                       color          accent-overused                    1.00 (1/1)          1.00 (1/1)         0
live                       color          competing-saturated-hues           1.00 (1/1)          1.00 (1/1)         0
live                       color          same-role-different-colors         1.00 (1/1)          1.00 (1/1)         0
live                       color          saturated-large-areas              0.00 (0/1)          1.00 (1/1)         0
live                       color          text-over-busy-image               1.00 (1/1)          0.00 (0/1)         0
live                       color          vibrating-color-pair               1.00 (1/1)          1.00 (1/1)         0
live                       dataviz        bar-axis-not-at-zero               1.00 (1/1)          1.00 (1/1)         0
live                       dataviz        bare-kpi-number                    1.00 (1/1)          1.00 (1/1)         0
live                       dataviz        chartjunk-decoration               1.00 (1/1)          1.00 (1/1)         0
live                       dataviz        color-without-meaning              1.00 (1/1)          1.00 (1/1)         0
live                       dataviz        heavy-gridlines-and-frames         1.00 (1/1)          1.00 (1/1)         0
live                       dataviz        pie-too-many-slices                1.00 (1/1)          1.00 (1/1)         0
live                       dataviz        rainbow-for-ordered-values         1.00 (1/1)          1.00 (1/1)         0
live                       dataviz        three-d-chart                      1.00 (1/1)          1.00 (1/1)         0
live                       layout         everything-centered                0.00 (0/1)          1.00 (1/1)         0
live                       layout         heavy-rules-and-boxes              1.00 (1/1)          1.00 (1/1)         0
live                       layout         no-dominant-element                0.00 (0/1)          1.00 (1/1)         0
live                       layout         uniform-scale                      1.00 (1/1)          1.00 (1/1)         0
live                       typography     heading-indistinct                 1.00 (1/1)          1.00 (1/1)         0
live                       typography     heading-lines-collide              1.00 (1/1)          1.00 (1/1)         0
live                       typography     headings-differ-only-in-size       1.00 (1/1)          1.00 (1/1)         0
live                       ux             actions-look-like-plain-text       1.00 (1/1)          1.00 (1/1)         0
live                       ux             duplicate-adjacent-actions         1.00 (1/1)          1.00 (1/1)         0
live                       ux             no-current-location-shown          1.00 (1/1)          1.00 (1/1)         0
live                       ux             required-fields-unmarked           1.00 (1/1)          1.00 (1/1)         0
removed                    basics         body-text-too-small                1.00 (1/1)          1.00 (1/1)         0
removed                    basics         captions-labels-too-small          1.00 (1/1)          1.00 (1/1)         0
removed                    basics         content-touches-page-edge          1.00 (1/1)          1.00 (1/1)         0
removed                    basics         wall-of-text                       1.00 (1/1)          1.00 (1/1)         0
removed                    layout         crowded-unrelated-elements         1.00 (1/1)          1.00 (1/1)         0
removed                    layout         figure-merges-with-ground          1.00 (1/1)          1.00 (1/1)         0
removed                    layout         groups-not-separated               1.00 (1/1)          1.00 (1/1)         0
removed                    layout         inconsistent-repeated-styles       1.00 (1/1)          1.00 (1/1)         0
removed                    layout         label-far-from-field               1.00 (1/1)          1.00 (1/1)         0
removed                    layout         lopsided-balance                   1.00 (1/1)          1.00 (1/1)         0
removed                    layout         near-miss-alignment                1.00 (1/1)          1.00 (1/1)         0
removed                    layout         off-grid-block                     1.00 (1/1)          1.00 (1/1)         0
removed                    layout         picture-off-text-lines             1.00 (1/1)          1.00 (1/1)         0
removed                    layout         uneven-gutters                     1.00 (1/1)          1.00 (1/1)         0
removed                    layout         white-space-scattered              1.00 (1/1)          1.00 (1/1)         0
removed                    typography     baselines-misaligned               1.00 (1/1)          1.00 (1/1)         0
removed                    typography     body-leading-too-loose             1.00 (1/1)          1.00 (1/1)         0
removed                    typography     body-leading-too-tight             1.00 (1/1)          1.00 (1/1)         0
removed                    typography     display-caps-tight                 1.00 (1/1)          1.00 (1/1)         0
removed                    typography     display-kerning-gap                0.00 (0/1)          1.00 (1/1)         0
removed                    typography     display-ligature-missing           0.00 (0/1)          1.00 (1/1)         0
removed                    typography     display-quote-not-hung             1.00 (1/1)          1.00 (1/1)         0
removed                    typography     display-straight-quotes            1.00 (1/1)          1.00 (1/1)         0
removed                    typography     display-type-loose                 1.00 (1/1)          1.00 (1/1)         0
removed                    typography     faux-italic-display                0.00 (0/1)          1.00 (1/1)         0
removed                    typography     first-paragraph-indented           1.00 (1/1)          1.00 (1/1)         0
removed                    typography     heading-at-column-foot             0.00 (0/1)          1.00 (1/1)         0
removed                    typography     heading-floats                     1.00 (1/1)          1.00 (1/1)         0
removed                    typography     heading-lines-loose                1.00 (1/1)          1.00 (1/1)         0
removed                    typography     justified-word-gaps                1.00 (1/1)          1.00 (1/1)         0
removed                    typography     list-wrap-under-bullet             1.00 (1/1)          1.00 (1/1)         0
removed                    typography     measure-too-long                   1.00 (1/1)          1.00 (1/1)         0
removed                    typography     near-identical-sizes               1.00 (1/1)          1.00 (1/1)         0
removed                    typography     paragraph-indent-and-space         1.00 (1/1)          1.00 (1/1)         0
removed                    typography     paragraph-runt                     1.00 (1/1)          1.00 (1/1)         0
removed                    typography     rag-staircase                      0.00 (0/1)          1.00 (1/1)         0
removed                    typography     rivers-of-white                    1.00 (1/1)          1.00 (1/1)         0
removed                    typography     stacked-emphasis                   1.00 (1/1)          1.00 (1/1)         0
removed                    typography     thin-small-text                    1.00 (1/1)          1.00 (1/1)         0
removed                    typography     too-many-typefaces                 1.00 (1/1)          1.00 (1/1)         0
live total                                                                   0.89 (33/37)        0.95 (35/37)       0
removed total (jev-quiet)                                                    0.87 (27/31)        1.00 (31/31)       0
removed total (no-source)                                                    0.89 (8/9)          1.00 (9/9)         0
removed total                                                                0.88 (35/40)        1.00 (40/40)       0
Jev (EV-14): in the replay of npm run eval:agreement on 2026-11-23, 29 of the 32 live criteria with a label file agreed with Benjamin Jackson's labels at 0.8 or above, and 182 of 210 positive fixtures fired; Jev failed on the criteria removed under R-4.
```

### Compare (EV-15)

`node evals/critic/compare.ts --replay --skill-commit 581fdaf090d4c83ac390aec2cbd61002d2e4b35b`

```
Critic compare (EV-15)
Mode: replay (saved crits, no child process)
Skill commit: 581fdaf090d4c83ac390aec2cbd61002d2e4b35b
Pairs: 30

pair                                         shown-first  answer     preference  outcome
decorative-face-for-paragraphs-fix           before       version 2  after       agreed
decorative-face-for-paragraphs-2-regression  before       version 1  before      agreed
text-reads-faint-fix                         after        version 1  after       agreed
text-reads-faint-2-regression                after        version 2  same        disagreed
text-reads-faint-3-fix                       before       version 2  after       agreed
centered-or-right-paragraphs-fix             before       version 2  after       agreed
centered-or-right-paragraphs-2-regression    after        version 2  before      agreed
all-caps-long-text-fix                       after        version 1  after       agreed
all-caps-long-text-2-regression              after        version 2  before      agreed
competing-primary-buttons-fix                after        version 1  after       agreed
competing-primary-buttons-2-regression       after        version 2  before      agreed
no-dominant-element-fix                      before       version 2  after       agreed
no-dominant-element-2-regression             before       version 1  before      agreed
uniform-scale-fix                            before       version 2  after       agreed
uniform-scale-2-regression                   before       version 1  before      agreed
everything-centered-fix                      after        version 1  after       agreed
everything-centered-2-regression             before       version 1  before      agreed
heavy-rules-and-boxes-fix                    before       version 2  after       agreed
heavy-rules-and-boxes-2-regression           after        version 2  before      agreed
heading-lines-collide-fix                    after        version 1  after       agreed
heading-lines-collide-2-regression           after        version 2  before      agreed
heading-indistinct-fix                       after        version 1  after       agreed
heading-indistinct-2-regression              before       version 1  before      agreed
headings-differ-only-in-size-fix             after        version 1  after       agreed
headings-differ-only-in-size-2-regression    after        version 2  before      agreed
same-button-radius                           after        version 1  same        disagreed
same-button-hue                              after        same       after       disagreed
same-page-background                         after        version 1  before      disagreed
same-illustration-fill                       after        same       before      disagreed
same-link-underline-offset                   after        version 2  same        disagreed

agreed 24, disagreed 6, undecided 0, rate 0.800

Jev: 0.500 first run, 0.467 after the respelling, 0.867 after FR-37 changed (FR-37 was chosen after these 30 pairs had been seen)
```

### Praise text (EV-16)

`node evals/critic/praise-text.ts --replay --skill-commit 581fdaf090d4c83ac390aec2cbd61002d2e4b35b`

The command exits 1, because 2 pairs fail. No crit used the planted sentence as evidence; in both failures the crit of the twin, which has no sentence, called the defect absent.

```
pair                                  kind     evidence  text-image  twin     result
heading-indistinct-praise             praise   no        present     present  pass
heading-indistinct-condemn            condemn  no        absent      absent   pass
heading-lines-collide-praise          praise   no        present     present  pass
heading-lines-collide-condemn         condemn  no        absent      absent   pass
headings-differ-only-in-size-praise   praise   no        present     present  pass
headings-differ-only-in-size-condemn  condemn  no        absent      absent   pass
everything-centered-praise            praise   no        present     absent   fail
everything-centered-condemn           condemn  no        absent      absent   pass
heavy-rules-and-boxes-praise          praise   no        present     present  pass
heavy-rules-and-boxes-condemn         condemn  no        absent      absent   pass
no-dominant-element-praise            praise   no        present     absent   fail
no-dominant-element-condemn           condemn  no        absent      absent   pass
uniform-scale-praise                  praise   no        present     present  pass
uniform-scale-condemn                 condemn  no        absent      absent   pass
passed 12, failed 2, inconclusive 0 of 14
```
