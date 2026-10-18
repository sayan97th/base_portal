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
  getLinkBuildingOrderColumnValues,
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
    getLinkBuildingOrderColumnValues: jest.fn(),
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
const mockGetLinkBuildingOrderColumnValues = getLinkBuildingOrderColumnValues as jest.MockedFunction<typeof getLinkBuildingOrderColumnValues>;

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

/**
 * Like screen.getByText, but for a value that also appears as an <option> in one of
 * the toolbar's filter dropdowns (Status, Link Type) — a plain getByText match is
 * ambiguous there. This narrows the match down to the one sitting inside a table
 * <td>, i.e. the actual cell rendering that value.
 */
function getTableCellByText(label: string): HTMLElement {
  const cell = screen
    .getAllByText(label)
    .map((el) => el.closest("td"))
    .find((td): td is HTMLTableCellElement => td !== null);
  if (!cell) throw new Error(`No <td> ancestor found for "${label}"`);
  return cell;
}

/**
 * Locates an option row inside the floating CellOptionsDropdown panel (rendered via
 * a portal into document.body) by its visible label — disambiguated from any other
 * element carrying the same text by requiring a <button> ancestor, since the panel's
 * rows are the only buttons in the tree that render a plain option label.
 */
function getDropdownOptionButton(label: string): HTMLElement {
  const button = screen
    .getAllByText(label)
    .map((el) => el.closest("button"))
    .find((btn): btn is HTMLButtonElement => btn !== null);
  if (!button) throw new Error(`No dropdown option button found for "${label}"`);
  return button;
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

  it("Shift+Click extends a range from the cell just opened for editing, without dragging", async () => {
    const row1 = makeRow({ id: "uuid-1", order_id: "BL-1", client: "Acme Corp", keyword: "seo tools" });
    const row2 = makeRow({ id: "uuid-2", order_id: "BL-2", client: "Globex Inc", keyword: "ppc ads" });
    mockListLinkBuildingOrders.mockResolvedValue(mockSearchResponse([row1, row2]));
    render(<LinkBuildingOrdersTable />);
    await screen.findByText("BL-1");

    // A plain click on "Acme Corp" opens it for editing (no range yet).
    openCellForEditing("Acme Corp");
    expect(screen.getByDisplayValue("Acme Corp")).toBeInTheDocument();

    // Shift+Click on "ppc ads" (row 2, keyword column) must extend the range from
    // the cell that was just being edited, covering the full 2×2 rectangle between
    // them — not just select "ppc ads" alone.
    const target_cell = screen.getByText("ppc ads").closest("td");
    if (!target_cell) throw new Error("Could not locate target cell");
    fireEvent.mouseDown(target_cell, { shiftKey: true });
    fireEvent.mouseUp(target_cell);

    await screen.findByText(/4 cells selected/i);

    fireEvent.keyDown(document, { key: "c", ctrlKey: true });

    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Acme Corp\tseo tools\nGlobex Inc\tppc ads")
    );
  });

  it("pasting a single copied value onto a larger selection fills every cell in it", async () => {
    const row1 = makeRow({ id: "uuid-1", order_id: "BL-1", client: "Acme Corp", keyword: "seo tools" });
    const row2 = makeRow({ id: "uuid-2", order_id: "BL-2", client: "Globex Inc", keyword: "ppc ads" });
    mockListLinkBuildingOrders.mockResolvedValue(mockSearchResponse([row1, row2]));
    render(<LinkBuildingOrdersTable />);
    await screen.findByText("BL-1");

    // A single value on the clipboard, pasted onto a 2×2 selection, should fill
    // every cell in the selection with that same value — matching Excel.
    (navigator.clipboard.readText as jest.Mock).mockResolvedValue("Reviewing");
    mockBatchUpdateLinkBuildingOrderCells.mockResolvedValue({
      message: "2 row(s) updated successfully.",
      updated_count: 2,
      data: [
        { ...row1, client: "Reviewing", keyword: "Reviewing" },
        { ...row2, client: "Reviewing", keyword: "Reviewing" },
      ],
    });

    dragSelectRange("Acme Corp", "ppc ads");
    await screen.findByText(/4 cells selected/i);

    fireEvent.keyDown(document, { key: "v", ctrlKey: true });

    await waitFor(() => expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledTimes(1));
    expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledWith(
      expect.arrayContaining([
        { id: "uuid-1", fields: { client: "Reviewing", keyword: "Reviewing" } },
        { id: "uuid-2", fields: { client: "Reviewing", keyword: "Reviewing" } },
      ])
    );
  });

  it("pastes a Status value that isn't in the preset dropdown list instead of silently dropping it", async () => {
    // Regression test: the Status column is a <select> backed by a fixed list of
    // options. Values copied from the external BASE link sheet don't always match
    // that list, and a bulk paste used to fall back to the cell's current value
    // whenever the pasted text didn't match — silently discarding the paste with no
    // error shown to the admin.
    const row1 = makeRow({ id: "uuid-1", order_id: "BL-1", status: "New Request" });
    const row2 = makeRow({ id: "uuid-2", order_id: "BL-2", status: "Reviewing" });
    mockListLinkBuildingOrders.mockResolvedValue(mockSearchResponse([row1, row2]));
    render(<LinkBuildingOrdersTable />);
    await screen.findByText("BL-1");

    (navigator.clipboard.readText as jest.Mock).mockResolvedValue(
      "Needs Client Approval\nDone"
    );
    mockBatchUpdateLinkBuildingOrderCells.mockResolvedValue({
      message: "2 row(s) updated successfully.",
      updated_count: 2,
      data: [
        { ...row1, status: "Needs Client Approval" },
        { ...row2, status: "Done" },
      ],
    });

    // Both cells being dragged over sit in the Status column, so this is a 2-row x
    // 1-col range confined to that single select-type column.
    const from_cell = getTableCellByText("New Request");
    const to_cell = getTableCellByText("Reviewing");
    fireEvent.mouseDown(from_cell);
    fireEvent.mouseOver(to_cell);
    fireEvent.mouseUp(to_cell);
    await screen.findByText(/2 cells selected/i);

    fireEvent.keyDown(document, { key: "v", ctrlKey: true });

    await waitFor(() => expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledTimes(1));
    expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledWith(
      expect.arrayContaining([
        { id: "uuid-1", fields: { status: "Needs Client Approval" } },
        { id: "uuid-2", fields: { status: "Done" } },
      ])
    );
    await screen.findByText("Needs Client Approval");
    await screen.findByText("Done");
  });

  it("normalizes a pasted Status value to the dropdown's casing when it matches an existing option", async () => {
    const row1 = makeRow({ id: "uuid-1", order_id: "BL-1", status: "New Request" });
    mockListLinkBuildingOrders.mockResolvedValue(mockSearchResponse([row1]));
    render(<LinkBuildingOrdersTable />);
    await screen.findByText("BL-1");

    // Copied from a spreadsheet cell that happens to be lowercased.
    (navigator.clipboard.readText as jest.Mock).mockResolvedValue("reviewing");
    mockBatchUpdateLinkBuildingOrderCells.mockResolvedValue({
      message: "1 row(s) updated successfully.",
      updated_count: 1,
      data: [{ ...row1, status: "Reviewing" }],
    });

    // Shift+Click on a single cell (with no prior range or editing state) selects a
    // clean 1×1 range on that cell alone — see handleCellMouseDown's shift_key branch.
    const status_cell = getTableCellByText("New Request");
    fireEvent.mouseDown(status_cell, { shiftKey: true });
    fireEvent.mouseUp(status_cell);
    await screen.findByText(/1 cell selected/i);

    fireEvent.keyDown(document, { key: "v", ctrlKey: true });

    await waitFor(() => expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledTimes(1));
    expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledWith([
      { id: "uuid-1", fields: { status: "Reviewing" } },
    ]);
  });
});

