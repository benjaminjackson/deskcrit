# EV-10 loop test

This folder holds what the EV-10 loop test needs: a deliberately bad page, the `.crit.yaml` for the run, a screenshot script, and the record template. In the loop test, Claude Code with `crit` and the deskcrit plugin works on the bad page until `crit gate` passes or the skill's stop rule ends the run (FR-66, FR-67). The rules are in `docs/PRD.md` EV-10, R-5, FR-66, FR-67, and M-5. This README does not restate them.

Benjamin Jackson runs the test and writes the verdict. An agent never writes the verdict (R-5).

## What is here

- `bad-page/index.html` and `bad-page/styles.css`: a one-screen landing page for Quillfern, an invented invoicing product. The project wrote it, so the rights are clean (FR-54, OQ-17). It has no build step. At 1280 x 800 px the whole page fits in one screenshot, so FR-73 does not refuse it. Its defects are plain mistakes that a coding agent often makes, picked from the criteria text of the `basics`, `typography`, `layout`, and `ux` packs and from `GUIDELINES.md`. The list of defects is in `RESULT.md`, so the agent in the run does not see it. Do not copy `RESULT.md` into the scratch folder.
- `.crit.yaml`: the packs, the pinned model, and the `screenshot` path for the run.
- `screenshot.mjs`: takes one 1280 x 800 px screenshot of an HTML file with the Playwright that `packs/` pins. Use it for the before and after pictures, so that both are taken the same way and not by the agent.
- `RESULT.md`: the record of the run. Fill it in after the run.

## Run the test

1. In the deskcrit repository, install the tools once:

   ```sh
   npm --prefix packs ci
   npm --prefix packs run setup
   ```

2. Make a scratch folder outside the repository and copy the page and the settings into it. Do not copy `README.md`, `RESULT.md`, or `screenshot.mjs`:

   ```sh
   mkdir -p ~/scratch/crit-loop-test
   cp -R evals/loop-test/bad-page/. ~/scratch/crit-loop-test/
   cp evals/loop-test/.crit.yaml ~/scratch/crit-loop-test/
   ```

3. Make the scratch folder a git repository and commit the starting page, so the agent's edits show as a diff:

   ```sh
   git -C ~/scratch/crit-loop-test init
   git -C ~/scratch/crit-loop-test add -A
   git -C ~/scratch/crit-loop-test commit -m "Starting page for the EV-10 loop test"
   git -C ~/scratch/crit-loop-test tag start
   ```

4. Take the before screenshot from the repository root:

   ```sh
   node evals/loop-test/screenshot.mjs ~/scratch/crit-loop-test/index.html ~/scratch/before.png
   ```

5. Install the `crit` command and the plugin as `plugin/README.md` says. Before the repository is pushed, you can load the plugin from the local folder instead of the marketplace: start Claude Code in step 7 with `claude --plugin-dir /Users/ben/github/crit/plugin`. Write down the commit SHA of the clone you built `crit` from and of the plugin folder you loaded. `RESULT.md` asks for both.
6. Set the key in the shell where you start Claude Code. Do not write it in any file:

   ```sh
   export TYPESAFE_API_KEY=...
   ```

7. Start Claude Code in the scratch folder, in a fresh session. Run `/plugin` and check that the `crit-loop` skill is listed.
8. Paste this starting prompt, word for word, and then do not say anything else to the agent until it stops. Do not edit the page by hand during the run, because a hand edit makes the run invalid. If the agent asks a question, answer only "Use your judgment."

   ```
   Improve the design of the web page in this folder (index.html and styles.css). Use the crit-loop skill. When you stop, tell me why you stopped.
   ```

9. When the agent stops, save the session transcript with `/export` to a file in the scratch folder.
10. Take the after screenshot the same way as the before screenshot:

    ```sh
    node evals/loop-test/screenshot.mjs ~/scratch/crit-loop-test/index.html ~/scratch/after.png
    ```

## Judge the result

1. Before you read any `crit` output or the transcript, look at `before.png` and `after.png` side by side.
2. Decide whether the after page is better, the same, or worse, and write your verdict and one or two sentences of reasoning in `RESULT.md`.
3. Only then read the transcript and the `crit` output, and fill in the other fields of `RESULT.md`. If the gate passed but you judged the page not better, `RESULT.md` names that as the R-5 review trigger. Open a follow-up ticket for it.

## Commit the run

Put these files in `evals/loop-test/runs/<date>/`, with the date as YYYY-MM-DD:

- `before.png` and `after.png` from steps 4 and 10.
- `final-page/`: `index.html` and `styles.css` from the scratch folder at the end of the run.
- `page.diff`: the output of `git -C ~/scratch/crit-loop-test diff start`, which shows every change since the starting commit, also when the agent made commits of its own.
- `transcript-summary.md`: the agent's stop message, and for each round the fix it made and the `summary` of `crit compare` and the counts of `crit gate`, copied from the exported transcript. Before you commit it, check that it holds no key and no request header (CS-19).

Then fill in `RESULT.md` and commit it with the run folder. Do not run the loop test in CI or in `npm run test:live` (CS-21).
