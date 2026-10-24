# packs/

This folder holds the source of the first-party packs (PRD FR-53) and the tool that renders their fixture images (PRD OQ-17). A folder whose name starts with `_` is not a pack: `_renderer/` is the renderer and `_example/` is a worked example. Tools that list packs skip these folders.

## Rendering fixtures

The renderer is a development tool. It has its own `package.json` here, with Playwright pinned to an exact version. The `deskcrit` package never installs or bundles it, so `crit` has no browser dependency (NFR-3, NG-1).

Run these from the repository root. The first two commands are needed once per machine. `setup` downloads the Chromium build that the pinned Playwright uses into Playwright's per-user cache.

```
npm --prefix packs ci
npm --prefix packs run setup
npm --prefix packs run render -- <pack>   # writes the PNGs and fixtures/rendered.json, prints ATTRIBUTION.md entries
npm --prefix packs run check -- <pack>    # renders again and compares bytes with the committed PNGs
npm --prefix packs run verify -- <pack>   # no browser: checks the PNG and source hashes in rendered.json
```

`check` is valid only on the browser build that `rendered.json` records, because another machine draws slightly different pixels. CI never renders. The fixture tests read the committed PNGs.

## Writing a noul question

A `noul` question asks whether the defect is present, so `true` always means the defect is there and `false` means it is not. Write "Is the heading not clearly larger than the body text?" and not "Is the heading clearly larger than the body text?". Then `distribution.true` in the JSON and "Defect probability" in the readable report read the same way for every criterion, with no lookup of the question. Set `fail_when` and `warn_when` to a high probability of `true`, and `pass_when` to a low one. Reason: a reader or agent should not have to open the pack to know which way 0.97 points. Reconsider when a criterion cannot be phrased as a defect. The rule is in `docs/PRD.md` section 7.8 (`question.criteria`).

## Templates

Each criterion has one template, `packs/<pack>/templates/<criterion-id>.html`, with an optional stylesheet `<criterion-id>.css` next to it. The renderer opens it twice, with `?defect=on` and with `?defect=off`, and writes:

- `packs/<pack>/fixtures/<criterion-id>.positive.png` from `defect=on`. The criterion must fire on it.
- `packs/<pack>/fixtures/<criterion-id>.negative.png` from `defect=off`. The criterion must stay quiet on it.

A first-party criterion needs 5 positive and 5 negative fixtures (FR-54). The first pair comes from `<criterion-id>.html`. The other four pairs come from `<criterion-id>--2.html` to `<criterion-id>--5.html`, which the renderer treats as templates of their own and which write `<criterion-id>--2.positive.png` and so on. Each one is a different design, not a copy.

A template loads `../../_renderer/base.js` first in `<head>`, then `../../_renderer/base.css`. `base.js` copies the switch to `<html data-defect="on">` or `"off"`. Draw the defect only in rules under `[data-defect="on"]`, so the two images differ only in the defect. To see either side, open the template in a browser with the query string.

Charts use inline SVG in the same template, and the same switch reaches SVG elements:

```html
<svg width="560" height="240" viewBox="0 0 560 240">
  <rect class="chart-bar" x="70" y="60" width="90" height="140" />
  <text class="chart-label" x="115" y="225" text-anchor="middle">North</text>
</svg>
```

```css
.chart-label { fill: var(--color-text); }
[data-defect="on"] .chart-label { fill: #c4c9cf; }
```

`_example/templates/example-contrast.html` shows the whole pattern.

Rules for every template:

- The page is 1280x800 at device scale factor 1. Both sides are inside the 280 to 1568 pixel image limit (FR-7), so prepare sends the image without resizing it. Do not make content taller than the page.
- Use only fonts from `_renderer/fonts/`. Each font there has its license file and an open license. The renderer refuses any request that is not a file in the repository, including WebSockets and files elsewhere on the disk such as system fonts. It fails if a declared font does not load, or if any text is drawn with a font installed on the machine.
- The shipped faces are Inter 300, 400 and 700 (@fontsource/inter 5.3.0), Source Serif 4 400 and 700 (@fontsource/source-serif-4 5.3.1), and Pacifico 400, a script face (@fontsource/pacifico 5.3.0). All are SIL Open Font License 1.1 and each has its `OFL-*.txt` next to the files. Adding a font changes every `rendered.json` source hash, so re-render every pack after you add one.
- Use invented text only. Show no face of a real person, no personal data, and no logged-in state (FR-54). Do not put text in the design that praises or condemns it (NFR-12).
- The render fails if a PNG is over 2 MB, and names the file (FR-54).

## The ATTRIBUTION.md entry format

Each pack has `fixtures/ATTRIBUTION.md`. It starts with a line `Pack license: <license>`, which the renderer reads. It then has one entry per fixture image, written exactly like this, with the labels in this order:

```
## <fixture file name>

- Rights basis: <one of the four strings below>
- Source: <for a rendered template: packs/<pack>/templates/<criterion-id>.html, defect=on|off>
- License: <license of the image>
- Attribution text: <text the license requires, or none>
- Source URL: <URL, or not applicable>
- Capture date: <YYYY-MM-DD, or not applicable>
- Viewport: <width>x<height>
- Device scale factor: <number>
- Browser version: <version>
```

The rights basis is exactly one of these four strings, from FR-54:

- `own work licensed under the pack license`
- `public domain with the source named`
- `open license that permits redistribution and commercial use`
- `written permission from the owner attached to the pull request`

For the open-license basis, the attribution text is required. For the other three, write `none`.

A fixture captured from a live page must fill in Source URL, Capture date, Viewport, Device scale factor, and Browser version (FR-54). For a rendered template, Source URL and Capture date are `not applicable`, and `render` prints the entry with the rest filled in.
