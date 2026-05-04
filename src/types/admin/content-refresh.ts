import type { OrderStatus } from "@/types/admin";

export interface AdminContentRefreshOrderFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: OrderStatus | "";
  sort_field?: "created_at" | "total_amount" | "status" | "order_title" | "customer";
  sort_direction?: "asc" | "desc";
  date_from?: string;
  date_to?: string;
}

export interface AdminContentRefreshTier {
  id: string;
  label: string;
  word_count_range: string;
  turnaround_days: number;
  price: number;
  is_active: boolean;
  is_most_popular: boolean;
  max_quantity: number | null;
  is_hidden: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateContentRefreshTierPayload {
  id: string;
  label: string;
  word_count_range: string;
  turnaround_days: number;
  price: number;
  is_active: boolean;
  is_most_popular: boolean;
  max_quantity: number | null;
  is_hidden: boolean;
  sort_order: number;
}

export type UpdateContentRefreshTierPayload = Partial<CreateContentRefreshTierPayload>;
