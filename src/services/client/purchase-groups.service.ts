import { apiClient } from "@/lib/api-client";
import type {
  PurchaseGroup,
  CreatePurchaseGroupPayload,
} from "@/types/client/purchase-groups";

interface PurchaseGroupApiResponse {
  data: PurchaseGroup;
}

interface PurchaseGroupListApiResponse {
  data: PurchaseGroup[];
}

export const purchaseGroupsService = {
  async createPurchaseGroup(
    payload: CreatePurchaseGroupPayload
  ): Promise<PurchaseGroup> {
    const response = await apiClient.post<PurchaseGroupApiResponse>(
      "/api/purchase-groups",
      payload
    );
    return response.data;
  },

  async fetchPurchaseGroups(): Promise<PurchaseGroup[]> {
    const response = await apiClient.get<PurchaseGroupListApiResponse>(
      "/api/purchase-groups"
    );
    return response.data;
  },

  async fetchPurchaseGroup(
    purchase_group_id: string
  ): Promise<PurchaseGroup | null> {
    try {
      const response = await apiClient.get<PurchaseGroupApiResponse>(
        `/api/purchase-groups/${purchase_group_id}`
      );
      return response.data;
    } catch {
      return null;
    }
  },
};
