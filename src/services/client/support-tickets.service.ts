import { apiClient } from "@/lib/api-client";
import type { ApiTicket, ApiTicketMessage, TicketPriority, TicketStatus } from "@/components/support/supportData";

export interface PaginatedTicketsResponse {
  data: ApiTicket[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface TicketListFilters {
  status?: TicketStatus;
  priority?: TicketPriority;
  page?: number;
  per_page?: number;
}

export interface CreateTicketPayload {
  subject: string;
  priority?: TicketPriority;
  related_order?: string;
  content: string;
}

export interface UpdateTicketPayload {
  status?: TicketStatus;
  priority?: TicketPriority;
}

interface CreateTicketResponse {
  message: string;
  support_ticket: ApiTicket;
}

interface TicketDetailResponse {
  support_ticket: ApiTicket;
}

interface UpdateTicketResponse {
  message: string;
  support_ticket: ApiTicket;
}

interface AddMessageResponse {
  message: string;
  ticket_message: ApiTicketMessage;
}

export const supportTicketsService = {
  async getTickets(filters: TicketListFilters = {}): Promise<PaginatedTicketsResponse> {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.priority) params.set("priority", filters.priority);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.per_page) params.set("per_page", String(filters.per_page));
    const query = params.toString();
    return apiClient.get<PaginatedTicketsResponse>(
      `/api/support-tickets${query ? `?${query}` : ""}`
    );
  },

  async getTicket(id: number): Promise<ApiTicket> {
    const response = await apiClient.get<TicketDetailResponse>(
      `/api/support-tickets/${id}`
    );
    return response.support_ticket;
  },

  async createTicket(payload: CreateTicketPayload): Promise<ApiTicket> {
    const response = await apiClient.post<CreateTicketResponse>(
      "/api/support-tickets",
      payload
    );
    return response.support_ticket;
  },

  async updateTicket(id: number, payload: UpdateTicketPayload): Promise<ApiTicket> {
    const response = await apiClient.patch<UpdateTicketResponse>(
      `/api/support-tickets/${id}`,
      payload
    );
    return response.support_ticket;
  },

  async addMessage(ticket_id: number, content: string): Promise<ApiTicketMessage> {
    const response = await apiClient.post<AddMessageResponse>(
      `/api/support-tickets/${ticket_id}/messages`,
      { content }
    );
    return response.ticket_message;
  },
};
