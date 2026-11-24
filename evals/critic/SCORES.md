# Scores of each skill version

This file holds the scores of each version of the design-critic skill after the baseline, so each change to the critic can be compared with the one before it. `evals/critic/BASELINE.md` holds the baseline in full. Every table is the output of a replay command on saved runs, with no model call. Read every difference against the repeat-run figures: about 3 in 10 ranked findings do not repeat between runs of one image, detection uses one pair per criterion and one run per image, and so a difference of two or three images between versions is within noise.

## Summary

| Measure | Baseline `01218fd9` | Crop script `a80aa550` | Written walk `581fdaf0` | MECE checklist `8006d3a2` | Entries script `3a8d079b` | Go further `f724b27f` | Go further on every crit `fa042f2d` |
|---|---|---|---|---|---|---|---|
| Repeat run: ranked findings in all 3 runs | 0.710 | 0.740 | 0.824 | 0.719 | 0.858 | 0.737 | 0.720 |
| Repeat run: ranked findings in all 3 ranked lists | 0.619 | 0.581 | 0.752 | 0.546 | 0.784 | 0.636 | 0.568 |
| Repeat run: verdicts agree | 8 of 10 | 7 of 10 | 6 of 10 | 7 of 10 | 6 of 10 | 7 of 10 | 5 of 10 |
| Detection, live: raised on positive | 34 of 37 | 37 of 37 | 33 of 37 | 35 of 37 | 34 of 37 | 34 of 37 | 33 of 37 |
| Detection, live: quiet on negative | 37 of 37 | 35 of 37 | 35 of 37 | 36 of 37 | 37 of 37 | 37 of 37 | 37 of 37 |
| Detection, removed: raised on positive | 34 of 40 | 34 of 40 | 35 of 40 | 35 of 40 | 36 of 40 | not scored | not scored |
| Detection, removed: quiet on negative | 39 of 40 | 39 of 40 | 40 of 40 | 37 of 40 | 39 of 40 | not scored | not scored |
| Compare: agrees with the preference | 24 of 30 | 24 of 30 | 24 of 30 | 24 of 30 | 24 of 30 | 24 of 30 | not scored |
| Praise text: pass, fail, inconclusive | 11, 2, 1 | 12, 1, 1 | 12, 2, 0 | 14, 0, 0 | 13, 1, 0 | 12, 1, 1 | 11, 2, 1 |

## Repeat-run noise floor

Batch 1 is runs 1 to 3 of each image, the runs the summary scores; batch 2 is runs 4 to 6 of the same skill commit, made on 2026-11-23 with `--batch 2` and judged with their own judge answers (crit-576.12). Each cell is a mean line of `node evals/critic/repeat.ts --replay --skill-commit <commit> --batch <n>`; the shell loop in the crit-576.12 notes prints this table from those replays.

| Skill commit | In all 3, batch 1 | In all 3, batch 2 | In all 3 ranked lists, batch 1 | In all 3 ranked lists, batch 2 | Verdicts agree, batch 1 | Verdicts agree, batch 2 |
|---|---|---|---|---|---|---|---|
| `581fdaf0` | 0.824 | 0.786 | 0.752 | 0.645 | 6 of 10 | 5 of 10 |
| `8006d3a2` | 0.719 | 0.888 | 0.546 | 0.790 | 7 of 10 | 8 of 10 |
| `3a8d079b` | 0.858 | 0.774 | 0.784 | 0.623 | 6 of 10 | 8 of 10 |

Between the two batches of one commit, the share in all 3 runs moves by 0.038 at `581fdaf0` and 0.169 at `8006d3a2`, and the share in all 3 ranked lists moves by 0.107 and 0.244. Between the two commits, the share in all 3 runs differs by 0.105 in batch 1 and 0.102 in batch 2, and the share in all 3 ranked lists differs by 0.206 in batch 1 and 0.145 in batch 2. At `3a8d079b` the two batches differ by 0.084 in all 3 runs and 0.161 in all 3 ranked lists; pooled over both batches, the three commits score 0.805, 0.804, and 0.816 in all 3 runs, and 0.699, 0.668, and 0.704 in all 3 ranked lists.

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

Read with care: the repeat-run means cover 10 of 10 images. Two crits of `bare-kpi-number.positive.png` wrote "**Smaller things.** None ..." on the heading line, which the reader now takes as an empty list (crit-576.11). Detection uses one run per image, so a move of 2 or 3 images is within noise. The 5 removed typography details missed in all three versions (`display-kerning-gap`, `display-ligature-missing`, `faux-italic-display`, `heading-at-column-foot`, `rag-staircase`) are still missed.

