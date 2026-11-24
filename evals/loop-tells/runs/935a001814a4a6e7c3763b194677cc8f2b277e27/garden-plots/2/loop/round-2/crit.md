**First read.** The eye lands on the serif headline, "Run the waiting list for your garden without the spreadsheet". It then goes to the two dark green plots, 3 and 8, which now say "Free" on the tile, and then down to the green "Add your garden" button. The page reads as a calm, specific tool for allotment gardens. The muted greens and the serif face suit it, and it feels made for this product, not taken from a template. On the phone and the tablet, the plot map stacks under the button, and the feature cards go to one column on the phone and two on the tablet. On widescreen the whole page sits in a centered column with a tall empty band below the cards.

**What it's for.** It gets a garden committee to add their garden to Plotwise, so that the waiting list and plot offers run without a spreadsheet (from the work order's crit).

**Verdict.** The fixes helped a lot. The phone page no longer breaks, the cards read as four separate features, and every viewport holds together. The biggest thing still in the way is the plot map. It now labels the free plots, but it still shows only which plots are free or taken, not the waiting list or the offer to the next person that the headline sells.

**Finding status**
- phone-layout-breaks: closed. The facts file gives a phone page width of 390, nav links 31 px tall on their own row under the wordmark, card text at 41 to 44 characters per line in one column, and no violations.
- plot-map-wrong-idea: open. Plots 3 and 8 now say "Free" on the tile, and the title now states the point ("Elm Row Gardens: plots 3 and 8 are free"), on all four viewports. But the picture still shows only whether each plot is free or taken, with no waiting list and no offer to the next person.
- same-level-text: closed. Card titles are weight 500 in #2f3a2c, against weight 400 in #55604f for the card text, at the same 15 px, with a gap below each title. The section heading now differs by size too (22 px Source Serif 4, against 15 px before). That goes against the "not by size" in the target, but it reads as a real section level and matches the headline's face, so I count it as no harm.
- widescreen-empty-space: closed. Content is capped at 1152 px and centered (x 384 to 1536), and the hero text and plot map now sit about 80 px apart as one unit.
- plot-map-off-grid: closed. The plot map card's left edge is at about x 647 on desktop (x 967 on widescreen), in line with the third feature card column at x 646 (x 966).
- tablet-tiles-and-cards: closed. Every tile is 65 px wide on the tablet, and the card text runs 41 to 44 characters per line in two columns.
- one-word-last-lines: closed. "say yes." and "before rent is due in March." now end on lines of two or more words on desktop, tablet and widescreen.
- examples-or-rules: open. The copy "one reminder before rent is due in March" and "a week to say yes" has not changed, so it still reads as fixed rules.
- generic-section-heading: open. The heading is still "What Plotwise does", and at 22 px serif it is now more prominent than before.

**New problems.** None that are template tells. I checked every added or changed element: the "Free" tile labels, the medium-weight card titles, the larger serif section heading, the new map title, and the moved map card.

**What would move it most**
1. plot-map-wrong-idea: the plot map next to the headline. The viewer sees which plots are free, but nothing shows the step only Plotwise does, offering a free plot to the next person on the waiting list. So the one picture on the page backs up "keeps the plots" and not the headline's promise (Tufte, direct labels, for the part that is now done). Fix direction: show a free plot going to the next person on the list, for example a short waiting list beside the map with plot 3 marked as offered to the first person on it. Use only states and names the product really has, which the maker must supply. Taste. Viewports: desktop, phone, tablet, widescreen.

**Smaller things.**
- The plot map card on desktop and widescreen now ends at x 1106 (x 1426 on widescreen), 110 px short of the right edge that the nav and the cards share at x 1216 (x 1536). The hero's right side looks ragged against the rows above and below it. Fix: widen the card to the content's right edge, or end it on the third card column's right edge (x 925 on desktop). Viewports: desktop, widescreen.
- examples-or-rules: the March reminder and the week to say yes still read as fixed product limits. The maker must say whether they are examples or rules, then mark them that way in the card copy. Viewports: desktop, phone, tablet, widescreen.
- generic-section-heading: "What Plotwise does" could head any product's page, and its new size draws more attention to it. Fix: reword it, using words already on the page, so it names what the four cards hold. Viewports: desktop, phone, tablet, widescreen.

**What's working.**
- The phone layout, with the nav on its own row, the map under the button, and one column of cards, now reads top to bottom with no sideways scrolling.
- The "Free" labels on plots 3 and 8, together with a title that states the point, mean a viewer no longer has to find the legend to read the map.
- The card titles are set apart by weight and color, not size, so the four features scan as four, and the type stays at a small set of sizes.
