# deskcrit plugin for Claude Code

This plugin gives Claude Code two skills. The `crit-loop` skill tells a coding agent how to check its UI work with `crit`: take a screenshot, run `crit report`, fix the top findings, take a new screenshot, run `crit compare` and `crit gate`, and stop when the gate passes or two rounds in a row improve nothing. The plugin only runs the CLI. `crit` decides every verdict and threshold. The rules are in [docs/PRD.md](../docs/PRD.md).

The `design-critic` skill critiques a still image of a design the way a senior design director would. It starts a Claude agent that walks a checklist of guidelines. It does not run `crit` and needs no TypeSafe key.

To look at a large image closely, the critic runs `scripts/crop.mjs`, which cuts a PNG into full-resolution crops about one screen tall, or crops one box, into a new temporary folder. The script uses only Node's own modules (it reads the PNG with `node:zlib`), so the installed plugin needs no install step and no image library. For a file other than a PNG of 8 or 16 bits per sample, an interlaced PNG, or a broken file, it prints one line that says why, and the critic looks at the whole image.

`crit` does not take screenshots. The agent takes them with its own browser tool or with Playwright.

## Install

1. Install Node.js 22 or later.
2. Make the `crit` command available. The repository `benjaminjackson/deskcrit` is private for now, so the clone below and `/plugin marketplace add` in step 5 need read access to it and git credentials for GitHub. Until the `deskcrit` package is published to npm, build it from a clone of this repository:

   ```sh
   git clone https://github.com/benjaminjackson/deskcrit.git
   cd deskcrit
   npm ci
   npm run build
   npm link
   ```

   When the package is published, `npx deskcrit` runs the command with no install step.
3. Check that the command runs. In the clone, this checks a bundled pack, needs no key, and prints `pack basics is valid`:

   ```sh
   crit packs validate packs/basics
   ```

4. Set your TypeSafe key in your shell, for example in your shell profile:

   ```sh
   export TYPESAFE_API_KEY=...
   ```

   `crit` reads the key only from the `TYPESAFE_API_KEY` environment variable. Do not put it in a file in your project. No file in this plugin holds a key.
5. In Claude Code, add the marketplace:

   ```
   /plugin marketplace add benjaminjackson/deskcrit
   ```

6. Install the plugin:

   ```
   /plugin install deskcrit@deskcrit
   ```

7. Run `/plugin` and check that the `crit-loop` and `design-critic` skills are listed.
8. In the root of your project, set `screenshot` in `.crit.yaml` to the path where the agent keeps its latest screenshot:

   ```yaml
   screenshot: screenshots/latest.png
   ```
