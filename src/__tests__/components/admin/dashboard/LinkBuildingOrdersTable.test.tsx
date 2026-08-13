/**
 * Tests for the admin "Link Building Orders" table:
 *  - the editable Order ID (BL-XXXXX) column: format validation, uniqueness errors
 *    surfaced from the API, and the guard that keeps order_id out of the PUT payload
 *    unless that specific cell was the one edited;
 *  - undo/redo (Ctrl+Z / Ctrl+Y and the toolbar buttons) for single-cell edits and
 *    bulk pastes;
 *  - Excel-style multi-cell range selection, copy (Ctrl+C) and paste (Ctrl+V).
 */

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import LinkBuildingOrdersTable from "@/components/admin/dashboard/LinkBuildingOrdersTable";
import {
  listLinkBuildingOrders,
  updateLinkBuildingOrder,
  listAdminUsersForSelect,
  listClientUsersForSelect,
  batchUpdateLinkBuildingOrderCells,
} from "@/services/admin/link-building-dashboard.service";
import type { LinkBuildingOrderRow } from "@/types/admin/link-building-order";

// ─── Module mocks ────────────────────────────────────────────────────────────

jest.mock("@/services/admin/link-building-dashboard.service", () => {
  const actual = jest.requireActual("@/services/admin/link-building-dashboard.service");
  return {
    ...actual,
    listLinkBuildingOrders:      jest.fn(),
    createLinkBuildingOrder:     jest.fn(),
    updateLinkBuildingOrder:     jest.fn(),
    deleteLinkBuildingOrder:     jest.fn(),
    exportLinkBuildingOrders:    jest.fn(),
    batchUpdateLinkBuildingOrders: jest.fn(),
    batchUpdateLinkBuildingOrderCells: jest.fn(),
    listAdminUsersForSelect:    jest.fn(),
    listClientUsersForSelect:   jest.fn(),
  };
});

// NOTE: sort_rules/column_filters must be referentially stable across renders —
// the table's fetch effect depends on them, and a fresh array/object literal on
// every call would re-trigger the fetch effect forever (infinite "Loading…" loop).
jest.mock("@/hooks/useTableSort", () => {
  const stable_sort_rules: unknown[] = [];
  return {
    useTableSort: () => ({ sort_rules: stable_sort_rules, toggleSort: jest.fn(), clearSort: jest.fn() }),
  };
});

