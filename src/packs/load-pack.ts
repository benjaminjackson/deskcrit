// The pack loader: one pack's pack.yaml text in, a checked Pack out, or every problem it found
// (FR-44, FR-45, NFR-13, US-6). It reads no files and touches no process state; the CLI reads the
// text and decides the label (FR-11, AC-7, CS-6).

// Ajv ships one class per JSON Schema draft. Ajv2020 checks draft 2020-12, the draft
// schemas/pack.schema.json is written for. The schema leaves out $schema, so the draft is chosen here.
import { Ajv2020, type ErrorObject } from "ajv/dist/2020.js";
import { type Document, isScalar, parseDocument, visit } from "yaml";
// The JSON import is bundled by esbuild, so the schema is never read from disk at run time (CS-6).
import packSchema from "../../schemas/pack.schema.json" with { type: "json" };
import { CouldNotRunError } from "../shared/could-not-run-error.js";
import type {
  Criterion,
  Pack,
  PackProblem,
  PackQuestion,
  Predicate,
  PredicateKind,
} from "../shared/pack.js";

/** The three fields that hold a predicate, in the order compose checks them (verdict rule under FR-25). */
const predicateFields = ["pass_when", "warn_when", "fail_when"] as const;

type PredicateField = (typeof predicateFields)[number];

/**
 * A choice option name that a JavaScript object would treat as an array index and move to the
 * front, whatever order the YAML wrote it in (JC-3, verdict rule under FR-25).
 */
const integerLikeOptionName = /^(0|[1-9][0-9]*)$/;

/** Every predicate kind, in the order of the predicate table under FR-25. */
const predicateKinds: readonly PredicateKind[] = [
  "probability_at_least",
  "probability_at_most",
  "level_at_most",
  "level_at_least",
  "option_is",
  "option_in",
];

/** A criterion's question as pack.yaml writes it: choice options are still a map of name to description. */
type QuestionYaml =
  | Extract<PackQuestion, { type: "noul" | "score" }>
  | {
      readonly type: "choice";
      readonly instructions: string;
      readonly criteria: Readonly<Record<string, string>>;
    };

/** A criterion as pack.yaml writes it, once the schema has accepted it. */
type CriterionYaml = Omit<Criterion, "question"> & {
  readonly question: QuestionYaml;
};

/** A pack as pack.yaml writes it, once the schema has accepted it. */
type PackYaml = Omit<Pack, "criteria"> & {
  readonly criteria: readonly CriterionYaml[];
};

// strictRequired is off because the anyOf, then, and not blocks in the schema list required fields
// that are defined elsewhere in the schema, and Ajv's strictRequired check does not look there.
// verbose adds the failing sub-schema to each error, which the "not" errors need for their message.
const validatePackSchema = new Ajv2020({
  strict: true,
  strictRequired: false,
  allErrors: true,
  verbose: true,
}).compile(packSchema);

/**
 * Parses and checks one pack's YAML text, and returns the typed pack or every problem found. It
 * runs in three phases, YAML, schema, then the checks the schema cannot express, and stops after
 * the first phase that finds problems (FR-36, FR-44, FR-45, NFR-13, US-6, CS-4, CS-7, CS-18).
 */
export function checkPack(
  yamlText: string,
): { ok: true; pack: Pack } | { ok: false; problems: PackProblem[] } {
  const document = parseDocument(yamlText, {
    schema: "core",
    customTags: [],
    // Without this, the library still resolves the YAML 1.1 tags !!binary, !!set, !!omap,
    // !!pairs, and !!timestamp when a document names them; turned off, they are unknown tags.
    resolveKnownTags: false,
    uniqueKeys: areKeysEqual,
  });
  const yamlProblems = findYamlProblems(document);
  if (yamlProblems.length > 0) {
    return { ok: false, problems: yamlProblems };
  }

  const data: unknown = document.toJS();
  if (!validatePackSchema(data)) {
    const schemaErrors = validatePackSchema.errors ?? [];
    return { ok: false, problems: convertSchemaErrors(schemaErrors, data) };
  }

  // The schema has accepted the data, so it has the PackYaml shape. This is the one cast (CS-7).
  const packYaml = data as PackYaml;
  const ruleProblems = findRuleProblems(packYaml);
  if (ruleProblems.length > 0) {
    return { ok: false, problems: ruleProblems };
  }
  return { ok: true, pack: buildPack(packYaml) };
}

