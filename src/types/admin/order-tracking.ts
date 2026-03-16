import type { OrderStatus, OrderUser } from "@/types/admin";

export interface UpdateAuthor {
  id: number;
  first_name: string;
  last_name: string;
}

export interface OrderUpdate {
  id: string;
  order_id: string;
  title: string;
  message: string;
  status_change: OrderStatus | null;
  send_email: boolean;
  created_by: UpdateAuthor;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderUpdatePayload {
  title: string;
  message: string;
  status_change: OrderStatus | null;
  send_email: boolean;
}

export interface OrderUpdatesResponse {
  data: OrderUpdate[];
}

export interface TrackingOrderSummary {
  id: string;
  order_title: string | null;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  items_count: number;
  updates_count: number;
  last_update_at: string | null;
  user: OrderUser;
}

export interface TrackingOrdersResponse {
  data: TrackingOrderSummary[];
}
