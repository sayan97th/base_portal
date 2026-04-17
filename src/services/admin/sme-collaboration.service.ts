import { apiClient } from "@/lib/api-client";
import { SmeCollaborationTier } from "@/services/client/sme-collaboration.service";

export interface SmeCollaborationTierPayload {
  label: string;
  description: string;
  price: number;
}

interface SmeCollaborationListApiResponse {
  data: SmeCollaborationTier[];
}

interface SmeCollaborationSingleApiResponse {
  data: SmeCollaborationTier;
}

export const adminSmeCollaborationService = {
  async fetchServices(): Promise<SmeCollaborationTier[]> {
    const response = await apiClient.get<SmeCollaborationListApiResponse>(
      "/api/admin/sme-content/collaboration-services"
    );
    return response.data;
  },

  async createService(
    payload: SmeCollaborationTierPayload
  ): Promise<SmeCollaborationTier> {
    const response = await apiClient.post<SmeCollaborationSingleApiResponse>(
      "/api/admin/sme-content/collaboration-services",
      payload
    );
    return response.data;
  },

  async updateService(
    service_id: string,
    payload: SmeCollaborationTierPayload
  ): Promise<SmeCollaborationTier> {
    const response = await apiClient.put<SmeCollaborationSingleApiResponse>(
      `/api/admin/sme-content/collaboration-services/${service_id}`,
      payload
    );
    return response.data;
  },

  async deleteService(service_id: string): Promise<void> {
    await apiClient.delete(
      `/api/admin/sme-content/collaboration-services/${service_id}`
    );
  },
};
