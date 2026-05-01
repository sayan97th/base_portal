import { apiClient } from "@/lib/api-client";

// ── Types ──────────────────────────────────────────────────────────────────────

export type ScheduledCallStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export type ScheduledCallSortField = "scheduled_at" | "created_at" | "status";
export type SortDirection = "asc" | "desc";

export interface ScheduledCallAppointment {
  id: number;
  event_uri?: string;
  invitee_uri?: string;
  status: ScheduledCallStatus;
  scheduled_at: string;
  created_at: string;
  updated_at?: string;
  notes?: string;
  cancellation_reason?: string;
  reschedule_reason?: string;
}

export interface ScheduledCallStats {
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  completed: number;
}

export interface ScheduledCallFilters {
  page?: number;
  per_page?: number;
  search?: string;
  status?: ScheduledCallStatus;
  sort_field?: ScheduledCallSortField;
  sort_direction?: SortDirection;
  date_from?: string;
  date_to?: string;
}

export interface ScheduledCallListResponse {
  data: ScheduledCallAppointment[];
  total: number;
  last_page: number;
  current_page: number;
  per_page: number;
}

export interface SaveScheduledCallPayload {
  event_uri: string;
  invitee_uri: string;
  notes?: string;
}

export interface RescheduleRequestPayload {
  reason: string;
  preferred_dates?: string;
}

export interface CancelAppointmentPayload {
  reason?: string;
}

// ── API response wrappers ──────────────────────────────────────────────────────

interface ScheduledCallListApiResponse {
  data: ScheduledCallListResponse;
}

interface ScheduledCallSingleApiResponse {
  data: ScheduledCallAppointment;
}

interface ScheduledCallStatsApiResponse {
  data: ScheduledCallStats;
}

// ── Service ────────────────────────────────────────────────────────────────────

export const scheduledCallService = {
  async saveAppointment(
    payload: SaveScheduledCallPayload
  ): Promise<ScheduledCallAppointment> {
    const response = await apiClient.post<ScheduledCallSingleApiResponse>(
      "/api/scheduled-calls/appointments",
      payload
    );
    return response.data;
  },

  async fetchAppointments(
    filters: ScheduledCallFilters = {}
  ): Promise<ScheduledCallListResponse> {
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
    const response = await apiClient.get<ScheduledCallListApiResponse>(
      `/api/scheduled-calls/appointments${query ? `?${query}` : ""}`
    );
    return response.data;
  },

  async fetchAppointmentById(
    appointment_id: number
  ): Promise<ScheduledCallAppointment> {
    const response = await apiClient.get<ScheduledCallSingleApiResponse>(
      `/api/scheduled-calls/appointments/${appointment_id}`
    );
    return response.data;
  },

  async fetchStats(): Promise<ScheduledCallStats> {
    const response = await apiClient.get<ScheduledCallStatsApiResponse>(
      "/api/scheduled-calls/appointments/stats"
    );
    return response.data;
  },

  async cancelAppointment(
    appointment_id: number,
    payload: CancelAppointmentPayload = {}
  ): Promise<ScheduledCallAppointment> {
    const response = await apiClient.patch<ScheduledCallSingleApiResponse>(
      `/api/scheduled-calls/appointments/${appointment_id}/cancel`,
      payload
    );
    return response.data;
  },

  async requestReschedule(
    appointment_id: number,
    payload: RescheduleRequestPayload
  ): Promise<ScheduledCallAppointment> {
    const response = await apiClient.post<ScheduledCallSingleApiResponse>(
      `/api/scheduled-calls/appointments/${appointment_id}/reschedule-request`,
      payload
    );
    return response.data;
  },
};
