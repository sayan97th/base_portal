/**
 * Default sort of the admin "Link Building Orders" table:
 *  - the table always opens with the newest orders first (Order ID, descending);
 *  - a sort kept in the user's auto saved view is not restored, unless a saved
 *    filter is applied, so an old sort never hides the latest orders;
 *  - the user can still sort by any column, and "Clear filters" goes back to newest first.
 */

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import LinkBuildingOrdersTable from "@/components/admin/dashboard/LinkBuildingOrdersTable";
import {
  listLinkBuildingOrders,
  listAdminUsersForSelect,
  listClientUsersForSelect,
} from "@/services/admin/link-building-dashboard.service";
import { getFilterPreference, listSavedFilters } from "@/services/admin/link-building-saved-filters.service";
import { listSheetFormulas } from "@/services/admin/link-building-sheet-formulas.service";
import { EMPTY_FILTER_STATE } from "@/lib/link-building-saved-filters";
import type {
  LinkBuildingOrderFilterState,
  LinkBuildingOrderRow,
  LinkBuildingOrdersResponse,
  LinkBuildingOrderSavedFilter,
  SortRulePayload,
} from "@/types/admin/link-building-order";

// ─── Module mocks ────────────────────────────────────────────────────────────

jest.mock("@/services/admin/link-building-dashboard.service", () => {
  const actual = jest.requireActual("@/services/admin/link-building-dashboard.service");
  return {
    ...actual,
    listLinkBuildingOrders: jest.fn(),
    getLinkBuildingOrderRowsByIds: jest.fn().mockResolvedValue([]),
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
  getFilterPreference: jest.fn(),
  saveFilterPreference: jest.fn().mockResolvedValue({ filters: null, applied_saved_filter_id: null, updated_at: null }),
}));

jest.mock("@/services/admin/link-building-sheet-formulas.service", () => ({
  listSheetFormulas: jest.fn(),
  createFormulaColumn: jest.fn(),
  updateFormulaColumn: jest.fn(),
  deleteFormulaColumn: jest.fn(),
  saveSummaryFormula: jest.fn(),
}));

// useTableSort is NOT mocked here: the real sort state is what these tests cover.

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
const mockListAdminUsersForSelect = listAdminUsersForSelect as jest.MockedFunction<typeof listAdminUsersForSelect>;
const mockListClientUsersForSelect = listClientUsersForSelect as jest.MockedFunction<typeof listClientUsersForSelect>;
const mockGetFilterPreference = getFilterPreference as jest.MockedFunction<typeof getFilterPreference>;
const mockListSavedFilters = listSavedFilters as jest.MockedFunction<typeof listSavedFilters>;
const mockListSheetFormulas = listSheetFormulas as jest.MockedFunction<typeof listSheetFormulas>;

// ─── Fixtures ────────────────────────────────────────────────────────────────

const NEWEST_FIRST: SortRulePayload[] = [{ key: "order_id", direction: "desc", nulls_last: true }];
const COMPANY_A_TO_Z: SortRulePayload[] = [{ key: "client", direction: "asc", nulls_last: true }];

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
    dr_lbs: "",
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

/** Rows as the API returns them for the default sort, newest order first. */
const NEWEST_ROWS = [
  makeRow({ id: "uuid-3", order_id: "BL-25009", client: "Zeta Corp" }),
  makeRow({ id: "uuid-2", order_id: "BL-9999", client: "Beta Corp" }),
  makeRow({ id: "uuid-1", order_id: "BL-100", client: "Acme Corp" }),
];

function searchResponse(rows: LinkBuildingOrderRow[]): LinkBuildingOrdersResponse {
  return {
    data: rows,
    current_page: 1,
    last_page: 1,
    per_page: 50,
    total: rows.length,
    from: rows.length > 0 ? 1 : null,
    to: rows.length,
    row_index: { ids: rows.map((row) => row.id), versions: rows.map(() => 1) },
  };
}

function makeSavedFilter(filters: LinkBuildingOrderFilterState): LinkBuildingOrderSavedFilter {
  return {
    id: "saved-1",
    name: "Companies A to Z",
    filters,
    is_shared: false,
    is_owner: true,
    can_delete: true,
    owner_name: "Admin User",
    created_at: null,
    updated_at: null,
  };
}

function mockRestoredView(filters: LinkBuildingOrderFilterState | null, applied_saved_filter_id: string | null = null) {
  mockGetFilterPreference.mockResolvedValue({ filters, applied_saved_filter_id, updated_at: null });
}

/** Sort rules sent with the first search request, the one that fills the table on load. */
function firstRequestSortRules() {
  return mockListLinkBuildingOrders.mock.calls[0]?.[0]?.sort_rules;
}

