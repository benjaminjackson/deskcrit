# Conventions for the _tells templates

These rules apply to every template in `packs/_tells/templates/` (crit-7hw.2, FR-54, FR-86, EV-23). `packs/README.md` holds the general template rules; this file adds the rules for this folder.

## Files

- Each tell has one template: `templates/<slug>.html`, `templates/<slug>.css`, and `templates/<slug>.defect.json`. The slug is the `template` value of the tell in `packs/_tells/tells.json`. Do not add `--2` variants.
- The `.defect.json` has `"range": null` and lists every computed property that differs between the two sides, for example `{ "properties": ["text-transform", "letter-spacing"], "range": null }`.
- Commit only files in `templates/`. Do not commit PNGs, `fixtures/rendered.json`, or entries in `fixtures/ATTRIBUTION.md`. The integrator renders all templates once.

## Bases

- Start from one of the four bases in this folder: `landing-light` (a light landing page with a split hero), `landing-dark` (a long dark landing page, 1280 x 1400 px, with its own brand color and Source Serif 4 headings), `dashboard` (an analytics dashboard with a sidebar, a stats strip, a line chart, a bar chart, and a table), or `app-screen` (a billing settings screen with a list, form controls, and a table).
- Copy the base HTML into `templates/<slug>.html`, and change its stylesheet link to `<slug>.css`. Copy the base CSS into `templates/<slug>.css`. Do not link a shared stylesheet. Reason: the renderer hashes only the template, its stylesheet with the same name, and the files in `_renderer/`, so a change to a shared stylesheet would not show in `rendered.json`.
- Do not edit `packs/_renderer/base.css` or `base.js`. Every pack's `rendered.json` hashes them.
- Give each page its own invented product name and its own text. Change the name and the text of the base you copy.
- The bases are free of all 38 tells. The negative side of a template must stay free of all 38 tells, not only the one it plants.

## Fonts

`base.css` declares Inter 300, 400, and 700, Source Serif 4 400 and 700, and Pacifico 400. Each base declares Inter 500 in its own CSS. To use another face from `packs/_renderer/fonts/`, add its `@font-face` rule to the template's own CSS, with a path relative to the template:

```css
@font-face {
  font-family: "Inter";
  font-style: normal;
  font-weight: 800; /* or 900; for italic, font-style: italic and weight 400 */
  font-display: block;
  src: url("../../_renderer/fonts/inter-latin-800-normal.woff2") format("woff2");
}

@font-face {
  font-family: "Noto Color Emoji";
  font-style: normal;
  font-weight: 400;
  font-display: block;
  src: url("../../_renderer/fonts/noto-color-emoji-subset-400-normal.woff2") format("woff2");
}
```

Put `"Noto Color Emoji"` in the `font-family` list of each element that shows an emoji. The emoji font covers U+2600 to U+27BF, U+2B00 to U+2BFF, U+1F300 to U+1F5FF, U+1F680 to U+1F6FF, and U+1F900 to U+1F9FF. The render fails when an emoji is outside these ranges, because the browser then uses an emoji font installed on the machine.

## The defect switch

- Draw the tell only with style rules under `[data-defect="on"]`.
- An element that only the positive side shows is in the DOM on both sides. Hide it with `display: none` on the negative side.
- A text change is two spans, one for each side, each shown or hidden with `display`. The two sides must have the same text and the same attributes, so do not change text content or attributes.
- An SVG shape keeps the same `d` on both sides. Change only its style.
- The negative side applies the fix that the rule of the tell names in GUIDELINES.md. It is not only the positive side with the tell removed.

## Content

- Show no faces, no stock photos, no personal data, and no logged-in state of a real service.
- Put no text in the design that praises or condemns the design (NFR-12).
- Do not run the design-critic or crit-loop skill on a template, and do not ask any model to judge it. Reason: a fixture changed after the critic sees it is tuned to the critic (FR-54 rule 1).
