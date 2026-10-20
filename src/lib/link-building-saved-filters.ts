import { isSheetFilterActive } from "@/hooks/useSheetColumnFilters";
import {
  EMPTY_ADVANCED_FILTERS,
  countActiveAdvancedRules,
  normalizeAdvancedFilters,
  serializeAdvancedFilters,
} from "@/lib/link-building-advanced-filters";
import type {
  FilterConditionOperator,
  LinkBuildingOrderFilterState,
  SavedSheetColumnFilter,
  SortRulePayload,
} from "@/types/admin/link-building-order";

/**
 * Helpers for the Link Building Orders "Saved Filters" feature: turning a raw API
 * snapshot back into a safe table state, and comparing two states so the UI can
 * tell whether the table still matches the saved filter that was applied.
 */

export const EMPTY_FILTER_STATE: LinkBuildingOrderFilterState = {
  search: "",
  status: "",
  link_type: "",
  client: "",
  client_user_id: null,
  assigned_user_id: null,
  needs_lb_tl_approval: false,
  sort_rules: [],
  sheet_filters: {},
  hidden_columns: [],
  advanced_filters: EMPTY_ADVANCED_FILTERS,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function toNullableId(value: unknown): number | null {
  const parsed = typeof value === "string" ? Number(value) : value;
  return typeof parsed === "number" && Number.isInteger(parsed) ? parsed : null;
}

function normalizeSortRules(value: unknown): SortRulePayload[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((rule): SortRulePayload[] => {
    if (!isRecord(rule) || typeof rule.key !== "string") return [];
    if (rule.direction !== "asc" && rule.direction !== "desc") return [];
    return [{ key: rule.key, direction: rule.direction, nulls_last: rule.nulls_last !== false }];
  });
}

function normalizeSheetFilter(value: unknown): SavedSheetColumnFilter | null {
  if (!isRecord(value)) return null;

  let condition: SavedSheetColumnFilter["condition"] = null;
  if (isRecord(value.condition) && typeof value.condition.operator === "string") {
    condition = {
      operator: value.condition.operator as FilterConditionOperator,
      value: toText(value.condition.value),
      value_to: toText(value.condition.value_to),
    };
  }

  let values: SavedSheetColumnFilter["values"] = null;
  if (isRecord(value.values) && (value.values.mode === "include" || value.values.mode === "exclude")) {
    values = {
      mode: value.values.mode,
      // The API turns "" into null, and "" is how "(Blanks)" is stored, so map it back.
      values: Array.isArray(value.values.values) ? value.values.values.map(toText) : [],
    };
  }

  const filter = { condition, values };
  return isSheetFilterActive(filter) ? filter : null;
}

/**
 * Converts a snapshot returned by the API into a complete table state. Missing
 * keys fall back to their defaults, and when `known_columns` is given, column
 * filters, hidden columns and advanced filter rules that no longer exist in the
 * table are dropped.
 */
export function normalizeFilterState(
  raw: unknown,
  known_columns?: ReadonlySet<string>
): LinkBuildingOrderFilterState {
  if (!isRecord(raw)) return { ...EMPTY_FILTER_STATE };

  const isKnown = (key: string) => !known_columns || known_columns.has(key);

  const sheet_filters: LinkBuildingOrderFilterState["sheet_filters"] = {};
  if (isRecord(raw.sheet_filters)) {
    for (const [key, value] of Object.entries(raw.sheet_filters)) {
      if (!isKnown(key)) continue;
      const filter = normalizeSheetFilter(value);
      if (filter) sheet_filters[key] = filter;
    }
  }

  const hidden_columns = Array.isArray(raw.hidden_columns)
    ? raw.hidden_columns.filter((key): key is string => typeof key === "string" && isKnown(key))
    : [];

  return {
    search: toText(raw.search),
    status: toText(raw.status),
    link_type: toText(raw.link_type),
    client: toText(raw.client),
    client_user_id: toNullableId(raw.client_user_id),
    assigned_user_id: toNullableId(raw.assigned_user_id),
    needs_lb_tl_approval: raw.needs_lb_tl_approval === true,
    sort_rules: normalizeSortRules(raw.sort_rules),
    sheet_filters,
    hidden_columns: Array.from(new Set(hidden_columns)),
    advanced_filters: normalizeAdvancedFilters(raw.advanced_filters, isKnown),
  };
}

/**
 * Stable string form of a filter state. Order independent parts (hidden columns,
 * column filter keys, checked values) are sorted, and inactive column filters are
 * left out, so two states that produce the same table compare as equal.
 */
export function serializeFilterState(state: LinkBuildingOrderFilterState): string {
  const sheet_filters = Object.keys(state.sheet_filters)
    .sort()
    .flatMap((key) => {
      const filter = state.sheet_filters[key];
      if (!filter || !isSheetFilterActive(filter)) return [];
      return [
        [
          key,
          filter.condition
            ? [filter.condition.operator, filter.condition.value.trim(), filter.condition.value_to.trim()]
            : null,
          filter.values ? [filter.values.mode, [...filter.values.values].sort()] : null,
        ],
      ];
    });

  return JSON.stringify([
    state.search.trim(),
    state.status,
    state.link_type,
    state.client.trim(),
    state.client_user_id,
    state.assigned_user_id,
    state.needs_lb_tl_approval,
    state.sort_rules.map((r) => [r.key, r.direction]),
    sheet_filters,
    [...state.hidden_columns].sort(),
    serializeAdvancedFilters(state.advanced_filters),
  ]);
}

export function areFilterStatesEqual(
  a: LinkBuildingOrderFilterState,
  b: LinkBuildingOrderFilterState
): boolean {
  return serializeFilterState(a) === serializeFilterState(b);
}

/**
 * Number of individual filters in a state, shown next to each saved filter.
 * Every active advanced filter rule counts as one. Sorting and hidden columns
 * are not counted, since they do not remove rows.
 */
export function countActiveFilters(state: LinkBuildingOrderFilterState): number {
  return [
    state.search.trim() !== "",
    state.status !== "",
    state.link_type !== "",
    state.client.trim() !== "",
    state.client_user_id !== null,
    state.assigned_user_id !== null,
    state.needs_lb_tl_approval,
  ].filter(Boolean).length +
    Object.values(state.sheet_filters).filter(isSheetFilterActive).length +
    countActiveAdvancedRules(state.advanced_filters);
}
