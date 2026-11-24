**First read.** The eye goes first to the dark green "See boats and dates" button, then to the white "Find a boat" card on the right. Only after that does it find the line at top left, "Hire a narrowboat for a week on the canal". That line should be the headline, but it is set pale and small, so it reads as a subtitle. The page looks like a calm, plain booking tool for canal holidays. It does not feel like a holiday: there is no boat and no water, and there is a large empty gap under the button. On the phone the layout does not change at all. Two columns are squeezed side by side, the menu stacks into a tall column, and the opening paragraph runs two or three words to a line.

**What it's for.** It is the home page of a narrowboat hire company that takes bookings direct. Its job is to get a visitor to pick a base, a date and a boat size and search for a boat, and to make clear why booking here beats booking through an agency.

**Verdict.** On a computer the page works: the search form is clear and filled in with sensible defaults. But on a phone it is broken, the headline is the weakest text on the page, and two buttons that both find boats compete with each other. The phone layout is the biggest problem, because many visitors will arrive on a phone and get a page that scrolls sideways.

**What would move it most**
1. **The phone layout does not adapt to the screen (defect).** The page is 587 px wide inside a 390 px phone screen (the facts file's `page_width`, which notes "it scrolls sideways"). The desktop's two columns stay side by side:
   - The opening paragraph (`p.lead`, 20 px) wraps at about 12 characters a line.
   - The headline breaks into five lines.
   - The four menu links stack into a column, and "Your booking" breaks across two lines.
   - "12 locks" and "61 locks" in the route list split from their numbers.
   - The "Find a boat" card runs to the right edge of the page, with no margin.
   
   A visitor has to pan sideways to see the form and reads the sales pitch one word group at a time. WCAG 2.2 SC 1.4.10 (Reflow) asks for one column with no sideways scrolling. Fix: below tablet width, stack the page into one column with the form directly under the opening text, and fold the menu into a single row or a menu button. Viewports: phone
2. **Nothing leads, and the headline is the weakest text on the page (defect).** The h1 is 22 px, regular weight, in gray #6b7574 at 4.46:1 contrast (`font_size`, `color`, `contrast`, `h1`). The paragraph under it is 20 px in near-black at 12.75:1 (`p.lead`), and the menu is also 20 px in near-black (`nav.site-nav`). So the headline differs from the body by 2 px and by being paler, which makes it weaker, not stronger (Dair, *Design with Type*, ch. 8–9). The eye falls to the filled button by default (Tschichold, *The New Typography*). The page's real reason to book here is "No agency in the middle, and no fee on top of the hire", and it sits at the end of the paragraph where few will reach it. Fix: make the headline clearly the first thing seen, larger by a real step, darker, and if you like, set in the Source Serif the logo already uses. Then decide whether the "no agency, no fee" point belongs in it or right under it. Viewports: all
3. **Two buttons do the same job, and the stronger one is not the form's button (defect).** "See boats and dates" is a filled dark button. "Search", the button that actually sends the form the visitor just filled in, is only outlined. Both lead to a list of boats. The visitor who sets base, date, nights and berths finds that their button looks secondary, and has to wonder whether the filled one ignores what they chose. Material Design and Apple's guidelines both ask for one primary action per view. Nielsen's heuristic 8 counts the twin as clutter. Fix: make "Search" the one filled button, and either remove "See boats and dates" or give it a different job. Viewports: all
4. **A holiday sold with no picture of it (taste, argued on common sense).** The only things on the page are type, a form and three route names. Someone choosing a week on a boat wants to see the boat and the water before they commit to a date. Without that, the page could be any booking form, and the slow-holiday mood the name "Slowwater" promises never arrives. Fix: put one real photo of your own boats or your stretch of canal where the empty band below the button now sits. Use a photo of these boats, not a generic one. Viewports: all
5. **The copy contradicts itself and leaves out the price (defect).** The headline says "for a week", but the routes listed run 4, 7 and 10 nights, and the form offers a choice of nights. So a reader may think you only hire by the week. The page's selling point is a price argument ("no fee on top of the hire"), yet no price or starting price appears anywhere. The visitor cannot check the claim against what an agency charges them, so they have to take it on trust. Fix: cut "for a week" or make it match the shorter breaks. Show the kind of figure that lets a visitor compare, such as a starting price for a week on a four-berth boat, from your own price list. Viewports: all

**Smaller things.**
- The type uses five sizes (24, 22, 20, 16, 14 px; facts file `type_sizes`), and 24, 22 and 20 are too close to read as separate levels. Keep about three sizes and use weight or color for finer steps. Viewports: all
- The route lengths ("7 nights, 38 locks") and the headline are at 4.46:1 (facts file `violations`), just under the 4.5:1 that WCAG 1.4.3 asks for. Darken the gray #6b7574 slightly. Viewports: all
- The empty space is scattered, not planned. There is a dead band of about 270 px between the button and "Routes from Hartwell Junction". On widescreen there is a gap of about 900 px between the text column and the form card, which is pinned to the far right edge, so the page reads as two pieces that tip apart. On tablet the lower third is blank. Hold the content in a centered maximum width and close the dead band. Viewports: desktop, tablet, widescreen

**What's working.**
- The search form is filled in with real defaults ("Hartwell Junction", "Sat 14 June", "7 nights", "4 people"), with a label over each field. A visitor can search without typing anything.
- The route list gives each route's nights and number of locks, and it changes with the base chosen. This is information that only a canal company would think to give, and it makes the page belong to this business.
- The palette is very small: off-white, near-black, one muted canal green, plus the serif logo. It reads as calm and unfussy, and it carries none of the usual template effects.

**Where it could go further.**
1. **Make the route list the thing the page is about.** "Routes from Hartwell Junction" sits at the bottom as a plain three-row table, yet it is the one part only a boatyard could write. The crit's "What's working" credits it, but no finding makes use of it. A stronger version would treat the routes as the way in to booking. Each route's nights and lock count would read as a choice of holiday, and picking a route would carry its nights into the "Find a boat" form. That serves the page's job twice. It turns "choose a route that fits your days" from a line in the paragraph into something the visitor does. It also shows, without saying it, why booking with the yard that keeps the boats beats an agency: the yard knows its own water. The numbers are already there to lead with. "61 locks" on "The long summit" tells you more about that week than any adjective could. Taste. Tufte, *The Visual Display of Quantitative Information*, argues for letting the data itself carry the story. Here a few honest numbers about each route do that job better than mood copy.
2. **Builds on finding 2: give the Slowwater serif one consistent job.** The Source Serif in the logo is the only voice the page has beyond plain sans text. Finding 2 already suggests it for the headline. Going further, give the serif a defined role across the page: the yard's own names and words (the headline, the base names, the route names like "The Fenby loop"), while the sans keeps the form, labels and figures. The visitor then hears two voices, the boatyard talking and the booking tool working. That makes the "book with the boatyard, not an agency" argument something the page shows, not only says. Taste. Dair, *Design with Type*, treats a contrast between two typefaces as a way to carry meaning, not decoration, and it only works when each face keeps to its role.

**Couldn't judge from a still.**
- Whether "Start date" opens a date picker or is a free-text field. "Sat 14 June" shows no year, so check in a browser that a visitor cannot type an invalid or past date.
- How keyboard focus looks on the form fields and the two buttons.

**Checklist.**
The whole piece: 8 lines, 5 yes, 3 no (main image and headline make one idea; every element does a job; each kind of element looks the same everywhere)
What matters first: 3 lines, 0 yes, 3 no (one element dominates; distinct text levels; headings differ by more than size)
Arrangement and space: 13 lines, 10 yes, 3 no (margin from page edge; empty space gathered; visual weight balances)
Text: 30 lines, 26 yes, 4 no (4.5:1 contrast; 45 to 75 characters per line; gentle rag; breaks at phrase boundaries)
Color: 9 lines, 9 yes
Pictures: 12 lines, 12 yes
Charts and data: skipped, no chart
Interface: 33 lines, 28 yes, 3 no (one primary button; follows platform conventions; content fits screen width), 2 unsure (inputs allow only valid values; focus indicator)
Template tells: 10 lines, 10 yes
