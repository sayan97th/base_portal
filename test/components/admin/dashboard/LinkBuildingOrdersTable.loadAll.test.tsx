/**
 * Large result sets in the admin "Link Building Orders" table:
 *  - every row matching the filters is loaded, the first rows right away and the
 *    rest in batches by id, so spreadsheet features work on the whole set;
 *  - only the rows around the viewport are rendered, the rest are spacers;
 *  - the totals row waits for the last batch instead of showing a partial total;
 *  - the footer shows the loading progress;
 *  - a newer filter wins over the batches of an older load, and unchanged rows are reused;
 *  - drafts kept in the browser stay on top, and drafts already saved are dropped;
 *  - select all, find and keyboard navigation reach rows outside the rendered window.
 */

import React from "react";
import { render, screen, waitFor, within, fireEvent } from "@testing-library/react";
import LinkBuildingOrdersTable from "@/components/admin/dashboard/LinkBuildingOrdersTable";
import {
  listLinkBuildingOrders,
  getLinkBuildingOrderRowsByIds,
  listAdminUsersForSelect,
  listClientUsersForSelect,
} from "@/services/admin/link-building-dashboard.service";
import { listSheetFormulas } from "@/services/admin/link-building-sheet-formulas.service";
import { FIRST_ROWS_COUNT } from "@/lib/link-building-order-rows-loader";
import type { LinkBuildingOrderRow, LinkBuildingOrdersResponse } from "@/types/admin/link-building-order";

// ─── Module mocks ────────────────────────────────────────────────────────────