/**
 * Parses and checks one pack, and throws CouldNotRunError when it is invalid, with a message that
 * names the pack label the CLI chose and each problem, so the CLI exits with code 2 (FR-4, US-5,
 * US-6, CS-16).
 */
export function loadPack(yamlText: string, packLabel: string): Pack {
  const result = checkPack(yamlText);
  if (result.ok) {
    return result.pack;
  }
  const lines = [`${packLabel}: invalid pack`];
  for (const problem of result.problems) {
    lines.push(`  ${describeProblem(problem)}`);
  }
  throw new CouldNotRunError(lines.join("\n"));
}

/** Writes one problem as "criterion <id>, field <path>: <message>" for the error message (US-6). */
function describeProblem(problem: PackProblem): string {
  if (problem.criterion === undefined) {
    return `field ${problem.field}: ${problem.message}`;
  }
  return `criterion ${problem.criterion}, field ${problem.field}: ${problem.message}`;
}

/**
 * Treats two map keys as duplicates when their text is the same, so `true:` and `"true":`, or `1:`
 * and `"1":`, count as one key. The yaml library's own check compares typed values, and lets both
 * through to the same JavaScript key, where the second silently replaces the first (CS-4).
 */
function areKeysEqual(firstKey: unknown, secondKey: unknown): boolean {
  if (!isScalar(firstKey) || !isScalar(secondKey)) {
    return false;
  }
  return String(firstKey.value) === String(secondKey.value);
}

/**
 * Lists the YAML errors and warnings, and every alias. An unknown tag such as `!foo` or
 * `!!js/function` is a warning, a duplicate key or a second document is an error, and aliases are
 * refused so a stranger's pack cannot expand into a huge document (NFR-13, CS-4).
 */
function findYamlProblems(document: Document): PackProblem[] {
  const problems: PackProblem[] = [];
  for (const error of document.errors) {
    problems.push(createYamlProblem(error.code, error.message));
  }
  for (const warning of document.warnings) {
    problems.push(createYamlProblem(warning.code, warning.message));
  }
  visit(document, {
    Alias() {
      problems.push({
        criterion: undefined,
        field: "yaml",
        message: "aliases (*name) are not allowed in a pack",
      });
    },
  });
  return problems;
}

/** Makes a problem from a yaml library error, keeping its code and its first line, which names the line and column (US-6). */
function createYamlProblem(code: string, message: string): PackProblem {
  const firstLine = message.split("\n")[0] ?? message;
  return {
    criterion: undefined,
    field: "yaml",
    message: `${code}: ${firstLine}`,
  };
}

/** Turns Ajv's errors into problems that name the criterion and the field (US-6, FR-44, FR-45). */
function convertSchemaErrors(
  errors: ErrorObject[],
  data: unknown,
): PackProblem[] {
  const problems: PackProblem[] = [];
  for (const error of errors) {
    // An "if" error only says a then-branch failed; the branch's own error names the fault.
    if (error.keyword === "if") {
      continue;
    }
    // Each anyOf option adds its own "required" error; the one anyOf error covers them all.
    if (error.schemaPath.includes("/anyOf/")) {
      continue;
    }
    problems.push(convertSchemaError(error, data));
  }
  return problems;
}

