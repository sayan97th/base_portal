import type {
  AdvancedFilterGroup,
  AdvancedFilterJoinOperator,
  AdvancedFilterOperator,
  AdvancedFilterRule,
  AdvancedFiltersPayload,
  ColumnFilterPayload,
  LinkBuildingOrderAdvancedFilters,
} from "@/types/admin/link-building-order";

/**
 * Helpers for the Link Building Orders "Advanced filters" panel, a monday style
 * rule builder: "Where [column] [condition] [value]" rows joined by And / Or, plus
 * condition groups with their own And / Or. Everything here is pure so the panel,
 * the table, saved filters and the tests share one definition of the rules.
 */

// ── Columns and operators ──────────────────────────────────────────────────────

/** Decides which conditions and value input a column offers. */
export type AdvancedFilterColumnKind = "text" | "option" | "number" | "date";

export interface AdvancedFilterColumn {
  key: string;
  label: string;
  kind: AdvancedFilterColumnKind;
  /** Fixed list of values (e.g. Status). Columns without one load their values from the server. */
  options?: string[];
  /** Tailwind class of the column group's color, shown next to the column name. */
  swatch_class?: string;
  /** Tailwind classes of the dot shown before each value (e.g. Status colors), by value. */
  dot_classes?: Record<string, string>;
  default_dot_class?: string;
}

/** What the value part of a rule looks like for a given condition. */
export type AdvancedFilterInputKind = "none" | "text" | "number" | "date" | "range" | "values";

export interface AdvancedFilterOperatorOption {
  value: AdvancedFilterOperator;
  label: string;
  input: AdvancedFilterInputKind;
}

const IS_ANY_OF: AdvancedFilterOperatorOption = { value: "is_any_of", label: "is", input: "values" };
const IS_NONE_OF: AdvancedFilterOperatorOption = { value: "is_none_of", label: "is not", input: "values" };
const IS_EMPTY: AdvancedFilterOperatorOption = { value: "is_empty", label: "is empty", input: "none" };
const IS_NOT_EMPTY: AdvancedFilterOperatorOption = { value: "is_not_empty", label: "is not empty", input: "none" };

/** Conditions offered per column kind, the first one being the default. */
export const ADVANCED_FILTER_OPERATORS: Record<AdvancedFilterColumnKind, AdvancedFilterOperatorOption[]> = {
  option: [IS_ANY_OF, IS_NONE_OF, IS_EMPTY, IS_NOT_EMPTY],
  text: [
    { value: "text_contains", label: "contains", input: "text" },
    { value: "text_not_contains", label: "does not contain", input: "text" },
    { value: "text_is_exactly", label: "is exactly", input: "text" },
    { value: "text_starts_with", label: "starts with", input: "text" },
    { value: "text_ends_with", label: "ends with", input: "text" },
    IS_ANY_OF,
    IS_NONE_OF,
    IS_EMPTY,
    IS_NOT_EMPTY,
  ],
  number: [
    { value: "is_equal_to", label: "equals", input: "number" },
    { value: "is_not_equal_to", label: "does not equal", input: "number" },
    { value: "greater_than", label: "is greater than", input: "number" },
    { value: "greater_than_or_equal", label: "is greater than or equal to", input: "number" },
    { value: "less_than", label: "is less than", input: "number" },
    { value: "less_than_or_equal", label: "is less than or equal to", input: "number" },
    { value: "is_between", label: "is between", input: "range" },
    { value: "is_not_between", label: "is not between", input: "range" },
    IS_EMPTY,
    IS_NOT_EMPTY,
  ],
  date: [
    { value: "date_is", label: "is on", input: "date" },
    { value: "date_is_before", label: "is before", input: "date" },
    { value: "date_is_after", label: "is after", input: "date" },
    IS_EMPTY,
    IS_NOT_EMPTY,
  ],
};

/** Every known operator with the input it needs, regardless of column kind. */
const OPERATOR_INPUTS = new Map<AdvancedFilterOperator, AdvancedFilterInputKind>(
  Object.values(ADVANCED_FILTER_OPERATORS)
    .flat()
    .map((option) => [option.value, option.input])
);