jest.mock("@/services/admin/link-building-dashboard.service", () => {
  const actual = jest.requireActual("@/services/admin/link-building-dashboard.service");
  return {
    ...actual,
    listLinkBuildingOrders: jest.fn(),
    getLinkBuildingOrderRowsByIds: jest.fn(),
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
const mockGetRowsByIds = getLinkBuildingOrderRowsByIds as jest.MockedFunction<typeof getLinkBuildingOrderRowsByIds>;
const mockListAdminUsersForSelect = listAdminUsersForSelect as jest.MockedFunction<typeof listAdminUsersForSelect>;
const mockListClientUsersForSelect = listClientUsersForSelect as jest.MockedFunction<typeof listClientUsersForSelect>;
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


/** `count` rows with ids uuid-1.. and order ids BL-1.., each with a DR of 1. */
function makeRows(count: number): LinkBuildingOrderRow[] {
  return Array.from({ length: count }, (_, idx) =>
    makeRow({ id: `uuid-${idx + 1}`, order_id: `BL-${idx + 1}`, dr_lbs: "1" })
  );
}

/** The first response of a load: the first rows plus the index of every row. */
function firstResponse(rows: LinkBuildingOrderRow[]): LinkBuildingOrdersResponse {
  const first_rows = rows.slice(0, FIRST_ROWS_COUNT);
  return {
    data: first_rows,
    current_page: 1,
    last_page: Math.max(1, Math.ceil(rows.length / FIRST_ROWS_COUNT)),
    per_page: FIRST_ROWS_COUNT,
    total: rows.length,
    from: rows.length > 0 ? 1 : null,
    to: first_rows.length,
    row_index: { ids: rows.map((row) => row.id), versions: rows.map(() => 1) },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockListAdminUsersForSelect.mockResolvedValue([]);
  mockListClientUsersForSelect.mockResolvedValue([]);
  mockListSheetFormulas.mockResolvedValue({ columns: [], summary: [] });
});

describe("LinkBuildingOrdersTable, loading every row", () => {
  it("asks for the row index with the first rows", async () => {
    mockListLinkBuildingOrders.mockResolvedValue(firstResponse(makeRows(3)));

    render(<LinkBuildingOrdersTable />);
    await screen.findByText("BL-1");

    expect(mockListLinkBuildingOrders).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, per_page: FIRST_ROWS_COUNT, include_row_index: true })
    );
    expect(mockGetRowsByIds).not.toHaveBeenCalled();
  });

  it("loads the rows after the first ones by id and shows the progress until they arrive", async () => {
    const rows = makeRows(FIRST_ROWS_COUNT + 5);
    const rest = deferred<LinkBuildingOrderRow[]>();
    mockListLinkBuildingOrders.mockResolvedValue(firstResponse(rows));
    mockGetRowsByIds.mockReturnValue(rest.promise);

    render(<LinkBuildingOrdersTable />);
    await screen.findByText("BL-1");

    expect(mockGetRowsByIds).toHaveBeenCalledWith(rows.slice(FIRST_ROWS_COUNT).map((row) => row.id));
    const footer = screen.getByRole("group", { name: "Table status" });
    expect(within(footer).getByText(`Loading ${FIRST_ROWS_COUNT} of ${FIRST_ROWS_COUNT + 5} rows`)).toBeInTheDocument();

    rest.resolve(rows.slice(FIRST_ROWS_COUNT));

    await waitFor(() => expect(within(footer).queryByRole("progressbar")).not.toBeInTheDocument());
    expect(screen.getByRole("grid")).toHaveAttribute("aria-rowcount", String(FIRST_ROWS_COUNT + 5));
  });

  it("renders only the rows around the viewport, with spacers for the rest", async () => {
    const rows = makeRows(FIRST_ROWS_COUNT);
    mockListLinkBuildingOrders.mockResolvedValue(firstResponse(rows));

    render(<LinkBuildingOrdersTable />);
    await screen.findByText("BL-1");

    const grid = screen.getByRole("grid");
    const rendered_rows = grid.querySelectorAll("tbody tr[data-virtual-row]");
    expect(rendered_rows.length).toBeGreaterThan(0);
    expect(rendered_rows.length).toBeLessThan(rows.length);
    expect(within(grid).queryByText(`BL-${FIRST_ROWS_COUNT}`)).not.toBeInTheDocument();
    expect(grid.querySelector("tbody tr[aria-hidden='true']")).not.toBeNull();
  });

  it("numbers the rows by their position in the whole result set", async () => {
    mockListLinkBuildingOrders.mockResolvedValue(firstResponse(makeRows(3)));

    render(<LinkBuildingOrdersTable />);
    await screen.findByText("BL-1");

    expect(screen.getByTitle("Select row 1")).toBeInTheDocument();
    expect(screen.getByTitle("Select row 3")).toBeInTheDocument();
  });

  it("holds the totals row back until every row is in, then totals all of them", async () => {
    mockListSheetFormulas.mockResolvedValue({
      columns: [],
      summary: [
        {
          id: 9,
          kind: "summary",
          key: "dr_lbs",
          target_key: "dr_lbs",
          name: null,
          formula: "=SUM([dr_lbs]:[dr_lbs])",
          format: "auto",
          position: 1,
          updated_by_name: null,
          created_at: null,
          updated_at: null,
        },
      ],
    });
    const rows = makeRows(FIRST_ROWS_COUNT + 5);
    const rest = deferred<LinkBuildingOrderRow[]>();
    mockListLinkBuildingOrders.mockResolvedValue(firstResponse(rows));
    mockGetRowsByIds.mockReturnValue(rest.promise);

    render(<LinkBuildingOrdersTable />);
    await screen.findByText("BL-1");
    const totals_row = screen.getByRole("grid").querySelector("tfoot") as HTMLElement;

    expect(await within(totals_row).findByText("Loading...")).toBeInTheDocument();
    expect(within(totals_row).queryByText(String(FIRST_ROWS_COUNT))).not.toBeInTheDocument();

    rest.resolve(rows.slice(FIRST_ROWS_COUNT));

    expect(await within(totals_row).findByText(String(FIRST_ROWS_COUNT + 5))).toBeInTheDocument();
  });

  it("says the table is incomplete when a later batch cannot be loaded", async () => {
    mockListLinkBuildingOrders.mockResolvedValue(firstResponse(makeRows(FIRST_ROWS_COUNT + 5)));
    mockGetRowsByIds.mockRejectedValue(new Error("server error"));

    render(<LinkBuildingOrdersTable />);

    expect(await screen.findByText(/Some link building orders could not be loaded/)).toBeInTheDocument();
    expect(screen.getByText("BL-1")).toBeInTheDocument();
  });
});

