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

# Jev evidence (EV-14, FR-78)

- Date: 2026-11-24
- Skill commit: `82b57a1fb5d229577d5e182bb0f7f2278ce9c3c5` (crit-0a0.6)
- Pinned Jev model: `jev-1.14.0`. Jev's answers are the saved answers under `evals/agreement/runs/`, replayed through `dist/crit.js` with `--answers` and no key. No request went to TypeSafe, because EV-4 rule 5 forbids scoring the same fixture set again.
- Sample: the variant-1 pair of each of the 37 live criteria, 74 images. Each image got the fires of its own pack only, because the saved answers cover only that pack.
- Runs at this commit: 74 crits without Jev evidence and 35 with it, each judged once. 39 images had no fire, so their prompt has no evidence line and their crit is the one without Jev. 33 images had a fire on their own criterion, and 2 had fires only on other criteria of their pack. Judge prompt unchanged.
- Command: `node evals/critic/detect.ts --replay --jev --beside 82b57a1fb5d229577d5e182bb0f7f2278ce9c3c5`

The two columns at `82b57a1f` differ only in the Jev evidence file. The last table lists the 33 images where Jev fired on the image's own criterion.

First read: `agents/critic.md` says to open the evidence file only after the first read. A saved crit holds only the final text, so the order cannot be checked from it. In 2 of the 35 runs with evidence, the first read itself says that the critic opened the file before it wrote the first read.

