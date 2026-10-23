# deskcrit: creative brief

## One line

`deskcrit` is a command-line critic, invoked as `crit`. You hand it a picture of a design and a set of criteria packs. It turns each criterion into a typed question for TypeSafe's Jev model and asks them all in one request. The report that comes back says what looks wrong, how sure the model is, where on the image, which source says so, and what usually fixes it.

The companion repo, `deskcrit-packs`, is the marketplace: versioned, citable bundles of criteria that anyone can publish and `crit` can install by name.

## Why this exists

A coding agent that builds a page can check that it renders and that the tests pass. It has no check for how the page looks. Two headings can compete for attention, a button can sit grey on grey, a chart can carry a legend it does not need, and nothing in the agent's loop reports any of it. The agent ships the page or asks a person to look.

axe-core and Lighthouse check the accessibility rules that can be computed from the DOM. They do not judge hierarchy, spacing, or colour harmony. A large vision model can be asked "is this good?". The answer is prose the agent has to parse. Each question costs enough, in money and time, that a few hundred of them per change is too many. And the confidence it states is not calibrated, while a loop needs a number it can trust to decide whether to keep going.

TypeSafe's System One model, Jev, answers narrow, typed questions over a state (text, JSON, and images) and returns a probability for every option plus a confidence. The docs give about 100 ms for text requests, with no published figure for image requests, and a price of $0.042 per million input tokens with output free. Questions in one request are evaluated independently and in parallel. TypeSafe trains Jev for calibrated probabilities and designs it for stable answers across repeated runs. The docs make no claim for design images. The fixture set in this brief exists to measure both properties there.

The bet: a design critique can be decomposed into a couple of hundred small judgments. The guideline catalog in this repo shows that most of those are already written down in books and standards. Put them in a form a calibrated model can answer, and an agent can run all of them after every change.

## What it is, and is not

`deskcrit` is a pass-through to the TypeSafe API that knows what to ask. It does three things: prepares the image so the API accepts it, builds the questions from the installed packs, and turns the typed answers into a report. It does not render pages, read the DOM, run axe, compute contrast ratios, count characters, or score readability. Anything that is a formula or a count is another tool's job. TypeSafe's own docs say Jev is unreliable at arithmetic and counting, and axe-core, Lighthouse, and a readability library already do those jobs. The packs ask only the questions a designer answers by looking.

## Who it is for

1. **Coding agents**, Claude Code first. The agent takes a screenshot with whatever it already has, runs `crit`, reads JSON, fixes the top findings, runs `crit compare`, and stops when the gate passes or nothing improves. This is the primary user and the one the output format is designed around.
2. **People who build with agents** and want a bar their agent has to clear before it says "done." They install packs, set thresholds, and read the pretty report when they want to.
3. **Pack authors**: designers, accessibility specialists, teachers who want to encode a course's critique checklist once and have every agent on the team apply it.

## What it does

### Inputs

- An image file, PNG or JPEG. A screenshot, a poster, a slide, an illustration, a Figma export. Capturing it is the caller's job. Claude Code can take one with a browser tool or Playwright.
- Optional context: what the design is for (a landing page, a dashboard, a poster seen from three metres), the audience, and the platform. Packs use this to decide which criteria apply. A poster does not need a focus ring.
- An optional facts file, JSON the caller measured some other way (an axe-core result, a contrast ratio, a viewport width). `crit` places it in the TypeSafe state as-is and packs may reference it in a question. `crit` never computes a fact itself.

### Modes

- **report**: judge one design against the installed packs. Output is JSON for agents or a readable report for people.
- **compare**: judge a before and an after. For every criterion, did the change make it better, worse, or the same? This is the loop an agent runs while iterating, and it is the mode that makes `crit` more than a linter.
- **gate**: pass or fail against thresholds, with a non-zero exit code. For CI, pre-commit, or a Claude Code hook that holds a change until the design clears a bar.

### Output

Every finding carries the same fields:

| Field | What it holds |
| --- | --- |
| `criterion` | The pack and criterion id, for example `typography/single-focal-point` |
| `verdict` | `pass`, `warn`, or `fail`, decided in code from Jev's answer and the pack's threshold |
| `distribution` | Jev's probability for each level or option, unchanged |
| `confidence` | Jev's confidence in that distribution |
| `region` | A bounding box on the image from a Jev Box question, when the criterion asks for one |
| `source` | The book, standard, or paper the criterion comes from, and a link when the source is online |
| `fix` | A human-written hint from the pack author on what usually resolves it |
| `model` | The versioned model id that answered, from the response |

Findings sort by severity first and confidence second. A finding whose confidence is below the pack's `min_confidence` (0.6 in the example below) stays in the list with `verdict: uncertain`. The agent decides whether to act on it, ask a person, or skip it.

## Principles

