import type { OrderStatus } from "@/types/client/link-building";

export interface DeliverableSummary {
  order_id: string;
  order_title: string | null;
  status: OrderStatus;
  created_at: string;
  total_links: number;
  live_count: number;
  pending_count: number;
  tables_count: number;
  report_sent_at: string | null;
}

export interface DeliverableListFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: OrderStatus;
}
