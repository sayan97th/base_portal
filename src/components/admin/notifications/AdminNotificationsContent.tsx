"use client";

import React, { useMemo, useState } from "react";
import AdminNotificationItem from "./AdminNotificationItem";
import { useAdminNotifications } from "@/context/AdminNotificationsContext";
import type { AdminNotificationType } from "@/services/admin/notifications.service";

const ITEMS_PER_PAGE = 10;

const TYPE_FILTERS: { label: string; value: AdminNotificationType | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Orders", value: "order" },
  { label: "Payments", value: "payment" },
  { label: "New Users", value: "user_registration" },
  { label: "System", value: "system" },
];

const AdminNotificationsContent: React.FC = () => {
  const [current_page, setCurrentPage] = useState(1);
  const [active_filter, setActiveFilter] = useState<AdminNotificationType | "all">("all");
  const [show_unread_only, setShowUnreadOnly] = useState(false);

  const {
    notifications,
    is_loading,
    unread_count,
    markAsRead,
    markAllAsRead,
    archiveNotification,
  } = useAdminNotifications();

  const filtered_notifications = useMemo(() => {
    return notifications.filter((n) => {
      if (n.is_archived) return false;
      if (active_filter !== "all" && n.type !== active_filter) return false;
      if (show_unread_only && n.is_read) return false;
      return true;
    });
  }, [notifications, active_filter, show_unread_only]);

  const total_pages = Math.ceil(filtered_notifications.length / ITEMS_PER_PAGE);

  const paginated_notifications = useMemo(() => {
    const start_index = (current_page - 1) * ITEMS_PER_PAGE;
    return filtered_notifications.slice(start_index, start_index + ITEMS_PER_PAGE);
  }, [filtered_notifications, current_page]);

  function handleFilterChange(filter: AdminNotificationType | "all") {
    setActiveFilter(filter);
    setCurrentPage(1);
  }

  function handleToggleUnreadOnly() {
    setShowUnreadOnly((prev) => !prev);
    setCurrentPage(1);
  }

  function goToPreviousPage() {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }

  function goToNextPage() {
    setCurrentPage((prev) => Math.min(prev + 1, total_pages));
  }

  if (is_loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Notifications
            </h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Monitor orders, payments, and platform activity
            </p>
          </div>
          {unread_count > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-brand-500 px-2.5 py-0.5 text-xs font-medium text-white">
              {unread_count}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleUnreadOnly}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              show_unread_only
                ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                show_unread_only ? "bg-brand-500" : "bg-gray-400 dark:bg-gray-500"
              }`}
            />
            Unread only
          </button>

          {unread_count > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm font-medium text-brand-500 transition-colors hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Type Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {TYPE_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => handleFilterChange(filter.value)}
            className={`shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-medium transition-colors ${
              active_filter === filter.value
                ? "bg-brand-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        {paginated_notifications.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {paginated_notifications.map((notification) => (
              <AdminNotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
                onArchive={archiveNotification}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <svg
              className="mb-3 h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
              />
            </svg>
            <p className="text-sm font-medium">No notifications</p>
            <p className="mt-1 text-xs">
              {show_unread_only || active_filter !== "all"
                ? "Try adjusting your filters"
                : "All caught up!"}
            </p>
          </div>
        )}

        {/* Footer with Pagination */}
        {filtered_notifications.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-gray-800">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {filtered_notifications.length} notification
              {filtered_notifications.length !== 1 ? "s" : ""}
            </span>

            {total_pages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPreviousPage}
                  disabled={current_page === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
                  aria-label="Previous page"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {current_page} / {total_pages}
                </span>

                <button
                  onClick={goToNextPage}
                  disabled={current_page === total_pages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
                  aria-label="Next page"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminNotificationsContent;