```
skill commit 82b57a1fb5d229577d5e182bb0f7f2278ce9c3c5, live criteria only, with Jev evidence on 35 of 74 images, judge model claude-opus-5-5, pairs per criterion 1
side by side, raised on positive and quiet on negative (n/d); a column without +facts had no facts file
pack           criterion                          82b57a1f raised  82b57a1f quiet  82b57a1f+jev raised  82b57a1f+jev quiet
accessibility  chart-without-text                 1/1              1/1             1/1                  1/1
accessibility  error-without-text                 1/1              1/1             1/1                  1/1
accessibility  field-label-placeholder-only       1/1              1/1             1/1                  1/1
accessibility  meaning-by-color-only              1/1              1/1             1/1                  1/1
accessibility  running-text-italic-or-underlined  0/1              1/1             1/1                  1/1
art-direction  mixed-level-of-detail              1/1              1/1             1/1                  1/1
art-direction  mixed-rendering-styles             1/1              1/1             1/1                  1/1
basics         all-caps-long-text                 1/1              1/1             1/1                  1/1
basics         centered-or-right-paragraphs       1/1              1/1             1/1                  1/1
basics         competing-primary-buttons          1/1              1/1             1/1                  1/1
basics         decorative-face-for-paragraphs     1/1              1/1             1/1                  1/1
basics         text-reads-faint                   1/1              1/1             1/1                  1/1
color          accent-overused                    1/1              1/1             1/1                  1/1
color          competing-saturated-hues           1/1              1/1             1/1                  1/1
color          same-role-different-colors         1/1              1/1             1/1                  1/1
color          saturated-large-areas              0/1              1/1             1/1                  1/1
color          text-over-busy-image               1/1              0/1             1/1                  0/1
color          vibrating-color-pair               1/1              1/1             1/1                  1/1
dataviz        bar-axis-not-at-zero               1/1              1/1             1/1                  1/1
dataviz        bare-kpi-number                    1/1              1/1             1/1                  1/1
dataviz        chartjunk-decoration               1/1              1/1             1/1                  1/1
dataviz        color-without-meaning              1/1              1/1             1/1                  1/1
dataviz        heavy-gridlines-and-frames         1/1              1/1             1/1                  1/1
dataviz        pie-too-many-slices                1/1              1/1             1/1                  1/1
dataviz        rainbow-for-ordered-values         1/1              1/1             1/1                  1/1
dataviz        three-d-chart                      1/1              1/1             1/1                  1/1
layout         everything-centered                0/1              1/1             1/1                  1/1
layout         heavy-rules-and-boxes              1/1              1/1             1/1                  1/1
layout         no-dominant-element                0/1              1/1             1/1                  1/1
layout         uniform-scale                      1/1              1/1             1/1                  1/1
typography     heading-indistinct                 1/1              1/1             1/1                  1/1
typography     heading-lines-collide              1/1              1/1             1/1                  1/1
typography     headings-differ-only-in-size       1/1              1/1             1/1                  1/1
ux             actions-look-like-plain-text       1/1              1/1             1/1                  1/1
ux             duplicate-adjacent-actions         1/1              1/1             1/1                  1/1
ux             no-current-location-shown          1/1              1/1             1/1                  1/1
ux             required-fields-unmarked           1/1              1/1             1/1                  1/1
total                                             33/37            36/37           37/37                36/37

images where Jev fired on the image's own criterion: the judge answer without and with Jev evidence at this commit
pack           criterion                          image         jev   without-jev    with-jev
accessibility  chart-without-text                 shows-defect  fail  present        present
accessibility  error-without-text                 shows-defect  fail  present        present
accessibility  field-label-placeholder-only       shows-defect  fail  present        present
accessibility  running-text-italic-or-underlined  shows-defect  warn  absent         present
art-direction  mixed-level-of-detail              shows-defect  fail  present        present
art-direction  mixed-rendering-styles             shows-defect  warn  present        present
basics         all-caps-long-text                 shows-defect  fail  present        present
basics         centered-or-right-paragraphs       shows-defect  fail  present        present
basics         competing-primary-buttons          shows-defect  fail  present        present
basics         decorative-face-for-paragraphs     shows-defect  fail  present        present
basics         text-reads-faint                   shows-defect  fail  present        present
color          accent-overused                    shows-defect  warn  present        present
color          same-role-different-colors         shows-defect  fail  present        present
color          saturated-large-areas              shows-defect  warn  not_mentioned  present
color          text-over-busy-image               shows-defect  fail  present        present
dataviz        bar-axis-not-at-zero               shows-defect  fail  present        present
dataviz        bare-kpi-number                    shows-defect  fail  present        present
dataviz        chartjunk-decoration               shows-defect  fail  present        present
dataviz        color-without-meaning              shows-defect  fail  present        present
dataviz        pie-too-many-slices                shows-defect  fail  present        present
dataviz        rainbow-for-ordered-values         shows-defect  fail  present        present
dataviz        three-d-chart                      shows-defect  fail  present        present
layout         everything-centered                shows-defect  warn  not_mentioned  present
layout         heavy-rules-and-boxes              shows-defect  fail  present        present
layout         no-dominant-element                shows-defect  fail  absent         present
layout         uniform-scale                      shows-defect  warn  present        present
typography     heading-indistinct                 shows-defect  fail  present        present
typography     heading-lines-collide              shows-defect  fail  present        present
typography     headings-differ-only-in-size       shows-defect  warn  present        present
ux             actions-look-like-plain-text       shows-defect  warn  present        present
ux             duplicate-adjacent-actions         shows-defect  warn  present        present
ux             no-current-location-shown          shows-defect  fail  present        present
ux             required-fields-unmarked           shows-defect  fail  present        present
Jev (EV-14): in the replay of npm run eval:agreement on 2026-11-23, 29 of the 32 live criteria with a label file agreed with Benjamin Jackson's labels at 0.8 or above, and 182 of 210 positive fixtures fired; Jev failed on the criteria removed under R-4.
```

# Refuter (EV-14, FR-81)

- Date: 2026-11-24
- Crits: the saved run-1 crits of skill commit `3a8d079b393465ca12ca83931416acd49717d971`, the last commit with crits of both the live and the removed criteria. No new critic run was made.
- Refuter commit: `0bad6cc60138f58ea84a2e2fd373375bbce1d3a3` (crit-0a0.3), `agents/refuter.md` on `claude-opus-5-5`, with the critic's isolation and allowed commands. It got each crit's ranked findings, the image, and no facts file, because the removed criteria have none.
- Sample: the variant-1 pair of each of the 37 live and 40 removed criteria, 154 images, one refuter run each. No run was refused, and no command was denied.
- Judge: a crit the refuter left unchanged keeps its saved judge answer, so only a dropped finding can change a row.
- Command: `npm run eval:critic:detect:refute` (`node evals/critic/detect.ts --replay --refute --skill-commit 3a8d079b393465ca12ca83931416acd49717d971 --refuter-commit 0bad6cc60138f58ea84a2e2fd373375bbce1d3a3`)

The first table is the crits without the refuter, and the second is the same crits after it.

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

