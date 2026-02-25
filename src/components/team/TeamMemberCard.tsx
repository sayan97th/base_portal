"use client";
import React from "react";
import Badge from "@/components/ui/badge/Badge";
import type { TeamMember, Permission } from "./types";

interface TeamMemberCardProps {
  member: TeamMember;
  onTogglePermission: (member_id: string, permission: Permission) => void;
  onRemoveMember: (member_id: string) => void;
}

const PERMISSION_LIST: Permission[] = ["orders", "tickets", "invoices"];

const permission_labels: Record<Permission, string> = {
  orders: "Orders",
  tickets: "Tickets",
  invoices: "Invoices",
};

const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
  member,
  onTogglePermission,
  onRemoveMember,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/50">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-500 font-semibold text-sm dark:bg-brand-500/15">
          {member.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white truncate">
            {member.name}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {member.email}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {member.role === "owner" && (
          <Badge variant="light" color="info" size="sm">
            Owner
          </Badge>
        )}

        {PERMISSION_LIST.map((permission) => {
          const is_active = member.permissions.includes(permission);
          return (
            <button
              key={permission}
              onClick={() => onTogglePermission(member.id, permission)}
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer ${
                is_active
                  ? "bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200"
                  : "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-600 dark:hover:text-gray-400"
              }`}
              title={`${is_active ? "Disable" : "Enable"} ${permission_labels[permission]} access`}
            >
              {permission_labels[permission]}
            </button>
          );
        })}

        {member.role !== "owner" && (
          <button
            onClick={() => onRemoveMember(member.id)}
            className="ml-2 text-gray-400 hover:text-error-500 transition-colors"
            title="Remove member"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 4L4 12M4 4L12 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default TeamMemberCard;
