import { linkBuildingService } from "./link-building.service";
import type {
  LinkBuildingOrderSummary,
  LinkBuildingOrderDetail,
  OrderStatus,
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
    });
  }

  return result;
};

// ── Status Mapping ────────────────────────────────────────────────────────────

export type DisplayStatus =
  | "Live"
  | "Pending with publisher"
  | "Writing article"
  | "Choosing domain"
  | "New request"
  | "Cancelled";

const api_to_display_status: Record<OrderStatus, DisplayStatus> = {
  pending: "New request",
  processing: "Writing article",
  completed: "Live",
  cancelled: "Cancelled",
};

export const mapOrderStatus = (api_status: OrderStatus): DisplayStatus =>
  api_to_display_status[api_status] ?? "New request";

// ── Dashboard Table Rows ──────────────────────────────────────────────────────

/**
 * A flat row representing a single placement (keyword + landing page)
 * within a link-building order item.  One row = one link being built.
 */
export interface DashboardTableRow {
  /** Short display ID derived from the order UUID */
  order_id: string;
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
}

/**
 * Builds flat DashboardTableRow[] from a fully-loaded order detail.
 * Each placement inside each item becomes its own table row.
 * If an item has no placements yet, one placeholder row is created.
 */
const expandOrderToRows = (detail: LinkBuildingOrderDetail): DashboardTableRow[] => {
  const rows: DashboardTableRow[] = [];
  const display_status = mapOrderStatus(detail.status);
  const completed_date =
    detail.status === "completed" ? detail.updated_at : "";

  for (const item of detail.items) {
    const dr_type = item.dr_tier?.dr_label ?? "—";

    if (item.placements.length === 0) {
      // Item exists but no keyword placements entered yet
      rows.push({
        order_id: detail.id,
        start_date: detail.created_at,
        dr_type,
        keyword: null,
        landing_page: null,
        status: display_status,
        live_link: "",
        completed_date,
        dr: null,
      });
    } else {
      for (const placement of item.placements) {
        rows.push({
          order_id: detail.id,
          start_date: detail.created_at,
          dr_type,
          keyword: placement.keyword,
          landing_page: placement.landing_page,
          status: display_status,
          live_link: "",
          completed_date,
          dr: null,
        });
      }
    }
  }

  return rows;
};

/**
 * Fetches all orders then loads their full details in parallel to build
 * the flattened table rows (DR type, keyword, landing page per placement).
 */
const fetchDashboardTableRows = async (): Promise<DashboardTableRow[]> => {
  const summaries = await linkBuildingService.fetchMyOrders();

  if (summaries.length === 0) return [];

  const details = await Promise.all(
    summaries.map((o) => linkBuildingService.fetchLinkBuildingOrderDetail(o.id))
  );

  return details.flatMap(expandOrderToRows);
};

// ── Service Object ────────────────────────────────────────────────────────────

export const dashboardService = {
  async fetchOrders(): Promise<LinkBuildingOrderSummary[]> {
    return linkBuildingService.fetchMyOrders();
  },
  fetchDashboardTableRows,
  computeStats,
  getMonthlyBreakdown,
  mapOrderStatus,
};
