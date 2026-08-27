import { apiClient } from "@/lib/api-client";
import type { NotificationRedirectContextResponse } from "@/types/admin";
import type { ImpersonationResponse } from "@/types/auth";

export const notificationRedirectService = {
  /**
   * Read-only. Resolves whether a notification belongs to a client account and
   * whether the current admin/staff caller may impersonate that client.
   */
  async getContext(notification_id: string | number) {
    const response = await apiClient.get<NotificationRedirectContextResponse>(
      `/api/admin/notifications/${notification_id}/redirect-context`
    );
    return response.data;
  },

  /**
   * Starts an impersonation session scoped to the client who owns this
   * notification. Backed by a dedicated, tightly restricted endpoint, see
   * NotificationRedirectController on the API side.
   */
  async impersonate(notification_id: string | number): Promise<ImpersonationResponse> {
    return apiClient.post<ImpersonationResponse>(
      `/api/admin/notifications/${notification_id}/impersonate`
    );
  },
};
