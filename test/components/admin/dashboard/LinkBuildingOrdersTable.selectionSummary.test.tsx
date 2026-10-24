/**
 * Google Sheets style selection summary of the admin "Link Building Orders" table:
 * selecting two or more cells shows Sum (numbers) or Count (text) in the footer,
 * next to the page controls, with a menu to pick Sum, Average, Min, Max, Count or
 * Count Numbers. Values are read as the cells show them, formula results included.
 */

import React from "react";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import LinkBuildingOrdersTable from "@/components/admin/dashboard/LinkBuildingOrdersTable";
import {
  listLinkBuildingOrders,
  updateLinkBuildingOrder,
  listAdminUsersForSelect,
  listClientUsersForSelect,
  batchUpdateLinkBuildingOrderCells,
} from "@/services/admin/link-building-dashboard.service";
import { listSheetFormulas } from "@/services/admin/link-building-sheet-formulas.service";
import type { LinkBuildingOrderRow } from "@/types/admin/link-building-order";

// ─── Module mocks ────────────────────────────────────────────────────────────

jest.mock("@/services/admin/link-building-dashboard.service", () => {
  const actual = jest.requireActual("@/services/admin/link-building-dashboard.service");
  return {
    ...actual,
    listLinkBuildingOrders: jest.fn(),
    createLinkBuildingOrder: jest.fn(),
    updateLinkBuildingOrder: jest.fn(),
    deleteLinkBuildingOrder: jest.fn(),
    exportLinkBuildingOrders: jest.fn(),
    batchUpdateLinkBuildingOrders: jest.fn(),
    batchUpdateLinkBuildingOrderCells: jest.fn(),
    getLinkBuildingOrderColumnValues: jest.fn(),
    getLinkBuildingOrderFilterValues: jest.fn(),
    listAdminUsersForSelect: jest.fn(),
    listClientUsersForSelect: jest.fn(),
    listPenNamesForSelect: jest.fn().mockResolvedValue([]),
    getNeedsLbTlApprovalCount: jest.fn().mockResolvedValue(0),
    getLinkBuildingOrderQuickFilterValues: jest.fn().mockResolvedValue({ data: {}, total: 0 }),
  };
});

jest.mock("@/services/admin/link-building-saved-filters.service", () => ({
  listSavedFilters: jest.fn().mockResolvedValue([]),
  createSavedFilter: jest.fn(),
  updateSavedFilter: jest.fn(),
  deleteSavedFilter: jest.fn(),
  getFilterPreference: jest.fn().mockResolvedValue({ filters: null, applied_saved_filter_id: null, updated_at: null }),
  saveFilterPreference: jest.fn().mockResolvedValue({ filters: null, applied_saved_filter_id: null, updated_at: null }),
}));

jest.mock("@/services/admin/link-building-sheet-formulas.service", () => ({
  listSheetFormulas: jest.fn(),
  createFormulaColumn: jest.fn(),
  updateFormulaColumn: jest.fn(),
  deleteFormulaColumn: jest.fn(),
  saveSummaryFormula: jest.fn(),
}));

jest.mock("@/hooks/useTableSort", () => {
  const stable_sort_rules: unknown[] = [];
  return {
    useTableSort: () => ({
      sort_rules: stable_sort_rules,
      toggleSort: jest.fn(),
      setSort: jest.fn(),
      clearSort: jest.fn(),
      replaceSort: jest.fn(),
    }),
  };
});

jest.mock("@/hooks/useDebounce", () => ({
  useDebounce: (value: unknown) => value,
}));

jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { id: 1, first_name: "Admin", last_name: "User", profile_photo_url: null },
  }),
}));

jest.mock("@/hooks/useLinkBuildingCollaboration", () => ({
  useLinkBuildingCollaboration: () => ({
    collaborators: [],
    row_editors: new Map(),
    ready_state: "disconnected",
    local_session_id: "test-session",
    sendRowFocus: jest.fn(),
    sendRowBlur: jest.fn(),
    sendRowSelect: jest.fn(),
  }),
}));