/** Turns one Ajv error into a problem: the criterion id from the data, the field from the error's path (US-6). */
function convertSchemaError(error: ErrorObject, data: unknown): PackProblem {
  const pathSegments = splitInstancePath(error.instancePath);
  let message = error.message ?? error.keyword;

  const missingProperty: unknown = error.params.missingProperty;
  const additionalProperty: unknown = error.params.additionalProperty;
  if (error.keyword === "required" && typeof missingProperty === "string") {
    pathSegments.push(missingProperty);
    message = "is required";
  } else if (
    error.keyword === "additionalProperties" &&
    typeof additionalProperty === "string"
  ) {
    pathSegments.push(additionalProperty);
    message = "is not a field the pack schema defines";
    // A known predicate in the wrong place means it does not fit the question type (FR-25).
    const predicateKind = findPredicateKind(additionalProperty);
    const parentSegment = pathSegments[pathSegments.length - 2];
    if (predicateKind && parentSegment?.endsWith("_when")) {
      const fittingType = readQuestionTypeForPredicate(predicateKind);
      message = `fits only a ${fittingType} question`;
    }
  } else if (error.keyword === "anyOf") {
    // The only anyOf in the schema is the FR-45 rule on a criterion's predicates.
    pathSegments.push("fail_when | warn_when | pass_when");
    message =
      "a criterion needs at least one of fail_when, warn_when, pass_when";
  } else if (error.keyword === "not") {
    const forbiddenField = readForbiddenField(error.schema);
    if (forbiddenField !== undefined) {
      pathSegments.push(forbiddenField);
      message = "is not allowed for this question type";
    }
  } else if (
    error.keyword === "minProperties" ||
    error.keyword === "maxProperties"
  ) {
    const lastSegment = pathSegments[pathSegments.length - 1];
    if (lastSegment?.endsWith("_when")) {
      message = "must hold exactly one predicate";
    }
  }

  return placeProblem(pathSegments, message, data);
}

/** Splits an Ajv instance path such as "/criteria/0/fail_when" into its segments, undoing JSON Pointer escapes (RFC 6901). */
function splitInstancePath(instancePath: string): string[] {
  const segments: string[] = [];
  for (const rawSegment of instancePath.split("/").slice(1)) {
    segments.push(rawSegment.replaceAll("~1", "/").replaceAll("~0", "~"));
  }
  return segments;
}

/** Reads the field a `not: { required: [field] }` block forbids, from the sub-schema Ajv reports in verbose mode. */
function readForbiddenField(notSchema: unknown): string | undefined {
  // These typeof and "in" checks are type guards: after each one TypeScript knows more about the value.
  if (typeof notSchema !== "object" || notSchema === null) {
    return undefined;
  }
  if (!("required" in notSchema) || !Array.isArray(notSchema.required)) {
    return undefined;
  }
  const firstField: unknown = notSchema.required[0];
  if (typeof firstField !== "string") {
    return undefined;
  }
  return firstField;
}

/**
 * Builds the problem for a path inside the pack. A path under criteria/N with an id gives that id
 * and the rest of the path; any other path is named in full from the pack root (US-6).
 */
function placeProblem(
  pathSegments: string[],
  message: string,
  data: unknown,
): PackProblem {
  const [firstSegment, indexSegment, ...restSegments] = pathSegments;
  if (
    firstSegment === "criteria" &&
    indexSegment !== undefined &&
    restSegments.length > 0
  ) {
    const criterionId = readCriterionId(data, Number(indexSegment));
    if (criterionId !== undefined) {
      return { criterion: criterionId, field: restSegments.join("."), message };
    }
  }
  if (pathSegments.length === 0) {
    return { criterion: undefined, field: "pack", message };
  }
  return { criterion: undefined, field: pathSegments.join("."), message };
}

/** Reads criteria[index].id from data the schema has not accepted, when it is a string (US-6). */
function readCriterionId(data: unknown, index: number): string | undefined {
  if (typeof data !== "object" || data === null) {
    return undefined;
  }
  if (!("criteria" in data) || !Array.isArray(data.criteria)) {
    return undefined;
  }
  const criterion: unknown = data.criteria[index];
  if (typeof criterion !== "object" || criterion === null) {
    return undefined;
  }
  if (!("id" in criterion) || typeof criterion.id !== "string") {
    return undefined;
  }
  return criterion.id;
}

/**
 * Runs the checks that JSON Schema cannot express, in criterion order: unique ids, predicates that
 * fit the question type and name a real option or level, no integer-like option names, the
 * direction of pass_when and fail_when, and no min_confidence on noul (FR-25, FR-27, FR-36, section 7.8, CS-18).
 */
