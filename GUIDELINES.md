# deskcrit: guideline catalog

The guidelines the seven first-party packs encode, one domain per section.

Each guideline has four parts. **Rule** is the testable form a reviewer would apply. **Source** is the original book, standard, or paper, not a blog that repeats it. **Link** appears when the source is online or is not a well-known book. **Judged by** says how the rule becomes a Jev question. `askable` means the rule is asked as written. `askable as a visual judgment` means the rule carries a figure (a ratio, a pixel size, a count) that `deskcrit` does not check. Jev is asked only whether the defect is visible. An exact result needs a measuring tool such as axe-core.

Scope: the design, not the writing. There is no content design section: reading level, sentence length, tone, and terminology belong to a content linter, so that research was dropped. Nielsen's heuristics are kept whole, including the ones that touch wording, because those are usability judgments about the screen rather than prose rules. `deskcrit` does no measurement of its own: it prepares the image, asks the questions, and reads the answers. Rules that are pure formulas, need the DOM, or need a running app are not in this catalog. An entry marked **Not encoded (NG-10)** stays in the catalog as research, but no pack encodes it, because it reads what the content says, needs detail too fine to see, or cannot be judged from one image (PRD NG-10). The mark says which.

Every source was checked against the web in a second pass. A source that could not be confirmed is marked `UNVERIFIED:` in place. Rules that the research flagged as folk wisdom (rule of thirds, golden ratio, Z-pattern) are labelled in their own entries and should carry low weight.

---

## Typography, legibility, and readability: guidelines for deskcrit

