import { apiClient } from "@/lib/api-client";

// ── Types ──────────────────────────────────────────────────────────────────────

export type SeoSubscriptionStatus = "active" | "cancelled" | "expired";
export type SeoSubscriptionSortField =
  | "starts_at"
  | "ends_at"
  | "created_at"
  | "status"
  | "monthly_price"
  | "next_billing_date";
export type SortDirection = "asc" | "desc";
export type SeoSubscriptionPricingType = "package" | "custom";
export type SeoSubscriptionPaymentStatus = "current" | "past_due";
export type SeoSubscriptionChargeStatus = "pending" | "succeeded" | "failed";
export type SeoSubscriptionChargeTrigger = "automatic" | "manual" | "external";

export interface AdminSeoSubscriptionUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  organization?: string;
}

export interface AdminSeoSubscriptionPackage {
  id: string;
  name: string;
  slug: string;
  price_per_month: number;
}

export interface AdminSeoSubscriptionCard {
  id: string;
  card_brand: string;
  last_four: string;
  expiry_month: string;
  expiry_year: string;
}

export interface AdminSeoSubscriptionCharge {
  id: number;
  period_start: string;
  period_end: string;
  period_label: string;
  amount: number;
  status: SeoSubscriptionChargeStatus;
  trigger: SeoSubscriptionChargeTrigger;
  attempt_count: number;
  last_attempt_at: string | null;
  next_retry_at: string | null;
  paid_at: string | null;
  card_label: string | null;
  failure_code: string | null;
  failure_message: string | null;
  payment_intent_id: string | null;
  charged_by?: { id: number; name: string } | null;
  invoice?: {
    id: string;
    unique_id: string;
    invoice_number: string;
    status: string;
    total_amount: number;
  } | null;
  created_at: string;
}

export interface AdminSeoSubscription {
  id: number;
  user: AdminSeoSubscriptionUser;
  package: AdminSeoSubscriptionPackage | null;
  status: SeoSubscriptionStatus;
  starts_at: string;
  ends_at: string | null;
  cancelled_at: string | null;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
  plan_name: string;
  pricing_type: SeoSubscriptionPricingType;
  monthly_price: number;
  invoice_item_label: string;
  invoice_item_description: string | null;
  auto_renew: boolean;
  auto_renew_disabled_at: string | null;
  billing_anchor_day: number | null;
  next_billing_date: string | null;
  reminder_days_before: number | null;
  payment_status: SeoSubscriptionPaymentStatus;
  payment_profile_id: string | null;
  payment_profile?: AdminSeoSubscriptionCard | null;
  last_charge?: AdminSeoSubscriptionCharge | null;
  charges?: AdminSeoSubscriptionCharge[];
}

export interface AdminSeoSubscriptionUpcomingCharge {
  date: string;
  period_label: string;
  amount: number;
}

export interface AdminSeoSubscriptionSummary {
  total_collected: number;
  successful_count: number;
  failed_count: number;
  upcoming: AdminSeoSubscriptionUpcomingCharge[];
  card_on_file: boolean;
}

export interface AdminSeoSubscriptionDetail {
  data: AdminSeoSubscription;
  summary: AdminSeoSubscriptionSummary;
  message?: string;
}

export interface AdminSeoSubscriptionFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: SeoSubscriptionStatus;
  sort_field?: SeoSubscriptionSortField;
  sort_direction?: SortDirection;
  package_id?: string;
  payment_status?: SeoSubscriptionPaymentStatus;
}

export interface AdminSeoSubscriptionListResponse {
  data: AdminSeoSubscription[];
  total: number;
  last_page: number;
  current_page: number;
  per_page: number;
}

export interface SeoSubscriptionStats {
  total: number;
  active: number;
  cancelled: number;
  expired: number;
  past_due: number;
  auto_renew: number;
  monthly_recurring: number;
  renewing_next_7_days: number;
  collected_this_month: number;
}

export interface ActivateSeoSubscriptionPayload {
  user_id: number;
  pricing_type: SeoSubscriptionPricingType;
  package_id?: string | null;
  custom_price?: number | null;
  custom_plan_name?: string | null;
  invoice_item_label?: string | null;
  invoice_item_description?: string | null;
  starts_at: string;
  first_billing_date?: string | null;
  ends_at?: string | null;
  auto_renew?: boolean;
  payment_profile_id?: string | null;
  reminder_days_before?: number | null;
  charge_now?: boolean;
  notes?: string;
}

export interface ActivateSeoSubscriptionResult {
  data: AdminSeoSubscription;
  charge_result: { success: boolean; message: string } | null;
}

export type UpdateSeoSubscriptionPayload = Partial<
  Omit<ActivateSeoSubscriptionPayload, "user_id" | "starts_at" | "first_billing_date" | "charge_now">
> & {
  next_billing_date?: string | null;
};