with the refuter (FR-81) at refuter commit 0bad6cc60138f58ea84a2e2fd373375bbce1d3a3, on the run-1 crits of skill commit 3a8d079b393465ca12ca83931416acd49717d971
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
ranked findings the refuter dropped: 0 of 211 on 77 images that show the defect, 0 of 196 on 77 images that do not
images whose judge answer changed with the refuter
no judge answer changed
Jev (EV-14): in the replay of npm run eval:agreement on 2026-11-23, 29 of the 32 live criteria with a label file agreed with Benjamin Jackson's labels at 0.8 or above, and 182 of 210 positive fixtures fired; Jev failed on the criteria removed under R-4.
```

Reading: the refuter kept all 407 ranked findings, so every row is the same with and without it. Without it, the critic raised a defect on 1 of the 77 negative images (`removed/layout/figure-merges-with-ground`), so this sample could show a gain of 1 image at most. On that image the critic's three ranked findings are about a picture that does not match its headline, a bright right half, and an outline button; the refuter found each one in the image and kept it. Nothing was lost on positives. Decision: drop, because the check raised no fewer defects on negative images (FR-81).

# Deep mode (EV-14, OQ-28)

- Date: 2026-11-24
- Skill commit: `b8ce97507396df2d86bdc20edc3a5fad21873ccc` (crit-0a0.7). The deep mode (`agents/deep-mode.md`) ran one section critic per checklist section (`agents/section-critic.md`, eight in all) and then the director (`agents/director.md`), each a separate `claude -p` child on `claude-opus-5-5` with the critic's isolation and allowed commands, through `evals/critic/deep-run.ts`. No facts file and no Jev evidence.
- Beside: the single critic at `3a8d079b393465ca12ca83931416acd49717d971`, the newest skill commit with saved crits of both the live and the removed criteria. Between the two commits, `agents/critic.md` gained only the parts for a `violations` list and a Jev evidence file, which these runs do not have.
- Sample: the variant-1 pair of each of the 37 live and 40 removed criteria, 154 images, run 1. Runs: 154 deep crits, which is 1,232 section critic runs and 154 director runs, each judged once with the unchanged detection judge. No run was refused and no run failed. 839 Bash calls were denied, nearly all a `cd <skill folder>; cat ...` read of the instructions; each agent then read the files with Read. 1 of the 154 crits writes its tally heading as `**Checklist**` with no period. The deep runs cost 235.55 USD in all as `claude -p` reports it, about 1.53 USD per crit.
- Command: `npm run eval:critic:detect:deep` (`node evals/critic/detect.ts --replay --deep --skill-commit b8ce97507396df2d86bdc20edc3a5fad21873ccc --beside 3a8d079b393465ca12ca83931416acd49717d971`)

```
skill commit b8ce97507396df2d86bdc20edc3a5fad21873ccc, deep mode, judge model claude-opus-5-5, pairs per criterion 1
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
removed                    layout         figure-merges-with-ground          1.00 (1/1)          1.00 (1/1)         0
removed                    layout         groups-not-separated               1.00 (1/1)          1.00 (1/1)         0
removed                    layout         inconsistent-repeated-styles       1.00 (1/1)          1.00 (1/1)         0
removed                    layout         label-far-from-field               1.00 (1/1)          1.00 (1/1)         0
removed                    layout         lopsided-balance                   1.00 (1/1)          1.00 (1/1)         0
removed                    layout         near-miss-alignment                1.00 (1/1)          1.00 (1/1)         0
removed                    layout         off-grid-block                     1.00 (1/1)          1.00 (1/1)         0
removed                    layout         picture-off-text-lines             1.00 (1/1)          0.00 (0/1)         0
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
live total                                                                   0.97 (36/37)        0.97 (36/37)       0
removed total (jev-quiet)                                                    0.84 (26/31)        0.97 (30/31)       0
removed total (no-source)                                                    1.00 (9/9)          1.00 (9/9)         0
removed total                                                                0.88 (35/40)        0.97 (39/40)       0

