---
name: crit-loop
description: Use after you change UI code (HTML, CSS, components) and want to check the design and fix it. Runs the design-critic skill, fixes every finding of its work order, from the top, captures the page again at the same viewport, and has a fresh critic mark each finding closed, closed with a new problem, settled, open, or worse, until no finding is left, ranked or smaller, or two rounds in a row close nothing. For a deck or a flow, each round critiques every slide and checks that the set is consistent.
---

# The fix loop

The design-critic skill judges a picture of a design and writes a work order: the findings, ranked, each with where it is, what the viewer meets, the target, and the check that closes it. This skill tells you how to fix from that work order, how to check each fix, and when to stop. The critics decide every finding, rank, and status. You do not judge them again. The rules are FR-82 in `docs/PRD.md` of the deskcrit repository.

In the steps below, `<design-critic folder>` is the `design-critic` folder next to this skill's folder, and `<loop folder>` is a new folder in the system temp folder that holds one folder per round.

A deck or a flow of several screens is a set: follow "A deck or a flow" below, which says which steps it replaces. Every other step holds for each slide as written.

## Capture

Use the same capture in every round, so each round compares like with like.

- When you have the page source or a URL, capture with the measure script: `node <design-critic folder>/scripts/measure.mjs <page> --out <round folder>`. With no viewport flag it writes `desktop.png`, `phone.png`, `tablet.png`, `widescreen.png`, and `facts.json` into the round folder. Pick the flags in round 1: none, or the viewport flags the person asked for (`--desktop`, `--phone`, `--tablet`, `--widescreen`, `--width N`), and `--dark` when the person asks for dark mode or the code you changed touches the theme. Then pass exactly the same flags in every round, so each round captures the same viewports. Every screenshot that `facts.json` lists goes to the critic and to the work order, in the order of the facts file viewports. If round 1 found a dark mode and a later round's `facts.json` sets `dark_mode.found_by` to none, say at the stop that the fix broke dark mode. If it prints `cannot measure:` and exits with code 3 (the page does not open), use your own tool, as below, for the whole loop. If it exits with code 4, Playwright or its Chromium is missing: stop, show the person the install commands from the `cannot measure:` line, and ask whether to install them. Never install without their yes. On yes, run the install commands in the project, then run the measure script again. On no, use your own tool, as below, for the whole loop, and say at the stop that the loop ran without measured facts.
- Otherwise, take the screenshot with the tool you already have, such as Playwright or a browser tool, at the same viewport width and height and the same part of the page in every round, and save it in the round folder.

Rebuild or reload the app before each capture, so the image shows your fix and not the old build.

## Round 1: the crit

1. Capture into `<loop folder>/round-1`.
2. Run the design-critic skill on that capture, steps 1 to 5 of its `SKILL.md`, with every screenshot and the facts file when you have one. It writes `crit.md` and `work-order.json` into the round folder. When the person gave a brief, make its Brief block by step 1 of that `SKILL.md`, write it to `<loop folder>/brief.md`, and pass that block to the design-critic run. `brief.md` is the current brief: every later round reads it as it stands, after any decision that "When the person settles a finding" below adds. When the person gave the real thing that the design mocks, as a path, write each path to `<loop folder>/real-thing.txt`, one path per line, and pass the paths to the design-critic run as step 1 of its `SKILL.md` says. Its step 5 asks the person, in one question, for the facts the crit requests.
3. If the work order has nothing to fix, as step 1 of "Each round after that" defines it, stop.

## Each round after that

