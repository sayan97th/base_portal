/**
 * Tests for the admin "Link Building Orders" table:
 *  - the editable Order ID (BL-XXXXX) column: format validation, uniqueness errors
 *    surfaced from the API, and the guard that keeps order_id out of the PUT payload
 *    unless that specific cell was the one edited;
 *  - undo/redo (Ctrl+Z / Ctrl+Y and the toolbar buttons) for single-cell edits and
 *    bulk pastes;
 *  - Excel-style multi-cell range selection, copy (Ctrl+C) and paste (Ctrl+V);
 *  - spreadsheet style column filters (several values per column, several columns);
 *  - saved filters (saving the current view and reapplying a saved one);
 *  - the status filter bar (per status counts, picking a status, active filter chips).
 *  - loading transitions (the grid stays mounted while a filter reloads, stale responses are ignored).
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
  getLinkBuildingOrderColumnValues,
  getLinkBuildingOrderFilterValues,
  getLinkBuildingOrderStatusCounts,
} from "@/services/admin/link-building-dashboard.service";
import {
  listSavedFilters,
  createSavedFilter,
} from "@/services/admin/link-building-saved-filters.service";
import { EMPTY_FILTER_STATE } from "@/lib/link-building-saved-filters";
import type { LinkBuildingOrderRow, LinkBuildingOrderSavedFilter } from "@/types/admin/link-building-order";

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
    getLinkBuildingOrderFilterValues: jest.fn(),
    listAdminUsersForSelect:    jest.fn(),
    listClientUsersForSelect:   jest.fn(),
    listPenNamesForSelect:      jest.fn().mockResolvedValue([]),
    getNeedsLbTlApprovalCount:  jest.fn().mockResolvedValue(0),
    getLinkBuildingOrderStatusCounts: jest.fn().mockResolvedValue({ data: [], total: 0 }),
  };
});

jest.mock("@/services/admin/link-building-saved-filters.service", () => ({
  listSavedFilters:  jest.fn(),
  createSavedFilter: jest.fn(),
  updateSavedFilter: jest.fn(),
  deleteSavedFilter: jest.fn(),
}));

// NOTE: sort_rules must be referentially stable across renders, since
// the table's fetch effect depends on them, and a fresh array/object literal on
// every call would re-trigger the fetch effect forever (infinite "Loading…" loop).
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

// Presentational children unrelated to this feature — stub them out so the table
// can mount without pulling in websocket/dropdown/searchable-select internals.
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
const mockGetLinkBuildingOrderFilterValues = getLinkBuildingOrderFilterValues as jest.MockedFunction<typeof getLinkBuildingOrderFilterValues>;
const mockGetLinkBuildingOrderStatusCounts = getLinkBuildingOrderStatusCounts as jest.MockedFunction<typeof getLinkBuildingOrderStatusCounts>;
const mockListSavedFilters = listSavedFilters as jest.MockedFunction<typeof listSavedFilters>;
const mockCreateSavedFilter = createSavedFilter as jest.MockedFunction<typeof createSavedFilter>;

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

/** Search body of the most recent listLinkBuildingOrders call, failing loudly when there is none. */
function lastSearchBody(): NonNullable<Parameters<typeof listLinkBuildingOrders>[0]> {
  const last_body = mockListLinkBuildingOrders.mock.calls.at(-1)?.[0];
  if (!last_body) throw new Error("listLinkBuildingOrders has not been called with a search body yet");
  return last_body;
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
 * Opens a cell for editing. Like a spreadsheet, a plain click (a mousedown/mouseup
 * pair with no movement in between, see handleCellMouseDown/handleCellMouseUp in the
 * component) only selects the cell, and the double click that follows opens it.
 */
function openCellForEditing(display_text: string): void {
  const cell = screen.getByText(display_text).closest("td");
  if (!cell) throw new Error(`No <td> ancestor found for text "${display_text}"`);
  fireEvent.mouseDown(cell);
  fireEvent.mouseUp(cell);
  fireEvent.doubleClick(cell);
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
 * a portal into document.body) by its visible label, disambiguated from any other
 * element carrying the same text by requiring a <button> ancestor that is not one of
 * the status filter bar's pills (which also render plain status labels).
 */
function getDropdownOptionButton(label: string): HTMLElement {
  const button = screen
    .getAllByText(label)
    .map((el) => el.closest("button"))
    .find(
      (btn): btn is HTMLButtonElement =>
        btn !== null && btn.closest("[data-status-filter-bar]") === null
    );
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
    await within(screen.getByRole("grid")).findByText("local seo");

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
    await within(screen.getByRole("grid")).findByText("seo tools");

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
    await within(screen.getByRole("grid")).findByText("local seo");
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
    await within(screen.getByRole("grid")).findByText("New Client A");
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

    // A double click on "Acme Corp" opens it for editing (no range yet).
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
    await within(screen.getByRole("grid")).findByText("Needs Client Approval");
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
    fireEvent.doubleClick(status_cell);

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
    fireEvent.doubleClick(status_cell);

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
    fireEvent.doubleClick(status_cell);

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
    fireEvent.doubleClick(status_cell);

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
    fireEvent.doubleClick(status_cell);

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
    fireEvent.doubleClick(status_cell);

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
    fireEvent.doubleClick(link_type_cell);

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
    fireEvent.doubleClick(status_cell);

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
    fireEvent.doubleClick(status_cell);

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

describe("LinkBuildingOrdersTable, spreadsheet style column filters", () => {
  /** Column filters sent with the most recent search request. */
  function lastSearchColumnFilters() {
    const calls = mockListLinkBuildingOrders.mock.calls;
    return calls[calls.length - 1][0]?.column_filters;
  }

  function mockFilterValues(values: { value: string; count: number }[]) {
    mockGetLinkBuildingOrderFilterValues.mockResolvedValue({
      data: values,
      total_distinct: values.length,
      has_more: false,
    });
  }

  it("keeps several checked values of the same column and sends them as one include filter", async () => {
    await renderTableWithRow(makeRow());
    mockFilterValues([
      { value: "https://mather.com/a", count: 4 },
      { value: "https://mather.com/b", count: 2 },
      { value: "https://other.com", count: 9 },
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Filter Landing Page" }));
    await screen.findByText("https://other.com");

    // Everything starts checked, like Google Sheets. "Clear" then pick two.
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /https:\/\/mather\.com\/a/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /https:\/\/mather\.com\/b/ }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() =>
      expect(lastSearchColumnFilters()).toEqual([
        {
          key: "landing_page",
          type: "values",
          mode: "include",
          values: ["https://mather.com/a", "https://mather.com/b"],
        },
      ])
    );
    expect(screen.getByText("Filtered by:")).toBeInTheDocument();
  });

  it("applying while searching keeps only the checked matches", async () => {
    await renderTableWithRow(makeRow());
    mockFilterValues([{ value: "Acme Corp", count: 3 }]);

    fireEvent.click(screen.getByRole("button", { name: "Filter Company" }));
    await screen.findByText("Acme Corp");

    mockFilterValues([
      { value: "Mather", count: 5 },
      { value: "Mather Senior Living", count: 2 },
    ]);
    fireEvent.change(screen.getByRole("textbox", { name: "Search values" }), { target: { value: "mather" } });
    await screen.findByText("Mather Senior Living");
    expect(mockGetLinkBuildingOrderFilterValues).toHaveBeenLastCalledWith("client", expect.any(Object), "mather");

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() =>
      expect(lastSearchColumnFilters()).toEqual([
        { key: "client", type: "values", mode: "include", values: ["Mather", "Mather Senior Living"] },
      ])
    );
  });

  it("keeps filters on different columns at the same time and lets each one be removed", async () => {
    await renderTableWithRow(makeRow());

    // Column 1: exclude a single value by unchecking it.
    mockFilterValues([
      { value: "DR 30+ External", count: 4 },
      { value: "DR 50+ External", count: 1 },
    ]);
    fireEvent.click(screen.getByRole("button", { name: "Filter Link Type" }));
    fireEvent.click(await screen.findByRole("checkbox", { name: /DR 50\+ External/ }));
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    // Column 2: a "Text contains" condition.
    // Applying refetches the rows (the skeleton replaces the table meanwhile).
    mockFilterValues([{ value: "seo tools", count: 1 }]);
    fireEvent.click(await screen.findByRole("button", { name: "Filter Keyword" }));
    await screen.findByText("seo tools");
    fireEvent.click(screen.getByRole("button", { name: "Filter by condition" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Condition" }), { target: { value: "text_contains" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Condition value" }), { target: { value: "seo" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    await waitFor(() =>
      expect(lastSearchColumnFilters()).toEqual([
        { key: "link_type", type: "values", mode: "exclude", values: ["DR 50+ External"] },
        { key: "keyword", type: "condition", operator: "text_contains", value: "seo", value_to: undefined },
      ])
    );

    fireEvent.click(screen.getByRole("button", { name: "Remove the Link Type filter" }));

    await waitFor(() =>
      expect(lastSearchColumnFilters()).toEqual([
        { key: "keyword", type: "condition", operator: "text_contains", value: "seo", value_to: undefined },
      ])
    );
  });

  it("disables Apply when every value is unchecked", async () => {
    await renderTableWithRow(makeRow());
    mockFilterValues([{ value: "Acme Corp", count: 1 }]);

    fireEvent.click(screen.getByRole("button", { name: "Filter Company" }));
    await screen.findByText("Acme Corp");
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    expect(screen.getByText("Select at least one value.")).toBeInTheDocument();
  });
});

describe("LinkBuildingOrdersTable, saved filters", () => {
  function makeSavedFilter(overrides: Partial<LinkBuildingOrderSavedFilter> = {}): LinkBuildingOrderSavedFilter {
    return {
      id:         "saved-1",
      name:       "Live links by Jane",
      filters:    {
        ...EMPTY_FILTER_STATE,
        status:         "Live",
        sheet_filters:  {
          pen_name:     { condition: null, values: { mode: "include", values: ["Jane"] } },
          link_builder: { condition: null, values: { mode: "include", values: ["Ignored"] } },
        },
        hidden_columns: ["internal_notes", "column_that_no_longer_exists"],
      },
      is_shared:  false,
      is_owner:   true,
      can_delete: true,
      owner_name: "Admin User",
      created_at: null,
      updated_at: null,
      ...overrides,
    };
  }

  it("applies every part of a saved filter to the search request in one click", async () => {
    mockListSavedFilters.mockResolvedValue([makeSavedFilter()]);
    await renderTableWithRow(makeRow());

    fireEvent.click(screen.getByRole("button", { name: /Saved Filters/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Live links by Jane/ }));

    await waitFor(() =>
      expect(lastSearchBody()).toEqual(
        expect.objectContaining({
          status: "Live",
          // link_builder is not a column of this table, so the guard drops it.
          column_filters: [{ key: "pen_name", type: "values", mode: "include", values: ["Jane"] }],
        })
      )
    );
    // The toolbar now shows the applied filter by name.
    expect(screen.getByRole("button", { name: /Live links by Jane/ })).toBeInTheDocument();
  });

  it("saves the current toolbar and column filters under a name", async () => {
    mockListSavedFilters.mockResolvedValue([]);
    mockCreateSavedFilter.mockImplementation(async (payload) =>
      makeSavedFilter({ id: "saved-2", name: payload.name, filters: payload.filters })
    );
    await renderTableWithRow(makeRow());

    fireEvent.click(
      within(screen.getByRole("radiogroup", { name: "Filter by status" })).getByRole("radio", { name: /^Pending/ })
    );
    fireEvent.click(screen.getByRole("button", { name: /Saved Filters/ }));
    await screen.findByText(/No saved filters yet/);

    fireEvent.change(screen.getByRole("textbox", { name: "New saved filter name" }), {
      target: { value: "Pending orders" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mockCreateSavedFilter).toHaveBeenCalledTimes(1));
    expect(mockCreateSavedFilter.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        name: "Pending orders",
        is_shared: false,
        filters: expect.objectContaining({ status: "Pending" }),
      })
    );
    expect(await screen.findByText('Saved the current filters as "Pending orders".')).toBeInTheDocument();
  });
});

// ─── Spreadsheet keyboard navigation ─────────────────────────────────────────

describe("LinkBuildingOrdersTable — spreadsheet keyboard navigation", () => {
  // Column letters follow the visible column order: A Order ID, B Status,
  // C Team Specific Link ID, D Link Type, E Company, F Keyword.
  const row1 = makeRow({ id: "uuid-1", order_id: "BL-1", client: "Acme Corp", keyword: "seo tools" });
  const row2 = makeRow({ id: "uuid-2", order_id: "BL-2", client: "Globex Inc", keyword: "ppc ads" });

  async function renderTwoRows(): Promise<HTMLElement> {
    mockListLinkBuildingOrders.mockResolvedValue(mockSearchResponse([row1, row2]));
    render(<LinkBuildingOrdersTable />);
    await screen.findByText("BL-1");
    return screen.getByRole("grid");
  }

  /** A plain click (mouse down and up on the same cell) only selects the cell. */
  function clickCell(display_text: string): void {
    const cell = within(screen.getByRole("grid")).getByText(display_text).closest("td");
    if (!cell) throw new Error(`No <td> ancestor found for text "${display_text}"`);
    fireEvent.mouseDown(cell);
    fireEvent.mouseUp(cell);
  }

  function nameBoxText(): string {
    return screen.getByTitle("Active cell").textContent ?? "";
  }

  it("a single click selects the cell without opening it for editing", async () => {
    await renderTwoRows();

    clickCell("Acme Corp");

    expect(nameBoxText()).toBe("E1");
    expect(screen.queryByDisplayValue("Acme Corp")).not.toBeInTheDocument();
  });

  it("arrow keys move the active cell and the formula bar shows its full value", async () => {
    const grid = await renderTwoRows();
    clickCell("Acme Corp");

    fireEvent.keyDown(grid, { key: "ArrowRight" });
    expect(nameBoxText()).toBe("F1");
    // Once in the grid cell and once in the formula bar.
    expect(screen.getAllByText("seo tools")).toHaveLength(2);

    fireEvent.keyDown(grid, { key: "ArrowDown" });
    expect(nameBoxText()).toBe("F2");

    fireEvent.keyDown(grid, { key: "ArrowLeft" });
    fireEvent.keyDown(grid, { key: "ArrowUp" });
    expect(nameBoxText()).toBe("E1");

    // Ctrl+ArrowLeft jumps straight to the first column.
    fireEvent.keyDown(grid, { key: "ArrowLeft", ctrlKey: true });
    expect(nameBoxText()).toBe("A1");
  });

  it("Tab moves right and Enter opens the active cell for editing", async () => {
    const grid = await renderTwoRows();
    clickCell("Acme Corp");

    fireEvent.keyDown(grid, { key: "Tab" });
    expect(nameBoxText()).toBe("F1");

    fireEvent.keyDown(grid, { key: "Enter" });
    expect(screen.getByDisplayValue("seo tools")).toBeInTheDocument();
  });

  it("typing starts editing with the typed character, and an arrow key commits and moves", async () => {
    const grid = await renderTwoRows();
    mockUpdateLinkBuildingOrder.mockResolvedValue({
      message: "Updated",
      data: { ...row1, keyword: "xyz" },
    });
    clickCell("seo tools");

    fireEvent.keyDown(grid, { key: "x" });
    const input = screen.getByDisplayValue("x");
    fireEvent.change(input, { target: { value: "xyz" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    expect(mockUpdateLinkBuildingOrder.mock.calls[0][1]).toMatchObject({ keyword: "xyz" });
    expect(nameBoxText()).toBe("F2");
  });

  it("Escape discards the edit and restores the original value without saving", async () => {
    const grid = await renderTwoRows();
    clickCell("seo tools");

    fireEvent.keyDown(grid, { key: "F2" });
    const input = screen.getByDisplayValue("seo tools");
    fireEvent.change(input, { target: { value: "changed" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.queryByDisplayValue("changed")).not.toBeInTheDocument();
    expect(within(grid).getByText("seo tools")).toBeInTheDocument();
    expect(mockUpdateLinkBuildingOrder).not.toHaveBeenCalled();
    expect(nameBoxText()).toBe("F1");
  });

  it("Shift+Arrow extends a range from the active cell", async () => {
    const grid = await renderTwoRows();
    clickCell("seo tools");

    fireEvent.keyDown(grid, { key: "ArrowDown", shiftKey: true });

    expect(nameBoxText()).toBe("F1:F2");
  });

  it("Delete clears the active cell through the batch cell update", async () => {
    const grid = await renderTwoRows();
    mockBatchUpdateLinkBuildingOrderCells.mockResolvedValue({
      message: "1 row(s) updated successfully.",
      updated_count: 1,
      data: [{ ...row1, keyword: "" }],
    });
    clickCell("seo tools");

    fireEvent.keyDown(grid, { key: "Delete" });

    await waitFor(() =>
      expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledWith([
        { id: "uuid-1", fields: { keyword: "" } },
      ])
    );
    expect(await screen.findByText(/Cleared 1 cell across 1 row/i)).toBeInTheDocument();
  });
});

// ─── Fixed column layout ─────────────────────────────────────────────────────

describe("LinkBuildingOrdersTable — fixed column layout", () => {
  it("builds the frozen columns' sticky offsets from the same widths as the colgroup", async () => {
    await renderTableWithRow(makeRow());

    const table = screen.getByRole("grid").querySelector("table");
    const col_widths = Array.from(table!.querySelectorAll("colgroup col")).map((col) =>
      parseInt((col as HTMLElement).style.width, 10)
    );
    // gutter, checkbox, Order ID, ...
    const [gutter_width, checkbox_width, order_id_width] = col_widths;

    const company_header = screen.getByTitle("Company");
    expect(company_header.style.left).toBe(`${gutter_width + checkbox_width + order_id_width}px`);

    // The table is exactly as wide as its columns, so nothing stretches past them.
    const total_width = col_widths.reduce((sum, width) => sum + width, 0);
    expect(table!.style.width).toBe(`${total_width}px`);
  });
});

// ─── Status filter bar ───────────────────────────────────────────────────────

describe("LinkBuildingOrdersTable, status filter bar", () => {
  function statusBar() {
    return within(screen.getByRole("radiogroup", { name: "Filter by status" }));
  }

  it("shows the row count of every status and of All orders", async () => {
    mockGetLinkBuildingOrderStatusCounts.mockResolvedValue({
      data: [
        { status: "Live", count: 12 },
        { status: "Pending", count: 3 },
        { status: "Waiting On Writer", count: 2 },
      ],
      total: 17,
    });
    await renderTableWithRow(makeRow());

    expect(await statusBar().findByRole("radio", { name: "All orders 17" })).toBeChecked();
    expect(statusBar().getByRole("radio", { name: "Live 12" })).toBeInTheDocument();
    expect(statusBar().getByRole("radio", { name: "Reviewing 0" })).toBeInTheDocument();
    // A status typed by hand, outside the preset list, still gets its own pill.
    expect(statusBar().getByRole("radio", { name: "Waiting On Writer 2" })).toBeInTheDocument();
  });

  it("filters by the picked status, lists it as a chip, and clicking it again shows every status", async () => {
    await renderTableWithRow(makeRow());

    fireEvent.click(statusBar().getByRole("radio", { name: /^Live/ }));

    await waitFor(() => expect(lastSearchBody()).toEqual(expect.objectContaining({ status: "Live" })));
    expect(statusBar().getByRole("radio", { name: /^Live/ })).toBeChecked();
    expect(screen.getByRole("button", { name: "Remove the Status quick filter" })).toBeInTheDocument();

    fireEvent.click(statusBar().getByRole("radio", { name: /^Live/ }));

    await waitFor(() => expect(lastSearchBody().status).toBeUndefined());
    expect(statusBar().getByRole("radio", { name: /^All orders/ })).toBeChecked();
  });

  it("picking a status turns the Needs LB TL Approval view off", async () => {
    await renderTableWithRow(makeRow());

    fireEvent.click(statusBar().getByRole("radio", { name: /^Needs LB TL Approval/ }));
    await waitFor(() =>
      expect(lastSearchBody()).toEqual(expect.objectContaining({ needs_lb_tl_approval: true }))
    );

    fireEvent.click(statusBar().getByRole("radio", { name: /^Pending/ }));

    await waitFor(() =>
      expect(lastSearchBody()).toEqual(
        expect.objectContaining({ status: "Pending", needs_lb_tl_approval: undefined })
      )
    );
  });

  it("asks for the status counts with the current filters", async () => {
    await renderTableWithRow(makeRow());

    fireEvent.change(screen.getByRole("combobox", { name: "Filter by link type" }), {
      target: { value: "DR 50+ External" },
    });

    await waitFor(() =>
      expect(mockGetLinkBuildingOrderStatusCounts).toHaveBeenLastCalledWith(
        expect.objectContaining({ link_type: "DR 50+ External" })
      )
    );
  });
});

// ─── Loading transitions ─────────────────────────────────────────────────────

describe("LinkBuildingOrdersTable, loading transitions", () => {
  function statusBar() {
    return within(screen.getByRole("radiogroup", { name: "Filter by status" }));
  }

  /** A promise for a search response that the test resolves by hand. */
  function deferredSearch() {
    let resolve!: (value: ReturnType<typeof mockSearchResponse>) => void;
    const promise = new Promise<ReturnType<typeof mockSearchResponse>>((res) => {
      resolve = res;
    });
    return { promise, resolve };
  }

  it("keeps the grid and its rows on screen, marked busy, while a filter reloads", async () => {
    await renderTableWithRow(makeRow({ order_id: "BL-1" }));

    const pending = deferredSearch();
    mockListLinkBuildingOrders.mockReturnValueOnce(pending.promise);
    fireEvent.click(statusBar().getByRole("radio", { name: /^Live/ }));

    const grid = screen.getByRole("grid");
    await waitFor(() => expect(grid).toHaveAttribute("aria-busy", "true"));
    expect(screen.getByText("BL-1")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading link building orders" })).not.toBeInTheDocument();

    pending.resolve(mockSearchResponse([makeRow({ id: "uuid-2", order_id: "BL-2" })]));

    expect(await screen.findByText("BL-2")).toBeInTheDocument();
    expect(screen.queryByText("BL-1")).not.toBeInTheDocument();
    expect(screen.getByRole("grid")).toHaveAttribute("aria-busy", "false");
  });

  it("ignores a slow response once a newer filter has already loaded", async () => {
    await renderTableWithRow(makeRow({ order_id: "BL-1" }));

    const slow = deferredSearch();
    const fast = deferredSearch();
    mockListLinkBuildingOrders.mockReturnValueOnce(slow.promise).mockReturnValueOnce(fast.promise);

    fireEvent.click(statusBar().getByRole("radio", { name: /^Live/ }));
    fireEvent.click(statusBar().getByRole("radio", { name: /^Pending/ }));

    fast.resolve(mockSearchResponse([makeRow({ id: "uuid-3", order_id: "BL-3" })]));
    expect(await screen.findByText("BL-3")).toBeInTheDocument();

    slow.resolve(mockSearchResponse([makeRow({ id: "uuid-2", order_id: "BL-2" })]));
    await waitFor(() => expect(screen.getByRole("grid")).toHaveAttribute("aria-busy", "false"));
    expect(screen.queryByText("BL-2")).not.toBeInTheDocument();
    expect(screen.getByText("BL-3")).toBeInTheDocument();
  });
});