side by side, raised on positive and quiet on negative (n/d); a column without +facts had no facts file
pack           criterion                          3a8d079b raised  3a8d079b quiet  b8ce9750+deep raised  b8ce9750+deep quiet
accessibility  chart-without-text                 1/1              1/1             1/1                   1/1
accessibility  error-without-text                 1/1              1/1             1/1                   1/1
accessibility  field-label-placeholder-only       1/1              1/1             1/1                   1/1
accessibility  meaning-by-color-only              1/1              1/1             1/1                   1/1
accessibility  running-text-italic-or-underlined  0/1              1/1             0/1                   1/1
art-direction  mixed-level-of-detail              1/1              1/1             1/1                   1/1
art-direction  mixed-rendering-styles             1/1              1/1             1/1                   1/1
basics         all-caps-long-text                 1/1              1/1             1/1                   1/1
basics         centered-or-right-paragraphs       1/1              1/1             1/1                   1/1
basics         competing-primary-buttons          1/1              1/1             1/1                   1/1
basics         decorative-face-for-paragraphs     1/1              1/1             1/1                   1/1
basics         text-reads-faint                   1/1              1/1             1/1                   1/1
color          accent-overused                    1/1              1/1             1/1                   1/1
color          competing-saturated-hues           1/1              1/1             1/1                   1/1
color          same-role-different-colors         1/1              1/1             1/1                   1/1
color          saturated-large-areas              0/1              1/1             1/1                   1/1
color          text-over-busy-image               1/1              1/1             1/1                   0/1
color          vibrating-color-pair               1/1              1/1             1/1                   1/1
dataviz        bar-axis-not-at-zero               1/1              1/1             1/1                   1/1
dataviz        bare-kpi-number                    1/1              1/1             1/1                   1/1
dataviz        chartjunk-decoration               1/1              1/1             1/1                   1/1
dataviz        color-without-meaning              1/1              1/1             1/1                   1/1
dataviz        heavy-gridlines-and-frames         1/1              1/1             1/1                   1/1
dataviz        pie-too-many-slices                1/1              1/1             1/1                   1/1
dataviz        rainbow-for-ordered-values         1/1              1/1             1/1                   1/1
dataviz        three-d-chart                      1/1              1/1             1/1                   1/1
layout         everything-centered                1/1              1/1             1/1                   1/1
layout         heavy-rules-and-boxes              1/1              1/1             1/1                   1/1
layout         no-dominant-element                0/1              1/1             1/1                   1/1
layout         uniform-scale                      1/1              1/1             1/1                   1/1
typography     heading-indistinct                 1/1              1/1             1/1                   1/1
typography     heading-lines-collide              1/1              1/1             1/1                   1/1
typography     headings-differ-only-in-size       1/1              1/1             1/1                   1/1
ux             actions-look-like-plain-text       1/1              1/1             1/1                   1/1
ux             duplicate-adjacent-actions         1/1              1/1             1/1                   1/1
ux             no-current-location-shown          1/1              1/1             1/1                   1/1
ux             required-fields-unmarked           1/1              1/1             1/1                   1/1
basics         body-text-too-small                1/1              1/1             1/1                   1/1
basics         captions-labels-too-small          1/1              1/1             1/1                   1/1
basics         content-touches-page-edge          1/1              1/1             1/1                   1/1
basics         wall-of-text                       1/1              1/1             1/1                   1/1
layout         crowded-unrelated-elements         1/1              1/1             1/1                   1/1
layout         figure-merges-with-ground          1/1              0/1             1/1                   1/1
layout         groups-not-separated               1/1              1/1             1/1                   1/1
layout         inconsistent-repeated-styles       1/1              1/1             1/1                   1/1
layout         label-far-from-field               1/1              1/1             1/1                   1/1
layout         lopsided-balance                   1/1              1/1             1/1                   1/1
layout         near-miss-alignment                1/1              1/1             1/1                   1/1
layout         off-grid-block                     1/1              1/1             1/1                   1/1
layout         picture-off-text-lines             1/1              1/1             1/1                   0/1
layout         uneven-gutters                     1/1              1/1             1/1                   1/1
layout         white-space-scattered              1/1              1/1             0/1                   1/1
typography     baselines-misaligned               1/1              1/1             1/1                   1/1
typography     body-leading-too-loose             1/1              1/1             1/1                   1/1
typography     body-leading-too-tight             1/1              1/1             1/1                   1/1
typography     display-caps-tight                 1/1              1/1             1/1                   1/1
typography     display-kerning-gap                0/1              1/1             0/1                   1/1
typography     display-ligature-missing           0/1              1/1             0/1                   1/1
typography     display-quote-not-hung             1/1              1/1             1/1                   1/1
typography     display-straight-quotes            1/1              1/1             1/1                   1/1
typography     display-type-loose                 1/1              1/1             1/1                   1/1
typography     faux-italic-display                0/1              1/1             0/1                   1/1
typography     first-paragraph-indented           1/1              1/1             1/1                   1/1
typography     heading-at-column-foot             1/1              1/1             1/1                   1/1
typography     heading-floats                     1/1              1/1             1/1                   1/1
typography     heading-lines-loose                1/1              1/1             1/1                   1/1
typography     justified-word-gaps                1/1              1/1             1/1                   1/1
typography     list-wrap-under-bullet             1/1              1/1             1/1                   1/1
typography     measure-too-long                   1/1              1/1             1/1                   1/1
typography     near-identical-sizes               1/1              1/1             1/1                   1/1
typography     paragraph-indent-and-space         1/1              1/1             1/1                   1/1
typography     paragraph-runt                     1/1              1/1             1/1                   1/1
typography     rag-staircase                      0/1              1/1             0/1                   1/1
typography     rivers-of-white                    1/1              1/1             1/1                   1/1
typography     stacked-emphasis                   1/1              1/1             1/1                   1/1
typography     thin-small-text                    1/1              1/1             1/1                   1/1
typography     too-many-typefaces                 1/1              1/1             1/1                   1/1
total                                             70/77            76/77           71/77                 75/77
Jev (EV-14): in the replay of npm run eval:agreement on 2026-11-23, 29 of the 32 live criteria with a label file agreed with Benjamin Jackson's labels at 0.8 or above, and 182 of 210 positive fixtures fired; Jev failed on the criteria removed under R-4.
```

Reading, against noise of 2 or 3 images between two full runs of one critic: deep mode raised 71 of 77 positives and left 75 of 77 negatives quiet; the single critic raised 70 of 77 and left 76 of 77 quiet. Six rows differ, three each way, so this sample shows no difference in detection. Deep mode raised the two live misses of the single critic (`color/saturated-large-areas`, `layout/no-dominant-element`), and newly raised two defects on negative images (`color/text-over-busy-image`, `layout/picture-off-text-lines`). EV-19, the blind side-by-side, has not run.

# Where it could go further (EV-19, OQ-28)

Run on 2026-11-24 (crit-0a0.5). Ten real pages from Benjamin Jackson's bookmarks, captured full page at 1280 px wide and cut at 3200 px, after a slow scroll that waits until every image in the captured area has loaded and after cookie banners and sign-up popups are closed. The pages are not committed: `evals/critic/side-by-side/` is in `.gitignore`, because a crit of a real page describes the page.

The first candidate (skill commit `a08b4975`) wrote the section only when the ranked list held two findings or fewer. It wrote it on 1 of the 10 pages, so the pairs would have shown run-to-run difference and not the section. The pairs Benjamin Jackson judged set the base critic (`e9d03b22`) against a version that writes the section on every crit (`39e113d3`, branch `crit-0a0.5-always`).

He judged 5 of the 10 pages blind and stopped, because the same version won each time. `side-by-side.ts record` refuses an incomplete picks file, so the picks were mapped through `key.json` with jq:

```
01 abstrategies.png picked B = candidate
02 anthropic.png picked A = candidate
03 datawrapper.png picked B = candidate
04 favikon.png picked B = candidate
05 grilli.png picked A = candidate
```

The candidate won 5 of 5. With two equal versions, 5 of 5 happens about 1 time in 32.

A review of the paired crits, with the base run a second time (`a08b4975` on the 9 pages where it did not write the section) as the noise check, found:

- The section took no space from the rest. Ranked lists averaged 487 words in the base, 541 in the candidate, and 476 in the noise check. The base ranked 3.6 findings on average and the candidate 3.8.
- Two runs of one prompt share about 2 of every 3 to 4 ranked findings, and the base and the candidate overlap at the same rate. So the ranked findings that only one crit of a pair had are run-to-run difference.
- The section repeated a ranked finding on 6 pages, moved taste ideas out of the ranked list, "Smaller things", or "What's working", and reused the same few suggestions: own one color, let one number lead, commit to the typeface.

Decision (Benjamin Jackson, 2026-11-24): "that section should appear on every crit". He approved three rules against the review's problems. Also: "we can accept the critic will not flag every single thing on every single run."

## Second step (crit-0a0.14)

The section moved out of `agents/critic.md` into a second agent, `agents/go-further.md`, that writes it after the critic. The blind side-by-side set the second-step section (written on the base `e9d03b22` crits by skill commit `3f0e7ca5`) against the always-on section of `39e113d3`. The pages are in `evals/critic/side-by-side/out-two-step/`, which `.gitignore` lists. Benjamin Jackson picked 3 pages, read them with a reading of the same sections, and stopped there: "Ok I'm convinced. This pick stands" (2026-11-23). His picks, mapped through `key.json`:

```
01 abstrategies.png picked A = candidate
02 anthropic.png picked B = candidate
03 datawrapper.png picked A = candidate
```

The candidate won 3 of 3. The scores of the candidate are in `evals/critic/SCORES.md`: the repeat-run figures are back inside the range of the two base batches, and two of the three detection images that slipped at `aefb4967` are caught again.

# Set evaluation (EV-21, FR-83)

## Run 1 (sets version 1)

One run per set at skill commit `73574a3c`, the saved runs committed in `75d0da5`. `node evals/critic/sets.ts` printed:

```
set     kind                        answer  critic said             right tile  break found  false break
set-01  component style             tile 4  tile 3, tile 4, tile 6  yes         found        -
set-02  content edge or column      tile 3  tile 2, tile 3, tile 4  yes         found        -
set-03  type scale                  tile 5  tile 4, tile 5          yes         found        -
set-04  palette                     tile 2  tile 2                  yes         found        -
set-05  illustration or icon style  tile 3  tile 3                  yes         found        -
set-06  navigation place            tile 4  tile 2, tile 3, tile 4  yes         found        -
set-07  navigation name             tile 3  tile 3, tile 6          yes         found        -
set-08  clean                       none    tile 2, tile 3, tile 4  -           -            yes
set-09  clean                       none    tile 2, tile 3, tile 4  -           -            yes
set-10  clean                       none    tile 3, tile 4, tile 5  -           -            yes

