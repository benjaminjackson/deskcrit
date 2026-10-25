# deskcrit plugin for Claude Code

This plugin gives Claude Code the `crit-loop` skill. The skill tells a coding agent how to check its UI work with `crit`: take a screenshot, run `crit report`, fix the top findings, take a new screenshot, run `crit compare` and `crit gate`, and stop when the gate passes or two rounds in a row improve nothing. The plugin only runs the CLI. `crit` decides every verdict and threshold. The rules are in [docs/PRD.md](../docs/PRD.md).

`crit` does not take screenshots. The agent takes them with its own browser tool or with Playwright.

## Install

1. Install Node.js 22 or later.
2. Make the `crit` command available. Until the `deskcrit` package is published to npm, build it from a clone of this repository:

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

7. Run `/plugin` and check that the `crit-loop` skill is listed.
8. In the root of your project, set `screenshot` in `.crit.yaml` to the path where the agent keeps its latest screenshot:

   ```yaml
   screenshot: screenshots/latest.png
   ```
