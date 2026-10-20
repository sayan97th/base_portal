/**
 * Tests for the Link Building Orders "Advanced filters" helpers: building the
 * search payload, restoring a saved snapshot, editing rules and describing them.
 */

import {
  EMPTY_ADVANCED_FILTERS,
  countActiveAdvancedRules,
  createAdvancedFilterRule,
  describeAdvancedFilters,
  getColumnChangePatch,
  getOperatorChangePatch,
  normalizeAdvancedFilters,
  toAdvancedFiltersPayload,
  type AdvancedFilterColumn,
} from "@/lib/link-building-advanced-filters";
import { EMPTY_FILTER_STATE, areFilterStatesEqual, countActiveFilters } from "@/lib/link-building-saved-filters";
import type { LinkBuildingOrderAdvancedFilters } from "@/types/admin/link-building-order";

const COLUMNS: AdvancedFilterColumn[] = [
  { key: "status", label: "Status", kind: "option", options: ["Live", "Writing"] },
  { key: "link_type", label: "Link Type", kind: "option", options: ["DR 30+ External"] },
  { key: "keyword", label: "Keyword", kind: "text" },
  { key: "dr_lbs", label: "DR", kind: "number" },
  { key: "request_date", label: "Request Date", kind: "date" },
];

const live_rule = createAdvancedFilterRule({ key: "status", operator: "is_any_of", values: ["Live"] });
const dr_rule = createAdvancedFilterRule({ key: "dr_lbs", operator: "is_between", value: "30", value_to: "60" });

describe("toAdvancedFiltersPayload", () => {
  it("returns undefined when no rule is complete and enabled", () => {
    expect(toAdvancedFiltersPayload(EMPTY_ADVANCED_FILTERS)).toBeUndefined();
    expect(
      toAdvancedFiltersPayload({
        operator: "and",
        rules: [
          createAdvancedFilterRule(),
          createAdvancedFilterRule({ key: "keyword", operator: "text_contains", value: "  " }),
          { ...live_rule, is_disabled: true },
        ],
        groups: [],
      })
    ).toBeUndefined();
  });

  it("maps is / is not to values filters and the other conditions to condition filters", () => {
    const payload = toAdvancedFiltersPayload({
      operator: "or",
      rules: [
        live_rule,
        createAdvancedFilterRule({ key: "link_type", operator: "is_none_of", values: ["DR 30+ External"] }),
        createAdvancedFilterRule({ key: "keyword", operator: "is_empty" }),
      ],
      groups: [{ id: "g1", operator: "and", rules: [dr_rule, createAdvancedFilterRule()] }],
    });

    expect(payload).toEqual({
      operator: "or",
      rules: [
        { key: "status", type: "values", mode: "include", values: ["Live"] },
        { key: "link_type", type: "values", mode: "exclude", values: ["DR 30+ External"] },
        { key: "keyword", type: "condition", operator: "is_empty", value: undefined, value_to: undefined },
      ],
      groups: [
        { operator: "and", rules: [{ key: "dr_lbs", type: "condition", operator: "is_between", value: "30", value_to: "60" }] },
      ],
    });
  });

  it("drops groups whose rules are all incomplete or paused", () => {
    const payload = toAdvancedFiltersPayload({
      operator: "and",
      rules: [live_rule],
      groups: [{ id: "g1", operator: "or", rules: [{ ...dr_rule, is_disabled: true }] }],
    });

    expect(payload?.groups).toEqual([]);
  });
});

