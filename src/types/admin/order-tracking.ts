import type { OrderStatus } from "@/types/admin";

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