export interface CancelSeoSubscriptionPayload {
  notes?: string;
}

export interface AdminUserSearchResult {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  organization?: string;
}

export interface AdminClientPaymentProfile {
  id: string;
  card_brand: string;
  last_four: string;
  expiry_month: string;
  expiry_year: string;
  cardholder_name: string | null;
  is_default: boolean;
  is_expired: boolean;
}

export interface ApiErrorShape {
  message?: string;
  errors?: Record<string, string[]>;
  status_code?: number;
}

/** First readable message from an apiClient error. */
export function extractApiError(error: unknown, fallback: string): string {
  const api_error = error as ApiErrorShape | undefined;
  const first_field_error = api_error?.errors ? Object.values(api_error.errors)[0]?.[0] : undefined;
  return first_field_error || api_error?.message || fallback;
}

// ── API response wrappers ──────────────────────────────────────────────────────

interface SeoSubscriptionListApiResponse {
  data: AdminSeoSubscriptionListResponse;
}

interface SeoSubscriptionSingleApiResponse {
  data: AdminSeoSubscription;
}

interface SeoSubscriptionStatsApiResponse {
  data: SeoSubscriptionStats;
}

interface AdminUserSearchApiResponse {
  data: AdminUserSearchResult[];
}

interface PaymentProfilesApiResponse {
  data: AdminClientPaymentProfile[];
}

const BASE_URL = "/api/admin/seo-packages/subscriptions";

// ── Service ────────────────────────────────────────────────────────────────────

export const adminSeoSubscriptionService = {
  async fetchSubscriptions(
    filters: AdminSeoSubscriptionFilters = {}
  ): Promise<AdminSeoSubscriptionListResponse> {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", String(filters.page));
    if (filters.per_page) params.set("per_page", String(filters.per_page));
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.sort_field) params.set("sort_field", filters.sort_field);
    if (filters.sort_direction) params.set("sort_direction", filters.sort_direction);
    if (filters.package_id) params.set("package_id", filters.package_id);
    if (filters.payment_status) params.set("payment_status", filters.payment_status);

    const query = params.toString();
    const response = await apiClient.get<SeoSubscriptionListApiResponse>(
      `${BASE_URL}${query ? `?${query}` : ""}`
    );
    return response.data;
  },

  async fetchSubscriptionDetail(subscription_id: number): Promise<AdminSeoSubscriptionDetail> {
    return apiClient.get<AdminSeoSubscriptionDetail>(`${BASE_URL}/${subscription_id}`);
  },

  async fetchStats(): Promise<SeoSubscriptionStats> {
    const response = await apiClient.get<SeoSubscriptionStatsApiResponse>(`${BASE_URL}/stats`);
    return response.data;
  },

  async activateSubscription(
    payload: ActivateSeoSubscriptionPayload
  ): Promise<ActivateSeoSubscriptionResult> {
    return apiClient.post<ActivateSeoSubscriptionResult>(BASE_URL, payload);
  },

  async updateSubscription(
    subscription_id: number,
    payload: UpdateSeoSubscriptionPayload
  ): Promise<AdminSeoSubscriptionDetail> {
    return apiClient.patch<AdminSeoSubscriptionDetail>(`${BASE_URL}/${subscription_id}`, payload);
  },

  async chargeNow(
    subscription_id: number,
    payment_profile_id?: string | null
  ): Promise<AdminSeoSubscriptionDetail> {
    return apiClient.post<AdminSeoSubscriptionDetail>(`${BASE_URL}/${subscription_id}/charge`, {
      payment_profile_id: payment_profile_id ?? null,
    });
  },

  async cancelSubscription(
    subscription_id: number,
    payload: CancelSeoSubscriptionPayload = {}
  ): Promise<AdminSeoSubscription> {
    const response = await apiClient.patch<SeoSubscriptionSingleApiResponse>(
      `${BASE_URL}/${subscription_id}/cancel`,
      payload
    );
    return response.data;
  },

  async listClientPaymentProfiles(user_id: number): Promise<AdminClientPaymentProfile[]> {
    const response = await apiClient.get<PaymentProfilesApiResponse>(
      `${BASE_URL}/payment-profiles?user_id=${user_id}`
    );
    return response.data;
  },

  async searchUsers(query: string): Promise<AdminUserSearchResult[]> {
    const params = new URLSearchParams({ search: query, per_page: "20" });
    const response = await apiClient.get<AdminUserSearchApiResponse>(
      `/api/admin/users?${params.toString()}`
    );
    return response.data;
  },

  async listAllClients(): Promise<AdminUserSearchResult[]> {
    const params = new URLSearchParams({ type: "client", per_page: "500" });
    const response = await apiClient.get<AdminUserSearchApiResponse>(
      `/api/admin/users?${params.toString()}`
    );
    return response.data;
  },
};
