# deskcrit coding standards

Every change to this repository follows these standards. `docs/PRD.md` governs them: if this file and the PRD disagree, the PRD wins and the disagreement is a defect to report. `CLAUDE.md` holds the Phoenix rules, and this file does not restate them. Biome and `tsc` enforce what they can, and this file covers only what they cannot check.

Each rule has an ID (CS-n) that a reviewer can cite, and a reason. A rule that has a real condition that would make it wrong also has a review trigger. Owner: Benjamin Jackson. To change a rule, open a pull request that edits this file and gives the reason.

## Toolchain

CS-1. TypeScript with `strict`, `noUncheckedIndexedAccess`, and `verbatimModuleSyntax`, as ESM with `module` and `moduleResolution` set to `NodeNext`.
Why: `noUncheckedIndexedAccess` gives `list[i]` the type "T or undefined", which catches the off-by-one reads that strict mode alone allows.
Revisit when: a flag blocks a correct pattern more than twice and the only workaround is a cast.

CS-2. Vitest runs the tests, esbuild builds the single bundled file (NFR-2), and Biome lints and formats. Turn on Biome's rules against default exports and barrel files. The one exception is `src/index.ts`, the package entry that FR-63 requires, which re-exports the stage functions.
Why: these are the approved tools. Named exports keep grep and rename reliable.
Revisit when: one of these tools cannot do a job the PRD requires.

CS-3. Use a maintained library before you write your own code for a solved problem, such as JSON Schema validation, argument parsing, or YAML parsing. Pin `sharp` and the TypeSafe SDK to exact versions.
Why: hand-written copies of solved problems are code that someone must review and keep correct. A new `sharp` or libvips version can change the output bytes and break FR-10, and the image API can change between SDK releases (JC-7).
Revisit when: either pinned library promises stable output across minor versions.

CS-4. Parse YAML with the YAML 1.2 core schema. Allow no custom tags, and reject duplicate keys.
Why: NFR-13 forbids custom tags. YAML 1.1 reads `no` and `off` as `false`, which would corrupt pack text without an error.

## Module layout

CS-5. The source folders are:

    src/shared/          the types that pass between stages, and CouldNotRunError
    src/prepare/         image bytes in, prepared image out
    src/build/           parsed packs, prepared image, context, and facts in; state, questions, and skipped out
    src/ask/             ask(), the adapter type, and the stub adapter (FR-20, FR-64)
    src/ask/typesafe/    the one real adapter, and the only code that imports the SDK (AC-8)
    src/compose/         answers in, report out; also compare and gate over finished reports
    src/packs/           parse and validate one pack's YAML text against schemas/pack.schema.json
    src/cli/             argument parsing, every file read and write, environment reads, renderers, exit codes

Why: each folder maps to one PRD section, so a person can delete the folder and regenerate it from that section (AC-1, AC-3).
Revisit when: a folder fails the ten-minute test in AC-3. Then split it, and update this list and `CLAUDE.md` in the same pull request.

CS-6. Only `src/cli/` touches the file system, the environment, `process`, stdout, or stderr. Only `src/ask/typesafe/` touches the network. Every other folder receives values and returns new values, and never changes its arguments. A stage imports only `src/shared/` and its own folder, never another stage's folder.
Why: AC-1 and AC-7. A stage with no I/O can be tested with plain values and rewritten without mocks, and a stage that imports another stage cannot be deleted alone.
Revisit when: a stage needs data that the CLI cannot read for it beforehand.

## Types

CS-7. Data from outside the program (YAML, JSON files, SDK responses, argv) enters as `unknown` and becomes a typed value in exactly one checking function, which rejects bad input. Use no `as` cast except `as const` or inside that checking function.
Why: after one check at the boundary, code inside the program can rely on the types. The compiler does not verify a cast, so a wrong cast fails only at run time.

CS-8. Question types, predicates, verdicts, and changes are unions of string literals or discriminated unions keyed on `type`, with the same names as the wire format.
Why: a union matches the JSON exactly and needs no translation.

CS-9. Every `switch` on a union ends with a `default` branch that assigns the value to a variable of type `never` and throws.
Why: when someone adds a new question type, the compiler then points at every place that must handle it.

CS-10. Types that mirror a wire format (pack YAML, the report, compare, and gate JSON, `.crit.yaml`, and the answers file) use the wire field names exactly, including snake_case. All other names are camelCase.
Why: with the same names there is no mapping layer, and grep finds one name in the PRD, the schema, and the code.

## Functions and style

CS-11. Write plain exported functions. The only class is `CouldNotRunError`, which extends `Error`. Adapters are plain objects that match the adapter type.
Why: there is no shared mutable state to hold, and `throw` needs an `Error` for a stack trace.
Revisit when: state must really persist across calls inside one run.

CS-12. One statement per line. Do not nest ternaries. Use a `for...of` loop instead of `reduce`. Each `map` or `filter` call does one step, and a chain of more than two array methods becomes a loop.
Why: the reviewer reads TypeScript as a second language, and a loop reads the same in every language.
Revisit when: the reviewer asks for denser code.

CS-13. Names are full words from the PRD vocabulary: `criterion`, not `crit` or `c`. Function names start with a verb, for example `readVerdictValue` or `sortFindings`.
Why: when the code uses the PRD's words, a reader can search the PRD and the code for the same name.