break found (judge): 7 of 7
right tile named: 7 of 7
false break on a clean set: 3 of 3
```

The critic found all 7 planted breaks. It also named extra tiles on 5 of the 7 broken sets and reported breaks on all 3 clean sets. The extra breaks that were checked by hand are real flaws of the generated screens, not invented ones: in set-09 the "Messages" screen is a new-patient form and the "Patients" screen repeats the appointments table of "Today", and in set-08 the title "Rate quotes" differs from its nav item "Rates". So `answers.json` called sets clean that were not, and the "false break" and extra-tile counts of this run do not measure the critic. Also, "right tile named" counted a Breaks line that named the planted tile among others.

Decision (Benjamin Jackson, 2026-11-23): "Repair, then rerun". Version 2 of the sets removes every unplanned difference, keeps the planted breaks and `answers.json`, and is frozen after its first run (crit-j8y.8).

## Run 2 (sets version 2)

One run per set at skill commit `73574a3c`, on version 2 of the sets (crit-j8y.8), after a realism pass by a fresh agent that saw no crit or score. `node evals/critic/sets.ts` printed:

```
set     kind                        answer  critic said  right tile  extra tiles  break found  false break
set-01  component style             tile 4  tile 4       yes         none         found        -
set-02  content edge or column      tile 3  tile 3       yes         none         found        -
set-03  type scale                  tile 5  tile 5       yes         none         found        -
set-04  palette                     tile 2  tile 2       yes         none         found        -
set-05  illustration or icon style  tile 3  tile 3       yes         none         found        -
set-06  navigation place            tile 4  tile 4       yes         none         found        -
set-07  navigation name             tile 3  tile 3       yes         none         found        -
set-08  clean                       none    none         -           none         -            no
set-09  clean                       none    none         -           none         -            no
set-10  clean                       none    none         -           none         -            no

