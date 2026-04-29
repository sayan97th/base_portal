import { apiClient } from "@/lib/api-client";
import type {
  PremiumMentionsPlan,
  PremiumMentionsPlansResponse,
  CreatePremiumMentionsOrderPayload,
  CreatePremiumMentionsOrderResponse,
  CreatePremiumMentionsAppointmentPayload,
  PremiumMentionsAppointmentResponse,
} from "@/types/client/premium-mentions";

interface CreateOrderApiResponse {
  data: CreatePremiumMentionsOrderResponse;
}

interface AppointmentApiResponse {
  data: PremiumMentionsAppointmentResponse;
}

export const premiumMentionsService = {
  async fetchPlans(): Promise<PremiumMentionsPlan[]> {
    const response = await apiClient.get<PremiumMentionsPlansResponse>(
      "/api/premium-mentions/plans"
    );
    return response.data;
  },

  async createOrder(
    payload: CreatePremiumMentionsOrderPayload
  ): Promise<CreatePremiumMentionsOrderResponse> {
    const response = await apiClient.post<CreateOrderApiResponse>(
      "/api/premium-mentions/orders",
      payload
    );
    return response.data;
  },

  async saveAppointment(
    payload: CreatePremiumMentionsAppointmentPayload
  ): Promise<PremiumMentionsAppointmentResponse> {
    const response = await apiClient.post<AppointmentApiResponse>(
      "/api/premium-mentions/appointments",
      payload
    );
    return response.data;
  },

  async fetchAppointment(
    appointment_id: number
  ): Promise<PremiumMentionsAppointmentResponse> {
    const response = await apiClient.get<AppointmentApiResponse>(
      `/api/premium-mentions/appointments/${appointment_id}`
    );
    return response.data;
  },
};