export function isAdvancedFilterOperator(value: unknown): value is AdvancedFilterOperator {
  return typeof value === "string" && OPERATOR_INPUTS.has(value as AdvancedFilterOperator);
}

export function getAdvancedOperatorInput(operator: AdvancedFilterOperator | null): AdvancedFilterInputKind {
  return operator ? OPERATOR_INPUTS.get(operator) ?? "none" : "none";
}

export function getAdvancedOperatorOption(
  kind: AdvancedFilterColumnKind,
  operator: AdvancedFilterOperator | null
): AdvancedFilterOperatorOption | undefined {
  return ADVANCED_FILTER_OPERATORS[kind].find((option) => option.value === operator);
}

export function getDefaultAdvancedOperator(kind: AdvancedFilterColumnKind): AdvancedFilterOperator {
  return ADVANCED_FILTER_OPERATORS[kind][0].value;
}

/**
 * Patch for a rule whose column changes: the condition is kept when the new
 * column supports it, otherwise it falls back to the column's default. Values
 * only carry over between columns of the same kind, and picked values never do,
 * since they belong to the old column.
 */
export function getColumnChangePatch(
  rule: AdvancedFilterRule,
  previous_column: AdvancedFilterColumn | undefined,
  next_column: AdvancedFilterColumn
): Partial<AdvancedFilterRule> {
  const keeps_operator = rule.operator !== null && getAdvancedOperatorOption(next_column.kind, rule.operator) !== undefined;
  const keeps_value = keeps_operator && previous_column?.kind === next_column.kind;
  return {
    key: next_column.key,
    operator: keeps_operator ? rule.operator : getDefaultAdvancedOperator(next_column.kind),
    value: keeps_value ? rule.value : "",
    value_to: keeps_value ? rule.value_to : "",
    values: [],
  };
}

/** Patch for a rule whose condition changes, clearing values that no longer fit its input. */
export function getOperatorChangePatch(
  rule: AdvancedFilterRule,
  operator: AdvancedFilterOperator
): Partial<AdvancedFilterRule> {
  const previous_input = getAdvancedOperatorInput(rule.operator);
  const next_input = getAdvancedOperatorInput(operator);
  if (previous_input === next_input) return { operator };
  // A single number still makes sense as the lower bound of a range, and back.
  const keeps_value = (previous_input === "number" && next_input === "range") || (previous_input === "range" && next_input === "number");
  return {
    operator,
    value: keeps_value ? rule.value : "",
    value_to: "",
    values: [],
  };
}

// ── Factories ──────────────────────────────────────────────────────────────────

let id_counter = 0;

