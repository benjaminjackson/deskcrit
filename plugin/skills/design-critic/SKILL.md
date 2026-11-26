---
name: design-critic
description: Critiques still images of a design (a screenshot, mockup, poster, slide, chart, or illustration) as a senior design director would, backed by about 210 guidelines from an approved reading list (Bringhurst, Müller-Brockmann, Tufte, WCAG, Nielsen) and 38 signs of an AI-made template from unslop. One image gets a crit. Two to twelve images get a crit each plus one check the request names: a consistency check of the set ("are these consistent") or a best pick ("which is best"). An agent names one, except a deck or flow: consistency check. A brief sharpens the crit: job, audience, setting, message, brand and tone, what is fixed, how finished, feedback wanted, and for the first five, what it is not. Use when the user or main thread wants a design critiqued, reviewed, or judged, asks "how does this look", "crit this", "what's wrong with this design", wants feedback on a screenshot before shipping, wants screens checked for consistency, or wants the best of several versions picked. Critiques only; it edits no files.
---

# Design critic

This skill runs a critic agent on one image, or on the screenshots of one page at several viewports. The agent walks a checklist of guidelines, goes deep on anything that fails with the guideline's sources and approved fixes, then writes a ranked crit.

## Pick the mode

Count the images first. The count picks the mode, and nothing else does. The screenshots that one `facts.json` lists, one per viewport, count as one image: they are one page, so they get one normal crit and never start contact-sheet mode.

- **One image: a normal crit.** Follow "Run it". The person gets one crit and one work order.
- **Two or more images: contact-sheet mode, always.** Follow "Contact-sheet mode". Each image gets its own normal crit and work order, and then one last agent reads all the images on one contact sheet. That last agent does one of two jobs, and the request picks which:
  - **Consistency check** (`agents/set-critic.md`): does the set hold together as one product, and which image breaks a pattern the others keep. Requests such as "are these consistent" or "check this flow" mean this.
  - **Best pick** (`agents/picker.md`): which version does the job best. Requests such as "which is best", "pick one", "compare v1 and v2", or "before and after" mean this. The old before-and-after compare is now the best pick with two images.
- **Slides of one deck or screens of one flow, with no mode named: the consistency check.** When the request says the images are slides of one deck (a deck, slides, a presentation) or screens of one flow (the steps of one task in one product), run the consistency check and ask no question, for a person and for an agent caller alike. Slides of one deck and screens of one flow are screens of one product, never versions of one design.
- **For any other set, when the request does not say which**, or when the images could be versions of one design, or when you cannot tell which kind of set you have, ask the person one question that names the two: "Do you want a consistency check of the set, or a pick of the best version?" When the caller is another agent and no person can be asked, the caller must name the mode. If it did not, stop and reply with this one line, and do not guess: `Two or more images need a mode: "consistency check" or "best pick".`
- **Several images to critique with neither check**: call this skill once per image, each time with one image. Contact-sheet mode always adds the last agent.
- **At most twelve images.** The contact sheet holds twelve; with more, split the set or ask the person which twelve.
- **Cost.** Contact-sheet mode starts two Opus agents and one Sonnet agent per image, plus one Opus agent for the last step: five images start eleven Opus agents.

## Run it

