"use client";
import React, { useState } from "react";
import Button from "@/components/ui/button/Button";
import TeamMemberCard from "./TeamMemberCard";
import type { Team, Permission } from "./types";

interface TeamDetailProps {
  team: Team;
  onInvite: (team_id: string) => void;
  onDeleteTeam: (team_id: string) => void;
  onTogglePermission: (member_id: string, permission: Permission) => void;
  onRemoveMember: (member_id: string) => void;
}

const TeamDetail: React.FC<TeamDetailProps> = ({
  team,
  onInvite,
  onDeleteTeam,
  onTogglePermission,
  onRemoveMember,
}) => {
  const [is_expanded, setIsExpanded] = useState(true);

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/50">
      <div
        className={`flex items-center justify-between px-5 py-4 ${is_expanded ? "border-b border-gray-200 dark:border-gray-700" : ""}`}
      >
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="flex items-center gap-2 cursor-pointer"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={`text-gray-500 dark:text-gray-400 transition-transform duration-200 ${is_expanded ? "rotate-90" : ""}`}
          >
            <path
              d="M6 4L10 8L6 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {team.name}
          </h3>
          <span className="text-sm text-gray-400 dark:text-gray-500">
            ({team.members.length})
          </span>
        </button>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onInvite(team.id)}
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
              Invite
            </span>
          </Button>
          <button
            onClick={() => onDeleteTeam(team.id)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-error-50 hover:text-error-500 dark:hover:bg-error-500/10"
            title="Delete team"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M2.25 4.5H15.75M6.75 1.5H11.25M7.5 12.75V7.5M10.5 12.75V7.5M12 16.5H6C5.17157 16.5 4.5 15.8284 4.5 15V5.25H13.5V15C13.5 15.8284 12.8284 16.5 12 16.5Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <div
        className={`overflow-hidden transition-all duration-200 ${is_expanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="p-5 space-y-3">
          {team.members.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 py-2 text-sm">
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
    </div>
  );
};

export default TeamDetail;
