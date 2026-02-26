"use client";

import React from "react";
import { CallRecord } from "./keepingTrackData";

interface TrackingStatsCardsProps {
  records: CallRecord[];
}

const TrackingStatsCards: React.FC<TrackingStatsCardsProps> = ({ records }) => {
  const total_count = records.length;
  const pending_count = records.filter(
    (r) => r.status === "pending" || r.status === "confirmed"
  ).length;
  const completed_count = records.filter(
    (r) => r.status === "completed"
  ).length;
  const missed_count = records.filter((r) => r.status === "missed").length;

  const completion_rate =
    total_count > 0
      ? Math.round((completed_count / total_count) * 100)
      : 0;

  const stats_items = [
    {
      label: "Total Records",
      value: total_count,
      color: "text-gray-900 dark:text-white",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
          <path
            fillRule="evenodd"
            d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
            clipRule="evenodd"
          />
        </svg>
      ),
      bg_color: "bg-gray-100 dark:bg-white/[0.05]",
      icon_color: "text-gray-500 dark:text-gray-400",
    },
    {
      label: "Upcoming",
      value: pending_count,
      color: "text-brand-500",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
            clipRule="evenodd"
          />
        </svg>
      ),
      bg_color: "bg-brand-50 dark:bg-brand-500/[0.08]",
      icon_color: "text-brand-500 dark:text-brand-400",
    },
    {
      label: "Completed",
      value: completed_count,
      color: "text-success-500",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      ),
      bg_color: "bg-success-50 dark:bg-success-500/[0.08]",
      icon_color: "text-success-500",
    },
    {
      label: "Missed",
      value: missed_count,
      color: "text-error-500",
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      ),
      bg_color: "bg-error-50 dark:bg-error-500/[0.08]",
      icon_color: "text-error-500",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:gap-6">
      {stats_items.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.02] lg:p-5"
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.bg_color}`}
            >
              <span className={stat.icon_color}>{stat.icon}</span>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {stat.label}
              </p>
              <p className={`text-xl font-semibold ${stat.color}`}>
                {stat.value}
              </p>
            </div>
          </div>
        </div>
      ))}

      {/* Completion Rate Bar */}
      <div className="col-span-2 rounded-xl border border-gray-200 bg-white p-4 sm:col-span-4 dark:border-gray-800 dark:bg-white/[0.02] lg:p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Completion Rate
          </p>
          <p className="text-sm font-semibold text-success-500">
            {completion_rate}%
          </p>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            className="h-full rounded-full bg-success-500 transition-all duration-500"
            style={{ width: `${completion_rate}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default TrackingStatsCards;
