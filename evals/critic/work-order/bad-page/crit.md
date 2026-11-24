**First read.** The eye goes first to the headline "Send invoices in minutes, not hours". It then jumps to the two identical blue buttons and lands on the three black-outlined cards. It looks like a SaaS landing page for an invoicing tool, but it feels like an unfinished wireframe: thin regular-weight type, pale grey copy and heavy black boxes. Nothing you can read at a glance says who it's for or why it's different.

**What it's for.** My assumption: a marketing home page that should get owners of small design and photo studios to start a free trial of an invoicing tool.

**Verdict.** It doesn't do its job yet. The case for the product (studios, late-payment follow-up, a shared link for your accountant) sits in grey text that fails contrast, so the visitor sees only a generic headline and two buttons asking for the same level of commitment. The page is clear about *what* it is and close to silent about *why this one*.

**What would move it most**
1. **The copy that sells the product is the faintest thing on the page.** The lead paragraph, all three card descriptions and the footer are `#a3a3a3` on white at 2.52:1 (`contrast`, `p.lead`, `div.card > p`, `footer p`), well under the 4.5:1 minimum (WCAG 1.4.3). That grey text is 415 of the page's roughly 550 characters (`text_colors`). This is a **defect**: low-vision readers and anyone in bright light lose the body copy, and everyone else treats it as fine print and skips it. That copy is the only place the page says "for design and photo studios", "follow up on late payments" and "your accountant can see every invoice from one shared link". Fix: darken the body text to at least 4.5:1 (something near `#595959` or darker). Keep the light grey only for the footer, if anywhere.
2. **Two equal primary buttons.** "Start free trial" and "Book a demo" are the same filled blue at the same 152×48 size, so the visitor has to choose between them with no hint which one the page wants. This is a **convention** break (Material Design 3, "Buttons": one high-emphasis action per view), and here it costs a real decision. A small studio owner deciding about an invoicing tool should be steered to the trial. Fix: keep "Start free trial" filled and make "Book a demo" an outlined or text button. Better still, make the trial button name what happens, e.g. "Send your first invoice free".
3. **The headline could be anyone's, and the real reason to buy is buried at the end of a grey paragraph.** "Send invoices in minutes, not hours" fits every invoicing product, and it isn't for anyone in particular. The specific promises are in sentences three and four of the lead (the audience: studios; the advantage: no install and one shared link for your accountant). This is a **defect** of the copy: the visitor can't tell what's different here, so nothing pushes them to act. Fix: put the audience and the sharpest benefit in the headline or a short subhead. For example, open with the pain of late payments ("Stop chasing clients for late payments") rather than speed. Then cut the paragraph to one or two sentences.
4. **Everything is centred, including paragraphs of three to four lines.** The 4-line lead and the card descriptions are centred, so each line starts somewhere different and the eye has to hunt for the start of the next one. The lead is also 86 characters per line (`characters_per_line`, `p.lead`), over the 45–75 range (Bringhurst 2.1.2), which makes this worse. This is a **convention** break (Tschichold, *The New Typography*; Bringhurst 2.1.3). Fix: set multi-line text flush left. If you keep a centred hero, cut the lead to one or two short lines at no more than about 70 characters, and left-align the card text.
5. **The heavy black rules and card borders are the strongest marks on the page.** The full-width rules under the header and above the footer and the near-black outlines around each card carry more visual weight than the card titles or the faint text inside them, so they read as wireframe scaffolding. This is a **convention** break (Lupton, *Thinking with Type*; Tufte on non-data ink). Fix: remove the rules and borders, or swap them for space or a pale tint, and let the content set the weight.

**Smaller things.**
- Type scale: four sizes (34/20/16/14), but the section title "Why studios use Quillfern" is 16 px regular, the same as body text, so it doesn't read as a heading. Give it a size step or bold weight.
- Section title vs content: the heading says "Why studios use Quillfern" but the cards are named feature categories (Invoices, Reminders, Reports), not reasons. Either rename the heading ("What Quillfern does") or rewrite the card titles as outcomes ("Get paid without chasing").
- Card 1 ends with "PDF." alone on the last line, which is a runt (Bringhurst 2.4.2). Rewrap or shorten the line.
- Navigation: Home / Features / Pricing / Help all look the same, so nothing marks the current page (Laubheimer, NN/g, "Menu-Design Checklist"). Give the current item one cue, such as bold weight or an underline.
- Phone layout (from the measured render): the page is 428 px wide in a 390 px viewport, so it scrolls sideways. The three cards stay side by side, squeezing descriptions to 6–10 characters per line (`characters_per_line`, phone `div.card > p`). Stack the cards in one column below about 600 px (WCAG 1.4.10 Reflow).

**What's working.**
- The headline is clearly the largest element (34 px, dark `#333` at 12.63:1), so the eye has one obvious place to start. Keep that dominance when you rewrite it.
- The three-card row is well grouped: equal widths, equal gutters, titles on one baseline, and the section label sits close to the cards it introduces. The structure is right. It needs lighter borders and darker text, not a new layout.
- The buttons themselves are well made: 48 px tall, white on blue at 5.17:1, with clear labels.

**Couldn't judge from a still.**
- Hover and focus states for the buttons and nav links.

**Checklist.**
The whole piece: 8 lines, 6 yes, 2 no (every element does a job; heading names its section)
What matters first: 3 lines, 2 yes, 1 no (distinct text levels)
Arrangement and space: 13 lines, 12 yes, 1 no (centred by habit)
Text: 29 lines, 25 yes, 4 no (contrast; line length; paragraphs flush left; widows and runts)
Color: 9 lines, 9 yes
Pictures: skipped, no pictures apart from the wordmark (both logo lines yes)
Charts and data: skipped, no chart
Interface: 33 lines, 28 yes, 3 no (one primary action; current page shown; reflow), 2 unsure (focus indicator; phone thumb zone)