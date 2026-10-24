# deskcrit: guideline catalog

The guidelines the seven first-party packs encode, one domain per section.

Each guideline has four parts. **Rule** is the testable form a reviewer would apply. **Source** is the original book, standard, or paper, not a blog that repeats it. **Link** appears when the source is online or is not a well-known book. **Judged by** says how the rule becomes a Jev question. `askable` means the rule is asked as written. `askable as a visual judgment` means the rule carries a figure (a ratio, a pixel size, a count) that `deskcrit` does not check. Jev is asked only whether the defect is visible. An exact result needs a measuring tool such as axe-core.

Scope: the design, not the writing. There is no content design section: reading level, sentence length, tone, and terminology belong to a content linter, so that research was dropped. Nielsen's heuristics are kept whole, including the ones that touch wording, because those are usability judgments about the screen rather than prose rules. `deskcrit` does no measurement of its own: it prepares the image, asks the questions, and reads the answers. Rules that are pure formulas, need the DOM, or need a running app are not in this catalog. An entry marked **Not encoded (NG-10)** stays in the catalog as research, but no pack encodes it, because it reads what the content says, needs detail too fine to see, or cannot be judged from one image (PRD NG-10). The mark says which.

A source that could not be confirmed against its book, standard, or paper is marked `UNVERIFIED:` in place. The rule of thirds and the golden ratio are folk wisdom, not tested findings, so their entries say so and they carry low weight.

---

## Typography, legibility, and readability: guidelines for deskcrit

The typography and layout sections draw only on the reading list that Benjamin Jackson chose on 2026-10-24 (bd memory `design-reading-list`). The bar is the difference between considered, detail-oriented work and average work, so rules that any beginner already knows are left out unless one of the books makes a finer point about them. A source was checked in 2026-10 against the book's table of contents or text where a copy could be found online; a point that could not be found in the book is marked `UNVERIFIED:`.

The question in each **Judged by** line follows two rules. Yes always means the defect is there. The question names a concrete feature that can be seen in the image, because the EV-4 run and the wording test of 2026-10-24 found that questions about a degree ("too small", "too long", "almost lined up") do not fire, while questions about a visible feature do. A rule that depends on a difference of a few pixels says so, because Jev will likely miss it.

### Line length (measure)
- **Rule:** A single column of paragraph text must not run so wide that the eye loses its place on the way back to the start of the next line. Bringhurst gives 45 to 75 characters as the comfortable range, 66 as the ideal, and 40 to 50 for text set in several columns.
- **Source:** Bringhurst, *The Elements of Typographic Style* (1992), section 2.1.2 "Choose a comfortable measure".
- **Judged by:** askable. Question: "Do the lines of paragraph text run across nearly the full width of the page?" The character counts are not checked, because Jev cannot count characters (JC-2).

### Leading suits the measure
- **Rule:** Line spacing is chosen for the typeface, the text, and the measure together, and the longer the line, the more space it needs between lines. A wide paragraph set with tight line spacing is the common fault.
- **Source:** Bringhurst, *The Elements of Typographic Style*, section 2.2.1 "Choose a basic leading that suits the typeface, text and measure"; Hochuli, *Detail in Typography* (2008), chapter "Linespacing, the column".
- **Judged by:** askable, as two criteria, one for tight leading and one for loose leading. First question: "Do the lines of a paragraph touch or overlap, so that the descenders of one line run into the next line?" The question must describe what the image shows: on the EV-4 fixture, whose lines overlap, a question about descenders that "nearly touch" scored 0.09. Second question: "Is the blank space between the lines of a paragraph as tall as the letters themselves or taller, so that each line looks like a separate line and not part of one block?" Only the clear case is askable in either direction, because a paragraph that is a little tight or a little loose differs by a few pixels, and Jev will likely miss it.

### Heading lines hold together
- **Rule:** A heading of two or more lines needs tighter line spacing than text, so that it reads as one unit. With text spacing it falls apart into separate lines; set too tight, its lines collide.
- **Source:** UNVERIFIED: not found in the 1st edition (2004); the 2nd edition was not checked. Lupton, *Thinking with Type* (1st ed. 2004), pp. 82-83 on line spacing, say nothing about headings. Hochuli, *Detail in Typography*, chapter "Linespacing, the column".
- **Judged by:** askable, as two criteria. First question: "Do the lines of a multi-line heading touch or overlap each other?" Second question: "Is the gap between the lines of a heading as large as the gap between the heading and the text below it?"

