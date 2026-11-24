**First read.** The eye lands on the headline "Tide times your harbor office can stand behind", then moves right to the gray card with today's tides at Porthmellin, then back to the dark teal "Set up your harbor" button. The page now reads as a calm, plain tool for harbor offices: the words on the left and the product's own data on the right, in balance. The three feature notes below are quiet and even. On the phone everything stacks in one column with no sideways scroll. On the tablet the table moves under the button, and the three notes stay as three narrow columns.

**What it's for.** It gets a harbor master to set up Tidewell by showing the public page that berth holders will check from the quay (taken from the work order's crit).

**Verdict.** The fixes helped a lot. The phone page reflows, and the desktop and widescreen heroes are balanced, with the tide table readable at 15 px beside the headline. The biggest thing still in the way: the hero shows only tides. A harbor master still cannot see the lock gate times, the depth or a notice that the copy promises. Next to that, the tablet still crams the three notes into strips about 20 characters wide.

**Finding status**
- phone-layout-no-reflow: open. It is closed on the phone: page_width is 390 at a 390 px viewport, and the notes run 41 to 47 characters per line. It is open on the tablet, where the three notes are still 181 px columns at 19.7 to 23 characters per line, 3 to 4 lines deep, under the 30 the check needs.
- product-not-shown: open. On desktop and widescreen the tide table now fills the right side of the hero at 15 px. But it shows only tides: no gate times, no depth and no notice. On the tablet the table sits below the hero, not beside the headline.
- copy-no-comparison: open. The copy is unchanged. Nothing says the table is the page berth holders see, nothing compares Tidewell with how the office posts tides now, and the source of the tide predictions is not named.
- table-header-contrast: closed. "Tide", "Time" and "Height" measure 6.8:1 at all four viewports.
- type-sizes-too-close: closed. The table title (h2) and the feature headings (h3) are both 18 px at all four viewports, and the page has three type sizes.
- feature-headings-weak-step: closed. The headings are 18 px in #2b3236 over 15 px text in #4d585e. Weight is still 500 against 400, but the color differs, which meets the check at all four viewports.

**New problems.** None. The two new elements are a gray card with a 1 px border around the table, and thin rules above the three notes. Both are plain, with no glow, gradient or tint, so neither is a template tell.

**What would move it most**
1. Show the whole public page in the hero, not only the tides. This is the card "Today at Porthmellin" beside the headline. Right now it shows four tide rows, while the copy and the three notes promise gate times, the depth at the pontoon and notices. A harbor master judging "can stand behind" still sees only a tide table, which any almanac gives. Add the gate times, a depth reading and one notice to the card, so it looks like the page berth holders will open. The example values for these must come from the maker; do not make them up. On the tablet, the card can stay under the hero, but it must show the same content. Defect. Viewports: desktop, tablet, widescreen.
2. Stack the three notes on the tablet. These are "Lock gate times", "Depth at the pontoon" and "Notices" at 768 px. Each is a 181 px column at about 20 to 23 characters per line, so the reader's eye jumps back every three or four words, and the rags are uneven ("the / tides."). Use the phone's one-column stack, or two columns, at this width. Source: Bringhurst, 45 to 75 characters for a line. Defect. Viewports: tablet.
3. Let the copy carry the comparison and the proof. This is the hero paragraph and the table title. A stranger cannot tell whether Porthmellin is a customer, a demo or their own harbor, and nothing sets Tidewell against a chalkboard, a printed table or phone calls. Label the card as the page berth holders see, and add one line against the office's current method. Name where the tide predictions come from: only the maker has that fact. Taste. Viewports: desktop, phone, tablet, widescreen.

**Smaller things.**
- On the tablet, the table card stops at x 624 while the nav and the notes run to x 704, so its right edge is off the column. Make the card the full content width. Viewports: tablet.
- On the tablet, the hero paragraph runs at 77 characters per line, just over 75. Narrow it a little. Viewports: tablet.

**What's working.**
- The table puts times and heights in right-aligned columns at weight 500, with thin row rules. That makes it quick to scan from the quay, and it is the most honest proof on the page.
- The phone layout is now one calm column: headline, button, table, notes. The line lengths are comfortable, and there is no sideways scroll.
- Only one element uses the teal: the button. So the single action is easy to find.
