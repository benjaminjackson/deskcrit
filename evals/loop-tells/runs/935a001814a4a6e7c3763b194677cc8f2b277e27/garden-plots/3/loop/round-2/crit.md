**First read.** The eye lands on the serif headline, then moves to the two solid green tiles (3 and 8) in the plot card, which are the strongest marks on the page. Next it drops to the green "Add your garden" button and the four beige cards. The page reads as a calm, modest landing page for a small product that garden coordinators use, and it now looks finished. On the phone, everything stacks in one column under a "Menu" button. The tablet now stacks the plot card under the hero. The widescreen view keeps the content in a centered column about as wide as the desktop layout.

**What it's for.** It gets a community-garden coordinator to see that Plotwise runs the plot waiting list for them, and to click "Add your garden".

**Verdict.** The fixes worked. The phone layout now fits the screen, the card titles read as titles, "free" is gone, and the widescreen hero holds together. The biggest problem left is the plot card. It still shows only which plots are open and which are taken, not the waiting list the headline promises. Its new outlined tiles also make the 10 taken plots look like empty slots.

**Finding status**
- phone-layout-overflow: closed. The measured `page_width` on the phone is 390, the menu is one 70 × 44 px "Menu" button, the phone `violations` list is empty, and the page is one column.
- card-titles-not-distinct: closed. The measurements show the h3 titles at weight 500 and darker (#2f3a2c) against body text at weight 400 (#55604f) on all four viewports. The h2 "What Plotwise does" is now Source Serif 4 at 22 px, and the titles read as titles at a glance.
- ambiguous-copy: open. "Free" is now "open" in the hero, the Plot offers card, and the key. But "has a week to say yes" and "rent is due in March" are still unqualified, so a reader still cannot tell if they are one garden's settings or fixed product rules. Only the maker knows which is true.
- plot-card-misses-waiting-list: open. The card still shows open and taken plots only, with no list and no person tied to plot 3 or 8.
- widescreen-hero-islands: closed. The content now runs from about 400 px to 1520 px, and the gap between the headline block and the plot card is about 180 px instead of about 850 px.
- taken-plots-low-contrast: closed (by eye, because the facts file does not measure non-text contrast). Taken tiles are now white with a mid-gray outline that looks about 3:1 against the white card. Open tiles differ by solid fill against hollow, which still shows in grayscale.
- headline-breaks-mid-phrase: open. On desktop and widescreen the lines are now "Run the waiting list for / your garden without / the spreadsheet". The break is better, but "for" and "without" still end their lines apart from their objects.
- plot-offers-widow: closed. On desktop the card ends "say yes." (two words), and on tablet it ends "who has a week to say yes.".
- hero-paragraph-touches-card: closed. On tablet the plot card now sits under the button, so the paragraph no longer runs into it.

**New problems.**
- Plot card, all viewports: the fix for the pale taken tiles uses hollow outlined boxes for "Taken" and solid boxes for "Open". This is the reverse of the usual empty-box-means-available reading. At a glance, the 10 hollow tiles read as 10 empty plots, and the key's hollow swatch looks like an unticked checkbox.

**What would move it most**
1. The plot card still does not show the waiting list. It is the only picture on the page, and it shows what a spreadsheet already shows: which plots are open. A coordinator does not see what is different about Plotwise, which is that an open plot goes to the next person in line. Fix: tie plot 3 or 8 to the person it is being offered to, in the same Elm Row example. The maker has to supply that person's details. Taste. Viewports: desktop, phone, tablet, widescreen.
2. The hollow "Taken" tiles read as empty plots. A coordinator who scans the card can read it as "10 plots free" before checking the key, so the sample says the opposite of what it means. Hollow-means-empty is a common reading, and the checklist has no entry for it. Fix: keep the outline, which met the earlier finding, but give taken tiles a quiet fill or a mark such as a small word or hatching, so that the tile that looks empty is the open one, or so that both states are labeled. Convention. Viewports: desktop, phone, tablet, widescreen.
3. The week and March lines still read as fixed rules. A coordinator whose garden gives growers two weeks, or collects rent in April, may decide Plotwise does not fit. Fix: mark the lines as the example garden's settings or as the product's rules. The maker has to say which is true. Defect. Viewports: desktop, phone, tablet, widescreen.

**Smaller things.**
- Headline: break at phrase boundaries, for example "Run the waiting list / for your garden / without the spreadsheet". Viewports: desktop, widescreen.

**What's working.**
- The phone layout is now a clean single column with a "Menu" control the size of a thumb, so the link from a group email opens on a page that looks finished.
- The card titles at weight 500 and the serif h2 make the four features scannable without making the type louder.
- The capped content width on widescreen makes the headline and the plot card read as one hero again.