// ─── Integration helpers ─────────────────────────────────────────────────────

/** Renders the table and waits until every row (plus `draft_count` restored drafts) is in. */
async function renderFullyLoaded(rows: LinkBuildingOrderRow[], draft_count = 0): Promise<HTMLElement> {
  mockListLinkBuildingOrders.mockResolvedValue(firstResponse(rows));
  const by_id = new Map(rows.map((row) => [row.id, row]));
  mockGetRowsByIds.mockImplementation(async (ids) => ids.map((id) => by_id.get(id)!).filter(Boolean));
  render(<LinkBuildingOrdersTable />);
  await screen.findByText("BL-1");
  const grid = screen.getByRole("grid");
  await waitFor(() => expect(grid).toHaveAttribute("aria-rowcount", String(rows.length + draft_count)));
  await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());
  return grid;
}

function pickLinkType(link_type: string) {
  fireEvent.change(screen.getByRole("combobox", { name: "Filter by link type" }), {
    target: { value: link_type },
  });
}

/** Stored the way the table keeps unsaved drafts in this browser. */
function storeDrafts(drafts: Partial<LinkBuildingOrderRow>[]) {
  localStorage.setItem(
    "lbo_row_drafts_v1",
    JSON.stringify(drafts.map((draft) => {
      const { id: _id, ...rest } = makeRow(draft);
      return rest;
    }))
  );
}

