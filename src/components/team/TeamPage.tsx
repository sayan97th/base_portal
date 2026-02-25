"use client";
import React, { useState } from "react";
import TeamEmptyState from "./TeamEmptyState";
import TeamDetail from "./TeamDetail";
import CreateTeamModal from "./CreateTeamModal";
import InviteMemberModal from "./InviteMemberModal";
import type { Team, Permission } from "./types";

const TeamPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selected_team_index, setSelectedTeamIndex] = useState<number | null>(
    null
  );
  const [is_create_modal_open, setIsCreateModalOpen] = useState(false);
  const [is_invite_modal_open, setIsInviteModalOpen] = useState(false);

  const selected_team =
    selected_team_index !== null ? teams[selected_team_index] : null;

  const handleCreateTeam = (team_name: string) => {
    const new_team: Team = {
      id: crypto.randomUUID(),
      name: team_name,
      members: [],
    };
    setTeams((prev) => [...prev, new_team]);
    setSelectedTeamIndex(teams.length);
    setIsCreateModalOpen(false);
  };

  const handleInviteMember = (
    name: string,
    email: string,
    permissions: Permission[]
  ) => {
    if (selected_team_index === null) return;

    const new_member = {
      id: crypto.randomUUID(),
      name,
      email,
      role: "member" as const,
      permissions,
    };

    setTeams((prev) =>
      prev.map((team, index) =>
        index === selected_team_index
          ? { ...team, members: [...team.members, new_member] }
          : team
      )
    );
    setIsInviteModalOpen(false);
  };

  const handleRemoveMember = (member_id: string) => {
    if (selected_team_index === null) return;

    setTeams((prev) =>
      prev.map((team, index) =>
        index === selected_team_index
          ? {
              ...team,
              members: team.members.filter((m) => m.id !== member_id),
            }
          : team
      )
    );
  };

  const handleTogglePermission = (
    member_id: string,
    permission: Permission
  ) => {
    if (selected_team_index === null) return;

    setTeams((prev) =>
      prev.map((team, index) =>
        index === selected_team_index
          ? {
              ...team,
              members: team.members.map((member) =>
                member.id === member_id
                  ? {
                      ...member,
                      permissions: member.permissions.includes(permission)
                        ? member.permissions.filter((p) => p !== permission)
                        : [...member.permissions, permission],
                    }
                  : member
              ),
            }
          : team
      )
    );
  };

  return (
    <>
      {selected_team ? (
        <TeamDetail
          team={selected_team}
          onInvite={() => setIsInviteModalOpen(true)}
          onTogglePermission={handleTogglePermission}
          onRemoveMember={handleRemoveMember}
        />
      ) : (
        <TeamEmptyState onAddTeam={() => setIsCreateModalOpen(true)} />
      )}

      <CreateTeamModal
        is_open={is_create_modal_open}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateTeam}
      />

      <InviteMemberModal
        is_open={is_invite_modal_open}
        onClose={() => setIsInviteModalOpen(false)}
        onInvite={handleInviteMember}
      />
    </>
  );
};

export default TeamPage;
