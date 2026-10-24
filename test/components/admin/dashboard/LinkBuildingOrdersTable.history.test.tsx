/**
 * How the admin "Link Building Orders" table works with its version history:
 *  - the toolbar History button opens the history of the whole table, the clock
 *    of a row opens the edit history of that row;
 *  - rows restored from the history are merged into the grid, recreated rows on top;
 *  - a large restore sends no rows back and the grid reloads instead;
 *  - a large restore made by another admin reloads the grid once, from one broadcast.
 */

import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import LinkBuildingOrdersTable from "@/components/admin/dashboard/LinkBuildingOrdersTable";
import type { LinkBuildingOrderHistoryPanelProps } from "@/components/admin/dashboard/LinkBuildingOrderHistoryPanel";
import type { LinkBuildingRestoreResult } from "@/services/admin/link-building-order-history.service";
import type { UseLinkBuildingCollaborationOptions } from "@/hooks/useLinkBuildingCollaboration";
import {
  listLinkBuildingOrders,
  listAdminUsersForSelect,
  listClientUsersForSelect,
} from "@/services/admin/link-building-dashboard.service";
import { listSheetFormulas } from "@/services/admin/link-building-sheet-formulas.service";
import type { LinkBuildingOrderRow, LinkBuildingOrdersResponse } from "@/types/admin/link-building-order";

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

// The options the table passes to the collaboration hook, to fire its broadcasts.
const mockCollaboration: { options: UseLinkBuildingCollaborationOptions | null } = { options: null };

jest.mock("@/hooks/useLinkBuildingCollaboration", () => ({
  useLinkBuildingCollaboration: (options: UseLinkBuildingCollaborationOptions) => {
    mockCollaboration.options = options;
    return {
      collaborators: [],
      row_editors: new Map(),
      ready_state: "disconnected",
      local_session_id: "test-session",
      sendRowFocus: jest.fn(),
      sendRowBlur: jest.fn(),
      sendRowSelect: jest.fn(),
    };
  },
}));

// The latest props of the history panel, to check how it is opened and to call onRestored.
const mockPanel: { props: LinkBuildingOrderHistoryPanelProps | null } = { props: null };

