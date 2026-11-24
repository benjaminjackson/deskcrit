**First read.** At every viewport the eye goes first to the two-line headline, "Tide times your harbor office can stand behind". Next it drops to the teal "Set up your harbor" button, then crosses to the "Today at Porthmellin" table. The page reads as a quiet, plain product page for a harbor tide service. It feels calm and credible, but it is thin. The table looks like live data for a real harbor, and nothing near it says where the numbers come from. On tablet and phone the table moves below the button and the three points stack into one column. On widescreen the same layout sits centered with a wide white margin on each side.

**What it's for.** To get a harbor office to trust Tidewell's numbers enough to click "Set up your harbor" (taken from the work order's crit).

**Verdict.** This round changed only the tablet text width. That fixed the headline break, but the hero paragraph still runs 77 characters per line. The biggest problem has not changed: nothing says where the tide numbers come from, and the hero still shows only tides.

**Finding status**
- copy-gives-no-reason-to-trust: open. All four viewports look the same as before. There is still no tide data source, no name for who works out the gate times, no example label on the table, and no line about setup effort next to the button.
- hero-shows-only-tides: open. On desktop, tablet and widescreen the hero table still has only the four tide rows, with no gate openings and no pontoon depth.
- tablet-lines-just-over-75: open. On tablet the shared width went from 560 to 540 px, and the first point paragraph now measures 71 characters per line. But `div.hero-text > p` still measures 77 characters per line, because it wraps at the same word as before ("...the depth at the visitor / pontoon...").
- tablet-headline-breaks-mid-phrase: closed. On tablet the headline now breaks as "Tide times your harbor / office can stand behind", and "can stand behind" stays on one line.

**New problems.** None. The narrower tablet width moves the right edge of the table and paragraphs to 572 px. They still line up with each other, and no text wraps badly.

**What would move it most**
1. Nothing tells a harbor master where the numbers come from. This sits at the headline, the "Today at Porthmellin" table and the button on every viewport. The headline promises numbers an office "can stand behind", and the next thing the viewer sees is a table that looks like live data, with no source and no example label. Nothing says how much work setup is. To fix it, name the tide data source and who works out the gate times, label the table as an example, and put one line about setup effort next to "Set up your harbor". Only the maker can supply these three facts. Defect. Viewports: desktop, phone, tablet, widescreen.
2. The hero table shows only what every tide site shows. The "Today at Porthmellin" table has only tide rows. The two things the copy says Tidewell adds, gate openings and pontoon depth, are only small paragraphs below the fold line of the hero. To fix it, add the day's gate openings and the pontoon depth to the hero visual, using figures from the maker. Keep the right-aligned times and the light rules. Defect. Viewports: desktop, tablet, widescreen.

**Smaller things.**
- The tablet hero paragraph is still 77 characters per line at 540 px. Narrow the tablet text width to about 520 px, or check the line break, so that "visitor" moves to the second line. Viewports: tablet.

**What's working.**
- The table sets times and heights right-aligned with light rules, so you can compare the numbers at a glance.
- The tablet headline now breaks into two balanced lines that end on whole phrases.
- There is one clear action. The teal button is the only filled element on the page, so the eye goes to it right after the headline.