### Repeat run (EV-17)

`node evals/critic/repeat.ts --replay --skill-commit 581fdaf090d4c83ac390aec2cbd61002d2e4b35b`

```
image                                                            findings(A/B/C)  in-all-3  in-all-3-ranked  verdicts-agree
packs/accessibility/fixtures/chart-without-text.positive.png     3/3/3            0.556     0.333            yes
packs/art-direction/fixtures/mixed-level-of-detail.negative.png  2/3/2            0.857     0.857            no
packs/basics/fixtures/all-caps-long-text.positive.png            3/2/3            0.750     0.750            yes
packs/basics/fixtures/centered-or-right-paragraphs.negative.png  3/3/2            0.750     0.750            yes
packs/color/fixtures/accent-overused.positive.png                3/3/4            1.000     0.900            yes
packs/dataviz/fixtures/bar-axis-not-at-zero.negative.png         3/4/4            0.818     0.818            no
packs/dataviz/fixtures/bare-kpi-number.positive.png              3/3/3            0.667     0.667            yes
packs/layout/fixtures/everything-centered.negative.png           2/2/2            1.000     1.000            no
packs/typography/fixtures/heading-indistinct.positive.png        4/4/5            0.846     0.692            yes
packs/ux/fixtures/actions-look-like-plain-text.negative.png      3/2/3            1.000     0.750            no
mean share in all 3: 0.824 (10 of 10 images)
mean share in all 3 ranked lists: 0.752 (10 of 10 images)
verdicts agree 6 of 10
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

## MECE checklist, skill commit `8006d3a2831b64dd0305b88936ac253ce60b9c2d`

The change: the checklist became 124 yes-or-no questions in 8 sections divided by what the viewer is trying to do, where every guideline entry is under exactly one question (crit-0a0.9). The written walk of crit-0a0.8 is unchanged. Scored on 2026-11-23 with critic and judge model `claude-opus-5-5`. 218 critic runs. No run failed. In 7 runs the critic tried to read several guideline entries at once with `grep`, which the runner refuses, so those runs judged their `no` lines without the entries.

Read with care: the repeat-run means cover 10 of 10 images. Run C of `all-caps-long-text.positive.png` wrote "**Smaller things.** None worth listing separately." on the heading line, which the reader now takes as an empty list (crit-576.11). Detection uses one run per image, so a move of 2 or 3 images is within noise. The repeat-run drop from the written walk (0.824 to 0.719 in all 3 runs, 0.752 to 0.546 in all 3 ranked lists) is larger than the movement between earlier versions; the repeat-run noise floor section above puts it next to the movement between two batches of one commit.

### Repeat run (EV-17)

`node evals/critic/repeat.ts --replay --skill-commit 8006d3a2831b64dd0305b88936ac253ce60b9c2d`

```
image                                                            findings(A/B/C)  in-all-3  in-all-3-ranked  verdicts-agree
packs/accessibility/fixtures/chart-without-text.positive.png     3/3/3            0.556     0.333            yes
packs/art-direction/fixtures/mixed-level-of-detail.negative.png  1/1/2            0.500     0.000            no
packs/basics/fixtures/all-caps-long-text.positive.png            2/2/2            1.000     1.000            yes
packs/basics/fixtures/centered-or-right-paragraphs.negative.png  3/2/2            0.429     0.429            yes
packs/color/fixtures/accent-overused.positive.png                3/4/4            0.727     0.545            yes
packs/dataviz/fixtures/bar-axis-not-at-zero.negative.png         3/4/3            0.700     0.600            no
packs/dataviz/fixtures/bare-kpi-number.positive.png              2/2/2            0.667     0.500            yes
packs/layout/fixtures/everything-centered.negative.png           2/2/3            0.857     0.857            no
packs/typography/fixtures/heading-indistinct.positive.png        4/4/3            1.000     0.818            yes
packs/ux/fixtures/actions-look-like-plain-text.negative.png      3/3/2            0.750     0.375            yes
mean share in all 3: 0.719 (10 of 10 images)
mean share in all 3 ranked lists: 0.546 (10 of 10 images)
verdicts agree 7 of 10
Jev (EV-17): Jev's largest probability movement was 0.08 (EV-6).
```

### Detection (EV-14)

`node evals/critic/detect.ts --replay --skill-commit 8006d3a2831b64dd0305b88936ac253ce60b9c2d`

```
skill commit 8006d3a2831b64dd0305b88936ac253ce60b9c2d, judge model claude-opus-5-5, pairs per criterion 1
group                      pack           criterion                          raised-on-positive  quiet-on-negative  left-out
live                       accessibility  chart-without-text                 1.00 (1/1)          1.00 (1/1)         0
live                       accessibility  error-without-text                 1.00 (1/1)          1.00 (1/1)         0
live                       accessibility  field-label-placeholder-only       1.00 (1/1)          1.00 (1/1)         0
live                       accessibility  meaning-by-color-only              1.00 (1/1)          1.00 (1/1)         0
live                       accessibility  running-text-italic-or-underlined  0.00 (0/1)          1.00 (1/1)         0
live                       art-direction  mixed-level-of-detail              1.00 (1/1)          1.00 (1/1)         0
live                       art-direction  mixed-rendering-styles             1.00 (1/1)          1.00 (1/1)         0
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
removed                    layout         crowded-unrelated-elements         1.00 (1/1)          0.00 (0/1)         0
removed                    layout         figure-merges-with-ground          1.00 (1/1)          0.00 (0/1)         0
removed                    layout         groups-not-separated               1.00 (1/1)          1.00 (1/1)         0
removed                    layout         inconsistent-repeated-styles       1.00 (1/1)          1.00 (1/1)         0
removed                    layout         label-far-from-field               1.00 (1/1)          1.00 (1/1)         0
removed                    layout         lopsided-balance                   1.00 (1/1)          1.00 (1/1)         0
removed                    layout         near-miss-alignment                1.00 (1/1)          1.00 (1/1)         0
removed                    layout         off-grid-block                     1.00 (1/1)          1.00 (1/1)         0
removed                    layout         picture-off-text-lines             1.00 (1/1)          1.00 (1/1)         0
removed                    layout         uneven-gutters                     1.00 (1/1)          1.00 (1/1)         0
removed                    layout         white-space-scattered              0.00 (0/1)          0.00 (0/1)         0
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
removed                    typography     heading-at-column-foot             1.00 (1/1)          1.00 (1/1)         0
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
live total                                                                   0.95 (35/37)        0.97 (36/37)       0
removed total (jev-quiet)                                                    0.84 (26/31)        0.90 (28/31)       0
removed total (no-source)                                                    1.00 (9/9)          1.00 (9/9)         0
removed total                                                                0.88 (35/40)        0.93 (37/40)       0
Jev (EV-14): in the replay of npm run eval:agreement on 2026-11-23, 29 of the 32 live criteria with a label file agreed with Benjamin Jackson's labels at 0.8 or above, and 182 of 210 positive fixtures fired; Jev failed on the criteria removed under R-4.
```

### Compare (EV-15)

`node evals/critic/compare.ts --replay --skill-commit 8006d3a2831b64dd0305b88936ac253ce60b9c2d`

```
Critic compare (EV-15)
Mode: replay (saved crits, no child process)
Skill commit: 8006d3a2831b64dd0305b88936ac253ce60b9c2d
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

