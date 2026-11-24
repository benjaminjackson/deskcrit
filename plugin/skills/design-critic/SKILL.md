---
name: design-critic
description: Critiques still images of a design (a screenshot, mockup, poster, slide, chart, or illustration) the way a senior design director would in a crit, backed by a checklist of about 220 guidelines from Bringhurst, Müller-Brockmann, Tufte, WCAG, Nielsen and the rest of an approved reading list. One image gets a crit. Two or more images get a crit each, plus either a consistency check of the set or a pick of the best version. Use when the user or the main thread wants a design critiqued, reviewed, or judged, asks "how does this look", "crit this", "what's wrong with this design", wants feedback on a screenshot before shipping, wants screens checked for consistency, or wants the best of several versions picked. Critiques only; it does not edit files or redesign the piece.
---

# Design critic

This skill runs a critic agent on one image. The agent walks a checklist of guidelines, goes deep on anything that fails with the guideline's sources and approved fixes, then writes a ranked crit.

## Pick the mode

Count the images first. The count picks the mode, and nothing else does.

- **One image: a normal crit.** Follow "Run it". The person gets one crit and one work order.
- **Two or more images: contact-sheet mode, always.** Follow "Contact-sheet mode". Each image gets its own normal crit and work order, and then one last agent reads all the images on one contact sheet. That last agent does one of two jobs, and the request picks which:
  - **Consistency check** (`agents/set-critic.md`): does the set hold together as one product, and which image breaks a pattern the others keep. Requests such as "are these consistent" or "check this flow" mean this.
  - **Best pick** (`agents/picker.md`): which version does the job best. Requests such as "which is best", "pick one", "compare v1 and v2", or "before and after" mean this. The old before-and-after compare is now the best pick with two images.
- **When the request does not say which**, ask the person one question that names the two: "Do you want a consistency check of the set, or a pick of the best version?" When the caller is another agent and no person can be asked, the caller must name the mode. If it did not, stop and reply with this one line, and do not guess: `Two or more images need a mode: "consistency check" or "best pick".`
- **Several images to critique with neither check**: call this skill once per image, each time with one image. Contact-sheet mode always adds the last agent.

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

3. Add the section "Where it could go further" with a second agent, which reads the image and the finished crit and writes only that section. Pick the work folder: the folder that holds `facts.json` when there is one, else the image's folder. Save the critique there as `crit.md`, exactly as the agent wrote it, with the Write tool. Then spawn one agent with the Agent tool: `subagent_type: "general-purpose"`, `model: "opus"`, with this prompt and the placeholders filled:

   ```
   Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better.

   Read <skill folder>/agents/go-further.md and follow it. The skill folder is <skill folder>; every path in go-further.md is relative to it.

   Image: <absolute path of the image>
   Crit file: <absolute path of crit.md>

   You write only the section. Do not edit, move, or create any file except crops in a temporary folder.
   End with the section as your final message. If you were spawned as a teammate, also call SendMessage to the agent that spawned you with the section.
   ```

   Join the section into the crit exactly as the agent wrote it, as its own paragraph right after "What's working": before "Couldn't judge from a still" when the crit has it, else before "Checklist". Write the joined crit over `crit.md`.

4. Give the critique to the user, joined with the section. Do not soften or trim it. Add your own comment only if the user asked for it.

5. Write the work order, the JSON a coding agent acts on (schema: `schemas/work-order.schema.json` in the deskcrit repository). Use the `crit.md` of step 3; the work-order agent leaves the items of "Where it could go further" out. Then spawn one agent with the Agent tool: `subagent_type: "general-purpose"`, `model: "sonnet"`, with this prompt, the placeholders filled, and the facts line only when the critic had that file:

   ```
   Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better.

   Read <skill folder>/agents/work-order.md and follow it. The skill folder is <skill folder>; every path in work-order.md is relative to it.

   Crit file: <absolute path of crit.md>
   Image: <absolute path of the image>
   Measured facts file: <absolute path of facts.json>
   Write in: <absolute path of the work folder>

   When the work order is done, end with its absolute path as your final message. If you were spawned as a teammate, also call SendMessage to the agent that spawned you with that path.
   ```

   Tell the user the path of `work-order.json`. A work order is for one image, so in contact-sheet mode each image gets its own.

