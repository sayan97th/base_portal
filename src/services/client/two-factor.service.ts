import { apiClient } from "@/lib/api-client";
import type {
  TwoFactorStatusResponse,
  TwoFactorSetupResponse,
  TwoFactorVerifyData,
  TwoFactorVerifyResponse,
  TwoFactorDisableData,
  TwoFactorDisableResponse,
} from "@/types/auth";

export const twoFactorService = {
  /** GET /api/2fa/status — check if 2FA is currently enabled for the user. */
  async getStatus(): Promise<TwoFactorStatusResponse> {
    return apiClient.get<TwoFactorStatusResponse>("/api/2fa/status");
  },

  /** POST /api/2fa/setup — initiate 2FA setup, returns QR code URL and secret. */
  async initSetup(): Promise<TwoFactorSetupResponse> {
    return apiClient.post<TwoFactorSetupResponse>("/api/2fa/setup", {});
  },

  /** POST /api/2fa/verify — confirm the OTP code and activate 2FA, returns recovery codes. */
  async verify(data: TwoFactorVerifyData): Promise<TwoFactorVerifyResponse> {
    return apiClient.post<TwoFactorVerifyResponse>("/api/2fa/verify", data);
  },

  /** POST /api/2fa/disable — disable 2FA (requires current OTP confirmation). */
  async disable(data: TwoFactorDisableData): Promise<TwoFactorDisableResponse> {
    return apiClient.post<TwoFactorDisableResponse>("/api/2fa/disable", data);
  },
};
