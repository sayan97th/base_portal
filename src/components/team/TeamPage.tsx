"use client";
import React, { useState } from "react";
import TeamEmptyState from "./TeamEmptyState";
import TeamDetail from "./TeamDetail";
import CreateTeamModal from "./CreateTeamModal";
import InviteMemberModal from "./InviteMemberModal";
import Button from "@/components/ui/button/Button";
import type { Team, Permission } from "./types";

const TeamPage: React.FC = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [is_create_modal_open, setIsCreateModalOpen] = useState(false);
  const [is_invite_modal_open, setIsInviteModalOpen] = useState(false);
  const [invite_target_team_id, setInviteTargetTeamId] = useState<
    string | null
  >(null);

  const handleCreateTeam = (team_name: string) => {
    const new_team: Team = {
      id: crypto.randomUUID(),
      name: team_name,
      members: [],
    };
    setTeams((prev) => [...prev, new_team]);
    setIsCreateModalOpen(false);
  };

  const handleDeleteTeam = (team_id: string) => {
    setTeams((prev) => prev.filter((team) => team.id !== team_id));
  };

  const handleOpenInvite = (team_id: string) => {
    setInviteTargetTeamId(team_id);
    setIsInviteModalOpen(true);
  };

  const handleInviteMember = (
    name: string,
    email: string,
    permissions: Permission[]
  ) => {
    if (!invite_target_team_id) return;

    const new_member = {
      id: crypto.randomUUID(),
      name,
      email,
      role: "member" as const,
      permissions,
    };

    setTeams((prev) =>
      prev.map((team) =>
        team.id === invite_target_team_id
          ? { ...team, members: [...team.members, new_member] }
          : team
      )
    );
    setIsInviteModalOpen(false);
    setInviteTargetTeamId(null);
  };

  const handleRemoveMember = (member_id: string) => {
    setTeams((prev) =>
      prev.map((team) => ({
        ...team,
        members: team.members.filter((m) => m.id !== member_id),
      }))
    );
  };

  const handleTogglePermission = (
    member_id: string,
    permission: Permission
  ) => {
    setTeams((prev) =>
      prev.map((team) => ({
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
      }))
    );
  };

  const handleCloseInvite = () => {
    setIsInviteModalOpen(false);
    setInviteTargetTeamId(null);
  };

  return (
    <>
      {teams.length === 0 ? (
        <TeamEmptyState onAddTeam={() => setIsCreateModalOpen(true)} />
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Teams
            </h2>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <span className="flex items-center gap-1">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 3.33334V12.6667M3.33337 8H12.6667"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Add Team
              </span>
            </Button>
          </div>

          <div className="space-y-6">
            {teams.map((team) => (
              <TeamDetail
                key={team.id}
                team={team}
                onInvite={handleOpenInvite}
                onDeleteTeam={handleDeleteTeam}
                onTogglePermission={handleTogglePermission}
                onRemoveMember={handleRemoveMember}
              />
            ))}
          </div>
        </div>
      )}

      <CreateTeamModal
        is_open={is_create_modal_open}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateTeam}
      />

      <InviteMemberModal
        is_open={is_invite_modal_open}
        onClose={handleCloseInvite}
        onInvite={handleInviteMember}
      />
    </>
  );
};

export default TeamPage;
