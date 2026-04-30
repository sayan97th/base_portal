import { apiClient } from "@/lib/api-client";
import type {
  AdminPremiumMentionsPlan,
  CreatePremiumMentionsPlanPayload,
  UpdatePremiumMentionsPlanPayload,
  AdminPremiumMentionsAppointment,
  AdminPremiumMentionsAppointmentFilters,
  AdminPremiumMentionsAppointmentListResponse,
  AdminPremiumMentionsAppointmentStats,
  UpdatePremiumMentionsAppointmentPayload,
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

// ── Appointments ───────────────────────────────────────────────────────────────

interface AppointmentListApiResponse {
  data: AdminPremiumMentionsAppointmentListResponse;
}

interface AppointmentSingleApiResponse {
  data: AdminPremiumMentionsAppointment;
}

interface AppointmentStatsApiResponse {
  data: AdminPremiumMentionsAppointmentStats;
}

export const adminPremiumMentionsAppointmentService = {
  async fetchAppointments(
    filters: AdminPremiumMentionsAppointmentFilters = {}
  ): Promise<AdminPremiumMentionsAppointmentListResponse> {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", String(filters.page));
    if (filters.per_page) params.set("per_page", String(filters.per_page));
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.plan_id) params.set("plan_id", filters.plan_id);
    if (filters.sort_field) params.set("sort_field", filters.sort_field);
    if (filters.sort_direction) params.set("sort_direction", filters.sort_direction);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);

    const query = params.toString();
    const response = await apiClient.get<AppointmentListApiResponse>(
      `/api/admin/premium-mentions/appointments${query ? `?${query}` : ""}`
    );
    return response.data;
  },

  async fetchAppointmentById(appointment_id: number): Promise<AdminPremiumMentionsAppointment> {
    const response = await apiClient.get<AppointmentSingleApiResponse>(
      `/api/admin/premium-mentions/appointments/${appointment_id}`
    );
    return response.data;
  },

  async fetchStats(): Promise<AdminPremiumMentionsAppointmentStats> {
    const response = await apiClient.get<AppointmentStatsApiResponse>(
      "/api/admin/premium-mentions/appointments/stats"
    );
    return response.data;
  },

  async updateAppointment(
    appointment_id: number,
    payload: UpdatePremiumMentionsAppointmentPayload
  ): Promise<AdminPremiumMentionsAppointment> {
    const response = await apiClient.put<AppointmentSingleApiResponse>(
      `/api/admin/premium-mentions/appointments/${appointment_id}`,
      payload
    );
    return response.data;
  },

  async deleteAppointment(appointment_id: number): Promise<void> {
    await apiClient.delete(
      `/api/admin/premium-mentions/appointments/${appointment_id}`
    );
  },
};
