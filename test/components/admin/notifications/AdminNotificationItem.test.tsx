import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AdminNotificationItem from "@/components/admin/notifications/AdminNotificationItem";
import type { AdminNotification, AdminNotificationType } from "@/services/admin/notifications.service";

function buildNotification(overrides: Partial<AdminNotification> = {}): AdminNotification {
  return {
    id: 1,
    user_id: 10,
    type: "system",
    message: "A test notification.",
    preview_text: null,
    link: "/admin/dashboard",
    is_read: false,
    is_archived: false,
    date: "Jan 1st '26 at 9:00 am",
    relative_time: "6 hours ago",
    created_at: "2026-01-01T09:00:00Z",
    updated_at: "2026-01-01T09:00:00Z",
    user: null,
    ...overrides,
  };
}

describe("AdminNotificationItem", () => {
  const on_mark_as_read = jest.fn();
  const on_archive = jest.fn();
  const on_unarchive = jest.fn();
  const on_navigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const type_labels: [AdminNotificationType, string][] = [
    ["order", "Order"],
    ["payment", "Payment"],
    ["system", "System"],
    ["user_registration", "New User"],
    ["order_comment", "Order Comment"],
    ["invoice", "Invoice"],
    ["post", "Post"],
    ["ticket", "Ticket"],
  ];

  it.each(type_labels)("shows the %s type badge as \"%s\"", (type, label) => {
    render(
      <AdminNotificationItem
        notification={buildNotification({ type })}
        onMarkAsRead={on_mark_as_read}
        onArchive={on_archive}
        onUnarchive={on_unarchive}
        onNavigate={on_navigate}
      />
    );

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("navigates and marks as read when an unread notification is clicked", () => {
    const notification = buildNotification({ is_read: false });
    render(
      <AdminNotificationItem
        notification={notification}
        onMarkAsRead={on_mark_as_read}
        onArchive={on_archive}
        onUnarchive={on_unarchive}
        onNavigate={on_navigate}
      />
    );

    fireEvent.click(screen.getByText(notification.message));

    expect(on_navigate).toHaveBeenCalledWith(notification);
  });

  it("does not render an unread dot for an already-read notification", () => {
    const { container } = render(
      <AdminNotificationItem
        notification={buildNotification({ is_read: true })}
        onMarkAsRead={on_mark_as_read}
        onArchive={on_archive}
        onUnarchive={on_unarchive}
        onNavigate={on_navigate}
      />
    );

    expect(container.querySelector(".bg-brand-500")).not.toBeInTheDocument();
  });

  it("shows Mark as read and Archive actions in the active view", () => {
    render(
      <AdminNotificationItem
        notification={buildNotification({ is_read: false })}
        onMarkAsRead={on_mark_as_read}
        onArchive={on_archive}
        onUnarchive={on_unarchive}
        onNavigate={on_navigate}
      />
    );

    fireEvent.click(screen.getByLabelText("Notification actions"));
    expect(screen.getByText("Mark as read")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Archive"));
    expect(on_archive).toHaveBeenCalledWith(1);
  });

  it("hides Mark as read for an already-read notification in the active view", () => {
    render(
      <AdminNotificationItem
        notification={buildNotification({ is_read: true })}
        onMarkAsRead={on_mark_as_read}
        onArchive={on_archive}
        onUnarchive={on_unarchive}
        onNavigate={on_navigate}
      />
    );

    fireEvent.click(screen.getByLabelText("Notification actions"));
    expect(screen.queryByText("Mark as read")).not.toBeInTheDocument();
  });

  it("shows only a Restore action in the archived view", () => {
    render(
      <AdminNotificationItem
        notification={buildNotification({ is_archived: true })}
        is_archived_view
        onMarkAsRead={on_mark_as_read}
        onArchive={on_archive}
        onUnarchive={on_unarchive}
        onNavigate={on_navigate}
      />
    );

    fireEvent.click(screen.getByLabelText("Notification actions"));
    expect(screen.getByText("Restore")).toBeInTheDocument();
    expect(screen.queryByText("Archive")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Restore"));
    expect(on_unarchive).toHaveBeenCalledWith(1);
  });

  it("shows the notification's recipient name and email when present", () => {
    render(
      <AdminNotificationItem
        notification={buildNotification({
          user: { id: 20, first_name: "Amanda", last_name: "Reyes", email: "amanda@example.com" },
        })}
        onMarkAsRead={on_mark_as_read}
        onArchive={on_archive}
        onUnarchive={on_unarchive}
        onNavigate={on_navigate}
      />
    );

    expect(screen.getByText("Amanda Reyes")).toBeInTheDocument();
    expect(screen.getByText("amanda@example.com")).toBeInTheDocument();
  });

  it("does not navigate when the notification has no link", () => {
    render(
      <AdminNotificationItem
        notification={buildNotification({ link: null })}
        onMarkAsRead={on_mark_as_read}
        onArchive={on_archive}
        onUnarchive={on_unarchive}
        onNavigate={on_navigate}
      />
    );

    fireEvent.click(screen.getByText("A test notification."));
    expect(on_navigate).not.toHaveBeenCalled();
  });
});
