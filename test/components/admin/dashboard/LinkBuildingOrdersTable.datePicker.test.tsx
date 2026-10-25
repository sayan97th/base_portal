/**
 * Calendar popover of the date cells in the admin "Link Building Orders" table
 * (monday.com style date column):
 *  - opens from the cell's calendar button, double click or Enter, only on date columns;
 *  - a picked day, Today, a quick pick or Clear is saved through the single row update;
 *  - Escape closes it without saving, typed dates move it, a typed formula hides it;
 *  - Up and Down step the date by one day while it is open;
 *  - formula date cells keep editing through their formula, with no calendar button.
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

const PICKER_NAME = { name: "Choose a date" } as const;

function dateCell(grid: HTMLElement, col_key: string, row_id = "uuid-1"): HTMLTableCellElement {
  return grid.querySelector(`[data-cell-key="${row_id}:${col_key}"]`) as HTMLTableCellElement;
}

/** A plain click (mouse down and up on the same cell) only selects the cell. */
function selectCell(cell: HTMLElement): void {
  fireEvent.mouseDown(cell);
  fireEvent.mouseUp(cell);
}

function openPickerWithEnter(grid: HTMLElement, col_key: string): HTMLInputElement {
  selectCell(dateCell(grid, col_key));
  fireEvent.keyDown(grid, { key: "Enter" });
  return within(dateCell(grid, col_key)).getByRole("textbox") as HTMLInputElement;
}

function savedFields(call_idx = 0): Partial<LinkBuildingOrderRow> {
  return mockUpdateLinkBuildingOrder.mock.calls[call_idx][1] as Partial<LinkBuildingOrderRow>;
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  // Only Date is faked, the table's own timers and promises keep running for real.
  jest.useFakeTimers({ doNotFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "setImmediate", "queueMicrotask", "nextTick", "requestAnimationFrame", "cancelAnimationFrame", "performance"] });
  jest.setSystemTime(new Date(2026, 9, 25, 10, 30));
  (listAdminUsersForSelect as jest.Mock).mockResolvedValue([]);
  (listClientUsersForSelect as jest.Mock).mockResolvedValue([]);
  mockListSheetFormulas.mockResolvedValue({ columns: [], summary: [] });
  mockBatchUpdateLinkBuildingOrderCells.mockResolvedValue({ message: "ok", updated_count: 0, data: [] });
  mockUpdateLinkBuildingOrder.mockImplementation(async (_id, payload) => ({
    message: "Updated",
    data: { ...makeRow(), ...(payload as Partial<LinkBuildingOrderRow>) },
  }));
});

afterEach(() => {
  jest.useRealTimers();
});

// ─── Opening ─────────────────────────────────────────────────────────────────

