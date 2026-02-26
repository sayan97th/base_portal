"use client";

import React from "react";
import Badge from "@/components/ui/badge/Badge";
import { Modal } from "@/components/ui/modal";
import {
  CallRecord,
  status_color_map,
  status_label_map,
  priority_color_map,
  priority_label_map,
} from "./keepingTrackData";

interface TrackingRecordDetailProps {
  record: CallRecord | null;
  is_open: boolean;
  onClose: () => void;
}

const TrackingRecordDetail: React.FC<TrackingRecordDetailProps> = ({
  record,
  is_open,
  onClose,
}) => {
  if (!record) return null;

  const detail_sections = [
    {
      title: "Call Information",
      items: [
        { label: "Call Type", value: record.call_type },
        {
          label: "Date & Time",
          value: `${record.scheduled_date} at ${record.scheduled_time}`,
        },
        { label: "Duration", value: `${record.duration} min` },
        { label: "Assigned To", value: record.assigned_to },
      ],
    },
    {
      title: "Follow-up Details",
      items: [
        { label: "Notes", value: record.follow_up_notes || "—" },
        { label: "Outcome", value: record.outcome || "Pending" },
        { label: "Next Action", value: record.next_action || "—" },
        { label: "Next Action Date", value: record.next_action_date || "—" },
      ],
    },
  ];

  return (
    <Modal isOpen={is_open} onClose={onClose} className="max-w-xl">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {record.contact_name}
              </h2>
              <span className="text-xs text-gray-400">{record.id}</span>
            </div>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {record.contact_email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="light"
              size="sm"
              color={priority_color_map[record.priority]}
            >
              {priority_label_map[record.priority]}
            </Badge>
            <Badge
              variant="light"
              size="sm"
              color={status_color_map[record.status]}
            >
              {status_label_map[record.status]}
            </Badge>
          </div>
        </div>

        {/* Detail Sections */}
        <div className="space-y-5">
          {detail_sections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
                {section.title}
              </h3>
              <div className="space-y-3 rounded-lg bg-gray-50 p-4 dark:bg-white/[0.03]">
                {section.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start justify-between gap-4"
                  >
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {item.label}
                    </span>
                    <span className="text-right text-sm font-medium text-gray-800 dark:text-gray-200">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Close Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-white/[0.05] dark:text-gray-300 dark:hover:bg-white/[0.1]"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TrackingRecordDetail;
