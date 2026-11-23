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
