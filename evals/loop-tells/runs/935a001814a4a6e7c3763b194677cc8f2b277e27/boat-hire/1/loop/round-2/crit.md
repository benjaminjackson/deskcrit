**First read.** The eye lands first on the large serif headline, "Hire a narrowboat for a week on the canal". It then drops to the lead paragraph and crosses to the one filled green button, Search, at the foot of the "Find a boat" card. The page reads as a calm, plain booking page for a small business: headline and pitch on the left, the form on the right, routes below. It feels quiet and trustworthy, though a little bare. On the phone and the tablet the page is one column in this order: headline, lead, the "See boats and dates" link, the card, then the routes. On widescreen the same desktop block sits centered.

**What it's for.** It gets a visitor to pick a base, dates and party size and search for a narrowboat to hire, booked direct with the boatyard (from the work order's crit).

**Verdict.** The fixes worked. The page reflows on the phone, the headline now leads, there is one primary action, and the layout holds together at every width. The biggest thing still in the way is that nothing shows what a week on the boat looks like, and only the maker can fix that.

**Finding status**
- phone-layout-no-reflow: closed. The phone page is 390 px wide in a 390 px viewport, and the lead runs 39.5 characters per line on the phone and 63.5 on the tablet, everything in one column.
- headline-quietest-text: open. The h1 is now clearly the headline at 40 px (32 px on the phone), against a 20 px lead and a 16 px nav. But it is still weight 400, and its contrast (12.75:1) equals the lead's instead of beating it, so the measured check fails on weight and contrast. By eye the headline leads anyway.
- two-calls-to-action: closed. "See boats and dates" is now an underlined text link, and Search is the only filled button, at every viewport.
- page-in-three-pieces: closed. On desktop the gap from the hero link to the routes heading is 45 px (link ends at y 373, h2 starts at y 418), close to the other gaps. On widescreen the card's text starts at x 1139, 87 px from the lead's right edge at x 1052.
- no-picture-of-boat: open. There is still no picture at any viewport.
- faint-gray-text: closed. The h1 measures 12.75:1 and the route details 5.56:1 at every viewport.
- nav-no-current-page: open. No nav item has a cue for the current page.
- pale-field-borders: closed. Not measured. The field borders now look a mid gray that reads clearly as an edge on white, at every viewport.
- start-date-text-field: open. "Start date" still shows "Sat 14 June" as plain text, with no year and no picker icon.
- phone-search-out-of-reach: closed. On the phone the card starts at x 43, and "Find a boat" is at y 470, just after the lead and the one-line "See boats and dates" link.

**New problems.** None.

**What would move it most**
1. No picture of a boat or the canal. This applies to the whole page at every viewport, and above all the hero. The copy makes a good factual case: four bases, booking direct, no fee on top. But nothing shows the visitor a boat, a lock or a towpath, so nothing makes them want to go, and the page reads as a form with a headline. Set real photos of the actual boats or routes into the hero. On desktop and widescreen, use the empty band below the routes, or put a photo beside or behind the headline. The maker must supply the photos. Do not use stock images. Taste. Viewports: desktop, phone, tablet, widescreen.

**Smaller things.**
- The h1 is still weight 400 and the same color as the lead. If the check must pass as written, a semibold weight of the serif would give the headline the extra step. Viewports: desktop, phone, tablet, widescreen.
- The "Start date" field shows "Sat 14 June", with no year and no picker. Use a date input that shows the year. Viewports: desktop, phone, tablet, widescreen.
- The nav does not mark the current page. Give the active item one cue, such as an underline or a heavier weight. Viewports: desktop, phone, tablet, widescreen.
- On the tablet the content column ends at x 664, but the nav ends at x 704. Let the column fill to the same right margin, or align the nav with the column. Viewports: tablet.

**What's working.**
- The single filled Search button at the foot of the card is now the one clear action on the page. The hero link stays quiet and does not compete.
- The serif headline against the Inter body gives the page a calm, crafted voice that suits slow canal holidays, and the lead now has a comfortable 60 to 64 characters per line on the larger screens.
- The phone order (pitch, then the form, then the routes) follows the visitor's path through the decision.
