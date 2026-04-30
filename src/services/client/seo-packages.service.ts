import { apiClient } from "@/lib/api-client";
import type {
  SeoPackage,
  CreateSeoSubscriptionPayload,
  CreateSeoSubscriptionResponse,
  CreateSeoAppointmentPayload,
  SeoAppointmentResponse,
  ActiveSeoSubscription,
} from "@/types/client/seo-packages";

interface SeoPackagesResponse {
  data: SeoPackage[];
}

interface CreateSeoSubscriptionApiResponse {
  data: CreateSeoSubscriptionResponse;
}

interface SeoAppointmentApiResponse {
  data: SeoAppointmentResponse;
}

interface ActiveSeoSubscriptionApiResponse {
  data: ActiveSeoSubscription | null;
}

export const seoPackagesService = {
  async fetchSeoPackages(): Promise<SeoPackage[]> {
    const response = await apiClient.get<SeoPackagesResponse>("/api/seo-packages");
    return response.data;
  },

  async createSeoSubscription(
    payload: CreateSeoSubscriptionPayload
  ): Promise<CreateSeoSubscriptionResponse> {
    const response = await apiClient.post<CreateSeoSubscriptionApiResponse>(
      "/api/seo-packages/subscriptions",
      payload
    );
    return response.data;
  },

  async saveAppointment(
    payload: CreateSeoAppointmentPayload
  ): Promise<SeoAppointmentResponse> {
    const response = await apiClient.post<SeoAppointmentApiResponse>(
      "/api/seo-packages/appointments",
      payload
    );
    return response.data;
  },

  async fetchAppointment(appointment_id: number): Promise<SeoAppointmentResponse> {
    const response = await apiClient.get<SeoAppointmentApiResponse>(
      `/api/seo-packages/appointments/${appointment_id}`
    );
    return response.data;
  },

  async fetchActiveSubscription(): Promise<ActiveSeoSubscription | null> {
    try {
      const response = await apiClient.get<ActiveSeoSubscriptionApiResponse>(
        "/api/seo-packages/subscriptions/active"
      );
      return response.data;
    } catch {
      return null;
    }
  },
};
