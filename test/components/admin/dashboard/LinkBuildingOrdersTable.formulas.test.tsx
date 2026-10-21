/**
 * Spreadsheet formulas in the admin "Link Building Orders" table:
 *  - a formula typed into a cell is saved with its result, references stored by column key;
 *  - formula cells show their result, and the formula bar shows the formula;
 *  - columns that only take fixed values reject formulas;
 *  - results recalculated after a change are saved automatically;
 *  - formula columns and the totals row;
 *  - clicking a cell while typing a formula inserts its reference, and function autocomplete.
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
import type { LinkBuildingOrderRow, LinkBuildingOrderSheetFormula } from "@/types/admin/link-building-order";

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

function sheetFormula(overrides: Partial<LinkBuildingOrderSheetFormula>): LinkBuildingOrderSheetFormula {
  return {
    id: 7,
    kind: "column",
    key: "formula_7",
    name: "Double DR",
    target_key: null,
    formula: "=[dr_lbs:~0]*2",
    format: "auto",
    position: 1,
    updated_by_name: null,
    created_at: null,
    updated_at: null,
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

function cellOf(grid: HTMLElement, text: string): HTMLTableCellElement {
  const cell = within(grid).getByText(text).closest("td");
  if (!cell) throw new Error(`No <td> ancestor found for "${text}"`);
  return cell as HTMLTableCellElement;
}

/** The empty Notes cell of the first row (the 9th data column, after the row number and checkbox). */
function notesCell(grid: HTMLElement): HTMLTableCellElement {
  const first_row = grid.querySelectorAll("tbody tr")[0];
  return first_row.querySelectorAll("td")[2 + 8] as HTMLTableCellElement;
}

function openForEditing(cell: HTMLElement): void {
  fireEvent.mouseDown(cell);
  fireEvent.mouseUp(cell);
  fireEvent.doubleClick(cell);
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  (listAdminUsersForSelect as jest.Mock).mockResolvedValue([]);
  (listClientUsersForSelect as jest.Mock).mockResolvedValue([]);
  mockListSheetFormulas.mockResolvedValue({ columns: [], summary: [] });
  mockBatchUpdateLinkBuildingOrderCells.mockResolvedValue({ message: "ok", updated_count: 0, data: [] });
});

// ─── Cell formulas ───────────────────────────────────────────────────────────

