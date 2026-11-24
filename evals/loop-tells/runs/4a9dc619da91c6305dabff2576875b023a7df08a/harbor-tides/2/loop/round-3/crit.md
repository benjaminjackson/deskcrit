**First read.** The eye lands on the two-line headline "Tide times your harbor office can stand behind", drops to the dark teal "Set up your harbor" button, then crosses to the "Today at Porthmellin" tide table. It reads as a sober, plain landing page for a tide service sold to harbor offices, and it feels calm and useful. On the tablet and the phone everything stacks into one column. The table sits under the button, and the three notes now stack one under the other with a rule above each.

**What it's for.** It persuades a harbor master or harbor office to set up Tidewell as the one page their berth holders check for tides, lock gate times, depth and notices.

**Verdict.** This round fixed the tablet layout: the notes now read at a comfortable line length and the card now spans the full content width. The two things that decide whether a harbor master believes the pitch are unchanged. The card still shows only a tide table, and the copy still does not say what the card is or why Tidewell beats what the office does now.

**Finding status**
- card-shows-only-tides: open. The card still has only four tide rows (low and high water with times and heights) and no gate times, depth reading or notice, at desktop, tablet and widescreen.
- tablet-notes-narrow-columns: closed. On the tablet the notes now stack in one column, and each line holds 65 to 71 characters (`characters_per_line`, `section.points > div.point > p`). The check asks for 30 or more.
- copy-comparison-and-proof: open. The hero paragraph and the card title "Today at Porthmellin" are word for word as before. There is no label saying this is the page berth holders see, no line comparing Tidewell with the office's current method, and no named source for the tide predictions, at any viewport.
- tablet-card-right-edge: closed. On the tablet the card now runs from x 64 to x 704, in line with the nav and the note rules.
- tablet-hero-line-too-long: closed. The tablet hero paragraph is now 69 characters per line (`characters_per_line`, `div.hero-text > p`, 520 px wide).

**New problems.** None.

**What would move it most**
1. The card shows only tides (card "Today at Porthmellin"). The headline promises tide times the office "can stand behind", and the paragraph promises lock gate times, pontoon depth and notices on one page. The only proof on screen is a tide table, which any almanac or free app already gives. A harbor master comparing the promise with the picture sees nothing they don't already have, so the button asks them to trust words the page doesn't show. Add the gate times, a depth reading and one notice to the card, so it looks like the page berth holders would open. The example values must come from the maker. Defect. Viewports: desktop, tablet, widescreen
2. The copy has no comparison and no proof (hero paragraph and card title). A stranger cannot tell whether Porthmellin is a customer, a demo or a sample harbor. Nothing sets Tidewell against what the office does now, such as a chalkboard, a printed table or answering phone calls. And "can stand behind" rests on a source of tide predictions that the page never names. Label the card as the page berth holders see, and add one line that sets Tidewell against the office's current method. The source of the predictions is a fact only the maker has, so the maker must supply it. Taste. Viewports: all

**What's working.**
- The table card is a real product view, not a decorative illustration. It has right-aligned times and heights, units on every height and quiet row rules, so it reads as a working tool.
- On the tablet the single-column stack of notes now matches the phone. Each note reads in one or two comfortable lines, and the rules above them line up with the card and the nav.
- There is one teal action and one headline, with no competing accents. Nothing on the page fights the button for the eye.
