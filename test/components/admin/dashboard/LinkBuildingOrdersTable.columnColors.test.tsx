/**
 * Column header colors of the admin "Link Building Orders" table, which follow
 * the BASE links Google Sheet:
 *  - DR and Posting Fee, which Link Builders enter themselves, stay dark green;
 *  - Current Traffic, DR Formula, Current POC and Current Price share one color,
 *    without the dark green;
 *  - the approval and final price columns keep their own color;
 *  - the column chooser groups and colors the columns the same way, and hiding
 *    a group only hides its own columns;
 *  - moving the columns to a new group does not change how they are edited and saved.
 */

import React from "react";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import LinkBuildingOrdersTable from "@/components/admin/dashboard/LinkBuildingOrdersTable";
import {
  listLinkBuildingOrders,
  updateLinkBuildingOrder,
  listAdminUsersForSelect,
  listClientUsersForSelect,
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
const mockListSheetFormulas = listSheetFormulas as jest.MockedFunction<typeof listSheetFormulas>;

// ─── Fixtures ────────────────────────────────────────────────────────────────

const LINK_BUILDER_COLUMN_LABELS = ["DR", "Posting Fee"];
const TRAFFIC_AND_PRICING_COLUMN_LABELS = ["Current Traffic", "DR Formula", "Current POC", "Current Price"];
const APPROVAL_COLUMN_LABELS = ["LB TL Approval", "Approval Date", "Final Price", "Currency"];

const LINK_BUILDER_HEADER_CLASS = "bg-emerald-700";
const TRAFFIC_AND_PRICING_HEADER_CLASS = "bg-fuchsia-800";

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

/** The header cell of a column, found through its "copy column" button, which every data column has. */
function getColumnHeader(label: string): HTMLTableCellElement {
  const copy_button = screen.getByTitle(new RegExp(`^Copy all "${label}" values`, "i"));
  const header = copy_button.closest("th");
  if (!header) throw new Error(`No <th> found for the "${label}" column`);
  return header as HTMLTableCellElement;
}

function queryColumnHeader(label: string): HTMLElement | null {
  return screen.queryByTitle(new RegExp(`^Copy all "${label}" values`, "i"));
}

/** Labels of the data column headers, left to right. */
function getColumnHeaderOrder(): string[] {
  return screen
    .getAllByTitle(/^Copy all ".+" values/i)
    .map((button) => button.getAttribute("title")?.match(/^Copy all "(.+?)" values/i)?.[1] ?? "");
}

function openColumnChooser(): void {
  fireEvent.click(screen.getByRole("button", { name: /^Columns/ }));
}

/** The card of a column chooser group, found by its title. */
function getColumnChooserGroup(group_label: string): HTMLElement {
  const title = screen.getByText(group_label, { selector: "span" });
  const card = title.closest("div.rounded-xl");
  if (!card) throw new Error(`No column chooser card found for "${group_label}"`);
  return card as HTMLElement;
}

function typeIntoCell(grid: HTMLElement, current_text: string, new_text: string): void {
  const cell = within(grid).getByText(current_text).closest("td");
  if (!cell) throw new Error(`No <td> ancestor found for "${current_text}"`);
  fireEvent.mouseDown(cell);
  fireEvent.mouseUp(cell);
  fireEvent.doubleClick(cell);
  const input = within(grid).getByDisplayValue(current_text);
  fireEvent.change(input, { target: { value: new_text } });
  fireEvent.blur(input);
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  (listAdminUsersForSelect as jest.Mock).mockResolvedValue([]);
  (listClientUsersForSelect as jest.Mock).mockResolvedValue([]);
  mockListSheetFormulas.mockResolvedValue({ columns: [], summary: [] });
});

// ─── Header colors ───────────────────────────────────────────────────────────

describe("LinkBuildingOrdersTable, column header colors", () => {
  it("keeps DR and Posting Fee dark green, since Link Builders enter them", async () => {
    await renderTable([makeRow()]);

    LINK_BUILDER_COLUMN_LABELS.forEach((label) => {
      expect(getColumnHeader(label)).toHaveClass(LINK_BUILDER_HEADER_CLASS);
    });
  });

  it("removes the dark green from the Current Traffic column", async () => {
    await renderTable([makeRow()]);

    expect(getColumnHeader("Current Traffic")).not.toHaveClass(LINK_BUILDER_HEADER_CLASS);
  });

  it("colors Current Traffic, DR Formula, Current POC and Current Price the same", async () => {
    await renderTable([makeRow()]);

    TRAFFIC_AND_PRICING_COLUMN_LABELS.forEach((label) => {
      const header = getColumnHeader(label);
      expect(header).toHaveClass(TRAFFIC_AND_PRICING_HEADER_CLASS);
      expect(header).not.toHaveClass(LINK_BUILDER_HEADER_CLASS);
    });
  });

  it("keeps the approval and final price columns out of the traffic and pricing color", async () => {
    await renderTable([makeRow()]);

    APPROVAL_COLUMN_LABELS.forEach((label) => {
      const header = getColumnHeader(label);
      expect(header).not.toHaveClass(TRAFFIC_AND_PRICING_HEADER_CLASS);
      expect(header).not.toHaveClass(LINK_BUILDER_HEADER_CLASS);
    });
  });

  it("keeps the columns in the same order as the BASE links sheet", async () => {
    await renderTable([makeRow()]);

    const header_order = getColumnHeaderOrder();
    const start = header_order.indexOf("DR");
    expect(header_order.slice(start, start + 10)).toEqual([
      ...LINK_BUILDER_COLUMN_LABELS,
      ...TRAFFIC_AND_PRICING_COLUMN_LABELS,
      ...APPROVAL_COLUMN_LABELS,
    ]);
  });
});