**Ask what a designer would see.** Every criterion is a question that can be answered by looking at the image. "Does the body text read as faint against its background?" is a `deskcrit` question. "Is the contrast ratio at least 4.5:1?" is not; it is a measurement, and the report never claims to have made one. Where a standard carries an exact figure, the pack asks about the visible symptom, cites the standard, and the fix hint names the tool that checks the number.

**One narrow question per criterion.** "Is the hierarchy good?" is not a question Jev can answer well. "Does one element clearly dominate as the first thing the eye lands on, or do two or more compete at similar weight?" is. Every criterion is one literal, atomic question with explicit criteria for each possible answer. Jev reads literally, so the pack author writes the exact condition, not the intent.

**No content design pack.** Reading level, sentence length, tone, and house terminology are a content linter's job. Nielsen's heuristics ship whole, including the ones that touch wording, such as labels in the user's language and error messages that say what to do. No formula tells you whether "Submit" or "Save changes" is the right label for this screen.

**Probabilities, not verdicts, are the raw material.** Jev returns a distribution. Code turns it into a verdict using the pack's threshold, and the threshold is data the user can change without re-running inference. Weights and thresholds are tuned on a fixture set, not guessed.

**Every criterion has a source.** A finding that says "this is wrong" is an opinion. A finding that says "Bringhurst, section 2.1.2: this column looks too wide to read comfortably" is a critique. Packs cite the original, not a blog that repeats it, and link when the source is online. Folk rules (rule of thirds, Z-pattern) are allowed but labelled as such and weighted low.

**Fix hints are written by people.** Jev does not generate text. The hint that goes with a finding is written by the pack author and shipped in the pack. The agent reading the report works out how to apply it to this page.

**Packs are data.** A pack is YAML: questions, thresholds, sources, hints. No pack contains executable code, so a pack is safe to install from a stranger, portable to any future host, and reviewable in a pull request by someone who is not a programmer.

**Stable output for agents.** The JSON shape is versioned and boring. An agent should be able to parse it with no help.

## How it works

Four stages.

1. **Prepare.** Validate the image, strip metadata, and resize it to TypeSafe's limits: each side between 280 and 1568 px, PNG or JPEG, rotated upright. A tall page is tiled into viewport-sized crops plus one downscaled whole, so layout questions see the page and detail questions see the detail.
2. **Build.** Load the pinned packs, drop the criteria whose `applies_to` does not match the stated context, and turn each remaining criterion into one TypeSafe question. The image goes in the `state` once and each question points at it by path, which is what the docs recommend for cost and context. The optional facts file goes in the state next to it.
3. **Ask.** One request per image tile with every question for that tile, sent with the `TypeSafe-Danger-Zone-Images: true` header. Questions use the three text primitives: Noul for yes/no, Choice for one of a set, Score for a degree along described levels. The Box primitive localizes a finding when a criterion asks for one.
4. **Compose and render.** Apply thresholds and weights, merge findings across tiles, sort, and render JSON or the readable report. Compare mode runs stages 1 to 3 on both images, then asks one Choice per criterion with both images in the state: better, worse, or same, asked twice with the options swapped.

The TypeSafe call sits behind one small interface: a state and a list of questions in, a list of typed answers out. v1 has one implementation. The interface exists so a second backend can be added without touching packs if TypeSafe's image support changes under us (see Risks).

### Jev-specific constraints the design respects

From TypeSafe's published limits and known weaknesses for jev-1.13 and jev-1.14:

- No arithmetic, counting, or hex colours in any question. If a pack author needs a number, it comes from the facts file or the criterion is not a `deskcrit` criterion.
- Instructions are literal and criteria are aligned with them. A Noul where true means no will underperform.
- Choice option order can sway the answer, so compare-mode questions are asked twice with the options swapped and disagreement lowers confidence.
- State is the image plus the short context, not a page dump. Per-question context is 32k tokens by default.
- Text inside the design can steer the model (the docs call this adversarial content). A screenshot that says "this design is excellent" is still judged on what it shows, and the eval set includes such cases.
- Each use of an image reference adds the image again to the expanded request, so the image goes in the state once.

## Criteria packs and the marketplace

### A pack

