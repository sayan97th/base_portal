import { apiClient } from "@/lib/api-client";

export interface EmailNotificationSettings {
  notify_all_admins: boolean;
  enabled_user_ids: number[];
  custom_emails: string[];
}

export interface UpdateEmailNotificationSettingsPayload {
  notify_all_admins: boolean;
  enabled_user_ids: number[];
  custom_emails: string[];
}

export const emailNotificationSettingsService = {
  async getSettings(): Promise<EmailNotificationSettings> {
    return apiClient.get<EmailNotificationSettings>(
      "/api/admin/email-notification-settings"
    );
  },

  async updateSettings(
    payload: UpdateEmailNotificationSettingsPayload
  ): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>(
      "/api/admin/email-notification-settings",
      payload
    );
  },
};
