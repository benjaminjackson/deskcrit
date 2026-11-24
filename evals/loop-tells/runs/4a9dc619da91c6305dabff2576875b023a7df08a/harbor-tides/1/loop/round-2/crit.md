**First read.** On desktop and widescreen the eye lands on the headline, moves down to the button, then crosses to the pale gray panel on the right with the Porthmellin tide table. The page now reads as a calm, plain landing page for a harbor tool, and it has a working example on the first screen. The three feature notes below form a quiet second row. On phone and tablet everything stacks into one column: headline, paragraph, button, sample, then the three notes. Nothing scrolls sideways, and the nav fits on one line.

**What it's for.** It gets a harbor office to set up Tidewell by showing the one page that berth holders would check from the quay. This comes from the work order's crit.

**Verdict.** The fixes worked. The phone and tablet layouts no longer break, and the sample now sits in the hero at body size. The biggest thing still in the way is the sample itself: it shows only tide times, so the claims about gate times, depth and notices still have to be taken on trust.

**Finding status**
- phone-tablet-layout-breaks: open, by measure only. Page width is 390 on the phone, the nav is on one line, the h3 headings do not break, and the tablet notes run 71 to 74 characters per line. But the phone notes run 43, 41 and 47 characters per line, so two of three miss the check of 45 or more, by 2 to 4 characters.
- empty-hero-small-proof: closed. The h2 and table cells are 15 px at desktop, tablet and widescreen, and the sample sits beside the headline at desktop and widescreen.
- sample-hides-differences: open. The sample still shows only four tide rows, with no gate times, no pontoon depth, no notice, and no comparison with how the office posts these now.
- table-header-contrast: closed. The headers measure 6.67:1 at all four viewports.
- too-many-type-sizes: closed. Every viewport has three sizes (30, 19 and 15 px), and the h2 is 15 px.
- heading-baseline-step: closed. The "Today at Porthmellin" heading has moved into the hero, and the three feature headings share one top at y 501 on desktop and widescreen.
- straight-apostrophe: closed. The facts file shows "day’s" with a curly apostrophe.

**New problems.** None. The new pale gray panel has square-ish corners, no shadow, gradient or glow, and holds one group (heading and table), so it is not a template tell. The new hairlines between table rows are plain separators.

**What would move it most**
1. The sample shows tide times only (the "Today at Porthmellin" panel, all viewports). A harbor master sees a table that any tide almanac gives. The three things the page says make Tidewell different (gate times, hourly pontoon depth, notices) appear only as text claims below it, and nothing compares them with how the office posts them today. The direction is to add a gate-time row, a pontoon depth reading and one notice to the sample, and to add a short before-and-after against the office's current way of posting. The maker must supply the real gate times, depth figures, notice text and current method. Taste. Viewports: desktop, phone, tablet, widescreen.

**Smaller things.**
- Phone feature notes (finding phone-tablet-layout-breaks): two of the three run 41 and 43 characters per line in a 350 px column, against the check of 45. At 15 px in a 390 px viewport, the column cannot get much wider, and these lines read normally on a phone. Either reduce the side padding a little or accept the measured shortfall as fine for this width. Viewports: phone.
- Tablet: the content stops at x 608 while the nav runs to x 704, which leaves a 160 px empty band on the right with nothing aligned to the nav's right edge. Let the content column use the same right edge as the nav. Viewports: tablet.
- Tablet hero paragraph: it runs 77 characters per line, which is just over 75. The same width change would fix it, or a slightly narrower measure for this paragraph. Viewports: tablet.
- Desktop and widescreen: the panel's left edge (x 736 on desktop) does not line up with the third feature column (x 837), so the two rows sit on different grids. Align the panel to the third column, or align the columns to the panel. Viewports: desktop, widescreen.

**What's working.**
- The sample panel now sits beside the headline. This gives the first screen a second focal point that is real proof, not decoration.
- The table columns are now right-aligned, so times and heights line up by digit and scan quickly down the column.
- The phone stack goes in the right order (claim, action, example, details), and the text is at body size throughout, so it reads easily on the quay.
