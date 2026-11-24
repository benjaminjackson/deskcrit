---
name: design-critic
description: Critiques a still image of a design (a screenshot, mockup, poster, slide, chart, or illustration) the way a senior design director would in a crit, backed by a checklist of about 220 guidelines from Bringhurst, Müller-Brockmann, Tufte, WCAG, Nielsen and the rest of an approved reading list. Use when the user or the main thread wants a design critiqued, reviewed, or judged, asks "how does this look", "crit this", "what's wrong with this design", or wants feedback on a screenshot before shipping, or a set of screens to check for consistency. Critiques only; it does not edit files or redesign the piece.
---

# Design critic

This skill runs a critic agent on one image. The agent walks a checklist of guidelines, goes deep on anything that fails with the guideline's sources and approved fixes, then writes a ranked crit.

## Run it

1. Collect the inputs: the absolute path of each image, and whatever you know about the piece's purpose, audience, and medium. Do not ask the user for context they did not give; the critic states its own assumption.
2. Spawn one agent with the Agent tool: `subagent_type: "general-purpose"`, `model: "opus"`. Use this prompt, with the placeholders filled. `<skill folder>` is the base directory Claude Code gave when it loaded this skill.

   ```
   Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better.

   Read <skill folder>/agents/critic.md and follow it. The skill folder is <skill folder>; every path in critic.md is relative to it.

   Image(s): <absolute paths>
   What I know about the piece: <purpose, audience, medium, or "nothing">
   <Any focus the caller asked for, such as "compare v1 and v2" or "only the chart". Omit if none.>

   You critique only. Do not edit, move, or create any file except crops in a temporary folder.
   When the critique is done, end with the full critique as your final message. If you were spawned as a teammate, also call SendMessage to the agent that spawned you with the full critique.
   ```

   If the person gives a page or a URL and you run `scripts/measure.mjs` on it to get a facts file, and it exits with code 4, Playwright or its Chromium is missing: show the person the install commands from its `cannot measure:` line, ask whether to install them, and never install without their yes. On no, critique the image alone and say so.

   When you have a measured facts file for the page in the image (`facts.json` from `scripts/measure.mjs`), add this line right after the `Image(s)` line, with the path filled:

   ```
   Measured facts file: <absolute path of facts.json>
   ```

3. Give the critique to the user as the agent wrote it. Do not soften or trim it. Add your own comment only if the user asked for it.

4. Write the work order, the JSON a coding agent acts on (schema: `schemas/work-order.schema.json` in the deskcrit repository). Pick the work folder: the folder that holds `facts.json` when there is one, else the image's folder. Save the critique there as `crit.md`, exactly as the agent wrote it, with the Write tool. Then spawn one agent with the Agent tool: `subagent_type: "general-purpose"`, `model: "sonnet"`, with this prompt, the placeholders filled, and the facts line only when the critic had that file:

   ```
   Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better.

   Read <skill folder>/agents/work-order.md and follow it. The skill folder is <skill folder>; every path in work-order.md is relative to it.

   Crit file: <absolute path of crit.md>
   Image: <absolute path of the image>
   Measured facts file: <absolute path of facts.json>
   Write in: <absolute path of the work folder>

   When the work order is done, end with its absolute path as your final message. If you were spawned as a teammate, also call SendMessage to the agent that spawned you with that path.
   ```

   Tell the user the path of `work-order.json`. With two or more images, skip this step: a work order is for one image.

## Set of screens

Use this branch when the person gives three or more screens of one product, site, or deck, or asks whether screens are consistent. The person gets one crit per screen and one crit of how well the set holds together.

1. For each screen, run "Run it" steps 1, 2, and 4 with that one image: spawn all the critics in one message so they run at the same time, use the usual prompt, and when each crit is done, write its work order in its own work folder (the folder that holds that screen's `facts.json`, else a new folder per screen in the system temp folder, so no two work orders share a folder).
2. At the same time, make the contact sheet. Run `node <skill folder>/scripts/contact-sheet.mjs <screen paths in order> --out <new folder in the system temp folder>`. It writes `sheet.png` and `tiles.json` in that folder. Then spawn one agent with the Agent tool: `subagent_type: "general-purpose"`, `model: "opus"`, with this prompt and the placeholders filled:

   ```
   Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better.

   Read <skill folder>/agents/set-critic.md and follow it. The skill folder is <skill folder>; every path in set-critic.md is relative to it.

   Contact sheet: <absolute path of sheet.png>
   Tiles file: <absolute path of tiles.json>
   Screens, in tile order: <absolute paths>
   What I know about the product: <purpose, audience, medium, or "nothing">

   You critique only. Do not edit, move, or create any file except crops in a temporary folder.
   When the crit is done, end with the full crit as your final message. If you were spawned as a teammate, also call SendMessage to the agent that spawned you with the full crit.
   ```

   The set crit gets no work order.
3. Give the person the set crit first, then each screen's crit under its file name, as the agents wrote them, then the path of each `work-order.json`.

## What is in the folder

- `agents/critic.md`: the critic's instructions, how it looks, what makes a good finding, and the output format.
- `references/checklist.md`: yes-or-no questions in sections, whole page first and detail last, where yes means fine; each kind of defect has one question, and each question points to the full entries it stands for.
- `references/<domain>.md`: full entries for basics, layout, typography, color, art direction, ux, accessibility, and dataviz. Each gives the rule, what to look for, the source, caveats about the source, and the approved fix.
- `agents/deep-mode.md`, `agents/section-critic.md`, `agents/director.md`, and `references/checklist-<section>.md`: the deep mode, one critic per checklist section and a director who merges and ranks their reports.
- `agents/work-order.md`: the instructions of the agent that turns the finished crit into `work-order.json`.
- `scripts/work-order.mjs`: checks a work order against its crit, image, and facts file: one entry per ranked finding, and every pixel box taken from the facts file or a crop.
- `agents/set-critic.md`: the set critic's instructions, which judge whether a set of screens keeps one pattern and name each screen that breaks it.
- `agents/recheck.md`: the recheck critic of the crit-loop skill, which checks a fix against the last work order.
- `scripts/build.rb`: makes `references/` from this repository's `GUIDELINES.md` and `packs/`.

## Update the references

The references come from the repository root (`GUIDELINES.md` and `packs/<pack>/pack.yaml`). Do not edit `references/` by hand. When the catalog or a pack changes, run this from the repository root:

```
ruby plugin/skills/design-critic/scripts/build.rb
```

The installed plugin copy has no `GUIDELINES.md`, so run it from a checkout of the repository. `npm run ci` checks that the committed references equal a fresh build.

The script fails if a crit criterion has no matching guideline entry.