1. Fix every finding of the last work order, from the top. Wait until the work-order agent has finished and the work order exists, and fix from it, not from `crit.md`: the work order has the measured places and targets that the prose leaves out. Take the findings in `rank` order. Each has a `location` (with a `selector` and a `box` when one was measured), a `target`, and a `fix_direction`. Fix every finding in this pass, the ones with `rank` null after the ranked ones. Skip a finding only when "When a finding requests a fact" sets it aside, the person settled it ("When the person settles a finding"), "Deck pattern wins" overrides it, or it asks for the opposite of a finding above it on the same element. In that last case fix the finding above it, keep skipping the other one in every later round, and do not change the element back; the skipped finding does not count against the stop rules. Also skip an item that the brief's Ask or Stage puts out of scope, as step 3 of `<design-critic folder>/agents/critic.md` says, such as pixel polish when Stage says sketch, but never text contrast or a target size under the WCAG minimum, or a broken Fixed entry: fix those, and they count for the stop, but never by changing a Fixed entry; when only a change to a Fixed entry would cure one, skip it and name it at the stop. Also skip the line that says a mock could not be checked against the real thing: only the person can give the real thing, and the loop never asks for it or searches for it. A work order has nothing to fix when each of its entries, ranked or with `rank` null, is one of these skips. At the stop, name each finding you skipped and why. The last section of this file says what you may change in the copy.
   The rule against new content in "Fix the design, not the score" holds here too, so a fix adds only an element that carries no content, such as a divider, a button that wraps an action already on the page, or a background, or, only in the fix of a screen that a cut left too thin, one that carries a fact or a real example that section allows. A control that a finding asks for may be added when its label uses only words already on the piece or in `brief.md`, such as a "Your question" field under a line that says volunteers answer questions. It adds no promise, number, or sample data. Before you commit a fix, check every element it added or changed against the template tells. Changed means a new size, weight, color, fill, border, shadow, or shape on an element that was already there, such as text set larger or bolder, or a panel given a new fill. Open `<design-critic folder>/references/checklist.md`, find the "Template tells" section, and open the entries of each question there that the element could fail with `node <design-critic folder>/scripts/entries.mjs "<title>"`. When the element has a stock form that an entry names, such as a gradient, a glow, a colored border, or one more text size, use a plain form instead: a solid color, a flat edge, a thin rule, a size the page already uses.
   Fix a short last line, one word alone on the last line of a block, on that element only: give the element its own class or id, or use a rule whose selector matches only that element, and set there a width, a `text-wrap` value, or a non-breaking space between the last two words, which keeps every word as it is. Never set `text-wrap`, `text-wrap-style`, `white-space`, `word-break`, or `overflow-wrap`, and never change hyphenation, on a selector that other elements share, such as `h1, h2, h3` or a rule for every paragraph, and never remove or override a `text-wrap: balance` or `text-wrap: pretty` that the page already sets, on that element or any other. When the element inherits a `text-wrap: balance` or `text-wrap: pretty`, use only a width or a non-breaking space.
2. Capture into `<loop folder>/round-<n>`, the same way as in round 1.
3. Start a fresh recheck critic with the Agent tool: `subagent_type: "general-purpose"`, `model: "opus"`. Use this prompt, with the placeholders filled, and the facts line only when this round has a `facts.json`:

   ```
   Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better.

   Read <design-critic folder>/agents/recheck.md and follow it. The skill folder is <design-critic folder>; every path in recheck.md is relative to it.

   Before image: <absolute path of the last round's image>
   After image: <absolute path of this round's image>
   Last work order: <absolute path of the last work-order.json>
   Measured facts file: <absolute path of this round's facts.json>

   You critique only. Do not edit, move, or create any file except crops in a temporary folder.
   When the recheck is done, end with the full recheck as your final message. If you were spawned as a teammate, also call SendMessage to the agent that spawned you with the full recheck.
   ```

   With a `brief.md` in the loop folder, add its current text, the Brief block, right after the `After image` line (or the `After images` line). With no `brief.md`, use the prompt exactly as shown.

   With a facts file of several viewports, write `Before images: <absolute paths of the last round's screenshots>` and `After images: <absolute paths of this round's screenshots>` in place of the two image lines, both in the order of the facts file viewports.

   With a `real-thing.txt` in the loop folder, add one line `Real thing: <absolute path>` for each path in it, as the last lines before `You critique only.`, in every round. Never search the disk for the real thing.

