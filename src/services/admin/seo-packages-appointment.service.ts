import { apiClient } from "@/lib/api-client";

// ── Types ──────────────────────────────────────────────────────────────────────

export type SeoAppointmentStatus = "pending" | "confirmed" | "cancelled" | "completed";
export type SeoAppointmentSortField = "scheduled_at" | "created_at" | "package_name" | "status";
export type SortDirection = "asc" | "desc";

export interface AdminSeoAppointmentUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  organization?: string;
}

export interface AdminSeoAppointmentPackage {
  id: string;
  name: string;
  slug: string;
  price_per_month: number;
}

export interface AdminSeoAppointment {
  id: number;
  event_uri?: string;
  invitee_uri?: string;
  package: AdminSeoAppointmentPackage;
  status: SeoAppointmentStatus;
  scheduled_at: string;
  created_at: string;
  updated_at?: string;
  notes?: string;
  admin_notes?: string;
  user?: AdminSeoAppointmentUser;
}

export interface AdminSeoAppointmentFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: SeoAppointmentStatus;
  sort_field?: SeoAppointmentSortField;
  sort_direction?: SortDirection;
  date_from?: string;
  date_to?: string;
}

export interface AdminSeoAppointmentListResponse {
  data: AdminSeoAppointment[];
  total: number;
  last_page: number;
  current_page: number;
  per_page: number;
}

export interface SeoAppointmentStats {
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  completed: number;
}

export interface UpdateSeoAppointmentStatusPayload {
  status: SeoAppointmentStatus;
  admin_notes?: string;
}

export interface UpdateSeoAppointmentPayload {
  status?: SeoAppointmentStatus;
  scheduled_at?: string;
  admin_notes?: string;
  notes?: string;
}

// ── API response wrappers ──────────────────────────────────────────────────────

interface SeoAppointmentListApiResponse {
  data: AdminSeoAppointmentListResponse;
}

interface SeoAppointmentSingleApiResponse {
  data: AdminSeoAppointment;
}

interface SeoAppointmentStatsApiResponse {
  data: SeoAppointmentStats;
}

// ── Service ────────────────────────────────────────────────────────────────────

export const adminSeoPackagesAppointmentService = {
  async fetchAppointments(
    filters: AdminSeoAppointmentFilters = {}
  ): Promise<AdminSeoAppointmentListResponse> {
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
    const response = await apiClient.get<SeoAppointmentListApiResponse>(
      `/api/admin/seo-packages/appointments${query ? `?${query}` : ""}`
    );
    return response.data;
  },

  async fetchAppointmentById(appointment_id: number): Promise<AdminSeoAppointment> {
    const response = await apiClient.get<SeoAppointmentSingleApiResponse>(
      `/api/admin/seo-packages/appointments/${appointment_id}`
    );
    return response.data;
  },

  async fetchStats(): Promise<SeoAppointmentStats> {
    const response = await apiClient.get<SeoAppointmentStatsApiResponse>(
      "/api/admin/seo-packages/appointments/stats"
    );
    return response.data;
  },

  async updateAppointmentStatus(
    appointment_id: number,
    payload: UpdateSeoAppointmentStatusPayload
  ): Promise<AdminSeoAppointment> {
    const response = await apiClient.patch<SeoAppointmentSingleApiResponse>(
      `/api/admin/seo-packages/appointments/${appointment_id}/status`,
      payload
    );
    return response.data;
  },

  async updateAppointment(
    appointment_id: number,
    payload: UpdateSeoAppointmentPayload
  ): Promise<AdminSeoAppointment> {
    const response = await apiClient.put<SeoAppointmentSingleApiResponse>(
      `/api/admin/seo-packages/appointments/${appointment_id}`,
      payload
    );
    return response.data;
  },

  async deleteAppointment(appointment_id: number): Promise<void> {
    await apiClient.delete(
      `/api/admin/seo-packages/appointments/${appointment_id}`
    );
  },

  async exportAppointments(filters: AdminSeoAppointmentFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.date_from) params.set("date_from", filters.date_from);
    if (filters.date_to) params.set("date_to", filters.date_to);
    if (filters.search) params.set("search", filters.search);

    const query = params.toString();
    const response = await apiClient.get<Blob>(
      `/api/admin/seo-packages/appointments/export${query ? `?${query}` : ""}`,
      { responseType: "blob" }
    );
    return response as unknown as Blob;
  },
};
