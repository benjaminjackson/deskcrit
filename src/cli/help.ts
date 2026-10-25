// The help texts of `crit --help` and `crit <command> --help` (FR-76). Help is the contract an
// agent reads, so it is plain text with no color codes and no wrapping to the terminal width, and it
// is built from fixed strings so it gives the same bytes on every run. The usage lines come from
// args.ts, the same constants that error messages end with, so help and errors cannot drift apart.
// The top-level help prints USAGE, the five lines an error prints when it does not know the command.
// It reads no file and no environment variable.

import {
  COMPARE_USAGE,
  CONTEXT_KEYS,
  GATE_USAGE,
  type HelpTopic,
  PACKS_TEST_USAGE,
  PACKS_VALIDATE_USAGE,
  REPORT_USAGE,
  USAGE,
} from "./args.js";
import { CRIT_YAML_KEYS } from "./crit-yaml.js";

/** The help of `crit --help` and `crit -h`: every command, the exit codes, output, settings, and examples (FR-76). */
const TOP_LEVEL_HELP = `crit (deskcrit) judges a picture of a design against criteria packs and reports what looks wrong.

${USAGE}
usage: crit <command> --help
usage: crit --version

Commands:
  report          Judge one image and report each finding with its verdict, confidence, region, source, and fix.
  compare         Judge a before and an after image and say whether each criterion got better, worse, or stayed the same.
  gate            Judge one image and pass or fail it against the gate policy. The exit code says which.
  packs validate  Check one pack directory against the pack schema. Reads no key and makes no network call.
  packs test      Ask Jev about each fixture image of one pack and compare each verdict with the fixture label.

Run crit <command> --help for the flags of one command, for example crit report --help.

Output:
  stdout holds only the output. Errors go to stderr.
  --json prints one JSON document. Use it when a program reads the output. Without --json, crit prints a readable report.

Exit codes:
  0  pass: the command ran. report and compare exit 0 whatever the verdicts.
  1  fail: the gate failed, the pack is invalid, or a fixture disagreed with its label.
  2  could not run: a bad command line, a file that cannot be read, no key, or a TypeSafe error.

Settings:
  .crit.yaml in the current directory holds optional settings. crit does not look in parent directories.
  Its keys are ${CRIT_YAML_KEYS.join(", ")}.
  The context keys, in .crit.yaml or with --context key=value, are ${CONTEXT_KEYS.join(", ")}.

Environment:
  TYPESAFE_API_KEY  The TypeSafe API key. report, compare, gate, and packs test need it. With --answers, no key is needed. packs validate never reads it.

Examples:
  crit report shot.png --json
    # Judge shot.png and print the report as one JSON document.
  crit compare before.png after.png --json
    # Judge the before and after images and print each change as JSON.
  crit gate shot.png --json
    # Pass or fail shot.png. Check the exit code: 0 pass, 1 fail, 2 could not run.
  crit report shot.png --pack packs/my-pack --json
    # Judge shot.png with the pack in the local directory packs/my-pack.
  crit report shot.png --context platform=web --json
    # Tell crit the design is for the web, so criteria for other platforms are skipped.
  crit report shot.png --answers shot.answers.json --json
    # Replay the answers saved with --save-answers. Needs no key and makes no network call.
  crit packs validate packs/my-pack
    # Check the pack in packs/my-pack before you use it.
`;

/** The help of `crit report --help`: its usage line, its flags, its exit codes, and examples (FR-76). */
const REPORT_HELP = `${REPORT_USAGE}

Judge one image against the criteria packs and report each finding with its verdict, confidence, region, source, and fix.

Flags:
  --pack <dir>           Use the pack in this local directory. Repeat the flag for more packs. With no --pack and no packs in .crit.yaml, crit uses every bundled pack.
  --context <key=value>  Give one piece of context: ${CONTEXT_KEYS.join(", ")}. Give each pair its own flag. A flag overrides .crit.yaml.
  --facts <file>         Read facts about the page from this JSON file. A criterion that needs a fact the file does not have is skipped.
  --json                 Print one JSON document instead of the readable report.
  --save-answers <file>  Also write the answers from TypeSafe to this file, so --answers can replay them later.
  --answers <file>       Use the answers in this file instead of asking TypeSafe. Needs no key and makes no network call.
  --help, -h             Print this help.

Exit codes:
  0  the report ran, whatever the verdicts.
  2  could not run.

Examples:
  crit report shot.png --json
    # Judge shot.png and print the report as one JSON document.
  crit report shot.png --pack packs/my-pack --json
    # Judge shot.png with the pack in the local directory packs/my-pack.
  crit report shot.png --context platform=web --context audience=developers --json
    # Give the platform and the audience, so criteria for other platforms are skipped.
  crit report shot.png --save-answers shot.answers.json --json
    # Judge shot.png and save the answers from TypeSafe in shot.answers.json.
  crit report shot.png --answers shot.answers.json --json
    # Replay the saved answers. Needs no key and makes no network call.
`;

