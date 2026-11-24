**First read.** On desktop and widescreen the eye goes first to the dark brown "Sign in" button at the top right, because it is the only strong color on the page. Then it drops to the large headline, then to the "Reorder this week" table. The page reads as calm, warm stock software for bookshops, and the table does most of the explaining. On the phone and the tablet the page breaks. The hero does not stack: the headline is squeezed into a column about one word wide, the buttons wrap one word per line, and the table runs off the right edge.

**What it's for.** It is the landing page of Shelfmark, stock-tracking software for independent bookshops. It has to get bookshop owners to start a trial.

**Verdict.** On a laptop the page mostly does its job: a specific headline, a table that shows the product, and three plain facts. Two things stop it. On phones and tablets the layout does not reflow, so the page scrolls sideways and is hard to read. On every screen the strongest button is "Sign in", which is for people who already pay, and not the trial button.

**What would move it most**
1. **The page does not reflow on phone or tablet.** At the phone width the page is 789 px wide in a 390 px viewport, and at the tablet width it is 789 px in a 768 px viewport (`page_width`; the facts file notes "scrolls sideways"). The two-column hero stays side by side, so the headline breaks into seven one-word lines. The trial button reads "Start a / 30- / day / trial". The table starts at x 310 and goes past the screen edge. On the phone the three facts become columns about 8 characters wide that step down like stairs. The nav wraps "Shops using it" onto three lines and "Sign in" onto two. A bookshop owner who opens a link on a phone sees half a table and a page that slides sideways. That is the first impression for many of them. Defect (WCAG 2.2 SC 1.4.10 Reflow; Müller-Brockmann on margins). Fix direction: below a breakpoint, stack the hero into one column (headline, paragraph, buttons, then the table at full width inside the margins). Stack the three facts. Collapse the nav, or keep only the logo and "Sign in". Viewports: phone, tablet
2. **"Sign in" outranks "Start a 30-day trial".** "Sign in" is filled dark brown with white bold text. The trial button is a pale beige fill on a cream ground, and it is hardly stronger than the outlined "See how it works" next to it. The eye goes to the action for existing customers, and a new visitor has to look for theirs. Both hero buttons also look like their edges are below 3:1 against the background, so the trial button does not read as the main action. Convention (Material Design 3 and NN/g on primary and secondary actions; WCAG 2.2 SC 1.4.11 for the button edge). Fix direction: give the brown fill to "Start a 30-day trial", and drop "Sign in" to a text link or an outline. Viewports: all
3. **The ask has nothing to compare against.** "Start a 30-day trial" asks the owner to trust the product. Nothing on the page sets Shelfmark next to what the owner does now to know their stock, such as their current tool or their own Monday routine. The headline is specific ("before a customer asks"). The facts are concrete ("Works with your till", "in the format they take"). But the page does not show the owner how their week changes. The page also stops after the three facts. The bottom third of the desktop view and the bottom half of the widescreen view are empty, and no second ask comes after the facts. Taste and common sense. Fix direction: add a comparison with something the owner already has and trusts, in words the maker supplies, and repeat the ask after it. Viewports: all
4. **The widescreen layout pulls apart.** The hero text ends at about x 575 and the table starts at x 1376. That leaves an empty band about 800 px wide, so the headline and the table that proves it look like two unrelated things. The three facts stretch to 79 and 81 characters per line (`characters_per_line`, `section.facts > p:nth-of-type(1)` and `p:nth-of-type(2)`). Convention (Arnheim on balance; Bringhurst's 45 to 75 characters). Fix direction: cap the content width so the table sits near the text, as it does at 1280 px. Viewports: widescreen

**Smaller things.**
- The table headers ("Title", "On shelf", "Sold this week") and the date "Mon 9 June" are at 3.82:1 (`contrast`, `thead > tr > th`, `span.preview-date`). WCAG 1.4.3 asks for 4.5:1 at 14 px, so darken that gray. Viewports: all
- The type sizes are 40, 20, 16, 15 and 14 px. The nav at 16, the body at 15 and the table at 14 are too close to read as levels, and the body paragraph is smaller than the nav (`type_sizes`). Use fewer sizes: set the body at least at the nav size and let weight or color separate the rest. Viewports: all
- The headline ends with "asks" alone on the third line. Rebalance the measure so the last line carries more than one word. Viewports: desktop, widescreen
- The rows of "Reorder this week" run 9, 6, 7, 5, 4 sold, and the titles with 0 on shelf are mixed in. Sort the rows by how urgent the reorder is, so the example reads as the product's judgment and not a random list. Viewports: all
- The table promises a reorder list but shows no column for how many copies to order. If Shelfmark suggests a quantity, the example table should show that column. Viewports: all
- The table's left edge (x 737) lines up with none of the three fact columns (64, 461, 858), so it looks placed by eye. Align it with the third column or the middle column. Viewports: desktop
- "Sales come in from the shop's card reader" changes from "your" to "the shop's" right after "Works with your till". Keep it as "your". Viewports: all

**What's working.**
- The headline names a moment from the owner's own day ("before a customer asks"), and the paragraph gives the when ("on Monday morning"). It could not sit on anyone else's page.
- The table of real-looking titles is the right hero picture. It shows the output of the product, not a decoration, and it fits the warm, bookish palette.
- The three facts lead with a bold claim in the owner's words ("Works with your till", "Orders from your distributor") and do not use icon cards. Keep this format when you stack them.

**Where it could go further.**
1. **Make brown mean "act now".** Builds on finding 2. Once the dark brown leaves "Sign in" and goes to "Start a 30-day trial", use it in one more place: the two "0" cells under "On shelf" in "Reorder this week", for The Glass Orchard and A Year of Hedges. Right now every number in the table has the same weight, so the table looks like a list of stock and not like advice. If brown marks the trial button and the titles that need action today, an owner sees that the product tells them what to do, and the color then takes them to the trial. The point is to sell a trial to people who worry about empty shelves, and the zero is the number they worry about. Taste. Tufte, *The Visual Display of Quantitative Information*, says to put emphasis on the data that carries the message. Wathan and Schoger, *Refactoring UI*, say to keep a strong accent for a small number of things.
2. **Build the page around Monday morning.** The paragraph says Shelfmark tells you what to reorder "on Monday morning", and the table's date is "Mon 9 June". Those two details are the most specific thing on the page, but they sit far apart in small, quiet text. A stronger version would treat the Monday reorder as the event the whole page describes. The table would visibly be "your Monday", and the three facts would read as the steps that make that list. This gives a bookshop owner one routine to picture, not three features, and a routine is easier to say yes to with a trial. Taste. Krug, *Don't Make Me Think*, says a page should make clear at once what the visitor can do with it. The maker supplies any new words.

**Couldn't judge from a still.**
- Whether "Features", "Pricing" and "Shops using it" go to sections that exist. The page as captured ends after the three facts. Check the links in a live browser.
- Hover and focus states of the three buttons.

**Checklist.**
The whole piece: 8 lines, 8 yes
What matters first: 3 lines, 2 yes, 1 no (distinct text levels)
Arrangement and space: 13 lines, 9 yes, 4 no (one grid; margin from the page edge; white space gathered; balance)
Text: 30 lines, 25 yes, 5 no (body at least as large as the menu; text contrast; line length; widows and runts; line breaks in short text)
Color: 9 lines, 9 yes
Pictures: 12 lines, 12 yes
Charts and data: 16 lines, 15 yes, 1 no (rows sorted)
Interface: 33 lines, 30 yes, 3 no (one primary action; non-text contrast; reflow)
Template tells: 10 lines, 10 yes
