import { apiClient } from "@/lib/api-client";
import { SmeEnhancedTier } from "@/services/client/sme-enhanced.service";

export interface SmeEnhancedTierPayload {
  label: string;
  description: string;
  price: number;
}

interface SmeEnhancedListApiResponse {
  data: SmeEnhancedTier[];
}

interface SmeEnhancedSingleApiResponse {
  data: SmeEnhancedTier;
}

export const adminSmeEnhancedService = {
  async fetchServices(): Promise<SmeEnhancedTier[]> {
    const response = await apiClient.get<SmeEnhancedListApiResponse>(
      "/api/admin/sme-content/enhanced-services"
    );
    return response.data;
  },

  async createService(
    payload: SmeEnhancedTierPayload
  ): Promise<SmeEnhancedTier> {
    const response = await apiClient.post<SmeEnhancedSingleApiResponse>(
      "/api/admin/sme-content/enhanced-services",
      payload
    );
    return response.data;
  },

  async updateService(
    service_id: string,
    payload: SmeEnhancedTierPayload
  ): Promise<SmeEnhancedTier> {
    const response = await apiClient.put<SmeEnhancedSingleApiResponse>(
      `/api/admin/sme-content/enhanced-services/${service_id}`,
      payload
    );
    return response.data;
  },

  async deleteService(service_id: string): Promise<void> {
    await apiClient.delete(
      `/api/admin/sme-content/enhanced-services/${service_id}`
    );
  },
};
