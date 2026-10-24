/**
 * Mac friendly spreadsheet keyboard shortcuts in the admin "Link Building Orders"
 * table (Cmd on Mac, Ctrl on Windows and Linux, like Google Sheets):
 *  - Cmd+; inserts today's date, in a selected cell or at the caret of an open editor;
 *  - Cmd+X cuts, Cmd+D fills down and Cmd+R fills right, saved through the batch cell update;
 *  - Cmd+A, Shift+Space and Ctrl+Space select the page, the row and the column;
 *  - characters typed with Option (e.g. "@" on Spanish Mac keyboards) start editing;
 *  - Cmd+/ opens the shortcuts cheat sheet, and every hint uses the viewer's platform labels.
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

const row1 = makeRow({ id: "uuid-1", order_id: "BL-1", client: "Acme Corp", keyword: "seo tools", dr_lbs: "40" });
const row2 = makeRow({ id: "uuid-2", order_id: "BL-2", client: "Globex Inc", keyword: "ppc ads", dr_lbs: "15" });

// Column positions in the grid, after the row number and checkbox cells:
// E Company, F Keyword, I Notes, K Request Date (locked), R Live Link Date, S DR (number).
const COL_IDX = { client: 4, keyword: 5, notes: 8, request_date: 10, live_link_date: 17, dr_lbs: 18 } as const;

/** Today's date as the table's date columns store it, built here independently of the app code. */
function todayMMDDYYYY(): string {
  const now = new Date();
  return [now.getMonth() + 1, now.getDate()].map((part) => String(part).padStart(2, "0")).join("/") + `/${now.getFullYear()}`;
}

function cellAt(grid: HTMLElement, row_position: number, col_idx: number): HTMLTableCellElement {
  const row = grid.querySelectorAll("tbody tr")[row_position];
  return row.querySelectorAll("td")[2 + col_idx] as HTMLTableCellElement;
}

/** A plain click (mouse down and up on the same cell) only selects the cell. */
function selectCell(cell: HTMLElement): void {
  fireEvent.mouseDown(cell);
  fireEvent.mouseUp(cell);
}

function nameBoxText(): string {
  return screen.getByTitle("Active cell").textContent ?? "";
}

function mockClipboard(): void {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: {
      writeText: jest.fn().mockResolvedValue(undefined),
      readText: jest.fn().mockResolvedValue(""),
    },
  });
}

function mockPlatform(platform: string): void {
  Object.defineProperty(window.navigator, "platform", { configurable: true, get: () => platform });
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockClipboard();
  mockPlatform("MacIntel");
  (listAdminUsersForSelect as jest.Mock).mockResolvedValue([]);
  (listClientUsersForSelect as jest.Mock).mockResolvedValue([]);
  mockListSheetFormulas.mockResolvedValue({ columns: [], summary: [] });
  mockBatchUpdateLinkBuildingOrderCells.mockResolvedValue({ message: "ok", updated_count: 0, data: [] });
  mockUpdateLinkBuildingOrder.mockImplementation(async (id, payload) => ({
    message: "Updated",
    data: { ...(id === "uuid-1" ? row1 : row2), ...(payload as Partial<LinkBuildingOrderRow>) },
  }));
});

// ─── Cmd+; inserts today's date ──────────────────────────────────────────────

