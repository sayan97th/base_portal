"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import NotificationItem from "./NotificationItem";
import { notification_list } from "./notificationData";
import type { Notification } from "./notificationData";

const ITEMS_PER_PAGE = 7;

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] =
    useState<Notification[]>(notification_list);
  const [current_page, setCurrentPage] = useState(1);

  const visible_notifications = useMemo(
    () => notifications.filter((n) => !n.is_archived),
    [notifications]
  );

  const unread_count = visible_notifications.filter((n) => !n.is_read).length;
  const total_pages = Math.ceil(visible_notifications.length / ITEMS_PER_PAGE);

  const paginated_notifications = useMemo(() => {
    const start_index = (current_page - 1) * ITEMS_PER_PAGE;
    return visible_notifications.slice(
      start_index,
      start_index + ITEMS_PER_PAGE
    );
  }, [visible_notifications, current_page]);

  function handleMarkAllAsRead() {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, is_read: true }))
    );
  }

  function handleMarkAsRead(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
  }

  function handleArchive(id: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_archived: true } : n))
    );
  }

  function handleSnooze(id: string) {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, is_snoozed: true, is_read: true } : n
      )
    );
  }

  function goToPreviousPage() {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  }

  function goToNextPage() {
    setCurrentPage((prev) => Math.min(prev + 1, total_pages));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
            Notifications
          </h1>
          {unread_count > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-brand-500 px-2.5 py-0.5 text-xs font-medium text-white">
              {unread_count}
            </span>
          )}
        </div>

        {unread_count > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-sm font-medium text-brand-500 transition-colors hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notification List */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {paginated_notifications.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {paginated_notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onArchive={handleArchive}
                onSnooze={handleSnooze}
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
            <p className="mt-1 text-xs">You&apos;re all caught up!</p>
          </div>
        )}

        {/* Footer with Pagination and Show All */}
        {visible_notifications.length > 0 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-gray-800">
            {/* Pagination */}
            <div className="flex items-center gap-2">
              <button
                onClick={goToPreviousPage}
                disabled={current_page === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
                aria-label="Previous page"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <button
                onClick={goToNextPage}
                disabled={current_page === total_pages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700"
                aria-label="Next page"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>

            {/* Show All Link */}
            <Link
              href="/notifications"
              className="flex items-center gap-1.5 text-sm font-medium text-brand-500 transition-colors hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300"
            >
              Show all
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
