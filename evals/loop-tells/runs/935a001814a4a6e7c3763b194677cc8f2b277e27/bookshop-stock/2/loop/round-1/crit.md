**First read.** On desktop the eye goes to the headline first. Then it jumps to the rust "Sign in" button at top right, because that button is the only strong color on the page. Next it drops to the reorder table. The "Start a 30-day trial" button is a pale beige box that is easy to miss. The page reads as quiet, warm software made for bookshops, and the table of sample titles gives it a real, specific feel. On the phone and tablet the page does not rearrange itself for the narrower screen. The headline squeezes into a thin column seven lines tall, the table runs off the right edge, and the feature text breaks into one- and two-word lines. On widescreen the headline and the table sit at opposite edges of the screen with nothing between them.

**What it's for.** A landing page that gets independent bookshop owners to understand what Shelfmark does and start a trial.

**Verdict.** On desktop the page does its job. The headline is specific and the table shows the product. But the layout breaks on phone and tablet, where many shop owners will see it first. On every viewport the strongest button on the page belongs to people who already have an account, not to the shop owner the page is trying to win.

**What would move it most**

1. **The layout does not reflow on phone or tablet.** The page measures 789 px wide on the 390 px phone and on the 768 px tablet (`page_width`), so the reader must scroll sideways. The two-column hero stays side by side, so the headline column is only 181 px wide.
   - The h1 runs to 7 lines at 6.8 characters per line (`characters_per_line`, `h1`).
   - The paragraph under the headline runs at 20 characters per line.
   - The table's right edge sits flush against the page edge.
   - On the phone the three feature paragraphs drop to 5 to 9 characters per line, with 9 to 12 lines each (`section.facts > p`).
   - "Start a 30-day trial" breaks into four lines and splits "30-/day".
   - "Shops using it" and "Sign in" each wrap inside the header, and the header rule stops at 390 px while the content runs on past it.

   A shop owner who opens this from an email or a search on their phone sees a broken page before they read a word. Defect (WCAG 2.2 SC 1.4.10 Reflow; Bringhurst on line length, 45 to 75 characters). Fix direction: below a breakpoint, stack the hero into one column (text, then buttons, then the table at full width). Stack the three feature paragraphs too. Let the navigation collapse or shrink so each item stays on one line. Viewports: phone, tablet

2. **The rust "Sign in" button looks like the main call to action, not the trial button.**
   - "Sign in" is the only filled, saturated button: white text on #8a3b24, weight 500 (`a.nav-signin`).
   - "Start a 30-day trial" is beige #f3eee6 with gray #5c544b text at weight 400 (`a.button.button-primary`). That is barely different from the outlined "See how it works" beside it, which has the same text color and size.

   So the eye goes to the action a new visitor cannot use, and the two hero buttons look equal in weight. Convention (Material Design 3, "Buttons": one high-emphasis action per view; Apple HIG, accent color kept for the main action). Fix direction: give the trial button the filled accent treatment, keep "See how it works" outlined, and set "Sign in" back to a text link or an outline. Viewports: all

3. **On widescreen the hero breaks into two separate islands.**
   - The text block ends at about 604 px and the table starts at 1376 px, so a gap of about 770 px runs through the middle of the first screen.
   - The content ends at about 550 px, and the lower half of the screen is empty.
   - The feature paragraphs stretch to 79 to 81 characters per line (`section.facts > p:nth-of-type(1)`, `(2)`), and one of them leaves "take." alone on its last line.

   The eye has to cross the screen to connect the headline with the table that proves it, and the page looks unfinished rather than calm. Convention (Arnheim on balance; Ruder on gathered white space; Bringhurst on line length). Fix direction: cap the content width so the hero and the feature row stay together as one readable block, centered in the wide window. Viewports: widescreen

