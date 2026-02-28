import { apiClient } from "@/lib/api-client";
import type { ProfileData, ProfileResponse, UpdateProfileResponse } from "@/types/auth";

export const profileService = {
  async fetchUserProfile(): Promise<ProfileResponse> {
    return apiClient.get<ProfileResponse>("/api/profile");
  },

  async updateUserProfile(data: ProfileData): Promise<UpdateProfileResponse> {
    return apiClient.put<UpdateProfileResponse>("/api/profile", data);
  },

  async uploadProfilePhoto(file: File): Promise<UpdateProfileResponse> {
    const form_data = new FormData();
    form_data.append("profile_photo", file);
    return apiClient.postFormData<UpdateProfileResponse>("/api/profile/photo", form_data);
  },

  async deleteProfilePhoto(): Promise<UpdateProfileResponse> {
    return apiClient.delete<UpdateProfileResponse>("/api/profile/photo");
  },
};