4. Save its final message as `crit.md` in the round folder, exactly as it wrote it.
5. Count the findings it marked closed under "Finding status", and check the stop rule below. A finding marked settled counts as closed: the person settled it, and the Fixed line of `brief.md` holds the decision. A finding marked "closed, new problem" counts as closed too: your fix added a template tell or made one of an element already there, and the recheck lists that tell as a new problem, so the next work order holds it.
6. If you do not stop, write the new work order with step 5 of the design-critic skill's `SKILL.md`, which first asks the person, in one question, for the facts that this round's crit requests (see "When a finding requests a fact"): this round's `crit.md`, this round's images, its facts file, and the Brief block from `brief.md` when the loop folder has one. Then start the next round.

A finding marked worse is not progress. Fix it before the findings ranked below it.

## A deck or a flow

A deck is a set. Each slide is one page of the loop, and every round a set critic also checks that the set holds together. A flow of screens of one product runs the same way, with each screen as a slide. Versions of one design are not a set: they need a best pick, so ask the person, as "Pick the mode" in the design-critic `SKILL.md` says. With more than twelve slides, split the deck into parts of twelve or fewer in slide order, run this section on each part with its own set folder, `<round folder>/set-<n>` for part n, in place of `<round folder>/set`, and tell the person. The slide folders keep their slide numbers, so a tile's slide stays clear across parts.

This section replaces "Capture", "Round 1: the crit", "Each round after that", and "When to stop" for a set. The fix rules of "Each round after that" step 1 hold for each fix.

**Capture.** A deck is one HTML file or URL, and its hash anchor picks the slide: `deck.html#3` shows slide 3. Capture one image per slide with one run of the measure script per slide, as "Capture" says, with the page `<deck file>#<k>`, where k is the slide number, the out folder `<round folder>/slide-<k>`, and the one viewport flag that matches the slide size, such as `--widescreen` for 1920 x 1080 px or `--desktop` for 1280 x 800 px. For a local deck file, the measure script keeps the hash and measures only the element whose id the hash names, so a deck whose hash only scrolls still gives one slide. A flow whose screens are separate files or URLs gets one run per screen in the same way. Use your own tool at the slide's size only when the measure script cannot open the deck. Use the same capture for every slide in every round.

**Round 1.** Capture every slide. Then run the design-critic skill in contact-sheet mode on the slides, one image per slide (with its facts file when there is one), in slide order, and name "consistency check" in the call. Make the contact sheet in `<round folder>/set` and save the set critic's crit there as `crit.md`. When the slides have facts files, the design-critic skill runs the compare-facts script for the set critic; pass it the viewport you captured, such as `--viewport widescreen`, as "Contact-sheet mode" step 2 says. Each slide's `crit.md` and `work-order.json` go in its slide folder. When the loop has a `brief.md`, pass its Brief block as Round 1 step 2 says; it goes to every slide critic and to the set critic. The design-critic skill asks for the requested facts after the slide crits and the set critic are done, so its question includes a fact that the set critic's `crit.md` requests. Then write the set work order, as below. Stop if no slide's work order has anything to fix, as step 1 of "Each round after that" defines it (so its entries that "Deck pattern wins" overrides and the ones that "When a finding requests a fact" sets aside do not count), and the set critic's last line is `Breaks: none`, or names only thin-screen breaks that "When a finding requests a fact" sets aside.

**The set work order.** The set critic writes no work order, so you start one. As soon as the set critic has finished and its last line names a tile, spawn the work-order agent with the step 5 prompt of the design-critic `SKILL.md`: the set `crit.md` as the crit file, `sheet.png` as the only image, no facts line, `<round folder>/set` to write in, and the Brief block when the loop has a `brief.md`. The agent follows "A set crit" in `<design-critic folder>/agents/work-order.md`, writes one ranked entry per break, and names each tile with its slide folder, such as `slide-3`. When the last line is `Breaks: none`, write no set work order. Do the same at step 6 of every later round.

