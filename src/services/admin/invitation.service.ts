import { apiClient, setToken } from "@/lib/api-client";
import { getPrimaryRole, setPrimaryRoleCookie } from "@/lib/roles";
import type {
  AdminInvitation,
  AdminInvitationFilters,
  AdminInvitationValidation,
  PaginatedResponse,
  SendAdminInvitationData,
  AcceptAdminInvitationData,
  AcceptInvitationResponse,
} from "@/types/admin";

/**
 * Validate an admin invitation token.
 * Public endpoint — no auth required.
 */
export async function validateAdminInvitationToken(
  token: string
): Promise<AdminInvitationValidation> {
  return apiClient.get<AdminInvitationValidation>(
    `/api/admin/invitations/${token}/validate`
  );
}

/**
 * Accept an admin invitation and create an account.
 * Public endpoint — no auth required.
 * Automatically stores the returned token and sets the role cookie.
 */
export async function acceptAdminInvitation(
  data: AcceptAdminInvitationData
): Promise<AcceptInvitationResponse> {
  const response = await apiClient.post<AcceptInvitationResponse>(
    "/api/admin/invitations/accept",
    data
  );
  setToken(response.access_token);
  const expires_at = Date.now() + response.expires_in * 1000;
  localStorage.setItem("token_expires_at", expires_at.toString());
  setPrimaryRoleCookie(getPrimaryRole(response.user.roles));
  return response;
}

/**
 * List invitations (paginated) with optional search, status, role, sort and date range.
 * Roles allowed: super_admin, admin, staff.
 * Handles both paginated and legacy plain-array responses.
 */
export async function listAdminInvitations(
  filters: AdminInvitationFilters = {}
): Promise<PaginatedResponse<AdminInvitation>> {
  const params = new URLSearchParams({ page: String(filters.page ?? 1) });
  if (filters.search?.trim()) params.set("search", filters.search.trim());
  if (filters.status) params.set("status", filters.status);
  if (filters.role) params.set("role", filters.role);
  if (filters.sort_field) params.set("sort_field", filters.sort_field);
  if (filters.sort_direction) params.set("sort_direction", filters.sort_direction);
  if (filters.date_from) params.set("date_from", filters.date_from);
  if (filters.date_to) params.set("date_to", filters.date_to);
  const response = await apiClient.get<PaginatedResponse<AdminInvitation> | AdminInvitation[]>(
    `/api/admin/invitations?${params.toString()}`
  );
  // Normalise: backend may still return a plain array before pagination is implemented
  if (Array.isArray(response)) {
    return {
      data: response,
      current_page: 1,
      last_page: 1,
      total: response.length,
    };
  }
  return response;
}

/**
 * Send an invitation to a new admin or staff member.
 * Roles allowed: super_admin, admin (admins can only invite role "staff").
 */
export async function sendAdminInvitation(
  data: SendAdminInvitationData
): Promise<AdminInvitation> {
  return apiClient.post<AdminInvitation>("/api/admin/invitations", data);
}

/**
 * Revoke a pending invitation by ID.
 * Roles allowed: super_admin, admin.
 */
export async function revokeAdminInvitation(id: number): Promise<void> {
  return apiClient.delete(`/api/admin/invitations/${id}`);
}
