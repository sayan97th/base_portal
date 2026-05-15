import { apiClient } from "@/lib/api-client";
import type {
  AdminTeam,
  AdminTeamDetail,
  AdminTeamPaginatedResponse,
  CreateAdminTeamPayload,
  UpdateAdminTeamPayload,
  AddAdminTeamMemberPayload,
  UpdateAdminTeamMemberRolePayload,
} from "@/types/admin/teams";
import type { AdminUser, PaginatedResponse } from "@/types/admin";

export async function listAdminTeams(
  page: number = 1,
  per_page: number = 10,
  search?: string
): Promise<AdminTeamPaginatedResponse> {
  const params = new URLSearchParams({ page: String(page), per_page: String(per_page) });
  if (search?.trim()) params.set("search", search.trim());
  return apiClient.get<AdminTeamPaginatedResponse>(`/api/admin/teams?${params.toString()}`);
}

export async function getAdminTeam(id: string): Promise<AdminTeamDetail> {
  const response = await apiClient.get<{ data: AdminTeamDetail }>(`/api/admin/teams/${id}`);
  return response.data;
}

export async function createAdminTeam(
  payload: CreateAdminTeamPayload
): Promise<AdminTeam> {
  const response = await apiClient.post<{ data: AdminTeam }>("/api/admin/teams", payload);
  return response.data;
}

export async function updateAdminTeam(
  id: string,
  payload: UpdateAdminTeamPayload
): Promise<AdminTeam> {
  const response = await apiClient.patch<{ data: AdminTeam }>(`/api/admin/teams/${id}`, payload);
  return response.data;
}

export async function toggleAdminTeamStatus(
  id: string,
  is_active: boolean
): Promise<AdminTeam> {
  const response = await apiClient.patch<{ data: AdminTeam }>(`/api/admin/teams/${id}`, { is_active });
  return response.data;
}

export async function deleteAdminTeam(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/admin/teams/${id}`);
}

export async function addAdminTeamMember(
  team_id: string,
  payload: AddAdminTeamMemberPayload
): Promise<AdminTeamDetail> {
  const response = await apiClient.post<{ data: AdminTeamDetail }>(
    `/api/admin/teams/${team_id}/members`,
    payload
  );
  return response.data;
}

export async function removeAdminTeamMember(
  team_id: string,
  user_id: number
): Promise<void> {
  return apiClient.delete<void>(`/api/admin/teams/${team_id}/members/${user_id}`);
}

export async function updateAdminTeamMemberRole(
  team_id: string,
  user_id: number,
  payload: UpdateAdminTeamMemberRolePayload
): Promise<AdminTeamDetail> {
  const response = await apiClient.patch<{ data: AdminTeamDetail }>(
    `/api/admin/teams/${team_id}/members/${user_id}`,
    payload
  );
  return response.data;
}

export async function fetchStaffUsersForTeam(): Promise<AdminUser[]> {
  const response = await apiClient.get<PaginatedResponse<AdminUser>>(
    `/api/admin/users?type=staff&per_page=100&page=1`
  );
  return response.data;
}
