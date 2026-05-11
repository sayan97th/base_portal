import { apiClient, setToken } from "@/lib/api-client";
import { getPrimaryRole, setPrimaryRoleCookie } from "@/lib/roles";
import type {
  ClientInvitation,
  ClientInvitationFilters,
  ClientInvitationValidation,
  PaginatedResponse,
  SendClientInvitationData,
  ResendClientInvitationResponse,
  AcceptClientInvitationData,
  AcceptClientInvitationResponse,
} from "@/types/admin";

export async function listClientInvitations(
  filters: ClientInvitationFilters = {}
): Promise<PaginatedResponse<ClientInvitation>> {
  const params = new URLSearchParams({ page: String(filters.page ?? 1) });
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.status) params.set("status", filters.status);
  if (filters.sort_field) params.set("sort_field", filters.sort_field);
  if (filters.sort_direction) params.set("sort_direction", filters.sort_direction);
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  return apiClient.get<PaginatedResponse<ClientInvitation>>(
    `/api/admin/client-invitations?${params.toString()}`
  );
}

export async function sendClientInvitation(
  data: SendClientInvitationData
): Promise<ClientInvitation> {
  return apiClient.post<ClientInvitation>("/api/admin/client-invitations", data);
}

export async function resendClientInvitation(
  id: number
): Promise<ResendClientInvitationResponse> {
  return apiClient.post<ResendClientInvitationResponse>(
    `/api/admin/client-invitations/${id}/resend`,
    {}
  );
}

export async function revokeClientInvitation(id: number): Promise<void> {
  return apiClient.delete(`/api/admin/client-invitations/${id}`);
}

export async function validateClientInvitationToken(
  token: string
): Promise<ClientInvitationValidation> {
  return apiClient.get<ClientInvitationValidation>(
    `/api/client-invitations/${token}/validate`
  );
}

export async function acceptClientInvitation(
  data: AcceptClientInvitationData
): Promise<AcceptClientInvitationResponse> {
  const response = await apiClient.post<AcceptClientInvitationResponse>(
    "/api/client-invitations/accept",
    data
  );
  setToken(response.access_token);
  const expires_at = Date.now() + response.expires_in * 1000;
  localStorage.setItem("token_expires_at", expires_at.toString());
  setPrimaryRoleCookie(getPrimaryRole(response.user.roles));
  return response;
}
