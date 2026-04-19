import { apiClient } from "@/lib/api-client";
import type {
  AdminPremiumMentionsPlan,
  CreatePremiumMentionsPlanPayload,
  UpdatePremiumMentionsPlanPayload,
} from "@/types/admin/premium-mentions";

export async function listAdminPremiumMentionsPlans(): Promise<AdminPremiumMentionsPlan[]> {
  return apiClient.get<AdminPremiumMentionsPlan[]>("/api/admin/premium-mentions/plans");
}

export async function getAdminPremiumMentionsPlan(id: string): Promise<AdminPremiumMentionsPlan> {
  return apiClient.get<AdminPremiumMentionsPlan>(`/api/admin/premium-mentions/plans/${id}`);
}

export async function createAdminPremiumMentionsPlan(
  payload: CreatePremiumMentionsPlanPayload
): Promise<AdminPremiumMentionsPlan> {
  return apiClient.post<AdminPremiumMentionsPlan>("/api/admin/premium-mentions/plans", payload);
}

export async function updateAdminPremiumMentionsPlan(
  id: string,
  payload: UpdatePremiumMentionsPlanPayload
): Promise<AdminPremiumMentionsPlan> {
  return apiClient.patch<AdminPremiumMentionsPlan>(`/api/admin/premium-mentions/plans/${id}`, payload);
}

export async function toggleAdminPremiumMentionsPlanStatus(
  id: string,
  is_active: boolean
): Promise<AdminPremiumMentionsPlan> {
  return apiClient.patch<AdminPremiumMentionsPlan>(`/api/admin/premium-mentions/plans/${id}`, {
    is_active,
  });
}

export async function deleteAdminPremiumMentionsPlan(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/admin/premium-mentions/plans/${id}`);
}
