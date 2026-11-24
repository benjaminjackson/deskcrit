**First read.** On desktop the eye lands on the headline, drops to the dark red "Start a 30-day trial" button, then crosses to the "Reorder this week" table on the right. The page reads as a calm, focused product page for a bookshop owner. The single filled button now makes the ask clear. At phone and tablet width the page stacks in one column in the order headline, paragraph, buttons, table, notes, and nothing runs off the screen. On widescreen it looks like the desktop layout set in the middle of the screen.

**What it's for.** To get an independent bookshop owner to start a 30-day trial of Shelfmark, by showing that it tells them what to reorder.

**Verdict.** The fixes helped a lot. The broken phone and tablet layouts are fixed, the trial is now the primary action, and the widescreen hero holds together. The biggest problem left is the one the crit marked for the maker: the table still shows raw counts and not the reorder answer that the headline promises.

**Finding status**
- no-reflow-below-desktop: open, but close. The page is now 390 px wide on the phone and 768 px wide on the tablet, and both stack in one column. The measured check still fails in two places. The h1 is 17 characters per line on the phone, which is normal for a 32 px headline, so this part of the check is probably the wrong test. The hero paragraph is 78 characters per line on the tablet, which is over the 75 limit.
- trial-not-primary-action: closed. At all four viewports "Start a 30-day trial" is the only filled button (white on #8a3b24, 7.69:1), "See how it works" is outlined, and "Sign in" is now an outline.
- table-lacks-recommendation: open. The table still has only "On shelf" and "Sold this week", and the page still does not compare Shelfmark with what a shop does now.
- widescreen-hero-two-islands: open, but much better. The content is now 1200 px wide (x 360 to 1560), and the gap between the text and the table dropped from about 800 px to about 210 px. The three notes still sit on thirds (x 773 and 1187) that the hero table edge (x 1081) does not share, the same as on desktop.
- table-header-gray-contrast: closed. The table headers and the date are now 7.43:1 at every viewport.
- type-sizes-one-pixel-apart: closed. type_sizes at every viewport is 40 (32 on the phone), 20, 16 and 14, with no 15.
- headline-lonely-last-word: closed. On desktop and widescreen the headline breaks as "Know what is on / your shelves before / a customer asks". The last line has three words.
- notes-line-length-widescreen: closed. On widescreen the notes measure 44, 49 and 42 characters per line, and "take." no longer stands alone.
- feature-notes-copy: open. "Returns tracked." is now "Tracks returns.", so that note has its verb. "Works with your till" still names no till, and only the maker knows which tills it supports.

**New problems.** None.

**What would move it most**
1. The table does not give the answer. This is the "Reorder this week" table, beside the hero text on desktop and below it on phone and tablet. The paragraph promises "tells you which titles to reorder", but the owner still has to compare two columns and work out the decision. Nothing on the page sets Shelfmark next to the spreadsheet or the till report the owner uses now, so the owner has to take the value on trust. Fix: add a column that states the reorder decision for each title, and add a short comparison with how a shop works now. The maker must supply the label, the values, and what the comparison says. Defect.

**Smaller things.**
- The tablet hero paragraph is 78 characters per line and the second feature note is 76. Set the text column to about 560 px so that both are 75 or fewer. Viewports: tablet.
- On the phone, "On shelf" and "Sold this week" in the table header wrap to two lines, and "Notes from the Ferry" wraps. Narrow the Title column, or shorten the header labels, to keep each row on one line. Viewports: phone.
- On the phone, the header uses three rows (logo, links, "Sign in"), about 150 px, before the headline. Put "Sign in" on the logo row to get that space back. Viewports: phone.
- The feature notes sit on thirds that the hero table edge does not share. Align the third note, or the table, to one shared column line. Viewports: desktop, widescreen.
- "Works with your till" does not say which tills. Name them; the maker must supply the list. Viewports: desktop, phone, tablet, widescreen.

**What's working.**
- There is now one filled dark red button and everything else is outlined, so the one action the page wants is clear at every width.
- The phone layout puts the table directly under the buttons, so the proof follows the promise in reading order.
- The headline now breaks into three balanced phrases, and each line reads as a unit.
