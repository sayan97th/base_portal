import { apiClient } from "@/lib/api-client";
import type { ApiTicket, ApiTicketMessage, TicketPriority, TicketStatus } from "@/components/support/supportData";

export interface AdminTicketClient {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  organization_id: number | null;
  organization: { id: number; name: string } | null;
}

export interface AdminUserForSelect {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export interface AdminApiTicket extends Omit<ApiTicket, "user"> {
  user: AdminTicketClient;
  messages_count?: number;
  messages?: ApiTicketMessage[];
  assigned_to: number | null;
  assigned_admin: AdminUserForSelect | null;
}

export interface AdminTicketClientStats {
  total_tickets: number;
  open_tickets: number;
  member_since: string | null;
}

export interface AdminTicketDetailResponse {
  support_ticket: AdminApiTicket;
  client_stats: AdminTicketClientStats | null;
}

export interface AdminTicketStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
}

export interface AdminTicketListFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  search?: string;
  sort_by?: "created_at" | "updated_at" | "status" | "priority";
  sort_dir?: "asc" | "desc";
  page?: number;
  per_page?: number;
}

export interface PaginatedAdminTicketsResponse {
  data: AdminApiTicket[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface AdminUpdateTicketPayload {
  status?: TicketStatus;
  priority?: TicketPriority;
  assigned_to?: number | null;
}

interface AdminUpdateTicketResponse {
  message: string;
  support_ticket: AdminApiTicket;
}

interface AdminAddMessageResponse {
  message: string;
  ticket_message: ApiTicketMessage;
  support_ticket: AdminApiTicket;
}

interface AdminUsersForSelectResponse {
  data: AdminUserForSelect[];
}

export const adminSupportTicketsService = {
  async getTickets(filters: AdminTicketListFilters = {}): Promise<PaginatedAdminTicketsResponse> {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.search) params.set("search", filters.search);
    if (filters.sort_by) params.set("sort_by", filters.sort_by);
    if (filters.sort_dir) params.set("sort_dir", filters.sort_dir);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.per_page) params.set("per_page", String(filters.per_page));
    const query = params.toString();
    return apiClient.get<PaginatedAdminTicketsResponse>(
      `/api/admin/support-tickets${query ? `?${query}` : ""}`
    );
  },

  async getTicket(id: number): Promise<AdminTicketDetailResponse> {
    return apiClient.get<AdminTicketDetailResponse>(`/api/admin/support-tickets/${id}`);
  },

  async getStats(): Promise<AdminTicketStats> {
    return apiClient.get<AdminTicketStats>("/api/admin/support-tickets/stats");
  },

  async updateTicket(id: number, payload: AdminUpdateTicketPayload): Promise<AdminApiTicket> {
    const response = await apiClient.patch<AdminUpdateTicketResponse>(
      `/api/admin/support-tickets/${id}`,
      payload
    );
    return response.support_ticket;
  },

  async addMessage(ticket_id: number, content: string): Promise<AdminAddMessageResponse> {
    return apiClient.post<AdminAddMessageResponse>(
      `/api/admin/support-tickets/${ticket_id}/messages`,
      { content }
    );
  },

  async getAdminUsersForSelect(search?: string): Promise<AdminUserForSelect[]> {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const query = params.toString();
    const response = await apiClient.get<AdminUsersForSelectResponse>(
      `/api/admin/support-tickets/admin-users${query ? `?${query}` : ""}`
    );
    return response.data;
  },

  async assignTicket(ticket_id: number, admin_id: number | null): Promise<AdminApiTicket> {
    const response = await apiClient.patch<AdminUpdateTicketResponse>(
      `/api/admin/support-tickets/${ticket_id}`,
      { assigned_to: admin_id }
    );
    return response.support_ticket;
  },
};
