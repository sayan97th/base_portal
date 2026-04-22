export interface ArticleTier {
  id: string;
  label: string;
  turnaround_time: string;
  price: number;
  is_active?: boolean;
  sort_order?: number;
}

export interface OrderItem {
  article_tier_id: string;
  quantity: number;
  unit_price: number;
}

export interface OrderBilling {
  company?: string | null;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}

export interface CreateOrderPayload {
  order_title?: string | null;
  order_notes?: string | null;
  total_amount: number;
  coupon_ids?: string[];
  items: OrderItem[];
  billing: OrderBilling;
  payment: {
    payment_method_id: string;
  };
}

export type OrderStatus = "pending" | "processing" | "completed" | "cancelled";

export interface NewContentOrderSummary {
  id: string;
  order_title: string | null;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  items_count: number;
  updates_count: number;
  last_update_at: string | null;
}

export interface OrderItemDetail {
  id: string;
  article_tier_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  article_tier: ArticleTier;
}

export interface OrderBillingDetail {
  id: string;
  company?: string | null;
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}

export interface NewContentOrderDetail {
  id: string;
  order_title: string | null;
  order_notes: string | null;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  items: OrderItemDetail[];
  billing: OrderBillingDetail;
}

export interface CreateOrderResponse {
  id: string;
  status: OrderStatus;
  total_amount: number;
}

export interface ClientPaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