jest.mock("@/hooks/useColumnFilters", () => {
  const stable_column_filters = {};
  return {
    useColumnFilters: () => ({
      column_filters: stable_column_filters,
      setFilter: jest.fn(),
      clearFilter: jest.fn(),
      clearAllFilters: jest.fn(),
      active_filter_count: 0,
      applyFilters: (rows: unknown[]) => rows,
    }),
    isFilterActive: () => false,
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

// Presentational children unrelated to this feature — stub them out so the table
// can mount without pulling in websocket/dropdown/searchable-select internals.
jest.mock("@/components/admin/dashboard/ColumnFilterDropdown", () => ({ __esModule: true, default: () => null }));
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
const mockListAdminUsersForSelect = listAdminUsersForSelect as jest.MockedFunction<typeof listAdminUsersForSelect>;
const mockListClientUsersForSelect = listClientUsersForSelect as jest.MockedFunction<typeof listClientUsersForSelect>;
const mockBatchUpdateLinkBuildingOrderCells = batchUpdateLinkBuildingOrderCells as jest.MockedFunction<typeof batchUpdateLinkBuildingOrderCells>;

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<LinkBuildingOrderRow> = {}): LinkBuildingOrderRow {
  return {
    id:                         "uuid-1",
    order_id:                   "BL-1",
    team_specific_link_id:      "",
    link_type:                  "DR 30+ External",
    client:                     "Acme Corp",
    keyword:                    "seo tools",
    landing_page:               "https://acme.com",
    exact_match:                "No",
    notes:                      "",
    internal_notes:             "",
    request_date:               "06/01/2026",
    estimated_delivery_date:    "07/01/2026",
    estimated_turnaround_days:  "30",
    link_builder:               "",
    pen_name:                   "",
    partnership:                "",
    partnership_check:          "",
    article_title:              "",
    article:                    "",
    status:                     "New Request",
    live_link:                  "",
    live_link_date:             "",
    dr_lbs:                     "",
    posting_fee_lbs:            "",
    current_traffic:            "",
    dr_formula:                 "",
    current_poc:                "",
    current_price:              "",
    lb_tl_approval:             "",
    approval_date:              "",
    final_price:                "",
    currency:                   "USD",
    user_id:                    null,
    admin_team_id:              null,
    assigned_admin_user_id:     null,
    ...overrides,
  };
}

function mockSearchResponse(rows: LinkBuildingOrderRow[]) {
  return {
    data:         rows,
    current_page: 1,
    last_page:    1,
    per_page:     50,
    total:        rows.length,
    from:         rows.length > 0 ? 1 : null,
    to:           rows.length,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockListAdminUsersForSelect.mockResolvedValue([]);
  mockListClientUsersForSelect.mockResolvedValue([]);
});

async function renderTableWithRow(row: LinkBuildingOrderRow): Promise<void> {
  mockListLinkBuildingOrders.mockResolvedValue(mockSearchResponse([row]));
  render(<LinkBuildingOrdersTable />);
  await screen.findByText(row.order_id);
}

/**
 * Opens a cell for editing. The table's Excel-style drag-to-select gesture starts
 * editing from a mousedown/mouseup pair with no movement in between (see
 * handleCellMouseDown/handleCellMouseUp in the component), not from a click handler,
 * so a plain fireEvent.click never opens the cell.
 */
function openCellForEditing(display_text: string): void {
  const cell = screen.getByText(display_text).closest("td");
  if (!cell) throw new Error(`No <td> ancestor found for text "${display_text}"`);
  fireEvent.mouseDown(cell);
  fireEvent.mouseUp(cell);
}

/**
 * Simulates a click-and-drag range selection from one cell's display text to another's.
 * React derives onMouseEnter from bubbling "mouseover" events (not the non-bubbling
 * native "mouseenter"), so mouseOver is what actually reaches the handler in jsdom.
 */
function dragSelectRange(from_display_text: string, to_display_text: string): void {
  const from_cell = screen.getByText(from_display_text).closest("td");
  const to_cell = screen.getByText(to_display_text).closest("td");
  if (!from_cell || !to_cell) throw new Error("Could not locate range endpoints");
  fireEvent.mouseDown(from_cell);
  fireEvent.mouseOver(to_cell);
  fireEvent.mouseUp(to_cell);
}

// ─── Order ID editing ────────────────────────────────────────────────────────

describe("LinkBuildingOrdersTable — Order ID (BL-XXXXX) editing", () => {
  it("saves a new order_id when it matches the BL-<number> format", async () => {
    const row = makeRow({ order_id: "BL-1" });
    await renderTableWithRow(row);
    mockUpdateLinkBuildingOrder.mockResolvedValue({
      message: "Updated",
      data: { ...row, order_id: "BL-25143" },
    });

    openCellForEditing("BL-1");
    const input = screen.getByDisplayValue("BL-1");
    fireEvent.change(input, { target: { value: "BL-25143" } });
    fireEvent.blur(input);

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));

    const [id, payload] = mockUpdateLinkBuildingOrder.mock.calls[0];
    expect(id).toBe("uuid-1");
    expect(payload).toMatchObject({ order_id: "BL-25143" });
  });

  it("rejects a malformed order_id client-side without calling the API", async () => {
    const row = makeRow({ order_id: "BL-1" });
    await renderTableWithRow(row);

    openCellForEditing("BL-1");
    const input = screen.getByDisplayValue("BL-1");
    fireEvent.change(input, { target: { value: "not-a-valid-id" } });
    fireEvent.blur(input);

    await screen.findByText(/must follow the format BL-<number>/i);
    expect(mockUpdateLinkBuildingOrder).not.toHaveBeenCalled();
  });

  it("surfaces the backend uniqueness error when order_id is already taken", async () => {
    const row = makeRow({ order_id: "BL-1" });
    await renderTableWithRow(row);
    mockUpdateLinkBuildingOrder.mockRejectedValue({
      message: "The given data was invalid.",
      errors: { order_id: ["The order id has already been taken."] },
    });

    openCellForEditing("BL-1");
    const input = screen.getByDisplayValue("BL-1");
    fireEvent.change(input, { target: { value: "BL-9999" } });
    fireEvent.blur(input);

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    await screen.findByText(/already been taken/i);
  });

  it("does not include order_id in the payload when an unrelated cell is edited", async () => {
    const row = makeRow({ order_id: "BL-1", keyword: "seo tools" });
    await renderTableWithRow(row);
    mockUpdateLinkBuildingOrder.mockResolvedValue({
      message: "Updated",
      data: { ...row, keyword: "local seo" },
    });

    openCellForEditing("seo tools");
    const input = screen.getByDisplayValue("seo tools");
    fireEvent.change(input, { target: { value: "local seo" } });
    fireEvent.blur(input);

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));

    const [, payload] = mockUpdateLinkBuildingOrder.mock.calls[0];
    expect(payload).not.toHaveProperty("order_id");
    expect(payload).toMatchObject({ keyword: "local seo" });
  });
});