describe("LinkBuildingOrdersTable: insert today's date (Cmd+; / Ctrl+;)", () => {
  it("Cmd+; on a selected date cell opens it holding today's date, and Enter saves it", async () => {
    const grid = await renderTable([row1, row2]);
    selectCell(cellAt(grid, 0, COL_IDX.live_link_date));

    fireEvent.keyDown(grid, { key: ";", metaKey: true });
    const input = within(grid).getByDisplayValue(todayMMDDYYYY());
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    expect(mockUpdateLinkBuildingOrder.mock.calls[0][0]).toBe("uuid-1");
    expect(mockUpdateLinkBuildingOrder.mock.calls[0][1]).toMatchObject({ live_link_date: todayMMDDYYYY() });
    expect(nameBoxText()).toBe("R2");
  });

  it.each([
    ["Ctrl+; (Windows and Linux)", { ctrlKey: true, key: ";" }],
    ["Cmd+Shift+; typed as Cmd+: on Mac", { metaKey: true, shiftKey: true, key: ":" }],
  ])("%s inserts the date too", async (_label, key_event) => {
    const grid = await renderTable([row1]);
    selectCell(cellAt(grid, 0, COL_IDX.live_link_date));

    fireEvent.keyDown(grid, key_event);

    expect(within(grid).getByDisplayValue(todayMMDDYYYY())).toBeInTheDocument();
  });

  it("inserts the date at the caret of an open editor, keeping the text around it", async () => {
    const grid = await renderTable([row1]);
    selectCell(cellAt(grid, 0, COL_IDX.notes));
    fireEvent.keyDown(grid, { key: "Enter" });
    const input = within(grid).getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Called on " } });
    input.setSelectionRange(10, 10);

    fireEvent.keyDown(input, { key: ";", metaKey: true });

    expect(input.value).toBe(`Called on ${todayMMDDYYYY()}`);
  });

  it("replaces the selected text of an open editor with the date", async () => {
    const grid = await renderTable([makeRow({ live_link_date: "01/01/2020" })]);
    selectCell(within(grid).getByText("01/01/2020").closest("td") as HTMLElement);
    fireEvent.keyDown(grid, { key: "Enter" });
    const input = within(grid).getByDisplayValue("01/01/2020") as HTMLInputElement;
    input.setSelectionRange(0, input.value.length);

    fireEvent.keyDown(input, { key: ";", metaKey: true });

    expect(input.value).toBe(todayMMDDYYYY());
  });

  it("leaves number columns alone, where a date is not a valid value", async () => {
    const grid = await renderTable([row1]);
    selectCell(cellAt(grid, 0, COL_IDX.dr_lbs));

    fireEvent.keyDown(grid, { key: ";", metaKey: true });

    expect(within(grid).queryByRole("textbox")).not.toBeInTheDocument();
    expect(within(grid).queryByDisplayValue(todayMMDDYYYY())).not.toBeInTheDocument();
  });

  it("does nothing without Cmd or Ctrl, a plain ; just starts typing", async () => {
    const grid = await renderTable([row1]);
    selectCell(cellAt(grid, 0, COL_IDX.notes));

    fireEvent.keyDown(grid, { key: ";" });

    expect(within(grid).getByDisplayValue(";")).toBeInTheDocument();
  });
});

// ─── Cmd+X cut ───────────────────────────────────────────────────────────────

describe("LinkBuildingOrdersTable: cut (Cmd+X)", () => {
  it("copies the active cell to the clipboard and clears it", async () => {
    const grid = await renderTable([row1, row2]);
    selectCell(cellAt(grid, 0, COL_IDX.keyword));
    grid.focus();

    fireEvent.keyDown(document, { key: "x", metaKey: true });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("seo tools");
    await waitFor(() =>
      expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledWith([{ id: "uuid-1", fields: { keyword: "" } }], "clear")
    );
  });

  it("cuts a whole range: copies it as rows and columns, then clears every cell", async () => {
    const grid = await renderTable([row1, row2]);
    selectCell(cellAt(grid, 0, COL_IDX.client));
    fireEvent.keyDown(grid, { key: "ArrowDown", shiftKey: true });
    fireEvent.keyDown(grid, { key: "ArrowRight", shiftKey: true });
    grid.focus();

    fireEvent.keyDown(document, { key: "x", metaKey: true });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("Acme Corp\tseo tools\nGlobex Inc\tppc ads");
    await waitFor(() => expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledTimes(1));
    expect(mockBatchUpdateLinkBuildingOrderCells.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        { id: "uuid-1", fields: { client: "", keyword: "" } },
        { id: "uuid-2", fields: { client: "", keyword: "" } },
      ])
    );
  });

  it("keeps the browser's own cut while a cell is being edited", async () => {
    const grid = await renderTable([row1]);
    selectCell(cellAt(grid, 0, COL_IDX.keyword));
    fireEvent.keyDown(grid, { key: "Enter" });
    const input = within(grid).getByDisplayValue("seo tools");

    const event_allowed = fireEvent.keyDown(input, { key: "x", metaKey: true });

    expect(event_allowed).toBe(true);
    expect(mockBatchUpdateLinkBuildingOrderCells).not.toHaveBeenCalled();
  });
});