## Contact-sheet mode

Use this mode for two or more images, once you know the mode from "Pick the mode". The person gets one crit and one work order per image, and then one consistency check or one best pick.

1. For each image, run "Run it" steps 1, 2, 3, and 5 with that one image, so each crit has its "Where it could go further" section and its work order: spawn all the critics in one message so they run at the same time, use the usual prompt, and when each crit is done, write its work order in its own work folder (the folder that holds that image's `facts.json`, else a new folder per image in the system temp folder, so no two work orders share a folder).
2. At the same time, make the contact sheet. Run `node <skill folder>/scripts/contact-sheet.mjs <image paths in order> --out <new folder in the system temp folder>`. It writes `sheet.png` and `tiles.json` in that folder. Then spawn one agent with the Agent tool: `subagent_type: "general-purpose"`, `model: "opus"`, with this prompt and the placeholders filled. `<agent file>` is `set-critic.md` for the consistency check and `picker.md` for the best pick.

   ```
   Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better.

   Read <skill folder>/agents/<agent file> and follow it. The skill folder is <skill folder>; every path in <agent file> is relative to it.

   Contact sheet: <absolute path of sheet.png>
   Tiles file: <absolute path of tiles.json>
   Images, in tile order: <absolute paths>
   What I know about the piece: <purpose, audience, medium, or "nothing">

   You critique only. Do not edit, move, or create any file except crops in a temporary folder.
   When the crit is done, end with the full crit as your final message. If you were spawned as a teammate, also call SendMessage to the agent that spawned you with the full crit.
   ```

   The consistency check and the best pick get no work order.
3. Give the person the consistency check or the best pick first, then each image's crit under its file name, as the agents wrote them, then the path of each `work-order.json`.

## What is in the folder

- `agents/critic.md`: the critic's instructions, how it looks, what makes a good finding, and the output format.
- `references/checklist.md`: yes-or-no questions in sections, whole page first and detail last, where yes means fine; each kind of defect has one question, and each question points to the full entries it stands for.
- `references/<domain>.md`: full entries for basics, layout, typography, color, art direction, ux, accessibility, and dataviz. Each gives the rule, what to look for, the source, caveats about the source, and the approved fix.
- `agents/deep-mode.md`, `agents/section-critic.md`, `agents/director.md`, and `references/checklist-<section>.md`: the deep mode, one critic per checklist section and a director who merges and ranks their reports.
- `agents/go-further.md`: the instructions of the second agent, which reads the image and the finished crit and writes only the section "Where it could go further".
- `agents/work-order.md`: the instructions of the agent that turns the finished crit into `work-order.json`.
- `scripts/work-order.mjs`: checks a work order against its crit, image, and facts file: one entry per ranked finding, and every pixel box taken from the facts file or a crop.
- `agents/set-critic.md`: the consistency check of contact-sheet mode, which judges whether a set of images keeps one pattern and names each image that breaks it.
- `agents/picker.md`: the best pick of contact-sheet mode, which ranks the versions by how well each does the job and names the best one.
- `scripts/contact-sheet.mjs`: lays several PNG screens out as one numbered contact sheet and writes `tiles.json`, which maps each tile number to its file.
- `agents/recheck.md`: the recheck critic of the crit-loop skill, which checks a fix against the last work order.
- `scripts/build.rb`: makes `references/` from this repository's `GUIDELINES.md` and `packs/`.

## Update the references

The references come from the repository root (`GUIDELINES.md` and `packs/<pack>/pack.yaml`). Do not edit `references/` by hand. When the catalog or a pack changes, run this from the repository root:

```
ruby plugin/skills/design-critic/scripts/build.rb
```

The installed plugin copy has no `GUIDELINES.md`, so run it from a checkout of the repository. `npm run ci` checks that the committed references equal a fresh build.

The script fails if a crit criterion has no matching guideline entry.
