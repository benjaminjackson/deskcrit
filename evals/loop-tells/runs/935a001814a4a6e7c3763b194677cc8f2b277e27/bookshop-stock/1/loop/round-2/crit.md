**First read.** On desktop the eye lands on the three-line headline, "Know what is on your shelves before a customer asks". It drops to the filled rust "Start a 30-day trial" button, then crosses right to the "Reorder this week" table. It reads as a calm, plain product page for a bookshop owner, with one clear action. At the other viewports the page now stacks into one column on the phone and tablet, and on widescreen it is the desktop layout centered with wide margins. The bottom third of every viewport is still empty.

**What it's for.** It gets an independent bookshop owner to start a trial of Shelfmark, a tool that tracks stock and says what to reorder.

**Verdict.** The fixes worked. The page now reflows, there is one clear primary action, the widescreen layout holds together, and the type is in order. The biggest thing still in the way is the ask itself. The owner still cannot tell what the 30-day trial commits them to, and nothing on the page compares Shelfmark with how they work now or shows a price or a named shop.

**Finding status**
- no-reflow-phone-tablet: closed. page_width is 390 on the phone and 768 on the tablet, the same as each viewport. The h1 runs 17 characters per line on the phone and 28 on the tablet (it was 6.8). The page stacks headline, paragraph, buttons, table and features at full width.
- sign-in-outranks-trial: closed. In all four viewports "Start a 30-day trial" is the only filled button: white on rust #8a3b24, weight 500. "Sign in" is now a plain dark nav link.
- trial-terms-and-proof: open. The button still says only "Start a 30-day trial", with no terms under it. There is still no comparison with the owner's current method, and no price or named shop, in any viewport.
- widescreen-hero-split: closed. The content is capped at 1152 px and centered (x 384 to 1536), so the table sits beside the text as it does on desktop. The gap from the text to the table is about 133 px, the same as on desktop. The feature lines run 43 to 45 characters per line (they were 79 to 81).
- table-header-contrast: closed. The table headers and "Mon 9 June" measure 7.43:1 in all four viewports.
- three-near-type-sizes: closed. type_sizes are 40 (32 on the phone), 20, 16 and 14 in every viewport, with no two sizes 1 px apart.
- headline-runt-asks: closed. On desktop and widescreen the headline breaks as "Know what is on / your shelves before / a customer asks". The phone keeps the same break.
- table-no-order-quantity: open. The table still has only the Title, On shelf and Sold this week columns, and the maker has not said whether the product suggests an order quantity.

**New problems.**
- Tablet: the hero paragraph now runs 94 characters per line, and the three feature lines run 79, 87 and 59. This happened because the one-column stack spreads them across the full 720 px width.
- Phone: the narrow table wraps "On / shelf", "Sold this / week" and "Notes from the / Ferry" onto two lines each. This makes the header row and that body row uneven in height.

**What would move it most**
1. Trial terms and proof (trial-terms-and-proof), at the trial button and in the empty space below the features, all viewports. A small-shop owner can read "30-day trial" as a free month or as a first paid month, and the wrong reading stops the click. Nothing backs up the promise, and the "Pricing" and "Shops using it" nav items point to nothing on the page. Fix: put the trial terms in one line directly under the button, then use the empty lower part of the page for a comparison with the owner's current way of knowing what to reorder, plus the price or a named shop. Only the maker has these facts: whether the trial is free or paid, whether a card is needed, what happens after day 30, the price, and a real shop. Defect. Viewports: desktop, phone, tablet, widescreen.

**Smaller things.**
- Tablet hero paragraph and feature lines run past 75 characters per line. Cap the text measure at about 600 px, or give the paragraph a max-width, while the table stays at full width (Bringhurst 2.1.2). Viewports: tablet.
- Phone table headers and one title wrap onto two lines. Shorten the headers on narrow screens ("Sold this week" could become "Sold") or narrow the cell padding, so each row stays one line. This is taste. Viewports: phone.
- The reorder table has no order-quantity column. If the product suggests a quantity, show it. If it does not, the maker should confirm that and the table stays as it is. This is common sense, not a published rule. Viewports: desktop, phone, tablet, widescreen.

**What's working.**
- One filled rust button against a quiet outlined secondary button and a plain "Sign in" link gives the page a single, unmistakable action, which is what a landing page needs (Material Design 3, Buttons).
- The phone stack is in a good order: headline, promise, action, then the table as proof, then the features. The owner meets the evidence right after the ask, with no sideways scrolling.
- The "Reorder this week" table, with real-looking titles and plain numbers, shows the product doing its job instead of describing it. It is still the strongest thing on the page.
