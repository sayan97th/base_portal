import { apiClient } from "@/lib/api-client";

export interface SmeEnhancedTier {
  id: string;
  label: string;
  description: string;
  price: number;
}

interface SmeEnhancedListApiResponse {
  data: SmeEnhancedTier[];
}

export const smeEnhancedService = {
  async fetchServices(): Promise<SmeEnhancedTier[]> {
    const response = await apiClient.get<SmeEnhancedListApiResponse>(
      "/api/sme-content/enhanced-services"
    );
    return response.data;
  },
};
