# deskcrit plugin for Claude Code

This plugin gives Claude Code two skills. The `crit-loop` skill tells a coding agent how to check its UI work: capture the page, run the design-critic skill, fix the top findings from its work order, capture again, have a fresh critic recheck each finding, and stop when no ranked finding is left or two rounds in a row close nothing. The rules are in [docs/PRD.md](../docs/PRD.md).

The `design-critic` skill critiques a still image of a design the way a senior design director would. It starts a Claude agent that walks a checklist of guidelines. It needs no API key.

To look at a large image closely, the critic runs `scripts/crop.mjs`, which cuts a PNG into full-resolution crops about one screen tall, or crops one box, into a new temporary folder. The script uses only Node's own modules (it reads the PNG with `node:zlib`), so the installed plugin needs no install step and no image library. For a file other than a PNG of 8 or 16 bits per sample, an interlaced PNG, or a broken file, it prints one line that says why, and the critic looks at the whole image.

When the page's code or URL is available, the critic can run `scripts/measure.mjs PAGE --out FOLDER`. It renders the page in light mode at 1280 x 800 px and at 390 x 844 px, and writes a full-page screenshot of each, one-screen crops of each, and `facts.json`, which `schemas/facts.schema.json` describes: per text block the font, size, line height, characters per line, and contrast, with a CSS selector and a pixel box, and per page the type sizes, text colors, spacing, left edges, and target sizes.

The script needs the `playwright` package and its Chromium, and it never installs them. An installed plugin has no `node_modules` of its own, so the script finds Playwright only in the project it runs from: it looks for `playwright` from the `package.json` in the working directory. In a deskcrit checkout it also finds the copy in `packs/`. A project with no `package.json` has no place to find it, and a project that has only `@playwright/test` does not count, because the script loads the `playwright` package itself. In either case, run `npm install playwright` and `npx playwright install chromium` in the project. Without Playwright, the script prints one line that names the install commands and exits with code 4. The skill then shows you the commands and asks before it installs anything. If you say no, the critic works from the image alone and says so. Exit code 3 means the page cannot be opened.

## Install

1. Install Node.js 22 or later.
2. In Claude Code, add the marketplace. The repository `benjaminjackson/deskcrit` is private for now, so this needs read access to it and git credentials for GitHub:

   ```
   /plugin marketplace add benjaminjackson/deskcrit
   ```

3. Install the plugin:

   ```
   /plugin install deskcrit@deskcrit
   ```

4. Run `/plugin` and check that the `crit-loop` and `design-critic` skills are listed.
