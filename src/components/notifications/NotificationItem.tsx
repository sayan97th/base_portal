import React from "react";
import Link from "next/link";
import type { Notification } from "./notificationData";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
}) => {
  function handleClick() {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
  }

  return (
    <Link
      href={notification.link}
      onClick={handleClick}
      className={`flex items-center justify-between gap-4 border-b border-gray-100 px-6 py-4 transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-white/[0.03] ${
        !notification.is_read
          ? "bg-white dark:bg-white/[0.02]"
          : "bg-gray-50/50 dark:bg-transparent"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {!notification.is_read && (
          <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />
        )}
        <p
          className={`text-sm leading-relaxed ${
            !notification.is_read
              ? "font-medium text-gray-800 dark:text-white/90"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {notification.message}
        </p>
      </div>

      <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
        {notification.date}
      </span>
    </Link>
  );
};

export default NotificationItem;
