"use client";

import React from "react";
import Badge from "@/components/ui/badge/Badge";
import {
  CallRecord,
  status_color_map,
  status_label_map,
  status_dot_color_map,
} from "./keepingTrackData";

interface TrackingTimelineProps {
  records: CallRecord[];
}

const TrackingTimeline: React.FC<TrackingTimelineProps> = ({ records }) => {
  const upcoming_records = records
    .filter((r) => r.status === "pending" || r.status === "confirmed")
    .slice(0, 5);

  if (upcoming_records.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.02]">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">
          Upcoming Calls
        </h3>
        <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          No upcoming calls scheduled.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.02]">
      <h3 className="mb-5 text-base font-semibold text-gray-900 dark:text-white">
        Upcoming Calls
      </h3>
      <div className="space-y-0">
        {upcoming_records.map((record, index) => {
          const is_last = index === upcoming_records.length - 1;

          return (
            <div key={record.id} className="relative flex gap-4">
              {/* Timeline Line & Dot */}
              <div className="flex flex-col items-center">
                <div
                  className={`mt-1 h-3 w-3 rounded-full ${status_dot_color_map[record.status]} ring-4 ring-white dark:ring-gray-900`}
                />
                {!is_last && (
                  <div className="w-px flex-1 bg-gray-200 dark:bg-gray-700" />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 ${!is_last ? "pb-6" : "pb-0"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {record.contact_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {record.call_type} &middot; {record.duration} min
                    </p>
                  </div>
                  <Badge
                    variant="light"
                    size="sm"
                    color={status_color_map[record.status]}
                  >
                    {status_label_map[record.status]}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>
                    {record.scheduled_date} at {record.scheduled_time}
                  </span>
                </div>
                {record.next_action && (
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-brand-500 dark:text-brand-400">
                    <svg
                      className="h-3.5 w-3.5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{record.next_action}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TrackingTimeline;
