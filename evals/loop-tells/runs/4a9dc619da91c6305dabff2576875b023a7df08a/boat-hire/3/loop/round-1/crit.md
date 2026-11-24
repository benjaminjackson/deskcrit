**First read.** The eye lands first on the dark green "See boats and dates" button, because it is the only strong color on the page. Next it goes to the body paragraph, which is darker than the gray headline above it and almost as large, so the headline reads as a quiet lead-in and not as a title. The "Find a boat" card on the right is the second place to look. The page reads as a calm, plain booking site for canal holidays. It feels honest but bare, because nothing shows a boat or water. On the phone, the eye lands on a broken header: the four navigation links stack in a ragged column beside the logo, and the page runs off the right edge of the screen.

**What it's for.** It is the home page of a narrowboat hire company that takes bookings direct. Its job is to get a visitor to search for a boat and dates.

**Verdict.** It does not do its job yet. On the phone the booking form sits mostly off the screen. On every width, the page offers two different ways to start and has no headline strong enough to say why this company and not an agency.

**What would move it most**
1. **The phone layout does not reflow, so the booking form is mostly off the screen.** The page is 587 px wide in a 390 px viewport, and the facts file notes that it scrolls sideways. The two columns never stack. The "Find a boat" card starts at x 270, so most of it, including the Search button (`button`, box 270–564), is past the right edge. The navigation wraps into a stack of five lines beside the logo, and "Your booking" breaks in two. The lead paragraph runs 9.1 characters per line (`characters_per_line`, `p.lead`) and the headline runs 8. A visitor on a phone, which is likely how many people plan a holiday, meets a page they must pan sideways to use, with the one tool that books a boat hidden. This is a defect against WCAG 1.4.10 (Reflow). Below about the tablet width, stack the page into one column with the form in full view, and collapse the navigation into a menu or a single row. Viewports: phone

2. **Two starting points compete, and the form's own submit button is styled as the lesser one.** "See boats and dates" is a filled green button on the left, and "Search" is an outlined button at the end of the "Find a boat" form. Both appear to lead to the same result: a list of boats for some dates. The visitor has to stop and work out which to use and whether they differ. The filled button wins the eye, but it skips the base, date, nights, and berths the visitor could fill in right beside it. This is a defect (Material Design 3, Buttons; NN/g on button emphasis: one primary action per view). Pick one start. The usual choice on a booking page is the prefilled form, with its Search button as the single filled primary. Then remove the other button or demote it to a text link. Viewports: all

3. **The headline is weaker than the paragraph under it, and the one claim that sets this company apart sits at the end of that paragraph.** The h1 is 22 px at weight 400 in gray #6b7574, at 4.46:1 contrast, just under the 4.5:1 minimum (`violations`, `h1`). The lead paragraph is 20 px in near-black #26302f, at 12.75:1. So the headline looks smaller than its own text, and nothing on the page reads as the title. The logo (24 px), headline (22 px), and lead and navigation (20 px) are three sizes only 2 px apart. They read as the same level, not as a scale (Bringhurst, 3.1.1). "Hire a narrowboat for a week on the canal" could sit on any hire site. The reason to book here, "No agency in the middle, and no fee on top of the hire", comes last, in the paragraph. This is a defect (Dair, *Design with Type*, chapters 8 and 9; Tschichold on order by size). Make the headline the largest and darkest text on the page, a clear step above the lead, and drop the sizes to three or four with real gaps between them. Then move the direct-booking claim forward so it lands in the first read. An editorial edit could fold the existing "book it here with the boatyard that keeps it, no fee on top" into the headline or a line right under it. Viewports: all

4. **There is no picture of a boat or the canal.** This is taste, argued on common sense. People buy a week on a narrowboat as a holiday, and they want to see the boat and the water before they commit. The page has only a form and a list, so the headline carries the whole idea alone. On the desktop and widescreen views, the large empty middle shows where a picture would sit. Add one real photograph of the company's own boats or canal, set into the hero beside the form. A stock shot would not do the same job. Viewports: all

