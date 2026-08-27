import { getToken } from "@/lib/api-client";
import { linkBuildingService } from "./link-building.service";
import type {
  ClientPaginatedResponse,
  LinkBuildingOrderSummary,
  OrderPlacementFilters,
  OrderStatus,
  PlacementStatus,
} from "@/types/client/link-building";

// ── Stats ─────────────────────────────────────────────────────────────────────

export interface DashboardStats {
  total_orders: number;
  total_spend: number;
  active_orders: number;
  completed_orders: number;
  cancelled_orders: number;
}

export const computeStats = (orders: LinkBuildingOrderSummary[]): DashboardStats => ({
  total_orders: orders.length,
  // Only count non-cancelled orders toward total spend so voided/cancelled
  // orders do not inflate the amount the client actually paid.
  total_spend: orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.total_amount, 0),
  // new_request and payment_pending are also active states — include them.
  active_orders: orders.filter(
    (o) =>
      o.status === "new_request" ||
      o.status === "pending" ||
      o.status === "payment_pending" ||
      o.status === "processing"
  ).length,
  completed_orders: orders.filter((o) => o.status === "completed").length,
  cancelled_orders: orders.filter((o) => o.status === "cancelled").length,
});

// ── Monthly Breakdown ─────────────────────────────────────────────────────────

export interface MonthlyOrderData {
  month: string;
  month_key: string;
  order_count: number;
  items_count: number;
  total_spend: number;
  completion_rate: number;
  is_complete: boolean;
  has_no_orders: boolean;
  /** True only for the current calendar month (i === 0 in the breakdown loop). */
  is_current_month: boolean;
}

/** Default number of months shown when the caller does not request a specific window. */
const DEFAULT_MONTHLY_BREAKDOWN_MONTHS = 6;

/** Hard ceiling on how far back the breakdown will ever look, regardless of account age. */
const MAX_MONTHLY_BREAKDOWN_MONTHS = 24;

/**
 * Some orders migrated from the previous platform carry a created_at that
 * failed to parse, or a total_amount/items_count that was not fully
 * reconciled during import. Those orders are excluded from the monthly
 * bucketing below rather than allowed to throw or silently corrupt a
 * month's totals with NaN.
 */
const isUsableOrder = (order: LinkBuildingOrderSummary): boolean => {
  const parsed_date = new Date(order.created_at);
  return (
    !Number.isNaN(parsed_date.getTime()) &&
    Number.isFinite(order.total_amount) &&
    Number.isFinite(order.items_count)
  );
};

export const getMonthlyBreakdown = (
  orders: LinkBuildingOrderSummary[],
  months_count = DEFAULT_MONTHLY_BREAKDOWN_MONTHS
): MonthlyOrderData[] => {
  const now = new Date();
  const result: MonthlyOrderData[] = [];
  const usable_orders = orders.filter(isUsableOrder);
  const clamped_months_count = Math.min(
    Math.max(1, months_count),
    MAX_MONTHLY_BREAKDOWN_MONTHS
  );

  // The backend serializes created_at as a UTC timestamp. Bucketing it with
  // local getters (getFullYear/getMonth) while walking "now" in the same
  // local timezone still works most of the time, but an order created near
  // midnight UTC can land in the wrong calendar month for any client whose
  // timezone offset pushes that instant across a month boundary. Reading
  // both sides with the UTC getters keeps a single, consistent reference
  // frame so that never happens.
  const current_year = now.getUTCFullYear();
  const current_month = now.getUTCMonth();

  for (let i = 0; i < clamped_months_count; i++) {
    const target = new Date(Date.UTC(current_year, current_month - i, 1));
    const target_year = target.getUTCFullYear();
    const target_month = target.getUTCMonth();
    const month_key = `${target_year}-${String(target_month + 1).padStart(2, "0")}`;
    const month_label = target.toLocaleString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

    const month_orders = usable_orders.filter((o) => {
      const d = new Date(o.created_at);
      return (
        d.getUTCFullYear() === target_year && d.getUTCMonth() === target_month
      );
    });

    const order_count = month_orders.length;
    const completed_count = month_orders.filter(
      (o) => o.status === "completed"
    ).length;
    const items_total = month_orders.reduce((sum, o) => sum + o.items_count, 0);
    const spend_total = month_orders.reduce((sum, o) => sum + o.total_amount, 0);
    const completion_rate =
      order_count > 0 ? Math.round((completed_count / order_count) * 100) : 0;

    result.push({
      month: month_label,
      month_key,
      order_count,
      items_count: items_total,
      total_spend: spend_total,
      completion_rate,
      is_complete: order_count > 0 && completion_rate === 100,
      has_no_orders: order_count === 0,
      is_current_month: i === 0,
    });
  }

  return result;
};