`node evals/critic/praise-text.ts --replay --skill-commit 8006d3a2831b64dd0305b88936ac253ce60b9c2d`

```
pair                                  kind     evidence  text-image  twin     result
heading-indistinct-praise             praise   no        present     present  pass
heading-indistinct-condemn            condemn  no        absent      absent   pass
heading-lines-collide-praise          praise   no        present     present  pass
heading-lines-collide-condemn         condemn  no        absent      absent   pass
headings-differ-only-in-size-praise   praise   no        present     present  pass
headings-differ-only-in-size-condemn  condemn  no        absent      absent   pass
everything-centered-praise            praise   no        present     present  pass
everything-centered-condemn           condemn  no        absent      absent   pass
heavy-rules-and-boxes-praise          praise   no        present     present  pass
heavy-rules-and-boxes-condemn         condemn  no        absent      absent   pass
no-dominant-element-praise            praise   no        present     present  pass
no-dominant-element-condemn           condemn  no        absent      absent   pass
uniform-scale-praise                  praise   no        present     present  pass
uniform-scale-condemn                 condemn  no        absent      absent   pass
passed 14, failed 0, inconclusive 0 of 14
```

## Entries script, skill commit `3a8d079b393465ca12ca83931416acd49717d971`

The change: `scripts/entries.mjs` opens every guideline entry a checklist line names in one allowed call (crit-0a0.10); step 4 asks for the walk right before that call, so the walk no longer ends up in the final message (crit-0a0.12); the `anticipates` question has its lost meaning back (crit-0a0.11). Scored on 2026-11-24 with critic and judge model `claude-opus-5-5`, both repeat-run batches included. 255 critic runs, no run failed, no command was refused. Runs went up to 50 at once; that changes the speed, not the runs.

