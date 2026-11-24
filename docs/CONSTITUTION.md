# deskcrit coding standards

Every change to this repository follows these standards. `docs/PRD.md` governs them: if this file and the PRD disagree, the PRD wins and the disagreement is a defect to report. `CLAUDE.md` holds the Phoenix rules, and this file does not restate them. Biome and `tsc` enforce what they can, and this file covers only what they cannot check.

Each rule has an ID (CS-n) that a reviewer can cite, and a reason. A rule that has a real condition that would make it wrong also has a review trigger. Owner: Benjamin Jackson. To change a rule, open a pull request that edits this file and gives the reason.

## Toolchain

CS-1. TypeScript with `strict`, `noUncheckedIndexedAccess`, and `verbatimModuleSyntax`, as ESM with `module` and `moduleResolution` set to `NodeNext`.
Why: `noUncheckedIndexedAccess` gives `list[i]` the type "T or undefined", which catches the off-by-one reads that strict mode alone allows.
Revisit when: a flag blocks a correct pattern more than twice and the only workaround is a cast.

CS-2. Vitest runs the tests, and Biome lints and formats. Turn on Biome's rules against default exports and barrel files. Changed 2026-11-24 (crit-mk9.3): esbuild and the bundled file were removed with the `crit` command, and so was the exception for `src/index.ts`.
Why: these are the approved tools. Named exports keep grep and rename reliable.
Revisit when: one of these tools cannot do a job the PRD requires.

CS-3. Use a maintained library before you write your own code for a solved problem, such as JSON Schema validation, argument parsing, or YAML parsing. Pin every dependency to an exact version. Changed 2026-11-24 (crit-mk9.3): before, the rule named `sharp` and the TypeSafe SDK; the SDK was removed with Jev.
Why: hand-written copies of solved problems are code that someone must review and keep correct. A new `sharp` or libvips version can change the output bytes of the crop and render scripts.
Revisit when: a pinned library promises stable output across minor versions.

CS-4. Parse YAML with the YAML 1.2 core schema. Allow no custom tags, and reject duplicate keys.
Why: NFR-13 forbids custom tags. YAML 1.1 reads `no` and `off` as `false`, which would corrupt pack text without an error.

## Module layout

CS-5. Removed 2026-11-24 (crit-mk9.3): the `src/` folders of the `crit` command were deleted with it. The repository layout is the list in `CLAUDE.md`.

CS-6. Removed 2026-11-24 (crit-mk9.3): it bound the I/O of the `crit` stages, which were deleted.

## Types

CS-7. Data from outside the program (YAML, JSON files, child process output, argv) enters as `unknown` and becomes a typed value in exactly one checking function, which rejects bad input. Use no `as` cast except `as const` or inside that checking function.
Why: after one check at the boundary, code inside the program can rely on the types. The compiler does not verify a cast, so a wrong cast fails only at run time.

CS-8. Values with a fixed set of kinds, such as a judge answer or a verdict, are unions of string literals or discriminated unions keyed on `type`, with the same names as the wire format.
Why: a union matches the JSON exactly and needs no translation.

CS-9. Every `switch` on a union ends with a `default` branch that assigns the value to a variable of type `never` and throws.
Why: when someone adds a new question type, the compiler then points at every place that must handle it.

CS-10. Types that mirror a wire format (pack YAML, the facts file, the work order, and saved runs) use the wire field names exactly, including snake_case. All other names are camelCase.
Why: with the same names there is no mapping layer, and grep finds one name in the PRD, the schema, and the code.

## Functions and style

CS-11. Write plain exported functions, and no classes except where a rule here names one. Changed 2026-11-24 (crit-mk9.3): before, it named `CouldNotRunError` and the adapters, which were removed with the `crit` command.
Why: there is no shared mutable state to hold, and `throw` needs an `Error` for a stack trace.
Revisit when: state must really persist across calls inside one run.

CS-12. One statement per line. Do not nest ternaries. Use a `for...of` loop instead of `reduce`. Each `map` or `filter` call does one step, and a chain of more than two array methods becomes a loop.
Why: the reviewer reads TypeScript as a second language, and a loop reads the same in every language.
Revisit when: the reviewer asks for denser code.

