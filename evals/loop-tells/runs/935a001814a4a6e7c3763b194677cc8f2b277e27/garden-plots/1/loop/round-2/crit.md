**First read.** On desktop the eye lands on the large serif headline, moves to the two dark green plots (3 and 8) in the panel on the right, then drops to the green "Add your garden" button. The page reads as a quiet, plain tool for someone who runs a community garden's waiting list. It feels calm and believable. Below the hero, "What Plotwise does" now reads as a section heading, and you can scan the four card titles by name. On the phone and tablet the plot card stacks under the button and the cards stack one or two per row. On widescreen the content sits in a centered column that matches desktop.

**What it's for.** Get the person who runs a community garden to sign up ("Add your garden") so Plotwise runs the garden's waiting list. This comes from the work order's crit.

**Verdict.** The fixes worked. The page now holds together at every width, the text levels read at a glance, and the hero stays in one piece on wide screens. What is left is small: the plot map still shows only free and taken plots, not a plot going to the next person in line, and the page still has no footer.

**Finding status**
- layout-breaks-on-narrow-screens: closed. On the phone, `page_width` is 390, which equals the viewport, and `violations` is empty. The phone nav links are 31 px tall. The plot card sits below the headline. The card descriptions measure 41 to 44 `characters_per_line` on the phone and 42 to 44 on the tablet. All twelve tablet plot cells are 81 px wide.
- text-levels-look-the-same: closed. `div.card > h3` is weight 500 in #2f3a2c, and `div.card > p` is weight 400 in #55604f. The `h2` is 22 px Source Serif and the card titles are 15 px. This holds at all four viewports.
- wide-hero-comes-apart: closed. On widescreen the gap from the right edge of `h1` (x 904) to `div.plan-title` (x 1137) is 233 px, the same as on desktop (584 to 817). The content keeps its desktop layout in a centered 1152 px column.
- plot-map-shows-less-than-copy-promises: open. The card still shows only which plots are free and which are taken, under the title "Elm Row Gardens, plots 1 to 12". Nothing shows a free plot going to the next person on the list.
- rent-reminder-line-ambiguous: open. The line still reads "Each grower gets one reminder before rent is due in March." It does not say whether the month and the number of reminders can change.
- taken-plots-low-contrast: closed (looks). The taken plots and the "Taken" swatch now have a darker gray outline, so they stand clear of the white card at all four viewports. The facts file does not measure this.
- lone-word-yes-on-last-line: closed. The last line of the Plot offers card is now "say yes." on desktop and widescreen, and "a week to say yes." on the tablet.
- page-ends-without-call-to-action: open. A second "Add your garden" button now sits below the feature cards, so a reader can act at the end of the page. There is still no footer, and the page stops right after the button.

**New problems.**
- Phone navigation: the links wrap to two rows, and "Sign in" sits alone on the second row under "For gardens". It reads as left over, not as a deliberate menu.

**What would move it most**
None.

**Smaller things.**
- Plot card: it shows free and taken plots but not the step the headline promises, a free plot offered to whoever is next. Let the card show that step. The names and order on the list are for the maker to supply. Taste. Viewports: all
- Rent reminders card: say whether the March date and the single reminder are only an example or are fixed. Only the maker knows which is true. Viewports: all
- End of page: the second button now gives the reader a way to act, but there is no footer. Add a footer below it so the page has an end, with the sign-in and contact links a visitor looks for there. Viewports: all
- Phone navigation: "Sign in" sits alone on a second row. Keep the four links on one row, or move "Sign in" up beside the logo, so the nav reads as one group. Viewports: phone
- Tablet hero paragraph: it runs 77 `characters_per_line` (`div.hero-text > p`), just over the 75 limit. Cap its width at about the desktop measure of 520 px. Viewports: tablet

**What's working.**
- The plot map is a real picture of the product, not a generic hero image. The two dark green free plots give the eye a second place to land, right after the headline, and the darker outline on the taken plots keeps the free/taken key readable.
- The type scale is tight: four sizes (40 or 32, 22, 15, 13) and two weights. The 22 px serif section heading and the weight-500 dark card titles create real levels without adding sizes.
- The stacked phone layout keeps the order of the case: headline, promise, button, proof, features, then the button again.