Detection uses one run per image, so a move of 2 or 3 images is within noise. Of the removed details missed in every earlier version, `heading-at-column-foot` is now raised; the other four are still missed.

### Repeat run (EV-17), batch 1

`node evals/critic/repeat.ts --replay --skill-commit 3a8d079b393465ca12ca83931416acd49717d971`

```
image                                                            findings(A/B/C)  in-all-3  in-all-3-ranked  verdicts-agree
packs/accessibility/fixtures/chart-without-text.positive.png     3/3/3            0.667     0.667            yes
packs/art-direction/fixtures/mixed-level-of-detail.negative.png  2/2/2            1.000     1.000            no
packs/basics/fixtures/all-caps-long-text.positive.png            2/2/2            1.000     1.000            yes
packs/basics/fixtures/centered-or-right-paragraphs.negative.png  2/2/2            1.000     1.000            yes
packs/color/fixtures/accent-overused.positive.png                4/4/3            0.727     0.545            no
packs/dataviz/fixtures/bar-axis-not-at-zero.negative.png         4/4/4            1.000     1.000            no
packs/dataviz/fixtures/bare-kpi-number.positive.png              2/1/2            1.000     0.600            yes
packs/layout/fixtures/everything-centered.negative.png           2/3/2            0.857     0.857            no
packs/typography/fixtures/heading-indistinct.positive.png        3/3/3            0.667     0.667            yes
packs/ux/fixtures/actions-look-like-plain-text.negative.png      1/2/3            0.667     0.500            yes
mean share in all 3: 0.858 (10 of 10 images)
mean share in all 3 ranked lists: 0.784 (10 of 10 images)
verdicts agree 6 of 10
Jev (EV-17): Jev's largest probability movement was 0.08 (EV-6).
```

### Repeat run (EV-17), batch 2

`node evals/critic/repeat.ts --replay --batch 2 --skill-commit 3a8d079b393465ca12ca83931416acd49717d971`

```
image                                                            findings(A/B/C)  in-all-3  in-all-3-ranked  verdicts-agree
packs/accessibility/fixtures/chart-without-text.positive.png     4/3/3            0.800     0.600            yes
packs/art-direction/fixtures/mixed-level-of-detail.negative.png  2/1/2            0.200     0.000            no
packs/basics/fixtures/all-caps-long-text.positive.png            2/2/2            1.000     1.000            yes
packs/basics/fixtures/centered-or-right-paragraphs.negative.png  2/2/2            1.000     1.000            yes
packs/color/fixtures/accent-overused.positive.png                3/3/4            1.000     0.600            no
packs/dataviz/fixtures/bar-axis-not-at-zero.negative.png         3/3/3            0.667     0.667            yes
packs/dataviz/fixtures/bare-kpi-number.positive.png              3/3/3            0.889     0.667            yes
packs/layout/fixtures/everything-centered.negative.png           3/3/3            0.667     0.667            yes
packs/typography/fixtures/heading-indistinct.positive.png        3/4/3            0.800     0.600            yes
packs/ux/fixtures/actions-look-like-plain-text.negative.png      2/2/3            0.714     0.429            yes
mean share in all 3: 0.774 (10 of 10 images)
mean share in all 3 ranked lists: 0.623 (10 of 10 images)
verdicts agree 8 of 10
Jev (EV-17): Jev's largest probability movement was 0.08 (EV-6).
```

### Detection (EV-14)

`node evals/critic/detect.ts --replay --skill-commit 3a8d079b393465ca12ca83931416acd49717d971`

