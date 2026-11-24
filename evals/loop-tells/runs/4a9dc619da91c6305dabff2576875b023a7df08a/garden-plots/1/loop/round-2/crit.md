**First read.** The eye lands on the serif headline, goes down to the green "Add your garden" button, and then crosses to the two dark green plots in the plan. At every size this reads as a calm, plain landing page for a tool that runs a community garden's waiting list. On the phone and tablet the page now stacks into one column: menu, headline, subhead, button, plan, then the cards. Nothing collides and nothing scrolls sideways. On widescreen the layout is the same as on desktop, with more empty space between the headline and the plan.

**What it's for.** It gets a garden committee to see that Plotwise replaces their waiting-list spreadsheet, and to click "Add your garden".

**Verdict.** The fixes worked. The phone layout no longer breaks, the card titles now read as labels, and "free" no longer suggests that a plot costs no rent. The biggest thing left is the plot plan. It still shows only which plots are empty, not the offer to the next person in line that the headline sells.

**Finding status**
- narrow-layouts-break: open, by the measure only. Page width is now 390 on the phone and 768 on the tablet, the phone menu links are 31 px tall on their own row with no overlap of the logo, and the cards stack one per row on the phone and two per row on the tablet. But the card descriptions measure 41 to 42 characters per line on the phone and 41 to 44 on the tablet, which misses the check's 45. Two-line card blurbs at 41 to 44 characters read comfortably, so this no longer noticeably harms the page.
- card-titles-match-descriptions: closed. In all four viewports, `div.cards h3` is now weight 500 and #2f3a2c, and "Waiting list" reads as a label above its description.
- free-means-two-things: closed. The subhead says "the day it falls empty", the second card says "An empty plot", and the legend says "Empty". No text can be read as rent-free.
- picture-shows-empty-plots-not-queue: open. The plan and its title "Elm Row Gardens, plots 1 to 12" have not changed, and it still shows only that plots 3 and 8 are empty.
- card-two-widow: closed. The last line holds "say yes." on desktop and "has a week to say yes." on the tablet.
- headline-touches-plan: closed. On the phone the plan sits under the button, with clear space below the headline.
- taken-swatch-too-faint: closed. The "Taken" swatch now has a thin visible outline and reads as a key mark on white.
- rent-due-in-march-unclear: open. The card still says "before rent is due in March", and the text does not say whose date that is.

**New problems.** None.

**What would move it most**
1. The plot plan at the right of the headline on desktop and widescreen, and under the button on the phone and tablet. The viewer sees a status map with two green plots. The headline and subhead promise a queue and an automatic offer, so the main picture only illustrates "garden" and not what Plotwise does. The fix is to let the plan show the moment of the offer, or to make its title say what is happening. For example, the title could say that plots 3 and 8 are being offered to the next growers in line, which repeats the subhead's own claim. Any names, dates or queue positions must come from the maker. Taste. Viewports: desktop, phone, tablet, widescreen.

**Smaller things.**
- The third card's description: if March is only Elm Row's date, say so, or say that each garden sets its own rent date. Viewports: desktop, phone, tablet, widescreen.
- The card descriptions on the phone and tablet run at 41 to 44 characters per line, just under the check's 45. Leave them as they are unless the card width changes for another reason. Viewports: phone, tablet.

**What's working.**
- The single-column order on the phone (menu row, headline, subhead, button, plan, cards) keeps the reading order of the desktop page and removes every collision.
- The darker, heavier card titles now separate each label from its sentence without a change in size, so the card row stays quiet.
- The serif headline next to the plain Inter body gives the page one clear entry point and a friendly, garden-committee tone.
