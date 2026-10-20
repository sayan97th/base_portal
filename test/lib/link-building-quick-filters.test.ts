/**
 * Tests for the Link Building Orders "Quick filters" helpers: building the value
 * pills of each column and toggling picks.
 */

import {
  ASSIGNED_USER_QUICK_FILTER_KEY,
  buildQuickFilterFacets,
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

describe("toggleQuickFilterValue", () => {
  it("adds a value that is not picked and removes one that is", () => {
    expect(toggleQuickFilterValue(["Live"], "Pending")).toEqual(["Live", "Pending"]);
    expect(toggleQuickFilterValue(["Live", "Pending"], "Live")).toEqual(["Pending"]);
  });
});
