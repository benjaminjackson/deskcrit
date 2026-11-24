**First read.** At every viewport the eye lands first on the three-line headline "Know what is on your shelves before a customer asks". It goes next to the rust "Start a 30-day trial" button and then across to the "Reorder this week" card. The page reads as a quiet, honest product page for an independent bookshop, with warm paper colors and no decoration. On desktop and widescreen, though, it stops after the three feature lines and leaves the lower 40 percent of the screen empty, so it ends before it has made its case. On the tablet the headline now breaks into three lines, as on desktop, and the text column is narrower than the table. The phone is the same single column as before.

**What it's for.** To get a bookshop owner to start the 30-day trial of Shelfmark. (This comes from the work order's crit.)

**Verdict.** This round changed only the tablet text width, and the tablet reads a little better. The biggest problem is the same as before: the page does not say what the trial costs or commits the owner to, and nothing under the feature lines backs up the promise.

**Finding status**
- trial-terms-and-proof: open. At all four viewports there is still no line of trial terms under "Start a 30-day trial", no comparison, no price and no named shop, and the lower part of the page is still empty.
- tablet-text-measure: open. On the tablet the hero paragraph now measures 74 characters per line (it was 78), which meets the target. The second feature line, "Orders from your distributor…", measures 76 (it was 81), which is still 1 over the target of 75.
- tablet-lone-words: closed. On the tablet the first two feature lines now end on "they happen." and "they take.", so no word sits alone on its line.
- table-no-order-quantity: open. The table still has three columns (Title, On shelf, Sold this week) at every viewport, and nothing on the page or in the inputs says that the maker has confirmed the product does not suggest an order quantity.
- phone-sold-column-padding: open. The before and after crops are the same: "Sold this week" still ends about 8 px from the right edge of the card. The measured cell box is [254, 607, 116, 40], so it runs past the card's inner edge at 366 px.

**New problems.** None. The three-line headline on the tablet is the narrower width cap working as intended. It matches desktop and does not crowd the buttons.

**What would move it most**
1. Trial terms and proof (trial-terms-and-proof). Under the "Start a 30-day trial" button and in the empty space below the feature lines, at every viewport, the owner still cannot tell whether "30-day trial" means a free month or a first paid month. "Pricing" and "Shops using it" in the nav link to nothing on this page. Put one line of trial terms directly under the button. Use the empty space for a comparison with how the owner now decides what to reorder, and add the price or a real shop. The maker must supply every one of these facts: whether the trial is free, whether a card is needed, what happens after day 30, the price, and which shops use it. Defect. Viewports: desktop, phone, tablet, widescreen.

**Smaller things.**
- Tablet second feature line (tablet-text-measure): it is at 76 characters per line. Bring the width cap down a little more, from 560 px to about 550 px, so it meets 75 (Bringhurst 2.1.2). Viewports: tablet.
- Phone table, "Sold this week" column (phone-sold-column-padding): give the last cell about 12 px of right padding so that it matches the left edge of the card. Viewports: phone.
- Reorder table (table-no-order-quantity): the maker must say whether the product suggests how many copies to order. If it does, add that column. If it does not, leave the table as it is. Viewports: desktop, phone, tablet, widescreen.

**What's working.**
- The "Reorder this week" card shows real-looking work, a dated list of titles with stock and sales. It tells the owner what the product does faster than any feature line could.
- There is one strong action color: only the trial button uses the rust fill, so the next step is never in doubt.
- On the tablet the hero text is now a comfortable reading width, and the three-line headline matches desktop.
