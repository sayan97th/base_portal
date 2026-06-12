import { apiClient } from "@/lib/api-client";
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
  total_spend: orders.reduce((sum, o) => sum + o.total_amount, 0),
  active_orders: orders.filter(
    (o) => o.status === "pending" || o.status === "processing"
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

export const getMonthlyBreakdown = (
  orders: LinkBuildingOrderSummary[],
  months_count = 3
): MonthlyOrderData[] => {
  const now = new Date();
  const result: MonthlyOrderData[] = [];

  for (let i = 0; i < months_count; i++) {
    const target = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month_key = `${target.getFullYear()}-${String(
      target.getMonth() + 1
    ).padStart(2, "0")}`;
    const month_label = target.toLocaleString("en-US", {
      month: "long",
      year: "numeric",
    });

    const month_orders = orders.filter((o) => {
      const d = new Date(o.created_at);
      return (
        d.getFullYear() === target.getFullYear() &&
        d.getMonth() === target.getMonth()
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
  | "Scheduled";

const order_status_to_display: Record<OrderStatus, DisplayStatus> = {
  new_request:     "New request",
  pending:         "New request",
  payment_pending: "New request",
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
  return "New request";
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
  /** ISO date string when order was marked completed */
  completed_date: string;
  /** Actual DR score of the live link (populated from future tracking data) */
  dr: number | null;
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

// ── CSV Export ────────────────────────────────────────────────────────────────

const downloadOrderPlacements = async (search?: string, status?: string): Promise<void> => {
  const params = new URLSearchParams();
  if (search?.trim()) params.set("search", search.trim());
  if (status) params.set("status", status);

  const query = params.toString();
  const endpoint = `/api/link-building/order-placements/export${query ? `?${query}` : ""}`;

  const blob = await apiClient.get<Blob>(endpoint, { responseType: "blob" });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `order-placements-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

// ── Service Object ────────────────────────────────────────────────────────────

export const dashboardService = {
  async fetchOrders(): Promise<LinkBuildingOrderSummary[]> {
    return linkBuildingService.fetchAllOrders();
  },
  fetchPaginatedTableRows,
  downloadOrderPlacements,
  computeStats,
  getMonthlyBreakdown,
  mapOrderStatus,
};
