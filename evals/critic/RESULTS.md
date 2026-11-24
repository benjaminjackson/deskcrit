# Jev overlap (EV-20)

- Date: 2026-11-23
- Skill commit: `01218fd9c4f11aa8d790a3a39289ee0266bfb3d1`
- Pinned Jev model: `jev-1.14.0`
- Command: `node evals/critic/overlap.ts --replay`

```
skill commit 01218fd9c4f11aa8d790a3a39289ee0266bfb3d1, judge model claude-opus-5-5, Jev model jev-1.14.0
images: 74, the variant-1 pair of each live criterion; 37 show the defect and 37 do not (a label in evals/agreement/labels/ wins over the file name)
criteria skipped because a cannot-tell label left out an image of their pair: 0
Jev fired: verdict fail or warn, as evals/agreement/score.ts counts it; pass and uncertain are quiet.
Critic raised: the detection judge answer is present; absent and not_mentioned are not raised.
images with no Jev answer: 0

1. Jev fires: 33 of 74 images with a Jev answer; 33 on images that show the defect, 0 on images that do not
2. Jev's fires that the critic also raised: 93.9% (31/33)
   the critic missed: 2
    packs/color/fixtures/saturated-large-areas.positive.png (color/saturated-large-areas, shows-defect): Jev warn, critic not_mentioned
    packs/layout/fixtures/no-dominant-element.positive.png (layout/no-dominant-element, shows-defect): Jev fail, critic absent
3. defects the critic raised that Jev left quiet, on images that show the defect: 3
    packs/color/fixtures/competing-saturated-hues.positive.png (color/competing-saturated-hues, shows-defect): Jev uncertain, critic present
    packs/color/fixtures/vibrating-color-pair.positive.png (color/vibrating-color-pair, shows-defect): Jev uncertain, critic present
    packs/dataviz/fixtures/heavy-gridlines-and-frames.positive.png (dataviz/heavy-gridlines-and-frames, shows-defect): Jev pass, critic present
4. praise-text (EV-16): passed 11, failed 2, inconclusive 1 of 14

Proposed bar (EV-20, not decided; OQ-27 is Benjamin Jackson's): 95% or more of Jev's fires raised by the critic, and praise-text passed. Here the share is 93.9%, below 95%, and praise-text has a failed pair.
Limit of the sample: one pair per criterion, one critic run per image, and the critic's repeat-run figures in evals/critic/BASELINE.md (EV-17) show how much one run moves.
```

# Measured facts (EV-14, FR-79)

- Date: 2026-11-23
- Skill commit: `85edd7c9402307e98721cb1ed330a3934e422bc1` (crit-0a0.2)
- Sample: the variant-1 pair of each of the 37 live criteria, 74 images. Each image's facts file is in `evals/critic/facts/`, made by `evals/critic/measure-fixtures.ts` from the template the image was rendered from.
- Runs at this commit: 74 crits with facts and 74 without, each judged once. Judge prompt unchanged.
- Command: `node evals/critic/detect.ts --replay --facts --beside 01218fd9c4f11aa8d790a3a39289ee0266bfb3d1 --beside a80aa550cae9b7add0571bb9efcbc4779dfff627 --beside 85edd7c9402307e98721cb1ed330a3934e422bc1`

The columns are the baseline `01218fd9`, the latest scored version `a80aa550`, this commit without facts, and this commit with facts. The two columns at `85edd7c9` differ only in the facts file. Between `a80aa550` and `85edd7c9` the checklist also changed (crit-0a0.9).

```
skill commit 85edd7c9402307e98721cb1ed330a3934e422bc1, with measured facts (live criteria only), judge model claude-opus-5-5, pairs per criterion 1
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

side by side, raised on positive and quiet on negative (n/d); a column without +facts had no facts file
pack           criterion                          01218fd9 raised  01218fd9 quiet  a80aa550 raised  a80aa550 quiet  85edd7c9 raised  85edd7c9 quiet  85edd7c9+facts raised  85edd7c9+facts quiet
accessibility  chart-without-text                 1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
accessibility  error-without-text                 1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
accessibility  field-label-placeholder-only       1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
accessibility  meaning-by-color-only              0/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
accessibility  running-text-italic-or-underlined  1/1              1/1             1/1              1/1             0/1              1/1             0/1                    1/1
art-direction  mixed-level-of-detail              1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
art-direction  mixed-rendering-styles             1/1              1/1             1/1              0/1             1/1              1/1             1/1                    1/1
basics         all-caps-long-text                 1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
basics         centered-or-right-paragraphs       1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
basics         competing-primary-buttons          1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
basics         decorative-face-for-paragraphs     1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
basics         text-reads-faint                   1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
color          accent-overused                    1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
color          competing-saturated-hues           1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
color          same-role-different-colors         1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
color          saturated-large-areas              0/1              1/1             1/1              1/1             1/1              1/1             0/1                    1/1
color          text-over-busy-image               1/1              1/1             1/1              0/1             1/1              1/1             1/1                    1/1
color          vibrating-color-pair               1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
dataviz        bar-axis-not-at-zero               1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
dataviz        bare-kpi-number                    1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
dataviz        chartjunk-decoration               1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
dataviz        color-without-meaning              1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
dataviz        heavy-gridlines-and-frames         1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
dataviz        pie-too-many-slices                1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
dataviz        rainbow-for-ordered-values         1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
dataviz        three-d-chart                      1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
layout         everything-centered                1/1              1/1             1/1              1/1             0/1              1/1             1/1                    1/1
layout         heavy-rules-and-boxes              1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
layout         no-dominant-element                0/1              1/1             1/1              1/1             1/1              1/1             0/1                    1/1
layout         uniform-scale                      1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
typography     heading-indistinct                 1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
typography     heading-lines-collide              1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
typography     headings-differ-only-in-size       1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
ux             actions-look-like-plain-text       1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
ux             duplicate-adjacent-actions         1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
ux             no-current-location-shown          1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
ux             required-fields-unmarked           1/1              1/1             1/1              1/1             1/1              1/1             1/1                    1/1
total                                             34/37            37/37           37/37            35/37           35/37            37/37           34/37                  37/37
Jev (EV-14): in the replay of npm run eval:agreement on 2026-11-23, 29 of the 32 live criteria with a label file agreed with Benjamin Jackson's labels at 0.8 or above, and 182 of 210 positive fixtures fired; Jev failed on the criteria removed under R-4.
```

Reading, against noise of 2 or 3 images between two full runs: with facts, 34 of 37 positives raised and 37 of 37 negatives quiet; without facts at the same commit, 35 of 37 and 37 of 37. The two misses with facts (`color/saturated-large-areas`, `layout/no-dominant-element`) are judgments of area and dominance that the facts file does not measure, and the baseline missed both too. The criteria that turn on a measured value (`basics/text-reads-faint`, `typography/heading-indistinct`, `typography/headings-differ-only-in-size`, `layout/uniform-scale`) were already raised and quiet in every column, so this sample cannot show a gain from the numbers. 48 of the 74 crits with facts cite a facts field by name.