jest.mock("@/components/admin/dashboard/LinkBuildingOrderImportModal", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/admin/dashboard/UserSelectFilterDropdown", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/admin/dashboard/ClientAssignCell", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/admin/dashboard/ClientSearchableSelect", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/admin/dashboard/AdminSearchableSelect", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/admin/dashboard/CollaborationBar", () => ({ __esModule: true, default: () => null }));
jest.mock("@/components/admin/dashboard/RowPresenceIndicator", () => ({
  __esModule: true,
  default: () => null,
  CellPresenceOverlay: () => null,
  RowPresenceFloater: () => null,
}));

const mockListLinkBuildingOrders = listLinkBuildingOrders as jest.MockedFunction<typeof listLinkBuildingOrders>;
const mockUpdateLinkBuildingOrder = updateLinkBuildingOrder as jest.MockedFunction<typeof updateLinkBuildingOrder>;
const mockBatchUpdateLinkBuildingOrderCells = batchUpdateLinkBuildingOrderCells as jest.MockedFunction<
  typeof batchUpdateLinkBuildingOrderCells
>;
const mockListSheetFormulas = listSheetFormulas as jest.MockedFunction<typeof listSheetFormulas>;
// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<LinkBuildingOrderRow> = {}): LinkBuildingOrderRow {
  return {
    id: "uuid-1",
    order_id: "BL-1",
    team_specific_link_id: "",
    link_type: "DR 30+ External",
    client: "Acme Corp",
    keyword: "seo tools",
    landing_page: "https://acme.com",
    exact_match: "No",
    notes: "",
    internal_notes: "",
    request_date: "10/01/2026",
    estimated_delivery_date: "10/31/2026",
    estimated_turnaround_days: "30",
    link_builder: "",
    pen_name: "",
    partnership: "",
    partnership_check: "",
    article_title: "",
    article: "",
    status: "New Request",
    live_link: "",
    live_link_date: "",
    dr_lbs: "40",
    posting_fee_lbs: "",
    current_traffic: "",
    dr_formula: "",
    current_poc: "",
    current_price: "",
    lb_tl_approval: "",
    approval_date: "",
    final_price: "",
    currency: "USD",
    user_id: null,
    admin_team_id: null,
    assigned_admin_user_id: null,
    cell_formulas: null,
    ...overrides,
  };
}

async function renderTable(rows: LinkBuildingOrderRow[]): Promise<HTMLElement> {
  mockListLinkBuildingOrders.mockResolvedValue({
    data: rows,
    current_page: 1,
    last_page: 1,
    per_page: 50,
    total: rows.length,
    from: rows.length > 0 ? 1 : null,
    to: rows.length,
  });
  render(<LinkBuildingOrdersTable />);
  await screen.findByText(rows[0].order_id);
  return screen.getByRole("grid");
}


// ─── Helpers ─────────────────────────────────────────────────────────────────

const row1 = makeRow({ id: "uuid-1", order_id: "BL-1", keyword: "seo tools", dr_lbs: "47", final_price: "$1,200.00" });
const row2 = makeRow({ id: "uuid-2", order_id: "BL-2", keyword: "ppc ads", dr_lbs: "13", final_price: "€300.00", currency: "EUR" });
const row3 = makeRow({ id: "uuid-3", order_id: "BL-3", keyword: "", dr_lbs: "", final_price: "" });

/** The <td> showing a value, found by its text so the test does not depend on column positions. */
function cellWithText(grid: HTMLElement, text: string): HTMLTableCellElement {
  const cell = within(grid)
    .getAllByText(text)
    .map((el) => el.closest("td"))
    .find((td): td is HTMLTableCellElement => td !== null);
  if (!cell) throw new Error(`No cell shows "${text}"`);
  return cell;
}

/** The cell in the same column as `cell`, `offset` rows below it. */
function cellBelow(grid: HTMLElement, cell: HTMLTableCellElement, offset: number): HTMLTableCellElement {
  const rows = Array.from(grid.querySelectorAll("tbody tr"));
  const row_idx = rows.indexOf(cell.closest("tr") as HTMLTableRowElement);
  const col_idx = Array.from(cell.parentElement!.children).indexOf(cell);
  return rows[row_idx + offset].children[col_idx] as HTMLTableCellElement;
}

/** A plain click (mouse down and up on the same cell) only selects the cell. */
function selectCell(cell: HTMLElement): void {
  fireEvent.mouseDown(cell);
  fireEvent.mouseUp(cell);
}

