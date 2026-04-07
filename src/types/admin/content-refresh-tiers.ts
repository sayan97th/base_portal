export interface AdminContentRefreshTier {
  id: string;
  label: string;
  word_count_range: string;
  turnaround_days: number;
  price: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CreateContentRefreshTierPayload {
  label: string;
  word_count_range: string;
  turnaround_days: number;
  price: number;
  is_active: boolean;
  sort_order: number;
}

export type UpdateContentRefreshTierPayload = Partial<CreateContentRefreshTierPayload>;