/** Client side id, only used to key rows in the panel. */
export function createAdvancedFilterId(prefix: "rule" | "group"): string {
  id_counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${id_counter}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createAdvancedFilterRule(overrides: Partial<AdvancedFilterRule> = {}): AdvancedFilterRule {
  return {
    id: createAdvancedFilterId("rule"),
    key: null,
    operator: null,
    value: "",
    value_to: "",
    values: [],
    is_disabled: false,
    ...overrides,
  };
}

export function createAdvancedFilterGroup(): AdvancedFilterGroup {
  return { id: createAdvancedFilterId("group"), operator: "and", rules: [createAdvancedFilterRule()] };
}

export const EMPTY_ADVANCED_FILTERS: LinkBuildingOrderAdvancedFilters = { operator: "and", rules: [], groups: [] };

// ── Rule state ─────────────────────────────────────────────────────────────────

/** True when the rule has a column, a condition and every value its condition needs. */
export function isAdvancedRuleComplete(rule: AdvancedFilterRule): boolean {
  if (!rule.key || !rule.operator) return false;
  switch (getAdvancedOperatorInput(rule.operator)) {
    case "none":
      return true;
    case "values":
      return rule.values.length > 0;
    case "range":
      return rule.value.trim() !== "" && rule.value_to.trim() !== "";
    default:
      return rule.value.trim() !== "";
  }
}

/** A rule narrows the table only when it is complete and not paused. */
export function isAdvancedRuleActive(rule: AdvancedFilterRule): boolean {
  return !rule.is_disabled && isAdvancedRuleComplete(rule);
}

export function countActiveAdvancedRules(filters: LinkBuildingOrderAdvancedFilters): number {
  return (
    filters.rules.filter(isAdvancedRuleActive).length +
    filters.groups.reduce((total, group) => total + group.rules.filter(isAdvancedRuleActive).length, 0)
  );
}

/** True when the panel holds any rule or group at all, even an incomplete one. */
export function hasAdvancedFilterRules(filters: LinkBuildingOrderAdvancedFilters): boolean {
  return filters.rules.length > 0 || filters.groups.length > 0;
}

// ── API payload ────────────────────────────────────────────────────────────────

function toRulePayload(rule: AdvancedFilterRule): ColumnFilterPayload {
  const key = rule.key as string;
  if (rule.operator === "is_any_of" || rule.operator === "is_none_of") {
    return { key, type: "values", mode: rule.operator === "is_any_of" ? "include" : "exclude", values: rule.values };
  }
  return {
    key,
    type: "condition",
    operator: rule.operator as Exclude<AdvancedFilterOperator, "is_any_of" | "is_none_of">,
    value: rule.value.trim() || undefined,
    value_to: rule.value_to.trim() || undefined,
  };
}

/**
 * Converts the panel state into the search endpoint's `advanced_filters`, keeping
 * only complete, enabled rules and the groups that still have one. Returns
 * undefined when nothing would narrow the table.
 */
export function toAdvancedFiltersPayload(filters: LinkBuildingOrderAdvancedFilters): AdvancedFiltersPayload | undefined {
  const rules = filters.rules.filter(isAdvancedRuleActive).map(toRulePayload);
  const groups = filters.groups
    .map((group) => ({ operator: group.operator, rules: group.rules.filter(isAdvancedRuleActive).map(toRulePayload) }))
    .filter((group) => group.rules.length > 0);

  if (rules.length === 0 && groups.length === 0) return undefined;
  return { operator: filters.operator, rules, groups };
}

// ── Saved state ────────────────────────────────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toJoinOperator(value: unknown): AdvancedFilterJoinOperator {
  return value === "or" ? "or" : "and";
}

function normalizeRule(raw: unknown, isKnown: (key: string) => boolean): AdvancedFilterRule | null {
  if (!isRecord(raw)) return null;
  const key = typeof raw.key === "string" && raw.key !== "" ? raw.key : null;
  // A rule on a column the table no longer has could never be edited or applied.
  if (key !== null && !isKnown(key)) return null;

  return createAdvancedFilterRule({
    ...(typeof raw.id === "string" && raw.id !== "" ? { id: raw.id } : {}),
    key,
    operator: key !== null && isAdvancedFilterOperator(raw.operator) ? raw.operator : null,
    value: toText(raw.value),
    value_to: toText(raw.value_to),
    // The API turns "" into null, and "" is how "(Blanks)" is stored, so map it back.
    values: Array.isArray(raw.values) ? Array.from(new Set(raw.values.map(toText))) : [],
    is_disabled: raw.is_disabled === true,
  });
}

function normalizeRules(raw: unknown, isKnown: (key: string) => boolean): AdvancedFilterRule[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((rule) => normalizeRule(rule, isKnown) ?? []);
}

/**
 * Converts a snapshot returned by the API into safe panel state. Unknown
 * operators are dropped, rules on unknown columns are removed, and so are groups
 * left without any rule. Missing ids are regenerated so rows can be keyed.
 */
export function normalizeAdvancedFilters(
  raw: unknown,
  isKnown: (key: string) => boolean = () => true
): LinkBuildingOrderAdvancedFilters {
  if (!isRecord(raw)) return EMPTY_ADVANCED_FILTERS;

  const groups = Array.isArray(raw.groups)
    ? raw.groups.flatMap((group): AdvancedFilterGroup[] => {
        if (!isRecord(group)) return [];
        const rules = normalizeRules(group.rules, isKnown);
        if (rules.length === 0) return [];
        return [
          {
            id: typeof group.id === "string" && group.id !== "" ? group.id : createAdvancedFilterId("group"),
            operator: toJoinOperator(group.operator),
            rules,
          },
        ];
      })
    : [];

  return { operator: toJoinOperator(raw.operator), rules: normalizeRules(raw.rules, isKnown), groups };
}

