# Attribution for the M-1 spike screenshot

This file records where `spike/screenshot.png` comes from and why the repository may hold it. The PRD rules for fixture images (FR-54) apply here by analogy, because the repository is public and MIT licensed.

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
