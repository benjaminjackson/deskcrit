**First read.** The eye lands on the three-line headline, crosses to the "Reorder this week" card on the right, and comes back to the rust "Start a 30-day trial" button. The page reads as a calm, plain product page for independent bookshops, with a stock table as the proof. On the phone and the tablet, everything stacks in one column: headline, buttons, card, then the three notes. The order holds and nothing breaks.

**What it's for.** It gets a bookshop owner to start a trial by showing that Shelfmark tells them what to reorder each week.

**Verdict.** This round changed only the widths of the columns. The hero column got wider, and the card and the notes moved a few pixels. The piece does its job about as well as before. The biggest thing still in the way is the same: the card that proves "tells you which titles to reorder" shows stock and sales, but no reorder decision.

**Finding status**
- table-lacks-recommendation: open. The card still has only Title, On shelf and Sold this week at all four viewports. It has no column that states the decision and no line that compares Shelfmark with the till report or spreadsheet the owner uses now.
- till-not-named: open. The first note still says "Works with your till. Sales come in from the shop's card reader as they happen." It names no till at any viewport.
- feature-notes-uneven-widths: open. The notes measure 406, 325 and 325 px wide on desktop and 425, 340 and 340 px on widescreen, so they are not equal. Note 3 starts at x 891 on desktop and x 1220 on widescreen. The card's column text starts at 841 and 1001 on desktop and at 1169 and 1335 on widescreen, so note 3 sits on none of them. Note 2 starts at the card's outer border (518 against 519 on desktop), not at the card's text edge at 537. Widescreen is slightly better, because the middle note now wraps to two lines. On desktop it still wraps to three.

**New problems.** None.

**What would move it most**
1. The card shows stock but not the reorder decision. This is the "Reorder this week" card at all viewports. The headline and the subhead promise that Shelfmark "tells you which titles to reorder". The owner then sees two columns of numbers and has to work out the decision alone. Nothing on the card says how this is better than the till report they already have. To fix it, add a column that states the decision for each title, and one short line that compares Shelfmark with how a shop works now. The maker must supply the column label, its values, and what the comparison says. Defect. Viewports: desktop, phone, tablet, widescreen.

**Smaller things.**
- The first note, "Works with your till", names no till. An owner cannot tell whether their till is supported. Name the tills Shelfmark works with; the maker must supply the list. Viewports: desktop, phone, tablet, widescreen.
- The row of three notes under the hero has unequal widths: 406/325/325 px on desktop and 425/340/340 px on widescreen. The third note lines up with nothing above it, and on desktop the middle note still wraps to three lines. Make the three columns equal, or put notes 2 and 3 on the card's column lines (x 537 and 841 or 1001 on desktop). Viewports: desktop, widescreen.

**What's working.**
- The palette is limited and warm: dark brown text on a cream ground, and one rust accent that only the main button uses. The trial button is the one obvious thing to click.
- The card's sample data is believable bookshop stock with small counts, and it gives a stranger something concrete to read in a few seconds.
- The layout stacks cleanly on the phone and the tablet. The buttons and the card keep their order, and no text is cramped.