/** Click and drag from one cell to another. React reads mouseover as mouse enter. */
function dragSelect(from_cell: HTMLElement, to_cell: HTMLElement): void {
  fireEvent.mouseDown(from_cell);
  fireEvent.mouseOver(to_cell);
  fireEvent.mouseUp(to_cell);
}

/** Selects `row_count` cells of a column, starting at `first_cell`, with Shift+Arrow Down. */
function selectDown(grid: HTMLElement, first_cell: HTMLElement, row_count: number): void {
  selectCell(first_cell);
  for (let step = 1; step < row_count; step += 1) fireEvent.keyDown(grid, { key: "ArrowDown", shiftKey: true });
}

function summaryButton(): HTMLElement {
  return screen.getByRole("button", { name: /^(Sum|Average|Min|Max|Count|Count Numbers):/ });
}

function querySummaryButton(): HTMLElement | null {
  return screen.queryByRole("button", { name: /^(Sum|Average|Min|Max|Count|Count Numbers):/ });
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  (listAdminUsersForSelect as jest.Mock).mockResolvedValue([]);
  (listClientUsersForSelect as jest.Mock).mockResolvedValue([]);
  mockListSheetFormulas.mockResolvedValue({ columns: [], summary: [] });
  mockBatchUpdateLinkBuildingOrderCells.mockResolvedValue({ message: "ok", updated_count: 0, data: [] });
  mockUpdateLinkBuildingOrder.mockResolvedValue({ message: "Updated", data: row1 });
});

// ─── When the summary shows ──────────────────────────────────────────────────

describe("LinkBuildingOrdersTable: selection summary visibility", () => {
  it("shows nothing until a range of cells is selected", async () => {
    const grid = await renderTable([row1, row2, row3]);
    expect(querySummaryButton()).not.toBeInTheDocument();

    selectCell(cellWithText(grid, "47"));

    expect(querySummaryButton()).not.toBeInTheDocument();
  });

  it("appears for a dragged range, in the status footer under the grid", async () => {
    const grid = await renderTable([row1, row2, row3]);

    dragSelect(cellWithText(grid, "47"), cellWithText(grid, "13"));

    const footer = screen.getByRole("group", { name: "Table status" });
    expect(within(footer).getByRole("button", { name: /^Sum:\s*60$/ })).toBeInTheDocument();
  });

  it("is no longer shown in the formula bar", async () => {
    const grid = await renderTable([row1, row2, row3]);

    dragSelect(cellWithText(grid, "47"), cellWithText(grid, "13"));

    expect(screen.getAllByText("Sum:")).toHaveLength(1);
    expect(screen.queryByText("Average:")).not.toBeInTheDocument();
  });

  it("goes away when the selection is cleared with Escape", async () => {
    const grid = await renderTable([row1, row2, row3]);
    selectDown(grid, cellWithText(grid, "47"), 2);
    expect(summaryButton()).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(querySummaryButton()).not.toBeInTheDocument();
  });
});

// ─── What it counts ──────────────────────────────────────────────────────────

