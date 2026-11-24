**First read.** The eye lands on the three-line headline "Know what is on your shelves before a customer asks". It drops to the rust "Start a 30-day trial" button, then crosses to the "Reorder this week" table, where the zeros in "On shelf" back up the claim. The page reads as a quiet, specific tool for an independent bookshop, warm and plain. On tablet and phone the table stacks under the buttons and the three facts become a list, so the order of reading stays the same; on widescreen the page sits in a centered column with the same layout as desktop.

**What it's for.** It gets the owner of an independent bookshop to start a 30-day trial of Shelfmark.

**Verdict.** The fixes worked: the page now reflows, the trial is clearly the main action, and the widescreen layout holds together. The biggest thing still in the way is that the page stops after the three facts. Nothing shows how the owner's week changes compared with what they do now, and the trial is not asked for a second time.

**Finding status**
- no-reflow-phone-tablet: closed. page_width is 390 on phone and 768 on tablet, so nothing scrolls sideways. The phone h1 is 3 lines at 32 px and the trial button sits on one line.
- signin-outranks-trial: closed. On all four viewports "Start a 30-day trial" is the only filled button (#8a3b24, white text at 7.69:1), and "Sign in" is a text link in the nav. The outline of "See how it works" looks dark enough.
- ask-has-no-comparison: open. After the three facts, the page still has no comparison with what the owner uses now and no second trial ask. The bottom third of desktop and the bottom half of widescreen are still empty.
- widescreen-hero-gap: closed. The content now runs from x 384 to 1536, the gap between the paragraph and the table is about 130 px, and the facts measure 45 characters per line.
- table-gray-contrast: closed. The "Mon 9 June" date and the table headers measure 5.62:1 on all four viewports.
- too-many-type-sizes: closed. There are 4 sizes on every viewport (40 or 32, 20, 16, 14), and the body is 16 px, the same as the nav.
- headline-runt: closed. On desktop and widescreen the last line is "a customer asks".
- table-rows-unsorted: closed. The rows now go from 0 on shelf to 2 on shelf, and within the same shelf count, from most sold to least, so the order reads as how urgent the reorder is.
- no-order-quantity-column: open. The table still has only Title, On shelf, and Sold this week.
- table-edge-off-grid: open. On desktop the table's left edge is still at x 737, and the fact columns start at x 64, 461, and 859.
- your-vs-the-shops: closed. The first fact now says "Sales come in from your card reader".

**New problems.** At tablet, the hero text stops at 540 px wide, the facts at 600 px, and the table runs the full 702 px. That gives three right edges, and the second fact runs at 81 characters per line. At phone, the table headers wrap to "On / shelf" and "Sold this / week", and "Notes from the / Ferry" breaks over two lines.

**What would move it most**
1. No comparison and no second ask: the whole page, after the three facts. The owner reads three short facts and then meets empty space, with nothing to show how their Monday is different from what they do now and no trial button where they finish reading. Direction: add a short comparison with the owner's current way of knowing their stock, in words and facts that only the maker can supply (what owners use today and what it costs them), then repeat "Start a 30-day trial" under it. Taste. Viewports: desktop, phone, tablet, widescreen.

**Smaller things.**
- The table has no column for how many copies to order. If Shelfmark suggests a quantity, add that column, with figures the maker supplies. Viewports: desktop, phone, tablet, widescreen.
- The table's left edge at x 737 lines up with none of the fact columns. Align it with the middle or the third fact column. Viewports: desktop.
- At tablet, the hero text, the facts, and the table end at three different right edges, and the second fact runs at 81 characters per line. Give the facts and the hero text one shared width, or let the table share their width. Viewports: tablet.
- At phone, the "On shelf" and "Sold this week" headers and "Notes from the Ferry" wrap to two lines. Shorten the headers to fit, or give the title column more room. Viewports: phone.

**What's working.**
- The only filled color on the page is the rust trial button, so the main action is found at once on every viewport.
- The table's numbers are now right-aligned, and the rows are sorted by how urgent the reorder is, so the example reads as the product's own judgment and not as a made-up list.
- The phone layout stacks in reading order (headline, promise, ask, proof, facts) with no horizontal scroll.
