**First read.** The eye lands on the big serif headline, "Hire a narrowboat for a week on the canal", and then reads down the intro. It then goes across to the filled green Search button at the bottom of the form, and last to the short list of routes under the intro. The page reads as a calm, plain booking page for a small boatyard. It is honest and easy to use, but it has no picture, so the words have to make the trip appealing on their own. On the phone and the tablet the page is one column in this order: headline, intro, form, routes. On widescreen it is the same layout as desktop, centred in a column about 992 px wide.

**What it's for.** It gets a visitor to pick a base, dates and party size and search for a narrowboat to hire. This is from the work order's crit.

**Verdict.** The fixes closed the problems that blocked the task: the page now fits the phone, there is one clear Search button, the headline leads, and the routes sit straight under the intro. The biggest thing still in the way is that nothing shows the boats or the canal, so nothing makes the trip look worth wanting.

**Finding status**
- phone-layout-no-reflow: open on the measured check, but the visible problem is fixed. The page width is now 390 (it was 587), the page is one column in the required order, the h1 is 2 lines, and each route's nights and locks stay on one line. The intro measures 34.2 characters per line against the check's 45. At 20 px type in a 342 px column, 45 cannot be reached without making the text smaller.
- headline-weak-no-picture: open. The headline part passes: h1 is 40 px on desktop and 32 px on phone and tablet against the 20 px intro, its contrast is 12.75:1, and there are 4 type sizes (40 or 32, 20, 16, 14). But there is still no photo of the boats or the canal in any viewport.
- two-buttons-one-task: closed. The hero button is gone, and Search is the only filled primary control (7.43:1) in all four viewports.
- wide-layout-two-edges-and-hole: closed. The routes heading top is at y 389, above the form's bottom edge at about 574, on desktop and widescreen. On widescreen the content runs from x 464 to 1456, about 992 px, so the columns sit on one centred grid.
- route-figures-contrast: closed. The nights-and-locks text is 5.73:1 in all four viewports.
- tablet-intro-narrow-widow: closed. The intro is 74.5 characters per line over 3 lines, and the last line is "and no fee on top of the hire." with no single word on its own.
- input-borders-faint: closed (judged by eye; borders are not measured). The input and select borders look clearly darker than before and stand out from the white card in every viewport.
- nav-no-current-page: open. No nav item has a cue in any viewport. This is the home page, which has no nav item, so this page cannot show the cue.
- berths-label-word: closed. The label now says "People" and the value says "4 people" in all four viewports.

**New problems.** None.

**What would move it most**
1. No picture of the trip. This is at the hero, beside or under the headline, in all viewports. The headline now leads, but the visitor gets only text and form fields, with nothing that shows a narrowboat, a lock or the water. That is what makes someone want a week on the canal (Dair, chapters 8 and 9, on picture and word working together). Fix: put a real photo of the boats or the canal into the hero and place it so it works with the headline. For example, it could fill the space under the routes on desktop and sit between the intro and the form on the phone. The maker must supply the photo. Kind: convention. Viewports: desktop, phone, tablet, widescreen.

**Smaller things.**
- Phone intro width: the intro is 34 characters per line at 20 px. That reads well on a phone, but it fails the work order's check of 45. Either accept 34 for the phone, or set the intro at 18 px there, which gives about 38 characters per line and still does not reach 45. Viewports: phone.
- Nav current-page cue: when the nav appears on the Boats, Routes, Bases and booking pages, give the current item one cue, such as weight or an underline. You can only check this on those pages. Viewports: desktop, phone, tablet, widescreen.

**What's working.**
- The single filled Search button at the end of the form. The page now has one obvious next step, and it uses what the visitor entered.
- The serif headline (Source Serif 4, 40 px) against the Inter body text. It ties to the serif logo and gives the page a quiet, unhurried voice that suits canal holidays.
- The stacked phone layout. The nav fits on one line under the logo, and the form comes straight after the intro, so a phone visitor reaches it without scrolling sideways.
