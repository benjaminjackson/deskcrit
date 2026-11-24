**First read.** On desktop the eye lands first on the large serif headline, "Run the waiting list for your garden without the spreadsheet." It moves next to the two dark green squares, plots 3 and 8, in the plot plan at the right, and then down to the green "Add your garden" button. The page reads as a quiet, warm product page for the people who run a community garden or allotment site, and it feels calm and plain. On the phone, the eye lands first on the broken header, where the menu links lie on top of the logo. After that it sees the plot plan cut off at the right edge and four columns of text only a word wide.

**What it's for.** My assumption: the page persuades whoever runs a community garden's plots and waiting list to sign their garden up ("Add your garden").

**Verdict.** On desktop and widescreen the page does its job: one clear headline, one clear ask, and a specific picture in a calm palette. It fails on the phone, where the layout does not adapt at all. That is the biggest problem, because volunteer garden secretaries will often open this page on a phone.

**What would move it most**

1. **The phone layout breaks, and the tablet layout is squeezed.** On the phone the page is 497 px wide in a 390 px viewport, so it scrolls sideways (facts file note, phone). The menu wraps into three lines that sit on top of the logo, so "Plotwise" runs straight into "growers". The plot plan sits beside the headline instead of below it and runs to the right edge of the page. The four feature cards stay in four columns, so each description wraps at 3.9 to 6.4 characters per line (`characters_per_line`, `div.cards > div.card > p`, phone), and "Post the shared work days" becomes a column of single words. Two menu links are only 19 px tall, under the 24 px minimum (`violations`, `nav.site-nav > a:nth-of-type(1)` and `(3)`, phone; WCAG 2.5.8). On the tablet the cards still wrap at 12 to 15 characters per line, and each plot in the plan shrinks to a strip 19 to 26 px wide. Defect: content that needs sideways scrolling fails WCAG 1.4.10, and lines this short cannot be read as sentences (Bringhurst gives 45 to 75 characters). Fix direction: below a breakpoint, put everything in one column. The menu goes behind a single control or onto its own row, the plot plan goes under the headline at full width, and the cards stack one per row (two per row on the tablet). Viewports: phone, tablet

2. **The card titles look the same as their descriptions.** "Waiting list", "Plot offers", "Rent reminders" and "Work days" are 15 px, weight 400, color #55604f. That is the same as the text under them, and the same as the "What Plotwise does" heading (`font_size`, `font_weight`, `color`, `div.cards h3`, `div.cards p`, `h2`, desktop). So "Waiting list Growers join the list online and see where they stand." reads as one run-on line, and the viewer has to work out where the label stops. On the phone the two merge completely. Below the headline the page has only one level of text, when it needs at least two (Müller-Brockmann: each level of importance must be distinct at a glance). Defect. Fix direction: keep the size and make the titles darker (the #2f3a2c of the headline) and a step heavier, so they read as labels. Viewports: all

3. **"Free" can be read two ways, and the reading that is wrong costs money.** The subhead says Plotwise "offers a free plot to the next person in line the day it comes free". The second card says "A free plot goes to the next grower", and the legend says "Free". A grower or a committee member can read "a free plot" as a plot with no rent to pay. The "Rent reminders" card then seems to say the opposite. Rent is exactly the kind of fact a reader holds the maker to. Defect (copy). Fix direction: use a word that only means "unoccupied" for this state, such as "empty" or "vacant", in the subhead, the card, and the legend. The subhead then also stops using "free" twice in one sentence. Viewports: all

4. **The picture shows which plots are empty, not the waiting list the headline sells.** The plot plan is the right kind of picture: specific, real-looking, and clearly a garden. But it shows two empty plots and stops there. The promise in the headline and subhead is the queue, and the offer that goes to the next person. The plan's title "Elm Row Gardens, plots 1 to 12" only names the subject. Taste: a picture that shows the step the product automates (an empty plot linked to the next person in line) would make the headline's case. This one only illustrates the word "garden". Fix direction: let the plan show the moment of the offer, or make its title say what is happening in it. The maker must supply the details. Viewports: all

**Smaller things.**
- The second card's description ends with "yes." alone on its last line. Change the wording or the card width so the last line holds more than one short word. Viewports: desktop, tablet
- On the phone, the last word of the headline, "spreadsheet", touches the left edge of the plot plan. Stacking the plan under the headline (finding 1) fixes this. Viewports: phone
- In the legend, the "Taken" swatch (#e4e8df on white) is very hard to see. This is common sense, not a checklist rule. A thin outline on the swatch would make it read as a key mark. Viewports: all
- "Each grower gets one reminder before rent is due in March" can read as if rent is due in March for every garden. If March is only Elm Row's date, say that, or say that the date is the garden's own. Viewports: all

**What's working.**
- The headline says what the product does and compares it with the tool the reader already uses ("without the spreadsheet"). The single ask, "Add your garden", names one exact action. Keep both.
- The palette is restrained: one warm off-white ground, two green-gray text colors, and one dark green. That green is used only for the button and the empty plots, so it marks the two things that matter. Every text block clears 4.5:1 contrast (the lowest is 5.33, the numbers on taken plots).
- The type scale is tight: 40, 22, 15 and 13 px, with a serif headline over a sans-serif text face. Nothing collides, so the problem in finding 2 is weight and color, not size.

**Where it could go further.**
1. **Hold the hero together on wide screens.** At 1920 px the headline sits at the left edge, the Elm Row plot plan sits at the right edge, and about 870 px of empty ground lies between them. The four cards also stretch to about 440 px each. The headline and the plan make one argument: this is your garden, and this is the list we run for it. The reader should take them in at a single glance, not cross the screen from one to the other. A stronger version would cap the width of the content, or set a column grid that keeps the plan close to the headline at any width, so the widescreen page reads like the desktop one. Finding 1 covers the narrow viewports. This is the same idea at the wide end. Taste. Müller-Brockmann, *Grid Systems in Graphic Design*, makes the case for a grid that fixes how the parts relate, whatever the size of the page.
2. **Let the waiting list and the offer lead the four cards.** "Waiting list", "Plot offers", "Rent reminders" and "Work days" now have the same size, color, and place. But the headline and subhead sell only the first two. Rent and work days are useful extras, not the reason a garden secretary signs up. A stronger version would give the first two cards more weight than the other two, so the section repeats the headline's promise before it lists the extras. That serves the one ask, "Add your garden": the reader sees the main job twice before the extras. Finding 2 is about titles inside a card. This is about how much weight each card gets. Taste. Wathan and Schoger, *Refactoring UI*, makes this point: give the primary things more emphasis and pull the secondary things back, instead of giving everything the same weight.

**Couldn't judge from a still.**
- Widths between the four that were captured. The phone layout already breaks at 390 px, so check at 320 px as well.

**Checklist.**
The whole piece: 8 lines, 7 yes, 1 no (image and headline make one idea)
What matters first: 3 lines, 2 yes, 1 no (levels of text tell apart)
Arrangement and space: 13 lines, 11 yes, 2 no (no overlapping or touching; margin from the edge)
Text: 30 lines, 27 yes, 3 no (line length; rag; widows)
Color: 9 lines, 9 yes
Pictures: 12 lines, 12 yes
Charts and data: 16 lines, 15 yes, 1 no (title states the finding)
Interface: 33 lines, 31 yes, 2 no (target size; fits the screen width)
Template tells: 10 lines, 10 yes
