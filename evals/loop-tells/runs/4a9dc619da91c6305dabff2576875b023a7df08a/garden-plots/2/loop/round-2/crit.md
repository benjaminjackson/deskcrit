**First read.** The eye lands on the serif headline "Run the waiting list for your garden without the spreadsheet". Then it moves to the two dark-green squares, plots 3 and 8, in the plot card, and then to the green "Add your garden" button. Below that, "What Plotwise does" now reads as a section heading, and the four card titles stand out from their text. The page reads as a calm, well-made product page for garden organizers. At the other sizes the page now reflows: on the tablet the plot card moves under the text and the cards go into two columns, and on the phone everything stacks into one column with no sideways scroll.

**What it's for.** To get a community-garden organizer to add their garden to Plotwise, a tool that runs the plot waiting list and offers empty plots to the next person in line.

**Verdict.** The fixes worked. The phone is no longer broken, the hierarchy now scans, and "free" is gone. The biggest thing still in the way is the hero picture: it shows which plots are empty, but not the thing the headline sells, which is the offer going to the next person on the list.

**Finding status**
- phone-layout-broken: closed. On the phone, page_width is 390, the nav links are 31 px tall in one row under the logo, the plot card has a 20 px margin from the screen edge, and the cards are in one column at 41 to 42 characters per line.
- no-heading-levels: closed. At all four viewports the h3 card titles are weight 500 in #2f3a2c, and the h2 is Source Serif 4 at 26 px, so the section heading and the card titles now each have a level of their own.
- free-means-two-things: closed. At every viewport the legend says "Empty", the card says "An empty plot goes to the next grower", and the hero paragraph says "the day it falls empty".
- picture-misses-waiting-list: open. The plot card and its caption, "Elm Row Gardens, plots 1 to 12", are the same at every viewport. Nothing shows a next person or an offer for plot 3 or plot 8.
- empty-space-and-wide-hero: closed (by look). The content is capped at 1120 px on the widescreen, and the headline and plot card are now about 180 px apart, so they read as one hero. The cream below the cards now reads as ordinary space below a short page.
- tablet-card-line-length: closed. The cards are in two columns on the tablet, at 33 to 38 characters per line.
- button-says-nothing-next: open. Nothing next to "Add your garden" says what the first step involves or what it costs, at any viewport.
- rent-reminder-march: open. The card still says "before rent is due in March", so a reader still cannot tell whether March is an example or a limit.

**New problems.** None.

**What would move it most**
1. The hero picture does not show the waiting list. In the plot card at every viewport, the viewer sees that plots 3 and 8 are empty, but not what Plotwise does about it. The headline's promise, that the empty plot goes to the next person in line, is left for the reader to imagine. Keep the plot card, make it show what happens to plot 3 or plot 8, and change the caption to state that point. The real content (who is next, what the offer looks like) has to come from the maker. Taste. Viewports: desktop, phone, tablet, widescreen.

**Smaller things.**
- "Rent reminders" card: change the line so it says whether March is an example or a fixed date. The fact is for the maker to supply. Viewports: desktop, phone, tablet, widescreen.
- "Add your garden" button: add a short line next to it that says what the first step involves. The fact is for the maker to supply. Viewports: desktop, phone, tablet, widescreen.
- Tablet plot card: it is 520 px wide, so its right edge stops about 120 px short of the right edge of the card grid below. Make it the full content width or line it up with a column edge. Viewports: tablet.

**What's working.**
- The two type families now do two clear jobs. Source Serif is used for the headline and the section heading, and Inter weight 500 in the darker green is used for the card titles. The four features can now be scanned by name.
- The phone and tablet layouts now reflow as real layouts. The order is headline, then button, then picture, then features, and the measure stays readable (41 to 48 characters per line on the phone).
- One green does all the work. The two empty plots and the button share #3d6b35, so the eye moves from the problem to the action.