// ─── Cmd+D fill down, Cmd+R fill right ───────────────────────────────────────

describe("LinkBuildingOrdersTable: fill down (Cmd+D) and fill right (Cmd+R)", () => {
  it("Cmd+D copies the first row of the range into the rows below it", async () => {
    const grid = await renderTable([row1, row2]);
    selectCell(cellAt(grid, 0, COL_IDX.keyword));
    fireEvent.keyDown(grid, { key: "ArrowDown", shiftKey: true });
    grid.focus();

    const event_allowed = fireEvent.keyDown(document, { key: "d", metaKey: true });

    // The browser's own Cmd+D (bookmark this page) is blocked while the grid has focus.
    expect(event_allowed).toBe(false);
    await waitFor(() =>
      expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledWith([{ id: "uuid-2", fields: { keyword: "seo tools" } }], "fill")
    );
    expect(await screen.findByText(/Filled 1 cell across 1 row/i)).toBeInTheDocument();
  });

  it("Cmd+D with a single cell copies the cell above it", async () => {
    const grid = await renderTable([row1, row2]);
    selectCell(cellAt(grid, 1, COL_IDX.keyword));
    grid.focus();

    fireEvent.keyDown(document, { key: "d", metaKey: true });

    await waitFor(() =>
      expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledWith([{ id: "uuid-2", fields: { keyword: "seo tools" } }], "fill")
    );
  });

  it("Cmd+D on the first row has nothing above to copy and changes nothing", async () => {
    const grid = await renderTable([row1, row2]);
    selectCell(cellAt(grid, 0, COL_IDX.keyword));
    grid.focus();

    fireEvent.keyDown(document, { key: "d", metaKey: true });

    expect(mockBatchUpdateLinkBuildingOrderCells).not.toHaveBeenCalled();
  });

  it("Cmd+R copies the first column of the range into the columns to its right", async () => {
    const grid = await renderTable([row1]);
    selectCell(cellAt(grid, 0, COL_IDX.client));
    fireEvent.keyDown(grid, { key: "ArrowRight", shiftKey: true });
    grid.focus();

    const event_allowed = fireEvent.keyDown(document, { key: "r", metaKey: true });

    // The browser's own Cmd+R (reload) is blocked while the grid has focus.
    expect(event_allowed).toBe(false);
    await waitFor(() =>
      expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledWith([{ id: "uuid-1", fields: { keyword: "Acme Corp" } }], "fill")
    );
  });

  it("Ctrl+D fills down too, for Windows and Linux", async () => {
    const grid = await renderTable([row1, row2]);
    selectCell(cellAt(grid, 1, COL_IDX.keyword));
    grid.focus();

    fireEvent.keyDown(document, { key: "d", ctrlKey: true });

    await waitFor(() => expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledTimes(1));
  });

  it("fills a formula down with its row references following each row, like Google Sheets", async () => {
    const formula_row = makeRow({ ...row1, notes: "80", cell_formulas: { notes: "=[dr_lbs:~0]*2" } });
    const grid = await renderTable([formula_row, row2]);
    selectCell(cellAt(grid, 0, COL_IDX.notes));
    fireEvent.keyDown(grid, { key: "ArrowDown", shiftKey: true });
    grid.focus();

    fireEvent.keyDown(document, { key: "d", metaKey: true });

    // Row 2 gets =S2*2, computed from its own DR (15), stored row relative like row 1.
    await waitFor(() =>
      expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledWith([
        { id: "uuid-2", fields: { notes: "30" }, cell_formulas: { notes: "=[dr_lbs:~0]*2" } },
      ], "fill")
    );
  });

  it("never fills the locked date columns", async () => {
    const grid = await renderTable([
      makeRow({ ...row1, request_date: "10/01/2026" }),
      makeRow({ ...row2, request_date: "10/05/2026" }),
    ]);
    selectCell(cellAt(grid, 0, COL_IDX.request_date));
    fireEvent.keyDown(grid, { key: "ArrowDown", shiftKey: true });
    grid.focus();

    fireEvent.keyDown(document, { key: "d", metaKey: true });

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockBatchUpdateLinkBuildingOrderCells).not.toHaveBeenCalled();
  });

  it("leaves Cmd+D to the browser while a cell is being edited", async () => {
    const grid = await renderTable([row1, row2]);
    selectCell(cellAt(grid, 1, COL_IDX.keyword));
    fireEvent.keyDown(grid, { key: "Enter" });
    const input = within(grid).getByDisplayValue("ppc ads");

    fireEvent.keyDown(input, { key: "d", metaKey: true });

    expect(mockBatchUpdateLinkBuildingOrderCells).not.toHaveBeenCalled();
  });

  it("a fill can be undone with Cmd+Z", async () => {
    const grid = await renderTable([row1, row2]);
    mockBatchUpdateLinkBuildingOrderCells.mockResolvedValueOnce({
      message: "ok",
      updated_count: 1,
      data: [{ ...row2, keyword: "seo tools" }],
    });
    selectCell(cellAt(grid, 1, COL_IDX.keyword));
    grid.focus();
    fireEvent.keyDown(document, { key: "d", metaKey: true });
    await screen.findByText(/Filled 1 cell/i);

    grid.focus();
    fireEvent.keyDown(document, { key: "z", metaKey: true });

    await waitFor(() => expect(mockBatchUpdateLinkBuildingOrderCells).toHaveBeenCalledTimes(2));
    expect(mockBatchUpdateLinkBuildingOrderCells.mock.calls[1][0]).toEqual([
      expect.objectContaining({ id: "uuid-2", fields: { keyword: "ppc ads" } }),
    ]);
  });
});

