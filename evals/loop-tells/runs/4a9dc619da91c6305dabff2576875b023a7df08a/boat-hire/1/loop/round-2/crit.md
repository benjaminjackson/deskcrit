**First read.** The eye lands on the large serif headline, "Hire a narrowboat for a week on the canal". It then drops to the lead and goes across to the one filled green Search button in the white card. The page reads as a plain, calm booking page from a small boatyard. It feels tidy and believable, but bare: there is nothing to look at, and on desktop and widescreen the bottom third of the screen is empty. On phone and tablet it is one column (headline, lead, link, form, routes), and the phone nav sits in one row under the logo.

**What it's for.** It gets a visitor to search for a narrowboat to hire directly from the boatyard, with no agency fee. This comes from the work order.

**Verdict.** The fixes worked. The phone layout fits the screen, the headline leads, there is one primary button, and the content now sits in one width cap. The biggest thing still in the way is that the page sells a holiday on the water but shows no boat or canal.

**Finding status**
- phone-layout-overflow: closed. The phone page is 390 px wide (measured), the lead runs 42.8 characters per line over 5 lines, everything is in one column, and the four nav links fit in one row under the logo.
- weak-headline-buried-reason: closed. The h1 is 44 px on desktop, tablet and widescreen and 32 px on the phone, against an 18 px lead (17 px on the phone). It is #1c2625 at 14.57:1, which is darker than the body color #26302f that the check named, so it meets the target of "largest and darkest". The lead now opens with "Book it here with the boatyard that keeps it. No agency in the middle, and no fee on top of the hire."
- two-competing-primary-buttons: closed. "Search" is the only filled button at every viewport, and "See boats and dates" is now an underlined text link.
- no-image-of-boats-or-water: open. There is still no boat, lock or canal at any viewport. Desktop has about 190 px of empty space under the content, and widescreen has about 470 px.
- wide-screen-split-halves: closed. On widescreen the content sits between x 448 and 1472, and the form card is about 85 px from the text column. The routes moved up under the link, at y 445 to 605, beside the Base field.
- low-contrast-gray-text: closed. The h1 measures 14.57:1 and the route figures 5.73:1 at all viewports.
- phone-route-figures-split: closed. Each route figure is on one line on the phone (measured). Only the route name "Up to Ashcombe and back" still wraps to two lines.
- tablet-narrow-lead: closed. The tablet lead runs 71.5 characters per line over 3 lines, and the last line is "choose a route that fits your days."
- pale-form-borders: closed (looks). The field borders are now a darker gray-green and are clearly visible on the white card. The facts file does not measure border contrast.
- start-date-no-year: open. The field still shows "Sat 14 June" with no year and no sign of a date picker.

**New problems.** None.

**What would move it most**
1. No image of the boats or the water. The visitor is booking a week on a canal but sees only text and form fields, so the copy has to carry the whole feeling of the trip. On desktop and widescreen there is now a band of empty space below the content where an image could go. Add one specific photo of this company's boats or a route, sized so the form stays where it is. The maker must supply the photo. Taste. Viewports: desktop, phone, tablet, widescreen.

**Smaller things.**
- Start date field: show the year ("Sat 14 June 2027" or whatever the real year is) or a calendar icon, so a visitor knows which June they are booking. Viewports: desktop, phone, tablet, widescreen.
- Tablet routes list: its rules end at x 688, but the form card and nav above end at x 720. Make the routes list as wide as the card so the right edges line up. Viewports: tablet.

**What's working.**
- The headline is a real serif display line with a clear step down to the lead, and "no agency, no fee" now comes in the first two sentences. The reason to book here is the second thing a visitor reads.
- One filled button: Search is now clearly the action, and the old hero button became a quiet text link that does not compete with it.
- The phone layout is one column that a visitor scrolls straight down: headline, lead, form, routes. No sideways panning.
