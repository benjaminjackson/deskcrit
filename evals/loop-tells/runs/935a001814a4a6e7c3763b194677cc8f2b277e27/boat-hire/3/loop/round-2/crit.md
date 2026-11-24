**First read.** The eye lands first on the serif headline, "Hire a narrowboat direct from the boatyard that keeps it". It moves down to the intro, and then right to the filled teal Search button, which is now the only strong color on the page. The page reads as a calm, plain booking page for a small boatyard, with the offer and the form side by side as one group. It feels honest and quiet, but it has no picture, so it gives the viewer nothing to look forward to. On the tablet and the phone, the same order stacks into one column: headline, intro, link, form, routes. On the widescreen, the same 1024 px group sits centered.

**What it's for.** It gets a visitor to search for a narrowboat and book it direct from the boatyard (from the work order's crit).

**Verdict.** The fixes helped a lot. The phone layout now reflows, the headline leads, there is one primary action, and the text and the form sit together at every width. The biggest things still in the way are two facts that only the boatyard can supply: a price to back "no fee on top of the hire", and a real photo of the boats or the water.

**Finding status**
- phone-layout-no-reflow: closed. On the phone, page_width is 390 and p.lead has 35 characters per line. The nav fits on one row and the whole form is on screen in one column.
- headline-weakest-text: closed. The h1 is 40 px (32 px on the phone), set in the logo's serif, color #26302f with 12.75:1 contrast. The lead is 20 px, the logo is 24 px, and the nav is 16 px, at all four viewports.
- duplicate-primary-buttons: closed. Search is now the one filled button. The hero button is gone and an underlined text link "See boats and dates" replaces it.
- copy-buries-direct-booking: open. The direct-booking point is now in the headline and "for a week" is gone. But the page still shows no price or other boatyard fact to back "no fee on top of the hire".
- wide-screen-gap: closed. On widescreen, the text ends at x 1048 and the form starts at x 1133, so they read as one group. The dead band above the routes is gone on desktop and widescreen: the routes start about 50 px under the link.
- no-picture-of-the-holiday: open. The page still has no photo of a boat or a route.
- low-contrast-gray-text: closed. The route details measure 5.32:1 and the h1 measures 12.75:1 at all viewports.
- pale-form-field-borders: closed (judged by eye). The field borders are now a mid gray-green that clearly outlines each field on white, and they look 3:1 or more.
- tablet-short-intro-lines: closed. On the tablet, p.lead has 62 characters per line, and its last line is "days, and book it here.", not one word.
- phone-route-number-unit-break: closed. Each route detail on the phone stays on one line, for example "4 nights, 12 locks".
- date-field-looks-like-free-text: open. The start date is still a plain field that holds "Sat 14 June", with no date-picker cue.

**New problems.** None. No changed element is a template tell. I checked the serif h1 at weight 400, the filled Search button, the underlined text link, and the darker borders. The page uses five type sizes (40, 24, 20, 16, 14).

**What would move it most**
1. The no-fee claim has no number behind it (copy-buries-direct-booking, the remaining part). Location: the intro under the headline. The visitor reads "no fee on top of the hire" but sees no price to judge it against, so they must take it on trust. The fix: show a fact that proves the claim, such as a from-price per week for a boat at this base, near the intro or the form. The boatyard must supply the figure. Defect. Viewports: desktop, phone, tablet, widescreen.
2. A holiday page with no picture of the holiday (no-picture-of-the-holiday). Location: the hero. People hire a narrowboat for the boat and the water, and the page shows neither, so the page sells a form instead of a trip. The fix: add a real photo of the boatyard's own boats or a stretch of one of the listed routes, not a stock picture. The boatyard must supply the photo. Taste. Viewports: desktop, phone, tablet, widescreen.

**Smaller things.**
- Start-date field: it still looks like free text. Give it a date-input or calendar cue so the visitor knows to pick a date (Nielsen heuristic 5). Viewports: desktop, phone, tablet, widescreen.
- "See boats and dates" link: it still leads to the same place as Search. On the phone it sits above the form and is the first action the visitor reaches. Give it a clearly different job, such as browsing all boats, or remove it. Viewports: phone, tablet, desktop, widescreen.
- Tablet: the content column ends at x 664, but the nav ends at x 704. Let the content take the header's full width so the right edges line up, which also shortens the very wide 554 px form fields. Viewports: tablet.

**What's working.**
- The serif headline matches the logo and now clearly leads. It gives the page a quiet, crafted voice that suits a family boatyard.
- One filled teal Search button is now the only strong color, so the booking action is impossible to miss.
- The route list is set with each name on the left and its nights and locks right-aligned. It scans quickly, and on wide screens it ends at the same height as the form card.
