**First read.** On desktop the eye lands on the headline at top left, drops to the teal "Set up your harbor" button, and then drifts into a big empty right half. It reads as a calm, plain landing page for a harbor tool. The one piece of real proof, the "Today at Porthmellin" tide table, sits small and gray in the lower left, and you can miss it. On the phone the page is wider than the screen, and the three feature columns are squeezed into strips of one or two words per line.

**What it's for.** A landing page that gets harbor masters to set up Tidewell, so their berth holders can check tides, lock gate times and pontoon depth from the quay.

**Verdict.** The words are good, but the page does not hold together on the device its own copy names: berth holders checking "from the quay" are on phones, and there the page scrolls sideways and the feature text falls apart. On larger screens the product is described more than shown, and the sample is the smallest thing on the page.

**What would move it most**
1. **The phone and tablet layouts break.** On the phone the page is 676 px wide in a 390 px viewport, so it scrolls sideways (facts note, phone). This fails WCAG 1.4.10 Reflow. The three feature columns do not stack. They shrink to 65–69 px wide, at 4 to 7 characters per line and 10 to 12 lines each (`characters_per_line`, `div.points > div.point > p`, phone). Bringhurst gives 45 to 75 characters per line. The headings break mid-phrase as "Lock / gate / times" and "Depth at / the / pontoon". The Notices column runs right up to the page edge. The four nav links wrap into a 2×2 block beside the logo. On the tablet there is no sideways scroll, but the columns are 76 px wide at 6.6 to 7.3 characters per line, so they still read one word at a time. Someone on the quay has to scroll sideways and then read a column of single words. Many will not. This is a defect. Fix: below tablet width, stack the tide sample and the three points into one column, and keep the nav to one line or put it behind a menu. Viewports: phone, tablet
2. **The hero's right side is empty, and the proof is pushed down and shrunk.** On desktop the right two-thirds of the hero is blank. At widescreen all the content sits in the left 470 px of a 1920 px screen. The page tips hard to the left (Arnheim, *Art and Visual Perception*, on balance), and after the button the eye has nowhere to go. If a picture is meant to go there, it did not render, and you should check it in a live browser. If nothing is meant to go there, the space is dead. Meanwhile the "Today at Porthmellin" table is the only thing that shows the product, and it is set at 12 px under a 13 px heading. That is the smallest text on the page, smaller than the 15 px feature headings next to it (`font_size`, `h2` and `tbody td`, all viewports). So the proof reads as a footnote. This is a defect. Fix: move the sample harbor page up into the empty right half of the hero, and set it at least at body size, so the first screen shows what a berth holder would see. Viewports: desktop, tablet, widescreen
3. **The sample shows the one thing that is not different.** Any tide table gives you tide times. What sets Tidewell apart is in the three paragraphs: gate times worked out from each tide, hourly depth from one sounding, and notices on the same page. None of that appears in the sample, so the viewer has to take those claims on trust. The page also never sets Tidewell next to what the harbor office uses now to post these things, so a harbor master can't judge the gain on terms they already accept. Taste, with a copy point. Fix: make the sample show the whole page a berth holder gets, with gate times, pontoon depth and a notice in it. Add a comparison with the office's current way of posting these, and you, the maker, supply the specifics. Viewports: all

**Smaller things.**
- The table column headers "Tide / Time / Height" are #7a858b at 12 px, 3.78:1 (`thead > tr > th`, in violations). That is under the 4.5:1 WCAG 1.4.3 asks for. Darken them to the body gray. Viewports: all
- There are five type sizes, 30/19/15/13/12, and 13 and 12 are too close to read as different levels (Bringhurst 3.1.1). Use three or four sizes, and let the table heading match the 15 px feature headings. Viewports: all
- "Today at Porthmellin" (13 px) and the feature headings (15 px) start at the same top (y 503) but sit on different baselines, so the lower row starts with a small step. Put them on the same baseline. Viewports: desktop, widescreen
- The apostrophe in "day's" in the hero paragraph is straight. Use a curly one. Viewports: all

**What's working.**
- The copy talks in the harbor's own terms and lands on the reader. "Posted before the first boat asks" and "Enter one sounding and Tidewell shows the depth for every hour of the day" each name a real moment in their day. Keep that voice.
- There is one primary action, and it is clear: a single teal button at 7.06:1 contrast (`a.button`), with nothing else competing for it.
- On desktop the hero paragraph reads easily: 15 px, about 54 characters per line, line height 1.55 (`div.hero-text > p`).

**Where it could go further.**
1. **Make the headline's promise visible in the sample.** Builds on finding 3. The headline is "Tide times your harbor office can stand behind", but nothing in the "Today at Porthmellin" sample shows who stands behind it. A stronger version would put the harbor office's own mark on the sample: who posted it and when it was last updated. For the harbor master, that turns the claim into something they can picture with their own office's name on it. It is also the thing that would make them hand it to berth holders. The maker supplies the attribution and timestamp content. Taste. Norman, *The Design of Everyday Things*, argues that people trust what they can see and check.
2. **Let one tide lead.** Builds on finding 2. The four rows of the sample (Low water 00:20, High water 06:12, Low water 12:31, High water 18:40) all carry the same weight. Someone on the quay wants the next tide and nothing else. A stronger sample would make the coming tide the dominant figure, in the teal that today is used only on the button, and leave the rest of the day as quiet context. That makes the sample read in one glance, the way it would be used. The teal then means "what matters now" across the page, not just "click here". Taste. Tufte, *The Visual Display of Quantitative Information*, on making the data, not the frame, carry the emphasis.

**Couldn't judge from a still.** I could not see focus states on the nav links and the button. I also could not see widths between 390 and 768 px, where the feature columns start to squeeze, so check those in a live browser.

**Checklist.**
The whole piece: 8 lines, 7 yes, 1 no (main image and headline make one idea)
What matters first: 3 lines, 2 yes, 1 no (distinct levels)
Arrangement and space: 13 lines, 8 yes, 5 no (baselines across columns; margin from edge; white space gathered; balance; eye path)
Text: 30 lines, 25 yes, 5 no (contrast; line length; rag; heading line breaks; quotes)
Color: 9 lines, 9 yes
Pictures: 12 lines, 12 yes
Charts and data: 16 lines, 16 yes
Interface: 33 lines, 30 yes, 2 no (platform conventions; fits screen width), 1 unsure (focus visible)
Template tells: 10 lines, 10 yes
