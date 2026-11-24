---
name: design-critic
description: Critiques still images of a design (a screenshot, mockup, poster, slide, chart, or illustration) the way a senior design director would in a crit, backed by a checklist of about 210 guidelines from Bringhurst, Müller-Brockmann, Tufte, WCAG, Nielsen and the rest of an approved reading list, plus 38 signs of an AI-made template from unslop. One image gets a crit. Two to twelve images get a crit each plus one check, which the request names: a consistency check of the set ("are these consistent") or a best pick ("which is best"). An agent caller must name one, or it gets a one-line refusal. Use when the user or the main thread wants a design critiqued, reviewed, or judged, asks "how does this look", "crit this", "what's wrong with this design", wants feedback on a screenshot before shipping, wants screens checked for consistency, or wants the best of several versions picked. Critiques only; it does not edit files or redesign the piece.
---

# Design critic

This skill runs a critic agent on one image, or on the screenshots of one page at several viewports. The agent walks a checklist of guidelines, goes deep on anything that fails with the guideline's sources and approved fixes, then writes a ranked crit.

## Pick the mode

Count the images first. The count picks the mode, and nothing else does. The screenshots that one `facts.json` lists, one per viewport, count as one image: they are one page, so they get one normal crit and never start contact-sheet mode.

- **One image: a normal crit.** Follow "Run it". The person gets one crit and one work order.
- **Two or more images: contact-sheet mode, always.** Follow "Contact-sheet mode". Each image gets its own normal crit and work order, and then one last agent reads all the images on one contact sheet. That last agent does one of two jobs, and the request picks which:
  - **Consistency check** (`agents/set-critic.md`): does the set hold together as one product, and which image breaks a pattern the others keep. Requests such as "are these consistent" or "check this flow" mean this.
  - **Best pick** (`agents/picker.md`): which version does the job best. Requests such as "which is best", "pick one", "compare v1 and v2", or "before and after" mean this. The old before-and-after compare is now the best pick with two images.
- **When the request does not say which**, ask the person one question that names the two: "Do you want a consistency check of the set, or a pick of the best version?" When the caller is another agent and no person can be asked, the caller must name the mode. If it did not, stop and reply with this one line, and do not guess: `Two or more images need a mode: "consistency check" or "best pick".`
- **Several images to critique with neither check**: call this skill once per image, each time with one image. Contact-sheet mode always adds the last agent.
- **At most twelve images.** The contact sheet holds twelve; with more, split the set or ask the person which twelve.
- **Cost.** Contact-sheet mode starts two Opus agents and one Sonnet agent per image, plus one Opus agent for the last step: five images start eleven Opus agents.

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

   If the person gives a page or a URL, run `scripts/measure.mjs` on it to get a facts file. Pass no viewport flag, so it renders its four default viewports, or the flags that pick the viewports the person asked for (`--desktop`, `--phone`, `--tablet`, `--widescreen`, `--width N`). Add `--dark` only when the person asks about dark mode, the theme, or both modes. With `--dark`, the script writes a `<name>-dark` entry and `<name>-dark.png` for each viewport only when the page has a dark mode, and `dark_mode.found_by` in `facts.json` says how it found it, or `none`. If it exits with code 4, Playwright or its Chromium is missing: show the person the install commands from its `cannot measure:` line, ask whether to install them, and never install without their yes. On no, critique the image alone and say so.

   With a facts file, the critic gets every screenshot it lists in one crit. Put the absolute path of each viewport's `screenshot` on the `Image(s)` line, in the order of the facts file viewports, so each `<name>-dark.png` comes right after its light twin.

   When you have a measured facts file for the page in the image (`facts.json` from `scripts/measure.mjs`), add this line right after the `Image(s)` line, with the path filled:

   ```
   Measured facts file: <absolute path of facts.json>
   ```

   When the `Image(s)` line names two or more viewports, add this line right after the `Measured facts file:` line, with the viewport names in the same order as the images:

   ```
   Viewports, in image order: <names, such as desktop, phone, tablet, widescreen>
   ```

3. Add the section "Where it could go further" with a second agent, which reads the image and the finished crit and writes only that section. Pick the work folder: the folder that holds `facts.json` when there is one, else the image's folder. Save the critique there as `crit.md`, exactly as the agent wrote it, with the Write tool. Then spawn one agent with the Agent tool: `subagent_type: "general-purpose"`, `model: "opus"`, with this prompt and the placeholders filled:

   ```
   Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better.

   Read <skill folder>/agents/go-further.md and follow it. The skill folder is <skill folder>; every path in go-further.md is relative to it.

   Image(s): <absolute paths, as in step 2>
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
   Image(s): <absolute paths, as in step 2>
   Measured facts file: <absolute path of facts.json>
   Write in: <absolute path of the work folder>

   When the work order is done, end with its absolute path as your final message. If you were spawned as a teammate, also call SendMessage to the agent that spawned you with that path.
   ```

   Tell the user the path of `work-order.json`. A work order is for one page, with all its viewports, so in contact-sheet mode each page gets its own.

## Contact-sheet mode

Use this mode for two or more images, once you know the mode from "Pick the mode". The person gets one crit and one work order per image, and then one consistency check or one best pick.

1. For each image, run "Run it" steps 1, 2, 3, and 5 with that one image (for a page with a facts file, all of its viewports), so each crit has its "Where it could go further" section and its work order: spawn all the critics in one message so they run at the same time, use the usual prompt, and when each crit is done, write its work order in its own work folder (the folder that holds that image's `facts.json`, else a new folder per image in the system temp folder, so no two work orders share a folder).
2. At the same time, make the contact sheet. Run `node <skill folder>/scripts/contact-sheet.mjs <image paths in order> --out <new folder in the system temp folder>`, with one image per page: for a page with a facts file, its first screenshot, which is `desktop.png` unless the viewport flags left desktop out. Use the same images on the `Images, in tile order` line below. It writes `sheet.png` and `tiles.json` in that folder. Then spawn one agent with the Agent tool: `subagent_type: "general-purpose"`, `model: "opus"`, with this prompt and the placeholders filled. `<agent file>` is `set-critic.md` for the consistency check and `picker.md` for the best pick.

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

   When the person gave the pages themselves (a URL or an HTML file for each) and `scripts/measure.mjs` ran on each, also run `node <skill folder>/scripts/compare-facts.mjs <facts.json of each page, in tile order> --out <folder>/differences.json`. It writes the differences across pages in measured numbers (content left edge, text width, type sizes, text colors). Add this line to the prompt right after the `Images, in tile order` line, with the path filled. When there are no pages, or it exits with a usage error, leave the line out.

   ```
   Measured differences file: <absolute path of differences.json>
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
- `scripts/compare-facts.mjs`: compares the facts files of the pages of one set and writes the measured differences across pages (FR-84), checked by `schemas/facts-diff.schema.json`.
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