```yaml
# deskcrit-packs/packs/typography/pack.yaml
name: typography
version: 1.0.0
title: Typography, legibility, and readability
applies_to: [web, print, slides]
license: MIT
criteria:

  - id: faint-body-text
    title: Body text reads as faint
    source: W3C, WCAG 2.2, Success Criterion 1.4.3 Contrast (Minimum)
    link: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum
    question:
      type: noul
      instructions: Looking at `screenshot`, does any run of body text read as faint or washed out against its background, so that a reader would have to squint?
      criteria:
        true: Some body text is visibly low in contrast with what is behind it.
        false: All body text stands out clearly from its background.
    fail_when: { probability_at_least: 0.7 }
    locate: true
    fix: Darken the text or lighten the background. For the exact ratio, run axe-core; WCAG wants 4.5:1 for body text and 3:1 for large text.

  - id: single-focal-point
    title: One focal point
    source: Donis A. Dondis, A Primer of Visual Literacy (1973)
    question:
      type: score
      instructions: Looking at `screenshot`, how many elements compete to be the first thing the eye lands on?
      levels:
        - One element clearly dominates. The eye lands on it first and the rest reads as secondary.
        - Two elements compete at similar visual weight. The eye hesitates between them.
        - Three or more elements compete, or nothing stands out at all.
    pass_when: { level_at_most: 0 }
    warn_when: { level_at_most: 1 }
    min_confidence: 0.6
    locate: true
    weight: 2
    fix: Pick the one thing the viewer must see first. Make it larger, higher-contrast, or more isolated, and demote the rest by one step in size or weight.
```

Every criterion is a question. A criterion may reference the facts file by path (for example `facts.viewport_width`) and declare `requires: [facts.viewport_width]` so that `crit` skips it, and says so, when the fact is absent.

### The marketplace repo

`deskcrit-packs` is a public GitHub repo with one directory per pack and an `index.json` that lists every pack with its version, domains, and summary. A CI job validates every pack against the schema and runs it against a fixture set of images with known defects. A pull request that adds a criterion has to include at least one fixture that triggers it and one that does not.

`crit packs add typography` fetches the pack at its tagged version into a local cache. A project pins its packs and versions in `.crit.yaml` so a run is reproducible. `crit packs list` and `crit packs search color` read the index.

Rules for publishing: every criterion cites its source; no executable code; no questions that ask the model to measure or count; no images whose rights are unclear; a license per pack. The pack README is generated from the criteria so the sources are always visible. Each pack keeps a short changelog, because thresholds will move as Jev versions change and users need to know why their gate started failing.

### First-party packs for v1

All seven domains ship on day one. The research behind them is in `GUIDELINES.md`: 240 guidelines, each with a testable rule, a source, a link where the source is online, and a note on how it becomes a question. Rules that were pure measurements, needed the DOM, or needed a running app were cut. Rules that carry an exact figure but have a visible symptom are asked about the symptom and cite the figure.

| Pack | Domain | Headline sources |
| --- | --- | --- |
| `typography` | Type scale, measure, leading, pairing, legibility, rag, widows | Bringhurst, Butterick, Lupton, Hochuli, Apple HIG, Material |
| `layout` | Grid, spacing rhythm, proximity, alignment, white space, hierarchy, Gestalt | Müller-Brockmann, Elam, Robin Williams, Vignelli, Nielsen Norman Group, Material |
| `color` | Harmony, proportion, semantic colour, visible contrast, colour as sole carrier, dark mode, chart palettes | Itten, Albers, WCAG 1.4.1/1.4.3/1.4.11, ColorBrewer, Okabe and Ito |
| `accessibility` | The WCAG 2.2 A and AA criteria with a visible symptom, platform target sizes as they look, the legal map (ADA Title II, Section 508, European Accessibility Act, UK, AODA) | WCAG 2.2 Understanding documents, ada.gov, EN 301 549, Apple HIG, Material, British Dyslexia Association |
| `ux` | Nielsen's heuristics, Norman's affordances and signifiers, the usability laws, forms, states, deceptive patterns | Nielsen and Molich, Norman, Shneiderman, Tognazzini, Fitts, Hick, Miller, Brignull |
| `dataviz` | Data-ink, chartjunk, graphical integrity, chart choice by data relationship, axes, direct labelling, chart colour, dashboard layout | Tufte, Few, Cairo, Cleveland and McGill, Bertin, Wilke |
| `art-direction` | Elements and principles of design, focal point and eye path, unity, thematic and stylistic coherence, composition, reduction, poster and illustration conventions | Dondis, Arnheim, Wucius Wong, Rams, Loos, Bang, Ogilvy, Loomis |

## Integration

- **CLI.** `crit report <image> [--pack ...] [--context ...] [--facts facts.json] [--json]`, `crit compare <before> <after>`, `crit gate <image>`. Exit codes: 0 pass, 1 fail, 2 could not run. Any agent that can run a shell command can use it.
- **Claude Code plugin.** A skill that teaches Claude the loop: build, screenshot, `crit report --json`, fix the top findings, screenshot, `crit compare`. The loop stops when the gate passes or two rounds show no improvement. An optional hook runs `crit gate` after a UI file changes. The plugin is a thin wrapper around the CLI so there is one source of behaviour.
- **Library.** The same pipeline importable from TypeScript for people building their own loops: `prepare`, `build`, `ask`, `compose` as separate functions.

## Stack