break found (judge): 7 of 7
right tile named, and no other: 7 of 7
false break on a clean set: 0 of 3
```

The set critic found every planted break, named only the planted tile on all 7 broken sets, and reported no break on the 3 clean sets. One run per set, on generated screens, so this shows the mode works and is not yet a rate; EV-21 has no pass bar yet.

## Picker (FR-83, EV-15 pairs)

One picker run per pair at skill commit `b3e5f343`, on the 30 labeled pairs of `evals/compare-pairs/labels.json` (crit-j8y.7). Each run read a contact sheet of the two versions plus both full-size images, in the order `compare.ts` uses, and a tie counts as "same". `node evals/critic/picker.ts` printed:

```
Picker on the compare pairs (FR-83, EV-15)
Mode: live
Skill commit: b3e5f3439dda0d05ec567b2cbbf91e0de80828cb
Pairs: 30

pair                                         tile-1-is  picker said  preference  outcome
decorative-face-for-paragraphs-fix           before     tile 2       after       agreed
decorative-face-for-paragraphs-2-regression  before     tile 1       before      agreed
text-reads-faint-fix                         after      tile 1       after       agreed
text-reads-faint-2-regression                after      tile 2       same        disagreed
text-reads-faint-3-fix                       before     tile 2       after       agreed
centered-or-right-paragraphs-fix             before     tile 2       after       agreed
centered-or-right-paragraphs-2-regression    after      tile 2       before      agreed
all-caps-long-text-fix                       after      tile 1       after       agreed
all-caps-long-text-2-regression              after      tile 2       before      agreed
competing-primary-buttons-fix                after      tile 1       after       agreed
competing-primary-buttons-2-regression       after      tile 2       before      agreed
no-dominant-element-fix                      before     tile 2       after       agreed
no-dominant-element-2-regression             before     tile 1       before      agreed
uniform-scale-fix                            before     tile 2       after       agreed
uniform-scale-2-regression                   before     tile 1       before      agreed
everything-centered-fix                      after      tile 1       after       agreed
everything-centered-2-regression             before     tile 1       before      agreed
heavy-rules-and-boxes-fix                    before     tile 2       after       agreed
heavy-rules-and-boxes-2-regression           after      tile 2       before      agreed
heading-lines-collide-fix                    after      tile 1       after       agreed
heading-lines-collide-2-regression           after      tile 2       before      agreed
heading-indistinct-fix                       after      tile 1       after       agreed
heading-indistinct-2-regression              before     tile 1       before      agreed
headings-differ-only-in-size-fix             after      tile 1       after       agreed
headings-differ-only-in-size-2-regression    after      tile 2       before      agreed
same-button-radius                           after      tile 1       same        disagreed
same-button-hue                              after      tie          after       disagreed
same-page-background                         after      tile 1       before      disagreed
same-illustration-fill                       after      tie          before      disagreed
same-link-underline-offset                   after      tile 2       same        disagreed