function findRuleProblems(packYaml: PackYaml): PackProblem[] {
  const problems: PackProblem[] = [];
  const seenIds = new Set<string>();
  for (const criterion of packYaml.criteria) {
    if (seenIds.has(criterion.id)) {
      problems.push({
        criterion: criterion.id,
        field: "id",
        message: "repeats the id of an earlier criterion in this pack",
      });
    }
    seenIds.add(criterion.id);

    for (const predicateField of predicateFields) {
      const predicate = criterion[predicateField];
      if (predicate === undefined) {
        continue;
      }
      const predicateProblem = findPredicateProblem(
        criterion,
        predicateField,
        predicate,
      );
      if (predicateProblem !== undefined) {
        problems.push(predicateProblem);
      }
    }

    if (criterion.question.type === "choice") {
      for (const optionName of Object.keys(criterion.question.criteria)) {
        if (integerLikeOptionName.test(optionName)) {
          problems.push({
            criterion: criterion.id,
            field: `question.criteria.${optionName}`,
            message: `the option name "${optionName}" looks like an integer; a JavaScript object moves such keys to the front, so the option order would break (JC-3, FR-25). Use a name with a letter in it`,
          });
        }
      }
    }

    const directionProblem = findDirectionProblem(criterion);
    if (directionProblem !== undefined) {
      problems.push(directionProblem);
    }

    if (
      criterion.question.type === "noul" &&
      criterion.min_confidence !== undefined
    ) {
      problems.push({
        criterion: criterion.id,
        field: "min_confidence",
        message:
          "a noul criterion cannot set min_confidence, because a noul answer has no confidence (FR-27, OQ-21)",
      });
    }
  }
  return problems;
}

/**
 * Checks one predicate against its criterion's question: the predicate kind must fit the question
 * type, an option must be one of the question's options, and a level must be one of its levels
 * (verdict rule under FR-25).
 */
function findPredicateProblem(
  criterion: CriterionYaml,
  predicateField: PredicateField,
  predicate: Predicate,
): PackProblem | undefined {
  const kind = readPredicateKind(predicate);
  const fittingType = readQuestionTypeForPredicate(kind);
  const question = criterion.question;
  if (fittingType !== question.type) {
    return {
      criterion: criterion.id,
      field: `${predicateField}.${kind}`,
      message: `fits only a ${fittingType} question, but this question is ${question.type}`,
    };
  }

  if (question.type === "choice") {
    const optionNames = Object.keys(question.criteria);
    for (const optionName of readPredicateOptions(predicate)) {
      if (!optionNames.includes(optionName)) {
        return {
          criterion: criterion.id,
          field: `${predicateField}.${kind}`,
          message: `names the option "${optionName}", which is not in question.criteria`,
        };
      }
    }
  }

  if (question.type === "score") {
    const level = readPredicateLevel(predicate);
    if (level !== undefined && level >= question.levels.length) {
      return {
        criterion: criterion.id,
        field: `${predicateField}.${kind}`,
        message: `names level ${level}, but question.levels has levels 0 to ${question.levels.length - 1}`,
      };
    }
  }
  return undefined;
}

/** Returns the predicate kind a field name spells, or undefined when it names no predicate (FR-25). */
function findPredicateKind(fieldName: string): PredicateKind | undefined {
  for (const kind of predicateKinds) {
    if (kind === fieldName) {
      return kind;
    }
  }
  return undefined;
}

/** Names the one key a predicate holds, so a switch can cover every kind (verdict rule under FR-25). */
function readPredicateKind(predicate: Predicate): PredicateKind {
  if ("probability_at_least" in predicate) {
    return "probability_at_least";
  }
  if ("probability_at_most" in predicate) {
    return "probability_at_most";
  }
  if ("level_at_most" in predicate) {
    return "level_at_most";
  }
  if ("level_at_least" in predicate) {
    return "level_at_least";
  }
  if ("option_is" in predicate) {
    return "option_is";
  }
  return "option_in";
}

