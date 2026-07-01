/**
 * Tests for the admin "Link Building Orders" table's editable Order ID (BL-XXXXX)
 * column: format validation, uniqueness errors surfaced from the API, and the
 * guard that keeps order_id out of the PUT payload unless that specific cell was
 * the one edited (so a client-purchased row's UUID-derived fallback display id is
 * never silently persisted as a side effect of editing an unrelated field).
 */

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import LinkBuildingOrdersTable from "@/components/admin/dashboard/LinkBuildingOrdersTable";
import {
  listLinkBuildingOrders,
  updateLinkBuildingOrder,
  listAdminUsersForSelect,
  listClientUsersForSelect,
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

// ─── Order ID editing ────────────────────────────────────────────────────────

describe("LinkBuildingOrdersTable — Order ID (BL-XXXXX) editing", () => {
  it("saves a new order_id when it matches the BL-<number> format", async () => {
    const row = makeRow({ order_id: "BL-1" });
    await renderTableWithRow(row);
    mockUpdateLinkBuildingOrder.mockResolvedValue({
      message: "Updated",
      data: { ...row, order_id: "BL-25143" },
    });

    fireEvent.click(screen.getByText("BL-1"));
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

    fireEvent.click(screen.getByText("BL-1"));
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

    fireEvent.click(screen.getByText("BL-1"));
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

    fireEvent.click(screen.getByText("seo tools"));
    const input = screen.getByDisplayValue("seo tools");
    fireEvent.change(input, { target: { value: "local seo" } });
    fireEvent.blur(input);

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));

    const [, payload] = mockUpdateLinkBuildingOrder.mock.calls[0];
    expect(payload).not.toHaveProperty("order_id");
    expect(payload).toMatchObject({ keyword: "local seo" });
  });
});