describe("LinkBuildingOrdersTable — cell formulas", () => {
  it("saves a typed formula with its result, its references stored by column key", async () => {
    const row = makeRow();
    const grid = await renderTable([row]);
    mockUpdateLinkBuildingOrder.mockImplementation(async (_id, payload) => ({
      message: "Updated",
      data: { ...row, ...(payload as Partial<LinkBuildingOrderRow>) },
    }));

    openForEditing(notesCell(grid));
    const input = within(grid).getByRole("textbox");
    fireEvent.change(input, { target: { value: '=UPPER(F1) & " / DR " & S1*2' } });
    fireEvent.blur(input);

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    const payload = mockUpdateLinkBuildingOrder.mock.calls[0][1];
    expect(payload.notes).toBe("SEO TOOLS / DR 80");
    expect(payload.cell_formulas).toEqual({ notes: '=UPPER([keyword:~0]) & " / DR " & [dr_lbs:~0]*2' });
    expect(await within(grid).findByText("SEO TOOLS / DR 80")).toBeInTheDocument();
  });

  it("shows a formula cell's result, and its formula in the formula bar", async () => {
    const grid = await renderTable([makeRow({ notes: "", cell_formulas: { notes: "=PROPER([keyword:~0])" } })]);

    const cell = cellOf(grid, "Seo Tools");
    fireEvent.mouseDown(cell);
    fireEvent.mouseUp(cell);

    expect(screen.getByTitle("Active cell").textContent).toBe("I1");
    expect(screen.getByText("=PROPER(F1)")).toBeInTheDocument();
  });

  it("opens a formula cell on its formula for editing", async () => {
    const grid = await renderTable([makeRow({ notes: "Seo Tools", cell_formulas: { notes: "=PROPER([keyword:~0])" } })]);

    openForEditing(cellOf(grid, "Seo Tools"));

    expect(within(grid).getByDisplayValue("=PROPER(F1)")).toBeInTheDocument();
  });

  it("rejects a formula in a column that only takes fixed values", async () => {
    const row = makeRow({ team_specific_link_id: "", landing_page: "https://acme.com" });
    const grid = await renderTable([row]);

    openForEditing(cellOf(grid, "acme.com"));
    const input = within(grid).getByDisplayValue("https://acme.com");
    fireEvent.change(input, { target: { value: "=F1" } });
    fireEvent.blur(input);

    expect(await screen.findByText(/Landing Page cannot hold a formula/i)).toBeInTheDocument();
    expect(mockUpdateLinkBuildingOrder).not.toHaveBeenCalled();
  });

  it("saves a result recalculated after a change, when the formula only reads its own row", async () => {
    // The stored result is stale (DR was changed elsewhere), the table saves the new one.
    const row = makeRow({ dr_lbs: "45", final_price: "80", cell_formulas: { final_price: "=[dr_lbs:~0]*2" } });
    await renderTable([row]);

    await waitFor(() => expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalled(), { timeout: 4000 });
    expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledWith([{ id: "uuid-1", fields: { final_price: "90" } }]);
  });

  it("inserts the reference of a cell clicked while a formula is typed", async () => {
    const grid = await renderTable([makeRow()]);

    openForEditing(notesCell(grid));
    const input = within(grid).getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "=", selectionStart: 1 } });
    input.setSelectionRange(1, 1);

    fireEvent.mouseDown(cellOf(grid, "seo tools"));

    expect(input.value).toBe("=F1");
    expect(document.activeElement).toBe(input);
  });

  it("saves a formula typed in the formula bar to the cell it was typed for, even after clicking another row", async () => {
    const row1 = makeRow({ id: "uuid-1", order_id: "BL-1", keyword: "seo tools", dr_lbs: "40" });
    const row2 = makeRow({ id: "uuid-2", order_id: "BL-2", keyword: "ppc ads", dr_lbs: "15" });
    const grid = await renderTable([row1, row2]);
    mockUpdateLinkBuildingOrder.mockImplementation(async (id, payload) => ({
      message: "Updated",
      data: { ...(id === "uuid-1" ? row1 : row2), ...(payload as Partial<LinkBuildingOrderRow>) },
    }));

    const notes = notesCell(grid);
    fireEvent.mouseDown(notes);
    fireEvent.mouseUp(notes);
    fireEvent.mouseDown(screen.getByText(/Notes \(Client\) is empty/));
    const bar_input = await screen.findByRole("textbox", { name: "Formula or value of the active cell" });
    fireEvent.change(bar_input, { target: { value: "=S1*3" } });

    // Clicking a cell of the second row selects it before the bar loses focus.
    fireEvent.mouseDown(cellOf(grid, "ppc ads"));
    fireEvent.blur(bar_input);

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    expect(mockUpdateLinkBuildingOrder.mock.calls[0][0]).toBe("uuid-1");
    expect(mockUpdateLinkBuildingOrder.mock.calls[0][1].notes).toBe("120");
  });

  it("suggests functions while typing and inserts the picked one", async () => {
    const grid = await renderTable([makeRow()]);

    openForEditing(notesCell(grid));
    const input = within(grid).getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "=VLO" } });

    const suggestion = await screen.findByRole("option", { name: /VLOOKUP/ });
    expect(suggestion).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "Tab" });
    expect(input.value).toBe("=VLOOKUP(");
  });
});

// ─── Formula columns and totals row ──────────────────────────────────────────

describe("LinkBuildingOrdersTable — formula columns and totals row", () => {
  it("shows a formula column computed on every row", async () => {
    mockListSheetFormulas.mockResolvedValue({ columns: [sheetFormula({})], summary: [] });
    const grid = await renderTable([
      makeRow({ id: "uuid-1", order_id: "BL-1", dr_lbs: "40" }),
      makeRow({ id: "uuid-2", order_id: "BL-2", dr_lbs: "15" }),
    ]);

    expect(await within(grid).findByText("Double DR")).toBeInTheDocument();
    expect(within(grid).getByText("80")).toBeInTheDocument();
    expect(within(grid).getByText("30")).toBeInTheDocument();
  });

  it("shows the totals row result under its column", async () => {
    mockListSheetFormulas.mockResolvedValue({
      columns: [],
      summary: [sheetFormula({ id: 9, kind: "summary", key: "dr_lbs", target_key: "dr_lbs", name: null, formula: "=SUM([dr_lbs]:[dr_lbs])" })],
    });
    const grid = await renderTable([
      makeRow({ id: "uuid-1", order_id: "BL-1", dr_lbs: "40" }),
      makeRow({ id: "uuid-2", order_id: "BL-2", dr_lbs: "15" }),
    ]);

    const footer = grid.querySelector("tfoot");
    expect(footer).not.toBeNull();
    expect(await within(footer as HTMLElement).findByText("55")).toBeInTheDocument();
  });
});

// ─── VLOOKUP in the table ────────────────────────────────────────────────────

/** The Notes cell (column I) of a row, by its position on the page. */
function notesCellOfRow(grid: HTMLElement, row_position: number): HTMLTableCellElement {
  const row = grid.querySelectorAll("tbody tr")[row_position];
  return row.querySelectorAll("td")[2 + 8] as HTMLTableCellElement;
}