// ── Status Mapping ────────────────────────────────────────────────────────────

// The admin Link Building Orders dashboard lets a placement's status be set to
// free text copied from the external BASE sheet, not just one of the known
// values below — so this can no longer be a closed union. `(string & {})`
// keeps IDE autocomplete for the known labels while still accepting anything.
export type DisplayStatus =
  // Mapped from order-level statuses (legacy + purchased orders)
  | "Live"
  | "Pending with publisher"
  | "Writing article"
  | "Choosing domain"
  | "New request"
  | "Cancelled"
  // Admin placement statuses shown directly to the client
  | "Reviewing"
  | "Ordered"
  | "Pending"
  | "Quality Control"
  | "Partnership Check"
  | "Approved"
  | "Not Approved"
  | "Ready"
  | "Rejected"
  | "Scheduled"
  | (string & {});

const order_status_to_display: Record<OrderStatus, DisplayStatus> = {
  new_request:     "New request",
  pending:         "New request",
  payment_pending: "New request",
  pending_details: "New request",
  processing:      "Writing article",
  completed:       "Live",
  cancelled:       "Cancelled",
};

const placement_status_to_display: Record<PlacementStatus, DisplayStatus> = {
  "New Request":      "New request",
  "Reviewing":        "Reviewing",
  "Ordered":          "Ordered",
  "Pending":          "Pending",
  "Live":             "Live",
  "Quality Control":  "Quality Control",
  "Cancelled":        "Cancelled",
  "Partnership Check":"Partnership Check",
  "Approved":         "Approved",
  "Not Approved":     "Not Approved",
  "Ready":            "Ready",
  "Rejected":         "Rejected",
  "Scheduled":        "Scheduled",
};

export const mapOrderStatus = (api_status: string): DisplayStatus => {
  if (api_status in order_status_to_display) {
    return order_status_to_display[api_status as OrderStatus];
  }
  if (api_status in placement_status_to_display) {
    return placement_status_to_display[api_status as PlacementStatus];
  }
  // A status set on the admin dashboard that doesn't match any known value
  // (e.g. free text pasted from the external BASE sheet) is shown to the
  // client as-is, rather than mislabeled as a specific known status like
  // "New request" — the client would otherwise see a placement's real,
  // custom status silently replaced with the wrong one.
  return api_status;
};

// ── Dashboard Table Rows ──────────────────────────────────────────────────────

/**
 * A flat row representing a single placement (keyword + landing page)
 * within a link-building order item.  One row = one link being built.
 * status is already mapped to a human-readable display value.
 */
export interface DashboardTableRow {
  /** Placement UUID — used to navigate to /link-building/placements/{id} for admin_assigned rows. */
  id: string;
  /** Raw order ID — UUID for purchased rows (used for /orders/{id} navigation), BL-XXXXX for admin-assigned. */
  order_id: string;
  /** Human-readable BL-XXXXX display ID, always present regardless of order source. */
  display_order_id: string;
  /** ISO date string from order.created_at */
  start_date: string;
  /** e.g. "DR 40+", "DR 60+" from the DR tier */
  dr_type: string;
  /** Target keyword for this placement */
  keyword: string | null;
  /** Landing page URL for this placement */
  landing_page: string | null;
  /** Mapped display status */
  status: DisplayStatus;
  /** Live link once the placement goes live (populated from future tracking data) */
  live_link: string;
  /** MM/DD/YYYY date string when the placement's live link went live, used as the order's completion date */
  completed_date: string;
  /** Internal DR value from the admin Link Building Orders dashboard, populated once the placement's live link is set */
  dr_lbs: string | null;
  /** ISO date string of when the link building request was submitted */
  request_date: string | null;
  /** Row origin: client-purchased order or admin-created standalone placement. */
  source: "purchased" | "admin_assigned";
}