function lastRequestSortRules() {
  return mockListLinkBuildingOrders.mock.calls.at(-1)?.[0]?.sort_rules;
}

async function renderTable(): Promise<HTMLElement> {
  const { container } = render(<LinkBuildingOrdersTable />);
  await screen.findByText("BL-25009");
  return container;
}

function clickColumnHeader(container: HTMLElement, label: string): void {
  const button = container.querySelector<HTMLButtonElement>(`th[title="${label}"] button`);
  if (!button) throw new Error(`No sort button found in the "${label}" column header`);
  fireEvent.click(button);
}

/** Order ids in the order the rows are rendered. */
function renderedOrderIds(): string[] {
  return NEWEST_ROWS.map((row) => row.order_id)
    .map((order_id) => ({ order_id, node: screen.getByText(order_id) }))
    .sort((a, b) =>
      a.node.compareDocumentPosition(b.node) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    )
    .map(({ order_id }) => order_id);
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockListAdminUsersForSelect.mockResolvedValue([]);
  mockListClientUsersForSelect.mockResolvedValue([]);
  mockListSheetFormulas.mockResolvedValue({ columns: [], summary: [] });
  mockListSavedFilters.mockResolvedValue([]);
  mockListLinkBuildingOrders.mockResolvedValue(searchResponse(NEWEST_ROWS));
  mockRestoredView(null);
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("LinkBuildingOrdersTable, default sort", () => {
  it("asks for the newest orders first when the user has no saved view", async () => {
    await renderTable();

    expect(firstRequestSortRules()).toEqual(NEWEST_FIRST);
  });

  it("shows the rows in the order the API returns them, newest first", async () => {
    await renderTable();

    expect(renderedOrderIds()).toEqual(["BL-25009", "BL-9999", "BL-100"]);
  });

  it("does not count the default sort as a filter to clear", async () => {
    await renderTable();

    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();
  });

  it("ignores a sort kept in the user's last view and opens newest first", async () => {
    mockRestoredView({ ...EMPTY_FILTER_STATE, sort_rules: COMPANY_A_TO_Z });

    await renderTable();

    expect(firstRequestSortRules()).toEqual(NEWEST_FIRST);
    // Only the first load ran, no request ever went out with the old sort.
    expect(mockListLinkBuildingOrders.mock.calls.every(([body]) => body?.sort_rules?.[0]?.key === "order_id")).toBe(true);
  });

  it("still restores the filters of the last view while dropping its sort", async () => {
    mockRestoredView({ ...EMPTY_FILTER_STATE, status: "Live", search: "acme", sort_rules: COMPANY_A_TO_Z });

    await renderTable();

    expect(mockListLinkBuildingOrders.mock.calls[0][0]).toEqual(
      expect.objectContaining({ status: "Live", search: "acme", sort_rules: NEWEST_FIRST })
    );
  });

  it("keeps the sort of the last view while a saved filter is applied", async () => {
    const filters = { ...EMPTY_FILTER_STATE, sort_rules: COMPANY_A_TO_Z };
    mockListSavedFilters.mockResolvedValue([makeSavedFilter(filters)]);
    mockRestoredView(filters, "saved-1");

    await renderTable();

    expect(firstRequestSortRules()).toEqual(COMPANY_A_TO_Z);
  });

  it("opens newest first when the restored view can not be loaded", async () => {
    mockGetFilterPreference.mockRejectedValue(new Error("Network error"));

    await renderTable();

    expect(firstRequestSortRules()).toEqual(NEWEST_FIRST);
  });

  it("lets the user sort by another column during the session", async () => {
    const container = await renderTable();

    clickColumnHeader(container, "Company");

    await waitFor(() => expect(lastRequestSortRules()).toEqual(COMPANY_A_TO_Z));
  });

  it("goes back to newest first when the user clears the filters", async () => {
    const container = await renderTable();

    clickColumnHeader(container, "Company");
    await waitFor(() => expect(lastRequestSortRules()).toEqual(COMPANY_A_TO_Z));

    fireEvent.click(await screen.findByRole("button", { name: "Clear filters" }));

    await waitFor(() => expect(lastRequestSortRules()).toEqual(NEWEST_FIRST));
  });

  it("flips the Order ID column to oldest first and back to newest first", async () => {
    const container = await renderTable();

    clickColumnHeader(container, "Order ID");
    await waitFor(() =>
      expect(lastRequestSortRules()).toEqual([{ key: "order_id", direction: "asc", nulls_last: true }])
    );

    clickColumnHeader(container, "Order ID");
    await waitFor(() => expect(lastRequestSortRules()).toEqual(NEWEST_FIRST));
  });
});
