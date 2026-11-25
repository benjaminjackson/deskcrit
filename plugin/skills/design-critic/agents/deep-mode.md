# Deep mode

These are the steps for the main thread, in place of step 2 of `SKILL.md`, when the caller asks for the deep mode. The deep mode is for one image. It runs one section critic per checklist section and then a director, so it costs about nine agent runs instead of one. `<skill folder>` is the base directory Claude Code gave when it loaded this skill.

1. Make a new empty folder in the system temp folder for the section reports.
2. Spawn one agent per section, all at once, for the sections `whole`, `hierarchy`, `arrangement`, `text`, `color`, `pictures`, `data`, and `interface`, in that order. Each is an Agent tool call with `subagent_type: "general-purpose"` and `model: "opus"`, with this prompt and the placeholders filled. A section critic whose section does not apply to the image says so in its report; spawn all eight.

   ```
   Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better.

   Read <skill folder>/agents/section-critic.md and follow it. The skill folder is <skill folder>; every path in section-critic.md is relative to it.

   Image: <absolute path of the image>
   Section: <section>
   What I know about the piece: <purpose, audience, medium, or "nothing">

   You critique only. Do not edit, move, or create any file except crops in a temporary folder.
   When the report is done, end with the full report as your final message. If you were spawned as a teammate, also call SendMessage to the agent that spawned you with the full report.
   ```

   When you have a measured facts file, add the line `Measured facts file: <absolute path of facts.json>` right after the `Image` line, as in step 2 of `SKILL.md`.

   With a brief from step 1 of `SKILL.md`, put its Brief block in place of the `What I know about the piece:` line. With no brief, use the prompt exactly as shown.

3. Save each section critic's final message, exactly as it wrote it, with the Write tool as `section-<section>.md` in the folder from step 1.
4. Spawn the director: one Agent tool call with `subagent_type: "general-purpose"` and `model: "opus"`, with this prompt and the placeholders filled. List the eight report paths in the order of step 2, separated by `, `. Add the facts line after the `Image` line when you have a facts file, as in step 2.

   ```
   Time matters here: do not spend time that can be avoided, and the earlier a correct result is obtained, the better.

   Read <skill folder>/agents/director.md and follow it. The skill folder is <skill folder>; every path in director.md is relative to it.

   Image: <absolute path of the image>
   Section reports: <absolute paths of the section reports>
   What I know about the piece: <purpose, audience, medium, or "nothing">

   You critique only. Do not edit, move, or create any file except crops in a temporary folder.
   When the critique is done, end with the full critique as your final message. If you were spawned as a teammate, also call SendMessage to the agent that spawned you with the full critique.
   ```

   With a brief, put the same Brief block in place of the `What I know about the piece:` line, as in step 2. With no brief, use the prompt exactly as shown.

5. The director's final message is the crit. Go on with step 3 of `SKILL.md`.
