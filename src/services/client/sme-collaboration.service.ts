import { apiClient } from "@/lib/api-client";

export interface SmeCollaborationTier {
  id: string;
  label: string;
  description: string;
  price: number;
}

interface SmeCollaborationListApiResponse {
  data: SmeCollaborationTier[];
}

export const smeCollaborationService = {
  async fetchServices(): Promise<SmeCollaborationTier[]> {
    const response = await apiClient.get<SmeCollaborationListApiResponse>(
      "/api/sme-content/collaboration-services"
    );
    return response.data;
  },
};