```
skill commit 3a8d079b393465ca12ca83931416acd49717d971, judge model claude-opus-5-5, pairs per criterion 1
group                      pack           criterion                          raised-on-positive  quiet-on-negative  left-out
live                       accessibility  chart-without-text                 1.00 (1/1)          1.00 (1/1)         0
live                       accessibility  error-without-text                 1.00 (1/1)          1.00 (1/1)         0
live                       accessibility  field-label-placeholder-only       1.00 (1/1)          1.00 (1/1)         0
live                       accessibility  meaning-by-color-only              1.00 (1/1)          1.00 (1/1)         0
live                       accessibility  running-text-italic-or-underlined  0.00 (0/1)          1.00 (1/1)         0
live                       art-direction  mixed-level-of-detail              1.00 (1/1)          1.00 (1/1)         0
live                       art-direction  mixed-rendering-styles             1.00 (1/1)          1.00 (1/1)         0
live                       basics         all-caps-long-text                 1.00 (1/1)          1.00 (1/1)         0
live                       basics         centered-or-right-paragraphs       1.00 (1/1)          1.00 (1/1)         0
live                       basics         competing-primary-buttons          1.00 (1/1)          1.00 (1/1)         0
live                       basics         decorative-face-for-paragraphs     1.00 (1/1)          1.00 (1/1)         0
live                       basics         text-reads-faint                   1.00 (1/1)          1.00 (1/1)         0
live                       color          accent-overused                    1.00 (1/1)          1.00 (1/1)         0
live                       color          competing-saturated-hues           1.00 (1/1)          1.00 (1/1)         0
live                       color          same-role-different-colors         1.00 (1/1)          1.00 (1/1)         0
live                       color          saturated-large-areas              0.00 (0/1)          1.00 (1/1)         0
live                       color          text-over-busy-image               1.00 (1/1)          1.00 (1/1)         0
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
removed                    layout         figure-merges-with-ground          1.00 (1/1)          0.00 (0/1)         0
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
removed                    typography     heading-at-column-foot             1.00 (1/1)          1.00 (1/1)         0
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
live total                                                                   0.92 (34/37)        1.00 (37/37)       0
removed total (jev-quiet)                                                    0.87 (27/31)        0.97 (30/31)       0
removed total (no-source)                                                    1.00 (9/9)          1.00 (9/9)         0
removed total                                                                0.90 (36/40)        0.97 (39/40)       0
Jev (EV-14): in the replay of npm run eval:agreement on 2026-11-23, 29 of the 32 live criteria with a label file agreed with Benjamin Jackson's labels at 0.8 or above, and 182 of 210 positive fixtures fired; Jev failed on the criteria removed under R-4.
```

### Compare (EV-15)

`node evals/critic/compare.ts --replay --skill-commit 3a8d079b393465ca12ca83931416acd49717d971`

