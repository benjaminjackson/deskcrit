**First read.** On desktop the eye lands first on the large three-line headline, "Know what is / on your shelves before / a customer asks". It then drops to the rust "Start a 30-day trial" button and crosses to the "Reorder this week" card on the right, which proves the claim with real-looking rows. It reads as a calm, plain landing page for a small bookshop's stock tool, warm and believable. The three notes at the bottom read last and add little. On the phone the headline now sits on three even lines and the table rows are more even. Tablet stacks the card under the hero and puts each note on one or two lines. Widescreen matches desktop, centred in the wider frame.

**What it's for.** It gets an independent bookshop owner to start a 30-day trial, by showing that Shelfmark tells them what to reorder each Monday.

**Verdict.** The fixes cleaned up the phone headline and the phone table, and the notes are wider on desktop and widescreen. The biggest thing still in the way is unchanged: the notes do not tell the owner whether Shelfmark works with their own till, card reader and distributor, or who handles returns.

**Finding status**
- notes-omit-owner-checks: open. The three notes still name no till, card reader or distributor, "Returns are tracked for you" still does not say who tracks them, and nothing compares Shelfmark with what the owner does now. This is the same at all four viewports.
- feature-notes-under-45-characters: open. The page container is now wider (the left edge moved from x 128 to x 64), so the first note measures 44 characters per line (was 32.5) and the second 40 (unchanged) on desktop and widescreen. Both are better or the same, but still under 45.
- phone-headline-before-a: closed. On the phone the headline is three lines, "Know what is on / your shelves before / a customer asks". "before a" is not alone and "a customer" is not split (3 lines, measured).
- phone-table-titles-wrap: closed. On the phone "The Glass Orchard" now fits on 1 line. Only "Notes from the Ferry" wraps to 2 lines, so one row of five is taller.

**New problems.** None that change the piece. On the phone, the "Sold this week" header now ends about 8 px from the card's right edge. It looks tight but does not clip.

**What would move it most**
1. The notes leave out what an owner checks first. This is in the three notes under the hero, at every viewport. An owner reads "Works with your till" and "Orders from your distributor" and still cannot tell whether *their* till, card reader or distributor is one of them, or who handles returns. So "Start a 30-day trial" asks them to act on trust. The fix: the maker supplies the supported tills and card readers, the distributors that get reorder lists, who tracks returns, and one comparison with what the owner does now, such as a stock count or a spreadsheet. Then "Returns are tracked for you" changes to name who tracks them. Do not invent any of these. Taste. Viewports: desktop, phone, tablet, widescreen.

**Smaller things.**
- Notes 1 and 2 on desktop and widescreen are at 44 and 40 characters per line, against the 45 asked for. Widen the notes a little more by narrowing the gap between the columns, if the maker wants the number met. Viewports: desktop, widescreen.
- On the phone, the "Sold this week" header in the table runs almost to the card's right edge. A little more right padding on that column, or a narrower title column, would give it room. Viewports: phone.

**What's working.**
- On the phone the headline now breaks on its own into three even lines. It reads as one confident statement, not a list of fragments.
- The "Reorder this week" card is still the strongest proof on the page. It shows real titles with on-shelf and sold counts, so the promise is concrete and not a generic dashboard mockup.
- The rust primary button stays the only saturated colour on the page, so the trial action is clear at every viewport.
