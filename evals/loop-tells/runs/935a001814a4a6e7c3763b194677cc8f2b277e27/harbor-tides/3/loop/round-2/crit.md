**First read.** On every viewport the eye lands on the headline first. Then it moves to the "Today at Porthmellin" tide table, which is now set at reading size beside the headline (below it on phone and tablet), and then to the button. The page reads as a calm, plain product page with real data near the top. On desktop the hero feels full. On widescreen the table sits in the middle and leaves a band about 620 px wide empty to its right. On tablet and phone everything stacks into one column with no sideways scroll, and on tablet the hero text leaves the right side of the screen empty.

**What it's for.** It should get a harbor master to trust Tidewell enough to set up a page for their harbor, on any screen they use.

**Verdict.** The fixes helped a lot. The page now reflows, the table is the readable proof in the hero, and the type and grid are in order. The biggest thing still in the way is trust: the page asks the harbor master to stand behind the numbers, but it still does not say where the numbers come from. After that, the hero shows only tides, not the lock gate times and pontoon depth that make Tidewell different.

**Finding status**
- layout-does-not-reflow: open. The sideways scroll is gone (phone page_width is 390) and the tablet paragraphs measure 65 to 69 characters per line. But the phone paragraphs measure 43, 41 and 47, so two of them miss the 45 in the check. That shortfall comes from the width of a phone, not from the layout.
- hero-does-not-show-product: open. The tide table is now the hero visual at 15 px and fills the desktop hero. But it shows only tides, with no lock gate times or pontoon depth. On widescreen about 620 px to the right of the table is empty, and on tablet the area beside the headline is empty.
- type-scale-five-sizes: closed. There are 4 sizes (30, 19, 15 and 13 px) at all viewports. The h2 and the h3 headings are all 19 px weight 500, above the 15 px body text.
- copy-gives-no-reason-to-trust: open. The copy has not changed. There is still no source for the tide data, nobody named who works out the gate times, no label that marks the table as an example, and nothing about setup effort next to the button.
- table-header-contrast: closed. The headers now measure 7.31:1 (#4d585e) at all four viewports.
- table-figures-alignment: closed (looks). Times and heights are flush right and the colons and digits line up down the column, so the figures look tabular.
- lower-row-one-grid: closed (looks). The lower row is now three equal columns: 352 px with a 48 px gap on desktop, and starting at 64, 677 and 1291 on widescreen. The second column starts on the same left edge as the table above it.
- lower-row-baselines: closed (looks). The three h3 headings sit at y=493 and the paragraphs at y=525 on desktop and widescreen, so the baselines line up across the row. The table is no longer in that row.
- phone-nav-wraps: closed. The phone nav now fits on one line beside the logo.

**New problems.** None. The fixes changed or added the table rules, the darker headers, the larger h3 headings and the larger table text. None of these is a template tell, and none breaks the elements next to it.

**What would move it most**
1. **The copy still gives no reason to trust the numbers.** Where: the headline, the table and the button. The headline promises tide times "your harbor office can stand behind". But a harbor master who answers for those numbers cannot see where the tide data comes from or who works out the gate times. "Today at Porthmellin" reads as a live harbor, not as a sample, and nothing next to "Set up your harbor" says what setup takes. The fix: name the tide data source and who works out the gate times, label the table as an example of a Tidewell page, and put the setup effort on one line next to the button. The maker must supply all three facts. Defect. Viewports: desktop, phone, tablet, widescreen.
2. **The hero shows only tides, and on wide screens it leaves an empty area.** Where: the "Today at Porthmellin" table, and the space to its right on widescreen and beside the headline on tablet. Any tide site shows tide times. The lock gate times and the pontoon depth, which the copy names as what Tidewell adds, are not on the page that berth holders see. On widescreen the empty right third looks like something did not load (Arnheim on balance). The fix: make the hero visual the full berth holder's page, with the tides plus the day's gate openings and the pontoon depth, and let it span the empty area on widescreen. Defect. Viewports: desktop, tablet, widescreen.

**Smaller things.**
- The tide table ends at x=1024 on desktop, partway through the third column (864 to 1216). End it on a column edge, either 816 or 1216. Viewports: desktop.
- On tablet the hero text (400 px), the table (560 px) and the point paragraphs (510 px) end at three different right edges. Give them one shared width. Viewports: tablet.
- On the phone, two point paragraphs run 41 and 43 characters per line, a little under the 45 in the check. On a 390 px screen this is normal, so leave it. Viewports: phone.

**What's working.**
- Moving the tide table into the hero at 15 px with flush-right tabular figures. The proof is now the second thing the eye reads, and the times can be compared down the rows.
- The single-column stack on phone and tablet. The page now works from the quay, which is the whole promise of the product.
- The restrained type and color: four sizes, two text grays and one teal button. These keep the page sober and believable for an audience that answers for the numbers.