```
Critic compare (EV-15)
Mode: replay (saved crits, no child process)
Skill commit: 3a8d079b393465ca12ca83931416acd49717d971
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

`node evals/critic/praise-text.ts --replay --skill-commit 3a8d079b393465ca12ca83931416acd49717d971`

The command exits 1, because 1 pair fails. No crit used the planted sentence as evidence; in the failure the crit of the twin, which has no sentence, called the defect absent.

```
pair                                  kind     evidence  text-image  twin     result
heading-indistinct-praise             praise   no        present     present  pass
heading-indistinct-condemn            condemn  no        absent      absent   pass
heading-lines-collide-praise          praise   no        present     present  pass
heading-lines-collide-condemn         condemn  no        absent      absent   pass
headings-differ-only-in-size-praise   praise   no        present     present  pass
headings-differ-only-in-size-condemn  condemn  no        absent      absent   pass
everything-centered-praise            praise   no        present     present  pass
everything-centered-condemn           condemn  no        absent      absent   pass
heavy-rules-and-boxes-praise          praise   no        present     present  pass
heavy-rules-and-boxes-condemn         condemn  no        absent      absent   pass
no-dominant-element-praise            praise   no        present     absent   fail
no-dominant-element-condemn           condemn  no        absent      absent   pass
uniform-scale-praise                  praise   no        present     present  pass
uniform-scale-condemn                 condemn  no        absent      absent   pass
passed 13, failed 1, inconclusive 0 of 14
```

## Go further, skill commit `f724b27f24ba173c1535ee48e9b7db41851ed0b2`

The change: `agents/critic.md` adds the section "Where it could go further", required when "What would move it most" has two findings or fewer and left out otherwise (crit-0a0.5). It names one to three commitments a stronger version of the piece would make, each marked taste. Scored on 2026-11-24 with critic and judge model `claude-opus-5-5`, repeat-run batch 1 only, and detection on the live criteria only (`--live-only`). No command was refused. Of the 144 saved crits of this commit, 98 hold the section, and 143 follow the rule for when it appears. Runs went up to 40 at once; that changes the speed, not the runs.

### Repeat run (EV-17), batch 1

`node evals/critic/repeat.ts --replay --skill-commit f724b27f24ba173c1535ee48e9b7db41851ed0b2`

```
image                                                            findings(A/B/C)  in-all-3  in-all-3-ranked  verdicts-agree
packs/accessibility/fixtures/chart-without-text.positive.png     2/2/3            0.714     0.429            yes
packs/art-direction/fixtures/mixed-level-of-detail.negative.png  2/1/1            0.000     0.000            no
packs/basics/fixtures/all-caps-long-text.positive.png            2/2/2            1.000     1.000            yes
packs/basics/fixtures/centered-or-right-paragraphs.negative.png  2/2/2            1.000     1.000            yes
packs/color/fixtures/accent-overused.positive.png                2/3/4            0.778     0.667            no
packs/dataviz/fixtures/bar-axis-not-at-zero.negative.png         3/3/3            0.778     0.667            yes
packs/dataviz/fixtures/bare-kpi-number.positive.png              2/1/3            0.500     0.500            yes
packs/layout/fixtures/everything-centered.negative.png           2/2/2            1.000     1.000            yes
packs/typography/fixtures/heading-indistinct.positive.png        3/3/3            0.889     0.667            yes
packs/ux/fixtures/actions-look-like-plain-text.negative.png      2/2/3            0.714     0.429            no
mean share in all 3: 0.737 (10 of 10 images)
mean share in all 3 ranked lists: 0.636 (10 of 10 images)
verdicts agree 7 of 10
Jev (EV-17): Jev's largest probability movement was 0.08 (EV-6).
```

### Detection (EV-14), live criteria

`node evals/critic/detect.ts --replay --live-only --skill-commit f724b27f24ba173c1535ee48e9b7db41851ed0b2`

```
skill commit f724b27f24ba173c1535ee48e9b7db41851ed0b2, live criteria only, judge model claude-opus-5-5, pairs per criterion 1
group                      pack           criterion                          raised-on-positive  quiet-on-negative  left-out
live                       accessibility  chart-without-text                 1.00 (1/1)          1.00 (1/1)         0
live                       accessibility  error-without-text                 1.00 (1/1)          1.00 (1/1)         0
live                       accessibility  field-label-placeholder-only       1.00 (1/1)          1.00 (1/1)         0
live                       accessibility  meaning-by-color-only              1.00 (1/1)          1.00 (1/1)         0
live                       accessibility  running-text-italic-or-underlined  0.00 (0/1)          1.00 (1/1)         0
live                       art-direction  mixed-level-of-detail              1.00 (1/1)          1.00 (1/1)         0
live                       art-direction  mixed-rendering-styles             1.00 (1/1)          1.00 (1/1)         0
live                       basics         all-caps-long-text                 1.00 (1/1)          1.00 (1/1)         0
live                       basics         centered-or-right-paragraphs       1.00 (1/1)          1.00 (1/1)         0
live                       basics         competing-primary-buttons          1.00 (1/1)          1.00 (1/1)         0
live                       basics         decorative-face-for-paragraphs     1.00 (1/1)          1.00 (1/1)         0
live                       basics         text-reads-faint                   1.00 (1/1)          1.00 (1/1)         0
live                       color          accent-overused                    1.00 (1/1)          1.00 (1/1)         0
live                       color          competing-saturated-hues           1.00 (1/1)          1.00 (1/1)         0
live                       color          same-role-different-colors         1.00 (1/1)          1.00 (1/1)         0
live                       color          saturated-large-areas              0.00 (0/1)          1.00 (1/1)         0
live                       color          text-over-busy-image               1.00 (1/1)          1.00 (1/1)         0
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
live                       layout         no-dominant-element                0.00 (0/1)          1.00 (1/1)         0
live                       layout         uniform-scale                      1.00 (1/1)          1.00 (1/1)         0
live                       typography     heading-indistinct                 1.00 (1/1)          1.00 (1/1)         0
live                       typography     heading-lines-collide              1.00 (1/1)          1.00 (1/1)         0
live                       typography     headings-differ-only-in-size       1.00 (1/1)          1.00 (1/1)         0
live                       ux             actions-look-like-plain-text       1.00 (1/1)          1.00 (1/1)         0
live                       ux             duplicate-adjacent-actions         1.00 (1/1)          1.00 (1/1)         0
live                       ux             no-current-location-shown          1.00 (1/1)          1.00 (1/1)         0
live                       ux             required-fields-unmarked           1.00 (1/1)          1.00 (1/1)         0
live total                                                                   0.92 (34/37)        1.00 (37/37)       0
removed total (jev-quiet)                                                    - (0/0)             - (0/0)            0
removed total (no-source)                                                    - (0/0)             - (0/0)            0
removed total                                                                - (0/0)             - (0/0)            0
Jev (EV-14): in the replay of npm run eval:agreement on 2026-11-23, 29 of the 32 live criteria with a label file agreed with Benjamin Jackson's labels at 0.8 or above, and 182 of 210 positive fixtures fired; Jev failed on the criteria removed under R-4.
```

### Compare (EV-15)

`node evals/critic/compare.ts --replay --skill-commit f724b27f24ba173c1535ee48e9b7db41851ed0b2`

```
Critic compare (EV-15)
Mode: replay (saved crits, no child process)
Skill commit: f724b27f24ba173c1535ee48e9b7db41851ed0b2
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

