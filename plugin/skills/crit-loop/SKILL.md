---
name: crit-loop
description: Use after you change UI code (HTML, CSS, components) and want to check the design. Takes a screenshot with your own browser tool, runs crit report --json, fixes the top findings, then runs crit compare and crit gate until the gate passes or two rounds in a row improve nothing.
---

# The crit fix loop

crit judges a picture of a design and tells you what looks wrong. This skill tells you which crit commands to run, how to read their JSON, and when to stop. crit decides every verdict, change, and threshold. You do not compute any of them. The rules are in `docs/PRD.md` of the deskcrit repository.

## Before you start

- `.crit.yaml` names a screenshot path. Always keep your latest screenshot at that path, because the plugin hook runs crit gate on the image there.
- In the commands below, `after.png` stands for the image at the screenshot path, and `before.png` is the screenshot from the round before.
- If you give crit report options such as `--pack` or `--context`, give the same options to crit compare and crit gate.
- Read the JSON from stdout only. Errors go to stderr.

## Round 1: report and gate

1. Build the app and start it.
2. Take a screenshot with the tool you already have, such as Playwright or a browser tool. crit does not take screenshots.
3. Take one screen height or one section per image. Never take a full-page screenshot. crit refuses an image that it would shrink below half size, with exit code 2. For a taller page, work on one part at a time, and keep the part you fix at the screenshot path.
4. Run `crit report after.png --json`.
5. Run `crit gate after.png --json`. If `gate.passed` is true, stop now. A page that already passes needs no fix.
6. Read `findings`. They are already sorted, most important first. Do not sort them again and do not score them again.
7. Fix from the top of the list. Each finding has a `verdict` and a `fix` hint. When its `region` is not null, it shows where on the image to look, in pixels of your screenshot.

Round 1 never counts as a stalled round.

## Each round after that

A round is one fix, one new screenshot, one crit compare, and one crit gate.

1. Copy the image at the screenshot path to `before.png`.
2. Make your fix.
3. Rebuild or reload the app, so that the screenshot shows your fix and not the old build.
4. Take a new screenshot of the same section, with the same viewport and the same size as before, and save it at the screenshot path.
5. Run `crit compare before.png after.png --json`. Read `summary` and each entry in `changes`. Each entry has a `change`.
6. Run `crit gate after.png --json`. Trust `gate.passed`, `gate.blocking`, and the exit code. Do not work them out again.
7. Check the stop rule below. If you do not stop, use the `findings` of the gate output to pick the next fix, from the top.

An uncertain change is not an improvement. Only `summary.improved` counts.

If `skipped` is not empty, mention it to the person. It does not count for the stop rule.

## Exit codes

- crit gate exits 0 when the gate passes, 1 when it fails, and 2 when crit could not run.
- crit report and crit compare exit 0 whatever the verdicts. Exit 0 from them is not a pass.
- On exit code 2 from any command, do not retry. Tell the person what stderr says, for example that the API key is missing, and stop.

## When to stop

Stop when one of these is true:

- `gate.passed` is true.
- Two rounds in a row have `summary.improved` equal to 0.

When you stop, tell the person:

- which of the two rules made you stop,
- the last `summary` from crit compare,
- the criteria in `gate.blocking`.

## Fix the design, not the score

Fix the design for the person who will use it. Do not hide or remove content to make a criterion pass.
