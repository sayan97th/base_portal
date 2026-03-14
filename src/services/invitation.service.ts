import { apiClient, setToken } from "@/lib/api-client";
import { getPrimaryRole, setPrimaryRoleCookie } from "@/lib/roles";
import type {
  Invitation,
  InvitationValidation,
  SendInvitationData,
  AcceptInvitationData,
  AuthResponse,
} from "@/types/auth";

export const invitationService = {
  /**
   * Send an invitation to a new staff member.
   * Requires admin or super_admin role.
   */
  async sendInvitation(data: SendInvitationData): Promise<Invitation> {
    return apiClient.post<Invitation>("/api/staff/invitations", data);
  },

  /**
   * List all pending/sent invitations.
   * Requires admin or super_admin role.
   */
  async listInvitations(): Promise<Invitation[]> {
    return apiClient.get<Invitation[]>("/api/staff/invitations");
  },

  /**
   * Revoke a pending invitation.
   */
  async revokeInvitation(id: number): Promise<void> {
    return apiClient.delete(`/api/staff/invitations/${id}`);
  },

  /**
   * Validate an invitation token before showing the registration form.
   */
  async validateToken(token: string): Promise<InvitationValidation> {
    return apiClient.get<InvitationValidation>(
      `/api/invitations/${token}/validate`
    );
  },

  /**
   * Accept an invitation and create a staff account.
   * Returns a full auth response so the new user is immediately logged in.
   */
  async acceptInvitation(data: AcceptInvitationData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(
      "/api/invitations/accept",
      data
    );
    setToken(response.access_token);
    const expires_at = Date.now() + response.expires_in * 1000;
    localStorage.setItem("token_expires_at", expires_at.toString());
    setPrimaryRoleCookie(getPrimaryRole(response.user.roles));
    return response;
  },
};
