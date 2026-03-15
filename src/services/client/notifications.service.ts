import { apiClient } from "@/lib/api-client";

export type NotificationType = "payment" | "post" | "system" | "order";

export interface Notification {
  id: number;
  user_id: number;
  type: NotificationType;
  message: string;
  preview_text: string | null;
  link: string | null;
  is_read: boolean;
  is_archived: boolean;
  is_snoozed: boolean;
  snoozed_until: string | null;
  date: string;
  relative_time: string;
  created_at: string;
  updated_at: string;
}

export interface NotificationFilters {
  type?: NotificationType;
  is_read?: boolean;
}

interface NotificationsResponse {
  data: Notification[];
}

interface UnreadCountResponse {
  data: {
    unread_count: number;
  };
}

interface MarkAsReadResponse {
  data: {
    id: number;
    is_read: boolean;
  };
}

interface MarkAllAsReadResponse {
  data: {
    updated_count: number;
  };
}

interface SnoozeResponse {
  data: {
    id: number;
    is_snoozed: boolean;
    is_read: boolean;
    snoozed_until: string;
  };
}

interface ArchiveResponse {
  data: {
    id: number;
    is_archived: boolean;
  };
}

interface UnarchiveResponse {
  data: {
    id: number;
    is_archived: boolean;
  };
}

export interface CreateNotificationPayload {
  type: NotificationType;
  message: string;
  preview_text?: string | null;
  link?: string | null;
}

interface CreateNotificationResponse {
  data: Notification;
}

export const notificationsService = {
  async getNotifications(filters?: NotificationFilters): Promise<Notification[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.set("type", filters.type);
    if (filters?.is_read !== undefined) params.set("is_read", String(filters.is_read));
    const query = params.toString();
    const response = await apiClient.get<NotificationsResponse>(
      `/api/notifications${query ? `?${query}` : ""}`
    );
    return response.data;
  },

  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<UnreadCountResponse>(
      "/api/notifications/unread-count"
    );
    return response.data.unread_count;
  },

  async markAsRead(id: number): Promise<{ id: number; is_read: boolean }> {
    const response = await apiClient.patch<MarkAsReadResponse>(
      `/api/notifications/${id}/read`
    );
    return response.data;
  },

  async markAllAsRead(): Promise<{ updated_count: number }> {
    const response = await apiClient.patch<MarkAllAsReadResponse>(
      "/api/notifications/read-all"
    );
    return response.data;
  },

  async snoozeNotification(
    id: number,
    snooze_until?: string
  ): Promise<{ id: number; is_snoozed: boolean; is_read: boolean; snoozed_until: string }> {
    const body = snooze_until ? { snooze_until } : {};
    const response = await apiClient.patch<SnoozeResponse>(
      `/api/notifications/${id}/snooze`,
      body
    );
    return response.data;
  },

  async archiveNotification(id: number): Promise<{ id: number; is_archived: boolean }> {
    const response = await apiClient.patch<ArchiveResponse>(
      `/api/notifications/${id}/archive`
    );
    return response.data;
  },

  async unarchiveNotification(id: number): Promise<{ id: number; is_archived: boolean }> {
    const response = await apiClient.patch<UnarchiveResponse>(
      `/api/notifications/${id}/unarchive`
    );
    return response.data;
  },

  async createNotification(payload: CreateNotificationPayload): Promise<Notification> {
    const response = await apiClient.post<CreateNotificationResponse>(
      "/api/notifications",
      payload
    );
    return response.data;
  },
};
