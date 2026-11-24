**First read.** On desktop the eye lands on the headline, "Know what is on your shelves before a customer asks", and then crosses to the "Reorder this week" table. From there it is pulled up to the rust "Sign in" button, the only filled, colored thing on the page. The real offer, "Start a 30-day trial", is a beige box that reads as a second choice. The page feels quiet, plain, and specific to bookshops. On the phone and tablet the layout does not stack. The headline is squeezed into a narrow column seven lines tall, the table runs off the right edge, and the page scrolls sideways.

**What it's for.** A landing page that persuades independent bookshop owners to start a trial of Shelfmark, stock-tracking software.

**Verdict.** The message is right, and the table is good proof of it. Two things get in the way. On a phone the page is broken, and on every screen the loudest button sends visitors to "Sign in" instead of to the trial.

**What would move it most**

1. **The layout does not collapse on narrow screens.** The page renders 789 px wide at both the 390 px phone and the 768 px tablet widths (`page_width`), so both scroll sideways. On the phone, the hero text and the table stay side by side. This causes several problems:
   - The headline wraps to 7 lines at 6.8 characters per line (`h1`).
   - The table starts at x=310 and runs past the screen edge.
   - Both buttons wrap to 3 or 4 lines and split "30-/day" across lines.
   - "Shops using it" breaks onto 3 lines and "Sign in" onto 2.
   - The three facts at the bottom shrink to about 5 characters per line (`section.facts > p`), which makes a staircase rag.
   - The header rule stops at 390 px.

   Many bookshop owners will first open this page from a link on their phone. What they see looks broken, and a product that promises to keep order does not get that first impression back. Defect, WCAG 1.4.10 (Reflow). Fix: below a tablet width, stack everything in one column: headline, paragraph, buttons, table, then the facts one under another. Let the table use the full width, and keep the buttons on one line each. Viewports: phone, tablet

2. **The strongest button is the one new visitors don't need.** "Sign in" is the only filled, saturated button (white on #8a3b24, weight 500). "Start a 30-day trial" is weight 400 gray text on a beige fill (#f3eee6) that barely separates from the cream page (#fffdf9). Next to "See how it works" it looks like the same weight of button. The result is that a first-time visitor's eye goes to the exit meant for existing customers, and the trial looks optional. Convention, Material Design 3 "Buttons": one high-emphasis action per view. Fix: give the trial the rust fill and the heavier weight. Bring "Sign in" down to an outlined button or a plain nav link like its neighbors. Leave "See how it works" as the outlined secondary. Viewports: all

3. **The copy states what the product does but not whether it works for this shop.** Two lines are the problem:
   - "Works with your till" is the line a bookshop owner checks first, and it doesn't say which tills or card readers. An owner whose till isn't named will assume it's not supported. Name the kind of fact that is missing, the list of supported tills or card readers, and leave the list itself to the maker.
   - "Returns tracked." has no verb and stops at the fact. Who tracks them, and what does it save the owner? The line should end on what the date list means for the owner, said to "you". The current wording leaves the owner to work that out.

   Beyond those two lines, the page never compares Shelfmark with what the owner does now, such as walking the shelves on Monday or reading the till's own sales report. That comparison would let them judge the value themselves. Say what kind of comparison would help and leave the maker to write it. Defect for the till line, which decides whether an owner can use the product at all; taste for the rest. Viewports: all

4. **On widescreen, the headline and its proof sit about 770 px apart.** The hero text keeps to the left edge (x=64 to 604), and the table moves out to x=1377. The table is the proof of the headline, but here it reads as a separate widget across an empty field, and the eye has to travel the full width to connect them. Convention, proximity (`Space shows the groups`): the space inside a group should be smaller than the space between groups. Here the gap inside the hero is far larger than the gap from the hero to the facts below it. Fix: cap the width of the content area, or keep the table at a fixed distance from the text, so the pair stays together as the screen gets wider. Viewports: widescreen

