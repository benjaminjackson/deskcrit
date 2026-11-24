**First read.** The eye lands on the headline, moves right to the grey tide card, then drops to the three feature points and the new button below them. It reads as a calm, plain product page for harbor offices, with the tide table as the proof. It feels tidy and believable, but the table still looks like a bare sample, not a page a harbor office would post. On the phone the card stacks under the hero text. On the tablet the points now stack heading-over-text in two columns, with Notices alone in the second row.

**What it's for.** It gets a harbor office to set up Tidewell by showing that Tidewell posts tide, lock gate, pontoon depth and notice information that berth holders can trust (from the work order's crit).

**Verdict.** The fixes closed both layout defects. The page now ends with a next step, and the tablet points read as pairs. The thing most in the way has not changed: the tide card does not say it is an example, gives no date or height reference, and shows only tides. So the claim "can stand behind" still has nothing under it.

**Finding status**
- tide-table-unlabeled: open. The card heading still says only "Today at Porthmellin" (facts `texts.h2`), with no example label, date or height reference at any viewport.
- preview-shows-tides-only: open. The card still has only the four tide rows on desktop, tablet and widescreen. It has no rows for gate times, pontoon depth or notices.
- no-comparison-with-current-way: open. No line or image at any viewport compares Tidewell with how offices post times now.
- no-closing-call-to-action: closed. A repeated "Set up your harbor" button (`div.closing > a.button`) now sits below the points: at y 657 on desktop and widescreen, y 1083 on the phone and y 798 on the tablet. It has the same style as the hero button because it is the same action, so it is not a template tell.
- tablet-points-heading-far-from-text: closed. On the tablet each `p` now starts at the same left edge x as its `h3`: 64/64 for Lock gate times and Notices, and 408/408 for Depth at the pontoon.

**New problems.**
- Tablet, points section: the new two-column layout puts Notices alone in the second row, under Lock gate times, and leaves an empty cell to its right at about x 408–704, y 665–742. The three equal points now read as two plus one left over.

**What would move it most**
1. The tide card has no example label, date or height reference. A harbor master cannot tell if 4.8 m is live, for which day, or measured from what level, and that is exactly the doubt the headline promises to remove. Label the card as an example of the page Tidewell posts, and add the date and the level the heights are measured from. Only the maker can supply those two facts. Defect. Viewports: desktop, phone, tablet, widescreen.
2. The card shows only tides. The paragraph next to it promises lock gate times, pontoon depth and notices on one page, but the preview shows a plain tide table. Add rows for those three features only, with values the maker supplies. Defect. Viewports: desktop, tablet, widescreen.
3. Nothing compares Tidewell with the current method. The reader has to take "can stand behind" on trust. Add one line or image that sets Tidewell beside how offices post times now, with the comparison supplied by the maker. Taste. Viewports: desktop, phone, tablet, widescreen.

**Smaller things.**
- Tablet points: Notices sits alone in the second row with an empty cell beside it. Use one column of three stacked points at this width, or three narrow columns, so the points stay equal. Viewports: tablet.

**What's working.**
- The tide table: tabular, right-aligned times and heights, with bold times. The data reads in one scan, and it is the most convincing thing on the page.
- One button style for the one action, repeated at the top and bottom. The next step is clear without competing focal points.
- Quiet, consistent type and spacing across all four viewports. Nothing on the page looks like a stock template.
