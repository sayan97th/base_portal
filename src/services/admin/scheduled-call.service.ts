import { apiClient } from "@/lib/api-client";

// ── Types ──────────────────────────────────────────────────────────────────────

export type AdminScheduledCallStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export type AdminScheduledCallSortField = "scheduled_at" | "created_at" | "status";
export type SortDirection = "asc" | "desc";

export interface AdminScheduledCallUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  organization?: string;
}

export interface AdminScheduledCallAppointment {
  id: number;
  event_uri?: string;
  invitee_uri?: string;
  status: AdminScheduledCallStatus;
  scheduled_at: string;
  created_at: string;
  updated_at?: string;
  notes?: string;
  admin_notes?: string;
  cancellation_reason?: string;
  reschedule_reason?: string;
  user?: AdminScheduledCallUser;
}

export interface AdminScheduledCallFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: AdminScheduledCallStatus;
  sort_field?: AdminScheduledCallSortField;
  sort_direction?: SortDirection;
  date_from?: string;
  date_to?: string;
}

export interface AdminScheduledCallListResponse {
  data: AdminScheduledCallAppointment[];
  total: number;
  last_page: number;
  current_page: number;
  per_page: number;
}

export interface AdminScheduledCallStats {
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  no_show: number;
}

export interface UpdateAdminScheduledCallStatusPayload {
  status: AdminScheduledCallStatus;
  admin_notes?: string;
}

export interface UpdateAdminScheduledCallPayload {
  status?: AdminScheduledCallStatus;
  scheduled_at?: string;
  admin_notes?: string;
  notes?: string;
}

// ── API response wrappers ──────────────────────────────────────────────────────

interface AdminScheduledCallListApiResponse {
  data: AdminScheduledCallListResponse;
}

interface AdminScheduledCallSingleApiResponse {
  data: AdminScheduledCallAppointment;
}

interface AdminScheduledCallStatsApiResponse {
  data: AdminScheduledCallStats;
}

// ── Service ────────────────────────────────────────────────────────────────────

export const adminScheduledCallService = {
  async fetchAppointments(
    filters: AdminScheduledCallFilters = {}
  ): Promise<AdminScheduledCallListResponse> {
    const params = new URLSearchParams();
    if (filters.page) params.set("page", String(filters.page));
    if (filters.per_page) params.set("per_page", String(filters.per_page));
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.sort_field) params.set("sort_field", filters.sort_field);
    if (filters.sort_direction) params.set("sort_direction", filters.sort_direction);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);

    const query = params.toString();
    const response = await apiClient.get<AdminScheduledCallListApiResponse>(
      `/api/admin/scheduled-calls/appointments${query ? `?${query}` : ""}`
    );
    return response.data;
  },

  async fetchAppointmentById(
    appointment_id: number
  ): Promise<AdminScheduledCallAppointment> {
    const response = await apiClient.get<AdminScheduledCallSingleApiResponse>(
      `/api/admin/scheduled-calls/appointments/${appointment_id}`
    );
    return response.data;
  },

  async fetchStats(): Promise<AdminScheduledCallStats> {
    const response = await apiClient.get<AdminScheduledCallStatsApiResponse>(
      "/api/admin/scheduled-calls/appointments/stats"
    );
    return response.data;
  },

  async updateAppointmentStatus(
    appointment_id: number,
    payload: UpdateAdminScheduledCallStatusPayload
  ): Promise<AdminScheduledCallAppointment> {
    const response = await apiClient.patch<AdminScheduledCallSingleApiResponse>(
      `/api/admin/scheduled-calls/appointments/${appointment_id}/status`,
      payload
    );
    return response.data;
  },

  async updateAppointment(
    appointment_id: number,
    payload: UpdateAdminScheduledCallPayload
  ): Promise<AdminScheduledCallAppointment> {
    const response = await apiClient.put<AdminScheduledCallSingleApiResponse>(
      `/api/admin/scheduled-calls/appointments/${appointment_id}`,
      payload
    );
    return response.data;
  },

  async deleteAppointment(appointment_id: number): Promise<void> {
    await apiClient.delete(
      `/api/admin/scheduled-calls/appointments/${appointment_id}`
    );
  },

  async exportAppointments(
    filters: AdminScheduledCallFilters = {}
  ): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    if (filters.search) params.set("search", filters.search);

    const query = params.toString();
    const response = await apiClient.get<Blob>(
      `/api/admin/scheduled-calls/appointments/export${query ? `?${query}` : ""}`,
      { responseType: "blob" }
    );
    return response as unknown as Blob;
  },
};