describe("LinkBuildingOrdersTable date picker: opening", () => {
  it("shows a calendar button on every date column and on no other column", async () => {
    const grid = await renderTable([makeRow()]);

    for (const label of ["Request Date", "Delivery Date", "Live Link Date", "Approval Date"]) {
      expect(within(grid).getByRole("button", { name: `Pick ${label}` })).toBeInTheDocument();
    }
    expect(within(dateCell(grid, "keyword")).queryByRole("button", { name: /^Pick / })).not.toBeInTheDocument();
    expect(within(dateCell(grid, "notes")).queryByRole("button", { name: /^Pick / })).not.toBeInTheDocument();
  });

  it("the calendar button opens the picker on the cell's month", async () => {
    const grid = await renderTable([makeRow({ live_link_date: "03/14/2026" })]);

    fireEvent.click(within(grid).getByRole("button", { name: "Pick Live Link Date" }));

    expect(screen.getByRole("dialog", PICKER_NAME)).toBeInTheDocument();
    expect(screen.getByRole("grid", { name: "March 2026" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "Saturday, March 14, 2026" })).toHaveAttribute("aria-selected", "true");
  });

  it("opens with Enter and with double click on a date cell", async () => {
    const grid = await renderTable([makeRow()]);
    openPickerWithEnter(grid, "approval_date");
    expect(screen.getByRole("dialog", PICKER_NAME)).toBeInTheDocument();
    fireEvent.keyDown(within(grid).getByRole("textbox"), { key: "Escape" });

    fireEvent.doubleClick(dateCell(grid, "live_link_date"));
    expect(screen.getByRole("dialog", PICKER_NAME)).toBeInTheDocument();
  });

  it("an empty date cell opens on today's month with a placeholder", async () => {
    const grid = await renderTable([makeRow({ live_link_date: "" })]);
    const input = openPickerWithEnter(grid, "live_link_date");

    expect(input).toHaveAttribute("placeholder", "MM/DD/YYYY");
    expect(screen.getByRole("grid", { name: "October 2026" })).toBeInTheDocument();
    expect(screen.getByText("No date set, pick a day below")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear date" })).toBeDisabled();
  });

  it("never opens on a text cell", async () => {
    const grid = await renderTable([makeRow()]);
    selectCell(dateCell(grid, "notes"));
    fireEvent.keyDown(grid, { key: "Enter" });

    expect(within(grid).getByRole("textbox")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", PICKER_NAME)).not.toBeInTheDocument();
  });
});

// ─── Picking and saving ──────────────────────────────────────────────────────

describe("LinkBuildingOrdersTable date picker: picking and saving", () => {
  it("a picked day is saved as MM/DD/YYYY and closes the picker", async () => {
    const grid = await renderTable([makeRow({ live_link_date: "10/05/2026" })]);
    fireEvent.click(within(grid).getByRole("button", { name: "Pick Live Link Date" }));

    fireEvent.click(screen.getByRole("gridcell", { name: "Monday, October 12, 2026" }));

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    expect(mockUpdateLinkBuildingOrder.mock.calls[0][0]).toBe("uuid-1");
    expect(savedFields()).toMatchObject({ live_link_date: "10/12/2026" });
    expect(screen.queryByRole("dialog", PICKER_NAME)).not.toBeInTheDocument();
    expect(within(dateCell(grid, "live_link_date")).getByText("10/12/2026")).toBeInTheDocument();
  });

  it("a day of another month is picked after moving with the arrows", async () => {
    const grid = await renderTable([makeRow({ approval_date: "12/20/2026" })]);
    fireEvent.click(within(grid).getByRole("button", { name: "Pick Approval Date" }));

    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    fireEvent.click(screen.getByRole("gridcell", { name: "Friday, January 15, 2027" }));

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    expect(savedFields()).toMatchObject({ approval_date: "01/15/2027" });
  });

  it("the month and year views jump straight to a far date", async () => {
    const grid = await renderTable([makeRow({ live_link_date: "10/05/2026" })]);
    fireEvent.click(within(grid).getByRole("button", { name: "Pick Live Link Date" }));

    fireEvent.click(screen.getByRole("button", { name: /^2026/ }));
    fireEvent.click(screen.getByRole("button", { name: "2028" }));
    fireEvent.click(screen.getByRole("button", { name: /^Oct/ }));
    fireEvent.click(screen.getByRole("button", { name: "Feb" }));
    fireEvent.click(screen.getByRole("gridcell", { name: "Tuesday, February 29, 2028" }));

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    expect(savedFields()).toMatchObject({ live_link_date: "02/29/2028" });
  });

  it("Today saves today's date", async () => {
    const grid = await renderTable([makeRow({ approval_date: "01/02/2026" })]);
    fireEvent.click(within(grid).getByRole("button", { name: "Pick Approval Date" }));

    fireEvent.click(screen.getByRole("button", { name: "Today" }));

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    expect(savedFields()).toMatchObject({ approval_date: "10/25/2026" });
  });

  it.each([
    ["Tomorrow", "10/26/2026"],
    ["+7 days", "11/01/2026"],
    ["+14 days", "11/08/2026"],
    ["+30 days", "11/24/2026"],
  ])("the %s quick pick saves %s", async (label, expected) => {
    const grid = await renderTable([makeRow()]);
    fireEvent.click(within(grid).getByRole("button", { name: "Pick Live Link Date" }));

    fireEvent.click(screen.getByRole("button", { name: label }));

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    expect(savedFields()).toMatchObject({ live_link_date: expected });
  });

  it("Clear empties the date and saves it", async () => {
    const grid = await renderTable([makeRow({ live_link_date: "10/05/2026" })]);
    fireEvent.click(within(grid).getByRole("button", { name: "Pick Live Link Date" }));

    fireEvent.click(screen.getByRole("button", { name: "Clear date" }));

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    expect(savedFields()).toMatchObject({ live_link_date: "" });
  });

  it("picking the day the cell already holds does not send a change", async () => {
    const grid = await renderTable([makeRow({ live_link_date: "10/05/2026" })]);
    fireEvent.click(within(grid).getByRole("button", { name: "Pick Live Link Date" }));

    fireEvent.click(screen.getByRole("gridcell", { name: "Monday, October 5, 2026" }));

    expect(screen.queryByRole("dialog", PICKER_NAME)).not.toBeInTheDocument();
    await waitFor(() => expect(within(dateCell(grid, "live_link_date")).getByText("10/05/2026")).toBeInTheDocument());
    const live_link_saves = mockUpdateLinkBuildingOrder.mock.calls.filter(
      ([, payload]) => (payload as Partial<LinkBuildingOrderRow>).live_link_date !== "10/05/2026"
    );
    expect(live_link_saves).toHaveLength(0);
  });

  it("the locked Delivery Date can still be picked one cell at a time", async () => {
    const grid = await renderTable([makeRow({ estimated_delivery_date: "10/31/2026" })]);
    fireEvent.click(within(grid).getByRole("button", { name: "Pick Delivery Date" }));

    fireEvent.click(screen.getByRole("gridcell", { name: "Friday, November 6, 2026" }));

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    expect(savedFields()).toMatchObject({ estimated_delivery_date: "11/06/2026" });
  });

  it("pressing inside the panel keeps the cell input focused, so the edit stays open", async () => {
    const grid = await renderTable([makeRow({ live_link_date: "10/05/2026" })]);
    const input = openPickerWithEnter(grid, "live_link_date");
    expect(input).toHaveFocus();

    const mouse_down = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    screen.getByRole("button", { name: "Next month" }).dispatchEvent(mouse_down);

    expect(mouse_down.defaultPrevented).toBe(true);
    expect(input).toHaveFocus();
    expect(screen.getByRole("dialog", PICKER_NAME)).toBeInTheDocument();
  });

  it("a mouse pick hands keyboard focus back to the grid", async () => {
    const grid = await renderTable([makeRow({ live_link_date: "10/05/2026" })]);
    openPickerWithEnter(grid, "live_link_date");

    fireEvent.click(screen.getByRole("gridcell", { name: "Monday, October 12, 2026" }));

    expect(document.activeElement).toBe(grid.closest("[tabindex]") ?? grid);
  });
});

// ─── Typing with the picker open ─────────────────────────────────────────────

describe("LinkBuildingOrdersTable date picker: typing", () => {
  it("Escape closes the picker and keeps the previous date", async () => {
    const grid = await renderTable([makeRow({ live_link_date: "10/05/2026" })]);
    const input = openPickerWithEnter(grid, "live_link_date");
    fireEvent.change(input, { target: { value: "12/24/2026" } });

    fireEvent.keyDown(input, { key: "Escape" });

    expect(screen.queryByRole("dialog", PICKER_NAME)).not.toBeInTheDocument();
    expect(within(dateCell(grid, "live_link_date")).getByText("10/05/2026")).toBeInTheDocument();
    expect(mockUpdateLinkBuildingOrder).not.toHaveBeenCalled();
  });

  it("a typed date moves the calendar to its month and Enter saves it", async () => {
    const grid = await renderTable([makeRow({ live_link_date: "10/05/2026" })]);
    const input = openPickerWithEnter(grid, "live_link_date");

    fireEvent.change(input, { target: { value: "7/4/2027" } });
    expect(screen.getByRole("grid", { name: "July 2027" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "Sunday, July 4, 2027" })).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    expect(savedFields()).toMatchObject({ live_link_date: "7/4/2027" });
  });

  it("text that is not a date yet keeps the calendar where it was and says so", async () => {
    const grid = await renderTable([makeRow({ live_link_date: "10/05/2026" })]);
    const input = openPickerWithEnter(grid, "live_link_date");

    fireEvent.change(input, { target: { value: "12/2" } });

    expect(screen.getByRole("grid", { name: "October 2026" })).toBeInTheDocument();
    expect(screen.getByText("Not a date yet, type MM/DD/YYYY or pick a day")).toBeInTheDocument();
  });

  it("a typed formula hides the picker so the formula helper is not covered", async () => {
    const grid = await renderTable([makeRow({ live_link_date: "10/05/2026" })]);
    const input = openPickerWithEnter(grid, "live_link_date");

    fireEvent.change(input, { target: { value: "=TODAY()" } });

    expect(screen.queryByRole("dialog", PICKER_NAME)).not.toBeInTheDocument();
  });

  it("Up and Down step the date by one day, across the year end", async () => {
    const grid = await renderTable([makeRow({ live_link_date: "12/31/2026" })]);
    const input = openPickerWithEnter(grid, "live_link_date");

    fireEvent.keyDown(input, { key: "ArrowUp" });
    expect(input.value).toBe("01/01/2027");
    expect(screen.getByRole("grid", { name: "January 2027" })).toBeInTheDocument();

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input.value).toBe("12/30/2026");
  });

  it("Up on an empty date starts from today", async () => {
    const grid = await renderTable([makeRow({ live_link_date: "" })]);
    const input = openPickerWithEnter(grid, "live_link_date");

    fireEvent.keyDown(input, { key: "ArrowUp" });

    expect(input.value).toBe("10/26/2026");
  });

  it("an edit started by typing keeps arrows as commit and move, like Excel", async () => {
    const grid = await renderTable([makeRow({ live_link_date: "" })]);
    selectCell(dateCell(grid, "live_link_date"));
    fireEvent.keyDown(grid, { key: "1" });
    const input = within(dateCell(grid, "live_link_date")).getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "11/11/2026" } });

    fireEvent.keyDown(input, { key: "ArrowDown" });

    expect(within(grid).queryByRole("textbox")).not.toBeInTheDocument();
    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    expect(savedFields()).toMatchObject({ live_link_date: "11/11/2026" });
  });
});

// ─── Shortcuts cheat sheet ───────────────────────────────────────────────────

describe("LinkBuildingOrdersTable date picker: shortcuts cheat sheet", () => {
  it("lists the Up and Down date stepping", async () => {
    await renderTable([makeRow()]);

    fireEvent.keyDown(document, { key: "/", metaKey: true });

    const dialog = screen.getByRole("dialog", { name: "Keyboard shortcuts" });
    expect(within(dialog).getByText("Move a date one day later or earlier (while editing a date)")).toBeInTheDocument();
  });
});