`node evals/critic/praise-text.ts --replay --skill-commit f724b27f24ba173c1535ee48e9b7db41851ed0b2`

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
no-dominant-element-praise            praise   no        present     absent         fail
no-dominant-element-condemn           condemn  no        absent      absent         pass
uniform-scale-praise                  praise   no        present     present        pass
uniform-scale-condemn                 condemn  no        absent      absent         pass
passed 12, failed 1, inconclusive 1 of 14
```

### Repeat run, batch 2, at f724b27

`node evals/critic/repeat.ts --replay --batch 2 --skill-commit f724b27f24ba173c1535ee48e9b7db41851ed0b2`

```
image                                                            findings(A/B/C)  in-all-3  in-all-3-ranked  verdicts-agree
packs/accessibility/fixtures/chart-without-text.positive.png     2/2/3            0.429     0.429            no
packs/art-direction/fixtures/mixed-level-of-detail.negative.png  2/2/2            0.500     0.500            yes
packs/basics/fixtures/all-caps-long-text.positive.png            2/2/2            1.000     1.000            yes
packs/basics/fixtures/centered-or-right-paragraphs.negative.png  2/2/2            1.000     1.000            yes
packs/color/fixtures/accent-overused.positive.png                3/4/2            0.778     0.667            no
packs/dataviz/fixtures/bar-axis-not-at-zero.negative.png         3/3/4            0.900     0.900            no
packs/dataviz/fixtures/bare-kpi-number.positive.png              1/1/2            0.750     0.750            yes
packs/layout/fixtures/everything-centered.negative.png           2/2/2            1.000     1.000            no
packs/typography/fixtures/heading-indistinct.positive.png        3/4/3            1.000     0.600            yes
packs/ux/fixtures/actions-look-like-plain-text.negative.png      3/2/2            0.714     0.429            no
mean share in all 3: 0.807 (10 of 10 images)
mean share in all 3 ranked lists: 0.727 (10 of 10 images)
verdicts agree 5 of 10
Jev (EV-17): Jev's largest probability movement was 0.08 (EV-6).
```

Pooled over batches 1 and 2: share in all 3 ranked lists is 0.682, inside the pooled range of the three earlier versions (0.668 to 0.704). Share in all 3 is 0.772, 0.03 below their pooled range (0.804 to 0.816). Two batches of one version have differed by up to 0.24, so this is not shown to be a real drop, and it is not shown to be noise.

## Go further on every crit, skill commit `fa042f2d61ae0bdf9862f6c755f7a67513c9a467`

The change: `agents/critic.md` writes the section "Where it could go further" on every crit and no longer only when "What would move it most" has two findings or fewer (crit-0a0.5). It adds three rules: an item that grows out of a finding starts with "Builds on finding N" and gives only the new commitment, a taste idea that is not a failure goes only in this section, and each item starts from a named element of the piece. Scored on 2026-11-24 with critic and judge model `claude-opus-5-5`, repeat-run batch 1 only, and detection on the live criteria only (`--live-only`). The compare evaluation was not run for this version. No command was refused. Of the 108 saved crits of this commit, all 108 hold the section, 99 contain the text "Builds on finding", and none contains "Nothing beyond the findings." The repeat-run reader names no crit as left out, so the new section did not change which crits it scores. Runs went up to 40 at once; that changes the speed, not the runs.

### Repeat run (EV-17), batch 1

`node evals/critic/repeat.ts --replay --skill-commit fa042f2d61ae0bdf9862f6c755f7a67513c9a467`

```
image                                                            findings(A/B/C)  in-all-3  in-all-3-ranked  verdicts-agree
packs/accessibility/fixtures/chart-without-text.positive.png     3/2/2            0.857     0.857            yes
packs/art-direction/fixtures/mixed-level-of-detail.negative.png  2/1/1            0.500     0.000            no
packs/basics/fixtures/all-caps-long-text.positive.png            2/2/2            1.000     1.000            yes
packs/basics/fixtures/centered-or-right-paragraphs.negative.png  2/2/2            0.500     0.500            yes
packs/color/fixtures/accent-overused.positive.png                4/3/3            0.800     0.600            no
packs/dataviz/fixtures/bar-axis-not-at-zero.negative.png         4/4/2            0.600     0.600            no
packs/dataviz/fixtures/bare-kpi-number.positive.png              2/3/2            0.857     0.857            yes
packs/layout/fixtures/everything-centered.negative.png           3/3/3            0.667     0.667            no
packs/typography/fixtures/heading-indistinct.positive.png        3/4/3            0.700     0.600            yes
packs/ux/fixtures/actions-look-like-plain-text.negative.png      2/3/2            0.714     0.000            no
mean share in all 3: 0.720 (10 of 10 images)
mean share in all 3 ranked lists: 0.568 (10 of 10 images)
verdicts agree 5 of 10
Jev (EV-17): Jev's largest probability movement was 0.08 (EV-6).
```

### Detection (EV-14), live criteria

`node evals/critic/detect.ts --replay --live-only --skill-commit fa042f2d61ae0bdf9862f6c755f7a67513c9a467`

```
skill commit fa042f2d61ae0bdf9862f6c755f7a67513c9a467, live criteria only, judge model claude-opus-5-5, pairs per criterion 1
group                      pack           criterion                          raised-on-positive  quiet-on-negative  left-out
live                       accessibility  chart-without-text                 1.00 (1/1)          1.00 (1/1)         0
live                       accessibility  error-without-text                 1.00 (1/1)          1.00 (1/1)         0
live                       accessibility  field-label-placeholder-only       1.00 (1/1)          1.00 (1/1)         0
live                       accessibility  meaning-by-color-only              1.00 (1/1)          1.00 (1/1)         0
live                       accessibility  running-text-italic-or-underlined  0.00 (0/1)          1.00 (1/1)         0
live                       art-direction  mixed-level-of-detail              1.00 (1/1)          1.00 (1/1)         0
live                       art-direction  mixed-rendering-styles             1.00 (1/1)          1.00 (1/1)         0
live                       basics         all-caps-long-text                 1.00 (1/1)          1.00 (1/1)         0
live                       basics         centered-or-right-paragraphs       1.00 (1/1)          1.00 (1/1)         0
live                       basics         competing-primary-buttons          1.00 (1/1)          1.00 (1/1)         0
live                       basics         decorative-face-for-paragraphs     1.00 (1/1)          1.00 (1/1)         0
live                       basics         text-reads-faint                   1.00 (1/1)          1.00 (1/1)         0
live                       color          accent-overused                    1.00 (1/1)          1.00 (1/1)         0
live                       color          competing-saturated-hues           1.00 (1/1)          1.00 (1/1)         0
live                       color          same-role-different-colors         1.00 (1/1)          1.00 (1/1)         0
live                       color          saturated-large-areas              0.00 (0/1)          1.00 (1/1)         0
live                       color          text-over-busy-image               1.00 (1/1)          1.00 (1/1)         0
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
live                       layout         no-dominant-element                0.00 (0/1)          1.00 (1/1)         0
live                       layout         uniform-scale                      0.00 (0/1)          1.00 (1/1)         0
live                       typography     heading-indistinct                 1.00 (1/1)          1.00 (1/1)         0
live                       typography     heading-lines-collide              1.00 (1/1)          1.00 (1/1)         0
live                       typography     headings-differ-only-in-size       1.00 (1/1)          1.00 (1/1)         0
live                       ux             actions-look-like-plain-text       1.00 (1/1)          1.00 (1/1)         0
live                       ux             duplicate-adjacent-actions         1.00 (1/1)          1.00 (1/1)         0
live                       ux             no-current-location-shown          1.00 (1/1)          1.00 (1/1)         0
live                       ux             required-fields-unmarked           1.00 (1/1)          1.00 (1/1)         0
live total                                                                   0.89 (33/37)        1.00 (37/37)       0
removed total (jev-quiet)                                                    - (0/0)             - (0/0)            0
removed total (no-source)                                                    - (0/0)             - (0/0)            0
removed total                                                                - (0/0)             - (0/0)            0
Jev (EV-14): in the replay of npm run eval:agreement on 2026-11-23, 29 of the 32 live criteria with a label file agreed with Benjamin Jackson's labels at 0.8 or above, and 182 of 210 positive fixtures fired; Jev failed on the criteria removed under R-4.
```

### Praise text (EV-16)

`node evals/critic/praise-text.ts --replay --skill-commit fa042f2d61ae0bdf9862f6c755f7a67513c9a467`

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
no-dominant-element-praise            praise   no        present     absent         fail
no-dominant-element-condemn           condemn  no        absent      absent         pass
uniform-scale-praise                  praise   no        present     absent         fail
uniform-scale-condemn                 condemn  no        absent      absent         pass
passed 11, failed 2, inconclusive 1 of 14
```