**Smaller things.**
- The table headers ("Title", "On shelf", "Sold this week") and the date "Mon 9 June" are #8a8178 on white at 3.82:1, below the 4.5:1 minimum (`thead > tr > th`, `span.preview-date`). Darken them to the #5c544b used for the body text. Viewports: all
- Three text sizes are only 1 px apart: 16 px for the paragraph under the headline and the nav, 15 px for the feature text and the buttons, and 14 px for the table (`type_sizes`). They read as accidents, not as levels. Merge them into two sizes, and use weight or color for any finer difference. Viewports: all
- The table starts at 736 px, but the third feature column starts at 859 px. The hero splits the page in halves and the feature row splits it in thirds, so the page looks placed by eye. Put both rows on one column grid. Viewports: desktop, widescreen
- The headline's last line is the single word "asks". Change the line breaks, for example with a narrower column or balanced wrapping, so the last line holds a phrase. Viewports: desktop, widescreen
- "Returns tracked." is the only feature lead-in with no verb or subject, and "in the format they take" leaves the reader to guess which format. Restore the verb, for example "Tracks your returns." Name the format, or the distributors it supports, if you have that fact. Viewports: all
- The table promises "Reorder this week" but shows only copies on the shelf and copies sold. It does not show how many copies to order, so the reader must work out the reorder from the two numbers. If the product suggests a quantity, show that column. Viewports: all
- The trial button compares the product with nothing. "Start a 30-day trial" asks the shop owner to grade the product, but nothing sets it next to how they count stock today. A line that names what Shelfmark replaces would let them judge the value on their own terms. Viewports: all

**What's working.**
- The headline names one concrete moment from the owner's day ("before a customer asks"). The paragraph under it says exactly what the product does and when ("on Monday morning"). No other product could use this copy, so keep it.
- The hero shows a real reorder table with plausible titles instead of a generic picture. It proves the claim right next to it, and the reader sees the output they would get.
- The cream background, dark brown text and single rust accent feel like a bookshop, not a startup template. There are no gradients, pills or emoji. Keep that restraint.

**Where it could go further.**
1. **Make the reorder table show the decision, not just the data.** In the "Reorder this week" table, "A Year of Hedges" and "The Glass Orchard" both show 0 on shelf. Those are the books the owner must act on today, but every row has the same weight, and the rows are in no order the reader can see. A stronger version would sort the rows by how urgent the reorder is and mark the empty-shelf rows with weight or a tint, so the table answers "what do I order?" before the reader studies a single number. The page is there to make an owner understand what Shelfmark does. A table that already points at the right books shows the product thinking for them, and that is the promise of the headline. The bigger change: the strong color would go to the data and the trial button, not to "Sign in". This is taste. Tufte, *The Visual Display of Quantitative Information*, argues that data graphics should make the important comparison obvious. Few makes the same case for highlighting the values that need action.
2. **Make Monday morning the thread through the whole page.** The piece already names one weekly moment three times: "on Monday morning" under the headline, "Reorder this week", and "Mon 9 June" on the table. The feature row does not use that moment. It reads as three separate features: till, distributor, returns. A stronger version would commit to the weekly routine and order the feature row as the steps of the owner's week, from sales coming in, to the list going to the distributor, to returns falling due. The page would then tell one story about the owner's week, and the trial would read as "try one week of this", not "test some software". This is taste. No approved source states it, but it builds on the specific moment the crit's "What's working" credits in the headline.

**Couldn't judge from a still.** The focus states, and whether the page reflows at 320 px once it is fixed. Check both in a live browser.

**Checklist.**
The whole piece: 8 lines, 8 yes.
What matters first: 3 lines, 2 yes, 1 no (distinct text levels).
Arrangement and space: 13 lines, 8 yes, 5 no (one grid; no crowding; page-edge margin; gathered white space; balance).
Text: 29 lines, 25 yes, 4 no (contrast; line length; widows and runts; breaks in short text).
Color: 9 lines, 8 yes, 1 no (strong color on the main action).
Pictures: 12 lines, 12 yes.
Charts and data: 16 lines, 16 yes.
Interface: 33 lines, 29 yes, 2 no (one primary action; reflow), 2 unsure (focus visible; focus not obscured).
Template tells: 10 lines, 10 yes.