/** The help of `crit compare --help`: its usage line, its flags, its exit codes, and examples (FR-76). */
const COMPARE_HELP = `${COMPARE_USAGE}

Judge a before and an after image with the same packs and context, and say for each criterion whether it got better, worse, stayed the same, or is uncertain.

Flags:
  --pack <dir>           Use the pack in this local directory. Repeat the flag for more packs. With no --pack and no packs in .crit.yaml, crit uses every bundled pack.
  --context <key=value>  Give one piece of context: ${CONTEXT_KEYS.join(", ")}. Give each pair its own flag. A flag overrides .crit.yaml.
  --facts <file>         Read facts about the page from this JSON file. A criterion that needs a fact the file does not have is skipped.
  --json                 Print one JSON document instead of the readable output.
  --save-answers <file>  Also write the answers of both runs to this file, so --answers can replay them later.
  --answers <file>       Use the answers of both runs in this file instead of asking TypeSafe. Needs no key and makes no network call.
  --help, -h             Print this help.

Exit codes:
  0  the compare ran, even when every change is worse.
  2  could not run.

Examples:
  crit compare before.png after.png --json
    # Judge both images and print each change as one JSON document.
  crit compare before.png after.png --pack packs/my-pack --json
    # Compare the two images with the pack in the local directory packs/my-pack.
  crit compare before.png after.png --save-answers compare.answers.json --json
    # Compare the two images and save the answers of both runs in compare.answers.json.
  crit compare before.png after.png --answers compare.answers.json --json
    # Replay the saved answers of both runs. Needs no key and makes no network call.
`;

/** The help of `crit gate --help`: its usage line, its flags, its exit codes, and examples (FR-76). */
const GATE_HELP = `${GATE_USAGE}

Judge one image and pass or fail it against the gate policy. The exit code is the result, so check it. With warn_fails_gate: true in .crit.yaml, a warning also fails the gate.

Flags:
  --pack <dir>           Use the pack in this local directory. Repeat the flag for more packs. With no --pack and no packs in .crit.yaml, crit uses every bundled pack.
  --context <key=value>  Give one piece of context: ${CONTEXT_KEYS.join(", ")}. Give each pair its own flag. A flag overrides .crit.yaml.
  --facts <file>         Read facts about the page from this JSON file. A criterion that needs a fact the file does not have is skipped.
  --json                 Print one JSON document instead of the readable output.
  --answers <file>       Use the answers in this file instead of asking TypeSafe. Needs no key and makes no network call.
  --help, -h             Print this help.

Exit codes:
  0  the gate passed.
  1  the gate failed.
  2  could not run.

Examples:
  crit gate shot.png --json
    # Pass or fail shot.png. Check the exit code: 0 pass, 1 fail, 2 could not run.
  crit gate shot.png --pack packs/my-pack --json
    # Gate shot.png with the pack in the local directory packs/my-pack.
  crit gate shot.png --answers shot.answers.json --json
    # Gate the answers saved by crit report --save-answers. Needs no key and makes no network call.
`;

/** The help of `crit packs validate --help`: its usage line, its exit codes, and an example (FR-76). */
const PACKS_VALIDATE_HELP = `${PACKS_VALIDATE_USAGE}

Check the pack.yaml in <dir> against the pack schema, and check that each fixture it names is in the directory. Reads no key and makes no network call.

Flags:
  --help, -h  Print this help.

Exit codes:
  0  the pack is valid.
  1  the pack is invalid. stderr lists each problem.
  2  could not run.

Examples:
  crit packs validate packs/my-pack
    # Check the pack in packs/my-pack.
`;

/** The help of `crit packs test --help`: its usage line, its exit codes, and an example (FR-76). */
const PACKS_TEST_HELP = `${PACKS_TEST_USAGE}

Run the checks of crit packs validate, then ask Jev about each fixture image of the pack, one request per image, and compare each verdict with the fixture label. Needs TYPESAFE_API_KEY.

Flags:
  --help, -h  Print this help.

Exit codes:
  0  every fixture agrees with its label.
  1  a fixture disagrees with its label.
  2  could not run.

Examples:
  crit packs test packs/my-pack
    # Ask Jev about each fixture of the pack in packs/my-pack.
`;

/** Return the help text of one topic, for main to write to stdout (FR-76). */
export function renderHelp(topic: HelpTopic): string {
  switch (topic) {
    case "top-level":
      return TOP_LEVEL_HELP;
    case "report":
      return REPORT_HELP;
    case "compare":
      return COMPARE_HELP;
    case "gate":
      return GATE_HELP;
    case "packs-validate":
      return PACKS_VALIDATE_HELP;
    case "packs-test":
      return PACKS_TEST_HELP;
    default: {
      // A `never` variable makes the compiler fail here when a new topic is not handled (CS-9).
      const unhandledTopic: never = topic;
      throw new Error(`no help for ${String(unhandledTopic)}`);
    }
  }
}
