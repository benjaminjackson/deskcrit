# deskcrit: guideline catalog

The guidelines the seven first-party packs encode, one domain per section.

Note 2026-11-24 (crit-mk9.3): Jev and the `crit` command were removed (`docs/PRD.md` section 1). The design-critic skill reads this catalog through `plugin/skills/design-critic/references/`. The **Judged by** and **Not encoded** lines, and every sentence that says how Jev is asked, record how the packs were built and scored with Jev. They are history, and nothing asks Jev now.

Each guideline has four parts. **Rule** is the testable form a reviewer would apply. **Source** is the original book, standard, or paper, not a blog that repeats it, and it must state the rule. A check that no published source states may give `Common sense` as its source, with one plain sentence that says why the rule holds; such a check may only warn (PRD FR-45). **Link** appears when the source is online or is not a well-known book. **Judged by** says how the rule becomes a Jev question. `askable` means the rule is asked as written. `askable as a visual judgment` means the rule carries a figure (a ratio, a pixel size, a count) that `deskcrit` does not check. Jev is asked only whether the defect is visible. An exact result needs a measuring tool such as axe-core. An entry that a pack encodes also has a **Defect range** line for each criterion, which states the realistic range of the defect that the criterion's fixtures must sit inside (PRD FR-54 rule 2). The line has one of two fixed forms, so a test can compare it with the criterion's `.defect.json` file: "`<criterion-id>`: <font size, contrast ratio, or edge distance> from <a> to <b>[ px], clean above|below." when the fixture renderer can measure it, where "clean above" or "clean below" names the side of the range that is free of the defect, or "`<criterion-id>`: not measured. <the range in words>" when it cannot.

Scope: the design, not the writing. There is no content design section: reading level, sentence length, tone, and terminology belong to a content linter, so that research was dropped. Nielsen's heuristics are kept whole, including the ones that touch wording, because those are usability judgments about the screen rather than prose rules. `deskcrit` does no measurement of its own: it prepares the image, asks the questions, and reads the answers. Rules that are pure formulas, need the DOM, or need a running app are not in this catalog. An entry marked **Not encoded (NG-10)** stays in the catalog as research, but no pack encodes it, because it reads what the content says, needs detail too fine to see, or cannot be judged from one image (PRD NG-10). The mark says which.

A source that could not be confirmed against its book, standard, or paper is marked `UNVERIFIED:` in place. The rule of thirds and the golden ratio are folk wisdom, not tested findings, so their entries say so and they carry low weight.

Sources for the color, accessibility, UX, data visualization, and art direction sections: Benjamin Jackson decided on 2026-10-25 that these five sections may cite the standard references of their field as well as the reading list: Don Norman, *The Design of Everyday Things*; Steve Krug, *Don't Make Me Think*; Jakob Nielsen and the Nielsen Norman Group; W3C WCAG; the Apple Human Interface Guidelines; Google Material Design; Johannes Itten, *The Art of Color*; Adam Wathan and Steve Schoger, *Refactoring UI*; Claus Wilke, *Fundamentals of Data Visualization*; and Stephen Few. The source must still state the rule. They never cite *The Non-Designer's Design Book*. Reason: these fields have their own standard references, and the reading list does not cover them. Reconsider if a check from one of these references starts to stand in for a finer rule that a book on the reading list states.

---

## Typography, legibility, and readability: guidelines for deskcrit

The typography and layout sections draw only on the reading list that Benjamin Jackson chose on 2026-10-24 (bd memory `design-reading-list`). The bar is the difference between considered, detail-oriented work and average work, so rules that any beginner already knows are left out unless one of the books makes a finer point about them. A source was checked in 2026-10 against the book's table of contents or text where a copy could be found online; a point that could not be found in the book is marked `UNVERIFIED:`. A rule that was not found in its source is not encoded in a pack (FR-45), and the entry says so in a **Not encoded (FR-45)** line.

The question in each **Judged by** line follows two rules. Yes always means the defect is there. The question names a concrete feature that can be seen in the image, because the EV-4 run and the wording test of 2026-10-24 found that questions about a degree ("too small", "too long", "almost lined up") do not fire, while questions about a visible feature do. A rule that depends on a difference of a few pixels says so, because Jev will likely miss it.

