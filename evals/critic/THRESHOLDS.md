# Threshold evaluation (crit-576.13)

The question: does the measured facts file, with its `violations` list (FR-79), harm the critic's call where a number and the eye disagree? And does the critic use the facts near a numeric rule?

`evals/critic/thresholds.ts` runs the design critic on 12 images, 3 times with the image alone and 3 times with the image and its facts file, at one skill commit. So the facts file is the only difference between the two conditions. A judge reads each crit and says whether it calls the case's defect present, absent, uncertain (borderline, or "measure it"), or does not mention it, and where the crit raises it. A second judge question reads the number the crit states for the measured quantity. The judge prompts name the defect in words and hold no rule number.

Replay with no model call:

```
npm run eval:critic:thresholds
```

## The cases

Every case, band, and count below is this evaluation's own choice (crit-576.13), not a rule from the PRD. The measured value comes from the committed facts file, except for the photo case, where `render-thresholds.ts` takes the median contrast between the text color and the screenshot pixels behind the text, with the text hidden.

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

Not run yet.
