/**
 * Credits Service (admin-side)
 *
 * Required Laravel API endpoints:
 *   GET  /api/admin/credits/stats                    → platform-wide credit statistics
 *   GET  /api/admin/credits/users?search=...         → search client accounts with their balance
 *   POST /api/admin/credits/assign                   → add or deduct credits for a user
 *   GET  /api/admin/credits/transactions             → paginated transaction history (all users)
 */

import { apiClient } from "@/lib/api-client";
import type {
  AdminCreditUser,
  AdminCreditTransaction,
  AssignCreditsPayload,
  AssignCreditsResponse,
  AdminCreditsStats,
  AdminCreditsTransactionFilters,
  AdminCreditsClientFilters,
  AdminCreditPurchase,
  AdminCreditPurchaseFilters,
} from "@/types/admin/credits";
import type { PaginatedResponse } from "@/types/admin";

export const adminCreditsService = {
  async fetchStats(): Promise<AdminCreditsStats> {
    return apiClient.get<AdminCreditsStats>("/api/admin/credits/stats");
  },

  async searchClients(search: string): Promise<AdminCreditUser[]> {
    const params = new URLSearchParams({ search, type: "client" });
    const response = await apiClient.get<{ data: AdminCreditUser[] }>(
      `/api/admin/credits/users?${params.toString()}`
    );
    return response.data;
  },

  async assignCredits(payload: AssignCreditsPayload): Promise<AssignCreditsResponse> {
    return apiClient.post<AssignCreditsResponse>("/api/admin/credits/assign", payload);
  },

  async fetchClientsList(
    filters: AdminCreditsClientFilters = {}
  ): Promise<PaginatedResponse<AdminCreditUser>> {
    const params = new URLSearchParams({ type: "client" });
    if (filters.page) params.set("page", String(filters.page));
    if (filters.search) params.set("search", filters.search);
    if (filters.sort_by) params.set("sort_by", filters.sort_by);
    if (filters.sort_dir) params.set("sort_dir", filters.sort_dir);
    return apiClient.get<PaginatedResponse<AdminCreditUser>>(
      `/api/admin/credits/users?${params.toString()}`
    );
  },

  async fetchTransactions(
    filters: AdminCreditsTransactionFilters = {}
  ): Promise<PaginatedResponse<AdminCreditTransaction>> {
    const params = new URLSearchParams({ page: String(filters.page ?? 1) });
    if (filters.user_id) params.set("user_id", String(filters.user_id));
    if (filters.type) params.set("type", filters.type);
    return apiClient.get<PaginatedResponse<AdminCreditTransaction>>(
      `/api/admin/credits/transactions?${params.toString()}`
    );
  },

  async fetchAllPurchases(
    filters: AdminCreditPurchaseFilters = {}
  ): Promise<PaginatedResponse<AdminCreditPurchase>> {
    const params = new URLSearchParams({ page: String(filters.page ?? 1) });
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    return apiClient.get<PaginatedResponse<AdminCreditPurchase>>(
      `/api/admin/credits/purchases?${params.toString()}`
    );
  },
};
