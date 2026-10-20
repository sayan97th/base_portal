/**
 * Tests for the Link Building Orders filtered column markers: which column
 * headers are marked as filtered, from which source, and their tooltips.
 */

import {
  ASSIGNED_USER_COLUMN_KEY,
  CLIENT_ACCOUNT_COLUMN_KEY,
  describeColumnFilterIndicator,
  describeColumnFilterSources,
  getFilteredColumns,
  type FilteredColumnsInput,
} from "@/lib/link-building-filtered-columns";
import { EMPTY_ADVANCED_FILTERS, createAdvancedFilterRule } from "@/lib/link-building-advanced-filters";
import type { AdvancedFilterColumn } from "@/lib/link-building-advanced-filters";

const ADVANCED_COLUMNS: AdvancedFilterColumn[] = [
  { key: "status", label: "Status", kind: "option" },
  { key: "dr_lbs", label: "DR", kind: "number" },
  { key: "keyword", label: "Keyword", kind: "text" },
];

function buildInput(overrides: Partial<FilteredColumnsInput> = {}): FilteredColumnsInput {
  return {
    sheet_filters: {},
    advanced_filters: EMPTY_ADVANCED_FILTERS,
    advanced_filter_columns: ADVANCED_COLUMNS,
    status_filter: "",
    link_type_filter: "",
    client_filter: "",
    needs_approval_filter: false,
    client_account_filter_label: null,
    assigned_user_filter_label: null,
    ...overrides,
  };
}

describe("getFilteredColumns", () => {
  it("marks nothing when no filter is applied", () => {
    expect(getFilteredColumns(buildInput())).toEqual({});
  });

  it("marks columns with an active column filter and skips empty ones", () => {
    const filtered_columns = getFilteredColumns(
      buildInput({
        sheet_filters: {
          link_type: { condition: null, values: { mode: "include", values: ["DR 40+ External"] } },
          keyword: { condition: null, values: { mode: "exclude", values: [] } },
        },
      })
    );

    expect(Object.keys(filtered_columns)).toEqual(["link_type"]);
    expect(filtered_columns.link_type.sources).toEqual(["column"]);
  });

  it("maps the toolbar quick filters and user pickers to their columns", () => {
    const filtered_columns = getFilteredColumns(
      buildInput({
        status_filter: "Live",
        link_type_filter: "Guest Post",
        client_filter: "  Acme ",
        client_account_filter_label: "Acme Inc",
        assigned_user_filter_label: "Unassigned",
      })
    );

    expect(filtered_columns.status.descriptions).toEqual(["Quick filter: Live"]);
    expect(filtered_columns.link_type.descriptions).toEqual(["Quick filter: Guest Post"]);
    expect(filtered_columns.client.descriptions).toEqual(['Quick filter: contains "Acme"']);
    expect(filtered_columns[CLIENT_ACCOUNT_COLUMN_KEY].descriptions).toEqual(["Quick filter: Acme Inc"]);
    expect(filtered_columns[ASSIGNED_USER_COLUMN_KEY].descriptions).toEqual(["Quick filter: Unassigned"]);
  });

  it("prefers the needs approval filter over the status filter", () => {
    const filtered_columns = getFilteredColumns(buildInput({ status_filter: "Live", needs_approval_filter: true }));
    expect(filtered_columns.status.descriptions).toEqual(["Quick filter: Live, needs LB TL Approval"]);
  });

  it("marks columns of active advanced rules, inside groups too, and skips paused or incomplete rules", () => {
    const filtered_columns = getFilteredColumns(
      buildInput({
        advanced_filters: {
          operator: "or",
          rules: [
            createAdvancedFilterRule({ key: "dr_lbs", operator: "greater_than", value: "50" }),
            createAdvancedFilterRule({ key: "keyword", operator: "text_contains", value: "seo", is_disabled: true }),
            createAdvancedFilterRule({ key: "keyword", operator: "text_contains", value: "" }),
          ],
          groups: [
            {
              id: "group_1",
              operator: "and",
              rules: [createAdvancedFilterRule({ key: "status", operator: "is_any_of", values: ["Live"] })],
            },
          ],
        },
      })
    );

    expect(Object.keys(filtered_columns).sort()).toEqual(["dr_lbs", "status"]);
    expect(filtered_columns.dr_lbs.sources).toEqual(["advanced"]);
    expect(filtered_columns.status.sources).toEqual(["advanced"]);
  });

  it("combines every source that filters the same column", () => {
    const filtered_columns = getFilteredColumns(
      buildInput({
        status_filter: "Live",
        sheet_filters: { status: { condition: null, values: { mode: "include", values: ["Live"] } } },
        advanced_filters: {
          operator: "and",
          rules: [createAdvancedFilterRule({ key: "status", operator: "is_any_of", values: ["Live"] })],
          groups: [],
        },
      })
    );

    expect(filtered_columns.status.sources).toEqual(["column", "quick", "advanced"]);
    expect(filtered_columns.status.descriptions).toHaveLength(3);
  });
});

describe("describeColumnFilterIndicator", () => {
  it("lists the column name and every filter on its own line", () => {
    expect(
      describeColumnFilterIndicator("Status", {
        sources: ["quick", "advanced"],
        descriptions: ["Quick filter: Live", "Advanced filter: is Live"],
      })
    ).toBe("Status is filtered\nQuick filter: Live\nAdvanced filter: is Live");
  });
});

describe("describeColumnFilterSources", () => {
  it("names a single source", () => {
    expect(describeColumnFilterSources({ sources: ["column"], descriptions: ["x"] })).toBe("filtered by column filter");
  });

  it("joins several sources", () => {
    expect(
      describeColumnFilterSources({ sources: ["column", "quick", "advanced"], descriptions: ["x", "y", "z"] })
    ).toBe("filtered by column, quick and advanced filters");
  });
});