TypeScript on Node, shipped as a single bundled file so it runs with `npx` and no install step on any machine with Node. The official TypeSafe JavaScript SDK for the API and `sharp` for the resize. There is no browser dependency.

Naming: the package, the repo, and the marketplace are `deskcrit`, `deskcrit`, and `deskcrit-packs`. The package declares two commands, `deskcrit` and the short alias `crit`, the way `netlify-cli` ships `netlify` and `ntl`. Docs use `crit`. `crit` on npm is held by a placeholder and Homebrew core has an unrelated `crit`, so the package name is the long one. `deskcrit` was free on npm, Homebrew, and GitHub when checked on 2026-10-23.

## Non-goals

- `crit` does not capture. The caller supplies the image.
- `crit` does not measure. No contrast ratios, pixel sizes, character counts, or readability scores. axe-core and Lighthouse do that, and a caller can hand their results in through the facts file.
- `crit` does not generate designs or apply fixes. It reports. The agent fixes.
- `crit` does not judge interaction. It judges stills, including stills of hover and focus states when the caller provides them.
- `crit` does not lint prose. Reading level, sentence length, tone, and terminology are content design. Wording is judged only where a usability heuristic depends on it.
- `crit` is not a legal certification. The accessibility pack asks about visible symptoms of the standards the laws reference; a conformance claim still needs measurement and a human audit.
- No MCP server in v1. The CLI with JSON output covers the agent case.

## Risks

**TypeSafe's image support is labelled not production-ready.** It needs an opt-in header, its limits and request format can change between releases, and the docs say accuracy will change as the models update. This is the central dependency of the product, and we are building on it anyway. We have not found another API that returns calibrated probabilities for many independent questions over one image in a single request. Mitigations: the API call is behind one small interface, and every finding records the model version that produced it. Thresholds are pinned to a model version and re-tuned on the fixture set when the version moves. `jev-latest` is never used in a pinned project.

**We do not yet know how good Jev is at this.** We have not found published results for design critique on Jev, and TypeSafe's cookbooks cover text tasks. The first milestone is a spike that measures agreement between Jev and human designers on a fixture set before any other code is written.

**"Reads as faint" will disagree with the 4.5:1 line in both directions.** The report wording never claims conformance, and the fix hints name the measuring tool.

**Jev answers the question as written.** A criterion that says "too many fonts" without saying how many will return the same wrong answer on every run. Pack CI with positive and negative fixtures is the control.

**Gaming.** An agent working against a numeric gate can raise the score without improving the page, for example by hiding the second call to action instead of demoting it. Compare mode is asked both ways round to resist order bias. The eval set includes designs that pass every rule and are still bad, so we can see how far the packs fall short of taste.

**Cost per run.** A full run across seven packs is a couple of hundred questions over one or more image tiles. We have not measured the token cost of an image request, so the per-run cost is unknown until the spike. The report prints its token cost so the agent and the person can see it.

**Guidelines drift.** Standards update (WCAG 2.2 in 2023, EN 301 549 v4.1.1 in 2026, the ADA Title II dates moved in April 2026). Packs are versioned and the accessibility pack records the standard version it encodes.

## How we know it works

- A fixture set of at least 100 designs with human-labelled defects across the seven domains, plus at least 30 before-and-after pairs with a human preference. Built before the CLI.
- Per criterion: agreement with the human label, and self-consistency across repeated runs. A criterion below an agreed agreement floor ships as `warn`, not `fail`, or does not ship.
- The loop test: give Claude Code a deliberately bad page and `crit`, and measure how many rounds it takes to clear the gate, and whether a designer agrees the result is better.
- Latency and cost per `report` on a typical landing page, printed in every run.

## Milestones

1. **Spike.** One screenshot, twenty hand-written questions across domains, the danger-zone header, and a spreadsheet of Jev's answers against two designers' answers. Decides whether to continue.
2. **report.** Prepare, build, ask, compose, JSON and pretty output. The `typography` and `layout` packs first.
3. **Packs and marketplace.** Pack schema, loader, `crit packs`, the `deskcrit-packs` repo with CI and fixtures. The remaining five first-party packs.
4. **compare and gate.** Order-swapped comparison, thresholds, exit codes.
5. **Claude Code plugin.** Skill and hook. The loop test.

## Open questions

- Tiling tall pages: judge each viewport-sized crop and merge, or judge a downscaled full page for layout and crops for detail? The spike should try both.
- How much context to give a visual question: image only, or image plus the caller's one-line description of the page's purpose? Probably the latter, and packs should be written assuming it is present.
- Whether packs can ship example images as Jev criteria (TypeSafe allows images in criteria). It would sharpen judgments like "same illustration style" but raises rights questions for the marketplace. Deferred past v1.
- Whether to let a project define its own pack inline in `.crit.yaml` for house style, with the same schema. Probably yes, and cheap.