describe("normalizeAdvancedFilters", () => {
  it("returns the empty state for anything that is not an object", () => {
    expect(normalizeAdvancedFilters(null)).toEqual(EMPTY_ADVANCED_FILTERS);
    expect(normalizeAdvancedFilters(["nope"])).toEqual(EMPTY_ADVANCED_FILTERS);
  });

  it("restores nulls from the API, drops unknown columns and operators, and removes empty groups", () => {
    const restored = normalizeAdvancedFilters(
      {
        operator: "or",
        rules: [
          { id: "r1", key: "status", operator: "is_any_of", value: null, value_to: null, values: [null, "Live"] },
          { id: "r2", key: "removed_column", operator: "is_empty" },
          { id: "r3", key: "keyword", operator: "drop_table", value: "x" },
          { key: null, operator: "is_empty" },
        ],
        groups: [
          { id: "g1", operator: "sideways", rules: [{ id: "r4", key: "dr_lbs", operator: "greater_than", value: "50", is_disabled: true }] },
          { id: "g2", operator: "and", rules: [{ key: "removed_column" }] },
        ],
      },
      (key) => COLUMNS.some((column) => column.key === key)
    );

    expect(restored.operator).toBe("or");
    expect(restored.rules).toHaveLength(3);
    expect(restored.rules[0]).toMatchObject({ id: "r1", value: "", value_to: "", values: ["", "Live"] });
    expect(restored.rules[1]).toMatchObject({ id: "r3", key: "keyword", operator: null });
    // A rule without a column has no condition either, and gets a fresh id.
    expect(restored.rules[2].operator).toBeNull();
    expect(restored.rules[2].id).toMatch(/^rule_/);
    expect(restored.groups).toHaveLength(1);
    expect(restored.groups[0]).toMatchObject({ id: "g1", operator: "and" });
    expect(restored.groups[0].rules[0]).toMatchObject({ key: "dr_lbs", is_disabled: true });
  });
});

describe("rule editing", () => {
  it("keeps the condition and value when the new column is of the same kind", () => {
    const rule = createAdvancedFilterRule({ key: "status", operator: "is_none_of", values: ["Live"] });
    expect(getColumnChangePatch(rule, COLUMNS[0], COLUMNS[1])).toEqual({
      key: "link_type",
      operator: "is_none_of",
      value: "",
      value_to: "",
      values: [],
    });
  });

  it("falls back to the default condition when the new column does not support the old one", () => {
    const rule = createAdvancedFilterRule({ key: "keyword", operator: "text_contains", value: "hosting" });
    expect(getColumnChangePatch(rule, COLUMNS[2], COLUMNS[3])).toMatchObject({
      key: "dr_lbs",
      operator: "is_equal_to",
      value: "",
    });
  });

  it("only clears values when the new condition needs a different kind of value", () => {
    const rule = createAdvancedFilterRule({ key: "dr_lbs", operator: "greater_than", value: "40" });
    expect(getOperatorChangePatch(rule, "less_than")).toEqual({ operator: "less_than" });
    expect(getOperatorChangePatch(rule, "is_between")).toEqual({ operator: "is_between", value: "40", value_to: "", values: [] });
    expect(getOperatorChangePatch(rule, "is_empty")).toEqual({ operator: "is_empty", value: "", value_to: "", values: [] });
  });
});

describe("describeAdvancedFilters", () => {
  it("reads like a sentence, with multi rule groups in parentheses", () => {
    const filters: LinkBuildingOrderAdvancedFilters = {
      operator: "or",
      rules: [live_rule],
      groups: [
        {
          id: "g1",
          operator: "and",
          rules: [dr_rule, createAdvancedFilterRule({ key: "request_date", operator: "date_is_after", value: "2026-01-31" })],
        },
      ],
    };

    expect(describeAdvancedFilters(filters, COLUMNS)).toBe(
      "Status is Live or (DR is between 30 and 60 and Request Date is after 01/31/2026)"
    );
    expect(countActiveAdvancedRules(filters)).toBe(3);
  });
});

describe("saved filter integration", () => {
  it("compares advanced filters without looking at their client side ids", () => {
    const a = { ...EMPTY_FILTER_STATE, advanced_filters: { operator: "and" as const, rules: [live_rule], groups: [] } };
    const b = {
      ...EMPTY_FILTER_STATE,
      advanced_filters: { operator: "and" as const, rules: [{ ...live_rule, id: "another_id" }], groups: [] },
    };
    const c = { ...EMPTY_FILTER_STATE, advanced_filters: { operator: "or" as const, rules: [live_rule], groups: [] } };

    expect(areFilterStatesEqual(a, b)).toBe(true);
    expect(areFilterStatesEqual(a, c)).toBe(false);
    expect(areFilterStatesEqual(a, EMPTY_FILTER_STATE)).toBe(false);
  });

  it("counts every active advanced rule as one filter", () => {
    const state = {
      ...EMPTY_FILTER_STATE,
      status: "Live",
      advanced_filters: { operator: "and" as const, rules: [live_rule, createAdvancedFilterRule()], groups: [] },
    };
    expect(countActiveFilters(state)).toBe(2);
  });
});