CS-13. Names are full words from the PRD vocabulary: `criterion`, not `crit` or `c`. Function names start with a verb, for example `readVerdictValue` or `sortFindings`.
Why: when the code uses the PRD's words, a reader can search the PRD and the code for the same name.

CS-14. Every function has a `/** */` comment of one or two sentences. The comment says what the function does and why, and names the PRD IDs it implements. Comment each TypeScript idiom that a non-expert would not know, such as `never`, `satisfies`, `??`, or a type guard, the first time it appears in a file.
Why: the reviewer can check the function against its PRD row without decoding it, and the next regeneration can find the rule.

CS-15. Put each provisional value in one named constant. Its comment cites the PRD ID, and says "provisional" when the PRD does. Changed 2026-11-24 (crit-mk9.3): before, the examples were values of the `crit` command.
Why: when the real number is set, there is one line to change and one grep to find it.

## Errors and exit codes

CS-16. Removed 2026-11-24 (crit-mk9.3): it named `CouldNotRunError` of the `crit` command.

CS-17. Removed 2026-11-24 (crit-mk9.3): it named `src/cli/main.ts` of the `crit` command.

## Determinism and secrets

CS-18. Removed 2026-11-24 (crit-mk9.3): it bound the `crit` stages.

CS-19. Never read, print, or log an API key or a request header, and never put one in a saved run or an error message. Changed 2026-11-24 (crit-mk9.3): before, it named `TYPESAFE_API_KEY` and the TypeSafe adapter, which were removed with Jev.
Why: people paste output into issues and agent transcripts.

CS-20. Removed 2026-11-24 (crit-mk9.3): it bound the TypeSafe request.

## Tests

CS-21. Durable tests live in `evals/`. `npm run ci` asks no model: an evaluation that asks one runs only when a person starts it, and its replay reads saved runs. Changed 2026-11-24 (crit-mk9.3): before, it named the `crit` bundle and `npm run test:live`, which were removed with Jev.
Why: AC-6 requires durable tests that survive a rewrite in another language. CI and agents must not spend money, or fail because no model is available.
Revisit when: a model call becomes cheap enough to run on every pull request.

CS-22. Unit tests sit next to their module as `name.test.ts` and use plain values. The only fake is a stub function in place of a child process that asks a model. Changed 2026-11-24 (crit-mk9.3): before, the only fake was the stub adapter of the `crit` command.
Why: unit tests are disposable (PRD 12.1), and a fake of anything else tests the fake.

## Pull requests

CS-23. Each pull request implements one beads ticket. Do not mix a refactor with a behavior change.
Why: many agents work in parallel, and a reviewer can only keep up if each pull request has one purpose.

CS-24. The body of each commit has a line `Ticket: <beads id>` and a line `PRD: <IDs>` (OQ-14).
Why: a reader can walk from a line of code to the ticket and then to the requirement.

CS-25. The first line of the pull request description says whether the change touches the slow layer: the pack schema or `schemas/`. The description then says, for each PRD ID, what you checked and how. Changed 2026-11-24 (crit-mk9.3): before, the list also named CLI flags, the JSON shape, exit codes, `.crit.yaml`, and the package exports of the `crit` command, which were removed with it.
Why: slow-layer changes need a person to look, and code that runs is not proof that it matches the PRD.

## Spelling

CS-26. Use US spelling in code, identifiers, criterion ids, questions, titles, fix hints, messages, documents, and comments, for example color, center, gray, behavior, and license (PRD NFR-15). The exceptions are: visible page text in fixture templates, because it is rendered into frozen, labeled PNGs and a change would change the PNG bytes; third-party names, such as the `@img/colour` package in `package-lock.json`; URLs; quoted titles, such as Gerstner's *Designing Programmes*, and word-for-word quotations, including the text of questions asked in the past; the disposable `spike/` folders; and saved runs, such as answers files, record files, and asked-question lists. A spelling change to a scored question follows PRD R-4. Changed 2026-10-25 by Benjamin Jackson (crit-q25.24): before, no rule set the spelling.
Why: agents and users search for one spelling, and one spelling keeps ids predictable.
Revisit when: a scored fixture set is rendered again for another reason, so its page text can change too.
