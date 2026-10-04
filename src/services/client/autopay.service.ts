import { apiClient } from "@/lib/api-client";
import type {
  AutopaySettings,
  AutopaySettingsResponse,
  UpdateAutopayPayload,
} from "@/types/client/autopay";

export const autopayService = {
  async getAutopaySettings(): Promise<AutopaySettings> {
    const response = await apiClient.get<AutopaySettingsResponse>("/api/autopay");
    return response.data;
  },

  async updateAutopaySettings(payload: UpdateAutopayPayload): Promise<AutopaySettings> {
    const response = await apiClient.put<AutopaySettingsResponse>("/api/autopay", payload);
    return response.data;
  },

  async disableAutopay(): Promise<AutopaySettings> {
    const response = await apiClient.delete<AutopaySettingsResponse>("/api/autopay");
    return response.data;
  },
};
