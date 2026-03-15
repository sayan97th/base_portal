"use client";

import React, { useState, useRef, useEffect } from "react";
import type { AdminNotification, AdminNotificationType } from "@/services/admin/notifications.service";

interface AdminNotificationItemProps {
  notification: AdminNotification;
  is_archived_view?: boolean;
  onMarkAsRead: (id: number) => void;
  onArchive: (id: number) => void;
  onUnarchive: (id: number) => void;
}

const TYPE_CONFIG: Record<
  AdminNotificationType,
  { icon: React.ReactNode; bg: string; icon_color: string }
> = {
  order: {
    bg: "bg-success-50 dark:bg-success-500/10",
    icon_color: "text-success-600 dark:text-success-400",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
        />
      </svg>
    ),
  },
  payment: {
    bg: "bg-brand-50 dark:bg-brand-500/10",
    icon_color: "text-brand-600 dark:text-brand-400",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
        />
      </svg>
    ),
  },
  system: {
    bg: "bg-warning-50 dark:bg-warning-500/10",
    icon_color: "text-warning-600 dark:text-warning-400",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
        />
      </svg>
    ),
  },
  user_registration: {
    bg: "bg-purple-50 dark:bg-purple-500/10",
    icon_color: "text-purple-600 dark:text-purple-400",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
      </svg>
    ),
  },
};

const TYPE_LABEL: Record<AdminNotificationType, string> = {
  order: "Order",
  payment: "Payment",
  system: "System",
  user_registration: "New User",
};

const AdminNotificationItem: React.FC<AdminNotificationItemProps> = ({
  notification,
  is_archived_view = false,
  onMarkAsRead,
  onArchive,
  onUnarchive,
}) => {
  const [is_menu_open, setIsMenuOpen] = useState(false);
  const menu_ref = useRef<HTMLDivElement>(null);

  const type_config = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.system;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menu_ref.current && !menu_ref.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleMenu(e: React.MouseEvent) {
    e.stopPropagation();
    setIsMenuOpen((prev) => !prev);
  }

  function handleMarkAsRead(e: React.MouseEvent) {
    e.stopPropagation();
    onMarkAsRead(notification.id);
    setIsMenuOpen(false);
  }

  function handleArchive(e: React.MouseEvent) {
    e.stopPropagation();
    onArchive(notification.id);
    setIsMenuOpen(false);
  }

  function handleUnarchive(e: React.MouseEvent) {
    e.stopPropagation();
    onUnarchive(notification.id);
    setIsMenuOpen(false);
  }

  const user_full_name = notification.user
    ? `${notification.user.first_name} ${notification.user.last_name}`.trim()
    : null;

  return (
    <div
      className={`group flex items-start gap-3.5 px-5 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03] ${
        !notification.is_read
          ? "bg-white dark:bg-white/[0.02]"
          : "bg-gray-50/30 dark:bg-transparent"
      }`}
    >
      {/* Type Icon */}
      <div
        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${type_config.bg}`}
      >
        <span className={type_config.icon_color}>{type_config.icon}</span>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
            {TYPE_LABEL[notification.type] ?? notification.type}
          </span>
          {!notification.is_read && (
            <span className="h-2 w-2 rounded-full bg-brand-500" />
          )}
        </div>

        <p
          className={`mt-1 text-sm leading-relaxed ${
            !notification.is_read
              ? "font-medium text-gray-800 dark:text-white/90"
              : "text-gray-600 dark:text-gray-300"
          }`}
        >
          {notification.message}
        </p>

        {notification.preview_text && (
          <p className="mt-1 text-xs leading-relaxed text-gray-400 dark:text-gray-500 line-clamp-2">
            {notification.preview_text}
          </p>
        )}

        {/* User info */}
        {notification.user && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700">
              <svg
                className="h-3 w-3 text-gray-500 dark:text-gray-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                />
              </svg>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {user_full_name}
              <span className="mx-1 text-gray-300 dark:text-gray-600">·</span>
              <span className="text-gray-400 dark:text-gray-500">{notification.user.email}</span>
            </span>
          </div>
        )}

        <span className="mt-1.5 block text-xs text-gray-400 dark:text-gray-500">
          {notification.relative_time}
        </span>
      </div>

      {/* Kebab Menu */}
      <div className="relative shrink-0" ref={menu_ref}>
        <button
          onClick={toggleMenu}
          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 opacity-0 transition-all hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          aria-label="Notification actions"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>

        {is_menu_open && (
          <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-theme-lg dark:border-gray-700 dark:bg-gray-800">
            {is_archived_view ? (
              /* ── Archived view actions ── */
              <button
                onClick={handleUnarchive}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 10h14M10 3l-7 7 7 7"
                  />
                </svg>
                Restore
              </button>
            ) : (
              /* ── Active view actions ── */
              <>
                {!notification.is_read && (
                  <button
                    onClick={handleMarkAsRead}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 10.5l3.5 3.5 7.5-7.5"
                      />
                    </svg>
                    Mark as read
                  </button>
                )}

                <button
                  onClick={handleArchive}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <svg
                    className="h-4 w-4"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 5h14M5 5v10a2 2 0 002 2h6a2 2 0 002-2V5M8 9h4"
                    />
                  </svg>
                  Archive
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminNotificationItem;
