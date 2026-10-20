/**
 * Tests for the Link Building Orders saved filter helpers: restoring a snapshot
 * returned by the API and comparing two table states.
 */

import {
  EMPTY_FILTER_STATE,
  normalizeFilterState,
  areFilterStatesEqual,
  countActiveFilters,
} from "@/lib/link-building-saved-filters";
import type { LinkBuildingOrderFilterState } from "@/types/admin/link-building-order";

function makeState(overrides: Partial<LinkBuildingOrderFilterState> = {}): LinkBuildingOrderFilterState {
  return { ...EMPTY_FILTER_STATE, ...overrides };
}

describe("normalizeFilterState", () => {
  it("returns the empty state for anything that is not an object", () => {
    expect(normalizeFilterState(null)).toEqual(EMPTY_FILTER_STATE);
    expect(normalizeFilterState("nope")).toEqual(EMPTY_FILTER_STATE);
  });

  it("turns the nulls the API sends back for empty strings into empty strings", () => {
    const state = normalizeFilterState({
      search: null,
      status: "Live",
      sheet_filters: {
        link_builder: { condition: null, values: { mode: "include", values: [null, "Jane"] } },
        dr_lbs: { condition: { operator: "greater_than", value: "40", value_to: null }, values: null },
      },
    });

    expect(state.search).toBe("");
    expect(state.status).toBe("Live");
    expect(state.sheet_filters.link_builder?.values).toEqual({ mode: "include", values: ["", "Jane"] });
    expect(state.sheet_filters.dr_lbs?.condition).toEqual({ operator: "greater_than", value: "40", value_to: "" });
  });

  it("drops column filters and hidden columns that are not known columns", () => {
    const state = normalizeFilterState(
      {
        sheet_filters: {
          status: { condition: null, values: { mode: "include", values: ["Live"] } },
          removed_column: { condition: null, values: { mode: "include", values: ["x"] } },
        },
        hidden_columns: ["notes", "removed_column", "notes"],
      },
      new Set(["status", "notes"])
    );

    expect(Object.keys(state.sheet_filters)).toEqual(["status"]);
    expect(state.hidden_columns).toEqual(["notes"]);
  });

  it("drops inactive column filters and malformed sort rules", () => {
    const state = normalizeFilterState({
      sheet_filters: { notes: { condition: null, values: { mode: "exclude", values: [] } } },
      sort_rules: [{ key: "order_id", direction: "sideways" }, { key: "request_date", direction: "asc" }],
    });

    expect(state.sheet_filters).toEqual({});
    expect(state.sort_rules).toEqual([{ key: "request_date", direction: "asc", nulls_last: true }]);
  });
});

describe("areFilterStatesEqual", () => {
  it("ignores the order of hidden columns, column filters and checked values", () => {
    const a = makeState({
      hidden_columns: ["notes", "article"],
      sheet_filters: {
        status: { condition: null, values: { mode: "include", values: ["Live", "Pending"] } },
        client: { condition: { operator: "text_contains", value: "acme", value_to: "" }, values: null },
      },
    });
    const b = makeState({
      hidden_columns: ["article", "notes"],
      sheet_filters: {
        client: { condition: { operator: "text_contains", value: "acme ", value_to: "" }, values: null },
        status: { condition: null, values: { mode: "include", values: ["Pending", "Live"] } },
      },
    });

    expect(areFilterStatesEqual(a, b)).toBe(true);
  });

  it("detects a changed toolbar filter or sort direction", () => {
    const base = makeState({ status: "Live", sort_rules: [{ key: "order_id", direction: "desc" }] });

    expect(areFilterStatesEqual(base, { ...base, status: "Pending" })).toBe(false);
    expect(areFilterStatesEqual(base, { ...base, sort_rules: [{ key: "order_id", direction: "asc" }] })).toBe(false);
  });
});

describe("countActiveFilters", () => {
  it("counts toolbar and column filters but not sorting or hidden columns", () => {
    const state = makeState({
      search: "acme",
      needs_lb_tl_approval: true,
      sort_rules: [{ key: "client", direction: "asc" }],
      hidden_columns: ["notes"],
      sheet_filters: { status: { condition: null, values: { mode: "include", values: ["Live"] } } },
    });

    expect(countActiveFilters(state)).toBe(3);
  });
});
