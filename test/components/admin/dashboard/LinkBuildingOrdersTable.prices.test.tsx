/**
 * Price columns of the admin "Link Building Orders" table (Posting Fee, Current
 * Price and Final Price) get the currency symbol automatically, like the BASE
 * link sheet:
 *  - a typed amount is saved and shown as "$150.00", text that is not an amount is kept;
 *  - the symbol follows the row's Currency, and changing it updates every price;
 *  - formulas, bulk pastes and the bulk fill toolbar format prices too;
 *  - columns that are not prices are never formatted.
 */

import React from "react";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import LinkBuildingOrdersTable from "@/components/admin/dashboard/LinkBuildingOrdersTable";
import {
  listLinkBuildingOrders,
  updateLinkBuildingOrder,
  listAdminUsersForSelect,
  listClientUsersForSelect,
  batchUpdateLinkBuildingOrders,
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
const mockBatchUpdateLinkBuildingOrders = batchUpdateLinkBuildingOrders as jest.MockedFunction<typeof batchUpdateLinkBuildingOrders>;
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

function cellOf(grid: HTMLElement, text: string): HTMLTableCellElement {
  const cell = within(grid).getByText(text).closest("td");
  if (!cell) throw new Error(`No <td> ancestor found for "${text}"`);
  return cell as HTMLTableCellElement;
}

function openForEditing(cell: HTMLElement): void {
  fireEvent.mouseDown(cell);
  fireEvent.mouseUp(cell);
  fireEvent.doubleClick(cell);
}

/** Opens the cell showing `current_text`, types `new_text` and commits it. */
function typeIntoCell(grid: HTMLElement, current_text: string, new_text: string): void {
  openForEditing(cellOf(grid, current_text));
  const input = within(grid).getByDisplayValue(current_text);
  fireEvent.change(input, { target: { value: new_text } });
  fireEvent.blur(input);
}

/** The server echoes the saved row, like LinkBuildingOrdersDashboardController::update(). */
function echoUpdatedRow(row: LinkBuildingOrderRow): void {
  mockUpdateLinkBuildingOrder.mockImplementation(async (_id, payload) => ({
    message: "Updated",
    data: { ...row, ...(payload as Partial<LinkBuildingOrderRow>) },
  }));
}

function lastUpdatePayload(): Partial<LinkBuildingOrderRow> {
  const calls = mockUpdateLinkBuildingOrder.mock.calls;
  return calls[calls.length - 1][1] as Partial<LinkBuildingOrderRow>;
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  (listAdminUsersForSelect as jest.Mock).mockResolvedValue([]);
  (listClientUsersForSelect as jest.Mock).mockResolvedValue([]);
  mockListSheetFormulas.mockResolvedValue({ columns: [], summary: [] });
  mockBatchUpdateLinkBuildingOrders.mockResolvedValue({ message: "ok", updated_count: 1 } as never);
  mockBatchUpdateLinkBuildingOrderCells.mockResolvedValue({ message: "ok", updated_count: 0, data: [] });
});

// ─── Typing a price ──────────────────────────────────────────────────────────

describe("LinkBuildingOrdersTable — typing a price", () => {
  it("saves and shows a typed amount with the dollar sign and two decimals", async () => {
    const row = makeRow({ final_price: "77" });
    const grid = await renderTable([row]);
    echoUpdatedRow(row);

    typeIntoCell(grid, "77", "150");

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    expect(lastUpdatePayload().final_price).toBe("$150.00");
    expect(await within(grid).findByText("$150.00")).toBeInTheDocument();
  });

  it("adds thousands separators and rounds to cents", async () => {
    const row = makeRow({ current_price: "61" });
    const grid = await renderTable([row]);
    echoUpdatedRow(row);

    typeIntoCell(grid, "61", "1250.567");

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    expect(lastUpdatePayload().current_price).toBe("$1,250.57");
  });

  it("formats the Posting Fee column too", async () => {
    const row = makeRow({ posting_fee_lbs: "43" });
    const grid = await renderTable([row]);
    echoUpdatedRow(row);

    typeIntoCell(grid, "43", "$50");

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    expect(lastUpdatePayload().posting_fee_lbs).toBe("$50.00");
  });

  it("keeps text that is not an amount as typed", async () => {
    const row = makeRow({ final_price: "77" });
    const grid = await renderTable([row]);
    echoUpdatedRow(row);

    typeIntoCell(grid, "77", "TBD");

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    expect(lastUpdatePayload().final_price).toBe("TBD");
  });

  it("uses the euro sign on a EUR row", async () => {
    const row = makeRow({ currency: "EUR", final_price: "77" });
    const grid = await renderTable([row]);
    echoUpdatedRow(row);

    typeIntoCell(grid, "77", "99");

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    expect(lastUpdatePayload().final_price).toBe("€99.00");
    expect(await within(grid).findByText("€99.00")).toBeInTheDocument();
  });

  it("never formats a column that is not a price", async () => {
    const row = makeRow({ keyword: "old keyword" });
    const grid = await renderTable([row]);
    echoUpdatedRow(row);

    typeIntoCell(grid, "old keyword", "150");

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    expect(lastUpdatePayload().keyword).toBe("150");
  });

  it("does not add an undo step when the same amount is typed without its symbol", async () => {
    const row = makeRow({ final_price: "$80.00" });
    const grid = await renderTable([row]);
    echoUpdatedRow(row);

    typeIntoCell(grid, "$80.00", "80");

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    expect(lastUpdatePayload().final_price).toBe("$80.00");
    expect(screen.queryByTitle(/undo: cell edit/i)).not.toBeInTheDocument();
  });
});

