/**
 * Large result sets in the admin "Link Building Orders" table:
 *  - every row matching the filters is loaded, the first rows right away and the
 *    rest in batches by id, so spreadsheet features work on the whole set;
 *  - only the rows around the viewport are rendered, the rest are spacers;
 *  - the totals row waits for the last batch instead of showing a partial total;
 *  - the footer shows the loading progress.
 */

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
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
