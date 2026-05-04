import type { OrderStatus } from "@/types/admin";

export interface AdminContentOptimizationOrderFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: OrderStatus | "";
  sort_field?: "created_at" | "total_amount" | "status" | "order_title" | "customer";
  sort_direction?: "asc" | "desc";
  date_from?: string;
  date_to?: string;
}

export interface AdminContentOptimizationTier {
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

export interface CreateContentOptimizationTierPayload {
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

export type UpdateContentOptimizationTierPayload = Partial<CreateContentOptimizationTierPayload>;