// ─── Currency ────────────────────────────────────────────────────────────────

describe("LinkBuildingOrdersTable — changing the currency", () => {
  it("updates the symbol of every price of the row", async () => {
    const row = makeRow({ posting_fee_lbs: "$50.00", current_price: "$1,200.00", final_price: "$1,380.50" });
    const grid = await renderTable([row]);
    echoUpdatedRow(row);

    openForEditing(cellOf(grid, "USD"));
    const input = within(grid).getByDisplayValue("USD");
    fireEvent.change(input, { target: { value: "EUR" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    expect(lastUpdatePayload()).toMatchObject({
      currency: "EUR",
      posting_fee_lbs: "€50.00",
      current_price: "€1,200.00",
      final_price: "€1,380.50",
    });
  });
});

// ─── Formulas ────────────────────────────────────────────────────────────────

describe("LinkBuildingOrdersTable — formulas in price cells", () => {
  it("saves the result of a formula typed into a price cell with the dollar sign", async () => {
    const row = makeRow({ final_price: "77" });
    const grid = await renderTable([row]);
    echoUpdatedRow(row);

    typeIntoCell(grid, "77", "=100*1.15");

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    const payload = lastUpdatePayload();
    expect(payload.final_price).toBe("$115.00");
    expect(payload.cell_formulas).toEqual({ final_price: "=100*1.15" });
    expect(await within(grid).findByText("$115.00")).toBeInTheDocument();
  });

  it("does not resave a formula price that is already stored formatted", async () => {
    // The server stores formula results formatted, so the recalculated "$90.00"
    // matches the saved value and nothing is sent again.
    await renderTable([makeRow({ dr_lbs: "45", final_price: "$90.00", cell_formulas: { final_price: "=[dr_lbs:~0]*2" } })]);

    await new Promise((resolve) => setTimeout(resolve, 2000));
    expect(mockBatchUpdateLinkBuildingOrderCells).not.toHaveBeenCalled();
  });
});

// ─── Bulk paste and bulk fill ────────────────────────────────────────────────

describe("LinkBuildingOrdersTable — pasting and filling prices", () => {
  it("formats prices pasted from a spreadsheet over several rows", async () => {
    const row1 = makeRow({ id: "uuid-1", order_id: "BL-1", final_price: "$10.00" });
    const row2 = makeRow({ id: "uuid-2", order_id: "BL-2", final_price: "$20.00" });
    const grid = await renderTable([row1, row2]);

    openForEditing(cellOf(grid, "$10.00"));
    fireEvent.paste(within(grid).getByDisplayValue("$10.00"), {
      clipboardData: { getData: () => "50\n1200" },
    });

    await waitFor(() => expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledTimes(1));
    expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledWith(
      expect.arrayContaining([
        { id: "uuid-1", fields: { final_price: "$50.00" } },
        { id: "uuid-2", fields: { final_price: "$1,200.00" } },
      ])
    );
  });

  it("shows the dollar sign on rows filled from the bulk fill toolbar", async () => {
    const row = makeRow({ final_price: "" });
    const grid = await renderTable([row]);

    const row_checkbox = grid.querySelector("tbody tr input[type='checkbox']") as HTMLInputElement;
    fireEvent.click(row_checkbox);

    const field_select = await screen.findByDisplayValue("Choose column…");
    fireEvent.change(field_select, { target: { value: "final_price" } });
    fireEvent.change(screen.getByPlaceholderText("Value for Final Price…"), { target: { value: "75" } });
    fireEvent.click(screen.getByRole("button", { name: /apply to 1 row/i }));

    await waitFor(() => expect(mockBatchUpdateLinkBuildingOrders).toHaveBeenCalledTimes(1));
    expect(mockBatchUpdateLinkBuildingOrders).toHaveBeenCalledWith(["uuid-1"], { final_price: "75" });
    expect(await within(grid).findByText("$75.00")).toBeInTheDocument();
  });
});