// ─── Bulk paste value handling per column type (DR, Status, Link Type) ──────

describe("LinkBuildingOrdersTable — bulk paste value handling per column type", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
        readText: jest.fn().mockResolvedValue(""),
      },
    });
  });

  it("pastes a DR value copied from a spreadsheet, formatting and all, into the DR column", async () => {
    // The DR column is a plain text field (not a <select>), so a bulk paste there was
    // never filtered against a fixed list. This guards that it keeps accepting
    // whatever text is pasted, including the extra formatting a metrics tool like
    // Ahrefs or Moz tends to add when a cell is copied out of a spreadsheet.
    const row1 = makeRow({ id: "uuid-1", order_id: "BL-1", dr_lbs: "30" });
    const row2 = makeRow({ id: "uuid-2", order_id: "BL-2", dr_lbs: "40" });
    mockListLinkBuildingOrders.mockResolvedValue(mockSearchResponse([row1, row2]));
    render(<LinkBuildingOrdersTable />);
    await screen.findByText("BL-1");

    mockBatchUpdateLinkBuildingOrderCells.mockResolvedValueOnce({
      message: "2 row(s) updated successfully.",
      updated_count: 2,
      data: [
        { ...row1, dr_lbs: "45 (Ahrefs)" },
        { ...row2, dr_lbs: "52 (Moz)" },
      ],
    });

    openCellForEditing("30");
    fireEvent.paste(screen.getByDisplayValue("30"), {
      clipboardData: { getData: () => "45 (Ahrefs)\n52 (Moz)" },
    });

    await waitFor(() => expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledTimes(1));
    expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledWith(
      expect.arrayContaining([
        { id: "uuid-1", fields: { dr_lbs: "45 (Ahrefs)" } },
        { id: "uuid-2", fields: { dr_lbs: "52 (Moz)" } },
      ])
    );
    await screen.findByText("52 (Moz)");
  });

  it("pasting a blank spreadsheet cell onto a Status cell clears it instead of leaving the old value", async () => {
    const row1 = makeRow({ id: "uuid-1", order_id: "BL-1", status: "Reviewing" });
    mockListLinkBuildingOrders.mockResolvedValue(mockSearchResponse([row1]));
    render(<LinkBuildingOrdersTable />);
    await screen.findByText("BL-1");

    // A blank spreadsheet cell lands on the clipboard as whitespace, not a
    // completely empty string — an entirely empty clipboard read is treated by the
    // range-paste handler as "nothing to read" and it falls back to the in-memory
    // clipboard instead, which is a separate, pre-existing behavior this test isn't
    // targeting.
    (navigator.clipboard.readText as jest.Mock).mockResolvedValue(" ");
    mockBatchUpdateLinkBuildingOrderCells.mockResolvedValue({
      message: "1 row(s) updated successfully.",
      updated_count: 1,
      data: [{ ...row1, status: "" }],
    });

    const status_cell = getTableCellByText("Reviewing");
    fireEvent.mouseDown(status_cell, { shiftKey: true });
    fireEvent.mouseUp(status_cell);
    await screen.findByText(/1 cell selected/i);

    fireEvent.keyDown(document, { key: "v", ctrlKey: true });

    await waitFor(() => expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledTimes(1));
    expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledWith([
      { id: "uuid-1", fields: { status: "" } },
    ]);
  });

  it("pastes a Link Type value that isn't in the preset dropdown list instead of silently dropping it", async () => {
    // Link Type is a <select> column just like Status, backed by its own fixed
    // LINK_TYPE_OPTIONS list — the fix in parseCellForPaste is generic to every
    // select-type column, not special-cased to Status alone.
    const row1 = makeRow({ id: "uuid-1", order_id: "BL-1", link_type: "DR 30+ External" });
    mockListLinkBuildingOrders.mockResolvedValue(mockSearchResponse([row1]));
    render(<LinkBuildingOrdersTable />);
    await screen.findByText("BL-1");

    (navigator.clipboard.readText as jest.Mock).mockResolvedValue("DR 80+ External");
    mockBatchUpdateLinkBuildingOrderCells.mockResolvedValue({
      message: "1 row(s) updated successfully.",
      updated_count: 1,
      data: [{ ...row1, link_type: "DR 80+ External" }],
    });

    const link_type_cell = getTableCellByText("DR 30+ External");
    fireEvent.mouseDown(link_type_cell, { shiftKey: true });
    fireEvent.mouseUp(link_type_cell);
    await screen.findByText(/1 cell selected/i);

    fireEvent.keyDown(document, { key: "v", ctrlKey: true });

    await waitFor(() => expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledTimes(1));
    expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledWith([
      { id: "uuid-1", fields: { link_type: "DR 80+ External" } },
    ]);
  });
});

