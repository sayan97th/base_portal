import { apiClient } from "@/lib/api-client";

export type EmailTypeAudience = "admin" | "client" | "any";

export type EmailTypeCategoryKey =
  | "purchases"
  | "billing"
  | "orders"
  | "support"
  | "announcements"
  | "account";

export type EmailSuppressionReason =
  | "email_type_disabled"
  | "recipient_muted_all"
  | "recipient_opted_out";

export interface EmailTypeCategory {
  key: EmailTypeCategoryKey;
  label: string;
}

export interface EmailTypeDefinition {
  key: string;
  label: string;
  description: string;
  audience: EmailTypeAudience;
  category: EmailTypeCategoryKey;
  is_mandatory: boolean;
  is_enabled: boolean;
}

export interface EmailTypeSettingsResponse {
  categories: EmailTypeCategory[];
  email_types: EmailTypeDefinition[];
}

export interface UpdateEmailTypeSettingsPayload {
  email_types: { key: string; is_enabled: boolean }[];
}

export interface EmailSuppressionLogEntry {
  mailable_class: string;
  email_type: string | null;
  recipient_email: string;
  subject: string | null;
  reason: EmailSuppressionReason;
  suppressed_at: string;
}

export interface UserEmailPreference {
  mute_all_emails: boolean;
  disabled_email_types: string[];
}

export interface AdminUserEmailPreference extends UserEmailPreference {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role_display: string;
}

export interface UserEmailPreferencesResponse extends EmailTypeSettingsResponse {
  users: AdminUserEmailPreference[];
}

export const emailDeliverySettingsService = {
  async getEmailTypes(): Promise<EmailTypeSettingsResponse> {
    return apiClient.get<EmailTypeSettingsResponse>("/api/admin/email-type-settings");
  },

  async updateEmailTypes(
    payload: UpdateEmailTypeSettingsPayload
  ): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>("/api/admin/email-type-settings", payload);
  },

  async getSuppressionLogs(): Promise<EmailSuppressionLogEntry[]> {
    const response = await apiClient.get<{ logs: EmailSuppressionLogEntry[] }>(
      "/api/admin/email-type-settings/suppression-logs"
    );
    return response.logs;
  },

  async getUserPreferences(): Promise<UserEmailPreferencesResponse> {
    return apiClient.get<UserEmailPreferencesResponse>("/api/admin/user-email-preferences");
  },

  async updateUserPreference(
    user_id: number,
    payload: UserEmailPreference
  ): Promise<{ message: string; preference: UserEmailPreference }> {
    return apiClient.put<{ message: string; preference: UserEmailPreference }>(
      `/api/admin/user-email-preferences/${user_id}`,
      payload
    );
  },
};
