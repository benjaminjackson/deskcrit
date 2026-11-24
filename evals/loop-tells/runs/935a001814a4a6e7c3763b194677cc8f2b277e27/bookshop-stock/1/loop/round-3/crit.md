**First read.** The eye lands on the three-line headline "Know what is on your shelves before a customer asks", drops to the rust "Start a 30-day trial" button, then crosses to the "Reorder this week" table. It reads as a quiet, specific stock tool for an independent bookshop, and it feels calm and trustworthy. The phone stacks it all into one column and the table now sits tidily on even rows. The tablet runs the headline on two lines with the table full width below. Widescreen is the desktop layout centred, with a large empty band under the three feature lines.

**What it's for.** It gets a small-shop owner to start the 30-day trial of Shelfmark (from the work order's crit).

**Verdict.** The fixes tidied the phone table and shortened the tablet lines. But the main problem has not moved: the owner still cannot tell what the trial costs or commits them to, and nothing on the page backs up the promise. Those facts must come from the maker.

**Finding status**
- trial-terms-and-proof: open. No viewport has trial terms under "Start a 30-day trial" or a comparison, a price, or a named shop, and the lower part of the page is still empty.
- tablet-text-measure: open. On the tablet the hero paragraph and feature lines are now capped at 600 px, but they still measure 78 characters per line (hero) and 81 (second feature line), against the target of 75 or less. This is better than 94 and 87.
- phone-table-wrap: closed. On the phone the "On shelf" and "Sold this week" headers and "Notes from the Ferry" each measure 1 line, so all the rows are now the same height.
- table-no-order-quantity: open. The table still has only Title, On shelf, and Sold this week, and the maker has not said whether the product suggests a quantity.

**New problems.**
- Tablet, feature lines: the 600 px cap pushes one word onto the second line of the first two feature lines ("happen." and "take."), so each block ends on a lone word.
- Phone, table: with the narrower cell padding, "Sold this week" now ends about 8 px from the right edge of the card. The text to its left has 12 px or more of space, so this column looks cramped against the edge.

**What would move it most**
1. Trial terms and proof, at the "Start a 30-day trial" button and the empty space under the feature lines. The owner cannot tell whether "30-day trial" means a free month or a first paid month, so the wrong reading can stop the click. The "Pricing" and "Shops using it" links in the nav point to nothing on this page. Put one line of trial terms directly under the button. Then use the empty lower part of the page to compare Shelfmark with how the owner now finds out what to reorder, and add the price or a real shop. Only the maker knows whether the trial is free, whether a card is needed, what happens after day 30, the price, and which shops use it. Defect. Viewports: desktop, phone, tablet, widescreen.

**Smaller things.**
- Tablet, hero paragraph and feature lines: they still measure 78 and 81 characters per line. Bring the cap down to about 560 px so they meet 75 (Bringhurst 2.1.2). Viewports: tablet.
- Tablet, feature lines: the narrower measure should also fix the lone words, because each line will then break earlier. Check that "happen." and "take." no longer sit alone on their own line. Viewports: tablet.
- Reorder table, all viewports: the maker must say whether the product suggests how many copies to order. If it does, add that column. If not, leave the table as it is. Viewports: desktop, phone, tablet, widescreen.
- Phone, "Sold this week" column: give the last cell the same right padding as the left edge of the card (about 12 px). Viewports: phone.

**What's working.**
- The phone table now reads as five even rows at a glance. The owner can scan titles against counts without one tall row breaking the rhythm.
- The table uses plausible titles and small numbers, and the date "Mon 9 June" ties it to the "Monday morning" promise. It shows the product instead of describing it.
- There is one rust primary button against a quiet outlined second button, so the next step is clear at every viewport. The white text on the rust button measures 7.69:1 contrast.
