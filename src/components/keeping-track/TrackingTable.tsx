"use client";

import React, { useState } from "react";
import Badge from "@/components/ui/badge/Badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  CallRecord,
  TrackingFilterTab,
  filter_tabs,
  status_color_map,
  status_label_map,
  status_dot_color_map,
  priority_color_map,
  priority_label_map,
} from "./keepingTrackData";

interface TrackingTableProps {
  records: CallRecord[];
  onViewDetail: (record: CallRecord) => void;
}

const TrackingTable: React.FC<TrackingTableProps> = ({
  records,
  onViewDetail,
}) => {
  const [active_tab, setActiveTab] = useState<TrackingFilterTab>("all");
  const [search_query, setSearchQuery] = useState("");

  const filtered_records = records.filter((record) => {
    const matches_tab =
      active_tab === "all" || record.status === active_tab;
    const matches_search =
      search_query.trim() === "" ||
      record.contact_name
        .toLowerCase()
        .includes(search_query.toLowerCase()) ||
      record.contact_email
        .toLowerCase()
        .includes(search_query.toLowerCase()) ||
      record.id.toLowerCase().includes(search_query.toLowerCase());
    return matches_tab && matches_search;
  });

  return (
    <div className="space-y-5">
      {/* Search & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="text"
            placeholder="Search by name, email, or ID..."
            value={search_query}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-transparent py-2 pl-10 pr-4 text-sm text-gray-700 outline-none transition-colors focus:border-brand-300 focus:ring-1 focus:ring-brand-300 dark:border-gray-700 dark:text-gray-300 dark:focus:border-brand-500 sm:w-72"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-4 overflow-x-auto">
          {filter_tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`whitespace-nowrap pb-3 text-sm font-medium transition-colors border-b-2 ${
                active_tab === tab.value
                  ? "border-brand-500 text-brand-500 dark:text-brand-400 dark:border-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-gray-800">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  ID
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Contact
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Type
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Date & Time
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Priority
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Assigned To
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Status
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Action
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered_records.length > 0 ? (
                filtered_records.map((record) => (
                  <TableRow
                    key={record.id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                  >
                    <TableCell className="px-5 py-4 text-theme-sm font-mono text-gray-500 dark:text-gray-400">
                      {record.id}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div>
                        <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                          {record.contact_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {record.contact_email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <span className="text-theme-sm text-gray-700 dark:text-gray-300">
                        {record.call_type}
                      </span>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div>
                        <p className="text-theme-sm text-gray-700 dark:text-gray-300">
                          {record.scheduled_date}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {record.scheduled_time}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <Badge
                        variant="light"
                        size="sm"
                        color={priority_color_map[record.priority]}
                      >
                        {priority_label_map[record.priority]}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-50 text-xs font-medium text-brand-500 dark:bg-brand-500/[0.12] dark:text-brand-400">
                          {record.assigned_to
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <span className="text-theme-sm text-gray-700 dark:text-gray-300">
                          {record.assigned_to}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <Badge
                        variant="light"
                        size="sm"
                        color={status_color_map[record.status]}
                        startIcon={
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${status_dot_color_map[record.status]}`}
                          />
                        }
                      >
                        {status_label_map[record.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <button
                        onClick={() => onViewDetail(record)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-brand-500 transition-colors hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                      >
                        View
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="px-5 py-8 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                    No records found.
                  </TableCell>
                  <TableCell className="px-5 py-4">{""}</TableCell>
                  <TableCell className="px-5 py-4">{""}</TableCell>
                  <TableCell className="px-5 py-4">{""}</TableCell>
                  <TableCell className="px-5 py-4">{""}</TableCell>
                  <TableCell className="px-5 py-4">{""}</TableCell>
                  <TableCell className="px-5 py-4">{""}</TableCell>
                  <TableCell className="px-5 py-4">{""}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default TrackingTable;
