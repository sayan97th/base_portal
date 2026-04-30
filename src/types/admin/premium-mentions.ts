export interface AdminPremiumMentionsPlan {
  id: string;
  name: string;
  price_per_month: number;
  total_placements: number;
  exclusive_placements: number;
  core_placements: number;
  support_placements: number;
  best_for: string;
  tagline: string;
  is_most_popular: boolean;
  is_active: boolean;
  sort_order: number;
  orders_count?: number;
  revenue_total?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePremiumMentionsPlanPayload {
  name: string;
  price_per_month: number;
  total_placements: number;
  exclusive_placements: number;
  core_placements: number;
  support_placements: number;
  best_for: string;
  tagline: string;
  is_most_popular: boolean;
  is_active: boolean;
  sort_order: number;
}

export type UpdatePremiumMentionsPlanPayload = Partial<CreatePremiumMentionsPlanPayload>;

// ── Appointments ───────────────────────────────────────────────────────────────

export type PremiumMentionsAppointmentStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed";

export type PremiumMentionsAppointmentSortField =
  | "scheduled_at"
  | "created_at"
  | "status";

export type PremiumMentionsAppointmentSortDirection = "asc" | "desc";

export interface AdminPremiumMentionsAppointmentUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  organization?: string;
}

export interface AdminPremiumMentionsAppointmentPlan {
  id: string;
  name: string;
  price_per_month: number;
}

export interface AdminPremiumMentionsAppointment {
  id: number;
  event_uri: string;
  invitee_uri: string;
  plan_id: string;
  status: PremiumMentionsAppointmentStatus;
  scheduled_at: string | null;
  created_at: string;
  updated_at?: string;
  notes?: string;
  admin_notes?: string;
  user?: AdminPremiumMentionsAppointmentUser;
  plan?: AdminPremiumMentionsAppointmentPlan;
}

export interface AdminPremiumMentionsAppointmentFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: PremiumMentionsAppointmentStatus;
  plan_id?: string;
  sort_field?: PremiumMentionsAppointmentSortField;
  sort_direction?: PremiumMentionsAppointmentSortDirection;
  date_from?: string;
  date_to?: string;
}

export interface AdminPremiumMentionsAppointmentListResponse {
  data: AdminPremiumMentionsAppointment[];
  total: number;
  last_page: number;
  current_page: number;
  per_page: number;
}

export interface AdminPremiumMentionsAppointmentStats {
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  completed: number;
}

export interface UpdatePremiumMentionsAppointmentPayload {
  status?: PremiumMentionsAppointmentStatus;
  scheduled_at?: string;
  admin_notes?: string;
  notes?: string;
}
