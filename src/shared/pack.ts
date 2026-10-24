// The parsed form of one pack.yaml, after the pack loader in src/packs/ has checked it. Build and
// compose read these types, so they live here and not in src/packs/ (CS-5, CS-6). Field names
// follow the pack YAML (CS-8, CS-10). The rules behind each field are in the pack schema table in
// docs/PRD.md section 7.8 and in schemas/pack.schema.json.

/**
 * One predicate from `pass_when`, `warn_when`, or `fail_when`. Each object holds exactly one key,
 * and the key fits the question type: probability_* for noul, level_* for score, option_* for
 * choice (verdict rule under FR-25).
 */
export type Predicate =
  | { readonly probability_at_least: number }
  | { readonly probability_at_most: number }
  | { readonly level_at_most: number }
  | { readonly level_at_least: number }
  | { readonly option_is: string }
  | { readonly option_in: readonly string[] };

/** The name of the one key a predicate holds, the same as the wire format (CS-8). */
export type PredicateKind =
  | "probability_at_least"
  | "probability_at_most"
  | "level_at_most"
  | "level_at_least"
  | "option_is"
  | "option_in";

/** A yes or no question. `true` names the defect (JC-5, FR-21). */
export type PackNoulQuestion = {
  readonly type: "noul";
  readonly instructions: string;
  readonly criteria: { readonly true: string; readonly false: string };
};

/**
 * One of a set of options. In pack.yaml the options are a map of option name to description. Here
 * they are a list in the YAML order, because a JavaScript object moves integer-like keys such as
 * "1" to the front, and a tie goes to the option listed first (verdict rule under FR-25, JC-3).
 */
export type PackChoiceQuestion = {
  readonly type: "choice";
  readonly instructions: string;
  readonly criteria: ReadonlyArray<{
    readonly option: string;
    readonly description: string;
  }>;
};

/** A degree along described levels, listed from level 0 upward (FR-21). */
export type PackScoreQuestion = {
  readonly type: "score";
  readonly instructions: string;
  readonly levels: readonly string[];
};

/** The one question a criterion becomes, a union keyed on `type` (FR-14, FR-21, CS-8). */
export type PackQuestion =
  | PackNoulQuestion
  | PackChoiceQuestion
  | PackScoreQuestion;

/** Image paths relative to the pack directory. crit packs validate requires both lists (FR-49). */
export type PackFixtures = {
  readonly positive?: readonly string[];
  readonly negative?: readonly string[];
};

/**
 * One criterion. It has at least one of `fail_when`, `warn_when`, `pass_when` (FR-45). It sets
 * `min_confidence` only on a choice or score question (FR-27), and `locate_instructions` whenever
 * `locate` is true (FR-16).
 */
export type Criterion = {
  readonly id: string;
  readonly title: string;
  readonly source: string;
  readonly link?: string;
  readonly applies_to?: readonly string[];
  readonly question: PackQuestion;
  readonly fail_when?: Predicate;
  readonly warn_when?: Predicate;
  readonly pass_when?: Predicate;
  readonly min_confidence?: number;
  readonly locate?: boolean;
  readonly locate_instructions?: string;
  readonly requires?: readonly string[];
  readonly fix: string;
  readonly fixtures?: PackFixtures;
};

/** One pack: its metadata and its criteria in the YAML order (FR-44, section 7.8). */
export type Pack = {
  readonly name: string;
  readonly version: string;
  readonly title: string;
  readonly license: string;
  readonly applies_to?: readonly string[];
  readonly criteria: readonly Criterion[];
};

/**
 * One thing wrong with a pack. `criterion` is the criterion id when the problem sits inside a
 * criterion that has an id, and `field` is the dotted path to the field at fault, relative to that
 * criterion, or to the pack when `criterion` is undefined (US-6).
 */
export type PackProblem = {
  readonly criterion: string | undefined;
  readonly field: string;
  readonly message: string;
};