### Typefaces in concord or in clear contrast, never in conflict
- **Rule:** Type elements relate either by concord, which keeps to one family and varies it little, or by contrast, which makes them plainly different. Faces that are alike enough to look like a mistake but different enough to clash are in conflict, and a page that mixes several unrelated faces has no relationship at all.
- **Source:** Dair, *Design with Type* (1967), chapter 7 "Relationships" and chapter 8 "Relationships of concord and contrast"; Lupton, *Thinking with Type*, "Letter" chapter, "Mixing typefaces".
- **Judged by:** askable. Question: "Does the page use three or more typefaces of clearly different styles, such as a script, a serif, and a sans serif?"
- **Not encoded (NG-10), conflict half only:** telling two near-identical faces apart needs letterform detail too fine to see.

### Weak contrast is worse than none
- **Rule:** When two elements are meant to differ, the difference must be obvious at a glance in at least one of Dair's seven kinds of contrast: size, weight, structure, form, colour, direction, and texture. A heading one step bolder or one size larger than its text looks like an accident, not a choice.
- **Source:** Dair, *Design with Type*, chapter 8 "Relationships of concord and contrast" and chapters 8a to 8g, one for each kind of contrast. Dair's point that a contrast must be obvious is confirmed in his booklet *A Typographic Quest No. 5: Typographic Contrast* (Westvaco, 1967), through John D. Berry's account of it. Arnheim, *Art and Visual Perception* (1954, rev. 1974), chapter I "Balance", makes the same point about perception: small differences leave the eye unsure whether two things are equal or unequal.
- **Link:** https://creativepro.com/dot-font-seven-principles-of-typographic-contrast/
- **Judged by:** askable. Question: "Is there a heading or label that looks the same as the text around it, so that it cannot be picked out as a heading?" A difference of one or two pixels in size will likely be missed.

### Contrast from more than size
- **Rule:** Average work builds every level of the hierarchy from size alone, so headings grow very large while their weight, form, and colour stay the same as the text. Considered work pairs a smaller step in size with a change of weight, of form (capitals, italic), of structure (serif against sans serif), or of colour.
- **Source:** Dair, *Design with Type*, chapters 8a to 8g and chapter 9 "Multiplying the contrasts".
- **Judged by:** askable, as a warning only, because a hierarchy built on size alone is weak rather than wrong. Question: "Are the headings set in the same weight, style, and colour as the body text, so that they differ from it only in size?"

### Sizes come from a scale
- **Rule:** Text sizes come from a small, deliberate scale, so that each size reads as its own level. Many sizes that are almost the same show that sizes were picked one at a time.
- **Source:** Bringhurst, *The Elements of Typographic Style*, section 3.1.1 "Don't compose without a scale".
- **Judged by:** askable. Question: "Are there two or more text sizes on the page that are almost the same, such as two body sizes side by side?" Sizes that differ by a pixel or two will likely be missed.

### One change at a time for emphasis
- **Rule:** Emphasis inside text changes one thing: italic, or bold, or small capitals. A phrase that is bold, italic, underlined, and coloured at once shouts, and considered work never stacks them.
- **Source:** Bringhurst, *The Elements of Typographic Style*, section 3.5.1 "Change one parameter at a time"; Lupton, *Thinking with Type* (1st ed. 2004), p. 94: "Emphasizing a word or phrase within a body of text usually requires only one signal." The same page shows "bold, italic, underlined caps!" as a type crime; Hochuli, *Detail in Typography*, chapter "Emphasis".
- **Judged by:** askable. Question: "Is a word or phrase emphasized in several ways at once, for example bold and italic and underlined, or bold capitals in a colour?"

### Even word spacing in justified text
- **Rule:** Justified lines keep their word spaces even. Lines with holes between the words break the even grey of the column, so justify only where the measure is wide enough and hyphenation is on.
- **Source:** Bringhurst, *The Elements of Typographic Style*, sections 2.1.3 and 2.1.10 "Don't stretch the space until it is broken"; Hochuli, *Detail in Typography*, chapter "The line", on the space between words.
- **Judged by:** askable. Question: "In justified text, do some lines have gaps between words that are much wider than the gaps in the lines around them?"

### Rivers of white space
- **Rule:** Seen from a distance, a block of text shows no channels of white that run down or across several lines.
- **Source:** Bringhurst, *The Elements of Typographic Style*, sections 2.1.3 and 2.1.10 (uneven word spacing in justified text; the book does not use the word "rivers" as a rule); Hochuli, *Detail in Typography*, chapter "The line".
- **Judged by:** askable. Question: "Do channels of white space run down through several lines of a text block?"

