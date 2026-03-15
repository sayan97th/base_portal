"use client";

import Link from "next/link";
import React, { useState, useRef, useEffect } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { useAdminNotifications } from "@/context/AdminNotificationsContext";
import type { AdminNotification, AdminNotificationType } from "@/services/admin/notifications.service";

const DROPDOWN_ITEMS_LIMIT = 5;

const TYPE_ICON_CONFIG: Record<
  AdminNotificationType,
  { bg: string; icon_color: string; icon: React.ReactNode }
> = {
  order: {
    bg: "bg-success-50 dark:bg-success-500/10",
    icon_color: "text-success-600 dark:text-success-400",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
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
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
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
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
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
      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
      </svg>
    ),
  },
};

function getTypeConfig(type: AdminNotificationType) {
  return TYPE_ICON_CONFIG[type] ?? TYPE_ICON_CONFIG.system;
}

function NotificationRow({
  notification,
  active_menu_id,
  menu_ref,
  onToggleMenu,
  onMarkAsRead,
  onArchive,
}: {
  notification: AdminNotification;
  active_menu_id: number | null;
  menu_ref: React.RefObject<HTMLDivElement | null>;
  onToggleMenu: (id: number, e: React.MouseEvent) => void;
  onMarkAsRead: (id: number, e: React.MouseEvent) => void;
  onArchive: (id: number, e: React.MouseEvent) => void;
}) {
  const config = getTypeConfig(notification.type);
  const user_full_name = notification.user
    ? `${notification.user.first_name} ${notification.user.last_name}`.trim()
    : null;

  return (
    <div
      className={`flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-gray-50 dark:hover:bg-white/5 ${
        !notification.is_read ? "bg-white dark:bg-white/2" : ""
      }`}
    >
      {/* Type Icon */}
      <div
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${config.bg}`}
      >
        <span className={config.icon_color}>{config.icon}</span>
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
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500 line-clamp-1">
            {notification.preview_text}
          </p>
        )}

        {user_full_name && (
          <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
            <span className="font-medium text-gray-500 dark:text-gray-400">
              {user_full_name}
            </span>
            {notification.user?.email && (
              <span className="ml-1 text-gray-400 dark:text-gray-600">
                · {notification.user.email}
              </span>
            )}
          </p>
        )}

        <span className="mt-1 block text-xs text-gray-400 dark:text-gray-500">
          {notification.relative_time}
        </span>
      </div>

      {/* Kebab Menu */}
      <div className="relative shrink-0" ref={menu_ref}>
        <button
          onClick={(e) => onToggleMenu(notification.id, e)}
          className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 opacity-0 transition-all hover:bg-gray-100 hover:text-gray-600 group-hover:opacity-100 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          aria-label="Notification actions"
        >
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </button>

        {active_menu_id === notification.id && (
          <div className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-theme-lg dark:border-gray-700 dark:bg-gray-800">
            {!notification.is_read && (
              <button
                onClick={(e) => onMarkAsRead(notification.id, e)}
                className="flex w-full items-center gap-2 px-3.5 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
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
              onClick={(e) => onArchive(notification.id, e)}
              className="flex w-full items-center gap-2 px-3.5 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
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
}

export default function AdminNotificationDropdown() {
  const [is_open, setIsOpen] = useState(false);
  const [active_menu_id, setActiveMenuId] = useState<number | null>(null);
  const menu_ref = useRef<HTMLDivElement>(null);

  const { notifications, unread_count, markAsRead, archiveNotification } =
    useAdminNotifications();

  const visible_notifications = notifications
    .filter((n) => !n.is_archived)
    .slice(0, DROPDOWN_ITEMS_LIMIT);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menu_ref.current && !menu_ref.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleDropdown() {
    setIsOpen(!is_open);
    setActiveMenuId(null);
  }

  function closeDropdown() {
    setIsOpen(false);
    setActiveMenuId(null);
  }

  function handleToggleMenu(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    setActiveMenuId((prev) => (prev === id ? null : id));
  }

  async function handleMarkAsRead(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    setActiveMenuId(null);
    await markAsRead(id);
  }

  async function handleArchive(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    setActiveMenuId(null);
    await archiveNotification(id);
  }

  return (
    <div className="relative">
      <button
        className="relative dropdown-toggle flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={toggleDropdown}
      >
        <span
          className={`absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 ${
            unread_count === 0 ? "hidden" : "flex"
          }`}
        >
          <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping" />
        </span>
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>

      <Dropdown
        isOpen={is_open}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex w-[380px] flex-col rounded-2xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[400px] lg:right-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 pt-4">
          <div className="flex items-center gap-2">
            <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
              Notifications
            </h5>
            {unread_count > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-brand-500 px-2 py-0.5 text-xs font-medium text-white">
                {unread_count}
              </span>
            )}
          </div>
          <button
            onClick={toggleDropdown}
            className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <svg
              className="fill-current"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>

        <div className="border-b border-gray-100 dark:border-gray-700" />

        {/* Notification Items */}
        <ul className="flex flex-col overflow-y-auto custom-scrollbar max-h-[420px]">
          {visible_notifications.length > 0 ? (
            visible_notifications.map((notification) => (
              <li
                key={notification.id}
                className="group relative border-b border-gray-100 dark:border-gray-800 last:border-b-0"
              >
                <NotificationRow
                  notification={notification}
                  active_menu_id={active_menu_id}
                  menu_ref={menu_ref}
                  onToggleMenu={handleToggleMenu}
                  onMarkAsRead={handleMarkAsRead}
                  onArchive={handleArchive}
                />
              </li>
            ))
          ) : (
            <li className="flex flex-col items-center justify-center py-10 text-gray-400 dark:text-gray-500">
              <svg
                className="mb-2 h-10 w-10"
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
            </li>
          )}
        </ul>

        {/* Footer */}
        <div className="border-t border-gray-100 dark:border-gray-700">
          <Link
            href="/admin/notifications"
            onClick={closeDropdown}
            className="flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium text-brand-500 transition-colors hover:text-brand-600 hover:bg-gray-50 dark:text-brand-400 dark:hover:text-brand-300 dark:hover:bg-white/5 rounded-b-2xl"
          >
            View All Notifications
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
        </div>
      </Dropdown>
    </div>
  );
}