// ─── Undo / redo ─────────────────────────────────────────────────────────────

describe("LinkBuildingOrdersTable — undo / redo", () => {
  it("keeps the Undo button disabled and ignores Ctrl+Z when no edit has happened yet", async () => {
    const row = makeRow({ id: "uuid-1" });
    await renderTableWithRow(row);

    expect(screen.getByRole("button", { name: /nothing to undo/i })).toBeDisabled();

    fireEvent.keyDown(document, { key: "z", ctrlKey: true });

    expect(mockBatchUpdateLinkBuildingOrderCells).not.toHaveBeenCalled();
  });

  it("Ctrl+Z reverts a saved single-cell edit, and Ctrl+Y re-applies it", async () => {
    const row = makeRow({ id: "uuid-1", keyword: "seo tools" });
    await renderTableWithRow(row);

    mockUpdateLinkBuildingOrder.mockResolvedValue({
      message: "Updated",
      data: { ...row, keyword: "local seo" },
    });

    openCellForEditing("seo tools");
    fireEvent.change(screen.getByDisplayValue("seo tools"), { target: { value: "local seo" } });
    fireEvent.blur(screen.getByDisplayValue("local seo"));

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    await screen.findByText("local seo");

    // Undo: value should revert to "seo tools" and re-sync through batch-update-cells.
    mockBatchUpdateLinkBuildingOrderCells.mockResolvedValueOnce({
      message: "1 row(s) updated successfully.",
      updated_count: 1,
      data: [{ ...row, keyword: "seo tools" }],
    });

    fireEvent.keyDown(document, { key: "z", ctrlKey: true });

    await waitFor(() => expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledTimes(1));
    expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenNthCalledWith(1, [
      { id: "uuid-1", fields: { keyword: "seo tools" } },
    ]);
    await screen.findByText("seo tools");

    // Redo: value should move forward again to "local seo".
    mockBatchUpdateLinkBuildingOrderCells.mockResolvedValueOnce({
      message: "1 row(s) updated successfully.",
      updated_count: 1,
      data: [{ ...row, keyword: "local seo" }],
    });

    fireEvent.keyDown(document, { key: "y", ctrlKey: true });

    await waitFor(() => expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledTimes(2));
    expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenNthCalledWith(2, [
      { id: "uuid-1", fields: { keyword: "local seo" } },
    ]);
    await screen.findByText("local seo");
  });

  it("enables the Undo toolbar button after an edit, and clicking it works the same as Ctrl+Z", async () => {
    const row = makeRow({ id: "uuid-1", keyword: "seo tools" });
    await renderTableWithRow(row);

    mockUpdateLinkBuildingOrder.mockResolvedValue({
      message: "Updated",
      data: { ...row, keyword: "local seo" },
    });
    mockBatchUpdateLinkBuildingOrderCells.mockResolvedValue({
      message: "1 row(s) updated successfully.",
      updated_count: 1,
      data: [{ ...row, keyword: "seo tools" }],
    });

    openCellForEditing("seo tools");
    fireEvent.change(screen.getByDisplayValue("seo tools"), { target: { value: "local seo" } });
    fireEvent.blur(screen.getByDisplayValue("local seo"));
    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));

    // Buttons carry a count badge (e.g. "1") once history exists, which becomes their
    // accessible name-from-content and shadows the descriptive `title`, so assert via
    // getByTitle rather than getByRole's accessible-name matching.
    const undo_button = await screen.findByTitle(/undo: cell edit/i);
    expect(undo_button).toBeEnabled();

    fireEvent.click(undo_button);

    await waitFor(() => expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledTimes(1));
    await screen.findByTitle(/nothing to undo/i);
    expect(await screen.findByTitle(/redo: cell edit/i)).toBeEnabled();
  });

  it("clears the redo stack once a new edit is made after an undo", async () => {
    const row = makeRow({ id: "uuid-1", keyword: "seo tools", notes: "old note" });
    await renderTableWithRow(row);

    mockUpdateLinkBuildingOrder
      .mockResolvedValueOnce({ message: "Updated", data: { ...row, keyword: "local seo" } })
      .mockResolvedValueOnce({ message: "Updated", data: { ...row, keyword: "local seo", notes: "new note" } });
    mockBatchUpdateLinkBuildingOrderCells.mockResolvedValue({
      message: "1 row(s) updated successfully.",
      updated_count: 1,
      data: [{ ...row, keyword: "seo tools" }],
    });

    openCellForEditing("seo tools");
    fireEvent.change(screen.getByDisplayValue("seo tools"), { target: { value: "local seo" } });
    fireEvent.blur(screen.getByDisplayValue("local seo"));
    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));

    fireEvent.keyDown(document, { key: "z", ctrlKey: true });
    await waitFor(() => expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledTimes(1));
    await screen.findByTitle(/redo: cell edit/i);

    openCellForEditing("old note");
    fireEvent.change(screen.getByDisplayValue("old note"), { target: { value: "new note" } });
    fireEvent.blur(screen.getByDisplayValue("new note"));
    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(2));

    expect(screen.getByTitle(/nothing to redo/i)).toBeDisabled();
  });

  it("undoing a bulk grid paste reverts every changed cell across multiple rows in one action", async () => {
    const row1 = makeRow({ id: "uuid-1", order_id: "BL-1", keyword: "seo tools", landing_page: "https://acme.com/old" });
    const row2 = makeRow({ id: "uuid-2", order_id: "BL-2", keyword: "ppc ads", landing_page: "https://acme.com/old2" });
    mockListLinkBuildingOrders.mockResolvedValue(mockSearchResponse([row1, row2]));
    render(<LinkBuildingOrdersTable />);
    await screen.findByText("BL-1");

    mockBatchUpdateLinkBuildingOrderCells.mockResolvedValueOnce({
      message: "2 row(s) updated successfully.",
      updated_count: 2,
      data: [
        { ...row1, keyword: "new kw1", landing_page: "https://new1.com" },
        { ...row2, keyword: "new kw2", landing_page: "https://new2.com" },
      ],
    });

    // The paste originates from row1's "keyword" input, which stays open afterward
    // (a bulk paste does not close the cell it was triggered from), so its new value
    // shows up as an input value rather than plain text; row2's cell was never opened
    // for editing, so it re-renders as normal display text.
    openCellForEditing("seo tools");
    fireEvent.paste(screen.getByDisplayValue("seo tools"), {
      clipboardData: { getData: () => "new kw1\thttps://new1.com\nnew kw2\thttps://new2.com" },
    });

    await waitFor(() => expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByDisplayValue("new kw1")).toBeInTheDocument());
    await screen.findByText("new kw2");

    mockBatchUpdateLinkBuildingOrderCells.mockResolvedValueOnce({
      message: "2 row(s) updated successfully.",
      updated_count: 2,
      data: [row1, row2],
    });

    const undo_button = await screen.findByTitle(/undo: bulk paste/i);
    fireEvent.click(undo_button);

    await waitFor(() => expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledTimes(2));
    const revert_call = mockBatchUpdateLinkBuildingOrderCells.mock.calls[1][0];
    expect(revert_call).toEqual(
      expect.arrayContaining([
        { id: "uuid-1", fields: { keyword: "seo tools", landing_page: "https://acme.com/old" } },
        { id: "uuid-2", fields: { keyword: "ppc ads", landing_page: "https://acme.com/old2" } },
      ])
    );
    await waitFor(() => expect(screen.getByDisplayValue("seo tools")).toBeInTheDocument());
    await screen.findByText("ppc ads");
  });
});

