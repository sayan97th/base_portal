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
};
