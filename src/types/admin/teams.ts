export type AdminTeamMemberRole = "lead" | "member";

export interface AdminTeamCreator {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export interface AdminTeamMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  job_title: string | null;
  profile_photo_url: string | null;
  role: AdminTeamMemberRole;
  joined_at: string;
}

export interface AdminTeam {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  created_by: number;
  members_count: number;
  creator: AdminTeamCreator | null;
  created_at: string;
  updated_at: string;
}

export interface AdminTeamDetail extends AdminTeam {
  members: AdminTeamMember[];
}

export interface AdminTeamPaginatedResponse {
  data: AdminTeam[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export interface CreateAdminTeamPayload {
  name: string;
  description?: string | null;
  color?: string;
  is_active?: boolean;
}

export type UpdateAdminTeamPayload = Partial<CreateAdminTeamPayload>;

export interface AddAdminTeamMemberPayload {
  user_id: number;
  role?: AdminTeamMemberRole;
}

export interface UpdateAdminTeamMemberRolePayload {
  role: AdminTeamMemberRole;
}
