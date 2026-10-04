import { apiClient } from "@/lib/api-client";
import type {
  AutopayEnrollment,
  AutopayHealth,
  ChargeAttemptFilters,
  PaginatedChargeAttempts,
} from "@/types/admin/autopay";

export async function listChargeAttempts(filters: ChargeAttemptFilters = {}): Promise<PaginatedChargeAttempts> {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", String(filters.page));
  if (filters.per_page) params.set("per_page", String(filters.per_page));
  if (filters.status) params.set("status", filters.status);
  if (filters.source) params.set("source", filters.source);
  if (filters.search?.trim()) params.set("search", filters.search.trim());

  const query = params.toString();
  return apiClient.get<PaginatedChargeAttempts>(`/api/admin/autopay/attempts${query ? `?${query}` : ""}`);
}

export async function listAutopayEnrollments(): Promise<AutopayEnrollment[]> {
  const response = await apiClient.get<{ data: AutopayEnrollment[] }>("/api/admin/autopay/enrollments");
  return response.data;
}

export async function getAutopayHealth(): Promise<AutopayHealth> {
  return apiClient.get<AutopayHealth>("/api/admin/autopay/health");
}

export async function disableClientAutopay(user_id: number): Promise<void> {
  await apiClient.delete<void>(`/api/admin/autopay/enrollments/${user_id}`);
}
