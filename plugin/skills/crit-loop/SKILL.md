---
name: crit-loop
description: Use after you change UI code (HTML, CSS, components) and want to check the design and fix it. Runs the design-critic skill, fixes from the top of its work order, captures the page again at the same viewport, and has a fresh critic mark each finding closed, closed with a new problem, settled, open, or worse, until no ranked finding is left or two rounds in a row close nothing. For a deck or a flow, each round critiques every slide and checks that the set is consistent.
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
2. Run the design-critic skill on that capture, steps 1 to 5 of its `SKILL.md`, with every screenshot and the facts file when you have one. It writes `crit.md` and `work-order.json` into the round folder. When the person gave a brief, make its Brief block by step 1 of that `SKILL.md`, write it to `<loop folder>/brief.md`, and pass that block to the design-critic run. `brief.md` is the current brief: every later round reads it as it stands, after any decision that "When the person settles a finding" below adds. When the person gave the real thing that the design mocks, as a path, write each path to `<loop folder>/real-thing.txt`, one path per line, and pass the paths to the design-critic run as step 1 of its `SKILL.md` says.
3. If the work order has no finding with a rank, stop: there is nothing to fix.

## Each round after that

1. Fix from the top of the last work order. Wait until the work-order agent has finished and the work order exists, and fix from it, not from `crit.md`: the work order has the measured places and targets that the prose leaves out. Take the findings in `rank` order. Each has a `location` (with a `selector` and a `box` when one was measured), a `target`, and a `fix_direction`. Fix as many as you can do well in one pass, from the top; the findings with `rank` null come last. Never add content; the last section of this file says what you may change in the copy.
   The rule against new content still holds, so a fix adds only an element that carries no content, such as a divider, a button that wraps an action already on the page, or a background. Before you commit a fix, check every element it added or changed against the template tells. Changed means a new size, weight, color, fill, border, shadow, or shape on an element that was already there, such as text set larger or bolder, or a panel given a new fill. Open `<design-critic folder>/references/checklist.md`, find the "Template tells" section, and open the entries of each question there that the element could fail with `node <design-critic folder>/scripts/entries.mjs "<title>"`. When the element has a stock form that an entry names, such as a gradient, a glow, a colored border, or one more text size, use a plain form instead: a solid color, a flat edge, a thin rule, a size the page already uses.
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
6. If you do not stop, write the new work order with step 5 of the design-critic skill's `SKILL.md`: this round's `crit.md`, this round's images, its facts file, and the Brief block from `brief.md` when the loop folder has one. Then start the next round.

A finding marked worse is not progress. Fix it before the findings ranked below it.

## A deck or a flow

A deck is a set. Each slide is one page of the loop, and every round a set critic also checks that the set holds together. A flow of screens of one product runs the same way, with each screen as a slide. Versions of one design are not a set: they need a best pick, so ask the person, as "Pick the mode" in the design-critic `SKILL.md` says. With more than twelve slides, split the deck into parts of twelve or fewer in slide order, run this section on each part with its own set folder, `<round folder>/set-<n>` for part n, in place of `<round folder>/set`, and tell the person. The slide folders keep their slide numbers, so a tile's slide stays clear across parts.

This section replaces "Capture", "Round 1: the crit", "Each round after that", and "When to stop" for a set. The fix rules of "Each round after that" step 1 hold for each fix.

**Capture.** A deck is one HTML file or URL, and its hash anchor picks the slide: `deck.html#3` shows slide 3. Capture one image per slide with one run of the measure script per slide, as "Capture" says, with the page `<deck file>#<k>`, where k is the slide number, the out folder `<round folder>/slide-<k>`, and the one viewport flag that matches the slide size, such as `--widescreen` for 1920 x 1080 px or `--desktop` for 1280 x 800 px. For a local deck file, the measure script keeps the hash and measures only the element whose id the hash names, so a deck whose hash only scrolls still gives one slide. A flow whose screens are separate files or URLs gets one run per screen in the same way. Use your own tool at the slide's size only when the measure script cannot open the deck. Use the same capture for every slide in every round.

**Round 1.** Capture every slide. Then run the design-critic skill in contact-sheet mode on the slides, one image per slide (with its facts file when there is one), in slide order, and name "consistency check" in the call. Make the contact sheet in `<round folder>/set` and save the set critic's crit there as `crit.md`. When the slides have facts files, the design-critic skill runs the compare-facts script for the set critic; pass it the viewport you captured, such as `--viewport widescreen`, as "Contact-sheet mode" step 2 says. Each slide's `crit.md` and `work-order.json` go in its slide folder. When the loop has a `brief.md`, pass its Brief block as Round 1 step 2 says; it goes to every slide critic and to the set critic. Then write the set work order, as below. Stop if no slide's work order has a ranked finding and the set critic's last line is `Breaks: none`.

