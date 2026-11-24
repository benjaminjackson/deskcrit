**First read.** The eye lands on the headline "Know what is on your shelves before a customer asks". It then drops to the rust "Start a 30-day trial" button and crosses to the "Reorder this week" table. The page reads as a calm, plain product page for an independent bookshop's stock tool: warm off-white, one rust accent, and a real-looking table as proof. On tablet and phone everything stacks in one column in a sensible order: headline, paragraph, buttons, table, then the three fact lines. Nothing scrolls sideways.

**What it's for.** It gets an independent bookshop owner to start a 30-day trial of Shelfmark, the stock-counting and reorder tool.

**Verdict.** The fixes worked. The page now reflows on narrow screens, the trial is the one strong button, and the hero holds together on widescreen. What still stands between the page and a sign-up is copy only the maker can supply: which tills it works with, how it compares with the owner's Monday routine, and a section that answers the Pricing and "Shops using it" links.

**Finding status**
- no-reflow-narrow-screens: closed. page_width is 390 on the phone and 768 on the tablet, and the phone h1 is 3 lines at 18 characters per line. The content is in one column and each button is on one line.
- sign-in-outshouts-trial: closed. In all viewports, Sign in is a plain nav link (weight 500, #2a2622), and "Start a 30-day trial" is the only filled button (white on #8a3b24, 7.69:1).
- copy-misses-fit-for-this-shop: open. The returns line now has a verb and speaks to the owner ("Tracks your returns. You see which unsold copies are due back, and when."). The till line still names no tills or card readers, and the page still has no comparison with what the owner does now.
- widescreen-hero-gap: closed. The h1 right edge is at x=984 and the table text starts at x=1075, about 91 px apart, inside the check's 200 px. The content is capped at 384 to 1536.
- faint-table-headers: closed. The headers and "Mon 9 June" measure 7.43:1, and violations is empty in all viewports.
- too-many-close-type-sizes: open, but only just. type_sizes is now 40 (32 on phone), 20, 16, 14, which meets the target of one body size and one small size. But 16 and 14 are exactly 2 px apart, which the "within 2 px" check catches.
- headline-lone-word: closed. On desktop and widescreen the headline is 2 lines and breaks after "shelves", so "before a customer asks" stays together.
- fact-lines-too-long: closed. On widescreen the fact lines are 41 to 45 characters per line, and "take." is no longer alone on its line.
- empty-bottom-third: open. On desktop and widescreen the content still ends at about y=537, and nothing answers the Pricing or "Shops using it" links.

**New problems.** None. The fixes added no new element: the Sign in change removed a filled button, and the copy change added no made-up facts.

**What would move it most**
1. The till line and the missing comparison. Location: the "Works with your till" fact line and the page as a whole. An owner whose till or card reader is not named will assume it is not supported, and nothing tells them how Shelfmark beats walking the shelves on Monday or reading the till's own sales report. Fix: the maker names the supported tills or card readers, and adds one line that compares Shelfmark with the owner's current routine. The maker must supply both facts. Defect. Viewports: desktop, phone, tablet, widescreen.
2. Nothing follows up the nav links. Location: the empty area below the fact lines. The bottom third of the desktop screen is blank, and a visitor who wonders about price or about other shops has to click away to find out. Fix: add a short pricing and shops section below the fact lines, using pricing and shop facts that the maker supplies. Taste. Viewports: desktop, widescreen.

**Smaller things.**
- Type sizes 16 and 14 px: keep 16 for body, and either take the table and date text down to 13 px or put it at 16 and set it apart by color, so the two levels read as clearly different. Viewports: desktop, phone, tablet, widescreen.
- Tablet fact lines: the second line runs 76 characters across 600 px, and "they happen." and "they take." sit as short last lines. Cap the width of the fact lines at about 34em on tablet. Viewports: tablet.
- Phone table: "Notes from the Ferry" and "The Glass Orchard" wrap to two lines. Give the Title column more width, for example by shortening "Sold this week" to "Sold" with the week shown in the table heading. Viewports: phone.

**What's working.**
- One rust accent, used only on the trial button. The call to action is clear at once in every viewport.
- The "Reorder this week" table with real-looking titles is concrete proof of what the product does. It is far better than a stock illustration.
- The phone stack order (headline, paragraph, trial, secondary button, table, fact lines) follows the reading order of the desktop layout. Nothing is lost or reordered.