// ─── Column chooser ──────────────────────────────────────────────────────────

describe("LinkBuildingOrdersTable, column chooser groups", () => {
  it("lists DR and Posting Fee under Link Builder Metrics, with the dark green swatch", async () => {
    await renderTable([makeRow()]);
    openColumnChooser();

    const group = getColumnChooserGroup("Link Builder Metrics");
    expect(group.querySelector(`.${LINK_BUILDER_HEADER_CLASS}`)).not.toBeNull();
    const column_labels = within(group).getAllByRole("button", { pressed: true }).map((button) => button.textContent?.trim());
    expect(column_labels).toEqual(LINK_BUILDER_COLUMN_LABELS);
  });

  it("lists the four traffic and pricing columns under Traffic and Pricing, with the matching swatch", async () => {
    await renderTable([makeRow()]);
    openColumnChooser();

    const group = getColumnChooserGroup("Traffic and Pricing");
    expect(group.querySelector(`.${TRAFFIC_AND_PRICING_HEADER_CLASS}`)).not.toBeNull();
    const column_labels = within(group).getAllByRole("button", { pressed: true }).map((button) => button.textContent?.trim());
    expect(column_labels).toEqual(TRAFFIC_AND_PRICING_COLUMN_LABELS);
  });

  it("hides only the traffic and pricing columns when that group is hidden", async () => {
    await renderTable([makeRow()]);
    openColumnChooser();

    fireEvent.click(within(getColumnChooserGroup("Traffic and Pricing")).getByRole("button", { name: "Hide group" }));

    await waitFor(() => expect(queryColumnHeader("Current Traffic")).toBeNull());
    TRAFFIC_AND_PRICING_COLUMN_LABELS.forEach((label) => expect(queryColumnHeader(label)).toBeNull());
    [...LINK_BUILDER_COLUMN_LABELS, ...APPROVAL_COLUMN_LABELS].forEach((label) => {
      expect(queryColumnHeader(label)).not.toBeNull();
    });
  });

  it("hides only DR and Posting Fee when the Link Builder Metrics group is hidden", async () => {
    await renderTable([makeRow()]);
    openColumnChooser();

    fireEvent.click(within(getColumnChooserGroup("Link Builder Metrics")).getByRole("button", { name: "Hide group" }));

    await waitFor(() => expect(queryColumnHeader("Posting Fee")).toBeNull());
    expect(queryColumnHeader("DR")).toBeNull();
    TRAFFIC_AND_PRICING_COLUMN_LABELS.forEach((label) => expect(queryColumnHeader(label)).not.toBeNull());
  });
});

// ─── Editing is unchanged ────────────────────────────────────────────────────

describe("LinkBuildingOrdersTable, editing the regrouped columns", () => {
  it.each([
    ["dr_lbs", "41", "55"],
    ["current_traffic", "1200", "3400"],
    ["dr_formula", "62", "70"],
    ["current_poc", "Jane Doe", "John Smith"],
  ] as const)("still saves %s to the server", async (field, old_value, new_value) => {
    const row = makeRow({ [field]: old_value });
    const grid = await renderTable([row]);
    mockUpdateLinkBuildingOrder.mockImplementation(async (_id, payload) => ({
      message: "Updated",
      data: { ...row, ...(payload as Partial<LinkBuildingOrderRow>) },
    }));

    typeIntoCell(grid, old_value, new_value);

    await waitFor(() => expect(mockUpdateLinkBuildingOrder).toHaveBeenCalledTimes(1));
    const [row_id, payload] = mockUpdateLinkBuildingOrder.mock.calls[0];
    expect(row_id).toBe("uuid-1");
    expect((payload as Partial<LinkBuildingOrderRow>)[field]).toBe(new_value);
    expect(await within(grid).findByText(new_value)).toBeInTheDocument();
  });
});
