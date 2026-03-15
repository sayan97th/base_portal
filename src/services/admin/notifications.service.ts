import { apiClient } from "@/lib/api-client";

export type AdminNotificationType = "payment" | "order" | "system" | "user_registration";

export interface AdminNotificationUser {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export interface AdminNotification {
  id: number;
  user_id: number;
  type: AdminNotificationType;
  message: string;
  preview_text: string | null;
  link: string | null;
  is_read: boolean;
  is_archived: boolean;
  date: string;
  relative_time: string;
  created_at: string;
  updated_at: string;
  user: AdminNotificationUser | null;
}

export interface AdminNotificationFilters {
  type?: AdminNotificationType;
  is_read?: boolean;
  page?: number;
  per_page?: number;
}

interface AdminNotificationsResponse {
  data: AdminNotification[];
  total: number;
  current_page: number;
  last_page: number;
}

interface AdminUnreadCountResponse {
  data: {
    unread_count: number;
  };
}

interface AdminMarkAsReadResponse {
  data: {
    id: number;
    is_read: boolean;
  };
}

interface AdminMarkAllAsReadResponse {
  data: {
    updated_count: number;
  };
}

interface AdminArchiveResponse {
  data: {
    id: number;
    is_archived: boolean;
  };
}

interface AdminUnarchiveResponse {
  data: {
    id: number;
    is_archived: boolean;
  };
}

export const adminNotificationsService = {
  async getNotifications(
    filters?: AdminNotificationFilters
  ): Promise<AdminNotificationsResponse> {
    const params = new URLSearchParams();
    if (filters?.type) params.set("type", filters.type);
    if (filters?.is_read !== undefined) params.set("is_read", String(filters.is_read));
    if (filters?.page) params.set("page", String(filters.page));
    if (filters?.per_page) params.set("per_page", String(filters.per_page));
    const query = params.toString();
    const response = await apiClient.get<AdminNotificationsResponse>(
      `/api/admin/notifications${query ? `?${query}` : ""}`
    );
    return response;
  },

  async getUnreadCount(): Promise<number> {
    const response = await apiClient.get<AdminUnreadCountResponse>(
      "/api/admin/notifications/unread-count"
    );
    return response.data.unread_count;
  },

  async markAsRead(id: number): Promise<{ id: number; is_read: boolean }> {
    const response = await apiClient.patch<AdminMarkAsReadResponse>(
      `/api/admin/notifications/${id}/read`
    );
    return response.data;
  },

  async markAllAsRead(): Promise<{ updated_count: number }> {
    const response = await apiClient.patch<AdminMarkAllAsReadResponse>(
      "/api/admin/notifications/read-all"
    );
    return response.data;
  },

  async archiveNotification(id: number): Promise<{ id: number; is_archived: boolean }> {
    const response = await apiClient.patch<AdminArchiveResponse>(
      `/api/admin/notifications/${id}/archive`
    );
    return response.data;
  },

  async unarchiveNotification(id: number): Promise<{ id: number; is_archived: boolean }> {
    const response = await apiClient.patch<AdminUnarchiveResponse>(
      `/api/admin/notifications/${id}/unarchive`
    );
    return response.data;
  },
};
