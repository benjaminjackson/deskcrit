**First read.** On desktop the eye lands on the large three-line headline, drops to the dark red "Start a 30-day trial" button, then jumps right to the "Reorder this week" card. The page reads as a calm, plain stock tool for an independent bookshop. Warm off-white, one accent colour, no decoration. The card on the right now looks narrow and cramped next to a wide empty band of about 270 px between the hero text and the card. Its column headings break onto two lines ("On / shelf", "Sold this / week"), and three of the five titles wrap. Widescreen shows the same thing. On tablet and phone the card sits under the hero at full width and reads cleanly, and on the phone the three nav links now spread across the full width under the logo row.

**What it's for.** A landing page that persuades an independent bookshop owner to start a Shelfmark trial, because it tells them what to reorder each week (from the work order's crit).

**Verdict.** The fixes closed the three layout findings: the phone page no longer scrolls sideways, the feature notes are even, and the tablet line is shorter. The biggest thing still in the way is the same as before. The table still does not show the reorder decision that the headline promises. The fix for the feature notes also squeezed that table on desktop and widescreen, so it is now harder to scan.

**Finding status**
- table-lacks-recommendation: open. The table still has only Title, On shelf and Sold this week at all four viewports, with no decision column. The page still has no comparison with how a shop works now.
- phone-header-sideways-scroll: closed. The measured phone page_width is 390, and a.nav-signin runs from x 280 to 370, inside the 20 px margin.
- feature-notes-uneven-widths: closed. The three notes measure 341 px wide and 2 lines each on desktop (at x 64, 469 and 875), and 357 px wide and 2 lines each on widescreen.
- tablet-line-length: closed. The second note on tablet measures 69 characters per line.
- till-not-named: open. The first note still says "Works with your till" and names no till at any viewport.

**New problems.**
- Desktop and widescreen: the table card is now only about 340 px wide (x 876 to 1215 on desktop) so that it lines up with the third note. The headings "On shelf" and "Sold this week" now break onto two lines. "A Year of Hedges", "Notes from the Ferry" and "The Glass Orchard" wrap on desktop, so rows are 41 px or 62 px tall. Meanwhile about 270 px of empty space sits between the hero text (which ends at x 604) and the card.
- Desktop: the headline top (y 197) no longer lines up with the card top (y 145). The hero text now centres against the taller card, so the two columns start at different heights.

**What would move it most**
1. The table does not show the reorder decision. In the "Reorder this week" card at every viewport, the owner still has to compare On shelf with Sold this week for each title and decide for themselves, though the headline says Shelfmark "tells you which titles to reorder". Nothing compares Shelfmark with the till report or spreadsheet they use now. Add a column that states the reorder decision for each title, and a short comparison with how a shop works now. The maker must supply the column label, its values, and what the comparison says. Defect. Viewports: desktop, phone, tablet, widescreen.
2. The table card is squeezed on wide screens. On desktop and widescreen the card that proves the product now wraps its column headings onto two lines and wraps three titles, so rows have uneven heights and the five-row list takes longer to scan. Empty space wider than the card's own Title column sits to its left. Let the card start further left so that it covers the second and third note columns (desktop x 469 to 1215), keep the notes on their equal columns, and let the headings and titles fit on one line. Defect. Viewports: desktop, widescreen.

**Smaller things.**
- The first feature note still says "Works with your till" without naming one. Name the tills Shelfmark works with; the maker must supply the list. Viewports: desktop, phone, tablet, widescreen.
- The headline and the card no longer share a top edge. Align the headline top with the card top (y 145), or bring the card down to the headline. Viewports: desktop, widescreen.

**What's working.**
- The phone header now fits the 390 px screen. Sign in sits inside the margin, and the nav row reads as its own line under the logo.
- The three feature notes now sit on one even set of columns with equal two-line wraps, and the third note lines up with the card's left edge, so the lower row reads as one band.
- The tight palette still holds. There is one dark red accent on the primary button, and every text contrast measures 7.3:1 or higher.
