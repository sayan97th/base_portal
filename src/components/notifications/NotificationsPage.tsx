"use client";

import React, { useState } from "react";
import NotificationItem from "./NotificationItem";
import { notification_list } from "./notificationData";
import type { Notification } from "./notificationData";

const NotificationsPage: React.FC = () => {
  const [notifications, setNotifications] =
    useState<Notification[]>(notification_list);

  const unread_count = notifications.filter((n) => !n.is_read).length;

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

  return (
    <div className="space-y-6">
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
            className="text-sm font-medium text-gray-500 underline decoration-dashed underline-offset-4 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {notifications.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
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
      </div>
    </div>
  );
};

export default NotificationsPage;
