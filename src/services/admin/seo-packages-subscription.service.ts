import { apiClient } from "@/lib/api-client";

// ── Types ──────────────────────────────────────────────────────────────────────

export type SeoSubscriptionStatus = "active" | "cancelled" | "expired";
export type SeoSubscriptionSortField = "starts_at" | "ends_at" | "created_at" | "status";
export type SortDirection = "asc" | "desc";

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

export interface AdminSeoSubscription {
  id: number;
  user: AdminSeoSubscriptionUser;
  package: AdminSeoSubscriptionPackage;
  status: SeoSubscriptionStatus;
  starts_at: string;
  ends_at: string | null;
  cancelled_at: string | null;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface AdminSeoSubscriptionFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: SeoSubscriptionStatus;
  sort_field?: SeoSubscriptionSortField;
  sort_direction?: SortDirection;
  package_id?: string;
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
}

export interface ActivateSeoSubscriptionPayload {
  user_id: number;
  package_id: string;
  starts_at: string;
  ends_at?: string | null;
  notes?: string;
}

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

    const query = params.toString();
    const response = await apiClient.get<SeoSubscriptionListApiResponse>(
      `/api/admin/seo-packages/subscriptions${query ? `?${query}` : ""}`
    );
    return response.data;
  },

  async fetchSubscriptionById(subscription_id: number): Promise<AdminSeoSubscription> {
    const response = await apiClient.get<SeoSubscriptionSingleApiResponse>(
      `/api/admin/seo-packages/subscriptions/${subscription_id}`
    );
    return response.data;
  },

  async fetchStats(): Promise<SeoSubscriptionStats> {
    const response = await apiClient.get<SeoSubscriptionStatsApiResponse>(
      "/api/admin/seo-packages/subscriptions/stats"
    );
    return response.data;
  },

  async activateSubscription(
    payload: ActivateSeoSubscriptionPayload
  ): Promise<AdminSeoSubscription> {
    const response = await apiClient.post<SeoSubscriptionSingleApiResponse>(
      "/api/admin/seo-packages/subscriptions",
      payload
    );
    return response.data;
  },

  async cancelSubscription(
    subscription_id: number,
    payload: CancelSeoSubscriptionPayload = {}
  ): Promise<AdminSeoSubscription> {
    const response = await apiClient.patch<SeoSubscriptionSingleApiResponse>(
      `/api/admin/seo-packages/subscriptions/${subscription_id}/cancel`,
      payload
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
};
