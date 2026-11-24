---
name: crit-loop
description: Use after you change UI code (HTML, CSS, components) and want to check the design and fix it. Runs the design-critic skill, fixes from the top of its work order, captures the page again at the same viewport, and has a fresh critic mark each finding closed, open, or worse, until no ranked finding is left or two rounds in a row close nothing.
---

# The fix loop

The design-critic skill judges a picture of a design and writes a work order: the findings, ranked, each with where it is, what the viewer meets, the target, and the check that closes it. This skill tells you how to fix from that work order, how to check each fix, and when to stop. The critics decide every finding, rank, and status. You do not judge them again. The rules are FR-82 in `docs/PRD.md` of the deskcrit repository.

In the steps below, `<design-critic folder>` is the `design-critic` folder next to this skill's folder, and `<loop folder>` is a new folder in the system temp folder that holds one folder per round.

## Capture

Use the same capture in every round, so each round compares like with like.

- When you have the page source or a URL, capture with the measure script: `node <design-critic folder>/scripts/measure.mjs <page> --out <round folder>`. With no viewport flag it writes `desktop.png`, `phone.png`, `tablet.png`, `widescreen.png`, and `facts.json` into the round folder. Pick the flags in round 1: none, or the viewport flags the person asked for (`--desktop`, `--phone`, `--tablet`, `--widescreen`, `--width N`), and `--dark` when the person asks for dark mode or the code you changed touches the theme. Then pass exactly the same flags in every round, so each round captures the same viewports. Every screenshot that `facts.json` lists goes to the critic and to the work order, in the order of the facts file viewports. If round 1 found a dark mode and a later round's `facts.json` sets `dark_mode.found_by` to none, say at the stop that the fix broke dark mode. If it prints `cannot measure:` and exits with code 3 (the page does not open), use your own tool, as below, for the whole loop. If it exits with code 4, Playwright or its Chromium is missing: stop, show the person the install commands from the `cannot measure:` line, and ask whether to install them. Never install without their yes. On yes, run the install commands in the project, then run the measure script again. On no, use your own tool, as below, for the whole loop, and say at the stop that the loop ran without measured facts.
- Otherwise, take the screenshot with the tool you already have, such as Playwright or a browser tool, at the same viewport width and height and the same part of the page in every round, and save it in the round folder.

Rebuild or reload the app before each capture, so the image shows your fix and not the old build.

## Round 1: the crit

1. Capture into `<loop folder>/round-1`.
2. Run the design-critic skill on that capture, steps 1 to 5 of its `SKILL.md`, with every screenshot and the facts file when you have one. It writes `crit.md` and `work-order.json` into the round folder.
3. If the work order has no finding with a rank, stop: there is nothing to fix.

## Each round after that

1. Fix from the top of the last work order. Wait until the work-order agent has finished and the work order exists, and fix from it, not from `crit.md`: the work order has the measured places and targets that the prose leaves out. Take the findings in `rank` order. Each has a `location` (with a `selector` and a `box` when one was measured), a `target`, and a `fix_direction`. Fix as many as you can do well in one pass, from the top; the findings with `rank` null come last. Never add content; the last section of this file says what you may change in the copy.
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

   With a facts file of several viewports, write `Before images: <absolute paths of the last round's screenshots>` and `After images: <absolute paths of this round's screenshots>` in place of the two image lines, both in the order of the facts file viewports.

4. Save its final message as `crit.md` in the round folder, exactly as it wrote it.
5. Count the findings it marked closed under "Finding status", and check the stop rule below.
6. If you do not stop, write the new work order with step 5 of the design-critic skill's `SKILL.md`: this round's `crit.md`, this round's images, and its facts file. Then start the next round.

A finding marked worse is not progress. Fix it before the findings ranked below it.

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
