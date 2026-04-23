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