// ─── Selection shortcuts ─────────────────────────────────────────────────────

describe("LinkBuildingOrdersTable: selection shortcuts", () => {
  it("Cmd+A selects every cell on the page", async () => {
    const grid = await renderTable([row1, row2]);
    selectCell(cellAt(grid, 1, COL_IDX.keyword));

    fireEvent.keyDown(grid, { key: "a", metaKey: true });

    expect(nameBoxText()).toBe("A1:AB2");
    expect(screen.getByText(/56 cells selected/i)).toBeInTheDocument();
  });

  it("Shift+Space selects the active row", async () => {
    const grid = await renderTable([row1, row2]);
    selectCell(cellAt(grid, 1, COL_IDX.keyword));

    fireEvent.keyDown(grid, { key: " ", shiftKey: true });

    expect(nameBoxText()).toBe("A2:AB2");
    expect(within(grid).queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("Ctrl+Space selects the active column", async () => {
    const grid = await renderTable([row1, row2]);
    selectCell(cellAt(grid, 0, COL_IDX.keyword));

    fireEvent.keyDown(grid, { key: " ", ctrlKey: true });

    expect(nameBoxText()).toBe("F1:F2");
  });

  it("a selected range can be cleared with Escape after Cmd+A", async () => {
    const grid = await renderTable([row1, row2]);
    selectCell(cellAt(grid, 0, COL_IDX.keyword));
    fireEvent.keyDown(grid, { key: "a", metaKey: true });

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByText(/cells selected/i)).not.toBeInTheDocument();
  });
});

// ─── Option and AltGr characters ─────────────────────────────────────────────

describe("LinkBuildingOrdersTable: characters typed with Option or AltGr", () => {
  it("Option+2 typing @ on a Spanish Mac keyboard starts editing with it", async () => {
    const grid = await renderTable([row1]);
    selectCell(cellAt(grid, 0, COL_IDX.notes));

    fireEvent.keyDown(grid, { key: "@", altKey: true });

    expect(within(grid).getByDisplayValue("@")).toBeInTheDocument();
  });

  it("AltGr (reported as Ctrl+Alt) typing # on Windows starts editing with it", async () => {
    const grid = await renderTable([row1]);
    selectCell(cellAt(grid, 0, COL_IDX.notes));

    fireEvent.keyDown(grid, { key: "#", ctrlKey: true, altKey: true });

    expect(within(grid).getByDisplayValue("#")).toBeInTheDocument();
  });
});

// ─── Shortcuts cheat sheet and platform labels ───────────────────────────────

describe("LinkBuildingOrdersTable: shortcuts cheat sheet and platform labels", () => {
  it("Cmd+/ opens the keyboard shortcuts dialog and Escape closes it", async () => {
    await renderTable([row1]);

    fireEvent.keyDown(document, { key: "/", metaKey: true });
    const dialog = screen.getByRole("dialog", { name: "Keyboard shortcuts" });
    expect(within(dialog).getByText("Insert today's date")).toBeInTheDocument();
    expect(within(dialog).getByText("⌘;")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Keyboard shortcuts" })).not.toBeInTheDocument();
  });

  it("Cmd+/ toggles the dialog closed again", async () => {
    await renderTable([row1]);

    fireEvent.keyDown(document, { key: "/", metaKey: true });
    fireEvent.keyDown(document, { key: "/", metaKey: true });

    expect(screen.queryByRole("dialog", { name: "Keyboard shortcuts" })).not.toBeInTheDocument();
  });

  it("the toolbar keyboard button opens the dialog", async () => {
    await renderTable([row1]);

    fireEvent.click(screen.getByRole("button", { name: "Keyboard shortcuts" }));

    expect(screen.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeInTheDocument();
  });

  it("shows Mac symbols to Mac users", async () => {
    const grid = await renderTable([row1]);

    expect(screen.getByRole("button", { name: "Find" })).toHaveAttribute("title", expect.stringContaining("⌘F"));
    expect(screen.getByRole("button", { name: "Keyboard shortcuts" })).toHaveAttribute("title", "Keyboard shortcuts (⌘/)");
    expect(cellAt(grid, 0, COL_IDX.keyword)).toHaveAttribute("title", expect.stringContaining("⌘; inserts today's date"));
  });

  it("shows Ctrl labels to Windows and Linux users", async () => {
    mockPlatform("Win32");
    const grid = await renderTable([row1]);

    expect(screen.getByRole("button", { name: "Find" })).toHaveAttribute("title", expect.stringContaining("Ctrl+F"));
    expect(screen.getByRole("button", { name: "Keyboard shortcuts" })).toHaveAttribute("title", "Keyboard shortcuts (Ctrl+/)");
    expect(cellAt(grid, 0, COL_IDX.keyword)).toHaveAttribute("title", expect.stringContaining("Ctrl+; inserts today's date"));
  });

  it("names the paste shortcut of the viewer's platform after copying a cell", async () => {
    const grid = await renderTable([row1]);
    selectCell(cellAt(grid, 0, COL_IDX.keyword));
    grid.focus();

    fireEvent.keyDown(document, { key: "c", metaKey: true });

    expect(await screen.findByText(/select rows, then press ⌘V to paste/i)).toBeInTheDocument();
  });
});