CS-14. Every function has a `/** */` comment of one or two sentences. The comment says what the function does and why, and names the PRD IDs it implements. Comment each TypeScript idiom that a non-expert would not know, such as `never`, `satisfies`, `??`, or a type guard, the first time it appears in a file.
Why: the reviewer can check the function against its PRD row without decoding it, and the next regeneration can find the rule.

CS-15. Put each provisional value, such as the default `min_confidence` (OQ-10), the compare thresholds (FR-36), or the default model id (FR-22), in one named constant. Its comment cites the PRD ID, and says "provisional" when the PRD does.
Why: when M-1 sets the real numbers, there is one line to change and one grep to find it.

## Errors and exit codes

CS-16. Bad input, an unreadable file, a TypeSafe error, and a context over the limit each throw `CouldNotRunError` with a message that names the input (FR-4, FR-24, NFR-11). A broken internal invariant throws a plain `Error`.
Why: one error type for "the run could not happen" maps to exit code 2, and a plain `Error` marks a bug.
Revisit when: a caller must tell two "could not run" causes apart. Then add a field to `CouldNotRunError` instead of a second error class.

CS-17. Only `src/cli/main.ts` sets the exit code. It sets `process.exitCode` and never calls `process.exit()`. It writes stdout once, at the end of the run.
Why: one place keeps FR-43 true, and writing once means a failed run never leaves a partial report (FR-24). `process.exit()` can cut off piped stdout before Node flushes it.
Revisit when: a command must stream output.

## Determinism and secrets

CS-18. In `prepare`, `build`, `compose`, and `packs`, do not use `Date`, `Math.random`, environment variables, locale functions such as `localeCompare`, or unsorted lists of files. Sort with an explicit comparator. Compose passes distributions through without rounding, and only the readable renderer rounds.
Why: NFR-5 and FR-10 require identical output for identical input, and EV-1 compares the output.

CS-19. The CLI reads the API key from `TYPESAFE_API_KEY` and passes it to the adapter. Never put the key, the request headers, or a raw SDK error into a message, a log, or the answers file. The adapter rethrows a `CouldNotRunError` with the HTTP status and a short reason only (NFR-14).
Why: people paste output into issues and agent transcripts, and SDK errors often repeat the request headers.

CS-20. The adapter builds its request in a pure function that adds the danger-zone header, the pinned model id, and each image once (FR-15, FR-19, FR-22).
Why: these are the rules most likely to break, and a pure function lets a unit test check them with no key and no network.
Revisit when: the SDK hides the request shape so that it cannot be built separately.

## Tests

CS-21. Durable tests live in `evals/`. They run the built bundle as a child process with `--answers` and recorded answer files, and they validate every JSON output against `schemas/` (EV-1 to EV-4). Tests that call TypeSafe (EV-5, EV-6, EV-7, and live fixture runs) run only under `npm run test:live` with a key present.
Why: AC-6 requires durable tests that survive a rewrite in another language. CI and agents must not spend money, or fail because no key is present.
Revisit when: M-1 sets a cost low enough to run live tests on every pull request.

CS-22. Unit tests sit next to their module as `name.test.ts` and use plain values. The stub adapter is the only fake.
Why: unit tests are disposable (PRD 12.1), and a fake of anything else tests the fake.

## Pull requests

CS-23. Each pull request implements one beads ticket. Do not mix a refactor with a behaviour change.
Why: many agents work in parallel, and a reviewer can only keep up if each pull request has one purpose.

CS-24. The body of each commit has a line `Ticket: <beads id>` and a line `PRD: <IDs>` (OQ-14).
Why: a reader can walk from a line of code to the ticket and then to the requirement.

CS-25. The first line of the pull request description says whether the change touches the slow layer: CLI flags, the JSON shape, exit codes, the pack schema, `.crit.yaml`, or `schemas/`. Before version 1.0 the package exports (`src/index.ts` and the `exports` map in `package.json`) are not in the slow layer. A change to them is allowed, and the description says so and names the PRD note that records it (PRD AC-2). At version 1.0 they join the slow layer. The description then says, for each PRD ID, what you checked and how. Changed 2026-10-24 by Benjamin Jackson: before, the list named no package exports. Reason: the package is at version 0.0.0, and `compare` and `gate` will still change the stage types. Reconsider when: the version reaches 1.0, or an outside project depends on the library.
Why: slow-layer changes need a person to look, and code that runs is not proof that it matches the PRD.

## Spelling

CS-26. Use US spelling in code, identifiers, criterion ids, questions, titles, fix hints, messages, documents, and comments, for example color, center, gray, behavior, and license (PRD NFR-15). The exceptions are: visible page text in fixture templates, because it is rendered into frozen, labeled PNGs and a change would change the PNG bytes; third-party names, such as the `@img/colour` package in `package-lock.json`; URLs; quoted titles, such as Gerstner's *Designing Programmes*, and word-for-word quotations, including the text of questions asked in the past; the disposable `spike/` folders; and saved runs, such as answers files, record files, and asked-question lists. A spelling change to a scored question follows PRD R-4. Changed 2026-10-25 by Benjamin Jackson (crit-q25.24): before, no rule set the spelling.
Why: agents and users search for one spelling, and one spelling keeps ids predictable.
Revisit when: a scored fixture set is rendered again for another reason, so its page text can change too.