### Body text size
- **Rule:** Body text on screen is at least 16 CSS px, and never below 14 px for sustained reading. Printed body text sits around 10–12 pt. Body text on projected slides is no smaller than 18–24 pt.
- **Source:** Butterick, *Practical Typography*, "Point size" (print body 10–12 pt; web body 15–25 px; the 16 px floor here is crit's own); Apple, *Human Interface Guidelines*, Typography (iOS default body 17 pt, minimum 11 pt); Material Design 3, *Typography* (body large 16 sp).
- **Link:** https://practicaltypography.com/point-size.html
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Minimum size for secondary and UI text
- **Rule:** Captions, labels, and legal text must not fall below about 11–12 px (11 pt on iOS, 12 sp on Material). Anything smaller is a defect unless it is purely decorative.
- **Source:** Apple, *Human Interface Guidelines*, Typography (minimum 11 pt); Material Design 3, *Typography* type scale (label small 11 sp, body small 12 sp).
- **Link:** https://developer.apple.com/design/human-interface-guidelines/typography
- **Judged by:** askable as a visual judgment only. Jev is asked about captions and labels that look too small to read. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.

### Line length (measure)
- **Rule:** Single-column body text should run 45–75 characters per line (66 is ideal); multi-column text works at roughly 40–50. Lines over about 80 characters, or under about 30 for prose, should be flagged.
- **Source:** Bringhurst, *The Elements of Typographic Style* (1992), section 2.1.2 "Choose a comfortable measure" (45–75 acceptable, 66 ideal, 40–50 for multiple columns, justified text rarely below 40, ragged below 30 looks anorexic); Butterick, *Practical Typography*, "Line length" (45–90 characters); WCAG 2.2 SC 1.4.8 (no more than 80 characters per line, AAA).
- **Link:** https://practicaltypography.com/line-length.html
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Line height (leading) for body text
- **Rule:** Body text line height should be 120–145% of the font size (about 1.2–1.45 in CSS, up to 1.5 for long measures or large x-height faces). Solid or tighter setting for paragraphs is a defect.
- **Source:** Butterick, *Practical Typography*, "Line spacing" (120–145% of point size); WCAG 2.2 SC 1.4.8 (line spacing at least 1.5 within paragraphs, AAA); Bringhurst, *The Elements of Typographic Style*, section 2.2.1.
- **Judged by:** askable as a visual judgment only. Jev is asked about body text that looks cramped or loose. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.

### Heading line height and tight display setting
- **Rule:** Multi-line headings should be set tighter than body text (about 1.0–1.3), and must not collide ascenders and descenders between lines.
- **Source:** Lupton, *Thinking with Type* (2004, 2nd ed. 2010), "Text" chapter, "Line spacing"; Hochuli, *Detail in Typography*, "Linespacing" chapter.
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Limit the number of typefaces
- **Rule:** Use at most two typeface families (often one is enough), varying weight, size, and style for contrast. Three or more families in one design is a flag.
- **Source:** Butterick, *Practical Typography*, "Mixing fonts" (most documents tolerate a second font, few a third); Lupton, *Thinking with Type*, "Letter" chapter, "Mixing typefaces".
- **Link:** https://practicaltypography.com/mixing-fonts.html
- **Judged by:** askable.

### Typeface pairing: contrast without clash
- **Rule:** When two families are paired, they should differ clearly (for example serif with sans, or text with display) rather than being near-identical. Two similar serifs or two similar sans are a mismatch, and pairs work best sharing proportions or x-height.
- **Source:** Lupton, *Thinking with Type*, "Letter" chapter, "Mixing typefaces"; Bringhurst, *The Elements of Typographic Style*, section 6.5.5 (pair serifed and unserifed faces on the basis of their inner structure); Butterick, "Mixing fonts" notes that two different serifs can also work.
- **Judged by:** askable.
- **Not encoded (NG-10):** breaks NG-10 because telling two faces apart by their inner structure and x-height needs letterform detail too fine to see.

### Typeface suits the task and tone
- **Rule:** Body text uses a face designed for reading (open apertures, distinct letterforms, sturdy proportions). Decorative, script, blackletter, or extra-condensed faces are for headlines or brief accents only, never for paragraphs.
- **Source:** Bringhurst, *The Elements of Typographic Style*, chapter 6 "Choosing & Combining Type", section 6.2.1 (choose faces that suit the task); Butterick, *Practical Typography*, "Bad fonts" and "Goofy fonts".
- **Link:** https://practicaltypography.com/bad-fonts.html
- **Judged by:** askable.

### Default or system-font fallback
- **Rule:** Text set in an unconsidered default (Times New Roman, Arial, Calibri) without evidence of choice is a weak signal. Flag it when a face looks like an unintentional fallback, such as a serif in a UI that is otherwise sans.
- **Source:** Butterick, *Practical Typography*, "System fonts" (avoid if you can; system fonts are overexposed and many are poor).
- **Link:** https://practicaltypography.com/system-fonts.html
- **Judged by:** askable.
- **Not encoded (NG-10):** breaks NG-10 because it needs Jev to name the typeface, and that needs letterform detail too fine to see.

### Type scale and hierarchy
- **Rule:** Sizes should come from a consistent scale (a modular ratio between about 1.125 and 1.618, or a fixed ramp such as Material's), giving three to six distinct levels. Adjacent levels must differ by at least about 1.2× or by another clear cue such as weight.
- **Source:** Brown, "More Meaningful Typography" (A List Apart, issue 327, 2011) and Brown, *Flexible Typesetting* (A Book Apart, 2018; the author's earlier "Flexible Typography" title was wrong); Bringhurst, *The Elements of Typographic Style*, section 3.1.1 "Don't compose without a scale".
- **Link:** https://alistapart.com/article/more-meaningful-typography/
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Clear visual hierarchy
- **Rule:** A reader should be able to identify the first, second, and third thing to read from size, weight, and position alone. If two competing elements share the same weight and size, the hierarchy fails.
- **Source:** Lupton, *Thinking with Type*, "Text" chapter on hierarchy; Müller-Brockmann, *Grid Systems in Graphic Design* (1981).
- **Judged by:** askable.

### Too many sizes and weights
- **Rule:** More than about six font sizes, or more than three or four weights, in a single view is a flag. Near-duplicate sizes (13 px next to 14 px) signal an inconsistent scale.
- **Source:** Brown, *Flexible Typesetting* (A Book Apart, 2018); Material Design 3, *Typography* (15 baseline styles, plus 15 emphasized variants).
- **Link:** https://m3.material.io/styles/typography/type-scale-tokens
- **Judged by:** askable as a visual judgment only. Jev is asked about a view that visibly mixes many type sizes and weights. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.

### Contrast of weight and size
- **Rule:** Emphasis needs real contrast. Regular next to medium weight, or 16 px next to 17 px, reads as a mistake. Pairs differ by a clear step: 400 against 700 in weight, or about 1.25× in size.
- **Source:** Lupton, *Thinking with Type*, "Letter" chapter, "Scale" and "Type families"; Bringhurst, *The Elements of Typographic Style*, section 3.5.1 (change one parameter at a time); Hochuli, *Detail in Typography*.
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Text contrast against background
- **Rule:** Text needs a contrast ratio of at least 4.5:1 against its background, or 3:1 for large text (18 pt, or 14 pt bold). Text over images or gradients must hold that ratio at its worst point.
- **Source:** W3C, *WCAG 2.2*, SC 1.4.3 Contrast (Minimum); enhanced 7:1 under SC 1.4.6.
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- **Judged by:** askable as a visual judgment only. Jev is asked about text that reads as faint against its background. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.

### Text over images and busy backgrounds
- **Rule:** Text placed on photos or textures needs a scrim, shadow, solid panel, or similarly calm region so every letter stays distinguishable. Text crossing high-detail areas is a defect.
- **Source:** W3C, *WCAG 2.2*, SC 1.4.3 and Understanding SC 1.4.3 (text on images).
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- **Judged by:** askable.

### Light text on dark backgrounds
- **Rule:** On dark backgrounds, avoid pure white on pure black for long text; use slightly softened foreground and consider a modest weight or size and line spacing increase. Thin weights on dark backgrounds need extra size.
- **Source:** Material Design (m2), *Dark theme* guidance (87% opacity white for high-emphasis text and a #121212 surface; confirmed through a search-engine answer quoting the page, which is rendered by script and could not be read with curl); W3C, *WCAG 2.2*, SC 1.4.3.
- **Link:** https://m2.material.io/design/color/dark-theme.html
- **Judged by:** askable.
- **Not encoded (NG-10):** breaks NG-10 because the rule depends on colour values (pure white, pure black, opacity), and Jev is unreliable with colour values (JC-2).

### Weight and stroke thickness at small sizes
- **Rule:** Hairline and ultra-light weights (below about 300) should not be used for text under about 24 px. Small text needs enough stroke thickness to hold up against its background.
- **Source:** Bringhurst, *The Elements of Typographic Style*, section 6.2.3 (very light weights of Helvetica "reduce coarseness but do little to increase readability"); Apple, *Human Interface Guidelines*, Typography (avoid Ultralight, Thin, and Light weights, especially at small sizes). The 300 and 24 px figures are crit's own.
- **Link:** https://developer.apple.com/design/human-interface-guidelines/typography
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### x-height and small-size legibility
- **Rule:** At small sizes, prefer faces with a generous x-height, open counters, and clear letter spacing. A face with a small x-height needs to be set larger (perhaps 1–2 px) than a large-x-height face to reach equivalent apparent size.
- **Source:** UNVERIFIED: no specific Bringhurst section or Hochuli passage on x-height at small sizes could be confirmed (the earlier "Bringhurst 6.2" cite did not match); Bringhurst, *The Elements of Typographic Style*, chapter 6; Hochuli, *Detail in Typography*.
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.
- **Not encoded (NG-10):** breaks NG-10 because x-height is a letterform measurement too fine to see at screen size.

### Letterspacing (tracking) of body text
- **Rule:** Leave tracking at the default for body text. If adjusted, stay within about plus or minus 2% (±0.02em). Tight negative tracking on body text, or loose tracking on lower-case text, is a defect.
- **Source:** Bringhurst, *The Elements of Typographic Style*, sections 2.1.6 and 2.1.7 (letterspace capitals; do not letterspace lower case without a reason); Butterick, *Practical Typography*, "Letterspacing". The ±2% band is crit's own threshold.
- **Link:** https://practicaltypography.com/letterspacing.html
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.
- **Not encoded (NG-10):** breaks NG-10 because differences in tracking are too fine to see.

### Letterspace capitals and small caps
- **Rule:** All-caps and small-cap text should be letterspaced (about 5–12%, 0.05–0.12em), while lower-case text should not. Unspaced all-caps in small sizes looks crowded.
- **Source:** Bringhurst, *The Elements of Typographic Style*, section 2.1.6; Butterick, *Practical Typography*, "Letterspacing" (5–12%, 0.05–0.12em in CSS) and "All caps".
- **Link:** https://practicaltypography.com/letterspacing.html
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.
- **Not encoded (NG-10):** breaks NG-10 because differences in tracking are too fine to see.

### Kerning and display-size spacing
- **Rule:** At display sizes, the spacing between letter pairs must look even (no obvious gaps in pairs such as "AV", "To", "Wa", and no collisions). Automatic kerning should be on.
- **Source:** Bringhurst, *The Elements of Typographic Style*, section 2.1.8 "Kern consistently and modestly or not at all"; Lupton, *Thinking with Type*, "Text" chapter, "Kerning"; Butterick, "Kerning".
- **Link:** https://practicaltypography.com/kerning.html
- **Judged by:** askable.
- **Not encoded (NG-10):** breaks NG-10 because the space between two letters is too fine to see.

### Use of all caps
- **Rule:** Keep all-caps to short strings (a label, a heading of a few words, or an eyebrow). Paragraphs or sentences of more than about 3–5 words in all caps are a flag since they slow reading.
- **Source:** Butterick, *Practical Typography*, "All caps" (fine for less than one line; never whole paragraphs); Bringhurst, *The Elements of Typographic Style*, section 3.2 (numerals, capitals & small caps). The 3–5 word limit is crit's own.
- **Link:** https://practicaltypography.com/all-caps.html
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Italics and bold for emphasis
- **Rule:** Use one emphasis method at a time (italic or bold, not both stacked with underline or caps). Do not set long passages in italic, bold, or underline, and do not underline text that is not a link.
- **Source:** Butterick, *Practical Typography*, "Bold or italic" (use one or the other, as little as possible) and "Underlining"; Bringhurst, *The Elements of Typographic Style*, section 3.5.1 (change one parameter at a time).
- **Link:** https://practicaltypography.com/bold-or-italic.html
- **Judged by:** askable.
- **Not encoded (NG-10):** breaks NG-10 because it needs to know which text is a link and what the writer meant to stress, which is the content.

### Real italics, bold, and small caps (no faux styles)
- **Rule:** Use true italic and bold cuts of a family. Synthesized (slanted or smeared) styles, and fake small caps made by shrinking capitals, are defects.
- **Source:** Bringhurst, *The Elements of Typographic Style*, section 3.4.3 (use artificially sloped romans sparingly or not at all) and 3.2.2 (faked small caps); Butterick, *Practical Typography*, "Small caps" (use real small caps; avoid fakes).
- **Link:** https://practicaltypography.com/small-caps.html
- **Judged by:** askable.
- **Not encoded (NG-10):** breaks NG-10 because telling a true italic or bold from a slanted or thickened regular face needs letterform detail too fine to see.

### Alignment: prefer flush-left (ragged-right) body text
- **Rule:** Left-align body text in left-to-right scripts. Centred text should be limited to short blocks (about three lines or fewer), and right-aligned or fully centred paragraphs are a flag.
- **Source:** Butterick, *Practical Typography*, "Centered text" and "Justified text" (there is no "Text alignment" page); WCAG 2.2 SC 1.4.8 (text not justified); Bringhurst, *The Elements of Typographic Style*, section 2.1.3.
- **Link:** https://practicaltypography.com/centered-text.html
- **Judged by:** askable.

### Justified text needs hyphenation and adequate measure
- **Rule:** Justified text without hyphenation, or in a narrow column (under about 40 characters), creates rivers and uneven word gaps. Use justification only with hyphenation and a wide enough measure.
- **Source:** Bringhurst, *The Elements of Typographic Style*, sections 2.1.2 (40-character minimum for justified text), 2.1.3, and 2.1.10; Butterick, *Practical Typography*, "Justified text" (hyphenation required) and "Hyphenation".
- **Link:** https://practicaltypography.com/justified-text.html
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.
- **Not encoded (NG-10):** breaks NG-10 because it needs a character count per line, and Jev is unreliable at counting (JC-2).

### Rag quality in ragged-right text
- **Rule:** The right edge of ragged text should look gently uneven, with no long-short-long staircase patterns, no very short last lines, and no stray one-word lines. Lines should break at natural phrase boundaries where possible.
- **Source:** Bringhurst, *The Elements of Typographic Style*, section 2.1.3 "Set ragged if ragged setting suits the text and the page"; Hochuli, *Detail in Typography*, "The line" and "The column" chapters (there is no chapter titled "Line breaks and rag").
- **Judged by:** askable.

### Widows, orphans, and runts
- **Rule:** Avoid paragraphs that end with a single short word on the last line (a runt), and avoid a final line stranded alone at the top of a column or page. Headings should not be stranded at the bottom of a column or page.
- **Source:** Bringhurst, *The Elements of Typographic Style*, sections 2.4.2 (no short last-line word) and 2.4.8 (never begin a page with the last line of a paragraph); Butterick, *Practical Typography*, "Widow and orphan control" and "Keep with next paragraph" (for headings).
- **Link:** https://practicaltypography.com/widow-and-orphan-control.html
- **Judged by:** askable.

### Rivers of white space
- **Rule:** Looking at a block of justified or tight text from a distance, no vertical or diagonal channels of white space should run across several lines.
- **Source:** Bringhurst, *The Elements of Typographic Style*, sections 2.1.3 and 2.1.10 (uneven word spacing in justified text; the book does not use the word "rivers" as a rule); Hochuli, *Detail in Typography*.
- **Judged by:** askable.

### Paragraph spacing and indents
- **Rule:** Separate paragraphs with either a first-line indent (about 1–4 em) or a space between them (about half to one line), but not both. The first paragraph after a heading is not indented.
- **Source:** Butterick, *Practical Typography*, "Space between paragraphs" (4–10 pt) and "First-line indents" (one to four times the point size); Bringhurst, *The Elements of Typographic Style*, sections 2.3.1 and 2.3.2.
- **Link:** https://practicaltypography.com/first-line-indents.html
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Proximity of headings to the text they introduce
- **Rule:** A heading should sit closer to the text it introduces than to the text before it (space above is roughly 1.5 to 2 times space below). Equal spacing makes headings float.
- **Source:** Lupton, *Thinking with Type*, "Text" chapter, "Hierarchy"; Müller-Brockmann, *Grid Systems in Graphic Design* (1981); Butterick, *Practical Typography*, "Headings".
- **Link:** https://practicaltypography.com/headings.html
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Typographic details: quotes, dashes, and spaces
- **Rule:** Use curly (typographic) quotation marks and apostrophes, true en and em dashes, ellipsis characters, and a single space after sentences. Straight quotes, double hyphens as dashes, and double spaces are flags.
- **Source:** Butterick, *Practical Typography*, "Straight and curly quotes", "Hyphens and dashes", and "One space between sentences"; Bringhurst, *The Elements of Typographic Style*, sections 2.1.4 (single word space between sentences), 5.2.1 (dashes), 5.2.7 (ellipses), and 5.4.1 (quotation marks).
- **Link:** https://practicaltypography.com/straight-and-curly-quotes.html
- **Judged by:** askable.
- **Not encoded (NG-10):** breaks NG-10 because it reads single characters (quote marks, dash lengths, spaces), which is content and detail too fine to see.

### Numbers, lists, and tables
- **Rule:** Columns of numbers should use tabular (fixed-width) figures aligned on the decimal or right edge, while running prose should use proportional or old-style figures. Table text should keep consistent alignment per column.
- **Source:** Bringhurst, *The Elements of Typographic Style*, sections 3.2.1 (text figures in running text) and 4.4.3 (align columns of figures flush right or on the decimal); Butterick, *Practical Typography*, "Grids of numbers" and "Alternate figures" (there is no "Numbers" page).
- **Link:** https://practicaltypography.com/grids-of-numbers.html
- **Judged by:** askable.
- **Not encoded (NG-10):** breaks NG-10 because telling tabular figures from proportional figures needs detail too fine to see.

### Scannability: F-pattern and chunking
- **Rule:** Content meant to be skimmed has meaningful headings, short paragraphs, bulleted lists, and key terms near the start of lines. Users scan in an F-shaped pattern and skip the rest. Large unbroken text walls are a flag.
- **Source:** Nielsen, "F-Shaped Pattern For Reading Web Content" (Nielsen Norman Group, 17 Apr 2006); Nielsen, "How Users Read on the Web" (NN/g, 30 Sep 1997).
- **Link:** https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content-discovered/
- **Link:** https://www.nngroup.com/articles/how-users-read-on-the-web/
- **Judged by:** askable.

### Grid and alignment of text blocks
- **Rule:** Text blocks should align to a consistent grid or shared edges, with left edges and baselines lining up between columns, captions, and headings. Arbitrary offsets of a few pixels are a flag.
- **Source:** Müller-Brockmann, *Grid Systems in Graphic Design* (1981); Lupton, *Thinking with Type*, "Grid" chapter.
- **Judged by:** askable.

### Hyphenation and line breaks in headings and short text
- **Rule:** Headings, buttons, and captions should break at natural phrase boundaries and avoid breaking a word, a number and its unit, or a name across lines. Avoid hyphenating headings.
- **Source:** Bringhurst, *The Elements of Typographic Style*, section 2.4 "Etiquette of Hyphenation & Pagination", especially 2.4.6 (link short numerical expressions with hard spaces); Hochuli, *Detail in Typography*, "The line" chapter.
- **Judged by:** askable.
- **Not encoded (NG-10):** breaks NG-10 because it reads the words to judge where a line breaks, which is the content.


---

## Layout, spacing, grids, alignment, visual hierarchy

### Use a consistent grid
- **Rule:** Content snaps to one underlying grid (columns plus margins plus gutters). Left and right edges of blocks recur at the same column lines across the page; a block that sits off every column line with no reason is a defect.
- **Source:** Josef Müller-Brockmann, *Grid Systems in Graphic Design* (1981); Kimberly Elam, *Grid Systems: Principles of Organizing Type* (2004).
- **Judged by:** askable.

### Consistent gutters
- **Rule:** The space between columns is one constant value across the page (commonly 16 or 24dp/px; Material uses 16dp on compact, 24dp on larger sizes). Gutters are never visibly uneven between adjacent cards or columns.
- **Source:** Material Design 3, *Layout: Spacing* (2023); Müller-Brockmann, *Grid Systems in Graphic Design* (1981).
- **Link:** https://m3.material.io/foundations/layout/grids-spacing/spacing
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Page margins are present and equal
- **Rule:** Content has an outer margin on every side. Left and right margins match each other, and text or controls do not touch the canvas edge. On mobile web, the side margin is at least 16px; Material uses 16dp on compact and 24dp on medium.
- **Source:** Material Design 3, *Layout: Spacing* (2023); Apple *Human Interface Guidelines: Layout* (margins and safe areas).
- **Link:** https://developer.apple.com/design/human-interface-guidelines/layout
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Respect safe areas
- **Rule:** Interactive content and key text stay inside the platform safe area (clear of notches, rounded corners, home indicator, status bar). Backgrounds may extend to the edge; content may not.
- **Source:** Apple *Human Interface Guidelines: Layout* (safe areas).
- **Link:** https://developer.apple.com/design/human-interface-guidelines/layout
- **Judged by:** askable.
- **Not encoded (NG-10):** breaks NG-10 because the image does not show the device notch, corners, or home indicator, so it cannot be judged from one image.

### Spacing comes from a small scale (4pt/8pt)
- **Rule:** Padding, margins, and gaps are multiples of 4 (preferably 8) px: for example 4, 8, 12, 16, 24, 32, 48, 64. Values such as 13px or 22px are flagged. Use a fixed scale rather than arbitrary values.
- **Source:** Material Design 3, *Layout: Spacing* (8dp baseline grid, 4dp for small elements); Adam Wathan and Steve Schoger, *Refactoring UI* (2018), "Define your spacing and sizing system up front".
- **Judged by:** askable as a visual judgment only. Jev is asked about spacing that looks inconsistent from one gap to the next. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.
- **Not encoded (NG-10):** breaks NG-10 because it needs pixel values, which are detail too fine to see; the visible symptom is covered by the consistent-spacing entries.

### Spacing inside a group is smaller than spacing between groups
- **Rule:** The gap between related items is clearly smaller than the gap between unrelated groups. A working check is at least about 1.5x to 2x. If gaps are equal everywhere, grouping is lost.
- **Source:** Max Wertheimer, "Untersuchungen zur Lehre von der Gestalt II" (1923), law of proximity; Robin Williams, *The Non-Designer's Design Book* (proximity principle); Wathan and Schoger, *Refactoring UI* (2018), "Start with too much white space" and grouping section.
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### A label sits closer to its own field than to the previous one
- **Rule:** In forms and captions, a label or caption is nearer to the element it names than to neighboring elements. The gap above a label is larger than the gap between the label and its field.
- **Source:** Wertheimer (1923), law of proximity; Williams, *The Non-Designer's Design Book* (proximity).
- **Judged by:** askable.

### Similarity: look alike means work alike
- **Rule:** Elements with the same function share the same size, color, shape, and type style. Elements that differ in function differ visibly. Visually identical elements with different roles, or inconsistent styling of like elements, are flagged.
- **Source:** Wertheimer (1923), law of similarity; Williams, *The Non-Designer's Design Book* (repetition).
- **Judged by:** askable.
- **Not encoded (NG-10):** breaks NG-10 because whether two elements work alike is behaviour, which one image cannot show.

### Common region and enclosure for grouping
- **Rule:** Items inside one shared boundary (card, panel, background tint, border) read as a group. Unrelated items should not share a region, and related items should not be split across regions.
- **Source:** Stephen E. Palmer, "Common Region: A New Principle of Perceptual Grouping," *Cognitive Psychology* 24(3), 436-447 (1992); Nielsen Norman Group, "The Principle of Common Region: Containers Create Groupings."
- **Link:** https://www.nngroup.com/articles/common-region/
- **Judged by:** askable.

### Continuity: elements on a line read as related
- **Rule:** Items aligned along a line or curve are read as a sequence. Arrangements should lead the eye in the intended direction, and a stray element breaking an implied line is flagged.
- **Source:** Wertheimer (1923), law of good continuation; Kurt Koffka, *Principles of Gestalt Psychology* (1935).
- **Judged by:** askable.

### Figure/ground is unambiguous
- **Rule:** The primary content (figure) separates clearly from its background through contrast, edge definition, or size. Text and key shapes never merge with busy backgrounds or compete with them.
- **Source:** Edgar Rubin, *Synsoplevede Figurer* (1915); Koffka, *Principles of Gestalt Psychology* (1935); Donis A. Dondis, *A Primer of Visual Literacy* (1973).
- **Judged by:** askable.

### Align to shared edges
- **Rule:** Every element lines up with at least one other element on a shared edge or axis. Do not mix left, center, and right alignment in the same block without a reason; pick one dominant alignment per block (left alignment for body text in left-to-right languages).
- **Source:** Williams, *The Non-Designer's Design Book* (alignment: "Nothing should be placed on the page arbitrarily"); Müller-Brockmann (1981).
- **Judged by:** askable.

### Near misses are worse than clear differences
- **Rule:** Offsets of just a few pixels between elements meant to align (for example 2px or 3px) are defects; either align them exactly or differ clearly.
- **Source:** Williams, *The Non-Designer's Design Book* (alignment); Robert Bringhurst, *The Elements of Typographic Style* (alignment of edges).
- **Judged by:** askable as a visual judgment only. Jev is asked about elements that look almost aligned but not quite. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.

### Optical alignment over mathematical alignment
- **Rule:** Round, triangular, and icon shapes may overshoot or be nudged so they look aligned. A circle sits slightly larger than a square of the same nominal size, punctuation hangs into the margin, and icons center by visual mass rather than by bounding box. Judge by appearance when the two disagree.
- **Source:** Vignelli Associates, *The Vignelli Canon* (2010); Bringhurst, *The Elements of Typographic Style* (hanging punctuation, overshoot).
- **Judged by:** askable.
- **Not encoded (NG-10):** breaks NG-10 because optical offsets are a pixel or two, too fine to see.

### Repetition: reuse the same few styles and spacing patterns
- **Rule:** Visual elements (heading style, button style, card padding, rules, icons) recur consistently through the design. The design uses a small fixed set of type sizes, colors, and spacing values, not a new variant for each element.
- **Source:** Williams, *The Non-Designer's Design Book* (repetition); Vignelli, *The Vignelli Canon* (2010), "Consistency."
- **Judged by:** askable.

### Contrast: make differences obvious, not timid
- **Rule:** When two elements differ (size, weight, color, type family), they differ by a clear amount. Near-identical sizes or weights (for example 16px against 17px, or two similar grays) are flagged as timid contrast.
- **Source:** Williams, *The Non-Designer's Design Book* (contrast); Dondis, *A Primer of Visual Literacy* (1973), visual techniques of contrast.
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### White space is deliberate and generous
- **Rule:** Content is not crammed. There is clear empty space around the main element and between sections, and padding inside containers is not tighter than the gaps between them. White space is part of the layout, not leftover.
- **Source:** Vignelli, *The Vignelli Canon* (2010), on space and discipline; Wathan and Schoger, *Refactoring UI* (2018), "Start with too much white space."
- **Judged by:** askable.

### A clear single focal point
- **Rule:** The design has one dominant element that wins first attention (largest, highest contrast, or most isolated), then a clear secondary level. If three or more elements compete at the same visual weight, flag it.
- **Source:** Dondis, *A Primer of Visual Literacy* (1973), emphasis and subordination; Nielsen Norman Group, "Visual Hierarchy in UX: Definition."
- **Link:** https://www.nngroup.com/articles/visual-hierarchy-ux-definition/
- **Judged by:** askable.

### Hierarchy shows through size, weight, color, and position
- **Rule:** Importance order is readable from the page alone: more important items are larger, bolder, higher contrast, or positioned earlier. Headings are clearly larger than body text (a ratio of about 1.25x or more per step on a type scale), and the heading level order matches its visual size order.
- **Source:** Nielsen Norman Group, "Visual Hierarchy in UX: Definition"; Wathan and Schoger, *Refactoring UI* (2018), "Hierarchy is everything."
- **Link:** https://www.nngroup.com/articles/visual-hierarchy-ux-definition/
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.
- **Not encoded (NG-10):** breaks NG-10 because the heading level order needs the DOM, and importance needs the content.

### Do not rely on size alone: de-emphasize secondary items
- **Rule:** Hierarchy comes as much from toning down secondary content (lighter color, smaller size, lower weight) as from enlarging primary content. Only one or two primary actions per view; the rest are secondary or tertiary in style.
- **Source:** Wathan and Schoger, *Refactoring UI* (2018), "Don't use grey text on colored backgrounds" and "Emphasize by de-emphasizing"; Material Design 3, *Buttons* (emphasis levels).
- **Judged by:** askable.

### Balance: visual weight is distributed, not lopsided
- **Rule:** Visual weight (size, darkness, color saturation, density) is balanced around the center of the canvas, either symmetrically or asymmetrically. A large heavy block on one side needs a counterweight; an unbalanced layout needs an intentional reason (for example, a diagonal flow).
- **Source:** Dondis, *A Primer of Visual Literacy* (1973), balance and instability; Rudolf Arnheim, *Art and Visual Perception* (1954), balance.
- **Judged by:** askable.

### Text line length of 45 to 75 characters
- **Rule:** Body text lines hold about 45 to 75 characters (66 is the ideal in single-column setting). Lines over about 90 characters or under about 30 in body copy are flagged.
- **Source:** Bringhurst, *The Elements of Typographic Style* (1992), "Choosing the page and the text block."
- **Judged by:** askable as a visual judgment only. Jev is asked about lines that look too long or too short to read comfortably. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.

### Line spacing and paragraph spacing for readable blocks
- **Rule:** Body text line height is about 1.4 to 1.6 times the font size; WCAG's text spacing test accepts line height of 1.5 and paragraph spacing of 2x the font size without loss of content. Headings are tighter (about 1.1 to 1.3).
- **Source:** W3C, *Web Content Accessibility Guidelines (WCAG) 2.2*, Success Criterion 1.4.12 Text Spacing; Bringhurst (1992) on leading.
- **Link:** https://www.w3.org/TR/WCAG22/#text-spacing
- **Judged by:** askable as a visual judgment only. Jev is asked about blocks whose lines or paragraphs look too tight. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.

### Rule of thirds (weak: folk wisdom)
- **Rule:** In photographic or illustrative compositions, placing the focal point near one of the four thirds intersections often looks more dynamic than dead center. Treat as a soft heuristic only, not a defect when absent, since centered compositions are valid.
- **Source:** John Thomas Smith, *Remarks on Rural Scenery* (1797), the first named use. Not a tested law; later treatments are heuristics.
- **Link:** https://en.wikipedia.org/wiki/Rule_of_thirds
- **Judged by:** askable.
- **Not encoded (NG-10):** breaks NG-10 because the entry says absence is not a defect, so there is no visible defect to ask about.

### F-pattern: put key content where scanning starts
- **Rule:** On text-heavy pages, readers scan across the top, then down the left edge in an F shape. Important information belongs at the top and left in left-to-right languages: headings, first words, and bullet leads. Crucial content buried at the far right or low on the page is flagged.
- **Source:** Jakob Nielsen, "F-Shaped Pattern For Reading Web Content," Nielsen Norman Group (2006, eyetracking study); followed up by Kara Pernice, "F-Shaped Pattern of Reading on the Web: Misunderstood, But Still Relevant (Even on Mobile)," Nielsen Norman Group (2017).
- **Link:** https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content-discovered/ (2006 original); 2017 follow-up: https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/
- **Judged by:** askable.
- **Not encoded (NG-10):** breaks NG-10 because it needs to know which content is key, which is the content.

### Z-pattern for sparse layouts
- **Rule:** On low-density pages (landing pages, posters, ads), the eye moves from top left across to top right, diagonally to bottom left, then across to bottom right. Place logo or headline at the start, and the call to action at the end of that path. Treat as a lower-confidence heuristic than the F-pattern; gaze depends on content.
- **Source:** Edmund Arnold, newspaper design "Gutenberg diagram" (1950s; attribution confirmed via search and Wikipedia, but the Nielsen Norman Group visual hierarchy article does not mention it). No controlled primary study of the Z shape on the web; moderate confidence.
- **Link:** https://en.wikipedia.org/wiki/Edmund_Arnold
- **Judged by:** askable.

### Above the fold: the core message and primary action are visible without scrolling
- **Rule:** On first load, the value proposition (headline plus the primary action) is visible in the initial viewport (about 600px high on common laptops and 667px on small phones). Content below the fold must still invite scrolling, for example by a partially cut-off element.
- **Source:** Nielsen Norman Group, "Scrolling and Attention" (Therese Fessenden, 2018): users spend about 57% of viewing time above the fold and 74% in the first two screenfuls.
- **Link:** https://www.nngroup.com/articles/scrolling-and-attention/
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.
- **Not encoded (NG-10):** breaks NG-10 because it needs to know which message is the core one, which is the content, and where the fold falls, which one image does not show.

### Touch and click targets of adequate size and spacing
- **Rule:** Tappable targets are at least 44x44pt (Apple) or 48x48dp (Material), with at least 8dp between adjacent targets. WCAG 2.2 AA (SC 2.5.8) sets a hard floor of 24x24 CSS px; 2.5.5 (AAA) asks for 44x44.
- **Source:** Apple *Human Interface Guidelines: Layout / Buttons*; Material Design 3, *Accessibility: Touch targets*; W3C *WCAG 2.2*, SC 2.5.8 Target Size (Minimum).
- **Link:** https://www.w3.org/TR/WCAG22/#target-size-minimum (WCAG); Material: https://m3.material.io/components/icon-buttons/accessibility
- **Judged by:** askable as a visual judgment only. Jev is asked about controls that look too small or too crowded to tap. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.
- **Not encoded (NG-10):** breaks NG-10 because target size is a physical measurement in points or dp that a screenshot does not show.

### Reflow: no horizontal scrolling down to 320px wide
- **Rule:** Content reflows to a single column at a 320 CSS px viewport without horizontal scrolling or loss of content (except for data tables, maps, and the like). Text blocks, images, and cards must not overflow their container.
- **Source:** W3C *WCAG 2.2*, SC 1.4.10 Reflow.
- **Link:** https://www.w3.org/TR/WCAG22/#reflow
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.
- **Not encoded (NG-10):** breaks NG-10 because it needs a render at 320 px wide, which one image cannot show.

### Responsive layouts adapt their structure, not only their scale
- **Rule:** At smaller widths columns collapse (multi-column to one column), navigation condenses, and spacing scales down by steps; text size stays readable (body not below about 16px). Elements do not shrink into unreadable or untappable sizes.
- **Source:** Material Design 3, *Layout: Canonical layouts* and *Window size classes* (2023); Apple *Human Interface Guidelines: Layout* (adaptivity).
- **Link:** https://m3.material.io/foundations/layout/canonical-layouts
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.
- **Not encoded (NG-10):** breaks NG-10 because it needs renders at several widths, which one image cannot show.

### Consistent density: no mix of cramped and sparse regions
- **Rule:** Information density is steady across the layout. One part of the page is not packed tight while another is nearly empty without a reason (such as a hero section). Spacing between repeated items (list rows, cards) is uniform.
- **Source:** Vignelli, *The Vignelli Canon* (2010), discipline and consistency; Material Design 3, *Applying density* (2023).
- **Link:** https://m3.material.io/foundations/layout/grids-spacing/density
- **Judged by:** askable.

### Establish a modular type scale and tie spacing to it
- **Rule:** Font sizes come from a limited modular scale (for example ratios 1.2 to 1.333, or a hand-picked set of 6 to 8 sizes), and vertical spacing relates to the line height (a baseline rhythm). More than about 6 to 8 distinct sizes on one page is flagged.
- **Source:** Bringhurst, *The Elements of Typographic Style* (1992), "Harmonic proportion" and "Rhythm"; Wathan and Schoger, *Refactoring UI* (2018), "Establish a type scale."
- **Judged by:** askable as a visual judgment only. Jev is asked about type sizes that look arbitrary rather than stepped. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.

### Group by hierarchy of proximity: heading closer to its content than to the content above
- **Rule:** A heading sits closer to the paragraph beneath it than to the one above. The space above a heading is larger than the space below it (a typical ratio is about 2:1 or more).
- **Source:** Williams, *The Non-Designer's Design Book* (proximity); Bringhurst, *The Elements of Typographic Style* (1992), on headings and spacing.
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Unrelated elements do not crowd each other
- **Rule:** Elements that do not belong together keep clear space between them. Text, images, diagrams, and controls from different groups do not sit so close that they look cramped, seem to touch, or read as one group. For example, a caption or paragraph below a diagram has a visible gap above it, not a few pixels.
- **Source:** Wathan and Schoger, *Refactoring UI* (2018), "Start with too much white space"; Williams, *The Non-Designer's Design Book* (proximity principle).
- **Judged by:** askable. Jev is asked whether any two elements that do not belong together sit uncomfortably close. Evidence: in M-1, Benjamin Jackson saw the text below a diagram sit too close to it (spike/human_answers.csv, on `edges-misaligned`), and no other entry covered it (PRD OQ-18).


---

## Color guidelines for deskcrit

### Body text contrast (WCAG AA)
- **Rule:** Normal text has a contrast ratio of at least 4.5:1 against its background. Large text (18pt/24px regular or 14pt/18.66px bold and up) needs at least 3:1.
- **Source:** W3C, *WCAG 2.2*, Success Criterion 1.4.3 Contrast (Minimum) (2023)
- **Link:** https://www.w3.org/TR/WCAG22/#contrast-minimum
- **Judged by:** askable as a visual judgment only. Jev is asked about text that reads as faint against its background. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.

### Non-text contrast
- **Rule:** UI component boundaries and states (input borders, icons that carry meaning, focus rings) and meaningful chart graphics are at least 3:1 against adjacent colors.
- **Source:** W3C, *WCAG 2.2*, Success Criterion 1.4.11 Non-text Contrast (2023)
- **Link:** https://www.w3.org/TR/WCAG22/#non-text-contrast
- **Judged by:** askable as a visual judgment only. Jev is asked about borders, icons, or focus rings that look too faint to find. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.

### Do not use color alone to carry meaning
- **Rule:** Any information shown by color (error state, chart series, link, required field) has a second cue such as text, icon, pattern, underline, or position.
- **Source:** W3C, *WCAG 2.2*, Success Criterion 1.4.1 Use of Color (2023)
- **Link:** https://www.w3.org/TR/WCAG22/#use-of-color
- **Judged by:** askable.

### Links distinguishable from surrounding text
- **Rule:** Inline links that differ from body text only by color need at least 3:1 contrast against the body text color, plus a non-color cue (underline) on hover and focus. Underlining by default is safest.
- **Source:** W3C, *Techniques for WCAG 2.2*, G183 and F73 (G183 gives the 3:1 figure; its current text does not mention a hover or focus cue, which is the older WCAG 2.0 wording, and F73 covers the failure case)
- **Link:** https://www.w3.org/WAI/WCAG22/Techniques/general/G183
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Do not rely on the 4.5:1 ratio for dark backgrounds blindly
- **Rule:** Light text on dark backgrounds often looks lower in contrast than the WCAG 2.x ratio suggests, and mid-tone pairs can pass 4.5:1 yet read poorly. Check light-on-dark text with APCA as well, and prefer clearly lighter weights and sizes.
- **Source:** Andrew Somers, *APCA in a Nutshell* (Myndex)
- **Link:** https://git.apcacontrast.com/documentation/APCA_in_a_Nutshell.html
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Placeholder, disabled and decorative text exemptions
- **Rule:** Placeholder and helper text still needs 4.5:1; only truly disabled controls and pure decoration are exempt. Light gray placeholder text on white that fails 4.5:1 is a defect.
- **Source:** W3C, *WCAG 2.2*, SC 1.4.3 (incidental text exception) and *Understanding SC 1.4.3*
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- **Judged by:** askable as a visual judgment only. Jev is asked about placeholder or helper text that looks too faint to read. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.

### Text over images and gradients
- **Rule:** Text on a photo, gradient or textured background keeps its contrast at the worst point behind the text, not the average. Add a scrim, overlay or solid panel where the background varies.
- **Source:** W3C, *Understanding SC 1.4.3 Contrast (Minimum)* (2023)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- **Judged by:** askable.

### Color-vision deficiency safety
- **Rule:** The design stays readable and its distinctions stay visible when simulated for protanopia, deuteranopia and tritanopia (about 8% of men have red-green deficiency). Red vs green, and green vs brown, must differ in lightness or carry another cue.
- **Source:** W3C, *WCAG 2.2*, SC 1.4.1 and Understanding SC 1.4.1; Okabe and Ito, *Color Universal Design* (2002)
- **Link:** https://jfly.uni-koeln.de/color/
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Okabe-Ito palette for categorical data
- **Rule:** When a chart needs distinct categories safe for color-blind readers, use the Okabe-Ito eight (black, orange, sky blue, bluish green, yellow, blue, vermillion, reddish purple), and keep to about 8 or fewer categories.
- **Source:** Masataka Okabe and Kei Ito, *Color Universal Design (CUD): How to make figures and presentations that are friendly to colorblind people* (2002/2008)
- **Link:** https://jfly.uni-koeln.de/color/
- **Judged by:** askable as a visual judgment only. Jev is asked about a chart whose categories are told apart by colour alone, especially red against green. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.

### Limit categorical colors in a chart
- **Rule:** Categorical palettes work for about 5 to 10 hues at most; beyond that, direct labels, small multiples, grouping or highlighting one series and graying the rest are better than more colors.
- **Source:** Cynthia Brewer, *ColorBrewer* qualitative schemes (max 12, best at fewer); Colin Ware, *Information Visualization: Perception for Design* (2012; estimates 5 to 10 rapidly distinguishable colors for categorical coding, advises no more than 10)
- **Link:** https://colorbrewer2.org
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Sequential data uses one ordered lightness ramp
- **Rule:** Ordered data (low to high) uses a single-hue or multi-hue ramp whose lightness changes monotonically, so lighter means less and darker means more (or the reverse, consistently). Rainbow/jet is not acceptable for ordered values.
- **Source:** Cynthia A. Brewer, *Color Use Guidelines for Mapping and Visualization* (1994); ColorBrewer sequential schemes
- **Link:** https://colorbrewer2.org
- **Judged by:** askable.

### Diverging data uses a neutral midpoint
- **Rule:** Data with a meaningful midpoint (zero, average, target) uses two contrasting hues that darken away from a light neutral center. The center color matches the real midpoint value.
- **Source:** Cynthia A. Brewer, *Color Use Guidelines for Mapping and Visualization* (1994); ColorBrewer diverging schemes
- **Link:** https://colorbrewer2.org
- **Judged by:** askable.

### Color scales must be perceptually uniform and CVD safe
- **Rule:** Prefer perceptually uniform ramps (viridis, cividis, ColorBrewer) over HSV rainbow ramps, and check that the ramp still orders correctly in grayscale and under color-blind simulation.
- **Source:** Stéfan van der Walt and Nathaniel Smith, *A Better Default Colormap for Matplotlib* (viridis, SciPy 2015); Brewer, ColorBrewer
- **Link:** https://bids.github.io/colormap/
- **Judged by:** askable.

### Complementary harmony
- **Rule:** A complementary scheme pairs hues about 180 degrees apart on the wheel; use one as dominant and the other as a small accent, and avoid equal-area saturated pairs.
- **Source:** Johannes Itten, *The Art of Color* (1961)
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Analogous harmony
- **Rule:** An analogous scheme uses neighbouring hues (roughly within 30 to 60 degrees); it reads calm and cohesive but needs lightness or saturation variation, or one contrasting accent, to avoid flatness.
- **Source:** Johannes Itten, *The Art of Color* (1961)
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Triadic, split-complementary and tetradic schemes
- **Rule:** Triadic (about 120 degrees apart) and split-complementary (a hue plus the two neighbours of its complement) schemes keep one hue dominant and mute the others in saturation or area. Three equally saturated hues at equal weight is a defect.
- **Source:** Johannes Itten, *The Art of Color* (1961), color chords
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Monochromatic schemes need value range
- **Rule:** A single-hue design varies lightness and saturation enough to separate its levels (steps at least visibly distinct, text still at 4.5:1) so hierarchy comes from value, not hue.
- **Source:** Johannes Itten, *The Art of Color* (1961); Josef Albers, *Interaction of Color* (1963)
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### 60-30-10 proportion
- **Rule:** Distribute color roughly 60% dominant (usually neutral background), 30% secondary, 10% accent. An accent covering far more than about 10% of the area stops functioning as an accent.
- **Source:** Interior-design rule of thumb widely taught in design practice; applied to UI in Steve Schoger and Adam Wathan, *Refactoring UI* (2018)
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Accent color restraint
- **Rule:** Use one primary accent for the main action and interactive state; reserve it so that it does not also decorate non-interactive content. More than about two competing saturated accents on one screen splits attention.
- **Source:** Apple, *Human Interface Guidelines: Color* (accent colors); Google, *Material Design 3: Color roles*
- **Link:** https://developer.apple.com/design/human-interface-guidelines/color
- **Judged by:** askable.

### Limited palette
- **Rule:** A piece has a small defined palette: typically one neutral ramp, one or two brand hues, and semantic status colors. Count distinct hues outside photos and illustrations; many one-off hues indicate no system.
- **Source:** Steve Schoger and Adam Wathan, *Refactoring UI* (2018), "Define your shades"; Material Design 3 color roles
- **Link:** https://m3.material.io/styles/color/roles
- **Judged by:** askable.

### Simultaneous contrast
- **Rule:** The same color looks different on different surrounds; compare colors in context. Adjacent colors of similar lightness make edges shimmer, and a gray or small swatch will appear tinted toward the complement of its surround.
- **Source:** Michel Eugène Chevreul, *De la loi du contraste simultané des couleurs* (1839); Josef Albers, *Interaction of Color* (1963)
- **Judged by:** askable.

### Vibrating and clashing combinations
- **Rule:** Avoid fully saturated complementary colors adjacent at similar lightness (red on blue, red on green, magenta on cyan) for text or thin shapes; they vibrate. Separate by lightness difference or a neutral gap.
- **Source:** Josef Albers, *Interaction of Color* (1963); Johannes Itten, *The Art of Color* (1961), contrast of saturation
- **Judged by:** askable.

### Value (lightness) carries structure
- **Rule:** The design should still show its hierarchy and figure/ground in a grayscale render; if two elements merge in grayscale, hue alone is separating them and the pairing is fragile.
- **Source:** Josef Albers, *Interaction of Color* (1963); Steve Schoger and Adam Wathan, *Refactoring UI* (2018), "Don't rely on color alone"
- **Judged by:** askable.

### Warm and cool temperature
- **Rule:** Warm hues (red, orange, yellow) advance and draw attention; cool hues (blue, green) recede. Place warm color on the focal element and cool on the background, and keep temperature consistent within one light source or surface family.
- **Source:** Johannes Itten, *The Art of Color* (1961), warm-cool contrast
- **Judged by:** askable.

### Saturation hierarchy
- **Rule:** Saturated color marks what matters; surrounding content uses desaturated or neutral tones. Large areas of fully saturated color tire the eye and weaken emphasis.
- **Source:** Johannes Itten, *The Art of Color* (1961), contrast of saturation; Steve Schoger and Adam Wathan, *Refactoring UI* (2018)
- **Judged by:** askable.

### Semantic color conventions
- **Rule:** Red marks errors and danger, green marks success, amber/yellow marks warning, blue marks information. Do not use these status colors for unrelated decoration, and do not reverse them (a green delete button, a red success message).
- **Source:** Apple, *Human Interface Guidelines: Color*; Google, *Material Design: Color roles (error)*; W3C *WCAG 2.2* SC 1.4.1
- **Link:** https://developer.apple.com/design/human-interface-guidelines/color
- **Judged by:** askable.

### Cultural meaning of color
- **Rule:** Color meaning varies by audience (white for mourning in parts of East Asia, red for luck in China but danger in the West, red/green finance conventions reversed in China and Japan). For an international audience, back color with text or icons rather than relying on its connotation.
- **Source:** David McCandless, *Colours in Culture* (Information is Beautiful, 2010); UNVERIFIED: Jakob Nielsen, *International Usability* (Nielsen Norman Group); the NN/G articles on international web usability and cross-cultural design had no color-meaning content
- **Link:** https://informationisbeautiful.net/visualizations/colours-in-cultures/
- **Judged by:** askable.

### Color consistency across a system
- **Rule:** The same role uses the same color everywhere (all primary buttons, all links, all error states). Near-duplicate values (e.g. several slightly different blues) indicate drift; roles should map to named tokens.
- **Source:** Google, *Material Design 3: Color roles*; Apple, *Human Interface Guidelines: Color*
- **Link:** https://m3.material.io/styles/color/roles
- **Judged by:** askable as a visual judgment only. Jev is asked about the same role shown in visibly different colours across the view. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.

### Dark mode conventions
- **Rule:** Dark themes use dark gray (not pure #000 with pure #FFF text), lighter and slightly desaturated accents, and express elevation by lighter surfaces rather than shadows. Body text keeps at least 4.5:1, and avoid maximum-contrast white on black for long text.
- **Source:** Google, *Material Design: Dark theme* (https://m2.material.io/design/color/dark-theme.html); Apple, *Human Interface Guidelines: Dark Mode*
- **Link:** https://developer.apple.com/design/human-interface-guidelines/dark-mode
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Color for state: hover, focus, disabled
- **Rule:** Interactive states differ visibly from the default (focus indicator at least 3:1 against adjacent colors) and disabled states are lower in emphasis without relying on hue alone.
- **Source:** W3C, *WCAG 2.2*, SC 1.4.11 Non-text Contrast and SC 2.4.13 Focus Appearance (Level AAA in WCAG 2.2, the stricter focus-indicator size and contrast requirement) and SC 2.4.11 Focus Not Obscured (Minimum) (Level AA)
- **Link:** https://www.w3.org/TR/WCAG22/#non-text-contrast
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

---

## Accessibility and legal compliance: research for deskcrit

WCAG 2.2 Understanding pages follow the pattern https://www.w3.org/WAI/WCAG22/Understanding/ followed by the page name and .html. Level markers matter: 2.3.3, 2.4.13, 1.4.6, 2.5.5 are AAA and are quality tiers, not legal minimums.

### Legal regimes

| Regime | Jurisdiction | Standard it references | Link |
|---|---|---|---|
| ADA Title II web and mobile rule (final rule April 2024; Interim Final Rule April 20, 2026 pushed dates back one year: April 26, 2027 for entities of 50,000+ people, April 26, 2028 for smaller ones) | US, state and local governments | WCAG 2.1 Level AA | https://www.ada.gov/resources/web-rule-first-steps/ |
| ADA Title III (private businesses; no web rule; DOJ guidance names no technical standard, and UNVERIFIED: WCAG 2.1 AA as the de facto measure in courts could not be confirmed from a primary source) | US | WCAG (2.1 AA de facto) | https://www.ada.gov/resources/web-guidance/ |
| Section 508 of the Rehabilitation Act (revised 2017) | US federal agencies and contractors | WCAG 2.0 Level A and AA (incorporated by reference) | https://www.section508.gov/ |
| European Accessibility Act (Directive 2019/882), applicable since 28 June 2025 | EU member states, covers e-commerce, banking, e-books, and similar consumer products and services | EN 301 549 (v3.2.1 is the current harmonised reference, which incorporates WCAG 2.1 AA; v4.1.1 was published in September 2026 but gives a presumption of conformity only once cited in the Official Journal of the EU, expected 30 November 2026) | https://commission.europa.eu/strategy-and-policy/policies/justice-and-fundamental-rights/disability/union-equality-strategy-rights-persons-disabilities-2021-2030/european-accessibility-act_en |
| Web Accessibility Directive (EU 2016/2102) | EU public sector bodies | EN 301 549 | https://single-market-economy.ec.europa.eu/single-market/goods/european-standards/harmonised-standards/accessibility-websites-and-mobile-applications_en |
| Equality Act 2010 (duty of reasonable adjustments) | UK | No named standard; courts and regulators look to WCAG | https://www.legislation.gov.uk/ukpga/2010/15/contents |
| Public Sector Bodies (Websites and Mobile Applications) (No. 2) Accessibility Regulations 2018 | UK public sector | WCAG Level A and AA (the 2022 amendment replaced the EN 301 549 reference; GOV.UK guidance names WCAG 2.2 AA) | https://www.gov.uk/guidance/accessibility-requirements-for-public-sector-websites-and-apps |
| AODA, Integrated Accessibility Standards Regulation (Ontario Regulation 191/11) | Ontario, Canada; large organizations | WCAG 2.0 Level AA (new public websites) | https://www.ontario.ca/page/how-make-websites-accessible |

### Text contrast (minimum)
- **Rule:** Body text needs a contrast ratio of at least 4.5:1 against its background; large text (at least 24 CSS px, or 18.66 CSS px bold) needs at least 3:1. Logos and disabled controls are exempt.
- **Source:** WCAG 2.2 SC 1.4.3 (AA)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- **Judged by:** askable as a visual judgment only. Jev is asked about text that reads as faint against its background. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.

### Non-text contrast
- **Rule:** Visual boundaries needed to identify a UI component need at least 3:1 against adjacent colors: an input border, a checkbox, a button edge when there is no other cue. So do meaningful graphics such as chart lines and icons that carry meaning. Also applies to focus and selected states.
- **Source:** WCAG 2.2 SC 1.4.11 (AA)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- **Judged by:** askable as a visual judgment only. Jev is asked about component boundaries or state indicators that look too faint. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.

### Reflow
- **Rule:** At a 320 CSS px wide viewport (400% zoom of 1280 px) content reflows to one column with no horizontal scrolling and no loss of information. Exceptions: data tables, maps, diagrams, video, and toolbars needing two-dimensional layout; vertical content uses 256 CSS px height.
- **Source:** WCAG 2.2 SC 1.4.10 (AA)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Images of text
- **Rule:** Text is real text, not a picture of text, unless the exact look is essential (logotype). Applies to web UI; a poster or slide image being raster is a different case.
- **Source:** WCAG 2.2 SC 1.4.5 (AA)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/images-of-text.html
- **Judged by:** askable.
- **Not encoded (NG-10):** breaks NG-10 because telling a picture of text from live text needs detail too fine to see. Cut in M-1 as `text-baked-into-image`: Jev answered true at 0.96 where Benjamin Jackson could not tell.

### Use of color
- **Rule:** Color is not the only way to show information: links inside body text, errors, required fields, chart series, and states need a second cue (underline, icon, label, pattern). Or the link has 3:1 contrast against surrounding text plus a non-color cue on hover and focus.
- **Source:** WCAG 2.2 SC 1.4.1 (A)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Sensory characteristics
- **Rule:** Instructions do not rely only on shape, size, position, sound, or color (for example, 'click the green button on the right' needs a name or label too).
- **Source:** WCAG 2.2 SC 1.3.3 (A)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/sensory-characteristics.html
- **Judged by:** askable.

### Target size (minimum)
- **Rule:** Pointer targets are at least 24 by 24 CSS px, or smaller targets have enough spacing that a 24 px diameter circle centered on each does not overlap another target or its circle. Exceptions: inline links in text, user-agent controls, essential presentation.
- **Source:** WCAG 2.2 SC 2.5.8 (AA)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- **Judged by:** askable as a visual judgment only. Jev is asked about controls that look too small or too crowded to hit. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.

### Focus visible
- **Rule:** Every keyboard-focusable element shows a visible focus indicator when focused. Removing the outline with `outline: none` and not replacing it fails.
- **Source:** WCAG 2.2 SC 2.4.7 (AA)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html
- **Judged by:** askable.

### Focus not obscured (minimum)
- **Rule:** A focused element is not entirely hidden by author-created content such as sticky headers, cookie banners, or chat widgets.
- **Source:** WCAG 2.2 SC 2.4.11 (AA)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- **Judged by:** askable.

### Focus appearance
- **Rule:** The focus indicator encloses the component or is at least 2 CSS px thick around its perimeter, and changes by at least 3:1 between focused and unfocused states. Included as the quality-tier reading of 2.4.7; it is AAA, not required by any law.
- **Source:** WCAG 2.2 SC 2.4.13 (AAA)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- **Judged by:** askable as a visual judgment only. Jev is asked about a focus indicator that is hard to see in a focus-state screenshot. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.

### Orientation
- **Rule:** Content works in both portrait and landscape unless one orientation is essential (piano app, bank-check deposit).
- **Source:** WCAG 2.2 SC 1.3.4 (AA)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/orientation.html
- **Judged by:** askable.

### Headings and labels
- **Rule:** Headings and form labels describe the topic or purpose of their section or field. 'Click here' or 'Section 1' as a heading fails. Also check a sensible hierarchy with no skipped levels.
- **Source:** WCAG 2.2 SC 2.4.6 (AA)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.
- **Not encoded (NG-10):** breaks NG-10 because it reads the heading text, which is the content. Cut in M-1 as `headings-describe-content`.

### Labels or instructions
- **Rule:** Every input has a visible label or instruction that stays visible while typing. A placeholder alone is not enough.
- **Source:** WCAG 2.2 SC 3.3.2 (A)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html
- **Judged by:** askable.

### Link purpose (in context)
- **Rule:** Each link's purpose can be told from its text or its surrounding sentence, paragraph, or list item. Repeated 'Read more' links need distinguishing context or an `aria-label`.
- **Source:** WCAG 2.2 SC 2.4.4 (A)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html
- **Judged by:** askable.
- **Not encoded (NG-10):** breaks NG-10 because it reads the link text, which is the content. Cut in M-1 as `vague-link-text`.

### Consistent navigation
- **Rule:** Navigation links repeated on multiple pages appear in the same relative order each time.
- **Source:** WCAG 2.2 SC 3.2.3 (AA)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html
- **Judged by:** askable.

### Consistent identification
- **Rule:** The same function has the same label and icon across pages (a search icon is always called 'Search', not 'Find' on another page).
- **Source:** WCAG 2.2 SC 3.2.4 (AA)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html
- **Judged by:** askable.

### Consistent help
- **Rule:** Help links, contact details, or chat appear in the same relative place across pages.
- **Source:** WCAG 2.2 SC 3.2.6 (A)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/consistent-help.html
- **Judged by:** askable.

### Error identification
- **Rule:** An input error is identified in text, naming the field in error, not only by red color or an icon.
- **Source:** WCAG 2.2 SC 3.3.1 (A)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html
- **Judged by:** askable.

### Error suggestion
- **Rule:** When an error is detected and a fix is known, the message says how to correct it ('Enter a date like 03/21/2026'), not just 'Invalid input'.
- **Source:** WCAG 2.2 SC 3.3.3 (AA)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Apple touch target size
- **Rule:** Interactive controls are at least 44 by 44 points on iOS and iPadOS, with space between them. (visionOS recommends 60 pt.)
- **Source:** Apple, *Human Interface Guidelines: Accessibility* (Buttons, Layout and 'Hit targets')
- **Link:** https://developer.apple.com/design/human-interface-guidelines/accessibility
- **Judged by:** askable as a visual judgment only. Jev is asked about controls that look too small or too crowded to tap. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.

### Material touch target size
- **Rule:** Touch targets are at least 48 by 48 dp, with at least 8 dp between targets. A visual icon can be smaller if the tap area is 48 dp.
- **Source:** Google, *Android Accessibility Help: Touch target size* (48x48 dp, 8 dp spacing; the Material 3 structure page is JavaScript-rendered and could not be read)
- **Link:** https://support.google.com/accessibility/android/answer/7101858?hl=en
- **Judged by:** askable as a visual judgment only. Jev is asked about controls that look too small or too crowded to tap. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.

### Dyslexia-friendly typography
- **Rule:** Use a common sans-serif such as Arial, Verdana, or Calibri at 12 to 14 pt (about 16 to 19 px) or larger. Left-align text with no justification. Avoid italics, underline, and all caps for running text. Use wide letter and word spacing.
- **Source:** British Dyslexia Association, *Dyslexia Style Guide* (2023; wording checked against the archived web version, since the PDF returns 403 to scripted requests)
- **Link:** https://web.archive.org/web/20230315034831/www.bdadyslexia.org.uk/advice/employers/creating-a-dyslexia-friendly-workplace/dyslexia-friendly-style-guide
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Dyslexia-friendly line length, spacing, and background
- **Rule:** Line spacing of about 1.5, with extra space around headings and between paragraphs. Lines of about 60 to 70 characters. Cream or soft pastel backgrounds rather than pure white. Headings and bullets instead of dense blocks of text.
- **Source:** British Dyslexia Association, *Dyslexia Style Guide* (2023; wording checked against the archived web version, since the PDF returns 403 to scripted requests)
- **Link:** https://web.archive.org/web/20230315034831/www.bdadyslexia.org.uk/advice/employers/creating-a-dyslexia-friendly-workplace/dyslexia-friendly-style-guide
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Low-vision large-print guidance
- **Rule:** For print and posters aimed at low-vision readers, RNIB See it Right advises at least 12 pt, and 14 pt or more for wider reach. It also calls for a clear sans-serif, strong contrast, and matte paper to avoid glare. Treat 18 pt as the large-text bar from WCAG.
- **Source:** RNIB, *See it Right: Making Information Accessible* (Clear Print Guidelines)
- **Link:** https://resourcecentre.org.uk/books/see-it-right-making-information-accessible-for-people-with-sight-problems/
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Text alternatives for charts and posters (information not conveyed in image alone)
- **Rule:** Key meaning in a chart, infographic, or poster is also stated in text near it (title, summary, data table, caption) rather than only in the picture.
- **Source:** WCAG 2.2 SC 1.1.1 (A), complex images technique G95 / G92 (verified: G95 short text alternative describing the content, G92 long description)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html
- **Judged by:** askable.


---

## UX and interaction heuristics: guideline research for deskcrit

NNG heuristics URL base: https://www.nngroup.com/articles/ten-usability-heuristics/ . Laws of UX site: https://lawsofux.com/ (a secondary summary; originals cited per entry).

### Nielsen 1: Visibility of system status
- **Rule:** The design shows the current state (selected tab, active step, progress, saved or unsaved, loading) with a visible indicator. A reviewer should be able to say where the user is and what is happening.
- **Source:** Jakob Nielsen, *10 Usability Heuristics for User Interface Design* (1994, revised since); first stated in Nielsen & Molich, "Heuristic Evaluation of User Interfaces," CHI 1990.
- **Link:** https://www.nngroup.com/articles/ten-usability-heuristics/
- **Judged by:** askable.

### Nielsen 2: Match between system and the real world
- **Rule:** Labels, icons, and metaphors use the audience's own words and familiar real-world conventions, not internal jargon or system terms. Information appears in a natural order.
- **Source:** Nielsen, *10 Usability Heuristics* (1994); Nielsen & Molich (1990).
- **Link:** https://www.nngroup.com/articles/ten-usability-heuristics/
- **Judged by:** askable.

### Nielsen 3: User control and freedom
- **Rule:** Every state that can be entered has a visible way out: close, cancel, back, undo, or clear. Modals and flows are never dead ends.
- **Source:** Nielsen, *10 Usability Heuristics* (1994).
- **Link:** https://www.nngroup.com/articles/ten-usability-heuristics/
- **Judged by:** askable.

### Nielsen 4: Consistency and standards
- **Rule:** The same action, term, color, and component style means the same thing everywhere on the screen or set, and follows platform and industry conventions (logo top-left links home, cart icon top-right).
- **Source:** Nielsen, *10 Usability Heuristics* (1994).
- **Link:** https://www.nngroup.com/articles/ten-usability-heuristics/
- **Judged by:** askable.

### Nielsen 5: Error prevention
- **Rule:** The design removes error-prone conditions before they happen: constraints on inputs (date pickers, input types, masks), sensible defaults, and a confirmation step before irreversible actions.
- **Source:** Nielsen, *10 Usability Heuristics* (1994).
- **Link:** https://www.nngroup.com/articles/ten-usability-heuristics/
- **Judged by:** askable as a visual judgment only. Jev is asked about whether inputs visibly constrain what can be entered. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.

### Nielsen 6: Recognition rather than recall
- **Rule:** Options, actions, and context are visible on screen. The user is never made to remember information from another screen; labels sit with fields, not only as placeholders that vanish.
- **Source:** Nielsen, *10 Usability Heuristics* (1994).
- **Link:** https://www.nngroup.com/articles/ten-usability-heuristics/
- **Judged by:** askable.

### Nielsen 7: Flexibility and efficiency of use
- **Rule:** Frequent actions have shortcuts or accelerators (search, filters, keyboard hints, saved or recent items) that do not get in the way of novices.
- **Source:** Nielsen, *10 Usability Heuristics* (1994).
- **Link:** https://www.nngroup.com/articles/ten-usability-heuristics/
- **Judged by:** askable.

### Nielsen 8: Aesthetic and minimalist design
- **Rule:** Every element on the screen supports the user's main task. Extra text, decoration, and secondary content that compete with the primary content are removed or demoted.
- **Source:** Nielsen, *10 Usability Heuristics* (1994).
- **Link:** https://www.nngroup.com/articles/ten-usability-heuristics/
- **Judged by:** askable.

### Nielsen 9: Help users recognize, diagnose, and recover from errors
- **Rule:** Error messages are in plain language, say what went wrong, say how to fix it, and appear next to the problem field with a visible non-color cue (icon, text), never a bare code.
- **Source:** Nielsen, *10 Usability Heuristics* (1994); see also NN/g, "Error-Message Guidelines" (Tim Neusesser and Evan Sunwall, 2023).
- **Link:** https://www.nngroup.com/articles/error-message-guidelines/
- **Judged by:** askable.

### Nielsen 10: Help and documentation
- **Rule:** Where the task is complex, help is findable and contextual (tooltip, hint text, link near the field) and short and task-focused.
- **Source:** Nielsen, *10 Usability Heuristics* (1994).
- **Link:** https://www.nngroup.com/articles/ten-usability-heuristics/
- **Judged by:** askable.

### Norman: Affordances
- **Rule:** Interactive elements look like what they do: buttons look pressable (fill, border, shadow), fields look typeable, and non-interactive elements do not look interactive.
- **Source:** Don Norman, *The Design of Everyday Things* (1988; revised 2013); the term comes from J. J. Gibson, *The Ecological Approach to Visual Perception* (1979).
- **Judged by:** askable.

### Norman: Signifiers
- **Rule:** Clear perceivable cues tell the user where to act and how: underlined or colored links, chevrons on expandable rows, drag handles, labels on icons. Do not rely on hidden gestures alone.
- **Source:** Don Norman, *The Design of Everyday Things*, revised edition (2013), ch. 1.
- **Judged by:** askable.

### Norman: Feedback
- **Rule:** Each control has distinct visible states for hover, focus, pressed, disabled, and selected. Disabled and active states are visually unlike each other and unlike default.
- **Source:** Don Norman, *The Design of Everyday Things* (1988; 2013).
- **Judged by:** askable.

### Norman: Natural mapping
- **Rule:** The spatial layout of controls matches the layout of what they control: a label sits next to its field, a toggle next to its setting, a control near the thing it changes.
- **Source:** Don Norman, *The Design of Everyday Things* (1988; 2013), ch. 1 and 3; Norman, "Natural mapping" in *Psychology of Everyday Things* (1988).
- **Judged by:** askable.

### Norman: Constraints
- **Rule:** The design limits possible actions to valid ones: unavailable options are disabled or hidden, inputs accept only the right type, and only one path is obvious at each step.
- **Source:** Don Norman, *The Design of Everyday Things* (1988; 2013), ch. 4.
- **Judged by:** askable as a visual judgment only. Jev is asked about whether unavailable actions are visibly disabled or absent. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.

### Norman: Conceptual model
- **Rule:** The screen makes the system's structure clear so a first-time user can form a correct mental model: grouping, naming, and navigation show what the product is and how parts relate.
- **Source:** Don Norman, *The Design of Everyday Things* (1988; 2013), ch. 2.
- **Judged by:** askable.

### Shneiderman: Enable frequent users to use shortcuts
- **Rule:** Power-user paths are offered: keyboard shortcut hints, bulk actions, defaults that carry forward. (Overlaps with Nielsen 7 by design; Shneiderman's rule 2.)
- **Source:** Ben Shneiderman, *Designing the User Interface* (1st ed. 1987; 6th ed. 2016 with Plaisant et al.), "Eight Golden Rules."
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Shneiderman: Design dialogs to yield closure
- **Rule:** A multi-step task has clear start, middle, and end: step indicator, final confirmation screen, and a stated next step after success.
- **Source:** Ben Shneiderman, *Designing the User Interface* (1987; 6th ed. 2016), Golden Rule 4.
- **Judged by:** askable.

### Tognazzini: Anticipation
- **Rule:** The design puts what the user is likely to need next in front of them (prefilled defaults, relevant next action, needed information) instead of making them hunt for it.
- **Source:** Bruce Tognazzini, "First Principles of Interaction Design (Revised & Expanded)" (2014).
- **Link:** https://asktog.com/atc/principles-of-interaction-design/
- **Judged by:** askable.

### Krug: Don't make me think (self-evident and scannable)
- **Rule:** Each page is self-evident or at least self-explanatory. Users can tell what it is, what they can do, and where to click within seconds. The page is built for scanning: clear hierarchy, short blocks, obvious clickables.
- **Source:** Steve Krug, *Don't Make Me Think* (2000; revised 2014).
- **Judged by:** askable.

### Fitts's law
- **Rule:** Important targets are large and close to where the pointer or thumb already is; tiny targets, and primary buttons far from the content they act on, are flagged. Minimum interactive target of about 44x44 pt (Apple) or 48x48 dp (Material); WCAG 2.2 sets a floor of 24x24 CSS px.
- **Source:** Paul M. Fitts, "The information capacity of the human motor system in controlling the amplitude of movement," *Journal of Experimental Psychology* 47(6), 1954.
- **Link:** https://lawsofux.com/fittss-law/
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Hick's law
- **Rule:** The number and complexity of choices shown at once is kept small: group or stage options so decision time does not grow; one primary choice per screen where possible.
- **Source:** William E. Hick, "On the rate of gain of information," *Quarterly Journal of Experimental Psychology* 4(1), 1952; Ray Hyman, "Stimulus information as a determinant of reaction time," *J. Exp. Psychol.* 45(3), 1953.
- **Link:** https://lawsofux.com/hicks-law/
- **Judged by:** askable.

### Miller's law (chunking)
- **Rule:** Information is chunked into small groups; do not require users to hold more than a handful of items in mind. Do not treat 7 as a hard limit of menu items; the finding applies to short-term memory load.
- **Source:** George A. Miller, "The Magical Number Seven, Plus or Minus Two," *Psychological Review* 63(2), 1956. (Later work by Nelson Cowan, 2001, argues about 4 chunks.)
- **Link:** https://lawsofux.com/millers-law/
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Jakob's law
- **Rule:** Common patterns are used where users already know them (nav at top or side, search with a magnifier icon, cart top right, standard form controls). Departures need a clear gain.
- **Source:** Jakob Nielsen, "End of Web Design" (Alertbox, 2000) and "Jakob's Law of Internet User Experience" (NN/g video).
- **Link:** https://www.nngroup.com/videos/jakobs-law-internet-ux/
- **Judged by:** askable.

### Aesthetic-usability effect
- **Rule:** Visual polish raises perceived usability, so crit should not let a clean look hide usability faults. Flag a good-looking screen that has weak affordance, low contrast, or an unclear action; polish is not a pass.
- **Source:** Masaaki Kurosu and Kaori Kashimura, "Apparent usability vs. inherent usability," CHI '95 Conference Companion (DOI 10.1145/223355.223680); replicated by Noam Tractinsky, "Aesthetics and apparent usability," CHI '97.
- **Link:** https://lawsofux.com/aesthetic-usability-effect/
- **Judged by:** askable.

### Tesler's law (conservation of complexity)
- **Rule:** Complexity that cannot be removed belongs in the system, not on the user: smart defaults, autofill, detection (card type, country) replace fields and steps the user would have to fill.
- **Source:** Larry Tesler, conservation-of-complexity principle (formulated at Apple, c. 1984, per lawsofux and secondary sources); described in Saffer, *Designing for Interaction* (2006).
- **Link:** https://lawsofux.com/teslers-law/
- **Judged by:** askable.

### Zeigarnik effect
- **Rule:** Unfinished tasks are remembered better, so progress indicators, checklists, and "2 of 5 steps" cues help return and completion. Flag a multi-step flow with no sign of progress.
- **Source:** Bluma Zeigarnik, "Über das Behalten von erledigten und unerledigten Handlungen," *Psychologische Forschung* 9, 1927. (Note: replication is mixed; treat as soft support.)
- **Link:** https://lawsofux.com/zeigarnik-effect/
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Serial position effect
- **Rule:** Users best remember the first and last items in a list, so put the key actions first and last in navigation, menus, and lists, and keep weak items in the middle.
- **Source:** Hermann Ebbinghaus (1885); Bennet B. Murdock, "The serial position effect of free recall," *Journal of Experimental Psychology* 64(5), 1962.
- **Link:** https://lawsofux.com/serial-position-effect/
- **Judged by:** askable.

### Von Restorff effect (isolation effect)
- **Rule:** The one element that is meant to stand out (primary CTA, key price) is the only one styled differently. If many items are emphasized, none stand out.
- **Source:** Hedwig von Restorff, "Über die Wirkung von Bereichsbildungen im Spurenfeld," *Psychologische Forschung* 18, 1933.
- **Link:** https://lawsofux.com/von-restorff-effect/
- **Judged by:** askable.

### Peak-end rule
- **Rule:** The final screen of a flow (confirmation, success, error) and the highest-emotion moment are designed with care: clear outcome, next step, no blank or punishing end state.
- **Source:** Daniel Kahneman, Barbara Fredrickson, Charles Schreiber, Donald Redelmeier, "When More Pain Is Preferred to Less," *Psychological Science* 4(6), 1993.
- **Link:** https://lawsofux.com/peak-end-rule/
- **Judged by:** askable.

### Choice overload
- **Rule:** Offer a curated, ranked set with a default or "recommended" option instead of a large flat set of equal options (plans, products, filters).
- **Source:** Sheena Iyengar and Mark Lepper, "When Choice is Demotivating," *Journal of Personality and Social Psychology* 79(6), 2000. (Meta-analysis by Scheibehenne et al., 2010, shows the effect is context-dependent.)
- **Link:** https://lawsofux.com/choice-overload/
- **Judged by:** askable.

### Cognitive load
- **Rule:** The screen asks for one main thing at a time; extraneous elements (decoration, unrelated links, dense text) that add load without helping the task are cut.
- **Source:** John Sweller, "Cognitive load during problem solving," *Cognitive Science* 12(2), 1988.
- **Link:** https://lawsofux.com/cognitive-load/
- **Judged by:** askable.

### Progressive disclosure
- **Rule:** Advanced or rare options are hidden behind an obvious control (accordion, "More options," details) and primary content is shown first. Do not show every option at once.
- **Source:** Jakob Nielsen, "Progressive Disclosure," Alertbox (2006); originates in J. M. Carroll and M. B. Rosson's "training wheels" work (1987).
- **Link:** https://www.nngroup.com/articles/progressive-disclosure/
- **Judged by:** askable.

### Primary versus secondary action
- **Rule:** One primary action per view is visually dominant (filled, high contrast); secondary actions are lower emphasis (outline or text); cancel and tertiary actions are weakest. Two equal-weight filled buttons is a fault.
- **Source:** Material Design 3, "Buttons" guidance (emphasis levels); Apple HIG, "Buttons"; NN/g, "Visual Hierarchy" and "Button Design" guidance.
- **Link:** https://m3.material.io/components/buttons/guidelines
- **Judged by:** askable.

### Buttons and links must look clickable
- **Rule:** Links are distinguishable from body text by more than color alone (underline or other cue); buttons have a shape, fill, or border. Flat text that is clickable but looks like a label is a fault.
- **Source:** Nielsen Norman Group, "Flat UI Elements Attract Less Attention and Cause Uncertainty" (Kate Moran, 2017); WCAG 2.2 SC 1.4.1 Use of Color.
- **Link:** https://www.nngroup.com/articles/flat-ui-less-attention-cause-uncertainty/
- **Judged by:** askable.

### Destructive action confirmation and safety
- **Rule:** Destructive actions (delete, remove, reset) are visually separated from safe ones, labeled with the specific outcome ("Delete project"), styled as destructive (often red), not the default focus, and followed by a confirmation or undo. Prefer undo to confirmation dialogs.
- **Source:** Apple HIG, "Alerts" and "Buttons"; Material Design, "Dialogs"; Aza Raskin, "Never Use a Warning When You Mean Undo," *A List Apart* (2007).
- **Link:** https://alistapart.com/article/neveruseawarning/
- **Judged by:** askable.

### Empty states
- **Rule:** An empty list or dashboard explains why it is empty and offers the next action (a button or example) instead of a blank area.
- **Source:** NN/g, "Designing Empty States in Complex Applications" (Kate Kaplan, 2021); Material Design, "Empty states."
- **Link:** https://www.nngroup.com/articles/empty-state-interface-design/
- **Judged by:** askable.

### Loading states
- **Rule:** Content that takes time shows a skeleton screen, spinner, or progress bar in the same place, with layout stable (no layout jump). Use progress bars for waits over about 10 seconds.
- **Source:** Jakob Nielsen, "Response Times: The 3 Important Limits" (1993, https://www.nngroup.com/articles/response-times-3-important-limits/); NN/g, "Skeleton Screens 101" (Samhita Tankala, 2023).
- **Link:** https://www.nngroup.com/articles/skeleton-screens/
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Error states
- **Rule:** The error state is visible, near the cause, in plain words, with a fix, preserves what the user typed, and does not rely on color alone. Page-level errors (404, offline) offer a way back.
- **Source:** NN/g, "Error-Message Guidelines" (Tim Neusesser, Evan Sunwall, 2023); WCAG 2.2 SC 3.3.1 Error Identification.
- **Link:** https://www.nngroup.com/articles/error-message-guidelines/
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Forms: labels above fields and never placeholder-only
- **Rule:** Each field has a persistent visible label, placed above (or very close to) the field; the placeholder is not used as the only label.
- **Source:** Luke Wroblewski, *Web Form Design: Filling in the Blanks* (2008); Matteo Penzo, "Label Placement in Forms," UXmatters (2006); NN/g, "Placeholders in Form Fields Are Harmful" (Katie Sherwin, 2014).
- **Link:** https://www.nngroup.com/articles/form-design-placeholders/
- **Judged by:** askable.

### Forms: single column layout
- **Rule:** Forms are one column with a clear top-to-bottom order; multiple fields per row only for short, tightly related pairs (city and zip, month and year).
- **Source:** Luke Wroblewski, *Web Form Design* (2008); Baymard Institute, "Avoid Extensive Multicolumn Layouts".
- **Link:** https://baymard.com/blog/avoid-multi-column-forms
- **Judged by:** askable.

### Forms: inline validation and required markers
- **Rule:** Fields validate when the user leaves them (not on every keystroke, not only at submit) with a visible result by the field; required and optional fields are marked, and optional fields are kept few.
- **Source:** Luke Wroblewski, "Inline Validation in Web Forms," *A List Apart* (2009); Baymard Institute, "Inline Form Validation" research.
- **Link:** https://alistapart.com/article/inline-validation-in-web-forms/
- **Judged by:** askable.

### Redundancy and duplicate controls
- **Rule:** The same action is not offered twice on one screen without reason (two "Sign up" buttons beside each other, repeated links in the same block, header and footer copies competing). Duplicates dilute the primary action.
- **Source:** Nielsen heuristic 8 (aesthetic and minimalist design); Krug, *Don't Make Me Think* (2000), "get rid of half the words, then half of what's left."
- **Judged by:** askable as a visual judgment only. Jev is asked about the same action visibly offered twice without reason. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.

### Platform conventions (Apple HIG and Material)
- **Rule:** Components, navigation patterns, iconography, and gestures follow the target platform's conventions (tab bar at bottom on iOS, back at top left, system icons for share and delete; Material navigation bar, FAB, app bar). Do not mix platform idioms on one screen.
- **Source:** Apple, *Human Interface Guidelines*; Google, *Material Design 3* guidelines.
- **Link:** https://developer.apple.com/design/human-interface-guidelines/ and https://m3.material.io/
- **Judged by:** askable.

### Touch target size and spacing
- **Rule:** Touch targets are at least 44x44 pt (iOS) / 48x48 dp (Android) with spacing of about 8 dp between neighbors. WCAG 2.2 sets a floor of 24x24 CSS px (SC 2.5.8).
- **Source:** Apple HIG, "Layout"; Material Design, "Accessibility: touch targets"; W3C, *WCAG 2.2* SC 2.5.8 (2023).
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- **Judged by:** askable as a visual judgment only. Jev is asked about controls that look too small or too crowded to tap. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.

### Mobile thumb zones
- **Rule:** On phone-sized layouts, the frequent actions sit in the lower, easy-reach area of the screen (bottom nav, bottom primary button) and not in the top corners. Destructive or rare actions go in hard-to-reach areas.
- **Source:** Steven Hoober, "How Do Users Really Hold Mobile Devices?" UXmatters (2013); Josh Clark, *Designing for Touch* (2015).
- **Link:** https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php
- **Judged by:** askable.

### Dark patterns to avoid
- **Rule:** The design does not use deceptive patterns. These include pre-checked opt-ins, a hidden or tiny decline option, confirmshaming ("No, I hate saving money"), fake urgency or scarcity counters, disguised ads, and forced continuity without a clear cancel. A button hierarchy that hides the safe choice counts too.
- **Source:** Harry Brignull, deceptive.design (formerly darkpatterns.org, 2010); Colin M. Gray, Yubo Kou, Bryan Battles, Joseph Hoggatt, Austin L. Toombs, "The Dark (Patterns) Side of UX Design," CHI 2018 (DOI 10.1145/3173574.3174108).
- **Link:** https://www.deceptive.design/types
- **Judged by:** askable.

---

## Data visualization

### Maximise the data-ink ratio
- **Rule:** Most of the ink in a chart encodes data; heavy gridlines, borders, fills, and decoration that carry no information are removed or muted.
- **Source:** Edward Tufte, *The Visual Display of Quantitative Information* (1983), ch. 4
- **Judged by:** askable.

### No chartjunk
- **Rule:** Charts have no ornamental moire patterns, heavy textures, clip art, 3D effects, drop shadows, or decorative backgrounds that compete with the data.
- **Source:** Edward Tufte, *The Visual Display of Quantitative Information* (1983), ch. 5
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Graphical integrity: keep the lie factor near 1
- **Rule:** The visual size of an effect matches the size of the effect in the data. Tufte's lie factor, the size of the effect shown divided by the size in the data, stays near 1. A 10 percent change must not look like a 100 percent change.
- **Source:** Edward Tufte, *The Visual Display of Quantitative Information* (1983), ch. 2 (six principles of graphical integrity)
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Bar charts start at zero
- **Rule:** Bar and area charts have a value axis that begins at zero because bar length encodes value; truncated bar axes are flagged. (Line and dot charts may use a non-zero baseline if labelled.)
- **Source:** Alberto Cairo, *How Charts Lie* (2019); Stephen Few, *Show Me the Numbers* (2004, 2nd ed. 2012)
- **Judged by:** askable.

### Do not distort with 3D
- **Rule:** No 3D bars, pies, or ribbons; extra depth dimension without extra data makes values hard to read and distorts size.
- **Source:** Edward Tufte, *The Visual Display of Quantitative Information* (1983); Stephen Few, *Show Me the Numbers* (2004)
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Rank encodings by perceptual accuracy
- **Rule:** The most important comparison uses the most accurate encoding: position on a common scale, then length, then angle or slope, then area, then volume, then colour saturation or hue.
- **Source:** William Cleveland and Robert McGill, *Graphical Perception: Theory, Experimentation, and Application to the Development of Graphical Methods*, Journal of the American Statistical Association 79(387), 531-554 (1984)
- **Link:** https://www.jstor.org/stable/2288400
- **Judged by:** askable.

### Choose chart type by data relationship
- **Rule:** The chart type fits the question. Comparison across categories takes bars. Change over time takes lines. Part-to-whole takes stacked bars, or a pie with few slices. Distribution takes a histogram or box plot. Correlation takes a scatter plot. Ranking takes sorted bars.
- **Source:** Stephen Few, *Show Me the Numbers* (2nd ed. 2012), ch. 6, "Fundamental Variations of Graphs" (eight types of quantitative relationships); Claus Wilke, *Fundamentals of Data Visualization* (2019)
- **Link:** https://clauswilke.com/dataviz/
- **Judged by:** askable.

### Use pie charts sparingly
- **Rule:** Pies are only for a part-to-whole of about five or fewer slices where exact comparison is not needed; pies with many slices, similar sizes, or several pies to compare are flagged.
- **Source:** Stephen Few, *Show Me the Numbers* (2004); Cleveland and McGill (1984); Wilke, *Fundamentals of Data Visualization* (2019), ch. 10
- **Link:** https://clauswilke.com/dataviz/
- **Judged by:** askable.

### Label directly instead of using a legend
- **Rule:** Series, bars, and lines are labelled at the data itself; if a legend is needed the reader should not have to look back and forth to decode colours.
- **Source:** Edward Tufte, *The Visual Display of Quantitative Information* (1983) (labels placed on the graphic itself); Cole Nussbaumer Knaflic, *Storytelling with Data* (2015); Wilke, *Fundamentals of Data Visualization* (2019)
- **Judged by:** askable.

### Use colour type that matches the data
- **Rule:** Ordered values use a sequential (single-hue lightness) palette, values with a meaningful midpoint use a diverging palette, and unordered categories use a qualitative palette of distinct hues, limited to about 5 to 7 categories.
- **Source:** Cynthia Brewer, *ColorBrewer* and "Color Use Guidelines for Mapping and Visualization" (1994, ch. 7 of MacEachren and Taylor, eds., *Visualization in Modern Cartography*, pp. 123-147); Wilke, *Fundamentals of Data Visualization* (2019), ch. 4
- **Link:** https://colorbrewer2.org/
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Do not rely on colour alone and avoid red-green pairs
- **Rule:** Meaning conveyed by colour is also carried by label, shape, or position, and palettes are distinguishable under common colour-vision deficiency; contrast of marks against background is at least 3:1.
- **Source:** WCAG 2.2, SC 1.4.1 *Use of Color* and SC 1.4.11 *Non-text Contrast*
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Use colour with restraint and emphasis
- **Rule:** Neutral grey carries context and one accent colour highlights the point; a rainbow of colours without meaning is flagged.
- **Source:** Cole Nussbaumer Knaflic, *Storytelling with Data* (2015); Stephen Few, *Information Dashboard Design* (2006)
- **Judged by:** askable.

### Titles and annotations state the takeaway
- **Rule:** The chart title or a caption states the finding ("Sales fell 20% after March"), not only the topic ("Sales by month"), and key points are annotated on the chart.
- **Source:** Alberto Cairo, *The Functional Art* (2012) and *How Charts Lie* (2019); Knaflic, *Storytelling with Data* (2015)
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Label axes, units, and sources
- **Rule:** Every chart has labelled axes (or direct labels) with units, a readable scale, and a data source or date where relevant; the reader should never need to guess what a number measures.
- **Source:** Edward Tufte, *The Visual Display of Quantitative Information* (1983), ch. 2 (clear labelling); Few, *Show Me the Numbers* (2004)
- **Judged by:** askable.

### Keep scales honest and consistent
- **Rule:** Axes are linear unless clearly marked as log, tick intervals are even, no broken axes without a marker, and charts meant for comparison share the same scale.
- **Source:** Alberto Cairo, *How Charts Lie* (2019); Edward Tufte, *The Visual Display of Quantitative Information* (1983)
- **Judged by:** askable.

### Use small multiples for comparison across many series
- **Rule:** Instead of one chart with many overlapping lines or categories, repeat the same small chart with identical scales and layout so differences are visible at a glance.
- **Source:** Edward Tufte, *Envisioning Information* (1990), and *The Visual Display of Quantitative Information* (1983)
- **Judged by:** askable.

### Use sparklines for compact trend context
- **Rule:** Small word-sized trend lines without axes can sit beside numbers in tables and dashboards to show shape and change; they are not used when exact values are needed.
- **Source:** Edward Tufte, *Beautiful Evidence* (2006), ch. 2 (sparklines); Few, *Information Dashboard Design* (2006)
- **Judged by:** askable.

### Sort and order data meaningfully
- **Rule:** Categorical bars are sorted by value (or a natural order such as time, size, or age), not alphabetically or randomly, unless the reader must look up named items.
- **Source:** Stephen Few, *Show Me the Numbers* (2004); Wilke, *Fundamentals of Data Visualization* (2019)
- **Judged by:** askable.

### Dashboards fit on one screen and are glanceable
- **Rule:** A dashboard shows its most important metrics on one screen without scrolling, in a prioritised layout, with the key figures in the top left or the most prominent area.
- **Source:** Stephen Few, *Information Dashboard Design* (2006, 2nd ed. 2013), ch. 3 ("Thirteen Common Mistakes in Dashboard Design" in the 2006 edition), and his white paper "Common Pitfalls in Dashboard Design" (the thirteen mistakes, first of which is exceeding a single screen)
- **Link:** https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf
- **Judged by:** askable.

### Give metrics context and comparison
- **Rule:** A KPI number is shown with a comparison (target, previous period, trend) so the reader can tell good from bad; a bare big number is flagged.
- **Source:** Stephen Few, *Information Dashboard Design* (2006), ch. 3 (mistake 2, "supplying inadequate context for the data"); Few, *Show Me the Numbers* (2004)
- **Judged by:** askable.

### Group related items by proximity, enclosure, and similarity
- **Rule:** Related marks or panels sit together with space between unrelated groups; the Gestalt rules (proximity, similarity, enclosure, connection, continuity) make the intended groups, and only those, look grouped.
- **Source:** Max Wertheimer, "Untersuchungen zur Lehre von der Gestalt II", *Psychologische Forschung* (1923), English translation "Laws of Organization in Perceptual Forms" (1938, in Ellis, *A Source Book of Gestalt Psychology*); Stephen Few, *Information Dashboard Design* (2006), ch. 4, "Tapping into the Power of Visual Perception" (Gestalt principles applied to dashboards)
- **Judged by:** askable.

### Choose visual variables to fit the data type
- **Rule:** Position and size suit quantitative data, hue and shape suit categories, lightness and size suit ordered data; do not encode a category with size or a quantity with shape.
- **Source:** Jacques Bertin, *Sémiologie graphique* (1967; English translation by William J. Berg, *Semiology of Graphics*, 1983)
- **Judged by:** askable.

### Chart vs table: use tables for lookup of exact values
- **Rule:** When readers need precise values or many different units, use a table; when they need patterns, trends, or comparisons, use a chart. A table has aligned numbers (right-aligned, same decimals), light rules, and no heavy grid.
- **Source:** Stephen Few, *Show Me the Numbers* (2004, 2nd ed. 2012), ch. 3, "Differing Roles of Tables and Graphs"; Tufte, *The Visual Display of Quantitative Information* (1983)
- **Judged by:** askable.

### Show uncertainty and sample context
- **Rule:** Estimates, forecasts, and samples are shown with ranges, error bars, or notes about sample size, and projections look different from observed data.
- **Source:** Alberto Cairo, *How Charts Lie* (2019), ch. 5, "Charts That Lie by Concealing or Confusing Uncertainty"; Claus Wilke, *Fundamentals of Data Visualization* (2019), ch. 16
- **Link:** https://clauswilke.com/dataviz/
- **Judged by:** askable.

### Do not truncate or cherry-pick the time range or sample
- **Rule:** Time ranges and subsets show enough context to avoid misleading trends; a chart that begins or ends exactly where it makes the claim look strongest is flagged for review.
- **Source:** Alberto Cairo, *How Charts Lie* (2019), ch. 4 ("Charts That Lie by Displaying Insufficient Data")
- **Judged by:** askable.


---

## Art direction, composition, illustration, and visual coherence

### One focal point
- **Rule:** The image has one clearly dominant element that the eye reaches first; if two or more elements compete at equal weight, flag it.
- **Source:** Donis A. Dondis, *A Primer of Visual Literacy* (1973); Rudolf Arnheim, *Art and Visual Perception* (1954).
- **Judged by:** askable.

### Clear eye path
- **Rule:** The eye can travel from the focal point through secondary elements to the end (for example headline, image, call to action) without hitting dead ends or jumping back.
- **Source:** Rudolf Arnheim, *The Power of the Center* (1982); Dondis, *A Primer of Visual Literacy* (1973).
- **Link:** https://www.ucpress.edu/books/the-power-of-the-center
- **Judged by:** askable.

### Emphasis through contrast, not volume
- **Rule:** The emphasized element is set apart by a clear difference in size, value, color, or isolation. If everything is emphasized, nothing is.
- **Source:** Wucius Wong, *Principles of Form and Design* (1993); Dondis, *A Primer of Visual Literacy* (1973).
- **Link:** https://www.wongwucius.com/publication
- **Judged by:** askable.

### Visual hierarchy has distinct levels
- **Rule:** There are two to four clearly different levels of importance, and each level is distinguishable from the next at a glance.
- **Source:** Josef Müller-Brockmann, *Grid Systems in Graphic Design* (1981); Ellen Lupton and Jennifer Cole Phillips, *Graphic Design: The New Basics* (2008).
- **Judged by:** askable.

### Balance (symmetrical or asymmetrical)
- **Rule:** The visual weight of the composition feels balanced around its center, either by mirroring or by offsetting a large light element with a small heavy one. A lopsided, tipping composition without intent is a fault.
- **Source:** Rudolf Arnheim, *Art and Visual Perception* (1954); Wucius Wong, *Principles of Form and Design* (1993).
- **Judged by:** askable.

### Symmetry is chosen, and static by default
- **Rule:** Strict symmetry is used only when stability, formality, or calm is the intended mood. Near-symmetry that looks like a mistake (slightly off-center) is a fault.
- **Source:** Rudolf Arnheim, *The Power of the Center* (1982); Bruce Block, *The Visual Story* (2001).
- **Link:** https://www.ucpress.edu/books/the-power-of-the-center
- **Judged by:** askable.

### Contrast of value
- **Rule:** The image uses a clear range of light and dark; the key shapes read in a squinted, grayscale view. A flat mid-gray image with no value structure is a fault.
- **Source:** Andrew Loomis, *Creative Illustration* (1947); Bruce Block, *The Visual Story* (2001).
- **Judged by:** askable.

### Limited, purposeful palette
- **Rule:** The palette uses a small set of related hues (commonly one dominant, one or two supporting, one accent), and each color has a job. Many unrelated saturated hues are a fault.
- **Source:** Josef Albers, *Interaction of Color* (1963); Johannes Itten, *The Art of Color* (1961).
- **Judged by:** askable.

### Color mood matches the message
- **Rule:** The color temperature, saturation, and value support the intended emotion (calm, urgent, playful, serious) and do not contradict the subject.
- **Source:** Bruce Block, *The Visual Story* (2001); Johannes Itten, *The Art of Color* (1961).
- **Judged by:** askable.

### Proportion and scale relationships
- **Rule:** Sizes of elements relate to each other by a visible system (a ratio, a modular scale, or clear steps), and scale differences are strong enough to be intentional, not near-misses.
- **Source:** Wucius Wong, *Principles of Form and Design* (1993); Kimberly Elam, *Geometry of Design* (2001).
- **Judged by:** askable.

### Dominant scale contrast
- **Rule:** At least one element is dramatically larger or smaller than the rest to create drama and focus. Elements all of similar size produce monotony.
- **Source:** Donis A. Dondis, *A Primer of Visual Literacy* (1973) (technique pair: exaggeration/understatement, and scale).
- **Judged by:** askable.

### Unity: parts belong to one whole
- **Rule:** Every element shares at least one visible trait (color, shape language, type, line quality, spacing) with the others so the image reads as one piece, not a collage of unrelated parts.
- **Source:** Wucius Wong, *Principles of Form and Design* (1993); Max Wertheimer, "Untersuchungen zur Lehre von der Gestalt II" (1923; English translation "Laws of Organization in Perceptual Forms," 1938).
- **Link:** https://psychclassics.yorku.ca/Wertheimer/Forms/forms.htm
- **Judged by:** askable.

### Variety to avoid monotony
- **Rule:** Within a unified system, there is enough variation in size, shape, value, or spacing to keep interest. A uniform grid of identical items with no accent is a fault.
- **Source:** Wucius Wong, *Principles of Form and Design* (1993); Lupton and Phillips, *Graphic Design: The New Basics* (2008).
- **Judged by:** askable.

### Repetition and rhythm are regular enough to read
- **Rule:** Repeated elements have consistent spacing or a clear progression, and a deliberate break in the pattern marks the point of emphasis. Irregular spacing that looks accidental is a fault.
- **Source:** Wucius Wong, *Principles of Form and Design* (1993); Lupton and Phillips, *Graphic Design: The New Basics* (2008).
- **Judged by:** askable.

### Proximity groups related items
- **Rule:** Items that belong together sit closer to each other than to unrelated items, and the gaps between groups are clearly larger than gaps within groups.
- **Source:** Max Wertheimer, "Untersuchungen zur Lehre von der Gestalt II" (1923); Robin Williams, *The Non-Designer's Design Book* (1994).
- **Link:** https://www.gestalttheory.net/download/Wertheimer1923_Lehre_von_der_Gestalt.pdf
- **Judged by:** askable.

### Alignment: every element has a visible relationship
- **Rule:** Each element aligns to an edge, axis, or grid line shared with another element. Near-misses (off by a few pixels) read as errors.
- **Source:** Josef Müller-Brockmann, *Grid Systems in Graphic Design* (1981); Robin Williams, *The Non-Designer's Design Book* (1994).
- **Judged by:** askable.

### Use a grid
- **Rule:** The layout follows a consistent underlying grid (columns, margins, baseline), so margins, gutters, and module sizes repeat.
- **Source:** Josef Müller-Brockmann, *Grid Systems in Graphic Design* (1981); Armin Hofmann, *Graphic Design Manual* (1965).
- **Judged by:** askable.

### Negative space is deliberate
- **Rule:** Empty space is shaped and sized on purpose, gives the subject room, and is not just leftover. Crowding to the edges, or large unexplained empty areas, are faults.
- **Source:** Jan Tschichold, *The New Typography* (1928); Josef Müller-Brockmann, *Grid Systems in Graphic Design* (1981).
- **Judged by:** askable.

### Figure-ground is unambiguous
- **Rule:** The viewer can immediately tell the subject (figure) from the background (ground). Ambiguity is acceptable only when it is the concept (as in a deliberate dual-image mark).
- **Source:** Edgar Rubin, *Synsoplevede Figurer* (1915); Molly Bang, *Picture This: How Pictures Work* (1991).
- **Link:** https://www.kb.dk/e-mat/dod/111408024790-bw.pdf
- **Judged by:** askable.

### Rule of thirds and off-center subject placement
- **Rule:** The main subject sits near a third line or intersection, or the image has a clear reason for centering it. A subject placed in an arbitrary spot with no relation to the frame is a fault.
- **Source:** John Thomas Smith, *Remarks on Rural Scenery* (1797); Michael Freeman, *The Photographer's Eye* (2007).
- **Link:** https://archive.org/details/bim_eighteenth-century_remarks-on-rural-scenery_smith-john-thomas_1797
- **Judged by:** askable.

### Golden ratio and proportional division (use sparingly)
- **Rule:** Major divisions of the frame follow a consistent proportional logic (golden section, root rectangles, simple ratios) rather than arbitrary splits. This is a soft guide, not a requirement.
- **Source:** Kimberly Elam, *Geometry of Design* (2001); Jan Tschichold, *The Form of the Book* (1975).
- **Judged by:** askable.

### Leading lines and directional movement
- **Rule:** Lines, edges, gazes, and pointing shapes lead toward the focal point rather than out of the frame. A subject's gaze or motion pointing off the edge needs lead room.
- **Source:** Michael Freeman, *The Photographer's Eye* (2007); Bruce Block, *The Visual Story* (2001).
- **Judged by:** askable.

### Shape language carries emotion
- **Rule:** Shapes support the intended feeling (circles soft and safe, squares stable, triangles and diagonals dynamic or threatening), and the overall shape language fits the message.
- **Source:** Molly Bang, *Picture This: How Pictures Work* (1991); Wassily Kandinsky, *Point and Line to Plane* (1926).
- **Judged by:** askable.

### Tension and dynamism from diagonals and asymmetry
- **Rule:** If the message is energetic or dramatic, the composition uses diagonals, off-balance placement, or tension between elements. If the message is calm, it uses horizontals and stable bases. The structure must match the mood.
- **Source:** Wassily Kandinsky, *Point and Line to Plane* (1926); Molly Bang, *Picture This: How Pictures Work* (1991).
- **Judged by:** askable.

### Line quality and weight are consistent
- **Rule:** Strokes in a set of icons or illustrations share one weight, one cap and join style, and one corner radius. Mixed stroke widths without hierarchy are a fault.
- **Source:** Wucius Wong, *Principles of Form and Design* (1993); Wassily Kandinsky, *Point and Line to Plane* (1926).
- **Judged by:** askable.

### Consistent level of detail across a set
- **Rule:** All illustrations or icons in the image share one level of detail and abstraction (all simple glyphs, or all rendered scenes), not a mix.
- **Source:** Andrew Loomis, *Creative Illustration* (1947); Ellen Lupton and Jennifer Cole Phillips, *Graphic Design: The New Basics* (2008).
- **Judged by:** askable.

### One perspective and one light source
- **Rule:** All objects in a scene share one viewpoint, horizon, and perspective system, and shadows and highlights agree on a single light direction. Mixed isometric and flat, or conflicting shadows, are faults.
- **Source:** Andrew Loomis, *Creative Illustration* (1947); Bruce Block, *The Visual Story* (2001).
- **Judged by:** askable.

### Consistent rendering style across assets
- **Rule:** All imagery shares one treatment (flat vector, line art, photo, 3D render, texture), or mixes them by an explicit system (for example photo cut-outs on flat color). Random mixing of styles is a fault.
- **Source:** Ellen Lupton and Jennifer Cole Phillips, *Graphic Design: The New Basics* (2008); Alina Wheeler, *Designing Brand Identity* (2003).
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Photos treated consistently
- **Rule:** Photos in one design share lighting mood, color grade, crop style, and subject distance. One cold, desaturated photo among warm, bright ones is a fault.
- **Source:** Michael Freeman, *The Photographer's Eye* (2007); David Ogilvy, *Ogilvy on Advertising* (1983).
- **Judged by:** askable.

### Cropping and framing are intentional
- **Rule:** Crops do not cut off heads, hands, or limbs at joints by accident, and tangents (edges that just touch) are avoided. Cropping that is bold and clearly intentional is acceptable.
- **Source:** Michael Freeman, *The Photographer's Eye* (2007); Bruce Block, *The Visual Story* (2001).
- **Judged by:** askable.

### Image quality: sharp, undistorted, at native proportions
- **Rule:** Images are sharp at display size (no visible pixelation or blur from upscaling), keep their original aspect ratio (no stretch or squash), and have no compression artifacts.
- **Source:** David Ogilvy, *Ogilvy on Advertising* (1983), on photograph quality; Michael Freeman, *The Photographer's Eye* (2007).
- **Judged by:** askable.

### Texture and pattern with restraint
- **Rule:** Texture or pattern is used on a limited area or at low contrast so it never competes with the focal point or reduces legibility of text over it.
- **Source:** Wucius Wong, *Principles of Form and Design* (1993); Donis A. Dondis, *A Primer of Visual Literacy* (1973).
- **Judged by:** askable.

### Every ornament does a job
- **Rule:** Every ornament, flourish, gradient, shadow, or effect serves meaning, hierarchy, or mood. Elements that could be removed with no loss are a fault.
- **Source:** Adolf Loos, "Ornament und Verbrechen" (Ornament and Crime) (1908); Dieter Rams, "Ten principles for good design" (c. 1980s).
- **Link:** https://www.vitsoe.com/gb/about/good-design
- **Judged by:** askable.

### Less, but better (reduction)
- **Rule:** The design says its message with as few elements, colors, and typefaces as possible; each remaining element is refined rather than cluttered.
- **Source:** Dieter Rams, *Less but Better / Weniger, aber besser* (1995); Dieter Rams, "Ten principles for good design" (principle 10: good design is as little design as possible).
- **Link:** https://www.vitsoe.com/gb/about/good-design
- **Judged by:** askable.

### Honesty: no fake depth or false promises
- **Rule:** The design does not fake material, depth, or quality it does not have (heavy bevels, fake textures that suggest a different medium, claims not supported by the image).
- **Source:** Dieter Rams, "Ten principles for good design" (principle 6: good design is honest) (c. 1980s).
- **Link:** https://www.vitsoe.com/gb/about/good-design
- **Judged by:** askable.

### One idea per piece (concept)
- **Rule:** The piece communicates a single big idea that can be stated in one sentence, and each visual element supports it. Multiple competing messages are a fault.
- **Source:** David Ogilvy, *Ogilvy on Advertising* (1983); Luke Sullivan, *Hey, Whipple, Squeeze This* (1998).
- **Judged by:** askable.

### Visual and headline work together
- **Rule:** Image and headline are two halves of one idea: neither repeats the other literally, and neither makes sense alone only when it should not. The pair creates meaning that neither has alone.
- **Source:** Bill Bernbach and DDB work, collected in Bob Levenson, *Bill Bernbach's Book* (1987); Luke Sullivan, *Hey, Whipple, Squeeze This* (1998).
- **Link:** https://books.google.com/books/about/Bill_Bernbach_s_Book.html?id=RSV0QgAACAAJ
- **Judged by:** askable.

### Thematic coherence: one mood, one era
- **Rule:** Every element (type, color, imagery, texture, props) fits one mood and one period or world. An anachronistic or off-tone element is a fault unless used as the joke.
- **Source:** Bruce Block, *The Visual Story* (2001); Steven Heller and Seymour Chwast, *Graphic Style: From Victorian to Digital* (2001).
- **Judged by:** askable.

### Poster: one message, readable at distance
- **Rule:** A poster carries one main message that is readable from several meters away (thumbnail test), with secondary details clearly smaller and grouped.
- **Source:** Josef Müller-Brockmann, *The Graphic Artist and His Design Problems* (1961); Alan Fletcher, *The Art of Looking Sideways* (2001).
- **Link:** https://niggli.ch/en/products/gestaltungsprobleme-des-grafikers
- **Judged by:** askable.

### Brand consistency: voice, mark, and clear space
- **Rule:** The logo has clear space around it, is not distorted, recolored off-palette, or crowded by other elements; colors, type, and imagery style match the brand's other pieces.
- **Source:** Alina Wheeler, *Designing Brand Identity* (2003); Paul Rand, *Design, Form, and Chaos* (1993).
- **Judged by:** askable.

### Simplicity and wit in marks and symbols
- **Rule:** A logo or symbol is simple enough to be recognized small and in one color, and is memorable through one clear idea.
- **Source:** Paul Rand, *Design, Form, and Chaos* (1993); Alan Fletcher, *The Art of Looking Sideways* (2001).
- **Judged by:** askable.

### Gestalt grouping: similarity, continuity, closure
- **Rule:** Elements that look alike are read as a group; the design uses similarity, continuity, and closure on purpose, and does not create accidental groupings or shapes between unrelated items.
- **Source:** Max Wertheimer, "Untersuchungen zur Lehre von der Gestalt II" (1923); Rudolf Arnheim, *Art and Visual Perception* (1954).
- **Link:** https://www.gestalttheory.net/download/Wertheimer1923_Lehre_von_der_Gestalt.pdf
- **Judged by:** askable.

### Foundation exercise: the elements and principles check
- **Rule:** The piece makes deliberate use of the basic elements: point, line, shape, form, space, texture, value, color. It can be described in those terms. An element used arbitrarily, such as random line weights or random shapes, is a fault.
- **Source:** Wucius Wong, *Principles of Two-Dimensional Design* (1972); Johannes Itten, *Design and Form: The Basic Course at the Bauhaus* (1963); Wassily Kandinsky, *Point and Line to Plane* (1926).
- **Link:** https://books.google.com/books/about/Principles_of_Two_dimensional_Design.html?id=AWhQAAAAMAAJ
- **Judged by:** askable.