### Rag quality in ragged-right text
- **Rule:** The right edge of ragged text is gently uneven. It does not form a staircase, a wedge, or a regular long-short pattern.
- **Source:** Bringhurst, *The Elements of Typographic Style*, section 2.1.3 "Set ragged if ragged setting suits the text and the page"; Hochuli, *Detail in Typography*, chapters "The line" and "Linespacing, the column".
- **Judged by:** askable. Question: "Does the ragged right edge of a paragraph form a staircase or a wedge, with lines getting steadily shorter or longer, or alternating long and short?"

### Widows, orphans, and runts
- **Rule:** A paragraph does not end with one short word alone on its last line, and a column does not begin with the last line of a paragraph. A heading does not sit at the foot of a column with its text in the next one.
- **Source:** Bringhurst, *The Elements of Typographic Style*, sections 2.4.2 (no short last-line word) and 2.4.8 (never begin a page with the last line of a paragraph).
- **Judged by:** askable, as two criteria. First question: "Does a paragraph end with a single short word alone on its last line?" Second question: "Is a heading the last thing at the bottom of a column, with its text starting in the next column?"

### Paragraph marks: indent or space, not both
- **Rule:** Paragraphs are marked either by a first-line indent or by space between them, never both. The first paragraph after a heading starts flush left, and an indent is at least one en wide.
- **Source:** Bringhurst, *The Elements of Typographic Style*, sections 2.3.1 "Set opening paragraphs flush left" and 2.3.2 (mark the paragraphs after the first with an indent of at least one en).
- **Judged by:** askable, as two criteria. First question: "Are paragraphs marked both with a first-line indent and with a blank space between them?" Second question: "Is the first paragraph after a heading indented?"

### Headings sit with the text they introduce
- **Rule:** A heading sits closer to the text it introduces than to the text before it. Equal space above and below makes the heading float between sections.
- **Source:** UNVERIFIED: the point was not found in the text of either book, and not found in the 1st edition (2004) of Lupton; the 2nd edition was not checked. Bringhurst, *The Elements of Typographic Style*, section 2.2.2 (add and delete vertical space in measured intervals); Lupton, *Thinking with Type*, "Text" chapter, "Hierarchy".
- **Judged by:** askable. Question: "Does a heading sit as close to the text above it as to the text below it, or closer?"

### Lines of text align across columns
- **Rule:** In a considered grid the lines of text in neighbouring columns sit on the same baselines, and the top and bottom of each picture line up with lines of text. In a refined grid, captions, titles, and subtitles keep to the same line intervals.
- **Source:** Müller-Brockmann, *Grid Systems in Graphic Design* (1981), section "Construction of the grid" (each grid field holds a set number of lines; the first line stands at the top of the field and the last on its bottom; picture edges align with the ascenders and descenders of the text).
- **Judged by:** askable. Question: "Do two side-by-side columns of text have lines at different heights, so that the lines of one column fall between the lines of the other?" An offset of a few pixels will likely be missed; an offset of about half a line is visible.

### Hanging bullets and punctuation
- **Rule:** The left edge of a text block stays crisp. In a bulleted or numbered list, the wrapped lines of an item align with its first word, not with the bullet, and quotation marks at the start of a line hang into the margin.
- **Source:** Lupton, *Thinking with Type*, "Text" chapter, "Alignment" (hanging punctuation keeps quotation marks from biting into the left edge) and "Marking paragraphs" (outdents and hanging indentation).
- **Judged by:** askable, as two criteria. First question: "In a bulleted or numbered list, do the wrapped lines of an item start under the bullet or number instead of under the first word of the item?" The punctuation half is askable at display and headline sizes only (large headlines, pull quotes, display text). Second question: "In a large pull quote, does the opening quotation mark sit inside the left edge of the text, so that the first letter of the first line starts to the right of the lines below it?"
- **Not encoded (NG-10), punctuation half in body text:** the defect grows with type size. In body text, a quotation mark that does not hang moves the edge by a few pixels, which is too fine to see.

### Display type is spaced tighter than text
- **Rule:** As type gets larger, the space between its letters and words looks wider, so headlines need tighter letter and word spacing than text. A large heading set with the spacing of text looks loose.
- **Source:** Lupton, *Thinking with Type* (1st ed. 2004), p. 80: "Because the space between characters expands as the type size increases, designers often fine-tune letterspacing when working with large letters." Lupton supports adjusting large type but not tightening it as a rule: on p. 81 she says negative tracking "is rarely desirable" and "should be used sparingly".
- **Judged by:** askable. Question: "Does a heading set at display size, several times larger than the body text, have gaps between its letters or words that are wide enough to see as gaps?" A difference of a pixel or two between letters will likely be missed.

