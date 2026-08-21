import { apiClient } from "@/lib/api-client";

export interface EmailInterceptSettings {
  intercept_admin_emails: boolean;
  intercept_client_emails: boolean;
  recipient_emails: string[];
}

export interface UpdateEmailInterceptSettingsPayload {
  intercept_admin_emails: boolean;
  intercept_client_emails: boolean;
  recipient_emails: string[];
}

export interface EmailInterceptLogEntry {
  mailable_class: string;
  audience: "admin" | "client";
  original_recipient_email: string;
  subject: string | null;
  copied_to_emails: string[];
  intercepted_at: string;
}

export const emailInterceptSettingsService = {
  async getSettings(): Promise<EmailInterceptSettings> {
    return apiClient.get<EmailInterceptSettings>(
      "/api/admin/email-intercept-settings"
    );
  },

  async updateSettings(
    payload: UpdateEmailInterceptSettingsPayload
  ): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>(
      "/api/admin/email-intercept-settings",
      payload
    );
  },

  async getRecentLogs(): Promise<EmailInterceptLogEntry[]> {
    const response = await apiClient.get<{ logs: EmailInterceptLogEntry[] }>(
      "/api/admin/email-intercept-settings/logs"
    );
    return response.logs;
  },
};