### Line length (measure)
- **Rule:** A single column of paragraph text must not run so wide that the eye loses its place on the way back to the start of the next line. Bringhurst gives 45 to 75 characters as the comfortable range, 66 as the ideal, and 40 to 50 for text set in several columns.
- **Source:** Bringhurst, *The Elements of Typographic Style* (Version 3.0, 2004), section 2.1.2 "Choose a comfortable measure", p. 26 (from the scan's OCR text): "Anything from 45 to 75 characters is widely regarded as a satisfactory length of line for a single-column page".
- **Judged by:** not encoded. Question tried: "Does a paragraph of body text stretch in one column from the left margin of the page to the right margin, with no sidebar, image, or second column beside it, so that its lines are as wide as the page's content area?"
- **Not encoded (R-4):** `measure-too-long` was removed under R-4: 1 of 5 positives quiet after one rewording (a482a92), 2026-10-24.

### Leading suits the measure
- **Rule:** Line spacing is chosen for the typeface, the text, and the measure together, and the longer the line, the more space it needs between lines. A wide paragraph set with tight line spacing is the common fault.
- **Source:** Bringhurst, *The Elements of Typographic Style*, section 2.2.1 "Choose a basic leading that suits the typeface, text and measure", p. 37 (read from the page image): "Longer measures need more lead than short ones."; Hochuli, *Detail in Typography* (Hyphen Press, 2008), chapter "Linespacing, the column", p. 47: "The longer the line, the more linespacing it needs, for a given typeface and type size."
- **Judged by:** not encoded. It was tried as two criteria, one for tight leading and one for loose leading. First question tried: "In a paragraph, do the tails of letters such as g, p, and y in one line touch the tall letters such as h, l, and d in the line below, so that the lines run together into one dark mass?" The question must describe what the image shows: on the EV-4 fixture, whose lines overlap, a question about descenders that "nearly touch" scored 0.09. Second question tried: "Do the lines of a paragraph read as separate stripes of text with an empty band under each one, so the paragraph does not hold together as one even grey block?"
- **Not encoded (R-4):** `body-leading-too-tight` was removed under R-4: 5 of 5 positives quiet after one rewording (a482a92), 2026-10-24.
- **Not encoded (R-4):** `body-leading-too-loose` was removed under R-4: 5 of 5 positives quiet after one rewording (a482a92), 2026-10-24.

### Heading lines hold together
- **Rule:** A heading of two or more lines needs tighter line spacing than text, so that it reads as one unit. With text spacing it falls apart into separate lines; set too tight, its lines collide.
- **Source:** Bringhurst, *The Elements of Typographic Style* (Version 3.0, 2004), p. 37 (read from the page image), supports the "lines collide" half: "A short burst of advertising copy or a title might be set with negative leading (18/15, for example), so long as the ascenders and descenders don't collide." Section 2.1.6, p. 30 (from the scan's OCR text), adds that a multi-line heading in letterspaced capitals needs extra space between its lines. UNVERIFIED: the first half, that heading lines need tighter spacing than text, was not found in the 1st edition (2004) of Lupton (the 2nd edition was not checked). Lupton, *Thinking with Type* (1st ed. 2004), pp. 82-83 on line spacing, say nothing about headings. Hochuli, *Detail in Typography* (2008): UNVERIFIED: not found in Hochuli for the first half of the rule (the book leaves heading hierarchy to macrotypography, p. 7). For the "lines collide" half only, p. 28 faults a two-line capitals heading because "the lines in capitals are too tightly set, not optically spaced, and have too little interlinear space."
- **Judged by:** askable for the half about lines that collide. Question: "Do the lines of a multi-line heading touch or overlap each other?"
- **Not encoded (FR-45), the first half:** no checked source says that heading lines need tighter spacing than text, so the `heading-lines-loose` criterion came out of the pack on 2026-10-24.
- **Defect range:** `heading-lines-collide`: not measured. A heading of two or more lines whose line spacing is below its type size, so the descenders of one line touch the ascenders or capitals of the next.

### Typefaces in concord or in clear contrast, never in conflict
- **Rule:** Type elements relate either by concord, which keeps to one family and varies it little, or by contrast, which makes them plainly different. Faces that are alike enough to look like a mistake but different enough to clash are in conflict, and a page that mixes several unrelated faces has no relationship at all.
- **Source:** Dair, *Design with Type* (1967), chapter 7 "Relationships" and chapter 8 "Relationships of concord and contrast". UNVERIFIED: not found in Lupton, *Thinking with Type* (1st ed. 2004), which has no section on mixing typefaces, so the rule rests on Dair.
- **Judged by:** not encoded. Question tried: "Do different blocks of text on the page each have letter shapes from a different kind of typeface, so that one block is in a serif, another in a sans serif, and another in a third kind such as a script, a slab serif, or a decorative face?"
- **Not encoded (NG-10), conflict half only:** telling two near-identical faces apart needs letterform detail too fine to see.
- **Not encoded (R-4):** `too-many-typefaces` was removed under R-4: 1 of 5 positives quiet after one rewording (a482a92), 2026-10-24.

### Weak contrast is worse than none
- **Rule:** When two elements are meant to differ, the difference must be obvious at a glance in at least one of Dair's seven kinds of contrast: size, weight, structure, form, color, direction, and texture. A heading one step bolder or one size larger than its text looks like an accident, not a choice.
- **Source:** Dair, *Design with Type*, chapter 8 "Relationships of concord and contrast" and chapters 8a to 8g, one for each kind of contrast. Dair's point that a contrast must be obvious is confirmed in his booklet *A Typographic Quest No. 5: Typographic Contrast* (Westvaco, 1967), through John D. Berry's account of it. Arnheim, *Art and Visual Perception* (1954, rev. 1974), chapter I "Balance", makes the same point about perception: small differences leave the eye unsure whether two things are equal or unequal.
- **Link:** https://creativepro.com/dot-font-seven-principles-of-typographic-contrast/
- **Judged by:** askable. Question: "Is there a short line standing on its own above a paragraph, where a heading would go, that is set in the same size, weight, and color as the paragraph text under it?" A difference of one or two pixels in size will likely be missed.
- **Defect range:** `heading-indistinct`: not measured. Headings set in the size, weight, and color of the text, or within a pixel or two of its size.

### Contrast from more than size
- **Rule:** Average work builds every level of the hierarchy from size alone, so headings grow very large while their weight, form, and color stay the same as the text. Considered work pairs a smaller step in size with a change of weight, of form (capitals, italic), of structure (serif against sans serif), or of color.
- **Source:** Dair, *Design with Type*, chapters 8a to 8g and chapter 9 "Multiplying the contrasts".
- **Judged by:** askable, as a warning only, because a hierarchy built on size alone is weak rather than wrong. Question: "Are the headings set in the same weight, style, and color as the body text, so that they differ from it only in size?"
- **Defect range:** `headings-differ-only-in-size`: not measured. Headings in the same face, weight, style, and color as the text, larger than it by a clear step.

### Sizes come from a scale
- **Rule:** Text sizes come from a small, deliberate scale, so that each size reads as its own level. Many sizes that are almost the same show that sizes were picked one at a time.
- **Source:** Bringhurst, *The Elements of Typographic Style*, section 3.1.1 "Don't compose without a scale", p. 45 (from the scan's OCR text): "limit yourself, at first, to a modest set of distinct and related intervals."
- **Judged by:** not encoded. Question tried: "Are there two blocks of ordinary paragraph text, in the same typeface and weight and with no heading role, where the letters of one block are a little larger than the letters of the other, so that the two blocks do not match when seen side by side or one after the other?"
- **Not encoded (R-4):** `near-identical-sizes` was removed under R-4: 5 of 5 positives quiet after one rewording (a482a92), 2026-10-24.

### One change at a time for emphasis
- **Rule:** Emphasis inside text changes one thing: italic, or bold, or small capitals. A phrase that is bold, italic, underlined, and colored at once shouts, and considered work never stacks them.
- **Source:** Bringhurst, *The Elements of Typographic Style*, section 3.5.1 "Change one parameter at a time" (partly supported: p. 60 (from the scan's OCR text) is about headings, not stacked emphasis inside text); Lupton, *Thinking with Type* (1st ed. 2004), p. 94: "Emphasizing a word or phrase within a body of text usually requires only one signal." The same page shows "bold, italic, underlined caps!" as a type crime; Hochuli, *Detail in Typography* (2008), p. 44: "Other forms of emphasis – text set in capitals, the semi-bold or bold versions of the text type, underlining, a larger size of type, a different typeface, the use of a second color or tones – produce a restless effect, and hinder linear reading." Hochuli supports this in part only: the book does not discuss stacking several signals.
- **Judged by:** not encoded. Question tried: "Inside a paragraph, is there a word or phrase that is both bold and underlined, both bold and italic, both italic and underlined, or bold or underlined and also in a different colour from the text around it?"
- **Not encoded (R-4):** `stacked-emphasis` was removed under R-4: 1 of 5 positives quiet after one rewording (a482a92), 2026-10-24.

### Even word spacing in justified text
- **Rule:** Justified lines keep their word spaces even. Lines with holes between the words break the even gray of the column, so justify only where the measure is wide enough and hyphenation is on.
- **Source:** Bringhurst, *The Elements of Typographic Style*, sections 2.1.1 and 2.1.2, pp. 26-27 (from the scan's OCR text): "A reasonable maximum in justified text is M/2", and short justified lines "will lead to white acne or pig bristles"; Hochuli, *Detail in Typography* (2008), chapter "The line", p. 34: "If the measure is too narrow – with less than around 50 characters per line – even wordspacing becomes difficult, if not impossible. The wordspaces become obviously uneven and large 'holes' appear."
- **Judged by:** not encoded. Question tried: "In a paragraph whose lines all end at the same right edge, do some lines look stretched, with holes between the words that break the even texture of the text?" Reworded once under R-4 on 2026-10-24, after the old question ("In justified text, do some lines have gaps between words that are much wider than the gaps in the lines around them?") left all 5 positives quiet in its first run (a482a92).
- **Not encoded (R-4):** `justified-word-gaps` was removed under R-4: 5 of 5 positives quiet after one rewording (87d2a2a), 2026-10-24.

### Rivers of white space
- **Rule:** Seen from a distance, a block of text shows no channels of white that run down or across several lines.
- **Source:** Bringhurst, *The Elements of Typographic Style*, supports the rule only in part; the nearest passage is the "white acne" one in sections 2.1.1 and 2.1.2, pp. 26-27 (from the scan's OCR text), on short justified lines, and the book does not use the word "rivers" as a rule; Hochuli, *Detail in Typography* (2008), chapter "Linespacing, the column", p. 47: "Vertical 'rivers' of white space occur on a page when the wordspaces in several lines fall exactly, or almost exactly, under one another."
- **Judged by:** not encoded. Question tried: "In a block of text, do the spaces between words in several lines in a row fall under one another, so that they join into a crooked white streak running down through the grey of the text?"
- **Not encoded (R-4):** `rivers-of-white` was removed under R-4: 5 of 5 positives quiet after one rewording (a482a92), 2026-10-24.

### Rag quality in ragged-right text
- **Rule:** The right edge of ragged text is gently uneven. It does not form a staircase, a wedge, or a regular long-short pattern.
- **Source:** Bringhurst, *The Elements of Typographic Style*, section 2.1.3 "Set ragged if ragged setting suits the text and the page", p. 28 (from the scan's OCR text), partly supported: software rag can look like "a neatly pinched piecrust"; Hochuli, *Detail in Typography* (2008), chapter "The line", p. 35 (from OCR, not checked against the page image): "Wherever possible, irregular rhythms, 'staircases' 'holes' and single words standing at the end of lines should be avoided."
- **Judged by:** not encoded. Question tried: "Trace the right ends of the lines of a left-aligned paragraph. Do they form a regular shape, either a straight diagonal slope where each line is shorter or longer than the one above, or a regular zigzag of long, short, long, short?"
- **Not encoded (R-4):** `rag-staircase` was removed under R-4: 5 of 5 positives quiet after one rewording (a482a92), 2026-10-24.

### Widows, orphans, and runts
- **Rule:** A paragraph does not end with one short word alone on its last line, and a column does not begin with the last line of a paragraph. A heading does not sit at the foot of a column with its text in the next one.
- **Source:** Bringhurst, *The Elements of Typographic Style*, sections 2.4.2 (no short last-line word) and 2.4.8 (never begin a page with the last line of a paragraph). Both are supported. UNVERIFIED: a heading at the foot of a column was not found in Bringhurst.
- **Judged by:** not encoded. Question tried for the paragraph half: "Look at the last line of each paragraph. Is there a last line that holds only one short word, with the rest of that line left empty?"
- **Not encoded (FR-45), the heading half:** a heading at the foot of a column was not found in Bringhurst or any other checked source, so the `heading-at-column-foot` criterion came out of the pack on 2026-10-24.
- **Not encoded (R-4):** `paragraph-runt` was removed under R-4: 4 of 5 positives quiet after one rewording (a482a92), 2026-10-24.

### Paragraph marks: indent or space, not both
- **Rule:** Paragraphs are marked either by a first-line indent or by space between them, never both. The first paragraph after a heading starts flush left, and an indent is at least one en wide.
- **Source:** Bringhurst, *The Elements of Typographic Style*, sections 2.3.1 "Set opening paragraphs flush left" and 2.3.2 (mark the paragraphs after the first with an indent of at least one en). P. 39 (from the scan's OCR text) supports the first-paragraph rule: "If a paragraph is preceded by a title or subhead, the indent is superfluous and can therefore be omitted." UNVERIFIED: the rule "never both indent and space" is not stated.
- **Judged by:** not encoded. Question tried for the first paragraph after a heading: "Directly under a heading, does the first line of the paragraph start to the right of the heading's left edge and of the left edge of that paragraph's other lines?"
- **Not encoded (FR-45), indent and space together:** Bringhurst does not state the rule "never both indent and space", so the `paragraph-indent-and-space` criterion came out of the pack on 2026-10-24.
- **Not encoded (R-4):** `first-paragraph-indented` was removed under R-4: 5 of 5 positives quiet after one rewording (a482a92), 2026-10-24.

### Headings sit with the text they introduce
- **Rule:** A heading sits closer to the text it introduces than to the text before it. Equal space above and below makes the heading float between sections.
- **Source:** Partly supported by Bringhurst, *The Elements of Typographic Style* (Version 3.0, 2004), section 2.2.2, p. 38 (from the scan's OCR text): subheads may be "leaded asymmetrically, with more space above than below", and every worked example puts more space above the heading than below. This is a permitted choice, not a requirement. UNVERIFIED: not found in the 1st edition (2004) of Lupton (the 2nd edition was not checked) or in Hochuli, *Detail in Typography* (2008). Lupton, *Thinking with Type*, "Text" chapter, "Hierarchy".
- **Judged by:** not encoded.
- **Not encoded (FR-45):** Bringhurst allows more space above a subhead than below it but does not require it, and no other checked source states the rule, so the `heading-floats` criterion came out of the pack on 2026-10-24.

### Lines of text align across columns
- **Rule:** In a considered grid the lines of text in neighboring columns sit on the same baselines, and the top and bottom of each picture line up with lines of text. In a refined grid, captions, titles, and subtitles keep to the same line intervals.
- **Source:** Müller-Brockmann, *Grid Systems in Graphic Design* (1981), section "Construction of the grid" (each grid field holds a set number of lines; the first line stands at the top of the field and the last on its bottom; picture edges align with the ascenders and descenders of the text).
- **Judged by:** not encoded. Question tried: "Look across the gap between two columns of text that sit side by side. Is a line of text in one column level with the blank space between two lines in the other column, so that the lines of the two columns do not form straight rows across the gap?"
- **Not encoded (R-4):** `baselines-misaligned` was removed under R-4: 5 of 5 positives quiet after one rewording (a482a92), 2026-10-24.

### Hanging bullets and punctuation
- **Rule:** The left edge of a text block stays crisp. In a bulleted or numbered list, the wrapped lines of an item align with its first word, not with the bullet, and quotation marks at the start of a line hang into the margin.
- **Source:** UNVERIFIED: not found in Lupton, *Thinking with Type* (1st ed. 2004) for the quote-hang point or for the rule that wrapped list lines align with the first word. P. 85 covers punctuation only at the right edge of flush-right text. P. 102 shows hanging indentation as a paragraph style: "Outdent, or hanging indentation". Partly supported by Bringhurst, *The Elements of Typographic Style* (Version 3.0, 2004), section 4.4.2, p. 71 (from the scan's OCR text): a list "should be clarified as much as possible through spatial positioning and pointing, usually done with bullets, dashes or numerals", and numbers can be made visible "by hanging them in the margin". It does not state that wrapped lines align with the first word.
- **Judged by:** not encoded.
- **Not encoded (FR-45):** no checked source says that wrapped list lines align with the first word or that an opening quotation mark hangs into the margin, so the `list-wrap-under-bullet` and `display-quote-not-hung` criteria came out of the pack on 2026-10-24.
- **Not encoded (NG-10), punctuation half in body text:** the defect grows with type size. In body text, a quotation mark that does not hang moves the edge by a few pixels, which is too fine to see.

### Display type is spaced tighter than text
- **Rule:** As type gets larger, the space between its letters and words looks wider, so headlines need tighter letter and word spacing than text. A large heading set with the spacing of text looks loose.
- **Source:** Lupton, *Thinking with Type* (1st ed. 2004), p. 80: "Because the space between characters expands as the type size increases, designers often fine-tune letterspacing when working with large letters." Lupton supports adjusting large type but not tightening it as a rule: on p. 81 she says negative tracking "is rarely desirable" and "should be used sparingly". Bringhurst, section 2.1.1, p. 26 (from the scan's OCR text): "At larger sizes, when letterfit is tightened, the spacing of words can be tightened as well." Hochuli, *Detail in Typography* (2008), p. 34, paraphrased: smaller type sizes need proportionally more word space and larger sizes proportionally less, so a large headline needs tighter word spaces than text.
- **Judged by:** not encoded.
- **Not encoded (FR-45):** Bringhurst allows tighter word spacing at large sizes but does not require it, and no checked source says that display type must have tighter letter spacing than text, so the `display-type-loose` criterion came out of the pack on 2026-10-24.

### Weight and stroke thickness at small sizes
- **Rule:** Hairline and very light weights are for large sizes. Small text needs enough stroke thickness to hold up against its background.
- **Source:** Bringhurst, *The Elements of Typographic Style*, section 6.2.3 (very light weights of Helvetica "reduce coarseness but do little to increase readability"). Partly supported: the page cited, p. 97 (from the scan's OCR text), holds only that remark about Helvetica, not a rule about small sizes.
- **Judged by:** not encoded.
- **Not encoded (FR-45):** the cited page of Bringhurst is about light weights of Helvetica and states no rule about small sizes, so the `thin-small-text` criterion came out of the pack on 2026-10-24.

### Letterspacing (tracking) of text
- **Rule:** Lower-case text keeps the spacing its typeface was designed with. Tracked-out or squeezed lower case in text is a defect.
- **Source:** Bringhurst, *The Elements of Typographic Style*, section 2.1.7 "Don't letterspace the lower case without a reason", p. 31 (from the scan's OCR text) (the line, credited to Goudy, that people who letterspace lower case would steal sheep); Hochuli, *Detail in Typography* (2008), chapter "The word", p. 25: "too tight letterspacing produces blotchy, uneven words." Hochuli allows a few extra units of letterspacing for narrow faces at small sizes.
- **Judged by:** not encoded.
- **Not encoded (NG-10):** differences in tracking at text size are too fine to see.

### Letterspace capitals and small caps
- **Rule:** Strings of capitals and small capitals are letterspaced, and lower case is not.
- **Source:** Bringhurst, *The Elements of Typographic Style*, section 2.1.6 "Letterspace all strings of capitals and small caps", p. 30 (from the scan's OCR text): "The normal value for letterspacing these sequences of small or full caps is 5% to 10% of the type size."; Lupton, *Thinking with Type* (1st ed. 2004), p. 81: "It is common practice to letterspace capitals and small capitals, which appear more regal when standing apart." Hochuli, *Detail in Typography* (2008), p. 25: "Widely spaced capitals require a great deal of space around them, and particularly above and below." P. 30 supports the question about capitals that touch: "individual letters should not touch."
- **Judged by:** not encoded. Question tried: "In a heading or label set in capital letters, do the letters look crammed together, so that the word reads as a tight dark block instead of a row of separate letters?" Reworded once under R-4 on 2026-10-24, after the old question ("In a large heading or label set in capitals, do neighbouring capitals touch, with no visible space between them?") was kept by the first run but left positives quiet in later runs on unchanged fixtures. Benjamin Jackson chose a general rewording on 2026-10-24.
- **Not encoded (R-4):** `display-caps-tight` was removed under R-4: 2 of 5 positives quiet after one rewording, 2026-10-24 (db29d61).
- **Not encoded (NG-10), body text:** the defect grows with type size. In capitals at text size, differences in tracking are too fine to see.

### Kerning
- **Rule:** At display sizes, the space between letter pairs looks even: no gaps in pairs such as "AV", "To", and "Wa", and no collisions.
- **Source:** Bringhurst, *The Elements of Typographic Style*, section 2.1.8, p. 32 (from the scan's OCR text): "Kern consistently and modestly or not at all." P. 33 (from the scan's OCR text) adds: "Especially at larger sizes, it is common to kern combinations involving commas and periods." Lupton, *Thinking with Type* (1st ed. 2004), p. 80, supports only that large type needs fine-tuning: "Because the space between characters expands as the type size increases, designers often fine-tune letterspacing when working with large letters." Hochuli, *Detail in Typography* (2008), p. 30: "individual letters should not touch. A small 'hole' between two letters is less bad than letters that collide with each other."
- **Judged by:** not encoded. Question tried: "In a large heading, does the spacing between the letters look uneven, so that at some point a letter seems to stand apart from the letter next to it and the word looks broken there?" Reworded once under R-4 on 2026-10-24, after the old question ("In a large headline, is there a pair of letters, such as AV, To, or Wa, with a gap between them that is visibly wider than the gaps between the other letters?") left all 5 positives quiet in its first run (a482a92).
- **Not encoded (R-4):** `display-kerning-gap` was removed under R-4: 5 of 5 positives quiet after one rewording (87d2a2a), 2026-10-24.
- **Not encoded (NG-10), body text:** the defect grows with type size. At text size, the space between two letters is too fine to see.

### Ligatures
- **Rule:** In a face whose f reaches into the next letter, the f joins the following i or l as a ligature. A large headline that sets "fi" or "fl" as two separate letters shows the hook of the f striking the dot of the i or the top of the l.
- **Source:** Bringhurst, *The Elements of Typographic Style* (Version 3.0, 2004), section 3.3.1, p. 50 (read from the page image): "Reaching into the space in front of it, the arm of the f will collide with certain letters" and "in display work, such ligatures can be crucial." Second source: Butterick, *Practical Typography*, "Ligatures": "The only time ligatures are mandatory is when you have an actual overlap between the letters f and i." Checked on the page on 2026-10-24. Second source: Hochuli, *Detail in Typography* (2008), p. 30, says letters should not collide ("individual letters should not touch"), which supports the rule.
- **Judged by:** not encoded. Question tried, at display and headline sizes only: "In a large headline, where a letter f is followed by a letter i, do the two letters merge at the top, so that the curved top of the f and the dot of the i run together into one dark blob with no gap between them?"
- **Not encoded (NG-10), body text:** the defect grows with type size. At text size, the collision is a pixel or two and too fine to see.
- **Not encoded (R-4):** `display-ligature-missing` was removed under R-4: 5 of 5 positives quiet after one rewording (a482a92), 2026-10-24.

### Real italics, bold, and small caps (no faux styles)
- **Rule:** True italic and bold cuts of a family are used. Slanted romans, smeared bolds, and small caps made by shrinking capitals are defects.
- **Source:** Bringhurst, *The Elements of Typographic Style*, section 3.4.3, p. 56 (from the scan's OCR text): "Use sloped romans sparingly and artificially sloped romans more sparingly still."; section 3.2.2 (faked small caps).
- **Judged by:** not encoded. Question tried, at display and headline sizes only, for faux italics: "In a large slanted heading, do the letters look like ordinary upright letters tipped to the right, for example a two-storey a with a hook over its bowl and round letters that look stretched on a slant, and not the flowing, pen-like shapes of a true italic?"
- **Not encoded (NG-10), body text, faux bold, and faux small caps:** the defect grows with type size. At text size, telling a true italic from a slanted regular face needs letterform detail too fine to see, and a thickened bold or shrunken small caps differ from the real ones by strokes too thin to compare.
- **Not encoded (R-4):** `faux-italic-display` was removed under R-4: 5 of 5 positives quiet after one rewording (a482a92), 2026-10-24.

### Typographic details: quotes, dashes, and spaces
- **Rule:** Curly quotation marks and apostrophes, true en and em dashes, ellipsis characters, and one space after a sentence.
- **Source:** Bringhurst, *The Elements of Typographic Style*, sections 2.1.4 (single word space between sentences; supported) and 5.2.1 (dashes; supported, p. 80 (from the scan's OCR text)). UNVERIFIED: section 5.2.7 contradicts the ellipsis-character point, and section 5.4.1 has nothing on straight versus curly quotation marks, so the curly-quotes point rests on no checked source.
- **Judged by:** not encoded.
- **Not encoded (FR-45):** no checked source states the rule for curly quotation marks, and the question and its fixtures were about quotation marks, so the `display-straight-quotes` criterion came out of the pack on 2026-10-24.
- **Not encoded (NG-10), body text, ellipses, and spaces:** the defect grows with type size. In body text it reads single characters, which is content and detail too fine to see.

### Figures in tables and text
- **Rule:** Columns of numbers use tabular figures aligned on the decimal point or the right edge, and running text uses text figures.
- **Source:** Bringhurst, *The Elements of Typographic Style*, sections 3.2.1 (text figures in running text) and 4.4.3 (align columns of figures flush right or on the decimal).
- **Judged by:** not encoded.
- **Not encoded (NG-10):** telling tabular figures from proportional figures needs detail too fine to see.

### Line breaks in headings and short text
- **Rule:** Headings, buttons, and captions break at natural phrase boundaries and do not split a word, a number and its unit, or a name across lines.
- **Source:** Bringhurst, *The Elements of Typographic Style*, section 2.4 "Etiquette of hyphenation and pagination", section 2.4.6 (link short numerical expressions with hard spaces), which supports a number and its unit; Hochuli, *Detail in Typography* (2008). UNVERIFIED: breaks in headings were not found in Bringhurst or in Hochuli.
- **Judged by:** not encoded.
- **Not encoded (NG-10):** it reads the words to judge where a line breaks, which is the content.


---

## Layout, spacing, grids, alignment, visual hierarchy

### One grid governs the page
- **Rule:** Every block takes its edges from one underlying grid of columns, margins, and intervals, so the same column lines recur from the top of the page to the bottom. A block whose edges match no other block shows that it was placed by eye.
- **Source:** Müller-Brockmann, *Grid Systems in Graphic Design* (1981), sections "Grid and design philosophy" and "Construction of the grid"; Samara, *Making and Breaking the Grid* (3rd ed. 2023), part "Making the Grid".
- **Judged by:** not encoded. Question tried: "Does one block look out of line with the rest of the page, as if it were placed by eye and not on the same columns as the blocks around it?"
- **Not encoded (R-4):** `off-grid-block` was removed under R-4: 4 of 5 positives quiet after two rewordings, 2026-10-24.

### Equal intervals between columns
- **Rule:** The space between columns, cards, or grid fields is one fixed interval across the page.
- **Source:** Müller-Brockmann, *Grid Systems in Graphic Design*, section "Construction of the grid" (the fields are separated by a fixed space, such as one empty line).
- **Judged by:** not encoded. Question tried: "Does a row of columns or cards have an uneven rhythm, so that the row looks irregular instead of a steady, evenly spaced set?"
- **Not encoded (R-4):** `uneven-gutters` was removed under R-4: 5 of 5 positives quiet after two rewordings, 2026-10-24.

### Pictures fit the grid
- **Rule:** An image takes its width from the columns and its top and bottom from the lines of text, so pictures and text share the same edges.
- **Source:** Müller-Brockmann, *Grid Systems in Graphic Design*, sections "Construction of the grid" and "The photograph in the grid system".
- **Judged by:** askable. Question: "Does an image beside a column of text start or end at a different height from that column's first or last line?" An offset of a few pixels will likely be missed.
- **Not encoded (R-4):** left out of the layout pack because Jev did not reach the EV-4 floor on it.

### Break the grid decisively or not at all
- **Rule:** An element that leaves the grid does so by a clear amount, so that the break reads as a choice. An element that is almost aligned reads as an error: Arnheim shows that a placement which is neither clearly here nor clearly there makes the eye waver and the whole look unfinished.
- **Source:** Arnheim, *Art and Visual Perception*, chapter I "Balance" (ambiguous placements and small differences); Samara, *Making and Breaking the Grid*, part "Breaking the Grid". UNVERIFIED: the point that a break must read as deliberate was not found in Samara's text.
- **Judged by:** askable. Question: "Is there an element that sits slightly out of line with the elements above or below it, as if it were meant to line up but missed?" In the wording test an 8 px offset between card tops scored only 0.45 whatever the wording, so offsets of a few pixels are likely below what Jev sees.
- **Not encoded (R-4):** left out of the layout pack because Jev did not reach the EV-4 floor on it.

### Space shows the groups
- **Rule:** The gap between items in one group is clearly smaller than the gap between groups, and a label sits nearer its own field than the one before it. Equal gaps everywhere erase the groups.
- **Source:** Arnheim, *Art and Visual Perception*, chapter II "Shape", on grouping by similarity, where similarity of location is Wertheimer's rule of proximity; Wertheimer, "Untersuchungen zur Lehre von der Gestalt II" (1923).
- **Link:** https://www.gestalttheory.net/download/Wertheimer1923_Lehre_von_der_Gestalt.pdf
- **Judged by:** not encoded. Two criteria were tried; the first question was: "Does a run of content that holds several groups, such as sections under their own headings, flow on with no break in the spacing, so that the eye cannot tell where one group ends and the next begins?"
- **Not encoded (R-4):** `groups-not-separated` was removed under R-4: 4 of 5 positives quiet after two rewordings, 2026-10-24.
- **Not encoded (R-4):** the second criterion, a label as close to the field above as to its own, was left out of the layout pack because Jev did not reach the EV-4 floor on it.

### Unrelated elements do not crowd each other
- **Rule:** Elements that do not belong together keep clear space between them. A caption or paragraph below a diagram has a visible gap above it, not a few pixels.
- **Source:** Arnheim, *Art and Visual Perception*, chapter II "Shape", on grouping by similarity of location (elements that sit close are seen as one group).
- **Judged by:** not encoded. Question tried: "Is a piece of text or a control jammed up against an image, diagram, or box that it does not belong to, with no breathing room between them, so that the two look stuck together?"
- **Not encoded (R-4):** `crowded-unrelated-elements` was removed under R-4: 1 of 5 positives quiet after two rewordings, 2026-10-24.

### White space is gathered, not scattered
- **Rule:** Ruder holds that the printed and the unprinted areas must stand in tension, and that the tension comes from contrast. Considered work gathers empty space into a few large, shaped areas set against dense ones. Average work spreads the same small gap between everything, so no space does any work, and it runs content up to the edges of the page.
- **Source:** Ruder, *Typography: A Manual of Design* (1967), chapters "Contrasts" and "Form and counter-form"; Kunz, *Typography: Macro- and Microaesthetics* (1998), part two, on space and on form and counterform.
- **Judged by:** not encoded. Question tried: "Does the page look evenly filled, with its empty space spread thin between everything and no open area large enough to give the eye a place to rest?"
- **Not encoded (R-4):** `white-space-scattered` was removed under R-4: 5 of 5 positives quiet after two rewordings, 2026-10-24.

### Figure and ground are unambiguous
- **Rule:** Text and key shapes separate clearly from what lies behind them. Text on a photo or texture needs a calm area, a panel, or a scrim behind it.
- **Source:** Arnheim, *Art and Visual Perception*, chapter V "Space", section "Figure and ground"; Ruder, *Typography: A Manual of Design*, chapter "Form and counter-form".
- **Judged by:** not encoded. Question tried: "Does text or a key shape sit straight on a busy photo or pattern, so that parts of it get lost in the picture and it is hard to pick out from what lies behind it?"
- **Not encoded (R-4):** `figure-merges-with-ground` was removed under R-4: 3 of 5 positives quiet after two rewordings, 2026-10-24.

### Balance
- **Rule:** Visual weight comes from size, darkness, color, and isolation, and where an element sits changes its weight. A layout may be symmetrical or not, but a heavy side needs a counterweight.
- **Source:** Arnheim, *Art and Visual Perception*, chapter I "Balance", sections "Weight" and "Psychological and physical balance".
- **Judged by:** not encoded. Question tried: "Does one side of the page carry much more visual weight than the other, with nothing on the lighter side strong enough to balance it?"
- **Not encoded (R-4):** `lopsided-balance` was removed under R-4: 1 of 5 positives quiet (--4) after one rewording, 2026-10-24.

### One element dominates
- **Rule:** The order of importance is plain: one element is seen first and the rest follow. Tschichold asks that logical order be shown by differences of size, and Hofmann builds compositions from contrasts such as much against little.
- **Source:** Tschichold, *The New Typography* (1928), chapter "The principles of the new typography"; Hofmann, *Graphic Design Manual* (1965), the text chapters "The line" and "Confrontation".
- **Link:** https://www.neugraphic.com/tschichold/tschichold-text5.html
- **Judged by:** askable. Question: "Are there three or more elements of the same size and weight competing to be seen first, with none clearly stronger than the others?"
- **Defect range:** `no-dominant-element`: not measured. Three or more elements given the same size, weight, and strength of color, with none clearly stronger than the others.

### Contrast of scale gives the page tension
- **Rule:** Considered layouts set strong contrasts against each other: one very large element against small ones, a vertical against horizontals, dense against open. Hofmann finds the strongest tension where one element comes close to overpowering another. Average layouts make every image, card, and heading about the same size.
- **Source:** Hofmann, *Graphic Design Manual*, the text chapters "The line" and "Confrontation" (contrasts such as much and little, horizontal and vertical, light and dark); Ruder, *Typography: A Manual of Design*, chapter "Contrasts".
- **Judged by:** askable, as a warning only, because an even layout is dull rather than wrong. Question: "Are all the main elements on the page, such as images, cards, and headings, about the same size, with no element much larger than the rest?"
- **Defect range:** `uniform-scale`: not measured. All the main elements of a page, such as images, cards, and headings, set to about the same size.

### No central axis by default
- **Rule:** Tschichold rejects the habit of centering everything on one axis, because it fixes the form before the content is read and makes the layout rigid. An asymmetric arrangement that follows the order of the content is the considered default; centering is a choice for a few short lines.
- **Source:** Tschichold, *The New Typography*, chapter "The principles of the new typography" (central-axis setting and asymmetry).
- **Link:** https://www.neugraphic.com/tschichold/tschichold-text5.html
- **Judged by:** askable, as a warning only, because a centered layout is a style and not an error. Question: "Is every block on the page, including headings, paragraphs of several lines, and buttons, centered on one vertical axis?"
- **Defect range:** `everything-centered`: not measured. Every block on the page, including headings, paragraphs of several lines, and buttons, centered on one vertical axis.

### Repeated elements follow one program
- **Rule:** Gerstner treats design as a program: a set of rules from which each solution is chosen. Elements of one kind (cards, buttons, section headings) therefore share one style and one spacing, and a variant appears only where the rules call for it.
- **Source:** Gerstner, *Designing Programmes* (1964), the introduction ("instead of solutions for problems, programmes for solutions"); Müller-Brockmann, *Grid Systems in Graphic Design*, section "Grid and design philosophy" (the grid as the will to systematize).
- **Judged by:** not encoded. Question tried: "Among elements that are meant to match, such as a row of cards, a set of buttons, or the section headings, does one look as if it came from a different design, breaking the pattern the others set?"
- **Not encoded (R-4):** `inconsistent-repeated-styles` was removed under R-4: 2 of 5 positives quiet after two rewordings, 2026-10-24.

### No rules, boxes, or ornament where space would do
- **Rule:** Lines, borders, and decoration that carry no information compete with the content. Tufte calls it non-data ink and chartjunk; Lupton shows that tables are often over-ruled and are clearer with the rules removed or replaced by a pale tone; Tschichold rejects ornament.
- **Source:** Tufte, *The Visual Display of Quantitative Information* (1983, 2nd ed. 2001), chapter 4 "Data-ink and graphical redesign" and chapter 5 "Chartjunk: vibrations, grids, and ducks"; Lupton, *Thinking with Type* (1st ed. 2004), "Grid" chapter, "Data tables", p. 157: "The rules and boxes used in data tables should illuminate the relationships among data, not trap each entry inside a heavily guarded cell." P. 159 supports replacing rules with a pale tone: "The redesign (above) eliminates many of the ruled lines, replacing them, where needed, with a pale tone that unifies the long horizontal rows of data."; Tschichold, *The New Typography*, chapter "The principles of the new typography".
- **Judged by:** askable. Question: "Is each cell, card, or section drawn inside its own dark outline, so that the page reads as a grid of boxed compartments, or are its rows and sections divided by thick dark lines?"
- **Defect range:** `heavy-rules-and-boxes`: not measured. Every cell, card, or section enclosed in a near-black border or rule 1 to 2 px wide.

### Optical alignment over mathematical alignment
- **Rule:** Round and pointed shapes overshoot, and icons center by visual mass rather than by bounding box, so that they look aligned.
- **Source:** UNVERIFIED: no section on optical correction was found. Kunz, *Typography: Macro- and Microaesthetics*, part one, on the microaesthetic qualities of letters and signs.
- **Judged by:** not encoded.
- **Not encoded (NG-10):** optical offsets are a pixel or two, too fine to see.


---

## Basics: checks for common mistakes

These checks catch plain mistakes that coding agents often make. They are kept in a separate "basics" pack, so that a caller who wants only the high bar of the typography and layout packs can switch them off. In EV-4, Jev judged these checks most reliably (0.87 to 0.99), because each one asks about a plain visible feature. The questions follow the same two rules as the typography and layout sections: yes means the defect is there, and the question names a feature that can be seen.

Sources: Benjamin Jackson decided on 2026-10-24 that this section, and only this section, may cite well-known practice references outside the reading list, such as Butterick's *Practical Typography*, Nielsen Norman Group, WCAG, and the Apple and Material Design guidelines. Reason: plain mistakes are rarely the subject of the books on the list, and these references state them directly. It never cites *The Non-Designer's Design Book*, which Benjamin Jackson ruled out as too basic. The typography and layout sections still cite only the reading list. Reconsider if a basics check starts to stand in for a finer rule that a book on the list states.

### Body text is not smaller than the menu and button text
- **Rule:** Paragraph text is set at least as large as the text of the interface around it, such as menu links and button labels. Material 3 sets body text at 16 and button labels at 14.
- **Source:** Google, *Material Design 3*, type scale, in the Flutter API docs for `TextTheme`. `labelLarge`: "Label styles are smaller, utilitarian styles, used for areas of the UI such as text inside of components or very small supporting text in the content body, like captions." and "Used for text on ElevatedButton, TextButton and OutlinedButton." `bodyLarge`: "Body styles are used for longer passages of text." The default sizes, Body Large 16sp and Label Large 14sp, are in Material Components for Android, `docs/theming/Typography.md`. Checked on 2026-10-24. The m3.material.io page draws its text with JavaScript, so the passage was read in Google's Flutter documentation of the same type scale.
- **Link:** https://api.flutter.dev/flutter/material/TextTheme/labelLarge.html
- **Judged by:** not encoded. Question tried: "Is the paragraph text set noticeably smaller than the menu links and button labels on the same page?" Reworded once under R-4 on 2026-10-24, after the old question ("Is the paragraph text so small that its letters cannot be told apart at the size of the image?") left 11 px body text quiet in EV-4 (positives 0.04 to 0.05, 9ca552e). The new question compared the paragraph text with the interface text on the same page, and was chosen in the crit-cy8.37 spike. The old source, Lupton's 9 to 11 pt for printed text, gives an absolute size and does not support the relative rule, so it was replaced.
- **Not encoded (R-4):** `body-text-smaller-than-interface-text` was removed under R-4: 3 of 5 positives quiet (uncertain) after one rewording (d97aa41), 2026-10-24. All 5 negatives stayed quiet. Benjamin Jackson's blind labels agreed with Jev on 6 of 10 images: he said yes for the positives of pairs 1 to 4, and no for `--5.positive` and for every negative. Reason: on these realistic pages, with body text at 11 to 13 px beside menu and button text at 14 to 16 px, Jev does not reliably see the paragraph text as smaller.

### Paragraphs are not set in a decorative face
- **Rule:** Paragraphs are set in a face made for reading. Script, blackletter, and other decorative faces are for a few words of display.
- **Source:** Bringhurst, *The Elements of Typographic Style* (Version 3.0, 2004), chapter 6 "Choosing and combining type", section 6.2.1 (choose faces that suit the task), p. 95 (from the scan's OCR text): a text face is "unlikely to be carrying excess ornament". This supports the rule in part: the passage is about faces for text, and says nothing of script or blackletter by name.
- **Judged by:** askable. Question: "Is the running text, the sentences people are meant to read, set in a handwriting or brush script, blackletter, or other display typeface instead of a plain text face?" Reworded once under R-4 on 2026-10-24, after the old question ("Are paragraphs of text set in a script, blackletter, or other decorative typeface?") gave short passages in a legible script less than 0.7.
- **Defect range:** `decorative-face-for-paragraphs`: not measured. Paragraphs of reading length set in a script, blackletter, or other display face, at the size the page sets its body text or a little larger.

### Text does not read as faint
- **Rule:** Text has a contrast ratio of at least 4.5:1 against its background, or 3:1 for large text.
- **Source:** W3C, *WCAG 2.2*, SC 1.4.3 Contrast (Minimum).
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- **Judged by:** askable as a visual judgment. Question: "Is there text that is pale against its background, such as light gray text on white?"
- **Defect range:** `text-reads-faint`: contrast ratio from 2.5 to 4.4, clean above.

### Paragraphs are not centered or right-aligned
- **Rule:** Paragraphs of several lines are set flush left. Centering is for a few short lines. Tschichold rejects central-axis setting as rigid, and Bringhurst makes ragged setting conditional on the text and the page.
- **Source:** Tschichold, *The New Typography* (1928), chapter "The principles of the new typography"; Bringhurst, *The Elements of Typographic Style*, section 2.1.3 "Set ragged if ragged setting suits the text and the page" (the rule is conditional, so flush left as a default is overstated).
- **Link:** https://www.neugraphic.com/tschichold/tschichold-text5.html
- **Judged by:** askable. Question: "Is a paragraph of four or more lines centered or right-aligned?"
- **Defect range:** `centered-or-right-paragraphs`: not measured. A paragraph of four or more lines set centered or flush right.

### Content keeps clear of the page edge
- **Rule:** Text and boxes sit inside the type area, with a margin between them and the edge of the page.
- **Source:** Müller-Brockmann, *Grid Systems in Graphic Design* (1981), sections "Margin proportions" and "Construction of the type area".
- **Judged by:** not encoded. Question tried: "Does any text, button, or form field sit right against an edge of the page, with almost no space between it and the edge?" The first question was "Does any text or box touch the edge of the page or sit within a few pixels of it?"
- **Not encoded (R-4):** `content-touches-page-edge` was removed under R-4: 4 of 10 positives quiet (--6, --7, --9, --10) after one rewording, 2026-10-24.

### Captions and labels are not too small to read
- **Rule:** Captions, labels, and legal text stay large enough to read. Apple gives 11 pt as the smallest text size on iOS. The figure is not checked.
- **Source:** Apple, *Human Interface Guidelines*, "Typography", table of default and minimum sizes: iOS and iPadOS, default 17 pt, minimum 11 pt. Checked on the rendered page on 2026-10-24.
- **Link:** https://developer.apple.com/design/human-interface-guidelines/typography
- **Judged by:** askable as a visual judgment. Question: "Are captions or labels so small that their letters cannot be told apart at the size of the image?"

### Long text is not set in all capitals
- **Rule:** Capitals suit headings shorter than one line, labels, and captions. A whole sentence or paragraph in capitals is hard to read.
- **Source:** Butterick, *Practical Typography*, "All caps" ("Caps are suitable for headings shorter than one line"; "Don't capitalize whole paragraphs"); Hochuli, *Detail in Typography* (2008), p. 23 (from OCR, not checked against the page image): "Text in capitals is particularly difficult to read and needs a large amount of space."
- **Link:** https://practicaltypography.com/all-caps.html
- **Judged by:** askable. Question: "Is a sentence or paragraph that runs to more than one line set entirely in capital letters?"
- **Defect range:** `all-caps-long-text`: not measured. A sentence or paragraph of two or more lines set entirely in capitals, at the size of the text around it.

### Text is broken into chunks
- **Rule:** Text that people skim is broken up by headings, short paragraphs, and lists. A long unbroken block of text on a screen is a defect.
- **Source:** Nielsen, "How Users Read on the Web" (Nielsen Norman Group, 1997).
- **Link:** https://www.nngroup.com/articles/how-users-read-on-the-web/
- **Judged by:** not encoded. Question tried: "Does text run on as one long, dense block that should be split into shorter paragraphs, a list, or sections under headings?" The first question was "Is there a block of text many lines long with no heading, list, or paragraph break inside it?"
- **Not encoded (R-4):** `wall-of-text` was removed under R-4: 1 of 10 positives quiet (--8) after one rewording, 2026-10-24.

### Boxes do not split or join groups
- **Rule:** Items inside one shared boundary, such as a card, a panel, a tint, or a border, read as a group. Unrelated items do not share a box, and related items are not split across boxes.
- **Source:** Palmer, "Common Region: A New Principle of Perceptual Grouping", *Cognitive Psychology* 24(3), 436 to 447 (1992); Nielsen Norman Group, "The Principle of Common Region: Containers Create Groupings".
- **Link:** https://www.nngroup.com/articles/common-region/
- **Judged by:** askable. Question: "Do unrelated items share one box or tinted panel, or are items that belong together split across two boxes?"

### Secondary actions are not styled as strongly as the primary one
- **Rule:** A view has one high-emphasis action. Other actions use lower-emphasis styles, such as outlined or text buttons.
- **Source:** Material Design 3, "Buttons" guidelines: "Use visually-prominent filled buttons for the most important actions", and "Buttons with primary actions should have a higher visual emphasis through size, color, or shape." Checked on the rendered page on 2026-10-24.
- **Link:** https://m3.material.io/components/buttons/guidelines
- **Judged by:** askable. Question: "Are two or more buttons in one view styled as the same filled, high-emphasis button?"
- **Defect range:** `competing-primary-buttons`: not measured. Two or more buttons in one view with the same filled, high-emphasis style.

### Basics checks dropped for lack of a source
These checks were in the earlier catalog, but no source this section may cite holds them, so no pack encodes them:
- One block that mixes alignments: the only source was *The Non-Designer's Design Book*, which this catalog never cites.
- Cramped and sparse regions side by side: the only sources were Vignelli and Material Design, and Ruder, on the reading list, asks for exactly that contrast of dense and open.
- Z-pattern: folk wisdom, with Edmund Arnold as the only source.


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
- **Judged by:** not encoded. The accessibility section's "Non-text contrast" entry owns this rule, and its criterion `non-text-contrast-faint` was cut after the pre-screen (crit-q25.17), so the color pack does not ask it again.

### Do not use color alone to carry meaning
- **Rule:** Any information shown by color (error state, chart series, link, required field) has a second cue such as text, icon, pattern, underline, or position.
- **Source:** W3C, *WCAG 2.2*, Success Criterion 1.4.1 Use of Color (2023)
- **Link:** https://www.w3.org/TR/WCAG22/#use-of-color
- **Judged by:** owned by the accessibility criterion `meaning-by-color-only`, which asks only about links in running text, so the color pack does not ask it again.

### Links distinguishable from surrounding text
- **Rule:** Inline links that differ from body text only by color need at least 3:1 contrast against the body text color, plus a non-color cue (underline) on hover and focus. Underlining by default is safest.
- **Source:** W3C, *Techniques for WCAG 2.2*, G183 and F73 (G183 gives the 3:1 figure; its current text does not mention a hover or focus cue, which is the older WCAG 2.0 wording, and F73 covers the failure case)
- **Link:** https://www.w3.org/WAI/WCAG22/Techniques/general/G183
- **Judged by:** owned by the accessibility criterion `meaning-by-color-only`, so the color pack does not ask it again.

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
- **Source:** W3C, *Techniques for WCAG 2.2*, F83 "Failure of Success Criterion 1.4.3 and 1.4.6 due to using background images that do not provide sufficient contrast with foreground text (or images of text)". Checked 2026-10-25: F83 says text over a background image needs contrast against "those parts of the image that are most like the text and behind the text", and its examples are lines and dark areas of an image that cross behind the letters. It does not name a remedy; the scrim, overlay or panel in the rule is the plain fix. *Understanding SC 1.4.3* itself only points to F83 for background images.
- **Link:** https://www.w3.org/WAI/WCAG22/Techniques/failures/F83
- **Judged by:** askable. Question: "Is there text set directly on a busy photo or pattern, where the detail behind the letters makes the text hard to pick out?"
- **Defect range:** `text-over-busy-image`: not measured. One heading or lead line set over a detailed region of a photo or illustration with no scrim or panel; the clean side puts a scrim or solid panel behind the same text.

### Color-vision deficiency safety
- **Rule:** The design stays readable and its distinctions stay visible when simulated for protanopia, deuteranopia and tritanopia (about 8% of men have red-green deficiency). Red vs green, and green vs brown, must differ in lightness or carry another cue.
- **Source:** W3C, *WCAG 2.2*, SC 1.4.1 and Understanding SC 1.4.1; Okabe and Ito, *Color Universal Design* (2002)
- **Link:** https://jfly.uni-koeln.de/color/
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Okabe-Ito palette for categorical data
- **Rule:** When a chart needs distinct categories safe for color-blind readers, use the Okabe-Ito eight (black, orange, sky blue, bluish green, yellow, blue, vermillion, reddish purple), and keep to about 8 or fewer categories.
- **Source:** Masataka Okabe and Kei Ito, *Color Universal Design (CUD): How to make figures and presentations that are friendly to colorblind people* (2002/2008)
- **Link:** https://jfly.uni-koeln.de/color/
- **Judged by:** askable as a visual judgment only. Jev is asked about a chart whose categories are told apart by color alone, especially red against green. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.

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
- **Rule:** An analogous scheme uses neighboring hues (roughly within 30 to 60 degrees); it reads calm and cohesive but needs lightness or saturation variation, or one contrasting accent, to avoid flatness.
- **Source:** Johannes Itten, *The Art of Color* (1961)
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.

### Triadic, split-complementary and tetradic schemes
- **Rule:** Triadic (about 120 degrees apart) and split-complementary (a hue plus the two neighbours of its complement) schemes keep one hue dominant and mute the others in saturation or area. Three equally saturated hues at equal weight is a defect.
- **Source:** Johannes Itten, *The Art of Color* (1961), color chords
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked. Question: "Are two or more different vivid hues, not counting photos, each used on large or prominent parts of the design at about the same size and strength, so that no one hue is clearly the main color and the eye has no clear place to start?" Reworded once under R-4 on 2026-10-25 (crit-q25.6), written blind from this entry, its reason, and the old question. The old question was "Do several different vivid colors take equal weight on the page, each on large or prominent elements, so that no one color leads and they compete for attention?"
- **Source check (FR-45):** not confirmed. On 2026-10-25 the only copy of *The Art of Color* found online (archive.org, `artofcolorsubjec00itte`) is lending-only, so the text of the color chords and of the contrast of extension could not be opened. The `competing-saturated-hues` criterion cites `Common sense` and may only warn until a person checks the book.
- **Defect range:** `competing-saturated-hues`: not measured. Two or three vivid hues at similar area on prominent elements, such as feature panels, a large button and an illustration block, none of them a full-width band or the page background; the clean side keeps one of them as the lead hue and turns the others into light tints or neutrals.

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
- **Judged by:** askable. Question: "Is the accent color, the one strong color meant to mark the main action or the most important item, used on so many elements that nothing stands out?"
- **Source check (FR-45):** not confirmed. On 2026-10-25 Apple, *Human Interface Guidelines*, "Color", section "Best practices", states only part of the rule: "Avoid using the same color to mean different things", with the example that the brand color which marks a button as interactive, put on noninteractive text, is confusing. Its "reserve it for elements that truly benefit from emphasis" is about tinting the Liquid Glass material, not about the accent color of a page. No checked text says that an accent spread over many elements stops marking the important one. The Material 3 page could not be read as text (it needs a script to draw). The `accent-overused` criterion cites `Common sense` and may only warn.
- **Defect range:** `accent-overused`: not measured. The accent color on headings, icons, borders, tags and links as well as on the main action; the clean side keeps it on the main action and one highlight and draws the rest in neutrals.

### Limited palette
- **Rule:** A piece has a small defined palette: typically one neutral ramp, one or two brand hues, and semantic status colors. Count distinct hues outside photos and illustrations; many one-off hues indicate no system.
- **Source:** Steve Schoger and Adam Wathan, *Refactoring UI* (2018), "Define your shades"; Material Design 3 color roles
- **Link:** https://m3.material.io/styles/color/roles
- **Judged by:** not encoded. Question tried in the pre-screen: "Does the page use many different hues that do not seem to belong to one palette, so the colors look random instead of planned?"
- **Not encoded:** `many-unrelated-hues` was cut after the pre-screen (crit-q25.17, jev-1.14.0), with pre-screen figures 0.34, 0.25 / 0.02, 0.02.

### Simultaneous contrast
- **Rule:** The same color looks different on different surrounds; compare colors in context. Adjacent colors of similar lightness make edges shimmer, and a gray or small swatch will appear tinted toward the complement of its surround.
- **Source:** Michel Eugène Chevreul, *De la loi du contraste simultané des couleurs* (1839); Josef Albers, *Interaction of Color* (1963)
- **Judged by:** askable.

### Vibrating and clashing combinations
- **Rule:** Avoid fully saturated complementary colors adjacent at similar lightness (red on blue, red on green, magenta on cyan) for text or thin shapes; they vibrate. Separate by lightness difference or a neutral gap.
- **Source:** Josef Albers, *Interaction of Color* (1963); Johannes Itten, *The Art of Color* (1961), contrast of saturation
- **Judged by:** askable. Question: "Is text or a shape in one strong, vivid hue placed directly on a different strong, vivid hue, with neither of the two clearly darker or lighter than the other, so that they would look like nearly the same gray in black and white and the edge between them looks harsh and seems to shimmer?" Reworded once under R-4 on 2026-10-25 (crit-q25.6), written blind from this entry, its reason, and the old question. The old question was "Is there text or a shape in one vivid, saturated color set directly on another vivid color of about the same lightness, so that the edge between them seems to flicker or vibrate?"
- **Source check (FR-45):** not confirmed. On 2026-10-25 the table of contents of *Interaction of Color* (Yale catalog record) shows the chapter "Vibrating boundaries: enforced contours", but no copy of its text could be opened, and Itten's contrast of saturation is about muting a color, not about vibrating edges. The `vibrating-color-pair` criterion cites `Common sense` and may only warn until a person checks the Albers chapter.
- **Defect range:** `vibrating-color-pair`: not measured. Display text or a shape in one saturated hue set on its near-complement at about the same lightness, such as red on blue or magenta on green; the clean side darkens or lightens one of the two, or puts a neutral gap between them.

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
- **Judged by:** askable. Question: "Is a large area of the page, such as a full-width band, a sidebar, or the whole background, filled with a vivid, fully saturated color instead of a muted, light, or dark one?"
- **Source check (FR-45):** not confirmed. On 2026-10-25 neither book could be opened as text: the archive.org copy of *The Art of Color* is lending-only, and *Refactoring UI* is sold only as a paid download. The `saturated-large-areas` criterion cites `Common sense` and may only warn until a person checks either book.
- **Defect range:** `saturated-large-areas`: not measured. One full-width band, sidebar or page background in a fully saturated hue; the clean side fills the same area with a light tint or a dark shade of the same hue.

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
- **Judged by:** askable as a visual judgment only. Jev is asked about the same role shown in visibly different colors across the view, outside charts, which the dataviz pack covers. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core. Question: "Outside any chart, are elements that do the same job, such as the buttons in one row or the cards in one grid, shown in different colors from each other for no visible reason?"
- **Source check (FR-45):** confirmed on 2026-10-25 in Apple, *Human Interface Guidelines*, "Color", section "Best practices": "Use color consistently throughout your interface, especially when you use it to help communicate information like status or interactivity." The Material 3 page could not be read as text (it needs a script to draw), so the criterion cites only Apple.
- **Defect range:** `same-role-different-colors`: not measured. Three to six buttons or cards that do the same job, side by side, each in a different hue; the clean side gives them one shared hue.

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

The accessibility pack (crit-q25.7) encodes five entries below: `meaning-by-color-only`, `field-label-placeholder-only`, `error-without-text`, `chart-without-text`, and `running-text-italic-or-underlined`. Each question is the pre-screen wording (crit-q25.17), with British spelling changed to US spelling only, except the question of `meaning-by-color-only`, which was reworded once under R-4. Each source names the version of the standard it cites (FR-57). No question, title, or fix hint says that a page conforms to or fails WCAG, because one image cannot show that (FR-34, NG-6). The pack cites no legal regime, so the choice between EN 301 549 v3.2.1 and v4.1.1 in the table below does not touch it.

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
- **Not encoded here:** the basics criterion `text-reads-faint` asks it, and a rule has one owner, so the accessibility pack does not ask it again.

### Non-text contrast
- **Rule:** Visual boundaries needed to identify a UI component need at least 3:1 against adjacent colors: an input border, a checkbox, a button edge when there is no other cue. So do meaningful graphics such as chart lines and icons that carry meaning. Also applies to focus and selected states.
- **Source:** WCAG 2.2 SC 1.4.11 (AA)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html
- **Judged by:** not encoded. Question tried in the pre-screen: "Are the borders or outlines that mark out text fields, checkboxes, or other controls so pale against the background that the controls are hard to see?"
- **Not encoded:** `non-text-contrast-faint` was cut after the pre-screen (crit-q25.17), with pre-screen figures 0.42, 0.12 / 0.10, 0.11. Jev stayed quiet on a clear positive.

### Reflow
- **Rule:** At a 320 CSS px wide viewport (400% zoom of 1280 px) content reflows to one column with no horizontal scrolling and no loss of information. Exceptions: data tables, maps, diagrams, video, and toolbars needing two-dimensional layout; vertical content uses 256 CSS px height.
- **Source:** WCAG 2.2 SC 1.4.10 (AA)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/reflow.html
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.
- **Not encoded (NG-10):** breaks NG-10 because it needs a render at 320 px wide, which one image cannot show.

### Images of text
- **Rule:** Text is real text, not a picture of text, unless the exact look is essential (logotype). Applies to web UI; a poster or slide image being raster is a different case.
- **Source:** WCAG 2.2 SC 1.4.5 (AA)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/images-of-text.html
- **Judged by:** askable.
- **Not encoded (NG-10):** breaks NG-10 because telling a picture of text from live text needs detail too fine to see. Cut in M-1 as `text-baked-into-image`: Jev answered true at 0.96 where Benjamin Jackson could not tell.

### Use of color
- **Rule:** Color is not the only way to show information: links inside body text, errors, required fields, chart series, and states need a second cue (underline, icon, label, pattern). Or the link has 3:1 contrast against surrounding text plus a non-color cue on hover and focus.
- **Source:** W3C, WCAG 2.2 (2023), SC 1.4.1 Use of Color (A), and failure technique F73. F73 states the rule for links: "Link underlines or some other non-color visual distinction are required", and "Removing the underline and leaving only the color difference for such links would be a failure". Checked on 2026-10-25.
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
- **Judged by:** askable as a visual judgment, for links in running text only. Question: "Inside a paragraph of running text, are some words or phrases drawn in a different color from the rest of the sentence, as links often are, with nothing else to mark them, such as an underline, a bolder weight, a box, or an icon?" Reworded once under R-4 on 2026-10-25 (crit-q25.7), written blind from this entry, its source, and the old question. The old question was "Are links inside running text, the sentences people are meant to read, set apart from the words around them only by their color, with no underline or other mark?" 1.4.1 also accepts a link with 3:1 contrast against the text around it plus a cue on hover and focus, which a still image cannot show, so the question asks only about a visible mark. Errors, required fields, and chart series are not asked here; `error-without-text` and the dataviz pack cover the cases that can be seen.
- **Defect range:** `meaning-by-color-only`: not measured. Links in paragraphs drawn in an ordinary link color (blue, teal, violet, or green) with the underline removed; the clean side underlines them.

### Sensory characteristics
- **Rule:** Instructions do not rely only on shape, size, position, sound, or color (for example, 'click the green button on the right' needs a name or label too).
- **Source:** WCAG 2.2 SC 1.3.3 (A)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/sensory-characteristics.html
- **Judged by:** not encoded.
- **Not encoded (NG-10):** breaks NG-10 because it reads what the instructions say, which is the content.

### Target size (minimum)
- **Rule:** Pointer targets are at least 24 by 24 CSS px, or smaller targets have enough spacing that a 24 px diameter circle centered on each does not overlap another target or its circle. Exceptions: inline links in text, user-agent controls, essential presentation.
- **Source:** WCAG 2.2 SC 2.5.8 (AA)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- **Judged by:** askable as a visual judgment only. Jev is asked about controls that look too small or too crowded to hit. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.
- **Not encoded (NG-10):** breaks NG-10 because target size is a physical measurement that a screenshot does not show.

### Focus visible
- **Rule:** Every keyboard-focusable element shows a visible focus indicator when focused. Removing the outline with `outline: none` and not replacing it fails.
- **Source:** WCAG 2.2 SC 2.4.7 (AA)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html
- **Judged by:** not encoded.
- **Not encoded (NG-10):** breaks NG-10 because it needs an element in its focus state, and one still image of a page shows no focused element.

### Focus not obscured (minimum)
- **Rule:** A focused element is not entirely hidden by author-created content such as sticky headers, cookie banners, or chat widgets.
- **Source:** WCAG 2.2 SC 2.4.11 (AA)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html
- **Judged by:** not encoded.
- **Not encoded (NG-10):** breaks NG-10 because it needs an element in its focus state, and one still image of a page shows no focused element.

### Focus appearance
- **Rule:** The focus indicator encloses the component or is at least 2 CSS px thick around its perimeter, and changes by at least 3:1 between focused and unfocused states. Included as the quality-tier reading of 2.4.7; it is AAA, not required by any law.
- **Source:** WCAG 2.2 SC 2.4.13 (AAA)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- **Judged by:** not encoded.
- **Not encoded (NG-10):** breaks NG-10 because it needs an element in its focus state, and its figures are measurements that a screenshot does not show.

### Orientation
- **Rule:** Content works in both portrait and landscape unless one orientation is essential (piano app, bank-check deposit).
- **Source:** WCAG 2.2 SC 1.3.4 (AA)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/orientation.html
- **Judged by:** not encoded.
- **Not encoded (NG-10):** breaks NG-10 because it needs a render in each orientation, which one image cannot show.

### Headings and labels
- **Rule:** Headings and form labels describe the topic or purpose of their section or field. 'Click here' or 'Section 1' as a heading fails. Also check a sensible hierarchy with no skipped levels.
- **Source:** WCAG 2.2 SC 2.4.6 (AA)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked.
- **Not encoded (NG-10):** breaks NG-10 because it reads the heading text, which is the content. Cut in M-1 as `headings-describe-content`.

### Labels or instructions
- **Rule:** Every input has a visible label or instruction that stays visible while typing. A placeholder alone is not enough.
- **Source:** Nielsen Norman Group, Katie Sherwin, "Placeholders in Form Fields Are Harmful" (2014), section "Placeholders that Replace Labels", which gives "7 main reasons why placeholders should not be used as replacements for field labels"; W3C, WCAG 2.2 (2023), SC 3.3.2 Labels or Instructions (A), in part. The Understanding page for 3.3.2 says "Labels or instructions are provided when content requires user input" and does not mention placeholders, so NN/g carries the placeholder rule. Both checked on 2026-10-25.
- **Link:** https://www.nngroup.com/articles/form-design-placeholders/
- **Judged by:** askable. Question: "Does a form show text fields whose only label is the pale hint text inside the empty field, with no label outside the field?" The ux section's entry "Forms: labels above fields and never placeholder-only" is owned here.
- **Defect range:** `field-label-placeholder-only`: not measured. Empty text fields whose labels are removed, so the hint text inside each field is its only label; the clean side shows a label above or beside each field.

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
- **Judged by:** not encoded.
- **Not encoded (NG-10):** breaks NG-10 because it compares several pages, and crit judges one image.

### Consistent identification
- **Rule:** The same function has the same label and icon across pages (a search icon is always called 'Search', not 'Find' on another page).
- **Source:** WCAG 2.2 SC 3.2.4 (AA)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html
- **Judged by:** not encoded.
- **Not encoded (NG-10):** breaks NG-10 because it compares several pages, and crit judges one image.

### Consistent help
- **Rule:** Help links, contact details, or chat appear in the same relative place across pages.
- **Source:** WCAG 2.2 SC 3.2.6 (A)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/consistent-help.html
- **Judged by:** not encoded.
- **Not encoded (NG-10):** breaks NG-10 because it compares several pages, and crit judges one image.

### Error identification
- **Rule:** An input error is identified in text, naming the field in error, not only by red color or an icon.
- **Source:** W3C, WCAG 2.2 (2023), SC 3.3.1 Error Identification (A). The criterion text states the rule: "the item that is in error is identified and the error is described to the user in text". Checked on 2026-10-25.
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html
- **Judged by:** askable. Question: "Is a form field marked as wrong only by color or an icon, such as a red border, outline, label color, or warning icon, with no written message that says what is wrong?" The ux section's error-message entry is owned here.
- **Defect range:** `error-without-text`: not measured. One or two fields with a red border, outline, label, or icon after a failed submit, and no message; the clean side adds a short message under each field that says what is wrong.

### Error suggestion
- **Rule:** When an error is detected and a fix is known, the message says how to correct it ('Enter a date like 03/21/2026'), not just 'Invalid input'.
- **Source:** WCAG 2.2 SC 3.3.3 (AA)
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html
- **Judged by:** not encoded.
- **Not encoded (NG-10):** breaks NG-10 because it reads what the error message says, which is the content.

### Apple touch target size
- **Rule:** Interactive controls are at least 44 by 44 points on iOS and iPadOS, with space between them. (visionOS recommends 60 pt.)
- **Source:** Apple, *Human Interface Guidelines: Accessibility* (Buttons, Layout and 'Hit targets')
- **Link:** https://developer.apple.com/design/human-interface-guidelines/accessibility
- **Judged by:** askable as a visual judgment only. Jev is asked about controls that look too small or too crowded to tap. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.
- **Not encoded (NG-10):** breaks NG-10 because target size is a physical measurement that a screenshot does not show.

### Material touch target size
- **Rule:** Touch targets are at least 48 by 48 dp, with at least 8 dp between targets. A visual icon can be smaller if the tap area is 48 dp.
- **Source:** Google, *Android Accessibility Help: Touch target size* (48x48 dp, 8 dp spacing; the Material 3 structure page is JavaScript-rendered and could not be read)
- **Link:** https://support.google.com/accessibility/android/answer/7101858?hl=en
- **Judged by:** askable as a visual judgment only. Jev is asked about controls that look too small or too crowded to tap. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.
- **Not encoded (NG-10):** breaks NG-10 because target size is a physical measurement that a screenshot does not show.

### Dyslexia-friendly typography
- **Rule:** Use a common sans-serif such as Arial, Verdana, or Calibri at 12 to 14 pt (about 16 to 19 px) or larger. Left-align text with no justification. Avoid italics, underline, and all caps for running text. Use wide letter and word spacing.
- **Source:** British Dyslexia Association, *Dyslexia Style Guide* (2023; wording checked against the archived web version, since the PDF returns 403 to scripted requests). The archived page says: "Avoid underlining and italics as this can make the text appear to run together and cause crowding. Use bold for emphasis." Checked on 2026-10-25.
- **Link:** https://web.archive.org/web/20230315034831/www.bdadyslexia.org.uk/advice/employers/creating-a-dyslexia-friendly-workplace/dyslexia-friendly-style-guide
- **Judged by:** askable for italic and underline only. Question: "Is a paragraph of running text, the sentences people are meant to read, set entirely in italic or entirely underlined?" The guide is advice, not a standard, so the criterion is a folk rule and can only warn (FR-56). The question asks about two styles; if the underline half fails EV-4, the one allowed rewording narrows it to italic.
- **Defect range:** `running-text-italic-or-underlined`: not measured. One paragraph of three to six lines set in italic (three pairs) or underlined (two pairs); the clean side sets it upright with no underline.
- **Not encoded (NG-10, R-4):** the font choice, the size, left alignment, and wide spacing are matters of degree, the kind of question that went quiet for the typography leading and size criteria under R-4, and the named fonts would need a font to be named from the image. All capitals for running text is owned by the basics criterion `all-caps-long-text`.

### Dyslexia-friendly line length, spacing, and background
- **Rule:** Line spacing of about 1.5, with extra space around headings and between paragraphs. Lines of about 60 to 70 characters. Cream or soft pastel backgrounds rather than pure white. Headings and bullets instead of dense blocks of text.
- **Source:** British Dyslexia Association, *Dyslexia Style Guide* (2023; wording checked against the archived web version, since the PDF returns 403 to scripted requests)
- **Link:** https://web.archive.org/web/20230315034831/www.bdadyslexia.org.uk/advice/employers/creating-a-dyslexia-friendly-workplace/dyslexia-friendly-style-guide
- **Judged by:** not encoded.
- **Not encoded (NG-10, R-4):** line spacing and line length are figures a screenshot does not show reliably, and degree questions of this kind went quiet under R-4. A cream background is a page-wide preference and a matter of degree, not a defect that one image shows.

### Low-vision large-print guidance
- **Rule:** For print and posters aimed at low-vision readers, RNIB See it Right advises at least 12 pt, and 14 pt or more for wider reach. It also calls for a clear sans-serif, strong contrast, and matte paper to avoid glare. Treat 18 pt as the large-text bar from WCAG.
- **Source:** RNIB, *See it Right: Making Information Accessible* (Clear Print Guidelines)
- **Link:** https://resourcecentre.org.uk/books/see-it-right-making-information-accessible-for-people-with-sight-problems/
- **Judged by:** not encoded.
- **Not encoded (NG-10):** point sizes are physical measurements that a screenshot does not show, matte paper cannot be seen in an image, and strong contrast is owned by the basics criterion `text-reads-faint`.

### Text alternatives for charts and posters (information not conveyed in image alone)
- **Rule:** Key meaning in a chart, infographic, or poster is also stated in text near it (title, summary, data table, caption) rather than only in the picture.
- **Source:** Claus O. Wilke, *Fundamentals of Data Visualization* (O'Reilly, 1st ed. 2019), chapter 22.2 "Axis and legend titles". The criterion rests on one sentence there: "Axis and legend titles and labels explain what the displayed data values are and how they map to plot aesthetics." The section's other point, that axes and legends need titles, is not what the question asks. Checked on 2026-10-25. WCAG 2.2 SC 1.1.1 (A) and its techniques G95 and G92 were checked too: they ask for a text alternative for assistive technology, not for visible labels or a legend, so the criterion does not cite them.
- **Link:** https://clauswilke.com/dataviz/figure-titles-captions.html
- **Judged by:** askable, for the visible labels of a chart only. Question: "Is there a chart or graph with no written labels, axis values, or legend, so a reader cannot tell what its shapes or colors stand for?" A text alternative cannot be seen in a screenshot (NG-10). The dataviz entry "Label axes, units, and sources" is owned here.
- **Defect range:** `chart-without-text`: not measured. A chart drawn with its axis values, category names, and legend switched off, as a chart library does when they are turned off; the card or figure title stays on both sides.


---

## UX and interaction heuristics: four kept checks and research for deskcrit

The ux pack keeps four checks: an action that looks like plain text (`actions-look-like-plain-text`), no sign of where the person is in the site or app (`no-current-location-shown`), two actions side by side that do the same thing (`duplicate-adjacent-actions`), and required form fields with no mark (`required-fields-unmarked`). Every other entry in this section is **Not encoded**, including a dialog with no way out (`dialog-without-exit`), a form set in more than one column (`multi-column-form`), and a primary action out of thumb reach (`primary-action-out-of-thumb-reach`). Rule (Benjamin Jackson, 2026-10-25): a UX check stays only if coding agents often make that mistake and a screenshot shows it. Reason: the other heuristics are either mistakes that coding agents seldom make or judgments that need more than one screen. Reconsider if a pre-screen or EV-4 run shows that coding agents often make one of the dropped mistakes and a screenshot shows it. The other entries stay as research.

NNG heuristics URL base: https://www.nngroup.com/articles/ten-usability-heuristics/ . Laws of UX site: https://lawsofux.com/ (a secondary summary; originals cited per entry).

### Nielsen 1: Visibility of system status
- **Rule:** The design shows the current state (selected tab, active step, progress, saved or unsaved, loading) with a visible indicator. A reviewer should be able to say where the user is and what is happening.
- **Source:** Jakob Nielsen, *10 Usability Heuristics for User Interface Design* (1994, revised since); first stated in Nielsen & Molich, "Heuristic Evaluation of User Interfaces," CHI 1990. For the navigation part of the rule, the ux pack cites Page Laubheimer, "Menu-Design Checklist: 17 UX Guidelines" (Nielsen Norman Group, 2024), guideline 5 "Indicate the User's Current Location in the Menu". Checked 2026-10-25 against the article text, which says that failing to show the current location is probably the most common mistake on website menus.
- **Link:** https://www.nngroup.com/articles/ten-usability-heuristics/ and https://www.nngroup.com/articles/menu-design/
- **Judged by:** askable for the navigation part only, as `no-current-location-shown`. Question: "Does the site's navigation menu look the same for every item, with nothing marking which item is the page the visitor is on now?" Progress, saved state, and loading are not encoded.
- **Defect range:** `no-current-location-shown`: not measured. The current item in the navigation menu is drawn exactly like its siblings. The clean side marks it with one ordinary cue: a bolder weight, an underline or bar, a background, or an accent color. The page heading names the current page on both sides.

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
- **Not encoded:** `dialog-without-exit` passed the pre-screen, but Benjamin Jackson dropped it on 2026-10-25 under the rule in this section's introduction: coding agents seldom ship a dialog with no way out.

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
- **Judged by:** owned by the accessibility criterion `error-without-text`, so the ux pack does not ask it again.

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
- **Source:** Nielsen Norman Group, "Flat UI Elements Attract Less Attention and Cause Uncertainty" (Kate Moran, 2017); WCAG 2.2 SC 1.4.1 Use of Color. The ux pack cites `Common sense` for this rule (FR-45). Krug, *Don't Make Me Think, Revisited* (2014), chapter 3 "Billboard Design 101", has a section "Make it obvious what's clickable", but on 2026-10-25 only its table of contents could be opened, not its text, so it is not confirmed. Moran's article, checked the same day, reports that links styled as static text drew less attention, and says that flat designs can work when other conditions hold, so it does not state the rule that the main action must look clickable.
- **Link:** https://www.nngroup.com/articles/flat-ui-less-attention-cause-uncertainty/
- **Judged by:** askable for the page's main action, as `actions-look-like-plain-text`. Question: "Is the page's main action, such as a submit, buy, or sign-up control, shown as plain text with no button shape, outline, fill, or link styling, so it looks like ordinary words and not like something to click?" Because the source is `Common sense`, the criterion can only warn.
- **Defect range:** `actions-look-like-plain-text`: not measured. The main action is set as a bare word or short phrase in the body text's face, size, weight, and color, with no fill, border, or underline, where the button would sit. It is never shrunk, faded, or hidden. The clean side is an ordinary filled or outlined button, or a plainly styled link.

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
- **Judged by:** owned by the accessibility criterion `field-label-placeholder-only`, so the ux pack does not ask it again.

### Forms: single column layout
- **Rule:** Forms are one column with a clear top-to-bottom order; multiple fields per row only for short, tightly related pairs (city and zip, month and year).
- **Source:** Luke Wroblewski, *Web Form Design* (2008); Baymard Institute, "Avoid Extensive Multicolumn Layouts".
- **Link:** https://baymard.com/blog/avoid-multi-column-forms
- **Judged by:** askable.
- **Not encoded:** `multi-column-form` passed the pre-screen, but Benjamin Jackson dropped it on 2026-10-25 under the rule in this section's introduction: coding agents seldom set a form in several columns.

### Forms: inline validation and required markers
- **Rule:** Fields validate when the user leaves them (not on every keystroke, not only at submit) with a visible result by the field; required and optional fields are marked, and optional fields are kept few.
- **Source:** Luke Wroblewski, "Inline Validation in Web Forms," *A List Apart* (2009); Baymard Institute, "Inline Form Validation" research. For the required-marker part, the ux pack cites Raluca Budiu, "Marking Required Fields in Forms" (Nielsen Norman Group, 2019). Checked 2026-10-25 against the article text, which says to mark all the required fields, for example with an asterisk, and that marking the optional fields as well lightens the user's cognitive load.
- **Link:** https://alistapart.com/article/inline-validation-in-web-forms/ and https://www.nngroup.com/articles/required-fields/
- **Judged by:** askable for the required markers only, as `required-fields-unmarked`. Question: "Does a form show its fields with no mark or word that tells which fields must be filled in and which are optional?"
- **Defect range:** `required-fields-unmarked`: not measured. Every asterisk, every "required" or "optional" word, and the legend are hidden, in a form that mixes required and optional fields. The clean side uses ordinary asterisks with a short legend, or "(optional)" after the optional labels.
- **Not encoded (NG-10):** the inline-validation part, because when a field validates is behavior over time that one screenshot does not show.

### Redundancy and duplicate controls
- **Rule:** The same action is not offered twice on one screen without reason (two "Sign up" buttons beside each other, repeated links in the same block, header and footer copies competing). Duplicates dilute the primary action.
- **Source:** Nielsen heuristic 8 (aesthetic and minimalist design); Krug, *Don't Make Me Think* (2000), "get rid of half the words, then half of what's left."
- **Judged by:** askable for two controls side by side, as `duplicate-adjacent-actions`. Question: "Are there two buttons or links next to each other that do the same thing, with labels that mean the same action?" Header and footer copies are not encoded. The ux pack cites `Common sense` for this rule (FR-45): Nielsen heuristic 8 and Krug's advice on needless words state it only in part, and not the part that the question asks about. Because the source is `Common sense`, the criterion can only warn.
- **Defect range:** `duplicate-adjacent-actions`: not measured. One extra control sits next to the original, styled like the second control on the clean side, with a label that is a plain synonym ("Get started" and "Start now", "Save" and "Save changes"). The clean side shows a control with a different action in the same place.

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
- **Not encoded (NG-10):** breaks NG-10 because target size is a physical measurement that a screenshot does not show.

### Mobile thumb zones
- **Rule:** On phone-sized layouts, the frequent actions sit in the lower, easy-reach area of the screen (bottom nav, bottom primary button) and not in the top corners. Destructive or rare actions go in hard-to-reach areas.
- **Source:** Steven Hoober, "How Do Users Really Hold Mobile Devices?" UXmatters (2013); Josh Clark, *Designing for Touch* (2015).
- **Link:** https://www.uxmatters.com/mt/archives/2013/02/how-do-users-really-hold-mobile-devices.php
- **Judged by:** askable.
- **Not encoded:** `primary-action-out-of-thumb-reach` passed the pre-screen, but Benjamin Jackson dropped it on 2026-10-25 under the rule in this section's introduction: coding agents seldom put a phone screen's main action in a top corner.

### Dark patterns to avoid
- **Rule:** The design does not use deceptive patterns. These include pre-checked opt-ins, a hidden or tiny decline option, confirmshaming ("No, I hate saving money"), fake urgency or scarcity counters, disguised ads, and forced continuity without a clear cancel. A button hierarchy that hides the safe choice counts too.
- **Source:** Harry Brignull, deceptive.design (formerly darkpatterns.org, 2010); Colin M. Gray, Yubo Kou, Bryan Battles, Joseph Hoggatt, Austin L. Toombs, "The Dark (Patterns) Side of UX Design," CHI 2018 (DOI 10.1145/3173574.3174108).
- **Link:** https://www.deceptive.design/types
- **Judged by:** askable.

---

## Data visualization

Sources: the dataviz pack cites practice references (Wilke, Few, and Borland and Taylor) and, where one exists, a page of Tufte's *The Visual Display of Quantitative Information*. FR-45 lets the dataviz pack cite the standard references of its field, among them Wilke and Few (changed 2026-10-25, crit-q25.25). No Tufte page has been checked, so each Tufte page is marked "page unchecked".

### Maximize the data-ink ratio
- **Rule:** Most of the ink in a chart encodes data; heavy gridlines, borders, fills, and decoration that carry no information are removed or muted.
- **Source:** Claus O. Wilke, *Fundamentals of Data Visualization* (O'Reilly, 1st ed. 2019), chapter 23.2 "Background grids"; Edward Tufte, *The Visual Display of Quantitative Information* (Graphics Press, 2nd ed. 2001), chapter 5, section "The Grid", about p. 112, page unchecked.
- **Link:** https://clauswilke.com/dataviz/
- **Judged by:** askable. Question: "Do the lines that only hold a chart together, such as its gridlines, axis lines, borders, or a box around the plot, look as bold and prominent as the bars, lines, or points that show the data?" Reworded once under R-4 on 2026-10-25 (crit-q25.9), written blind from this entry and its sources. The old question was "Is a chart drawn with dark, heavy gridlines, borders, or frames that stand out as strongly as the data marks themselves?"
- **Defect range:** `heavy-gridlines-and-frames`: not measured. Gridlines, axis lines, and a plot frame in dark gray to near-black, 1 to 2 px, about as dark as the data marks.

### No chartjunk
- **Rule:** Charts have no ornamental moire patterns, heavy textures, clip art, 3D effects, drop shadows, or decorative backgrounds that compete with the data.
- **Source:** Stephen Few, "Common Pitfalls in Dashboard Design" (Perceptual Edge, 2006), pitfall 11; Edward Tufte, *The Visual Display of Quantitative Information* (Graphics Press, 2nd ed. 2001), chapter 5, about pp. 107-121, page unchecked.
- **Link:** https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked. Question: "Does a chart carry decoration that shows no data, such as pictures, icons, patterned or textured fills, or ornamental backgrounds behind or inside the marks?"
- **Defect range:** `chartjunk-decoration`: not measured. One kind of decoration per chart at the strength of a charting product's preset, never several at once.

### Graphical integrity: keep the lie factor near 1
- **Rule:** The visual size of an effect matches the size of the effect in the data. Tufte's lie factor, the size of the effect shown divided by the size in the data, stays near 1. A 10 percent change must not look like a 100 percent change.
- **Source:** Edward Tufte, *The Visual Display of Quantitative Information* (1983), ch. 2 (six principles of graphical integrity)
- **Judged by:** not encoded. The lie factor is a measured size, not a plain all-or-nothing feature; `bar-axis-not-at-zero` asks about its most common case.

### Bar charts start at zero
- **Rule:** Bar and area charts have a value axis that begins at zero because bar length encodes value; truncated bar axes are flagged. (Line and dot charts may use a non-zero baseline if labeled.)
- **Source:** Claus O. Wilke, *Fundamentals of Data Visualization* (O'Reilly, 1st ed. 2019), chapter 17.1 "The principle of proportional ink"; Stephen Few, "Common Pitfalls in Dashboard Design" (Perceptual Edge, 2006), pitfall 8; Edward Tufte, *The Visual Display of Quantitative Information* (Graphics Press, 2nd ed. 2001), chapter 2, the Lie Factor, about p. 57, page unchecked, in part.
- **Link:** https://clauswilke.com/dataviz/
- **Judged by:** askable. Question: "Does a bar chart's value axis start above zero, so the bars are cut off at the bottom and the differences between them look larger than they are?"
- **Defect range:** `bar-axis-not-at-zero`: not measured. The value axis starts above zero, so data that differ by under about 30 percent show bars whose lengths differ about 2 to 5 times; the clean side starts at zero.

### Do not distort with 3D
- **Rule:** No 3D bars, pies, or ribbons; extra depth dimension without extra data makes values hard to read and distorts size.
- **Source:** Claus O. Wilke, *Fundamentals of Data Visualization* (O'Reilly, 1st ed. 2019), chapter 26.1 "Avoid gratuitous 3D"; Stephen Few, "Common Pitfalls in Dashboard Design" (Perceptual Edge, 2006), pitfall 7; Edward Tufte, *The Visual Display of Quantitative Information* (Graphics Press, 2nd ed. 2001), chapter 2, about p. 71, page unchecked.
- **Link:** https://clauswilke.com/dataviz/
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked. Question: "Is a chart drawn with a three-dimensional effect, such as bars or pie slices with depth, sides, or a tilted perspective, when the data has no third dimension?"
- **Defect range:** `three-d-chart`: not measured. A moderate extrusion of about 8 to 16 px, or a pie tilted to an ellipse, as office chart defaults draw it.

### Rank encodings by perceptual accuracy
- **Rule:** The most important comparison uses the most accurate encoding: position on a common scale, then length, then angle or slope, then area, then volume, then color saturation or hue.
- **Source:** William Cleveland and Robert McGill, *Graphical Perception: Theory, Experimentation, and Application to the Development of Graphical Methods*, Journal of the American Statistical Association 79(387), 531-554 (1984)
- **Link:** https://www.jstor.org/stable/2288400
- **Judged by:** not encoded. Which comparison matters most depends on what the data says (NG-10).

### Choose chart type by data relationship
- **Rule:** The chart type fits the question. Comparison across categories takes bars. Change over time takes lines. Part-to-whole takes stacked bars, or a pie with few slices. Distribution takes a histogram or box plot. Correlation takes a scatter plot. Ranking takes sorted bars.
- **Source:** Stephen Few, *Show Me the Numbers* (2nd ed. 2012), ch. 6, "Fundamental Variations of Graphs" (eight types of quantitative relationships); Claus Wilke, *Fundamentals of Data Visualization* (2019)
- **Link:** https://clauswilke.com/dataviz/
- **Judged by:** not encoded. The right chart type depends on what the data is and what question it answers (NG-10).

### Use pie charts sparingly
- **Rule:** Pies are only for a part-to-whole of about five or fewer slices where exact comparison is not needed; pies with many slices, similar sizes, or several pies to compare are flagged.
- **Source:** Stephen Few, "Common Pitfalls in Dashboard Design" (Perceptual Edge, 2006), pitfall 5; Claus O. Wilke, *Fundamentals of Data Visualization* (O'Reilly, 1st ed. 2019), chapter 10.1; Edward Tufte, *The Visual Display of Quantitative Information* (Graphics Press, 2nd ed. 2001), about p. 178, page unchecked, in part.
- **Link:** https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf
- **Judged by:** askable. Question: "Does a pie or donut chart have so many slices that the slices are hard to tell apart and compare?"
- **Defect range:** `pie-too-many-slices`: not measured. One pie or donut of 9 to 14 slices, four or more of them thin slivers; the clean side groups the slivers into one Other slice, leaving 4 to 6.

### Label directly instead of using a legend
- **Rule:** Series, bars, and lines are labeled at the data itself; if a legend is needed the reader should not have to look back and forth to decode colors.
- **Source:** Edward Tufte, *The Visual Display of Quantitative Information* (1983) (labels placed on the graphic itself); Cole Nussbaumer Knaflic, *Storytelling with Data* (2015); Wilke, *Fundamentals of Data Visualization* (2019)
- **Judged by:** not encoded. A legend is often acceptable, so this is a matter of degree and not a plain all-or-nothing feature.

### Use color type that matches the data
- **Rule:** Ordered values use a sequential (single-hue lightness) palette, values with a meaningful midpoint use a diverging palette, and unordered categories use a qualitative palette of distinct hues, limited to about 5 to 7 categories.
- **Source:** Claus O. Wilke, *Fundamentals of Data Visualization* (O'Reilly, 1st ed. 2019), chapters 19.2 and 4.2; David Borland and Russell M. Taylor II, "Rainbow Color Map (Still) Considered Harmful", *IEEE Computer Graphics and Applications* 27(2), 2007; Edward Tufte, *The Visual Display of Quantitative Information* (Graphics Press, 2nd ed. 2001), about p. 154, page unchecked, in part.
- **Link:** https://clauswilke.com/dataviz/
- **Judged by:** askable as a visual judgment; the figure in the rule is not checked. Question: "Does a chart or map show values that run from low to high with a rainbow of unrelated hues, such as red, yellow, green, and blue, instead of one color that grows lighter or darker?"
- **Defect range:** `rainbow-for-ordered-values`: not measured. A ramp through 5 to 7 spectrum hues; the clean side is a single-hue light-to-dark ramp with the same steps.

### Do not rely on color alone and avoid red-green pairs
- **Rule:** Meaning conveyed by color is also carried by label, shape, or position, and palettes are distinguishable under common color-vision deficiency; contrast of marks against background is at least 3:1.
- **Source:** WCAG 2.2, SC 1.4.1 *Use of Color* and SC 1.4.11 *Non-text Contrast*
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html
- **Judged by:** not encoded. Question tried in the pre-screen: "Does a chart tell two series or categories apart only by red and green, with no other difference such as labels, shape, pattern, or lightness?"
- **Not encoded:** `series-split-only-by-red-green` was cut after the pre-screen (crit-q25.17, jev-1.14.0), with pre-screen figures 0.06, 0.50 / 0.00, 0.00.

### Use color with restraint and emphasis
- **Rule:** Neutral gray carries context and one accent color highlights the point; a rainbow of colors without meaning is flagged.
- **Source:** Stephen Few, "Common Pitfalls in Dashboard Design" (Perceptual Edge, 2006), pitfall 12; Claus O. Wilke, *Fundamentals of Data Visualization* (O'Reilly, 1st ed. 2019), chapter 19.1.
- **Link:** https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf
- **Judged by:** askable. Question: "Are the bars or marks of a single series drawn in many different colors that encode nothing, when one color would show the same data?"
- **Defect range:** `color-without-meaning`: not measured. One series of 5 to 10 bars, each a different hue from a common categorical palette at the saturation of the clean side's single color.

### Titles and annotations state the takeaway
- **Rule:** The chart title or a caption states the finding ("Sales fell 20% after March"), not only the topic ("Sales by month"), and key points are annotated on the chart.
- **Source:** Alberto Cairo, *The Functional Art* (2012) and *How Charts Lie* (2019); Knaflic, *Storytelling with Data* (2015)
- **Judged by:** not encoded. It asks what the title says (NG-10).

### Label axes, units, and sources
- **Rule:** Every chart has labeled axes (or direct labels) with units, a readable scale, and a data source or date where relevant; the reader should never need to guess what a number measures.
- **Source:** Edward Tufte, *The Visual Display of Quantitative Information* (1983), ch. 2 (clear labeling); Few, *Show Me the Numbers* (2004)
- **Judged by:** owned by the accessibility criterion `chart-without-text`, so the dataviz pack does not ask it again.

### Keep scales honest and consistent
- **Rule:** Axes are linear unless clearly marked as log, tick intervals are even, no broken axes without a marker, and charts meant for comparison share the same scale.
- **Source:** Alberto Cairo, *How Charts Lie* (2019); Edward Tufte, *The Visual Display of Quantitative Information* (1983)
- **Judged by:** not encoded. It needs the tick values read and compared, which is content and detail too fine to see (NG-10).

### Use small multiples for comparison across many series
- **Rule:** Instead of one chart with many overlapping lines or categories, repeat the same small chart with identical scales and layout so differences are visible at a glance.
- **Source:** Edward Tufte, *Envisioning Information* (1990), and *The Visual Display of Quantitative Information* (1983)
- **Judged by:** not encoded. Question tried in the pre-screen: "Does a line chart overlay so many lines that cross each other that the lines form a tangle and no single line can be followed?"
- **Not encoded:** `tangled-overlaid-lines` was cut after the pre-screen (crit-q25.17, jev-1.14.0), with pre-screen figures 0.33, 0.13 / 0.02, 0.01.

### Use sparklines for compact trend context
- **Rule:** Small word-sized trend lines without axes can sit beside numbers in tables and dashboards to show shape and change; they are not used when exact values are needed.
- **Source:** Edward Tufte, *Beautiful Evidence* (2006), ch. 2 (sparklines); Few, *Information Dashboard Design* (2006)
- **Judged by:** not encoded. It says when sparklines may be used, so there is no plain all-or-nothing defect to ask about.

### Sort and order data meaningfully
- **Rule:** Categorical bars are sorted by value (or a natural order such as time, size, or age), not alphabetically or randomly, unless the reader must look up named items.
- **Source:** Stephen Few, *Show Me the Numbers* (2004); Wilke, *Fundamentals of Data Visualization* (2019)
- **Judged by:** not encoded. Whether an order is natural depends on what the labels say (NG-10).

### Dashboards fit on one screen and are glanceable
- **Rule:** A dashboard shows its most important metrics on one screen without scrolling, in a prioritized layout, with the key figures in the top left or the most prominent area.
- **Source:** Stephen Few, *Information Dashboard Design* (2006, 2nd ed. 2013), ch. 3 ("Thirteen Common Mistakes in Dashboard Design" in the 2006 edition), and his white paper "Common Pitfalls in Dashboard Design" (the thirteen mistakes, first of which is exceeding a single screen)
- **Link:** https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf
- **Judged by:** not encoded. One screenshot does not show whether the page scrolls, and "glanceable" is not a plain all-or-nothing feature.

### Give metrics context and comparison
- **Rule:** A KPI number is shown with a comparison (target, previous period, trend) so the reader can tell good from bad; a bare big number is flagged.
- **Source:** Stephen Few, "Common Pitfalls in Dashboard Design" (Perceptual Edge, 2006), pitfall 2; Edward Tufte, *The Visual Display of Quantitative Information* (Graphics Press, 2nd ed. 2001), chapter 2, about p. 74, page unchecked.
- **Link:** https://www.perceptualedge.com/articles/Whitepapers/Common_Pitfalls.pdf
- **Judged by:** askable. Question: "Is a large headline number on a dashboard shown alone, with no unit, no time period, and no comparison such as a change, a target, or an earlier value?"
- **Defect range:** `bare-kpi-number`: not measured. One to four headline numbers that carry only a metric name, without a unit, a period, or a comparison.

### Group related items by proximity, enclosure, and similarity
- **Rule:** Related marks or panels sit together with space between unrelated groups; the Gestalt rules (proximity, similarity, enclosure, connection, continuity) make the intended groups, and only those, look grouped.
- **Source:** Max Wertheimer, "Untersuchungen zur Lehre von der Gestalt II", *Psychologische Forschung* (1923), English translation "Laws of Organization in Perceptual Forms" (1938, in Ellis, *A Source Book of Gestalt Psychology*); Stephen Few, *Information Dashboard Design* (2006), ch. 4, "Tapping into the Power of Visual Perception" (Gestalt principles applied to dashboards)
- **Judged by:** not encoded. Which items are related depends on the content (NG-10), and the layout pack's grouping criterion did not reach the EV-4 floor.

### Choose visual variables to fit the data type
- **Rule:** Position and size suit quantitative data, hue and shape suit categories, lightness and size suit ordered data; do not encode a category with size or a quantity with shape.
- **Source:** Jacques Bertin, *Sémiologie graphique* (1967; English translation by William J. Berg, *Semiology of Graphics*, 1983)
- **Judged by:** not encoded. It depends on what kind of data each mark carries, which the content says (NG-10).

### Chart vs table: use tables for lookup of exact values
- **Rule:** When readers need precise values or many different units, use a table; when they need patterns, trends, or comparisons, use a chart. A table has aligned numbers (right-aligned, same decimals), light rules, and no heavy grid.
- **Source:** Stephen Few, *Show Me the Numbers* (2004, 2nd ed. 2012), ch. 3, "Differing Roles of Tables and Graphs"; Tufte, *The Visual Display of Quantitative Information* (1983)
- **Judged by:** not encoded. It depends on what the reader needs from the numbers (NG-10).

### Show uncertainty and sample context
- **Rule:** Estimates, forecasts, and samples are shown with ranges, error bars, or notes about sample size, and projections look different from observed data.
- **Source:** Alberto Cairo, *How Charts Lie* (2019), ch. 5, "Charts That Lie by Concealing or Confusing Uncertainty"; Claus Wilke, *Fundamentals of Data Visualization* (2019), ch. 16
- **Link:** https://clauswilke.com/dataviz/
- **Judged by:** not encoded. Whether a number is an estimate is something the content says (NG-10).

### Do not truncate or cherry-pick the time range or sample
- **Rule:** Time ranges and subsets show enough context to avoid misleading trends; a chart that begins or ends exactly where it makes the claim look strongest is flagged for review.
- **Source:** Alberto Cairo, *How Charts Lie* (2019), ch. 4 ("Charts That Lie by Displaying Insufficient Data")
- **Judged by:** not encoded. It depends on the claim and on data outside the chart (NG-10).


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
- **Judged by:** not encoded. Question tried in the pre-screen: "Does the large hero image or banner look flat and murky, with almost everything in it at a similar middle lightness and no clear light areas and dark areas?"
- **Not encoded:** `flat-value-structure` was cut after the pre-screen (crit-q25.17, jev-1.14.0), because both positives stayed quiet, at 0.41 and 0.10.

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
- **Source:** Max Wertheimer, "Untersuchungen zur Lehre von der Gestalt II" (1923); Rudolf Arnheim, *Art and Visual Perception* (1954), chapter II "Shape".
- **Link:** https://www.gestalttheory.net/download/Wertheimer1923_Lehre_von_der_Gestalt.pdf
- **Judged by:** askable.

### Alignment: every element has a visible relationship
- **Rule:** Each element aligns to an edge, axis, or grid line shared with another element. Near-misses (off by a few pixels) read as errors.
- **Source:** Josef Müller-Brockmann, *Grid Systems in Graphic Design* (1981), section "Construction of the grid".
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
- **Not encoded (NG-10):** breaks NG-10 because whether a subject's place in the frame is arbitrary or chosen is not a visible defect, and a centred subject is not a defect either.

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
- **Source:** Apple Human Interface Guidelines, "Icons", section "Interface icons", checked on 2026-10-25: "all interface icons in your app need to use a consistent size, level of detail, stroke thickness (or weight), and perspective." The pack cites this page. Andrew Loomis, *Creative Illustration* (1947), and Ellen Lupton and Jennifer Cole Phillips, *Graphic Design: The New Basics* (2008), were listed before and were not checked.
- **Link:** https://developer.apple.com/design/human-interface-guidelines/icons
- **Judged by:** askable. Question: "Do icons that sit together as one set mix very different levels of detail, for example simple outline icons next to detailed, shaded, many-colored icons?"
- **Defect range:** `mixed-level-of-detail`: not measured. A set of 4 to 8 simple icons in which one or two are detailed, shaded, multicolor icons, at the same size.

### One perspective and one light source
- **Rule:** All objects in a scene share one viewpoint, horizon, and perspective system, and shadows and highlights agree on a single light direction. Mixed isometric and flat, or conflicting shadows, are faults.
- **Source:** Andrew Loomis, *Creative Illustration* (1947); Bruce Block, *The Visual Story* (2001).
- **Judged by:** askable.

### Consistent rendering style across assets
- **Rule:** All imagery shares one treatment (flat vector, line art, photo, 3D render, texture), or mixes them by an explicit system (for example photo cut-outs on flat color). Random mixing of styles is a fault.
- **Source:** Common sense. Reason: images shown side by side as one set read as one family, so a set that mixes photographs, flat drawings, and 3D renders looks assembled from unrelated sources rather than designed together. Checked on 2026-10-25 and not found stated: Apple Human Interface Guidelines, "Images". The Material Design imagery page did not open as text, so it counts as not confirmed. Ellen Lupton and Jennifer Cole Phillips, *Graphic Design: The New Basics* (2008), and Alina Wheeler, *Designing Brand Identity* (2003), were listed before, were not checked, and are not on the FR-45 list.
- **Judged by:** askable. Question: "Do images that sit together as one set, such as a row of cards, mix different rendering styles, for example a photograph next to a flat vector illustration next to a glossy 3D render?"
- **Defect range:** `mixed-rendering-styles`: not measured. A row of 3 to 6 images in one set where one or two use a different rendering (photo, flat illustration, or 3D render) at the same size and crop.

### Photos treated consistently
- **Rule:** Photos in one design share lighting mood, color grade, crop style, and subject distance. One cold, desaturated photo among warm, bright ones is a fault.
- **Source:** Michael Freeman, *The Photographer's Eye* (2007); David Ogilvy, *Ogilvy on Advertising* (1983).
- **Judged by:** not encoded. Question tried in the pre-screen: "Do photographs that sit together as one set, such as a row of cards or a gallery, have clearly different color treatments, for example one warm and faded, one cold and blue, one black and white, or one heavily saturated?"
- **Not encoded:** `photos-graded-inconsistently` was cut after the pre-screen (crit-q25.17, jev-1.14.0), because a negative fired at 0.74.

### Cropping and framing are intentional
- **Rule:** Crops do not cut off heads, hands, or limbs at joints by accident, and tangents (edges that just touch) are avoided. Cropping that is bold and clearly intentional is acceptable.
- **Source:** Michael Freeman, *The Photographer's Eye* (2007); Bruce Block, *The Visual Story* (2001).
- **Judged by:** askable.

### Image quality: sharp, undistorted, at native proportions
- **Rule:** Images are sharp at display size (no visible pixelation or blur from upscaling), keep their original aspect ratio (no stretch or squash), and have no compression artifacts.
- **Source:** David Ogilvy, *Ogilvy on Advertising* (1983), on photograph quality; Michael Freeman, *The Photographer's Eye* (2007).
- **Judged by:** not encoded. Question tried in the pre-screen: "Is a photograph or picture on the page visibly stretched or squashed out of its natural proportions, or blurry and blocky because a small image was enlarged?"
- **Not encoded:** `image-stretched-or-pixelated` was cut after the pre-screen (crit-q25.17, jev-1.14.0), because it stayed quiet at 0.13 on the stretched photograph.

### Texture and pattern with restraint
- **Rule:** Texture or pattern is used on a limited area or at low contrast so it never competes with the focal point or reduces legibility of text over it.
- **Source:** Wucius Wong, *Principles of Form and Design* (1993); Donis A. Dondis, *A Primer of Visual Literacy* (1973).
- **Judged by:** not encoded. Question tried in the pre-screen: "Is text or other content placed over a busy, detailed background, such as a strong pattern or a cluttered photograph, so the background competes with what sits on it?"
- **Not encoded:** `busy-texture-behind-content` passed the pre-screen (crit-q25.17) but is not encoded, because the color pack's `text-over-busy-image` owns the same rule and a rule has one owner. The layout pack's `figure-merges-with-ground` asked about the same rule and was removed under R-4.

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

---

## Candidates for other domains from the reading list

These rules come from the same reading list but fall outside typography and layout. They are listed for a later ticket and are not yet checked against the books.

- Color: Albers, *Interaction of Color* (1963). The same color looks different on different grounds, and two colors meant to match can look different next to each other. A visible question asks whether one color, used for one role, looks like two different colors in two places.
- Color: Albers, *Interaction of Color*. Two strong colors of equal lightness side by side make their edge seem to vibrate.
- Charts: Tufte, *The Visual Display of Quantitative Information*, chapter 5. Moiré hatching, heavy grid lines, and three-dimensional effects in a chart are chartjunk.
- Charts: Tufte, *The Visual Display of Quantitative Information*, chapter 4. Ink that can be erased without loss of data, such as a background fill or a frame, is removed.
- Composition: Arnheim, *Art and Visual Perception*, chapter IX "Dynamics". Oblique lines and shapes create directed tension, and a layout that is all horizontals and verticals reads as static.
- Composition: Hofmann, *Graphic Design Manual*, chapter "The dot". A single element placed exactly at the center of a field reads as still, and one placed off center gives the field movement.
- Systems: Gerstner, *Designing Programmes*. Pieces of one series (slides, posters, screens) follow one program of grid, type, and color.
