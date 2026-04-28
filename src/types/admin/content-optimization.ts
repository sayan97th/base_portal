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