**The set work order.** The set critic writes no work order, so you start one. As soon as the set critic has finished and its last line names a tile, spawn the work-order agent with the step 5 prompt of the design-critic `SKILL.md`: the set `crit.md` as the crit file, `sheet.png` as the only image, no facts line, `<round folder>/set` to write in, and the Brief block when the loop has a `brief.md`. The agent follows "A set crit" in `<design-critic folder>/agents/work-order.md`, writes one ranked entry per break, and names each tile with its slide folder, such as `slide-3`. When the last line is `Breaks: none`, write no set work order. Do the same at step 6 of every later round.

**Deck pattern wins.** When a slide's finding and the set critic ask for opposite changes on one element, such as where a heading sits, the slide keeps the deck's pattern. Do not fix that slide finding, and do not change the element back in a later round. When the slide finding argues that the shared pattern itself is wrong, propose the change once, for every slide, in your report at the stop, for the person to accept; do not stop to ask. A slide finding that this rule overrides does not count against the stop rules.

**Each later round.**

1. Fix from the set work order first, then from each slide's work order, each from the top. A break's entry names its tile and its slide folder.
2. Capture every slide again into `<loop folder>/round-<n>`.
3. Build the new contact sheet as "Contact-sheet mode" step 2 of the design-critic `SKILL.md` says, in `<round folder>/set`, with compare-facts given the same viewport as in round 1. Then start, in one message, the recheck critic of each slide whose last work order has a ranked finding or that a fix changed this round, with the step 3 prompt filled for that slide and the Brief block when the loop has a `brief.md`, and a fresh set critic on the new sheet, with the set-critic prompt of "Contact-sheet mode" step 2. When the last round has a set work order, add the line `Last set work order: <absolute path of the last set work-order.json>` to the set critic's prompt right after the `Images, in tile order` line, so it marks each break of that work order closed or open. A slide that gets no recheck keeps its last work order.
4. Save each recheck as `crit.md` in its slide folder, and the set crit as `crit.md` in the set folder.
5. Count and check the stop rules below.
6. If you do not stop, start in one message the work-order agent of each rechecked slide, as step 6 of "Each round after that" says, and the set work-order agent.

**When to stop.** Leave out every slide finding that "Deck pattern wins" overrides. Stop when one of these is true:

- No slide has a ranked finding (its last recheck says "None." under "What would move it most", or its last work order has no ranked finding), and the set critic's last line is `Breaks: none`.
- Two rounds in a row close nothing: no recheck marks a finding closed (settled and "closed, new problem" count as closed), and the set critic marks no break of the last set work order closed.

At the stop, tell the person what "When to stop" lists, for each slide under its file name, plus the set critic's last line, the breaks still open, the slide findings that "Deck pattern wins" overrode, and any change to the shared pattern you propose.

The rules of "When the person settles a finding" and "Fix the design, not the score" hold for each slide.

## When the person settles a finding

The person can make a decision about a finding in chat, during a round or between rounds, such as "keep this headline as it is" or "make the tone calmer". Before the next recheck, write the decision into `<loop folder>/brief.md`, in the person's meaning. When the loop has no `brief.md`, create it with the `Brief:` line and the line the decision needs, whatever field that is. A new field line goes in the order of the Brief block: after the last earlier field that is there, and before any later one.

- A decision that settles a finding, meaning "keep this element as it is", always goes on the Fixed line, because keeping an element as it is fixes its exact form. Write each entry as its own sentence, with any exact text in double quotes, such as: The headline stays "Vet every candidate". Do not fix that finding. When you already changed its element in this round, undo that change before the capture. The recheck marks the finding settled, and it is never ranked again.
- A decision that gives new direction, such as "make the tone calmer", goes in the field that rules 1 to 5 of FR-87 pick, and settles no finding.

Every later recheck and work-order run reads the updated `brief.md`.

## When to stop

Stop when one of these is true:

- The recheck has no ranked finding left: under "What would move it most" it says "None.".
- Two rounds in a row have no finding marked closed.

When you stop, tell the person:

- which of the two rules made you stop,
- the last first read and verdict,
- the findings still open or worse, with their places,
- the findings you left open because they need content that only the owner has, and what kind of content each one needs,
- the path of the loop folder.

If a script or a critic cannot run, do not retry it in a loop. Tell the person what it printed, and stop.

## Fix the design, not the score

Fix the design for the person who will use it. Do not hide or remove content to close a finding.

Never add content. Add no new text, facts, names, numbers, sample data, images, testimonials, or sections. Change the copy only with the editorial edits that a finding calls for: cut, reorder, restore a missing verb or unit, or make a line clear. Do not rewrite the copy as a copywriter would. Fix layout, type, color, spacing, and hierarchy freely. When a finding needs content that only the owner has, leave it open and tell the person at the stop.
