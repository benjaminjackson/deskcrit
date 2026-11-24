**First read.** The eye lands on the large dark headline, goes right to the "Reorder this week" table, then drops to the rust "Start a 30-day trial" button, which is now the only filled color on the page. It reads as a quiet, warm landing page for a bookshop stock tool, and the table makes the product concrete at a glance. The row of three feature notes under the hero looks uneven: two narrow columns wrap to four and five lines next to one wide column of two lines. On the phone and the tablet the page now stacks into one column: headline, buttons, the full-width table, the notes, then a closing button. On the phone the table headers wrap to two lines.

**What it's for.** It is a landing page that gets independent bookshop owners to start a 30-day trial of Shelfmark (this is my assumption, taken from the round-1 work order).

**Verdict.** The fixes worked. The page now reflows, has one clear primary action, holds together on wide screens, and passes contrast. The biggest thing still in the way is the copy. The owner still cannot tell which tills and distributors Shelfmark works with, or how it compares with what they do now, so they have to start the trial on trust.

**Finding status**
- no-reflow-below-desktop: closed. `page_width` is 390 on the phone and 768 on the tablet, and the h1 is 17 characters per line on the phone and 28 on the tablet. Everything stacks in one column and nothing scrolls sideways.
- sign-in-outranks-trial-button: closed. The trial button is filled #8a3b24 with white text (7.69:1) at every viewport. "Sign in" is now a plain dark text link at weight 500 (`a.nav-signin`, no background).
- wide-screen-two-edges-empty-floor: closed. Content is held to a centered container from x 448 to 1472 on the widescreen, with about 64 px between the headline and the table. A closing rule and a repeated trial button now end the page at every viewport. The closing ask is only a bare button (see Smaller things).
- copy-missing-facts-owner-checks: open. The notes still name no till, card reader, or distributor. "Returns are tracked for you" still leaves out who does the tracking. Nothing on the page compares Shelfmark with what the owner does now. The fixer was right not to invent these facts.
- table-headers-low-contrast: closed. The table headers and `span.preview-date` are #5c544b at 7.43:1 at every viewport.
- type-sizes-one-pixel-apart: closed. `type_sizes` is 40 (32 on the phone), 20, 16 and 14, so no two sizes are less than 2 px apart.
- headline-orphan-asks: closed. On desktop and widescreen the headline reads "Know what is on / your shelves before / a customer asks", and no line of the headline or the notes holds a single word. The break after "on" still splits "on your shelves" (see Smaller things).
- feature-columns-off-table-grid: closed. The third note starts at x 672, the table's left edge. The first two notes split the hero text column at 128 and 400.
- feature-notes-long-measure-widescreen: closed. On the widescreen the notes run 21.3, 19.5 and 62 characters per line, all 75 or fewer.

**New problems.**
- Desktop and widescreen: to land on the hero grid, the first two feature notes were squeezed into 208 px columns. They run 19.5 to 21 characters per line over 4 and 5 lines, next to a 480 px third note of 2 lines. The row reads as choppy and lopsided.
- Tablet: the notes now span 600 px, and the second note runs 81 characters per line (`characters_per_line`, `section.facts > p:nth-of-type(2)`).
- Phone: in the narrow table, "On shelf" and "Sold this week" each wrap to two lines, and "Notes from the Ferry" wraps.
- All viewports: the new closing section is a hairline rule and a lone repeat of the trial button with no words. The viewer meets the same ask a second time with no new reason to act. It is not a template tell.

**What would move it most**
1. The feature notes still leave out what a shop owner checks first. This is in the three notes under the hero, from "Works with your till." to "Returns are tracked for you." The owner cannot tell whether their own till, card reader, or distributor is supported, or who handles returns. Nothing sets Shelfmark next to the method they use now, so the page asks them to start a trial on trust. Direction: the maker must supply three facts and one comparison. The facts are the tills and card readers it supports, the distributors it sends reorder lists to, and who tracks the returns (change "Returns are tracked for you" to say who does it). The comparison is with what the owner does now, such as a stock count, a spreadsheet, or the till's own report. Taste. Viewports: all

**Smaller things.**
- Feature notes row: give the three notes equal columns, or stack them under the hero, so that no note runs at about 20 characters per line (Bringhurst, 45 to 75). Viewports: desktop, widescreen
- Feature notes on the tablet: cap the notes' width so the second note stays at 75 characters per line or fewer. Viewports: tablet
- Reorder table on the phone: shorten or tighten the column headers so "On shelf" and "Sold this week" fit on one line. Viewports: phone
- Closing section: give the repeated trial button a reason to click now. One line from the page's own copy would do, such as the Monday reorder list, or the page could drop the rule and the button. Viewports: all
- Headline: the break after "on" still splits "on your shelves". Breaking after "is" or "shelves" would keep the phrase whole. Viewports: desktop, widescreen

**What's working.**
- The "Reorder this week" table, with real-looking titles, on-shelf counts and weekly sales, shows the product doing its job instead of describing it. Keep it next to the headline.
- There is now one rust primary button and a plain "Sign in" link, so a new visitor's eye goes straight to the trial.
- The warm off-white page, one rust accent and restrained Inter type give the page a calm, bookshop-like character of its own, with no stock gradients, badges, or emoji cards.