/** Gives the question type each predicate fits, row by row from the predicate table under FR-25. */
function readQuestionTypeForPredicate(
  kind: PredicateKind,
): PackQuestion["type"] {
  switch (kind) {
    case "probability_at_least":
      return "noul";
    case "probability_at_most":
      return "noul";
    case "level_at_most":
      return "score";
    case "level_at_least":
      return "score";
    case "option_is":
      return "choice";
    case "option_in":
      return "choice";
    default: {
      // `never` is the type with no values: this line compiles only while every kind has a case above (CS-9).
      const unhandledKind: never = kind;
      throw new Error(`unhandled predicate kind ${String(unhandledKind)}`);
    }
  }
}

/** Lists the option names a choice predicate names, or none for any other predicate (FR-25). */
function readPredicateOptions(predicate: Predicate): readonly string[] {
  if ("option_is" in predicate) {
    return [predicate.option_is];
  }
  if ("option_in" in predicate) {
    return predicate.option_in;
  }
  return [];
}

/** Reads the level index a score predicate names, or undefined for any other predicate (FR-25). */
function readPredicateLevel(predicate: Predicate): number | undefined {
  if ("level_at_most" in predicate) {
    return predicate.level_at_most;
  }
  if ("level_at_least" in predicate) {
    return predicate.level_at_least;
  }
  return undefined;
}

/**
 * Rejects a noul or score criterion whose pass_when and fail_when point in opposite directions, so
 * compare can read one direction from either field (FR-36). Choice options have no order.
 */
function findDirectionProblem(
  criterion: CriterionYaml,
): PackProblem | undefined {
  const passPredicate = criterion.pass_when;
  const failPredicate = criterion.fail_when;
  if (passPredicate === undefined || failPredicate === undefined) {
    return undefined;
  }
  const passDirection = readDirection(
    readPredicateKind(passPredicate),
    "pass_when",
  );
  const failDirection = readDirection(
    readPredicateKind(failPredicate),
    "fail_when",
  );
  if (passDirection === undefined || failDirection === undefined) {
    return undefined;
  }
  if (passDirection === failDirection) {
    return undefined;
  }
  return {
    criterion: criterion.id,
    field: "pass_when, fail_when",
    message: `point in opposite directions: pass_when says ${passDirection}, fail_when says ${failDirection}`,
  };
}

/**
 * Reads which way a predicate says is better, as FR-36 defines it: *_at_most in pass_when, or
 * *_at_least in fail_when, means lower is better, and the opposite means higher is better. Choice
 * predicates give undefined, because options have no order.
 */
function readDirection(
  kind: PredicateKind,
  predicateField: "pass_when" | "fail_when",
): "lower is better" | "higher is better" | undefined {
  switch (kind) {
    case "probability_at_most":
    case "level_at_most":
      if (predicateField === "pass_when") {
        return "lower is better";
      }
      return "higher is better";
    case "probability_at_least":
    case "level_at_least":
      if (predicateField === "pass_when") {
        return "higher is better";
      }
      return "lower is better";
    case "option_is":
    case "option_in":
      return undefined;
    default: {
      const unhandledKind: never = kind;
      throw new Error(`unhandled predicate kind ${String(unhandledKind)}`);
    }
  }
}

/**
 * Builds the Pack from checked data. Each choice question's options become a list in YAML order;
 * an object keeps that order because the rule checks refuse integer-like option names (JC-3, FR-25).
 */
function buildPack(packYaml: PackYaml): Pack {
  const criteria: Criterion[] = [];
  for (const criterionYaml of packYaml.criteria) {
    const question = buildQuestion(criterionYaml.question);
    criteria.push({ ...criterionYaml, question });
  }
  return { ...packYaml, criteria };
}

/** Converts one question to its parsed form; only a choice question changes, from a map to an ordered list (JC-3). */
function buildQuestion(questionYaml: QuestionYaml): PackQuestion {
  switch (questionYaml.type) {
    case "noul":
      return questionYaml;
    case "score":
      return questionYaml;
    case "choice": {
      const options: Array<{ option: string; description: string }> = [];
      for (const [option, description] of Object.entries(
        questionYaml.criteria,
      )) {
        options.push({ option, description });
      }
      return {
        type: "choice",
        instructions: questionYaml.instructions,
        criteria: options,
      };
    }
    default: {
      const unhandledQuestion: never = questionYaml;
      throw new Error(`unhandled question ${String(unhandledQuestion)}`);
    }
  }
}
