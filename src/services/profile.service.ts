import { apiClient } from "@/lib/api-client";
import type { ProfileData, UpdateProfileResponse } from "@/types/auth";

export const profileService = {
  async fetchUserProfile(): Promise<ProfileData> {
    return apiClient.get<ProfileData>("/api/profile");
  },

  async updateUserProfile(data: ProfileData): Promise<UpdateProfileResponse> {
    return apiClient.put<UpdateProfileResponse>("/api/profile", data);
  },
};