function serializeRule(rule: AdvancedFilterRule): unknown[] {
  return [rule.key, rule.operator, rule.value.trim(), rule.value_to.trim(), [...rule.values].sort(), rule.is_disabled];
}

/**
 * Stable, id free form of the panel state, so two views built separately (e.g. a
 * saved filter and the same rules added by hand) compare as equal. Rule order is
 * kept, since it is how the rules read in the panel.
 */
export function serializeAdvancedFilters(filters: LinkBuildingOrderAdvancedFilters): unknown[] {
  if (!hasAdvancedFilterRules(filters)) return [];
  return [
    filters.operator,
    filters.rules.map(serializeRule),
    filters.groups.map((group) => [group.operator, group.rules.map(serializeRule)]),
  ];
}

// ── Descriptions ───────────────────────────────────────────────────────────────

/** Formats a YYYY-MM-DD date input value as MM/DD/YYYY, the format the table displays. */
function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${month}/${day}/${year}` : value;
}

function formatValue(value: string): string {
  return value === "" ? "(Blanks)" : value;
}

/** The condition and value of a rule without its column, e.g. `is greater than 50` or `is Live, Writing`. */
export function describeAdvancedRuleCondition(rule: AdvancedFilterRule, columns: AdvancedFilterColumn[]): string {
  const column = columns.find((candidate) => candidate.key === rule.key);
  const option = column && rule.operator ? getAdvancedOperatorOption(column.kind, rule.operator) : undefined;
  const operator_label = option?.label ?? rule.operator ?? "";

  switch (getAdvancedOperatorInput(rule.operator)) {
    case "none":
      return operator_label;
    case "values": {
      const listed =
        rule.values.length <= 2 ? rule.values.map(formatValue).join(", ") : `any of ${rule.values.length} values`;
      return `${operator_label} ${listed}`;
    }
    case "range":
      return `${operator_label} ${rule.value.trim()} and ${rule.value_to.trim()}`;
    case "date":
      return `${operator_label} ${formatDate(rule.value.trim())}`;
    case "text":
      return `${operator_label} "${rule.value.trim()}"`;
    default:
      return `${operator_label} ${rule.value.trim()}`;
  }
}

export function getAdvancedColumnLabel(key: string | null, columns: AdvancedFilterColumn[]): string {
  return columns.find((candidate) => candidate.key === key)?.label ?? key ?? "";
}

/** Short human readable form of one rule, e.g. `DR is greater than 50` or `Status is Live, Writing`. */
export function describeAdvancedRule(rule: AdvancedFilterRule, columns: AdvancedFilterColumn[]): string {
  return `${getAdvancedColumnLabel(rule.key, columns)} ${describeAdvancedRuleCondition(rule, columns)}`;
}

/** One group's active rules joined by its operator, or "" when none is active. */
export function describeAdvancedGroup(group: AdvancedFilterGroup, columns: AdvancedFilterColumn[]): string {
  return group.rules
    .filter(isAdvancedRuleActive)
    .map((rule) => describeAdvancedRule(rule, columns))
    .join(` ${group.operator} `);
}

/** Every active rule and group as one sentence, e.g. `Status is Live or (DR is greater than 50 and ...)`. */
export function describeAdvancedFilters(filters: LinkBuildingOrderAdvancedFilters, columns: AdvancedFilterColumn[]): string {
  const parts = [
    ...filters.rules.filter(isAdvancedRuleActive).map((rule) => describeAdvancedRule(rule, columns)),
    ...filters.groups.flatMap((group) => {
      const description = describeAdvancedGroup(group, columns);
      if (description === "") return [];
      return group.rules.filter(isAdvancedRuleActive).length > 1 ? [`(${description})`] : [description];
    }),
  ];
  return parts.join(` ${filters.operator} `);
}
