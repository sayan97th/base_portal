import type { OrderStatus } from "@/types/admin";

export interface AdminNewContentOrderFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: OrderStatus | "";
  sort_field?: "created_at" | "total_amount" | "status" | "order_title" | "customer";
  sort_direction?: "asc" | "desc";
  date_from?: string;
  date_to?: string;
}

export interface AdminNewContentTier {
  id: string;
  label: string;
  turnaround_time: string;
  price: string | number;
  is_active: boolean;
  is_most_popular: boolean;
  max_quantity: number | null;
  is_hidden: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateNewContentTierPayload {
  id: string;
  label: string;
  turnaround_time: string;
  price: number;
  is_active: boolean;
  is_most_popular: boolean;
  max_quantity: number | null;
  is_hidden: boolean;
  sort_order: number;
}

export type UpdateNewContentTierPayload = Partial<CreateNewContentTierPayload>;
