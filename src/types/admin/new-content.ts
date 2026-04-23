export interface AdminNewContentTier {
  id: number;
  tier_id: string;
  label: string;
  turnaround_time: string;
  price: string | number;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreateNewContentTierPayload {
  tier_id: string;
  label: string;
  turnaround_time: string;
  price: number;
  is_active: boolean;
  sort_order: number;
}

export type UpdateNewContentTierPayload = Partial<CreateNewContentTierPayload>;
