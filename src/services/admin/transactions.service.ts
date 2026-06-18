import { apiClient } from "@/lib/api-client";
import type {
  AdminTransaction,
  AdminTransactionFilters,
  PaginatedResponse,
} from "@/types/admin";

export async function listAdminTransactions(
  filters: AdminTransactionFilters = {}
): Promise<PaginatedResponse<AdminTransaction>> {
  const params = new URLSearchParams();

  if (filters.page) params.set("page", String(filters.page));
  if (filters.per_page) params.set("per_page", String(filters.per_page));
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.status) params.set("status", filters.status);
  if (filters.type) params.set("type", filters.type);
  if (filters.payment_method) params.set("payment_method", filters.payment_method);
  if (filters.sort_field) params.set("sort_field", filters.sort_field);
  if (filters.sort_direction) params.set("sort_direction", filters.sort_direction);
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);

  const query = params.toString();
  return apiClient.get<PaginatedResponse<AdminTransaction>>(
    `/api/admin/transactions${query ? `?${query}` : ""}`
  );
}

export async function getAdminTransaction(id: number): Promise<AdminTransaction> {
  return apiClient.get<AdminTransaction>(`/api/admin/transactions/${id}`);
}