// ─── Multi-cell range select, copy (Ctrl+C) & paste (Ctrl+V) ────────────────

describe("LinkBuildingOrdersTable — multi-cell range copy & paste", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
        readText: jest.fn().mockResolvedValue(""),
      },
    });
  });

  it("Ctrl+C copies a dragged rectangular range to the clipboard as tab/newline-delimited text", async () => {
    const row1 = makeRow({ id: "uuid-1", order_id: "BL-1", client: "Acme Corp", keyword: "seo tools" });
    const row2 = makeRow({ id: "uuid-2", order_id: "BL-2", client: "Globex Inc", keyword: "ppc ads" });
    mockListLinkBuildingOrders.mockResolvedValue(mockSearchResponse([row1, row2]));
    render(<LinkBuildingOrdersTable />);
    await screen.findByText("BL-1");

    dragSelectRange("Acme Corp", "ppc ads");
    await screen.findByText(/4 cells selected/i);

    fireEvent.keyDown(document, { key: "c", ctrlKey: true });

    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Acme Corp\tseo tools\nGlobex Inc\tppc ads")
    );
  });

  it("Ctrl+V pastes clipboard text into every cell of the selected range", async () => {
    const row1 = makeRow({ id: "uuid-1", order_id: "BL-1", client: "Acme Corp", keyword: "seo tools" });
    const row2 = makeRow({ id: "uuid-2", order_id: "BL-2", client: "Globex Inc", keyword: "ppc ads" });
    mockListLinkBuildingOrders.mockResolvedValue(mockSearchResponse([row1, row2]));
    render(<LinkBuildingOrdersTable />);
    await screen.findByText("BL-1");

    (navigator.clipboard.readText as jest.Mock).mockResolvedValue(
      "New Client A\tNew Kw A\nNew Client B\tNew Kw B"
    );
    mockBatchUpdateLinkBuildingOrderCells.mockResolvedValue({
      message: "2 row(s) updated successfully.",
      updated_count: 2,
      data: [
        { ...row1, client: "New Client A", keyword: "New Kw A" },
        { ...row2, client: "New Client B", keyword: "New Kw B" },
      ],
    });

    dragSelectRange("Acme Corp", "ppc ads");
    await screen.findByText(/4 cells selected/i);

    fireEvent.keyDown(document, { key: "v", ctrlKey: true });

    await waitFor(() => expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledTimes(1));
    expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledWith(
      expect.arrayContaining([
        { id: "uuid-1", fields: { client: "New Client A", keyword: "New Kw A" } },
        { id: "uuid-2", fields: { client: "New Client B", keyword: "New Kw B" } },
      ])
    );
    await screen.findByText("New Client A");
    await screen.findByText("New Kw B");
  });

  it("Escape clears an active range selection without copying or pasting", async () => {
    const row1 = makeRow({ id: "uuid-1", order_id: "BL-1", client: "Acme Corp", keyword: "seo tools" });
    const row2 = makeRow({ id: "uuid-2", order_id: "BL-2", client: "Globex Inc", keyword: "ppc ads" });
    mockListLinkBuildingOrders.mockResolvedValue(mockSearchResponse([row1, row2]));
    render(<LinkBuildingOrdersTable />);
    await screen.findByText("BL-1");

    dragSelectRange("Acme Corp", "ppc ads");
    await screen.findByText(/4 cells selected/i);

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByText(/cells selected/i)).not.toBeInTheDocument());
  });
});
