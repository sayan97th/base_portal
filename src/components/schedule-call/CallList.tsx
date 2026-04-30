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
  ScheduledCallAppointment,
  ScheduledCallStatus,
} from "@/services/client/scheduled-call.service";

// ── Status display config ──────────────────────────────────────────────────────

const status_color_map: Record<
  ScheduledCallStatus,
  "primary" | "success" | "error" | "warning"
> = {
  pending: "warning",
  confirmed: "primary",
  completed: "success",
  cancelled: "error",
  no_show: "warning",
};

const status_label_map: Record<ScheduledCallStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};

const status_dot_color_map: Record<ScheduledCallStatus, string> = {
  pending: "bg-warning-500",
  confirmed: "bg-brand-500",
  completed: "bg-success-500",
  cancelled: "bg-error-500",
  no_show: "bg-warning-500",
};

type FilterTab = "all" | ScheduledCallStatus;

const filter_tabs: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "confirmed", label: "Confirmed" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function formatDate(iso_string: string): string {
  const date = new Date(iso_string);
  if (isNaN(date.getTime())) return iso_string;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso_string: string): string {
  const date = new Date(iso_string);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ── Component ──────────────────────────────────────────────────────────────────

interface CallListProps {
  appointments: ScheduledCallAppointment[];
  is_loading: boolean;
  fetch_error: string | null;
  onBook: () => void;
  onReschedule: (appointment: ScheduledCallAppointment) => void;
  onRetry: () => void;
}

const CallList: React.FC<CallListProps> = ({
  appointments,
  is_loading,
  fetch_error,
  onBook,
  onReschedule,
  onRetry,
}) => {
  const [active_tab, setActiveTab] = useState<FilterTab>("all");

  const filtered =
    active_tab === "all"
      ? appointments
      : appointments.filter((a) => a.status === active_tab);

  const count = (status: ScheduledCallStatus) =>
    appointments.filter((a) => a.status === status).length;

  const can_reschedule = (status: ScheduledCallStatus) =>
    status === "pending" || status === "confirmed";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Scheduled Calls
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage and track your scheduled calls. Book a new call anytime.
          </p>
        </div>
        <Button variant="coral" size="sm" onClick={onBook}>
          Book a Call
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-white/[0.02]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
            {appointments.length}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-white/[0.02]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Confirmed</p>
          <p className="mt-1 text-2xl font-semibold text-brand-500">
            {count("confirmed")}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-white/[0.02]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
          <p className="mt-1 text-2xl font-semibold text-success-500">
            {count("completed")}
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-white/[0.02]">
          <p className="text-sm text-gray-500 dark:text-gray-400">Cancelled</p>
          <p className="mt-1 text-2xl font-semibold text-error-500">
            {count("cancelled")}
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {fetch_error && (
        <div className="flex items-center justify-between rounded-xl border border-error-200 bg-error-50 p-4 dark:border-error-800 dark:bg-error-900/20">
          <p className="text-sm text-error-700 dark:text-error-400">
            {fetch_error}
          </p>
          <button
            onClick={onRetry}
            className="text-sm font-medium text-error-700 underline hover:no-underline dark:text-error-400"
          >
            Retry
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-4">
          {filter_tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                active_tab === tab.value
                  ? "border-brand-500 text-brand-500 dark:border-brand-400 dark:text-brand-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-gray-800">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Scheduled Date
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Time
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Booked On
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Status
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {is_loading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="px-5 py-10 text-center text-theme-sm text-gray-500 dark:text-gray-400"
                  >
                    Loading your scheduled calls&hellip;
                  </TableCell>
                </TableRow>
              ) : filtered.length > 0 ? (
                filtered.map((appointment) => (
                  <TableRow
                    key={appointment.id}
                    className="transition-colors hover:bg-gray-50 dark:hover:bg-white/2"
                  >
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-700 dark:text-gray-300">
                      {formatDate(appointment.scheduled_at)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-700 dark:text-gray-300">
                      {formatTime(appointment.scheduled_at)}
                    </TableCell>
                    <TableCell className="px-5 py-4 text-theme-sm text-gray-500 dark:text-gray-400">
                      {formatDate(appointment.created_at)}
                    </TableCell>
                    <TableCell className="px-5 py-4">
                      <Badge
                        variant="light"
                        size="sm"
                        color={status_color_map[appointment.status]}
                        startIcon={
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${status_dot_color_map[appointment.status]}`}
                          />
                        }
                      >
                        {status_label_map[appointment.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="px-5 py-4 text-right">
                      {can_reschedule(appointment.status) && (
                        <button
                          onClick={() => onReschedule(appointment)}
                          className="text-theme-xs font-medium text-brand-500 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                        >
                          Request Reschedule
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="px-5 py-10 text-center text-theme-sm text-gray-500 dark:text-gray-400"
                  >
                    {active_tab === "all"
                      ? "No scheduled calls yet. Click \"Book a Call\" to get started."
                      : "No calls found for this filter."}
                  </TableCell>
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
