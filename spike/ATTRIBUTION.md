# Attribution for the M-1 spike images

This file records where `spike/screenshot.png` and `spike/slice.png` come from and why the repository may hold them. The PRD rules for fixture images (FR-54) apply here by analogy, because the repository is public and MIT licensed.

## spike/screenshot.png

- Source URL: https://www.eia.gov/energyexplained/electricity/electricity-in-the-us.php
- Page title: "Electricity in the U.S. - U.S. Energy Information Administration (EIA)". The page heading is "Electricity explained: Electricity in the United States".
- Publisher: U.S. Energy Information Administration (EIA), an agency of the U.S. Department of Energy.
- Capture date: 2026-10-23T22:24:09Z (UTC).
- Viewport: 1280 x 720 CSS px, full page. The full page is 1280 x 3899 CSS px.
- Device scale factor: 2.
- Browser: Playwright 1.55.0, device profile "Desktop Chrome HiDPI", Chromium build 1187, `--version` output "Chromium 140.0.7339.16". The capture waited 8 seconds after load so that the two JavaScript charts could render.
- Raw capture: 2560 x 7798 px PNG.
- Prepared file: 515 x 1568 px PNG, 385109 bytes.
- Scale factor: 1568 / 7798 = 0.201 of the raw capture, which is 0.402 output px per CSS px.
- Padded: no. The short side is 515 px, which is not under 280 px.
- Preparation: ImageMagick 7 (`magick`) read the raw capture, applied the stored orientation, removed the alpha channel, resized it with the Lanczos filter so that the long side is 1568 px, removed all metadata profiles and comments, and wrote a PNG with no date or time chunks. ImageMagick still writes its private orientation chunk (orNT), so a short Python script then copied the file keeping only the IHDR, IDAT, and IEND chunks. The pixels did not change. This follows FR-8 by hand, because the prepare stage does not exist yet.
- Rights basis: public domain, with the source named above. The page is a work of the U.S. federal government and is not subject to copyright under 17 U.S.C. 105. EIA states on its reuse page that its publications are in the public domain and that its data, reports, graphs, and charts may be used and distributed: https://www.eia.gov/about/copyrights_reuse.php
- Third-party content: the page shows no third-party licensed images. Its charts and its infographic are EIA work. The small X and Facebook share icons are trademarks shown as part of the page, not licensed images.
- People and data: the page shows no face of a real person, no personal data, and no logged-in state. No cookie banner was shown.

## spike/slice.png

This slice shows part of the same page at full size. In the whole-page screenshot, body text is about 6 px high, which is too small to judge, because TypeSafe limits each side to 1568 px (decided 2026-10-24 by Benjamin Jackson, crit-oj5.6).

- Source URL: https://www.eia.gov/energyexplained/electricity/electricity-in-the-us.php (the same page as `spike/screenshot.png`).
- Capture date: 2026-10-24T04:18:42Z (UTC), from the modification time of the raw capture file.
- Viewport: 1280 x 720 CSS px, full page. The full page is 1280 x 3899 CSS px.
- Device scale factor: 1. No device profile was used.
- Browser: Playwright 1.55.0, Chromium build 1187. The capture waited 8 seconds after load so that the two JavaScript charts could render.
- Raw capture: 1280 x 3899 px PNG.
- Crop rectangle: x 0, y 520, width 1280, height 1520 CSS px. At scale 1 these are also pixels, so the slice holds page rows 520 to 2040. It shows article text with links, the infographic, one section heading, the 1950 to 2025 chart, and the sidebar.
- Prepared file: 1280 x 1520 px PNG, 377445 bytes, sha256 52706f8e83dfae39541f9bffea11ff765849ff8ade6f297d39e6b40d3f6c63c8.
- Resized: no. The long side is 1520 px, which is not over 1568 px (FR-8).
- Padded: no. The short side is 1280 px, which is not under 280 px.
- Preparation: ImageMagick 7 (`magick`) cropped the raw capture, removed the alpha channel, and removed all metadata (`-alpha off -strip`). A short Python script then copied the file keeping only the IHDR, IDAT, and IEND chunks. The pixels did not change after the crop.
- Rights basis, third-party content, people and data: the same as for `spike/screenshot.png` above. The page is a work of the U.S. federal government and is in the public domain under 17 U.S.C. 105.

## spike/page-overview.png

- Source: `spike/screenshot.png`, made by `node spike/overview.ts make-image` (crit-zs9).
- Preparation: sharp 0.35.5 resized the screenshot to 410 x 1248 px and drew a 4 px red outline around rows 166 to 653, which are CSS rows 520 to 2040, the rows that `spike/slice.png` holds. The size keeps the slice and the overview together under the TypeSafe area limit of 2,458,624 px.
- Rights basis, third-party content, people and data: the same as for `spike/screenshot.png` above.