describe("LinkBuildingOrdersTable: VLOOKUP", () => {
  it("saves a VLOOKUP typed into a cell with its result and its references stored by column key", async () => {
    const row1 = makeRow({ id: "uuid-1", order_id: "BL-1", partnership: "partner-a.com", current_price: "150" });
    const row2 = makeRow({ id: "uuid-2", order_id: "BL-2", partnership: "partner-a.com", current_price: "" });
    const grid = await renderTable([row1, row2]);
    mockUpdateLinkBuildingOrder.mockImplementation(async (id, payload) => ({
      message: "Updated",
      data: { ...(id === "uuid-1" ? row1 : row2), ...(payload as Partial<LinkBuildingOrderRow>) },
    }));

    openForEditing(notesCellOfRow(grid, 1));
    const input = within(grid).getByRole("textbox");
    fireEvent.change(input, { target: { value: '=IFERROR(VLOOKUP(N2, $N$1:$X$1, 11, FALSE), "New partner")' } });
    fireEvent.blur(input);

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    const [id, payload] = mockUpdateLinkBuildingOrder.mock.calls[0];
    expect(id).toBe("uuid-2");
    expect(payload.notes).toBe("150");
    expect(payload.cell_formulas).toEqual({
      notes: '=IFERROR(VLOOKUP([partnership:~0], [$partnership:$1]:[$current_price:$1], 11, FALSE), "New partner")',
    });
  });

  it("fills a VLOOKUP formula column on every row", async () => {
    mockListSheetFormulas.mockResolvedValue({
      columns: [
        sheetFormula({
          name: "Partner price",
          formula: '=IFERROR("P:" & VLOOKUP([partnership:~0], [partnership]:[current_price], 11, FALSE), "none")',
        }),
      ],
      summary: [],
    });
    const grid = await renderTable([
      makeRow({ id: "uuid-1", order_id: "BL-1", partnership: "partner-a.com", current_price: "150" }),
      makeRow({ id: "uuid-2", order_id: "BL-2", partnership: "partner-b.com", current_price: "90" }),
      makeRow({ id: "uuid-3", order_id: "BL-3", partnership: "", current_price: "" }),
    ]);

    expect(await within(grid).findByText("Partner price")).toBeInTheDocument();
    expect(within(grid).getByText("P:150")).toBeInTheDocument();
    expect(within(grid).getByText("P:90")).toBeInTheDocument();
    expect(within(grid).getByText("none")).toBeInTheDocument();
  });

  it("shows a date looked up from a date column as a date", async () => {
    mockListSheetFormulas.mockResolvedValue({
      columns: [
        sheetFormula({
          name: "Delivery of BL-2",
          formula: '=VLOOKUP("BL-2", [order_id]:[estimated_delivery_date], 12, FALSE)',
        }),
      ],
      summary: [],
    });
    const grid = await renderTable([
      makeRow({ id: "uuid-1", order_id: "BL-1", estimated_delivery_date: "11/05/2026" }),
      makeRow({ id: "uuid-2", order_id: "BL-2", estimated_delivery_date: "10/31/2026" }),
    ]);

    expect(await within(grid).findByText("Delivery of BL-2")).toBeInTheDocument();
    // Once in BL-2's own Delivery Date cell, once per row of the formula column.
    expect(within(grid).getAllByText("10/31/2026")).toHaveLength(3);
    expect(within(grid).queryByText("46326")).not.toBeInTheDocument();
  });

  it("shows #N/A in the cell and explains it in the formula bar", async () => {
    const grid = await renderTable([
      makeRow({
        notes: "",
        cell_formulas: { notes: '=VLOOKUP("Custom", [link_type]:[final_price], 24, FALSE)' },
      }),
    ]);

    const cell = cellOf(grid, "#N/A");
    fireEvent.mouseDown(cell);
    fireEvent.mouseUp(cell);

    expect(screen.getByText('=VLOOKUP("Custom", D:AA, 24, FALSE)')).toBeInTheDocument();
    expect(screen.getByTitle('Did not find value "Custom" in VLOOKUP evaluation.')).toBeInTheDocument();
  });

  it("totals the matching rows with SUMIF in the totals row", async () => {
    mockListSheetFormulas.mockResolvedValue({
      columns: [],
      summary: [
        sheetFormula({
          id: 9,
          kind: "summary",
          key: "dr_lbs",
          target_key: "dr_lbs",
          name: null,
          formula: '=SUMIF([client]:[client], "acme corp", [dr_lbs]:[dr_lbs])',
        }),
      ],
    });
    const grid = await renderTable([
      makeRow({ id: "uuid-1", order_id: "BL-1", client: "Acme Corp", dr_lbs: "40" }),
      makeRow({ id: "uuid-2", order_id: "BL-2", client: "Globex", dr_lbs: "15" }),
      makeRow({ id: "uuid-3", order_id: "BL-3", client: "Acme Corp", dr_lbs: "22" }),
    ]);

    const footer = grid.querySelector("tfoot") as HTMLElement;
    expect(await within(footer).findByText("62")).toBeInTheDocument();
  });
});