// ─── Editable select-cell combobox (Status, Link Type, Exact Match, Currency) ─
// A select-type cell opens as a free-text input backed by a floating options
// panel (CellOptionsDropdown), not a native <select> — so it can always keep a
// typed or pasted value that isn't in the column's preset list, the same way a
// plain text cell already can.

describe("LinkBuildingOrdersTable — editable select-cell combobox", () => {
  it("typing a value outside the preset list and pressing Enter saves it as free text", async () => {
    const row1 = makeRow({ id: "uuid-1", order_id: "BL-1", status: "New Request" });
    await renderTableWithRow(row1);
    mockUpdateLinkBuildingOrder.mockResolvedValue({
      message: "Updated",
      data: { ...row1, status: "Needs Client Approval" },
    });

    const status_cell = getTableCellByText("New Request");
    fireEvent.mouseDown(status_cell);
    fireEvent.mouseUp(status_cell);

    const input = screen.getByDisplayValue("New Request");
    fireEvent.change(input, { target: { value: "Needs Client Approval" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    const [id, payload] = mockUpdateLinkBuildingOrder.mock.calls[0];
    expect(id).toBe("uuid-1");
    expect(payload).toMatchObject({ status: "Needs Client Approval" });
  });

  it("shows a floating panel with every preset option while a Status cell is being edited", async () => {
    const row1 = makeRow({ id: "uuid-1", order_id: "BL-1", status: "New Request" });
    await renderTableWithRow(row1);

    const status_cell = getTableCellByText("New Request");
    fireEvent.mouseDown(status_cell);
    fireEvent.mouseUp(status_cell);

    // "New Request" matches the cell's current value, so every other preset option
    // (not yet typed over) should still be listed below it.
    expect(getDropdownOptionButton("Cancelled")).toBeInTheDocument();
    expect(getDropdownOptionButton("Live")).toBeInTheDocument();
  });

  it("clicking a preset option in the dropdown saves it immediately", async () => {
    const row1 = makeRow({ id: "uuid-1", order_id: "BL-1", status: "New Request" });
    await renderTableWithRow(row1);
    mockUpdateLinkBuildingOrder.mockResolvedValue({
      message: "Updated",
      data: { ...row1, status: "Reviewing" },
    });

    const status_cell = getTableCellByText("New Request");
    fireEvent.mouseDown(status_cell);
    fireEvent.mouseUp(status_cell);

    fireEvent.click(getDropdownOptionButton("Reviewing"));

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    const [, payload] = mockUpdateLinkBuildingOrder.mock.calls[0];
    expect(payload).toMatchObject({ status: "Reviewing" });
  });

  it('offers a "Use ..." row for text that does not match any preset option, and clicking it saves that text', async () => {
    const row1 = makeRow({ id: "uuid-1", order_id: "BL-1", status: "New Request" });
    await renderTableWithRow(row1);
    mockUpdateLinkBuildingOrder.mockResolvedValue({
      message: "Updated",
      data: { ...row1, status: "Needs Client Approval" },
    });

    const status_cell = getTableCellByText("New Request");
    fireEvent.mouseDown(status_cell);
    fireEvent.mouseUp(status_cell);

    const input = screen.getByDisplayValue("New Request");
    fireEvent.change(input, { target: { value: "Needs Client Approval" } });

    const use_custom_row = await screen.findByText(/Use\s/i);
    fireEvent.click(use_custom_row.closest("button")!);

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    const [, payload] = mockUpdateLinkBuildingOrder.mock.calls[0];
    expect(payload).toMatchObject({ status: "Needs Client Approval" });
  });

  it("does not offer a custom-value row once the typed text exactly matches a preset option", async () => {
    const row1 = makeRow({ id: "uuid-1", order_id: "BL-1", status: "New Request" });
    await renderTableWithRow(row1);

    const status_cell = getTableCellByText("New Request");
    fireEvent.mouseDown(status_cell);
    fireEvent.mouseUp(status_cell);

    const input = screen.getByDisplayValue("New Request");
    fireEvent.change(input, { target: { value: "Reviewing" } });

    expect(screen.queryByText(/Use\s/i)).not.toBeInTheDocument();
  });

  it("ArrowDown highlights options and Enter saves the highlighted one", async () => {
    const row1 = makeRow({ id: "uuid-1", order_id: "BL-1", status: "New Request" });
    await renderTableWithRow(row1);
    mockUpdateLinkBuildingOrder.mockResolvedValue({
      message: "Updated",
      data: { ...row1, status: "Reviewing" },
    });

    const status_cell = getTableCellByText("New Request");
    fireEvent.mouseDown(status_cell);
    fireEvent.mouseUp(status_cell);

    const input = screen.getByDisplayValue("New Request");
    // Clear the cell first so every preset option is listed from the top —
    // STATUS_OPTIONS starts with "New Request", so two ArrowDown presses land on
    // "Reviewing", the second entry.
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    const [, payload] = mockUpdateLinkBuildingOrder.mock.calls[0];
    expect(payload).toMatchObject({ status: "Reviewing" });
  });

  it("Link Type cell also opens as a free-text combobox, not a native <select>", async () => {
    const row1 = makeRow({ id: "uuid-1", order_id: "BL-1", link_type: "DR 30+ External" });
    await renderTableWithRow(row1);
    mockUpdateLinkBuildingOrder.mockResolvedValue({
      message: "Updated",
      data: { ...row1, link_type: "Guest Post External" },
    });

    const link_type_cell = getTableCellByText("DR 30+ External");
    fireEvent.mouseDown(link_type_cell);
    fireEvent.mouseUp(link_type_cell);

    const input = screen.getByDisplayValue("DR 30+ External");
    fireEvent.change(input, { target: { value: "Guest Post External" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    const [, payload] = mockUpdateLinkBuildingOrder.mock.calls[0];
    expect(payload).toMatchObject({ link_type: "Guest Post External" });
  });
});

// ─── Status cell save: the "client email notification queued" banner ────────
// The backend only ever queues a client email when the status actually changed
// (see update() on LinkBuildingOrdersDashboardController, which compares old vs.
// new status before notifying). The banner shown here must stay in sync with
// that — simply opening and closing the Status combobox without picking a
// different value must not claim an email was queued.

describe("LinkBuildingOrdersTable — Status cell save notification banner", () => {
  it("does not claim a client email was queued when the Status cell is closed without changing its value", async () => {
    const row1 = makeRow({ id: "uuid-1", order_id: "BL-1", status: "New Request", user_id: 42 });
    await renderTableWithRow(row1);
    // The row is eligible for the notification path (user_id is set), but the
    // saved status comes back unchanged — this is what the backend also does
    // for a no-op save.
    mockUpdateLinkBuildingOrder.mockResolvedValue({
      message: "Updated",
      data: { ...row1, status: "New Request" },
    });

    const status_cell = getTableCellByText("New Request");
    fireEvent.mouseDown(status_cell);
    fireEvent.mouseUp(status_cell);

    const input = screen.getByDisplayValue("New Request");
    fireEvent.blur(input);

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(/client email notification queued/i)).not.toBeInTheDocument();
  });

  it("shows the notification banner when the Status cell's value actually changes", async () => {
    const row1 = makeRow({ id: "uuid-1", order_id: "BL-1", status: "New Request", user_id: 42 });
    await renderTableWithRow(row1);
    mockUpdateLinkBuildingOrder.mockResolvedValue({
      message: "Updated",
      data: { ...row1, status: "Reviewing" },
    });

    const status_cell = getTableCellByText("New Request");
    fireEvent.mouseDown(status_cell);
    fireEvent.mouseUp(status_cell);

    const input = screen.getByDisplayValue("New Request");
    fireEvent.change(input, { target: { value: "Reviewing" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    await screen.findByText(/client email notification queued/i);
  });
});

// ─── Copy entire column (e.g. every domain, for pasting into Ahrefs) ────────

describe("LinkBuildingOrdersTable — copy entire column", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: jest.fn().mockResolvedValue(undefined),
        readText: jest.fn().mockResolvedValue(""),
      },
    });
  });

  it("copies every value in the column to the clipboard, respecting the current filters", async () => {
    const row = makeRow({ id: "uuid-1", order_id: "BL-1", landing_page: "https://acme.com" });
    await renderTableWithRow(row);

    mockGetLinkBuildingOrderColumnValues.mockResolvedValue([
      "https://acme.com",
      "https://globex.com",
    ]);

    fireEvent.click(
      screen.getByTitle(/Copy all "Landing Page" values matching the current filters/i)
    );

    await waitFor(() => expect(mockGetLinkBuildingOrderColumnValues).toHaveBeenCalledTimes(1));
    const [column, , row_ids] = mockGetLinkBuildingOrderColumnValues.mock.calls[0];
    expect(column).toBe("landing_page");
    expect(row_ids).toBeUndefined();

    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("https://acme.com\nhttps://globex.com")
    );
    await screen.findByText(/Copied 2 values from "Landing Page"/i);
  });

  it("restricts the copy to the checked rows instead of the current filters when rows are selected", async () => {
    const row = makeRow({ id: "uuid-1", order_id: "BL-1", landing_page: "https://acme.com" });
    await renderTableWithRow(row);

    mockGetLinkBuildingOrderColumnValues.mockResolvedValue(["https://acme.com"]);

    // Checkbox index 0 is the header "select all"; index 1 is this single row's.
    fireEvent.click(screen.getAllByRole("checkbox")[1]);

    const copy_button = await screen.findByTitle(
      /Copy all "Landing Page" values from the 1 selected row/i
    );
    fireEvent.click(copy_button);

    await waitFor(() => expect(mockGetLinkBuildingOrderColumnValues).toHaveBeenCalledTimes(1));
    const [, , row_ids] = mockGetLinkBuildingOrderColumnValues.mock.calls[0];
    expect(row_ids).toEqual(["uuid-1"]);
  });

  it("shows a friendly message instead of a blank copy when the column has no values", async () => {
    const row = makeRow({ id: "uuid-1", order_id: "BL-1", landing_page: "" });
    await renderTableWithRow(row);

    mockGetLinkBuildingOrderColumnValues.mockResolvedValue([]);

    fireEvent.click(
      screen.getByTitle(/Copy all "Landing Page" values matching the current filters/i)
    );

    await screen.findByText(/No values to copy from "Landing Page"/i);
  });
});