**Deck pattern wins.** When a slide's finding and the set critic ask for opposite changes on one element, such as where a heading sits, the slide keeps the deck's pattern. Do not fix that slide finding, and do not change the element back in a later round. When the slide finding argues that the shared pattern itself is wrong, propose the change once, for every slide, in your report at the stop, for the person to accept; do not stop to ask. A slide finding that this rule overrides does not count against the stop rules.

**Each later round.**

1. Fix the ranked breaks of the set work order first, then each slide's work order, each from the top. A break's entry names its tile and its slide folder. Do not fix the set work order's entries with `rank` null: they come from the set critic's "Smaller things", which "When to stop" below does not count. The skips of step 1 of "Each round after that" hold for each slide's work order, the lasting skip of a finding that asks for the opposite of a finding above it included.
2. Capture every slide again into `<loop folder>/round-<n>`.
3. Build the new contact sheet as "Contact-sheet mode" step 2 of the design-critic `SKILL.md` says, in `<round folder>/set`, with compare-facts given the same viewport as in round 1. Then start, in one message, the recheck critic of each slide whose last work order has something to fix, as step 1 of "Each round after that" defines it, or that a fix changed this round, with the step 3 prompt filled for that slide and the Brief block when the loop has a `brief.md`, and a fresh set critic on the new sheet, with the set-critic prompt of "Contact-sheet mode" step 2. When the last round has a set work order, add the line `Last set work order: <absolute path of the last set work-order.json>` to the set critic's prompt right after the `Images, in tile order` line, so it marks each break of that work order closed or open. A slide that gets no recheck keeps its last work order.
4. Save each recheck as `crit.md` in its slide folder, and the set crit as `crit.md` in the set folder.
5. Count and check the stop rules below.
6. If you do not stop, and once the set critic is done, wait for every slide's recheck, ask once for the facts that all of them request, the set critic's `crit.md` included, as step 5 of the design-critic `SKILL.md` says, and then start in one message the work-order agent of each rechecked slide, as step 6 of "Each round after that" says, and the set work-order agent.

**When to stop.** Leave out every finding that step 1 of "Each round after that" skips, such as a slide finding that "Deck pattern wins" overrides or a finding that "When a finding requests a fact" sets aside. Stop when one of these is true:

- No slide has a ranked finding or a smaller thing left, counted as "No finding is left" in "When to stop" counts them, in its last recheck or, for a slide with no recheck this round, its last work order; and the set critic's last line is `Breaks: none`, or names only thin-screen breaks that "When a finding requests a fact" sets aside. The set critic's own "Smaller things" do not count, and you do not fix them.
- Two rounds in a row close nothing: no recheck marks a finding closed (settled and "closed, new problem" count as closed), and the set critic marks no break of the last set work order closed.

At the stop, tell the person what "When to stop" lists, for each slide under its file name, plus the set critic's last line, the breaks still open, the slide findings that "Deck pattern wins" overrode, and any change to the shared pattern you propose.

The rules of "When the person settles a finding" and "Fix the design, not the score" hold for each slide.

## When the person settles a finding

The person can make a decision about a finding in chat, during a round or between rounds, such as "keep this headline as it is" or "make the tone calmer". Before the next recheck, write the decision into `<loop folder>/brief.md`, in the person's meaning. When the loop has no `brief.md`, create it with the `Brief:` line and the line the decision needs, whatever field that is. A new field line goes in the order of the Brief block: after the last earlier field that is there, and before any later one.