**Smaller things.**
- The route details ("7 nights, 38 locks" and so on) are gray #6b7574 at 4.46:1 (`violations`, `ul > li > span:nth-of-type(2)`). Darken them to clear 4.5:1. Viewports: all
- "38 locks" has no point of reference, so a first-time hirer cannot tell whether that is a gentle week or hard work. Tell them what the count means for them, using a fact only the company has. Viewports: all
- "Routes from Hartwell Junction" depends on the Base field in the form, but it sits about 280 px below the hero and far from that field. It reads as a separate section, and it will not obviously change when the base changes (Norman, natural mapping). Move it nearer the form, or tie it to the form visibly. Viewports: desktop, widescreen
- On the widescreen view, the content is pinned to the two side edges with about 850 px of empty space between them. The eye must cross the whole screen from the headline to the form. Cap the content width so the two columns sit together. Viewports: widescreen
- On the phone, "4 nights, 12 / locks" and "10 nights, 61 / locks" split a number from its unit (Bringhurst 2.4.6). Keep them together. Viewports: phone
- "Start date" looks like a plain text field, with no calendar cue. If it does not open a date picker, visitors can type dates the system cannot read (Nielsen 5). Show that it is a date picker. Viewports: all
- The borders of the input and select fields look pale against the white card. Measure them against 3:1 (WCAG 1.4.11), and darken them if they fall short. Viewports: all
- On the tablet, the lead paragraph ends with "hire." alone on its last line (Bringhurst 2.4.2). Viewports: tablet

**What's working.**
- The palette is restrained: warm off-white, one deep green, and near-black text. It fits a slow canal holiday and has none of the stock template effects. Keep it.
- The search form is prefilled with sensible choices (Hartwell Junction, Sat 14 June, 7 nights, 4 people), with labels above the fields. The visitor can search in one press.
- On desktop, the lead paragraph is set well: 20 px with a 30 px line height and 63.5 characters per line. It says in plain words who you book with.

**Where it could go further.**
1. **Let the Slowwater serif carry the headline.** This builds on finding 3. The serif in the "Slowwater" logo is the only type on the page with any character, and the rest of the page is set in one plain sans, so the brand's voice ends at the top left corner. A stronger version would use that serif for the headline as well, and maybe for the route names, and keep the sans for the form, labels and details. Then the headline differs from the lead in typeface as well as in size, which the checklist marked as missing. The page's job is to make a visitor book here and not through an agency, and a headline in the boatyard's own lettering tells them who they deal with before they read a word. This is taste. Dair, *Design with Type*, argues for contrast of kind as well as contrast of size, and Bringhurst, *The Elements of Typographic Style*, makes the case for a serif and sans pairing where each has a clear role.
2. **Make the routes the proof that this boatyard knows its water.** "The Fenby loop", "Up to Ashcombe and back" and "The long summit" are the only content an agency could not copy, but the page shows them as a bare gray list under the fold. The lead paragraph already says "choose a route that fits your days." A stronger version would treat the routes as the reason to book direct, with each route a short, specific promise from the people who keep the boats, not a row of counts. That serves the page's job because it turns "no agency in the middle" from a claim into something the visitor can see. The page does not hold that content now. The maker needs a line or two per route that only the boatyard could write, such as what the week is like or where to moor. This is taste, argued on its own terms.

**Couldn't judge from a still.**
- Whether "Start date" opens a date picker.
- Whether the routes list changes when the base changes.
- Focus styles on the form fields and buttons.

**Checklist.**
The whole piece: 8 lines, 6 yes, 2 no (main image and headline make one idea; every element does a job)
What matters first: 3 lines, 0 yes, 3 no (one element dominates; distinct levels; headings differ in more than size)
Arrangement and space: 13 lines, 8 yes, 5 no (space inside groups smaller than between; no overlap; margin from page edge; space gathered; balance)
Text: 30 lines, 26 yes, 4 no (contrast; line length; line breaks in short text; widows)
Color: 9 lines, 9 yes
Pictures: 12 lines, 12 yes
Charts and data: skipped, no chart
Interface: 33 lines, 27 yes, 6 no (one primary action; non-text contrast; inputs allow only valid values; natural mapping; platform conventions; reflow)
Template tells: 10 lines, 10 yes
