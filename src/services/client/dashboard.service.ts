import { linkBuildingService } from "./link-building.service";
import type { LinkBuildingOrderSummary, OrderStatus } from "@/types/client/link-building";

export interface DashboardStats {
  total_orders: number;
  total_spend: number;
  active_orders: number;
  completed_orders: number;
  cancelled_orders: number;
}

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

export type DisplayStatus =
  | "Live"
  | "Writing article"
  | "New request"
  | "Cancelled"
  | "Processing";

const api_to_display_status: Record<OrderStatus, DisplayStatus> = {
  pending: "New request",
  processing: "Writing article",
  completed: "Live",
  cancelled: "Cancelled",
};

export const mapOrderStatus = (api_status: OrderStatus): DisplayStatus =>
  api_to_display_status[api_status] ?? "New request";

export const computeStats = (orders: LinkBuildingOrderSummary[]): DashboardStats => ({
  total_orders: orders.length,
  total_spend: orders.reduce((sum, o) => sum + o.total_amount, 0),
  active_orders: orders.filter(
    (o) => o.status === "pending" || o.status === "processing"
  ).length,
  completed_orders: orders.filter((o) => o.status === "completed").length,
  cancelled_orders: orders.filter((o) => o.status === "cancelled").length,
});

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

export const dashboardService = {
  async fetchOrders(): Promise<LinkBuildingOrderSummary[]> {
    return linkBuildingService.fetchMyOrders();
  },
  computeStats,
  getMonthlyBreakdown,
  mapOrderStatus,
};