**Smaller things.**
- The table column headers ("Title", "On shelf", "Sold this week") and the date "Mon 9 June" are #8a8178 on white, which is 3.82:1 (`contrast`, `thead > tr > th`, `span.preview-date`) and under the 4.5:1 minimum. Darken them to the body gray #5c544b, which still reads as secondary. Viewports: all
- There are five type sizes, 40, 20, 16, 15, and 14 px (`type_sizes`). The steps 16, 15, and 14 are too close to read as levels. Fold them into one body size and one small size, and use weight or color for the rest (Bringhurst 3.1.1). Viewports: all
- The headline leaves "asks" alone on its third line, which splits the phrase "a customer asks". A slightly narrower or wider measure would break it after "shelves". Viewports: desktop, widescreen
- The fact lines run to 79 and 81 characters (`characters_per_line`, `section.facts > p`), which is long for one of three columns, and "take." sits alone on the second line of the middle fact. Narrow the columns. Viewports: widescreen
- The page ends at about y=548, and the bottom third of the desktop screen is empty. Nothing below the facts follows up on the nav links "Pricing" and "Shops using it". Viewports: desktop, widescreen

**What's working.**
- The "Reorder this week" table is the best thing on the page. It uses plausible titles, a real date, and the two numbers an owner thinks in ("On shelf" and "Sold this week"), so the product shows its output instead of only describing it. Keep it as the main image.
- The headline is in the owner's own words and names a moment they know, a customer asking for a book. The paragraph under it says exactly what happens and when ("on Monday morning").
- The palette is small and warm, with readable body text: 7.32:1 contrast and 68 characters per line on desktop (`div.hero-text > p`). It has no template gloss, so the page looks made for this audience.

**Where it could go further.**
1. **Let the empty shelves lead the table.** Two rows in "Reorder this week" show 0 in "On shelf": "A Year of Hedges" and "The Glass Orchard". Those zeros are the exact moment the headline names, a customer asking for a book the shop no longer has. Right now they get the same plain weight as every other cell, so a visitor has to read every number to find the point. A stronger version would make the zero-stock rows the first thing the eye finds in the table, through weight or a tint taken from the existing warm palette. Use the color sparingly so it doesn't compete with the trial button once that button takes the rust fill. This serves the page's job directly: the owner sees the problem the product solves before reading a word of the pitch. Taste. Tufte, *The Visual Display of Quantitative Information*, argues that the ink in a display should show the data that matters, and here the data that matters is the zeros.
2. **Make the page about one Monday.** The paragraph promises a reorder list "on Monday morning", and the table is dated "Mon 9 June". Those are the same moment, but the page presents them as two separate things: a sentence on the left and a widget on the right. A stronger version would commit to that Monday as the idea that ties the page together, so the table reads as the list the owner gets that morning and the paragraph reads as its caption. The owner is buying a routine, not a database. A page that shows one concrete Monday of that routine makes the trial feel like a small, known step rather than a software purchase. This is a matter of framing and of how close the two pieces sit together, not of new copy. Taste. Krug, *Don't Make Me Think*, argues that a page should make what it offers obvious at a glance, and here one familiar moment does that better than a list of features.

**Couldn't judge from a still.**
- Hover and focus states on the three buttons. They matter most for the beige trial button, whose resting state is already faint.
- Whether "Pricing" and "Shops using it" link to content. Neither section appears on the captured page.

**Checklist.**
The whole piece: 8 lines, 8 yes
What matters first: 3 lines, 2 yes, 1 no (distinct text levels)
Arrangement and space: 13 lines, 11 yes, 2 no (space inside groups smaller than between groups; margin from screen edge)
Text: 30 lines, 25 yes, 5 no (text contrast; line length; rag; widows and runts; line breaks in headings and buttons)
Color: 9 lines, 9 yes
Pictures: 12 lines, 12 yes
Charts and data: 16 lines, 16 yes
Interface: 33 lines, 28 yes, 2 no (one primary action; reflow), 3 unsure (hover and pressed states; focus indicator; focus not obscured)
Template tells: 10 lines, 10 yes