describe("LinkBuildingOrdersTable, reloading every row", () => {
  it("ignores the batches of a load replaced by a newer filter", async () => {
    const old_rows = makeRows(FIRST_ROWS_COUNT + 5);
    const old_rest = deferred<LinkBuildingOrderRow[]>();
    mockListLinkBuildingOrders.mockResolvedValueOnce(firstResponse(old_rows));
    mockGetRowsByIds.mockReturnValueOnce(old_rest.promise);
    render(<LinkBuildingOrdersTable />);
    await screen.findByText("BL-1");

    const new_row = makeRow({ id: "uuid-900", order_id: "BL-900" });
    mockListLinkBuildingOrders.mockResolvedValueOnce(firstResponse([new_row]));
    pickLinkType("DR 50+ External");
    expect(await screen.findByText("BL-900")).toBeInTheDocument();

    // The old load's last batch arrives late, it must not be appended.
    old_rest.resolve(old_rows.slice(FIRST_ROWS_COUNT));

    const grid = screen.getByRole("grid");
    await waitFor(() => expect(grid).toHaveAttribute("aria-busy", "false"));
    expect(grid).toHaveAttribute("aria-rowcount", "1");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("sends the new filters with the reload and starts again from the first rows", async () => {
    await renderFullyLoaded(makeRows(3));

    mockListLinkBuildingOrders.mockResolvedValueOnce(firstResponse([makeRow({ id: "uuid-9", order_id: "BL-9" })]));
    pickLinkType("DR 50+ External");

    expect(await screen.findByText("BL-9")).toBeInTheDocument();
    expect(mockListLinkBuildingOrders).toHaveBeenLastCalledWith(
      expect.objectContaining({ link_type: "DR 50+ External", page: 1, include_row_index: true })
    );
    expect(screen.queryByText("BL-1")).not.toBeInTheDocument();
  });

  it("reuses the rows it already holds when the same orders come back after a filter change", async () => {
    const rows = makeRows(FIRST_ROWS_COUNT + 5);
    await renderFullyLoaded(rows);
    expect(mockGetRowsByIds).toHaveBeenCalledTimes(1);

    mockListLinkBuildingOrders.mockResolvedValueOnce(firstResponse(rows));
    pickLinkType("DR 50+ External");

    const grid = screen.getByRole("grid");
    await waitFor(() => expect(mockListLinkBuildingOrders).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(grid).toHaveAttribute("aria-rowcount", String(rows.length)));
    // The 5 rows after the first ones were already loaded at the same version.
    expect(mockGetRowsByIds).toHaveBeenCalledTimes(1);
  });

  it("shows an error when the first request fails", async () => {
    mockListLinkBuildingOrders.mockRejectedValue(new Error("network"));

    render(<LinkBuildingOrdersTable />);

    expect(await screen.findByText("Failed to load link building orders. Please refresh.")).toBeInTheDocument();
  });
});

describe("LinkBuildingOrdersTable, drafts while loading every row", () => {
  it("restores the drafts kept in this browser on top of the loaded rows", async () => {
    storeDrafts([{ order_id: "", keyword: "draft keyword" }]);

    await renderFullyLoaded(makeRows(3), 1);

    expect(screen.getByText("draft keyword")).toBeInTheDocument();
    // The draft has no row number, the first saved order is still row 1.
    expect(screen.getByText("new")).toBeInTheDocument();
  });

  it("keeps the drafts on top when the filters change", async () => {
    storeDrafts([{ order_id: "", keyword: "draft keyword" }]);
    await renderFullyLoaded(makeRows(3), 1);

    mockListLinkBuildingOrders.mockResolvedValueOnce(firstResponse([makeRow({ id: "uuid-9", order_id: "BL-9" })]));
    pickLinkType("DR 50+ External");

    expect(await screen.findByText("BL-9")).toBeInTheDocument();
    expect(screen.getByText("draft keyword")).toBeInTheDocument();
  });

  it("drops a restored draft whose order is already on the server", async () => {
    storeDrafts([{ order_id: `BL-${FIRST_ROWS_COUNT + 3}`, keyword: "already saved draft" }]);

    // The saved order only arrives with a later batch, after the first rows.
    await renderFullyLoaded(makeRows(FIRST_ROWS_COUNT + 5));

    await waitFor(() => expect(screen.queryByText("already saved draft")).not.toBeInTheDocument());
    expect(localStorage.getItem("lbo_row_drafts_v1")).toBeNull();
  });
});

describe("LinkBuildingOrdersTable, spreadsheet features over every row", () => {
  const original_scroll_to = Element.prototype.scrollTo;

  beforeEach(() => {
    // jsdom has no layout, scrolling just moves scrollTop and fires the event.
    Element.prototype.scrollTo = function scrollTo(this: Element, options?: ScrollToOptions | number) {
      if (typeof options === "object" && options?.top !== undefined) this.scrollTop = options.top;
      this.dispatchEvent(new Event("scroll"));
    } as typeof Element.prototype.scrollTo;
  });

  afterEach(() => {
    Element.prototype.scrollTo = original_scroll_to;
  });

  it("select all checks every row, also those outside the rendered window", async () => {
    const rows = makeRows(FIRST_ROWS_COUNT + 5);
    await renderFullyLoaded(rows);

    fireEvent.click(screen.getByTitle("Select / deselect all visible rows"));

    expect(await screen.findByText(`${rows.length} rows selected`)).toBeInTheDocument();
  });

  it("find counts the matches of rows that are not rendered", async () => {
    const rows = makeRows(FIRST_ROWS_COUNT + 5).map((row, idx) =>
      idx === 0 || idx === FIRST_ROWS_COUNT + 2 ? { ...row, keyword: "needle keyword" } : row
    );
    await renderFullyLoaded(rows);

    fireEvent.click(screen.getByRole("button", { name: "Find" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Find in table" }), { target: { value: "needle" } });

    expect(await screen.findByText(/of 2$/)).toBeInTheDocument();
    expect(screen.getByText("2 matching orders")).toBeInTheDocument();
  });

  it("jumps to the last row with Ctrl+ArrowDown and renders it", async () => {
    const rows = makeRows(FIRST_ROWS_COUNT + 5);
    const grid = await renderFullyLoaded(rows);
    expect(within(grid).queryByText(`BL-${rows.length}`)).not.toBeInTheDocument();

    const first_cell = within(grid).getByText("BL-1").closest("td") as HTMLElement;
    fireEvent.mouseDown(first_cell);
    fireEvent.mouseUp(first_cell);
    fireEvent.keyDown(grid, { key: "ArrowDown", ctrlKey: true });

    expect(screen.getByTitle("Active cell")).toHaveTextContent(`A${rows.length}`);
    expect(await within(grid).findByText(`BL-${rows.length}`)).toBeInTheDocument();
    expect(screen.getByTitle(`Select row ${rows.length}`)).toBeInTheDocument();
  });
});