jest.mock("@/components/admin/dashboard/LinkBuildingOrderHistoryPanel", () => ({
  __esModule: true,
  default: (props: LinkBuildingOrderHistoryPanelProps) => {
    mockPanel.props = props;
    return props.is_open ? <div data-testid="history-panel" data-row-id={props.row_id ?? "all"} /> : null;
  },
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
const mockListSheetFormulas = listSheetFormulas as jest.MockedFunction<typeof listSheetFormulas>;

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeRow(overrides: Partial<LinkBuildingOrderRow> = {}): LinkBuildingOrderRow {
  return {
    id: "uuid-1",
    order_id: "BL-25730",
    team_specific_link_id: "",
    link_type: "DR 60+ External",
    client: "Mather",
    keyword: "senior living",
    landing_page: "https://mather.com/a",
    exact_match: "No",
    notes: "",
    internal_notes: "",
    request_date: "10/15/2026",
    estimated_delivery_date: "11/14/2026",
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

function response(rows: LinkBuildingOrderRow[]): LinkBuildingOrdersResponse {
  return {
    data: rows,
    current_page: 1,
    last_page: 1,
    per_page: 100,
    total: rows.length,
    from: rows.length > 0 ? 1 : null,
    to: rows.length,
    row_index: { ids: rows.map((row) => row.id), versions: rows.map(() => 1) },
  };
}

function restoreResult(overrides: Partial<LinkBuildingRestoreResult> = {}): LinkBuildingRestoreResult {
  return {
    message: "Restored 2 cell(s).",
    applied: true,
    restored_cells: 2,
    recreated_rows: 0,
    conflicts: [],
    conflicts_count: 0,
    skipped: [],
    skipped_count: 0,
    reload_required: false,
    data: [],
    recreated_ids: [],
    ...overrides,
  };
}

async function renderTable(rows: LinkBuildingOrderRow[] = [makeRow()]) {
  mockListLinkBuildingOrders.mockResolvedValue(response(rows));
  render(<LinkBuildingOrdersTable />);
  await screen.findByText(rows[0].order_id);
  return screen.getByRole("grid");
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockPanel.props = null;
  mockCollaboration.options = null;
  mockListAdminUsersForSelect.mockResolvedValue([]);
  mockListClientUsersForSelect.mockResolvedValue([]);
  mockListSheetFormulas.mockResolvedValue({ columns: [], summary: [] });
});

// ─── Opening the history ─────────────────────────────────────────────────────

describe("LinkBuildingOrdersTable, opening the version history", () => {
  it("opens the history of the whole table from the toolbar", async () => {
    await renderTable();
    expect(screen.queryByTestId("history-panel")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "History" }));

    expect(screen.getByTestId("history-panel")).toHaveAttribute("data-row-id", "all");
  });

  it("opens the edit history of one row from its clock button", async () => {
    await renderTable();

    fireEvent.click(screen.getByRole("button", { name: "Edit history of BL-25730" }));

    expect(screen.getByTestId("history-panel")).toHaveAttribute("data-row-id", "uuid-1");
  });

  it("goes from a row history to the whole table and closes", async () => {
    await renderTable();
    fireEvent.click(screen.getByRole("button", { name: "Edit history of BL-25730" }));

    act(() => mockPanel.props!.onShowAllChanges());
    expect(screen.getByTestId("history-panel")).toHaveAttribute("data-row-id", "all");

    act(() => mockPanel.props!.onClose());
    expect(screen.queryByTestId("history-panel")).not.toBeInTheDocument();
  });

  it("names the changed columns like the grid headers", async () => {
    await renderTable();

    expect(mockPanel.props!.column_labels).toEqual(
      expect.objectContaining({ client: "Company", landing_page: "Landing Page", exact_match: "Exact Match?" })
    );
  });
});

// ─── Restored rows ───────────────────────────────────────────────────────────

describe("LinkBuildingOrdersTable, rows restored from the history", () => {
  it("shows the restored values in the grid", async () => {
    const grid = await renderTable();

    act(() => mockPanel.props!.onRestored(restoreResult({
      data: [makeRow({ client: "Weave", keyword: "other fatigue icd 10" })],
    })));

    expect(await within(grid).findByText("other fatigue icd 10")).toBeInTheDocument();
    expect(within(grid).queryByText("senior living")).not.toBeInTheDocument();
    expect(screen.getByText("Restored 2 cell(s).")).toBeInTheDocument();
  });

  it("puts a recreated row back on top of the grid", async () => {
    const grid = await renderTable();

    act(() => mockPanel.props!.onRestored(restoreResult({
      message: "Restored 1 deleted row(s).",
      recreated_rows: 1,
      data: [makeRow({ id: "uuid-deleted", order_id: "BL-25687", keyword: "back again" })],
      recreated_ids: ["uuid-deleted"],
    })));

    expect(await within(grid).findByText("BL-25687")).toBeInTheDocument();
    expect(within(grid).getByText("BL-25730")).toBeInTheDocument();
    expect(grid).toHaveAttribute("aria-rowcount", "2");
  });

  it("reloads the grid after a restore too large to send its rows back", async () => {
    await renderTable();
    expect(mockListLinkBuildingOrders).toHaveBeenCalledTimes(1);

    act(() => mockPanel.props!.onRestored(restoreResult({ message: "Restored 30,000 cell(s).", reload_required: true })));

    await waitFor(() => expect(mockListLinkBuildingOrders).toHaveBeenCalledTimes(2));
    expect(screen.getByText("Restored 30,000 cell(s).")).toBeInTheDocument();
  });
});

// ─── Broadcasts ──────────────────────────────────────────────────────────────

describe("LinkBuildingOrdersTable, large changes made by another admin", () => {
  it("reloads the grid once when another admin restores many rows", async () => {
    await renderTable();

    act(() => mockCollaboration.options!.onBulkChanged!("other-session"));

    await waitFor(() => expect(mockListLinkBuildingOrders).toHaveBeenCalledTimes(2));
  });

  it("ignores the broadcast of its own restore, already applied", async () => {
    await renderTable();

    act(() => mockCollaboration.options!.onBulkChanged!("test-session"));

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mockListLinkBuildingOrders).toHaveBeenCalledTimes(1);
  });
});
