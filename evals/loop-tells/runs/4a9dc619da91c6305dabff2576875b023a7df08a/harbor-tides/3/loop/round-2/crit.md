**First read.** On desktop the eye lands on the headline "Tide times your harbor office can stand behind", then goes right to the pale gray panel "Today at Porthmellin", where the bold times hold it. After that it drops to the three feature notes under their thin rules. The page now reads as a calm, plain product page that puts its proof next to its promise, and the right half no longer looks like a picture that failed to load. Widescreen is the same layout in a centered column. On tablet and phone everything stacks into one column: the hero, then the table panel, then the notes. On the phone this works well, but on tablet the notes are squeezed into three narrow columns.

**What it's for.** The page gets a harbor office to set up Tidewell. It does this by showing that Tidewell posts tides, gate times and pontoon depth on one page that berth holders can check from the quay.

**Verdict.** The fixes helped a lot. The page no longer scrolls sideways on the phone, and the sample table is now the second thing you see instead of the smallest. The biggest problem left is the headline's promise of trust: nothing on the page backs it. After that, the feature notes are still too narrow on tablet.

**Finding status**
- no-reflow-on-narrow-screens: open. It is closed on the phone: the page is 390 px wide, matching the viewport, and the notes run 41 to 47 characters per line. It is still open on tablet, where the page is 768 px wide but the three notes sit in 181 px columns at 19.7 to 23 characters per line, below the target of 30.
- proof-table-small-hero-empty: open, but close. On desktop and widescreen the table fills the hero's right half, with body text at 17 px and a 19 px heading that matches the feature headings. On tablet it stacks full width under the hero, so there is no hole. The part still missing is the target's line that says this is what berth holders see.
- headline-trust-unbacked: open. The note still says "Gate openings are worked out from each tide" without saying who works them out. The page still says nothing about where the tide data comes from, what the office checks, or what Tidewell replaces.
- table-headers-low-contrast: closed. The table headers now measure 6.79:1 in all four viewports.
- feature-headings-barely-differ: closed. The feature headings are now 19 px at weight 500 over 15 px body text at weight 400, in all viewports.
- type-scale-twelve-and-thirteen: closed. Only 13 px is left on the type scale; 12 px is gone in all viewports.
- uneven-gutters: closed (by eye). The table has moved out of the lower row, so there is no longer a gutter after it. The three feature columns sit about 47 px apart on desktop and widescreen.

**New problems.** None. The fixes added a pale gray panel with a 1 px border and a small corner radius around the table, and a thin rule above each feature note. I checked both against the checklist, including the "Template tells" section. Neither has a stock effect: there is no glow, gradient or colored edge. The panel holds one group only.

**What would move it most**
1. **The headline promises trust and nothing backs it.** This is in the headline and the "Lock gate times" note. A harbor master who reads "can stand behind" next to "Gate openings are worked out from each tide" cannot tell who does the working out. They have to guess whether it is more work for the office or a black box they cannot vouch for. Nothing sets Tidewell next to what the office does today. Fix: give the verb its subject ("Tidewell works out gate openings from each tide…", if that is true). The maker has to supply where the tide data comes from, what the office checks or approves, and what the office does now. None of these should be made up. Defect. Viewports: desktop, phone, tablet, widescreen.
2. **The feature notes are too narrow on tablet.** This is the lower row at 768 px. Each note is 181 px wide, about 20 characters per line, and runs four lines. "Depth at the pontoon" wraps to two lines, which pushes its note 24 px below the other two, so the row looks like a staircase. A reader gets broken, jumpy lines exactly where the product is explained. Sources: Bringhurst on measure; Hochuli on staircases. Fix: below a width where each note gets at least 30 characters per line, stack the notes in one column the way the phone layout does, or set them two and one. Defect. Viewports: tablet.
3. **The table does not say what it is.** This is the "Today at Porthmellin" panel. A visitor can read it as today's real tides, or as a widget, rather than as the page their berth holders would see. The page's best evidence then explains less than it could. Fix: add one short line under the heading that says this is a sample of what berth holders see. Convention. Viewports: desktop, phone, tablet, widescreen.

**Smaller things.**
- The table panel's left edge on desktop (x 664) does not line up with any feature column (491, 837), so the hero and the lower row sit on two different grids. Fix: start the panel on the edge of the second or third feature column, or make the columns of the two rows share a width. Viewports: desktop, widescreen.

**What's working.**
- The table in the hero puts the proof right next to the promise, and the bold times are the clearest data on the page.
- The phone layout is plain and readable all the way down: one column, comfortable line lengths, and the call-to-action button above the fold.
- The headings now step clearly down the page: headline at 34 px, panel and feature headings at 19 px, body text at 15 px. Each level reads as its own level.