### Weight and stroke thickness at small sizes
- **Rule:** Hairline and very light weights are for large sizes. Small text needs enough stroke thickness to hold up against its background.
- **Source:** Bringhurst, *The Elements of Typographic Style*, section 6.2.3 (very light weights of Helvetica "reduce coarseness but do little to increase readability").
- **Judged by:** askable. Question: "Is small text, such as captions or labels, set in a hairline or very thin weight?"

### Letterspacing (tracking) of text
- **Rule:** Lower-case text keeps the spacing its typeface was designed with. Tracked-out or squeezed lower case in text is a defect.
- **Source:** Bringhurst, *The Elements of Typographic Style*, section 2.1.7 "Don't letterspace the lower case without a reason"; Hochuli, *Detail in Typography*, chapter "The word", on letterspacing.
- **Judged by:** not encoded.
- **Not encoded (NG-10):** differences in tracking at text size are too fine to see.

### Letterspace capitals and small caps
- **Rule:** Strings of capitals and small capitals are letterspaced, and lower case is not.
- **Source:** Bringhurst, *The Elements of Typographic Style*, section 2.1.6 "Letterspace all strings of capitals and small caps"; Lupton, *Thinking with Type* (1st ed. 2004), p. 81: "It is common practice to letterspace capitals and small capitals, which appear more regal when standing apart."
- **Judged by:** askable at display and headline sizes only (large headlines, pull quotes, display text). Question: "In a large heading or label set in capitals, do neighbouring capitals touch, with no visible space between them?"
- **Not encoded (NG-10), body text:** the defect grows with type size. In capitals at text size, differences in tracking are too fine to see.

