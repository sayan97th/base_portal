"use client";

import React, { useState } from "react";
import Button from "@/components/ui/button/Button";
import Badge from "@/components/ui/badge/Badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  ScheduledCall,
  CallFilterTab,
  filter_tabs,
  status_color_map,
  status_label_map,
  status_dot_color_map,
  call_type_label_map,
  call_type_color_map,
} from "./scheduleCallData";

interface CallListProps {
  calls: ScheduledCall[];
  onNewCall: () => void;
}

const CallList: React.FC<CallListProps> = ({ calls, onNewCall }) => {
  const [active_tab, setActiveTab] = useState<CallFilterTab>("all");

  const filtered_calls =
    active_tab === "all"
      ? calls
      : calls.filter((call) => call.status === active_tab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Scheduled Calls
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage and track your scheduled calls with clients and team members.
          </p>
        </div>
        <Button variant="coral" size="sm" onClick={onNewCall}>
          Schedule a Call
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-white/[0.02]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
            {calls.length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-white/[0.02]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Upcoming</p>
          <p className="mt-1 text-2xl font-semibold text-brand-500">
            {calls.filter((c) => c.status === "scheduled").length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-white/[0.02]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
          <p className="mt-1 text-2xl font-semibold text-success-500">
            {calls.filter((c) => c.status === "completed").length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-white/[0.02]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Cancelled</p>
          <p className="mt-1 text-2xl font-semibold text-error-500">
            {calls.filter((c) => c.status === "cancelled").length}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-4">
          {filter_tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`pb-3 text-sm font-medium transition-colors border-b-2 ${
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
                  Duration
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Status
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered_calls.length > 0 ? (
                filtered_calls.map((call) => (
                  <TableRow
                    key={call.id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.02]"
                  >
                    <TableCell className="px-5 py-4">
                      <div>
                        <p className="text-theme-sm font-medium text-gray-800 dark:text-white/90">
                          {call.contact_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {call.contact_email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <Badge
                        variant="light"
                        size="sm"
                        color={call_type_color_map[call.call_type]}
                      >
                        {call_type_label_map[call.call_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <div>
                        <p className="text-theme-sm text-gray-700 dark:text-gray-300">
                          {call.scheduled_date}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {call.scheduled_time}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-700 dark:text-gray-300">
                      {call.duration} min
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      <Badge
                        variant="light"
                        size="sm"
                        color={status_color_map[call.status]}
                        startIcon={
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${status_dot_color_map[call.status]}`}
                          />
                        }
                      >
                        {status_label_map[call.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell className="px-5 py-8 text-center text-theme-sm text-gray-500 dark:text-gray-400">
                    No calls found for this filter.
                  </TableCell>
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

export default CallList;