- A decision that settles a finding, meaning "keep this element as it is", always goes on the Fixed line, because keeping an element as it is fixes its exact form. Write each entry as its own sentence, with any exact text in double quotes, such as: The headline stays "Vet every candidate". Do not fix that finding. When you already changed its element in this round, undo that change before the capture. The recheck marks the finding settled, and it is never listed again, ranked or under "Smaller things".
- A decision that gives new direction, such as "make the tone calmer", goes in the field that rules 1 to 5 of FR-87 pick, and settles no finding.

Every later recheck and work-order run reads the updated `brief.md`.

## When a finding requests a fact

A finding that needs a fact only the maker has requests it with a `Fact needed from the maker:` sentence (`agents/critic.md`). Step 5 of the design-critic `SKILL.md` asks for these facts, once per round, after the crit or recheck and before the work order. For a deck, the round's single question covers every slide's `crit.md` and the set critic's `crit.md`; the set critic requests no facts, with one exception: a thin-screen break whose content neither `brief.md` nor a real thing gives ends with that sentence, as step 5 of `<design-critic folder>/agents/recheck.md` and `<design-critic folder>/agents/set-critic.md` say, and goes through this section like any requested fact. Write each answer into `<loop folder>/brief.md` as "When the person settles a finding" writes a decision: in the field that rules 1 to 5 of FR-87 pick. The work-order agent then reads it.

Write each fact that was asked for and not given, because the person declined it or left it unanswered, to `<loop folder>/facts-asked.txt`, one line each, in the request's own words. Before step 5 asks, give it the facts in that file as asked before and not given, so it does not ask for them again. A later finding on the same element that requests the same fact in other words is the same request. A fact the person answers goes into `brief.md` and not into that file. A finding whose whole fix is a requested fact that nobody gave stays open and is listed at the stop. That finding does not count against the stop rules: leave it out of "No finding is left" and of the deck's "No slide has a ranked finding or a smaller thing left". A finding that holds the `Fact needed from the maker:` sentence together with other fixes is not set aside: make its other fixes, and list the fact at the stop. Once its other fixes are made and only its requested fact is left, it counts as a finding whose whole fix is that fact. With no person to ask, the work order is written as it is, and every requested fact counts as asked and not given and is written to `<loop folder>/facts-asked.txt`.

The loop uses only what it was given: the request, the brief, and the files the caller named. It never searches the disk or the repository for a fact.

## When to stop

Stop when one of these is true:

- No finding is left: the last recheck says "None." under "What would move it most" and lists no item under "Smaller things" (it leaves that heading out when it has none). Leave out the findings that "When a finding requests a fact" sets aside and the other findings that step 1 of "Each round after that" skips.
- Two rounds in a row have no finding marked closed.

When you stop, tell the person:

- which of the two rules made you stop,
- the last first read and verdict,
- the findings still open or worse, with their places,
- the findings you skipped, each with why,
- the findings whose requested fact nobody gave, each with the fact it requested,
- the path of the loop folder.

If a script or a critic cannot run, do not retry it in a loop. Tell the person what it printed, and stop.

## Fix the design, not the score

Fix the design for the person who will use it. Do not hide or remove content to close a finding. After a cut, each screen must still make its point: fix a screen that a cut left too thin, as step 5 of `<design-critic folder>/agents/recheck.md` says, with more real content, never by respacing.

Never invent content. Add no images, testimonials, or sections. Change the copy only with the editorial edits that a finding calls for, and only as far as the "Suggest copy edits, never new content" bullet of `<design-critic folder>/agents/critic.md` allows; read that bullet before your first fix. Fix layout, type, color, spacing, and hierarchy freely. A fact or a real example that `brief.md` or a file in `real-thing.txt` gives is the maker's, not new content: use it exactly as given. Only in the fix of a screen that a cut left too thin, an element that carries one, such as a card, is not a new section; a quote from the brief is still a testimonial and is never added as a card. A fact the person states in the request reaches you through the `brief.md` that round 1 writes. A finding whose requested fact nobody gave stays open; "When a finding requests a fact" says how it counts at the stop.