describe("LinkBuildingOrdersTable: selection summary values", () => {
  it("sums a number column and skips its empty cells", async () => {
    const grid = await renderTable([row1, row2, row3]);

    selectDown(grid, cellWithText(grid, "47"), 3);

    expect(summaryButton()).toHaveAccessibleName(/^Sum:\s*60$/);
    fireEvent.click(summaryButton());
    const items = screen.getAllByRole("menuitemradio").map((item) => item.textContent);
    expect(items).toEqual(["Sum60", "Average30", "Min13", "Max47", "Count2", "Count Numbers2"]);
    expect(within(screen.getByRole("menu")).getByText("3 cells selected")).toBeInTheDocument();
  });

  it("counts the filled cells of a text column, offering only the counts", async () => {
    const grid = await renderTable([row1, row2, row3]);

    selectDown(grid, cellWithText(grid, "seo tools"), 3);

    expect(summaryButton()).toHaveAccessibleName(/^Count:\s*2$/);
    fireEvent.click(summaryButton());
    expect(screen.getAllByRole("menuitemradio").map((item) => item.textContent)).toEqual(["Count2", "Count Numbers0"]);
  });

  it("adds up dollar and euro prices as the API formats them", async () => {
    const grid = await renderTable([row1, row2, row3]);

    selectDown(grid, cellWithText(grid, "$1,200.00"), 2);

    expect(summaryButton()).toHaveAccessibleName(/^Sum:\s*1,500$/);
  });

  it("reads a formula cell as the result it shows, not the stale value stored in the row", async () => {
    // The stored "80" is stale, the cell shows =[dr_lbs]*2 with DR 47, so $94.00.
    const formula_row = makeRow({ ...row1, final_price: "80", cell_formulas: { final_price: "=[dr_lbs:~0]*2" } });
    const grid = await renderTable([formula_row, row2]);

    selectDown(grid, cellWithText(grid, "$94.00"), 2);

    expect(summaryButton()).toHaveAccessibleName(/^Sum:\s*394$/);
  });

  it("covers every cell of a range spanning several columns", async () => {
    // Est. Turnaround sits between Keyword and DR. Emptied so DR is the only number in the range.
    const grid = await renderTable([
      { ...row1, estimated_turnaround_days: "" },
      { ...row2, estimated_turnaround_days: "" },
    ]);
    const dr_cell = cellWithText(grid, "47");
    const keyword_cell = cellWithText(grid, "seo tools");

    // From Keyword on row 1 to DR on row 2: the text cells add to Count, the DR cells to Sum.
    dragSelect(keyword_cell, cellBelow(grid, dr_cell, 1));

    expect(summaryButton()).toHaveAccessibleName(/^Sum:\s*60$/);
    fireEvent.click(summaryButton());
    expect(screen.getByRole("menuitemradio", { name: /Count Numbers/ })).toHaveTextContent("Count Numbers2");
    const count_text = screen
      .getAllByRole("menuitemradio")
      .map((item) => item.textContent ?? "")
      .find((text) => /^Count\d/.test(text));
    expect(Number(count_text?.replace("Count", ""))).toBeGreaterThan(2);
  });

  it("counts other number columns caught in the range, like Google Sheets", async () => {
    const grid = await renderTable([row1, row2]);

    // Est. Turnaround (30 on both rows) is between Keyword and DR, so it is summed too.
    dragSelect(cellWithText(grid, "seo tools"), cellBelow(grid, cellWithText(grid, "47"), 1));

    expect(summaryButton()).toHaveAccessibleName(/^Sum:\s*120$/);
  });
});

// ─── Picking a statistic ─────────────────────────────────────────────────────

describe("LinkBuildingOrdersTable: choosing the selection summary statistic", () => {
  it("shows the picked statistic and keeps it for the next numeric selection", async () => {
    const grid = await renderTable([row1, row2, row3]);
    const dr_cell = cellWithText(grid, "47");
    selectDown(grid, dr_cell, 2);

    fireEvent.click(summaryButton());
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Max/ }));

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(summaryButton()).toHaveAccessibleName(/^Max:\s*47$/);

    // Text only: Max does not apply, so it falls back to Count.
    selectDown(grid, cellWithText(grid, "seo tools"), 2);
    expect(summaryButton()).toHaveAccessibleName(/^Count:\s*2$/);

    // Back on numbers, the picked Max is used again.
    selectDown(grid, dr_cell, 2);
    expect(summaryButton()).toHaveAccessibleName(/^Max:\s*47$/);
  });

  it("closes its menu with Escape without clearing the selection", async () => {
    const grid = await renderTable([row1, row2, row3]);
    selectDown(grid, cellWithText(grid, "47"), 2);
    fireEvent.click(summaryButton());
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(summaryButton()).toHaveAccessibleName(/^Sum:\s*60$/);
  });

  it("keeps the arrow keys working on the grid after using the menu", async () => {
    const grid = await renderTable([row1, row2, row3]);
    selectDown(grid, cellWithText(grid, "47"), 2);
    fireEvent.click(summaryButton());
    fireEvent.click(screen.getByRole("menuitemradio", { name: /Average/ }));

    fireEvent.keyDown(grid, { key: "ArrowDown", shiftKey: true });

    // The third DR cell is empty, so the average of the filled ones stays the same.
    expect(summaryButton()).toHaveAccessibleName(/^Average:\s*30$/);
    expect(screen.getByTitle("Active cell").textContent).toMatch(/1:\D+3$/);
  });
});
