**First read.** The eye lands on the headline "Tide times your harbor office can stand behind", moves right to the "Today at Porthmellin" tide card, then drops to the teal "Set up your harbor" button. It reads as a calm, plain product page for harbor offices. On desktop and widescreen, the hero has a wide empty gap between the text and a card that is now narrower. On the phone, everything stacks into one clean column. On the tablet, the content now stops 80 px short of the nav's right edge.

**What it's for.** The page gets a harbor master to set up Tidewell, so that the office posts tides, lock gate times and pontoon depth on one page that berth holders can check.

**Verdict.** The layout fixes worked. The tablet notes now read well, and the card sits on the feature grid. But the two copy findings were not touched, and they matter most. The page still asks the office to "stand behind" numbers without saying who works them out or where they come from.

**Finding status**
- headline-trust-unbacked: open. The copy is the same at all four viewports. "Gate openings are worked out from each tide" still has no subject, and nothing on the page says where the tide data comes from or what the office checks.
- feature-notes-narrow-tablet: closed. On the tablet the notes now sit one per row, with headings at y 774, 904 and 1011. The measured line lengths are 76, 74 and 71 characters.
- table-does-not-say-what-it-is: open. There is still no line under "Today at Porthmellin" at any viewport.
- panel-off-feature-grid: closed. The card's left edge is at x 837 on desktop and x 1157 on widescreen. These match the left edge of the third feature column exactly.

**New problems.**
- Desktop and widescreen: to get onto the grid, the card shrank from 472 px to 298 px. The Time and Height columns are now 67 px and 63 px wide, so the numbers sit close together. A 173 px empty gap opens between the hero text (which ends at x 664) and the card (x 837). The page's best evidence now looks like a small sidebar.
- Tablet: the hero, card and notes now stop at x 624, but the nav runs to x 704. The right edge of the content no longer lines up with the nav, and an 80 px empty strip sits down the right side. Before the fix, the card ran to x 704.

**What would move it most**
1. Headline trust not backed (the headline and the "Lock gate times" note). A harbor master reads "can stand behind", then reads "Gate openings are worked out" with no one doing the working out. They cannot tell whether this means more work for the office or a black box they cannot vouch for. A claim of trust needs its evidence next to it (Nielsen: match between the system and the real world; plain-language guidance against an agentless passive). Fix: give the verb its subject, and add one line that says where the tide data comes from and what the office checks or approves. Only the maker has those facts. Defect. Viewports: desktop, phone, tablet, widescreen.
2. The table does not say what it is (the "Today at Porthmellin" heading). A visitor can read the card as today's real tides or as a weather widget, not as the page their berth holders will see. One short line under the heading that says it is a sample of what berth holders see would fix this. Convention. Viewports: desktop, phone, tablet, widescreen.

**Smaller things.**
- The tide card is cramped at 298 px on desktop and widescreen. Make the card span the second and third feature columns (from x 491 on desktop, x 811 on widescreen), so that it stays on the grid and gets its width back. Viewports: desktop, widescreen.
- The tablet content stops at x 624 while the nav ends at x 704. Let the content column run the full 640 px between the nav's edges. The notes will still read well at that width. Viewports: tablet.

**What's working.**
- The tide table: bold tabular times, right-aligned heights with units, and thin rules between rows. It is real, scannable evidence of the product, and the strongest thing on the page.
- Stacking the feature notes one per row on the tablet. This removed the staircase effect and gives comfortable line lengths without a new element.
- One quiet teal button as the only call to action. Nothing competes with it.
