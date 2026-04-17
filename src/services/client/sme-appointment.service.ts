import { apiClient } from "@/lib/api-client";

export interface SmeAppointmentPayload {
  event_uri: string;
  invitee_uri: string;
  selected_tiers: Record<string, number>;
  service_type: "authored" | "collaboration" | "enhanced";
}

export interface SmeAppointmentResponse {
  id: number;
  event_uri: string;
  invitee_uri: string;
  selected_tiers: Record<string, number>;
  scheduled_at: string;
  created_at: string;
}

interface SmeAppointmentApiResponse {
  data: SmeAppointmentResponse;
}

export const smeAppointmentService = {
  async saveAppointment(
    payload: SmeAppointmentPayload
  ): Promise<SmeAppointmentResponse> {
    const response = await apiClient.post<SmeAppointmentApiResponse>(
      "/api/sme-content/appointments",
      payload
    );
    return response.data;
  },

  async fetchAppointment(appointment_id: number): Promise<SmeAppointmentResponse> {
    const response = await apiClient.get<SmeAppointmentApiResponse>(
      `/api/sme-content/appointments/${appointment_id}`
    );
    return response.data;
  },
};
