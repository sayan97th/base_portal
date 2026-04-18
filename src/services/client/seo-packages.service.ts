import { apiClient } from "@/lib/api-client";
import type {
  SeoPackage,
  CreateSeoSubscriptionPayload,
  CreateSeoSubscriptionResponse,
} from "@/types/client/seo-packages";

interface SeoPackagesResponse {
  data: SeoPackage[];
}

interface CreateSeoSubscriptionApiResponse {
  data: CreateSeoSubscriptionResponse;
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
};
