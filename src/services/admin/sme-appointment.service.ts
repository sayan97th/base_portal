import { apiClient } from "@/lib/api-client";
import { SmeAppointmentResponse } from "@/services/client/sme-appointment.service";

// ── Types ──────────────────────────────────────────────────────────────────────

export type AppointmentStatus = "pending" | "confirmed" | "cancelled" | "completed";
export type AppointmentServiceType = "authored" | "collaboration" | "enhanced";
export type AppointmentSortField = "scheduled_at" | "created_at" | "service_type" | "status";
export type SortDirection = "asc" | "desc";

export interface AdminAppointmentUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  organization?: string;
}

export interface SelectedTier {
  tier_key: string;
  label: string;
  price: number;
  quantity: number;
  description?: string;
}

export interface AdminAppointment {
  id: number;
  event_uri: string;
  invitee_uri: string;
  selected_tiers: Record<string, SelectedTier>;
  service_type: AppointmentServiceType;
  status: AppointmentStatus;
  scheduled_at: string;
  created_at: string;
  updated_at?: string;
  notes?: string;
  admin_notes?: string;
  user?: AdminAppointmentUser;
}

export interface AdminAppointmentFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: AppointmentStatus;
  service_type?: AppointmentServiceType;
  sort_field?: AppointmentSortField;
  sort_direction?: SortDirection;
  date_from?: string;
  date_to?: string;
}

export interface AdminAppointmentListResponse {
  data: AdminAppointment[];
  total: number;
  last_page: number;
  current_page: number;
  per_page: number;
}

export interface AppointmentStats {
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  authored: number;
  collaboration: number;
  enhanced: number;
}

export interface UpdateAppointmentStatusPayload {
  status: AppointmentStatus;
  admin_notes?: string;
}

export interface UpdateAppointmentPayload {
  status?: AppointmentStatus;
  admin_notes?: string;
  notes?: string;
}

// ── API response wrappers ──────────────────────────────────────────────────────

interface AppointmentListApiResponse {
  data: AdminAppointmentListResponse;
}

interface AppointmentSingleApiResponse {
  data: AdminAppointment;
}

interface AppointmentStatsApiResponse {
  data: AppointmentStats;
}

// ── Service ────────────────────────────────────────────────────────────────────

export const adminSmeAppointmentService = {
  async fetchAppointments(
    filters: AdminAppointmentFilters = {}
  ): Promise<AdminAppointmentListResponse> {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", String(filters.page));
    if (filters.per_page) params.set("per_page", String(filters.per_page));
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.service_type) params.set("service_type", filters.service_type);
    if (filters.sort_field) params.set("sort_field", filters.sort_field);
    if (filters.sort_direction) params.set("sort_direction", filters.sort_direction);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);

    const query = params.toString();
    const response = await apiClient.get<AppointmentListApiResponse>(
      `/api/admin/sme-content/appointments${query ? `?${query}` : ""}`
    );
    return response.data;
  },

  async fetchAppointmentById(appointment_id: number): Promise<AdminAppointment> {
    const response = await apiClient.get<AppointmentSingleApiResponse>(
      `/api/admin/sme-content/appointments/${appointment_id}`
    );
    return response.data;
  },

  async fetchStats(): Promise<AppointmentStats> {
    const response = await apiClient.get<AppointmentStatsApiResponse>(
      "/api/admin/sme-content/appointments/stats"
    );
    return response.data;
  },

  async updateAppointmentStatus(
    appointment_id: number,
    payload: UpdateAppointmentStatusPayload
  ): Promise<AdminAppointment> {
    const response = await apiClient.patch<AppointmentSingleApiResponse>(
      `/api/admin/sme-content/appointments/${appointment_id}/status`,
      payload
    );
    return response.data;
  },

  async updateAppointment(
    appointment_id: number,
    payload: UpdateAppointmentPayload
  ): Promise<AdminAppointment> {
    const response = await apiClient.put<AppointmentSingleApiResponse>(
      `/api/admin/sme-content/appointments/${appointment_id}`,
      payload
    );
    return response.data;
  },

  async deleteAppointment(appointment_id: number): Promise<void> {
    await apiClient.delete(
      `/api/admin/sme-content/appointments/${appointment_id}`
    );
  },

  async exportAppointments(filters: AdminAppointmentFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.service_type) params.set("service_type", filters.service_type);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    if (filters.search) params.set("search", filters.search);

    const query = params.toString();
    const response = await apiClient.get<Blob>(
      `/api/admin/sme-content/appointments/export${query ? `?${query}` : ""}`,
      { responseType: "blob" }
    );
    return response as unknown as Blob;
  },
};
