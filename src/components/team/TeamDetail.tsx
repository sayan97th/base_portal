"use client";
import React from "react";
import Button from "@/components/ui/button/Button";
import TeamMemberCard from "./TeamMemberCard";
import type { Team, Permission } from "./types";

interface TeamDetailProps {
  team: Team;
  onInvite: () => void;
  onTogglePermission: (member_id: string, permission: Permission) => void;
  onRemoveMember: (member_id: string) => void;
}

const TeamDetail: React.FC<TeamDetailProps> = ({
  team,
  onInvite,
  onTogglePermission,
  onRemoveMember,
}) => {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Team
      </h2>

      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {team.name}
        </h3>
        <Button variant="primary" size="sm" onClick={onInvite}>
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
            Invite
          </span>
        </Button>
      </div>

      <div className="space-y-3">
        {team.members.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 py-4">
            No members yet. Invite someone to get started.
          </p>
        ) : (
          team.members.map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              onTogglePermission={onTogglePermission}
              onRemoveMember={onRemoveMember}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default TeamDetail;
