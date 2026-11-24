**First read.** The eye lands on the serif headline, then goes right (or down, on phone and tablet) to the two dark green plots, 3 and 8, and then to the green "Add your garden" button. It reads as a calm, plain landing page for a tool that runs community garden waiting lists, with a small plot map that shows the product's job at a glance. Below the hero, "What Plotwise does" now reads as a section heading, and four cards each name one feature. On phone and tablet, everything stacks in one column: headline, text, button, map, then the cards, which sit one per row on phone and two by two on tablet. Widescreen keeps the desktop layout, centred.

**What it's for.** It gets a garden manager to see that Plotwise replaces the waiting-list spreadsheet, and to click "Add your garden".

**Verdict.** The fixes worked. The page now fits every screen, the features scan, and the plot map is clear without the colour. Nothing left would noticeably change how well the page does its job.

**Finding status**
- phone-layout-overflow: closed. On the phone, the page is 390 px wide on a 390 px viewport. The cards set 40 to 42 characters per line, and the phone facts list no violations, so there is no target-size entry for the nav links.
- headings-look-like-body: closed. At all four viewports, the h2 is 24 px in #2f3a2c and the card titles are weight 500 in #2f3a2c, while the body text is weight 400 in #55604f. A 6 px gap opens between each title and its text, so the four features read as four labelled items.
- free-reads-two-ways: closed. The paragraph says "an empty plot", the legend says "Empty", and the Plot offers card says "An empty plot goes to…". Each one reads only as vacant.
- hero-columns-do-not-scale: closed. On widescreen, the paragraph ends at x 894 and the map title starts at x 993, a gap of 99 px. On tablet, the map stacks under the text, the plots are all 75 px wide, and the map sits about 109 px below the paragraph.
- map-edge-unaligned: closed. On desktop and widescreen, the map's left edge (x 652 and x 972) lines up with the left edge of the third card.
- plot-offers-runt: closed. On desktop, the last line is "say yes.", which is two words. On tablet, the text sets in two full lines.
- free-taken-color-only: closed. The empty plots now carry the word "Empty" in white, weight 500, in all four images. This is a real second cue, not a decoration.
- march-reminder-wording: closed. The card now says "Each grower gets a reminder before their rent is due." This has one reading, with no month and no count.

**New problems.** None.

**What would move it most**
None.

**Smaller things.**
- On tablet, the plot map card ends at x 584 while the card grid below ends at x 704. The map's right edge lines up with nothing. Let the map take the full content width, or match the headline column on purpose. Viewports: tablet.
- In the map legend, the "Taken" swatch is a very pale grey on white and nearly disappears. Darken it to the same fill as the taken plots, with a hairline border if needed. Viewports: desktop, phone, tablet, widescreen.

**What's working.**
- The plot map shows the product instead of telling about it. With "Empty" written on plots 3 and 8, it explains what Plotwise does in one look.
- The type has a clear order: a serif headline and section heading, darker medium-weight card titles, and lighter body text. A skimmer now picks out the four features without reading the sentences.
- Using one green for the button and the empty plots ties the call to action to the thing the product hands out.