### Kerning
- **Rule:** At display sizes, the space between letter pairs looks even: no gaps in pairs such as "AV", "To", and "Wa", and no collisions.
- **Source:** Bringhurst, *The Elements of Typographic Style*, section 2.1.8 "Kern consistently and modestly or not at all" (this wording is Bringhurst's alone). Lupton, *Thinking with Type* (1st ed. 2004), p. 80, supports only that large type needs fine-tuning: "Because the space between characters expands as the type size increases, designers often fine-tune letterspacing when working with large letters."
- **Judged by:** askable at display and headline sizes only (large headlines, pull quotes, display text). Question: "In a large headline, is there a pair of letters, such as AV, To, or Wa, with a gap between them that is visibly wider than the gaps between the other letters?"
- **Not encoded (NG-10), body text:** the defect grows with type size. At text size, the space between two letters is too fine to see.

### Ligatures
- **Rule:** In a face whose f reaches into the next letter, the f joins the following i or l as a ligature. A large headline that sets "fi" or "fl" as two separate letters shows the hook of the f striking the dot of the i or the top of the l.
- **Source:** Butterick, *Practical Typography*, "Ligatures": "The only time ligatures are mandatory is when you have an actual overlap between the letters f and i." Checked on the page on 2026-10-24. This is the one typography entry with a source outside the reading list: Benjamin Jackson asked for a checkable citation on 2026-10-24, and no text of a book on the list could be checked. Reconsider when a book on the list can be checked for the same point.
- **Judged by:** askable at display and headline sizes only (large headlines, pull quotes, display text). Question: "In a large headline, does the top of a letter f touch or run into the dot of a following i?" The source makes a ligature mandatory only for an f that overlaps an i, so the question names only that pair.
- **Not encoded (NG-10), body text:** the defect grows with type size. At text size, the collision is a pixel or two and too fine to see.

### Real italics, bold, and small caps (no faux styles)
- **Rule:** True italic and bold cuts of a family are used. Slanted romans, smeared bolds, and small caps made by shrinking capitals are defects.
- **Source:** Bringhurst, *The Elements of Typographic Style*, sections 3.4.3 (use artificially sloped romans sparingly or not at all) and 3.2.2 (faked small caps).
- **Judged by:** askable at display and headline sizes only (large headlines, pull quotes, display text), for faux italics. Question: "Is a large italic heading made of upright letters that are only slanted, with the same letter shapes as the upright face?"
- **Not encoded (NG-10), body text, faux bold, and faux small caps:** the defect grows with type size. At text size, telling a true italic from a slanted regular face needs letterform detail too fine to see, and a thickened bold or shrunken small caps differ from the real ones by strokes too thin to compare.

### Typographic details: quotes, dashes, and spaces
- **Rule:** Curly quotation marks and apostrophes, true en and em dashes, ellipsis characters, and one space after a sentence.
- **Source:** Bringhurst, *The Elements of Typographic Style*, sections 2.1.4 (single word space between sentences), 5.2.1 (dashes), 5.2.7 (ellipses), and 5.4.1 (quotation marks).
- **Judged by:** askable at display and headline sizes only (large headlines, pull quotes, display text), for quotes and dashes. Question: "In a large heading or pull quote, is there a straight quotation mark or apostrophe instead of a curly one, or a short hyphen where a dash belongs?"
- **Not encoded (NG-10), body text, ellipses, and spaces:** the defect grows with type size. In body text it reads single characters, which is content and detail too fine to see.

### Figures in tables and text
- **Rule:** Columns of numbers use tabular figures aligned on the decimal point or the right edge, and running text uses text figures.
- **Source:** Bringhurst, *The Elements of Typographic Style*, sections 3.2.1 (text figures in running text) and 4.4.3 (align columns of figures flush right or on the decimal).
- **Judged by:** not encoded.
- **Not encoded (NG-10):** telling tabular figures from proportional figures needs detail too fine to see.

### Line breaks in headings and short text
- **Rule:** Headings, buttons, and captions break at natural phrase boundaries and do not split a word, a number and its unit, or a name across lines.
- **Source:** Bringhurst, *The Elements of Typographic Style*, section 2.4 "Etiquette of hyphenation and pagination", especially 2.4.6 (link short numerical expressions with hard spaces); Hochuli, *Detail in Typography*, chapter "The line".
- **Judged by:** not encoded.
- **Not encoded (NG-10):** it reads the words to judge where a line breaks, which is the content.


---

## Layout, spacing, grids, alignment, visual hierarchy

### One grid governs the page
- **Rule:** Every block takes its edges from one underlying grid of columns, margins, and intervals, so the same column lines recur from the top of the page to the bottom. A block whose edges match no other block shows that it was placed by eye.
- **Source:** Müller-Brockmann, *Grid Systems in Graphic Design* (1981), sections "Grid and design philosophy" and "Construction of the grid"; Samara, *Making and Breaking the Grid* (3rd ed. 2023), part "Making the Grid".
- **Judged by:** askable. Question: "Is there a block whose left or right edge lines up with no other block on the page?" An offset of a few pixels will likely be missed.

### Equal intervals between columns
- **Rule:** The space between columns, cards, or grid fields is one fixed interval across the page.
- **Source:** Müller-Brockmann, *Grid Systems in Graphic Design*, section "Construction of the grid" (the fields are separated by a fixed space, such as one empty line).
- **Judged by:** askable. Question: "Is one gap between columns or cards visibly wider or narrower than the other gaps in the same row?"

### Pictures fit the grid
- **Rule:** An image takes its width from the columns and its top and bottom from the lines of text, so pictures and text share the same edges.
- **Source:** Müller-Brockmann, *Grid Systems in Graphic Design*, sections "Construction of the grid" and "The photograph in the grid system".
- **Judged by:** askable. Question: "Does an image beside a column of text start or end at a different height from that column's first or last line?" An offset of a few pixels will likely be missed.

### Break the grid decisively or not at all
- **Rule:** An element that leaves the grid does so by a clear amount, so that the break reads as a choice. An element that is almost aligned reads as an error: Arnheim shows that a placement which is neither clearly here nor clearly there makes the eye waver and the whole look unfinished.
- **Source:** Arnheim, *Art and Visual Perception*, chapter I "Balance" (ambiguous placements and small differences); Samara, *Making and Breaking the Grid*, part "Breaking the Grid". UNVERIFIED: the point that a break must read as deliberate was not found in Samara's text.
- **Judged by:** askable. Question: "Is there an element that sits slightly out of line with the elements above or below it, as if it were meant to line up but missed?" In the wording test an 8 px offset between card tops scored only 0.45 whatever the wording, so offsets of a few pixels are likely below what Jev sees.

### Space shows the groups
- **Rule:** The gap between items in one group is clearly smaller than the gap between groups, and a label sits nearer its own field than the one before it. Equal gaps everywhere erase the groups.
- **Source:** Arnheim, *Art and Visual Perception*, chapter II "Shape", on grouping by similarity, where similarity of location is Wertheimer's rule of proximity; Wertheimer, "Untersuchungen zur Lehre von der Gestalt II" (1923).
- **Link:** https://www.gestalttheory.net/download/Wertheimer1923_Lehre_von_der_Gestalt.pdf
- **Judged by:** askable, as two criteria. First question: "Are the gaps between separate groups the same size as the gaps between items inside a group?" Second question: "Does a form label sit as close to the field above it as to its own field, or closer?"

### Unrelated elements do not crowd each other
- **Rule:** Elements that do not belong together keep clear space between them. A caption or paragraph below a diagram has a visible gap above it, not a few pixels.
- **Source:** Arnheim, *Art and Visual Perception*, chapter II "Shape", on grouping by similarity of location (elements that sit close are seen as one group).
- **Judged by:** askable. Question: "Does a caption, paragraph, or control nearly touch an image, diagram, or box that it does not belong to?" Evidence: in M-1, Benjamin Jackson saw the text below a diagram sit too close to it (spike/human_answers.csv, on `edges-misaligned`), and no other entry covered it (PRD OQ-18).

### White space is gathered, not scattered
- **Rule:** Ruder holds that the printed and the unprinted areas must stand in tension, and that the tension comes from contrast. Considered work gathers empty space into a few large, shaped areas set against dense ones. Average work spreads the same small gap between everything, so no space does any work, and it runs content up to the edges of the page.
- **Source:** Ruder, *Typography: A Manual of Design* (1967), chapters "Contrasts" and "Form and counter-form"; Kunz, *Typography: Macro- and Microaesthetics* (1998), part two, on space and on form and counterform.
- **Judged by:** askable. Question: "Is the empty space spread as equal small gaps between every element, with no larger open area anywhere on the page?" Content that runs up to the edge of the page is a basics check, under "Content keeps clear of the page edge".

### Figure and ground are unambiguous
- **Rule:** Text and key shapes separate clearly from what lies behind them. Text on a photo or texture needs a calm area, a panel, or a scrim behind it.
- **Source:** Arnheim, *Art and Visual Perception*, chapter V "Space", section "Figure and ground"; Ruder, *Typography: A Manual of Design*, chapter "Form and counter-form".
- **Judged by:** askable. Question: "Does text or a key shape sit on a busy photo or pattern with no panel, shadow, or calm area behind it?"

### Balance
- **Rule:** Visual weight comes from size, darkness, colour, and isolation, and where an element sits changes its weight. A layout may be symmetrical or not, but a heavy side needs a counterweight.
- **Source:** Arnheim, *Art and Visual Perception*, chapter I "Balance", sections "Weight" and "Psychological and physical balance".
- **Judged by:** askable. Question: "Is one side of the page heavy with large or dark elements while the other side is empty, with nothing to counter them?"

### One element dominates
- **Rule:** The order of importance is plain: one element is seen first and the rest follow. Tschichold asks that logical order be shown by differences of size, and Hofmann builds compositions from contrasts such as much against little.
- **Source:** Tschichold, *The New Typography* (1928), chapter "The principles of the new typography"; Hofmann, *Graphic Design Manual* (1965), the text chapters "The line" and "Confrontation".
- **Link:** https://www.neugraphic.com/tschichold/tschichold-text5.html
- **Judged by:** askable. Question: "Are there three or more elements of the same size and weight competing to be seen first, with none clearly stronger than the others?"

### Contrast of scale gives the page tension
- **Rule:** Considered layouts set strong contrasts against each other: one very large element against small ones, a vertical against horizontals, dense against open. Hofmann finds the strongest tension where one element comes close to overpowering another. Average layouts make every image, card, and heading about the same size.
- **Source:** Hofmann, *Graphic Design Manual*, the text chapters "The line" and "Confrontation" (contrasts such as much and little, horizontal and vertical, light and dark); Ruder, *Typography: A Manual of Design*, chapter "Contrasts".
- **Judged by:** askable, as a warning only, because an even layout is dull rather than wrong. Question: "Are all the main elements on the page, such as images, cards, and headings, about the same size, with no element much larger than the rest?"

### No central axis by default
- **Rule:** Tschichold rejects the habit of centring everything on one axis, because it fixes the form before the content is read and makes the layout rigid. An asymmetric arrangement that follows the order of the content is the considered default; centring is a choice for a few short lines.
- **Source:** Tschichold, *The New Typography*, chapter "The principles of the new typography" (central-axis setting and asymmetry).
- **Link:** https://www.neugraphic.com/tschichold/tschichold-text5.html
- **Judged by:** askable, as a warning only, because a centred layout is a style and not an error. Question: "Is every block on the page, including headings, paragraphs of several lines, and buttons, centred on one vertical axis?"

### Repeated elements follow one programme
- **Rule:** Gerstner treats design as a programme: a set of rules from which each solution is chosen. Elements of one kind (cards, buttons, section headings) therefore share one style and one spacing, and a variant appears only where the rules call for it.
- **Source:** Gerstner, *Designing Programmes* (1964), the introduction ("instead of solutions for problems, programmes for solutions"); Müller-Brockmann, *Grid Systems in Graphic Design*, section "Grid and design philosophy" (the grid as the will to systematize).
- **Judged by:** askable. Question: "Are elements of the same kind, such as cards, buttons, or section headings, styled differently from one another?"

### No rules, boxes, or ornament where space would do
- **Rule:** Lines, borders, and decoration that carry no information compete with the content. Tufte calls it non-data ink and chartjunk; Lupton shows that tables are often over-ruled and are clearer with the rules removed or replaced by a pale tone; Tschichold rejects ornament.
- **Source:** Tufte, *The Visual Display of Quantitative Information* (1983, 2nd ed. 2001), chapter 4 "Data-ink and graphical redesign" and chapter 5 "Chartjunk: vibrations, grids, and ducks"; Lupton, *Thinking with Type*, "Grid" chapter, "Data tables"; Tschichold, *The New Typography*, chapter "The principles of the new typography".
- **Judged by:** askable. Question: "Is every cell, card, or section enclosed in a dark border or separated by heavy rules, so that the lines are as strong as the content?"

### Optical alignment over mathematical alignment
- **Rule:** Round and pointed shapes overshoot, and icons centre by visual mass rather than by bounding box, so that they look aligned.
- **Source:** UNVERIFIED: no section on optical correction was found. Kunz, *Typography: Macro- and Microaesthetics*, part one, on the microaesthetic qualities of letters and signs.
- **Judged by:** not encoded.
- **Not encoded (NG-10):** optical offsets are a pixel or two, too fine to see.


---

## Basics: checks for common mistakes

These checks catch plain mistakes that coding agents often make. They are kept in a separate "basics" pack, so that a caller who wants only the high bar of the typography and layout packs can switch them off. In EV-4, Jev judged these checks most reliably (0.87 to 0.99), because each one asks about a plain visible feature. The questions follow the same two rules as the typography and layout sections: yes means the defect is there, and the question names a feature that can be seen.

Sources: Benjamin Jackson decided on 2026-10-24 that this section, and only this section, may cite well-known practice references outside the reading list, such as Butterick's *Practical Typography*, Nielsen Norman Group, WCAG, and the Apple and Material Design guidelines. Reason: plain mistakes are rarely the subject of the books on the list, and these references state them directly. It never cites *The Non-Designer's Design Book*, which Benjamin Jackson ruled out as too basic. The typography and layout sections still cite only the reading list. Reconsider if a basics check starts to stand in for a finer rule that a book on the list states.

### Body text is not too small to read
- **Rule:** Paragraph text is set at a reading size. Lupton gives 9 to 11 pt as the common range for printed text. No WCAG success criterion sets a minimum text size, and the reading list gives no figure for screens, so the figure is not checked.
- **Source:** Lupton, *Thinking with Type* (1st ed. 2004), p. 37, caption: "Sizes between 9 and 11 pts are common for printed text."
- **Judged by:** askable. Question: "Is the paragraph text so small that its letters cannot be told apart at the size of the image?"

### Paragraphs are not set in a decorative face
- **Rule:** Paragraphs are set in a face made for reading. Script, blackletter, and other decorative faces are for a few words of display.
- **Source:** Bringhurst, *The Elements of Typographic Style* (1992), chapter 6 "Choosing and combining type", section 6.2.1 (choose faces that suit the task).
- **Judged by:** askable. Question: "Are paragraphs of text set in a script, blackletter, or other decorative typeface?"

### Text does not read as faint
- **Rule:** Text has a contrast ratio of at least 4.5:1 against its background, or 3:1 for large text. The ratio is not checked; Jev is asked only whether text looks pale against its background.
- **Source:** W3C, *WCAG 2.2*, SC 1.4.3 Contrast (Minimum).
- **Link:** https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- **Judged by:** askable as a visual judgment. Question: "Is there text that is pale against its background, such as light grey text on white?"

### Paragraphs are not centred or right-aligned
- **Rule:** Paragraphs of several lines are set flush left. Centring is for a few short lines. Tschichold rejects central-axis setting as rigid, and Bringhurst treats flush-left, ragged-right setting as the default for text.
- **Source:** Tschichold, *The New Typography* (1928), chapter "The principles of the new typography"; Bringhurst, *The Elements of Typographic Style*, section 2.1.3 "Set ragged if ragged setting suits the text and the page".
- **Link:** https://www.neugraphic.com/tschichold/tschichold-text5.html
- **Judged by:** askable. Question: "Is a paragraph of four or more lines centred or right-aligned?"

### Content keeps clear of the page edge
- **Rule:** Text and boxes sit inside the type area, with a margin between them and the edge of the page.
- **Source:** Müller-Brockmann, *Grid Systems in Graphic Design* (1981), sections "Margin proportions" and "Construction of the type area".
- **Judged by:** askable. Question: "Does any text or box touch the edge of the page or sit within a few pixels of it?" In the wording test of 2026-10-24 this question moved a clear positive from 0.15 to 0.74.

### Captions and labels are not too small to read
- **Rule:** Captions, labels, and legal text stay large enough to read. Apple gives 11 pt as the smallest text size on iOS. The figure is not checked.
- **Source:** Apple, *Human Interface Guidelines*, "Typography", table of default and minimum sizes: iOS and iPadOS, default 17 pt, minimum 11 pt. Checked on the rendered page on 2026-10-24.
- **Link:** https://developer.apple.com/design/human-interface-guidelines/typography
- **Judged by:** askable as a visual judgment. Question: "Are captions or labels so small that their letters cannot be told apart at the size of the image?"

### Long text is not set in all capitals
- **Rule:** Capitals suit headings shorter than one line, labels, and captions. A whole sentence or paragraph in capitals is hard to read.
- **Source:** Butterick, *Practical Typography*, "All caps" ("Caps are suitable for headings shorter than one line"; "Don't capitalize whole paragraphs").
- **Link:** https://practicaltypography.com/all-caps.html
- **Judged by:** askable. Question: "Is a sentence or paragraph that runs to more than one line set entirely in capital letters?"

### Text is broken into chunks
- **Rule:** Text that people skim is broken up by headings, short paragraphs, and lists. A long unbroken block of text on a screen is a defect.
- **Source:** Nielsen, "How Users Read on the Web" (Nielsen Norman Group, 1997).
- **Link:** https://www.nngroup.com/articles/how-users-read-on-the-web/
- **Judged by:** askable. Question: "Is there a block of text many lines long with no heading, list, or paragraph break inside it?"

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
- **Not encoded (NG-10):** breaks NG-10 because it needs a render at 320 px wide, which one image cannot show.

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
- **Not encoded (NG-10):** breaks NG-10 because target size is a physical measurement that a screenshot does not show.

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
- **Not encoded (NG-10):** breaks NG-10 because target size is a physical measurement that a screenshot does not show.

### Material touch target size
- **Rule:** Touch targets are at least 48 by 48 dp, with at least 8 dp between targets. A visual icon can be smaller if the tap area is 48 dp.
- **Source:** Google, *Android Accessibility Help: Touch target size* (48x48 dp, 8 dp spacing; the Material 3 structure page is JavaScript-rendered and could not be read)
- **Link:** https://support.google.com/accessibility/android/answer/7101858?hl=en
- **Judged by:** askable as a visual judgment only. Jev is asked about controls that look too small or too crowded to tap. The figure in the rule is not checked. An exact result needs a measuring tool such as axe-core.
- **Not encoded (NG-10):** breaks NG-10 because target size is a physical measurement that a screenshot does not show.

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
- **Not encoded (NG-10):** breaks NG-10 because target size is a physical measurement that a screenshot does not show.

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

---

## Candidates for other domains from the reading list

These rules come from the same reading list but fall outside typography and layout. They are listed for a later ticket and are not yet checked against the books.

- Colour: Albers, *Interaction of Color* (1963). The same colour looks different on different grounds, and two colours meant to match can look different next to each other. A visible question asks whether one colour, used for one role, looks like two different colours in two places.
- Colour: Albers, *Interaction of Color*. Two strong colours of equal lightness side by side make their edge seem to vibrate.
- Charts: Tufte, *The Visual Display of Quantitative Information*, chapter 5. Moiré hatching, heavy grid lines, and three-dimensional effects in a chart are chartjunk.
- Charts: Tufte, *The Visual Display of Quantitative Information*, chapter 4. Ink that can be erased without loss of data, such as a background fill or a frame, is removed.
- Composition: Arnheim, *Art and Visual Perception*, chapter IX "Dynamics". Oblique lines and shapes create directed tension, and a layout that is all horizontals and verticals reads as static.
- Composition: Hofmann, *Graphic Design Manual*, chapter "The dot". A single element placed exactly at the centre of a field reads as still, and one placed off centre gives the field movement.
- Systems: Gerstner, *Designing Programmes*. Pieces of one series (slides, posters, screens) follow one programme of grid, type, and colour.
