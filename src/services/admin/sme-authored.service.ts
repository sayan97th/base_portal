import { apiClient } from "@/lib/api-client";
import { SmeAuthoredTier } from "@/services/client/sme-authored.service";

export interface SmeAuthoredTierPayload {
  label: string;
  description: string;
  price: number;
}

interface SmeAuthoredListApiResponse {
  data: SmeAuthoredTier[];
}

interface SmeAuthoredSingleApiResponse {
  data: SmeAuthoredTier;
}

export const adminSmeAuthoredService = {
  async fetchServices(): Promise<SmeAuthoredTier[]> {
    const response = await apiClient.get<SmeAuthoredListApiResponse>(
      "/api/admin/sme-content/authored-services"
    );
    return response.data;
  },

  async createService(
    payload: SmeAuthoredTierPayload
  ): Promise<SmeAuthoredTier> {
    const response = await apiClient.post<SmeAuthoredSingleApiResponse>(
      "/api/admin/sme-content/authored-services",
      payload
    );
    return response.data;
  },

  async updateService(
    service_id: string,
    payload: SmeAuthoredTierPayload
  ): Promise<SmeAuthoredTier> {
    const response = await apiClient.put<SmeAuthoredSingleApiResponse>(
      `/api/admin/sme-content/authored-services/${service_id}`,
      payload
    );
    return response.data;
  },

  async deleteService(service_id: string): Promise<void> {
    await apiClient.delete(
      `/api/admin/sme-content/authored-services/${service_id}`
    );
  },
};
