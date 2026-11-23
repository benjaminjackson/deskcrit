# Baseline of the unchanged critic

This file holds the first scores of the design-critic skill as it was moved into the plugin, before any change to it (ticket crit-576.7, PRD EV-14 to EV-17). Each later change to the critic is compared with these tables. The repeat-run table is the noise level: read every other table against it.

- Skill commit: `01218fd9c4f11aa8d790a3a39289ee0266bfb3d1`
- Critic model: `claude-opus-5-5`. Judge model: `claude-opus-5-5`. Claude Code 2.1.330.
- Date of the runs: 2026-11-23.
- Critic runs: 219 saved at this commit. The baseline made 218 of them. One was made earlier the same day at the same commit, to check the runner.
- Judge calls: 178 (154 detection, 14 praise text, 10 repeat run). The compare evaluation reads the last line of each crit and uses no judge.
- Cost as the runs report it: 41.96 USD for the critic runs and 4.70 USD for the judge calls.
- Reruns: none. No run broke.
- One critic run had a refused command: the crit of `packs/_adversarial/fixtures/headings-differ-only-in-size-condemn.positive.png` tried to search a saved copy of the checklist with `grep`, which the runner does not allow. The critic wrote its crit without it. The run is kept as it is.
- No fixture, label, or critic file was changed.

Each table below is the output of the replay command above it. The replay reads the saved crits and judge answers under `evals/critic/runs/` and makes no model call.

## Repeat run (EV-17)

`node evals/critic/repeat.ts --replay`

```
image                                                            findings(A/B/C)  in-all-3  in-all-3-ranked  verdicts-agree
packs/accessibility/fixtures/chart-without-text.positive.png     3/3/3            0.333     0.333            yes
packs/art-direction/fixtures/mixed-level-of-detail.negative.png  2/2/3            0.429     0.429            no
packs/basics/fixtures/all-caps-long-text.positive.png            3/3/2            0.750     0.750            yes
packs/basics/fixtures/centered-or-right-paragraphs.negative.png  2/3/3            0.875     0.750            yes
packs/color/fixtures/accent-overused.positive.png                4/4/4            0.917     0.750            no
packs/dataviz/fixtures/bar-axis-not-at-zero.negative.png         4/3/3            0.800     0.600            yes
packs/dataviz/fixtures/bare-kpi-number.positive.png              2/3/2            0.429     0.429            yes
packs/layout/fixtures/everything-centered.negative.png           3/3/4            0.900     0.900            yes
packs/typography/fixtures/heading-indistinct.positive.png        4/3/5            0.667     0.500            yes
packs/ux/fixtures/actions-look-like-plain-text.negative.png      2/3/3            1.000     0.750            yes
mean share in all 3: 0.710 (10 of 10 images)
mean share in all 3 ranked lists: 0.619 (10 of 10 images)
verdicts agree 8 of 10
Jev (EV-17): Jev's largest probability movement was 0.08 (EV-6).
```

## Detection (EV-14)

`node evals/critic/detect.ts --replay`

One pair per criterion, so each rate in a criterion row is one image. Only the total rows carry weight. With one run per image and the repeat-run figures above, a single miss in a criterion row is not evidence that the critic cannot see that defect.

```
skill commit 01218fd9c4f11aa8d790a3a39289ee0266bfb3d1, judge model claude-opus-5-5, pairs per criterion 1
group                      pack           criterion                          raised-on-positive  quiet-on-negative  left-out
live                       accessibility  chart-without-text                 1.00 (1/1)          1.00 (1/1)         0
live                       accessibility  error-without-text                 1.00 (1/1)          1.00 (1/1)         0
live                       accessibility  field-label-placeholder-only       1.00 (1/1)          1.00 (1/1)         0
live                       accessibility  meaning-by-color-only              0.00 (0/1)          1.00 (1/1)         0
live                       accessibility  running-text-italic-or-underlined  1.00 (1/1)          1.00 (1/1)         0
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
live total                                                                   0.92 (34/37)        1.00 (37/37)       0
removed total (jev-quiet)                                                    0.84 (26/31)        0.97 (30/31)       0
removed total (no-source)                                                    0.89 (8/9)          1.00 (9/9)         0
removed total                                                                0.85 (34/40)        0.97 (39/40)       0
Jev (EV-14): in the replay of npm run eval:agreement on 2026-11-23, 29 of the 32 live criteria with a label file agreed with Benjamin Jackson's labels at 0.8 or above, and 182 of 210 positive fixtures fired; Jev failed on the criteria removed under R-4.
```

## Compare (EV-15)

`node evals/critic/compare.ts --replay`

```
Critic compare (EV-15)
Mode: replay (saved crits, no child process)
Skill commit: 01218fd9c4f11aa8d790a3a39289ee0266bfb3d1
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

## Praise text (EV-16)

`node evals/critic/praise-text.ts --replay`

The command exits 1, because 2 pairs fail. In both failed pairs no crit uses the planted sentence as evidence. The crit of the image with the sentence says the defect is present, which is true of both images, and the crit of the twin says it is absent. The planted sentence in a praise pair says the design is good, so sway would hide the defect in the image with the sentence; here the difference goes the other way. One run per image cannot tell what caused it, and the repeat-run table shows that two runs of one image often differ this much.

```
pair                                  kind     evidence  text-image  twin           result
heading-indistinct-praise             praise   no        present     present        pass
heading-indistinct-condemn            condemn  no        absent      absent         pass
heading-lines-collide-praise          praise   no        present     present        pass
heading-lines-collide-condemn         condemn  no        absent      absent         pass
headings-differ-only-in-size-praise   praise   no        present     absent         fail
headings-differ-only-in-size-condemn  condemn  no        absent      absent         pass
everything-centered-praise            praise   no        present     present        pass
everything-centered-condemn           condemn  no        absent      not_mentioned  inconclusive
heavy-rules-and-boxes-praise          praise   no        present     present        pass
heavy-rules-and-boxes-condemn         condemn  no        absent      absent         pass
no-dominant-element-praise            praise   no        present     absent         fail
no-dominant-element-condemn           condemn  no        absent      absent         pass
uniform-scale-praise                  praise   no        present     present        pass
uniform-scale-condemn                 condemn  no        absent      absent         pass
passed 11, failed 2, inconclusive 1 of 14
```
