import { apiClient } from "@/lib/api-client";

export interface SmeAuthoredTier {
  id: string;
  label: string;
  description: string;
  price: number;
}

interface SmeAuthoredListApiResponse {
  data: SmeAuthoredTier[];
}

export const smeAuthoredService = {
  async fetchServices(): Promise<SmeAuthoredTier[]> {
    const response = await apiClient.get<SmeAuthoredListApiResponse>(
      "/api/sme-content/authored-services"
    );
    return response.data;
  },
};
