**First read.** The eye lands on the headline "Know what is on your shelves before a customer asks". It goes next to the brown "Start a 30-day trial" button, then over to the "Reorder this week" table, which is the proof that the headline is true. It reads as a calm, plain landing page for a bookshop stock tool, and it feels honest and quiet. On desktop and widescreen, the content stops at about y=530, so the bottom third of the screen is empty and the page feels unfinished. On phone and tablet, the table stacks under the hero and the three fact lines stack below it, so the page reads as one column and the empty space goes away.

**What it's for.** It gets an independent bookshop owner to start a 30-day trial of Shelfmark. This is my assumption, taken from the work order and the primary button.

**Verdict.** The fixes made the type and the phone table tidier, but they did not change what the page tells an owner. The biggest thing still in the way is the "Works with your till" line, which names no till or card reader. An owner cannot tell whether their own till is supported, and that line needs facts that only the maker has.

**Finding status**
- till-line-and-comparison: open. The line still says "Works with your till. Sales come in from the shop's card reader as they happen." It names no tills, and no line compares Shelfmark with what the owner does now. It is the same at all four viewports.
- nothing-follows-nav-links: open. Content still ends at about y=530 of 800 on desktop and y=530 of 1080 on widescreen. Nothing on the page answers the Pricing or "Shops using it" links.
- type-sizes-16-and-14: closed. type_sizes is now 40/20/16/13 on desktop, tablet and widescreen, and 32/20/16/13 on the phone. The smallest gap is 3 px, and the table and date text read as a clear second level.
- tablet-fact-lines-too-wide: open. The measure is met: the lines are 544 px wide, with 66, 69 and 62 characters per line. But "they happen." and "and when." now sit as short last lines. The third line ("and when.") used to fit on one line in the before image.
- phone-table-title-wraps: closed. "Notes from the Ferry" and "The Glass Orchard" each measure 1 line. The column heading "Sold this week" became "Sold", and the card heading "Reorder this week" still gives the week.

**New problems.** On the tablet, the third fact line now wraps and leaves "and when." alone on its last line. Before the fix it was one line.

**What would move it most**
1. The till line names no tills (the "Works with your till" fact line, all viewports). An owner whose till or card reader is not named assumes it is not supported. Nothing on the page tells them why this beats walking the shelves on Monday or reading the till's own sales report. The maker should name the supported tills or card readers, and add one line that compares Shelfmark with what the owner does now. Only the maker has these facts, so do not invent them. Defect. Viewports: desktop, phone, tablet, widescreen.
2. Nothing answers the Pricing and "Shops using it" links (the empty area below the fact lines). The bottom third of the screen is blank on desktop and widescreen, and a visitor who wants to know the price has to click away. Add a short pricing and shops section below the fact lines, with pricing and shop facts that the maker supplies. Taste. Viewports: desktop, widescreen.

**Smaller things.**
- Tablet fact lines: "they happen." and "and when." sit alone on their last lines. Narrow the lines a little more, to about 32em, or let them run to the 600 px width of the table above them so they rebalance. Then check that no line ends with one or two words. Viewports: tablet.

**What's working.**
- The phone table now has five rows of equal height. With "Sold" as the column heading, the Title column has room, and the table reads as one even list.
- At 13 px with muted heading color, the table and date text read as a clear second level under the 16 px body text, and the contrast stays high (15.01:1 for the cells, 7.43:1 for the headings).
- The single brown primary button is still the only strong color on the page. Nothing added in this round competes with it.