agreed 24, disagreed 6, undecided 0, rate 0.800 (of 30 scored)

agrees with the preference: 24 of 30; old compare path (EV-15, SCORES.md): 24 of 30

ties on the 3 pairs preferred "same": 0; ties on the 27 other pairs: 2
```

The picker agrees with the preference on 24 of 30 pairs, the same figure as the old compare path (24 of 30 at every scored skill version in `SCORES.md`), and it misses the same 6 pairs: `text-reads-faint-2-regression`, `same-button-radius`, `same-button-hue`, `same-page-background`, `same-illustration-fill`, and `same-link-underline-offset`. It gave 2 ties, both on pairs where the preference is not "same". All 24 `-fix` and `-regression` pairs except `text-reads-faint-2-regression` agree. One run per pair, so this is not yet a rate.

## Template tells (baseline, EV-23)

One critic run per image at skill commit `15fe4169`, the critic before it was told about the tells, on the 76 frozen fixtures of `packs/_tells/` (crit-7hw.2): one positive image with the tell and one negative twin without it, for each of the 38 entries of the Template tells section of GUIDELINES.md. A fresh agent that saw no crit or score did the realism pass before the run (37 of 38 ok, one title fix). The judge read each crit and said whether it raises the tell, praises it, or does not mention it. A praise on a negative image counts as quiet, and the praised-on-negative column counts it again on its own. `npm run eval:critic:tells` replays this table with no model call:

```
tell                                                      positive       negative       raised-on-positive  quiet-on-negative  praised-on-positive  praised-on-negative
purple-to-blue-or-violet-to-pink-gradients                raised         not_mentioned  yes                 yes                no                   no
gradient-text-in-headings-numbers-or-the-logo             raised         not_mentioned  yes                 yes                no                   no
colored-glows-around-elements                             raised         not_mentioned  yes                 yes                no                   no
color-washes-and-blurred-blobs-behind-content             praised        not_mentioned  no                  yes                yes                  no
neon-or-bright-colored-borders                            raised         not_mentioned  yes                 yes                no                   no
many-near-identical-tints-of-one-hue-for-text             not_mentioned  not_mentioned  no                  yes                no                   no
every-element-highlighted                                 raised         praised        yes                 yes                no                   yes
glass-cards-with-an-inner-highlight-and-a-colored-shadow  raised         not_mentioned  yes                 yes                no                   no
headings-at-weight-800-or-900                             praised        not_mentioned  no                  yes                yes                  no
uppercase-labels-with-wide-tracking                       praised        not_mentioned  no                  yes                yes                  no
too-many-type-sizes-and-weights-on-one-screen             raised         praised        yes                 yes                no                   yes
numbers-in-mixed-formats                                  raised         not_mentioned  yes                 yes                no                   no
negative-letter-spacing-on-small-text                     not_mentioned  not_mentioned  no                  yes                no                   no
italic-used-for-emphasis-in-interface-text                raised         not_mentioned  yes                 yes                no                   no
emoji-as-icons-or-status                                  raised         not_mentioned  yes                 yes                no                   no
emoji-inside-pills-and-counts                             raised         not_mentioned  yes                 yes                no                   no
icons-in-many-sizes-and-colors                            raised         not_mentioned  yes                 yes                no                   no
icons-nudged-off-the-column                               raised         not_mentioned  yes                 yes                no                   no
sparkle-icon-as-decoration                                raised         not_mentioned  yes                 yes                no                   no
glowing-pills-for-counts-and-status                       raised         not_mentioned  yes                 yes                no                   no
pro-new-and-beta-badges-everywhere                        raised         not_mentioned  yes                 yes                no                   no
every-element-a-full-pill                                 not_mentioned  not_mentioned  no                  yes                no                   no
rainbow-glowing-or-pill-shaped-chart-bars                 raised         not_mentioned  yes                 yes                no                   no
every-chart-in-shades-of-the-accent                       raised         not_mentioned  yes                 yes                no                   no
sparklines-on-every-stat-card                             praised        not_mentioned  no                  yes                yes                  no
equal-cards-side-by-side-with-the-same-chart              praised        not_mentioned  no                  yes                yes                  no
gradient-logo-tile-with-a-sparkle                         not_mentioned  not_mentioned  no                  yes                no                   no
logo-mark-as-a-glossy-orb                                 raised         not_mentioned  yes                 yes                no                   no
pill-badge-above-the-headline                             raised         not_mentioned  yes                 yes                no                   no
hero-stacked-on-one-centered-axis                         not_mentioned  not_mentioned  no                  yes                no                   no
three-or-more-buttons-in-the-hero                         raised         praised        yes                 yes                no                   yes
feature-cards-with-an-emoji-and-a-bold-title              raised         not_mentioned  yes                 yes                no                   no
glossy-3d-blob-as-the-hero-visual                         raised         not_mentioned  yes                 yes                no                   no
stock-robots-glowing-brains-and-holograms                 raised         not_mentioned  yes                 yes                no                   no
image-that-does-not-blend-into-the-page                   not_mentioned  not_mentioned  no                  yes                no                   no
a-visual-on-every-section                                 not_mentioned  not_mentioned  no                  yes                no                   no
neutral-dark-template-look                                praised        praised        no                  yes                yes                  yes
empty-box-or-generic-picture-as-the-hero-visual           raised         not_mentioned  yes                 yes                no                   no
Total                                                                                   0.66 (25/38)        1.00 (38/38)       0.16 (6/38)          0.11 (4/38)
skill commit 15fe41698c70411d5cffd822320277c11552224e
replay: node evals/critic/tells.ts --replay --skill-commit 15fe41698c70411d5cffd822320277c11552224e
```

The unchanged critic raises 25 of the 38 tells, never raises one on a clean twin, and praises 6 tells as good design: the color washes behind the hero, headings at weight 800, uppercase labels with wide tracking, sparklines on every stat card, equal cards with the same chart, and the neutral dark template look. On 4 of the 38 clean twins the judge marked the crit as praising the tell: every element highlighted, too many type sizes and weights on one screen, three or more buttons in the hero, and the neutral dark template look. crit-7hw.3 compares its rescore with this table.
