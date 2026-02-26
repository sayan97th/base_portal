"use client";

import React, { useState, useRef, useEffect } from "react";
import type { Notification } from "./notificationData";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onArchive: (id: string) => void;
  onSnooze: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
  onArchive,
  onSnooze,
}) => {
  const [is_menu_open, setIsMenuOpen] = useState(false);
  const menu_ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menu_ref.current &&
        !menu_ref.current.contains(event.target as Node)
      ) {
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

  function handleSnooze(e: React.MouseEvent) {
    e.stopPropagation();
    onSnooze(notification.id);
    setIsMenuOpen(false);
  }

  function handleArchive(e: React.MouseEvent) {
    e.stopPropagation();
    onArchive(notification.id);
    setIsMenuOpen(false);
  }

  return (
    <div
      className={`group flex items-start gap-3.5 px-5 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.03] ${
        !notification.is_read
          ? "bg-white dark:bg-white/[0.02]"
          : "bg-gray-50/30 dark:bg-transparent"
      }`}
    >
      {/* Bell Icon */}
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-500/10">
        <svg
          className="h-5 w-5 text-brand-500"
          viewBox="0 0 20 20"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p
          className={`text-sm leading-relaxed ${
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
          <svg
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>

        {/* Action Dropdown */}
        {is_menu_open && (
          <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-theme-lg dark:border-gray-700 dark:bg-gray-800">
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

            <button
              onClick={handleSnooze}
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
                  d="M10 2.5a7.5 7.5 0 100 15 7.5 7.5 0 000-15zM10 5.5v5l3 1.5"
                />
              </svg>
              Snooze
            </button>

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
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationItem;
