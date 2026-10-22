/**
 * Tests for the Link Building Orders "Quick filters" helpers: building the value
 * pills of each column and toggling picks.
 */

import {
  ASSIGNED_USER_QUICK_FILTER_KEY,
  CLIENT_ACCOUNT_QUICK_FILTER_KEY,
  buildQuickFilterFacets,
  getServerSearchColumnKeys,
  toggleQuickFilterValue,
  type QuickFilterColumn,
} from "@/lib/link-building-quick-filters";

const COLUMNS: QuickFilterColumn[] = [
  { key: "status", label: "Status", options: ["New Request", "Live"], dot_classes: { Live: "bg-green-500" }, default_dot_class: "bg-gray-400" },
  { key: ASSIGNED_USER_QUICK_FILTER_KEY, label: "Assigned To" },
  { key: "client", label: "Company" },
];

const USERS = [
  { id: 7, name: "Collin Porter", avatar_url: null },
  { id: 9, name: "Josh Moody", avatar_url: "https://example.com/josh.png" },
];

describe("buildQuickFilterFacets", () => {
  const facets = buildQuickFilterFacets({
    columns: COLUMNS,
    values_by_column: {
      status: { values: [{ value: "", count: 1 }, { value: "Live", count: 4 }, { value: "Custom", count: 2 }], has_more: false },
      [ASSIGNED_USER_QUICK_FILTER_KEY]: {
        values: [{ value: "9", count: 2 }, { value: "", count: 5 }, { value: "7", count: 1 }],
        has_more: false,
      },
      client: { values: [{ value: "Acme", count: 3 }], has_more: true },
    },
    selections: { status: ["Ready"], client: ["Acme"] },
    users: USERS,
    current_user_id: 7,
  });

  it("lists fixed options first, then other data values, then stale picks, and blanks last", () => {
    expect(facets[0].options.map((option) => [option.label, option.count, option.dot_class])).toEqual([
      ["New Request", 0, "bg-gray-400"],
      ["Live", 4, "bg-green-500"],
      ["Custom", 2, "bg-gray-400"],
      ["Ready", 0, "bg-gray-400"],
      ["(Blanks)", 1, "bg-gray-400"],
    ]);
    expect(facets[0].selected_values).toEqual(["Ready"]);
  });

  it("shows the current user as Me first, other admins by name, and Unassigned last", () => {
    expect(facets[1].options.map((option) => [option.value, option.label, option.count])).toEqual([
      ["7", "Me", 1],
      ["9", "Josh Moody", 2],
      ["0", "Unassigned", 5],
    ]);
    expect(facets[1].options[1].avatar).toEqual({ name: "Josh Moody", url: "https://example.com/josh.png" });
    expect(facets[1].selected_values).toEqual([]);
  });

  it("passes has_more through for columns with more values than listed", () => {
    expect(facets[2]).toMatchObject({ has_more: true, selected_values: ["Acme"] });
    expect(facets[2].options[0].dot_class).toBeUndefined();
  });
});

describe("buildQuickFilterFacets for Client Account", () => {
  const [facet] = buildQuickFilterFacets({
    columns: [{ key: CLIENT_ACCOUNT_QUICK_FILTER_KEY, label: "Client Account" }],
    values_by_column: {
      [CLIENT_ACCOUNT_QUICK_FILTER_KEY]: {
        values: [{ value: "12", count: 3 }, { value: "", count: 8 }, { value: "4", count: 1 }, { value: "99", count: 2 }],
        has_more: false,
      },
    },
    selections: { [CLIENT_ACCOUNT_QUICK_FILTER_KEY]: ["12"] },
    users: USERS,
    client_users: [
      { id: 12, name: "Wayne Enterprises", avatar_url: null },
      { id: 4, name: "Acme Corp", avatar_url: null },
    ],
    // Never shown as "Me", the current admin is not a client account.
    current_user_id: 12,
  });

  it("lists client accounts by name, unknown ids by number, and rows without an account last", () => {
    expect(facet.options.map((option) => [option.value, option.label, option.count])).toEqual([
      ["4", "Acme Corp", 1],
      ["99", "Client #99", 2],
      ["12", "Wayne Enterprises", 3],
      ["0", "No client account", 8],
    ]);
    expect(facet.selected_values).toEqual(["12"]);
  });
});

describe("getServerSearchColumnKeys", () => {
  const values_by_column = {
    status: { values: [], has_more: false },
    client: { values: [], has_more: true },
    pen_name: { values: [], has_more: true },
    [ASSIGNED_USER_QUICK_FILTER_KEY]: { values: [], has_more: true },
  };
  const columns: QuickFilterColumn[] = [
    { key: "status", label: "Status" },
    { key: "client", label: "Company" },
    { key: "pen_name", label: "Pen Name" },
    { key: ASSIGNED_USER_QUICK_FILTER_KEY, label: "Assigned To" },
  ];

  it("searches only value columns that list their top values", () => {
    expect(getServerSearchColumnKeys(columns, values_by_column, " wayne ")).toEqual(["client", "pen_name"]);
  });

  it("skips columns whose name matches, since they keep every value", () => {
    expect(getServerSearchColumnKeys(columns, values_by_column, "comp")).toEqual(["pen_name"]);
  });

  it("searches nothing without search text", () => {
    expect(getServerSearchColumnKeys(columns, values_by_column, "  ")).toEqual([]);
  });
});

describe("toggleQuickFilterValue", () => {
  it("adds a value that is not picked and removes one that is", () => {
    expect(toggleQuickFilterValue(["Live"], "Pending")).toEqual(["Live", "Pending"]);
    expect(toggleQuickFilterValue(["Live", "Pending"], "Live")).toEqual(["Pending"]);
  });
});