/**
 * Fetches paginated placement rows from the server.
 * Calls GET /api/link-building/order-placements — a Laravel endpoint that
 * joins orders → items (with dr_tier) → placements.
 * Maps the raw OrderStatus to a DisplayStatus before returning.
 */
const fetchPaginatedTableRows = async (
  filters: OrderPlacementFilters = {}
): Promise<ClientPaginatedResponse<DashboardTableRow>> => {
  const result = await linkBuildingService.fetchMyOrderPlacements(filters);
  return {
    ...result,
    data: result.data.map((row) => ({
      ...row,
      status: mapOrderStatus(row.status),
    })),
  };
};

// ── Export ────────────────────────────────────────────────────────────────────

export type ExportFormat = "csv" | "xlsx";

export interface ExportOrderPlacementsOptions {
  format: ExportFormat;
  search?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  dr_type?: string;
  row_ids?: string[];
}

type ExportRow = Record<string, string | number | null>;

function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function exportOrderPlacements(options: ExportOrderPlacementsOptions): Promise<void> {
  const { format, search, status, date_from, date_to, dr_type, row_ids } = options;
  const token = getToken();
  const date_suffix = new Date().toISOString().slice(0, 10);

  const auth_headers: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const filter_body = { search, status, date_from, date_to, dr_type, row_ids };

  if (format === "csv") {
    const response = await fetch(`${BASE}/api/link-building/order-placements/export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/csv",
        ...auth_headers,
      },
      body: JSON.stringify({ format: "csv", ...filter_body }),
    });

    if (!response.ok) throw new Error("CSV export failed");

    const blob = await response.blob();
    triggerFileDownload(blob, `order-placements-${date_suffix}.csv`);
    return;
  }

  // Excel: fetch JSON data then generate XLSX client-side
  const response = await fetch(`${BASE}/api/link-building/order-placements/export`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...auth_headers,
    },
    body: JSON.stringify({ format: "json", ...filter_body }),
  });

  if (!response.ok) throw new Error("Excel export failed");

  const { data } = (await response.json()) as { data: ExportRow[] };

  const xlsx = await import("xlsx");

  const header_row = [
    "Order ID", "Start Date", "Request Date", "DR Type", "Keyword",
    "Landing Page", "Status", "Live Link", "Completed Date", "DR",
  ];

  const data_rows = data.map((row) => [
    row.display_order_id ?? "",
    row.start_date        ?? "",
    row.request_date      ?? "",
    row.dr_type           ?? "",
    row.keyword           ?? "",
    row.landing_page      ?? "",
    row.status            ?? "",
    row.live_link         ?? "",
    row.completed_date    ?? "",
    row.dr_lbs            ?? "",
  ]);

  const ws = xlsx.utils.aoa_to_sheet([header_row, ...data_rows]);

  // Set column widths
  ws["!cols"] = [20, 20, 20, 15, 30, 40, 20, 40, 20, 8].map((wch) => ({ wch }));

  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, "Order Placements");
  xlsx.writeFile(wb, `order-placements-${date_suffix}.xlsx`);
}

// Legacy GET-based download (kept for backward compatibility)
const downloadOrderPlacements = async (search?: string, status?: string): Promise<void> => {
  return exportOrderPlacements({ format: "csv", search, status });
};

// ── Service Object ────────────────────────────────────────────────────────────

export const dashboardService = {
  async fetchOrders(): Promise<LinkBuildingOrderSummary[]> {
    return linkBuildingService.fetchAllOrders();
  },
  fetchPaginatedTableRows,
  exportOrderPlacements,
  downloadOrderPlacements,
  computeStats,
  getMonthlyBreakdown,
  mapOrderStatus,
};
