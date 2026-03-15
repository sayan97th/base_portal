import { apiClient, setToken } from "@/lib/api-client";
import { getPrimaryRole, setPrimaryRoleCookie } from "@/lib/roles";
import type {
  AdminInvitation,
  AdminInvitationValidation,
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
 * List all invitations.
 * Roles allowed: super_admin, admin, staff.
 * NOT paginated — returns the full array.
 */
export async function listAdminInvitations(): Promise<AdminInvitation[]> {
  return apiClient.get<AdminInvitation[]>("/api/admin/invitations");
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
