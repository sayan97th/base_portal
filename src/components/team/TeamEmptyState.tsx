"use client";
import React from "react";
import Button from "@/components/ui/button/Button";

interface TeamEmptyStateProps {
  onAddTeam: () => void;
}

const TeamEmptyState: React.FC<TeamEmptyStateProps> = ({ onAddTeam }) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Team
        </h2>
        <Button variant="primary" size="sm" onClick={onAddTeam}>
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
            Add
          </span>
        </Button>
      </div>
      <p className="text-gray-500 dark:text-gray-400">
        Add team members so they can collaborate on orders. You can also add
        people to individual orders.
      </p>
    </div>
  );
};

export default TeamEmptyState;
