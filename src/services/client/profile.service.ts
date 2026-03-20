import { apiClient } from "@/lib/api-client";
import type {
  ProfileData,
  PartialProfileData,
  ProfileResponse,
  UpdateProfileResponse,
  ChangePasswordData,
  ChangePasswordResponse,
} from "@/types/auth";

export const profileService = {
  /** GET /api/profile — fetch the full profile on page load. */
  async fetchUserProfile(): Promise<ProfileResponse> {
    return apiClient.get<ProfileResponse>("/api/profile");
  },

  /** PUT /api/profile — full profile update (all fields sent). */
  async updateUserProfile(data: ProfileData): Promise<UpdateProfileResponse> {
    return apiClient.put<UpdateProfileResponse>("/api/profile", data);
  },

  /** PATCH /api/profile — partial update, only send the fields that changed. */
  async patchUserProfile(data: PartialProfileData): Promise<UpdateProfileResponse> {
    return apiClient.patch<UpdateProfileResponse>("/api/profile", data);
  },

  async uploadProfilePhoto(file: File): Promise<UpdateProfileResponse> {
    const form_data = new FormData();
    form_data.append("profile_photo", file);
    return apiClient.postFormData<UpdateProfileResponse>("/api/profile/photo", form_data);
  },

  async deleteProfilePhoto(): Promise<UpdateProfileResponse> {
    return apiClient.delete<UpdateProfileResponse>("/api/profile/photo");
  },

  async changePassword(data: ChangePasswordData): Promise<ChangePasswordResponse> {
    return apiClient.put<ChangePasswordResponse>("/api/profile/password", data);
  },
};