1. Collect the inputs: the absolute path of each image, and whatever you know about the piece's purpose, audience, and medium. Do not ask the user for context they did not give, except the facts that step 5 asks for; the critic states its own assumption.

   When the caller gives a brief, in the request or in a brief file it names, turn it into a Brief block (FR-87 in `docs/PRD.md` of the deskcrit repository). Read a brief file with the Read tool; if the file does not exist, stop and reply with one line: `brief file <path> does not exist`. The brief has eight fields. Fields 1 to 6 describe the piece, and fields 7 and 8 describe the crit:

   1. **Job**: the outcome. What the piece must get the viewer to do, and what success looks like. What the viewer must understand goes in Message. **Job, not**: outcomes it is not after.
   2. **Audience**: the people. Who looks at it, what they already know, the language they read, what they care about or doubt, and any access needs, such as low vision. **Audience, not**: who it is not for.
   3. **Setting**: the circumstances of viewing. How people get to it (a search result, an email link, a wall in a station), the medium, the device or size, the viewing distance, and whether it gets a glance or a long read. **Setting, not**: where and how it is never seen.
   4. **Message**: the meaning. What the viewer must take away, in order of importance, as ideas that can be said in more than one way. **Message, not**: what it must not suggest.
   5. **Brand and tone**: the feel. The voice, the personality, and the look, plus reference work, all as direction a designer can interpret. **Brand and tone, not**: the feel it must avoid and the work it must not look like.
   6. **Fixed**: every concrete element or value whose exact form is required, and every hard limit: exact text that must appear, the logo and its use, brand colors and typefaces, the design system's components, technical limits, a required standard such as a WCAG level, and layout decisions already made. A "must not" limit is a Fixed entry too. It has no "not" line.
   7. **Stage**: how finished the piece is: a sketch, a working draft, or near final. One value, with no "not" line.
   8. **Ask**: the scope of this crit. What feedback is wanted, and what is out of scope for now; out of scope is its "not" half, written on the Ask line. Ask holds any focus the caller asked for.

   Put each item the caller gave in exactly one field. Apply these rules in this order, and use the first that fits:

   1. An item about the crit and not the piece (what to look at, what to skip this time) goes in Ask.
   2. An item about how finished the piece is goes in Stage.
   3. An item whose exact form is required, or that is a hard limit, goes in Fixed. Test: if the item can be met in only one way, it is Fixed; if it can be met in many ways, it goes in one of fields 1 to 5. "Show the line 'Capital at risk'" is Fixed, and "make clear the money can be lost" is Message.
   4. Any other item goes in the field whose subject it names: an outcome in Job, people in Audience, circumstances of viewing in Setting, meaning in Message, and feel in Brand and tone.
   5. A negative item goes in the "not" line of the field that rule 4 picks, unless rule 1 or rule 3 picks a field first.

   "Never on a phone" is Setting, not; "skip the phone layout for now" is Ask. "Many readers are over 70" is Audience; "must meet WCAG 2.2 AA" is Fixed.

   Write the block in this form, one line per field given, in the order of the list above, with each `<Label>, not:` line right after its field's line. Leave out every field the caller did not give, and never ask for one. A caller can give a "not" half without its field.

   ```
   Brief:
   <Label>: <text>
   <Label>, not: <text>
   ```

   A project can also keep a project brief, the file `.deskcrit/brief.md` in the working directory (FR-88). Before you write the block, read that exact path with the Read tool, never by listing or searching a folder, and never give the path to an agent: agents get its lines only inside the Brief block. With no `.deskcrit/brief.md`, everything in this step holds as written. Its lines are field lines of the block, one `<Label>: <text>` line per field, with an optional first line `Brief:`, in any order, and each line's text stays in the field its label names. Skip a blank line and a line that starts with `#`. When any other line's label is not one of the eight labels above or the five `<Label>, not` labels, such as `Fixed, not`, `Stage, not`, or `Ask, not`, or when a label comes twice, stop and reply with one line that names the file and the line: `.deskcrit/brief.md: unknown or repeated label: <the line>`. When the project brief gives lines, sort every item of the request into field lines first, by the five rules above, also a note or a focus the caller gave without calling it a brief (a focus goes in Ask), because the Brief block takes the place of the note and focus lines of step 2. Then merge the two by label line, so `Job` and `Job, not` are two labels: when the caller's brief and the project brief both give a label, the caller's text wins and the project line is left out; a label that only one of them gives is kept. This holds for Fixed too; when the caller's Fixed line drops the project's Fixed line, name each Fixed entry it dropped to the person in one line of your reply. Write the block from the merged lines as above, also when only the project brief gives lines. In contact-sheet mode, read the file once for the whole set. This skill never writes `.deskcrit/brief.md`.

   When the caller gave, as a path in the request, the real thing that the piece mocks, such as a product screen, a report, or an app, pass that path to the critic on a `Real thing:` line, as step 2 says. Do not open it, check it, or list its folder; the critic opens it. Never search the disk for the real thing, and never ask the user for one: with none given, the critic says what it could not check.
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

   With a brief from step 1, put the Brief block in place of the `What I know about the piece:` line, and leave out the focus line, because Ask holds it. With no brief, use the prompt exactly as shown.

   When step 1 has a real thing, add one line `Real thing: <absolute path>` for each path, as the last lines before `You critique only.`, with or without a brief.

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

   With a brief from step 1, add the Brief block right after the `Image(s)` line. With no brief, use the prompt exactly as shown.

   Join the section into the crit exactly as the agent wrote it, as its own paragraph right after "What's working": before "Couldn't judge from a still" when the crit has it, else before "Checklist". Write the joined crit over `crit.md`.

4. Give the critique to the user, joined with the section. Do not soften or trim it. Add your own comment only if the user asked for it.

5. Write the work order, the JSON a coding agent acts on (schema: `schemas/work-order.schema.json` in the deskcrit repository). Use the `crit.md` of step 3; the work-order agent leaves the items of "Where it could go further" out. Before you spawn any work-order agent, wait until every crit that runs together is done: the one crit of this run, every image's crit in contact-sheet mode, or every slide's crit or recheck of a fix-loop round, and the set critic's crit when the run has one, because the set critic may request a fact for a thin-screen break. Then find every finding in those crits that requests a fact: search each `crit.md` for `Fact needed from the maker:` (`agents/critic.md` says when a finding writes it). Leave out each fact that the caller says was asked for before and not given. When at least one is left and a person can answer, ask for every requested fact in one question, in one message, with the items numbered, each with its finding; never ask one at a time, so in contact-sheet mode you ask one question for all the images together. Add each answer to the Brief block by the sorting rules of step 1, making the block when there was no brief, and give every work-order agent of those crits that Brief block; in the fix loop the answers go into `brief.md` instead, as the crit-loop skill says, and the Brief block is its current text. When no finding requests a fact, ask nothing. When no person can answer, such as when another agent called the skill, ask nothing and write the work order as it is. Ask for choices the same way: search each `crit.md` for `Choice needed from the maker:` (`agents/critic.md` step 7 says when a taste finding writes it), leave out each choice that the caller says was asked for before, and put every choice that is left in the same question as the facts, numbered with them, each with its finding and its numbered options, so the person can answer each one by number or by name. Add each answer to the Brief block as a fact answer goes: an answer that keeps the element as it is goes on the Fixed line, and an answer that gives a direction goes in the field that the sorting rules of step 1 pick. When no finding requests a fact or offers a choice, ask nothing. With no person to answer, the work-order agent uses option 1 of each choice. Then spawn one agent with the Agent tool: `subagent_type: "general-purpose"`, `model: "sonnet"`, with this prompt, the placeholders filled, and the facts line only when the critic had that file:

   ```
   Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better.

   Read <skill folder>/agents/work-order.md and follow it. The skill folder is <skill folder>; every path in work-order.md is relative to it.

   Crit file: <absolute path of crit.md>
   Image(s): <absolute paths, as in step 2>
   Measured facts file: <absolute path of facts.json>
   Write in: <absolute path of the work folder>

   When the work order is done, end with its absolute path as your final message. If you were spawned as a teammate, also call SendMessage to the agent that spawned you with that path.
   ```

   With a brief from step 1, add the Brief block right after the `Image(s)` line. When the crit had `Real thing:` lines, add the same lines, one per path, as the last lines before `When the work order is done`, with or without a brief, as step 2 places them before `You critique only.`. With no brief and no real thing, use the prompt exactly as shown.

   Tell the user the path of `work-order.json`. A work order is for one page, with all its viewports, so in contact-sheet mode each page gets its own.

## Contact-sheet mode

Use this mode for two or more images, once you know the mode from "Pick the mode". The person gets one crit and one work order per image, and then one consistency check or one best pick.

1. For each image, run "Run it" steps 1, 2, 3, and 5 with that one image (for a page with a facts file, all of its viewports), so each crit has its "Where it could go further" section and its work order: spawn all the critics in one message so they run at the same time, use the usual prompt, and when every crit is done, ask for the requested facts as step 5 says, then write each work order in its own work folder (the folder that holds that image's `facts.json`, else a new folder per image in the system temp folder, so no two work orders share a folder).
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

   With a brief from step 1, put the Brief block in place of the `What I know about the piece:` line. One brief covers the whole set, so every per-image crit of step 1 and this agent get the same block, with one exception: a set check in Ask, such as "which is best" or "are these consistent", goes only to this agent. Leave it out of the Ask line that each single-image critic gets, because that critic sees one image. With no brief, use the prompt exactly as shown.

   When the person gave the pages themselves (a URL or an HTML file for each) and `scripts/measure.mjs` ran on each, also run `node <skill folder>/scripts/compare-facts.mjs <facts.json of each page, in tile order> --out <folder>/differences.json`, and add `--viewport <name>` with the viewport whose screenshot the tiles show when it is not desktop, such as `--viewport widescreen` for slides captured with `--widescreen`. It writes the differences across pages in measured numbers (content left edge, text width, type sizes, text colors). Add this line to the prompt right after the `Images, in tile order` line, with the path filled. When there are no pages, or it exits with a usage error, leave the line out.

   ```
   Measured differences file: <absolute path of differences.json>
   ```

   The consistency check and the best pick get no work order; the crit-loop skill has the work-order agent write one from the consistency check of a deck.
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
