import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminNotificationsContent from "@/components/admin/notifications/AdminNotificationsContent";
import { useAdminNotifications } from "@/context/AdminNotificationsContext";
import type { AdminNotification } from "@/services/admin/notifications.service";

const push_mock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: push_mock }),
}));

jest.mock("@/context/AdminNotificationsContext", () => ({
  useAdminNotifications: jest.fn(),
}));

const mocked_use_admin_notifications = useAdminNotifications as jest.Mock;

function buildNotification(overrides: Partial<AdminNotification> = {}): AdminNotification {
  return {
    id: 1,
    user_id: 10,
    type: "order",
    message: "An order notification.",
    preview_text: null,
    link: "/admin/orders/abc-123",
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

describe("AdminNotificationsContent", () => {
  const mark_as_read = jest.fn();
  const mark_all_as_read = jest.fn();
  const archive_notification = jest.fn();
  const unarchive_notification = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockNotifications(notifications: AdminNotification[]) {
    mocked_use_admin_notifications.mockReturnValue({
      notifications,
      is_loading: false,
      unread_count: notifications.filter((n) => !n.is_read && !n.is_archived).length,
      markAsRead: mark_as_read,
      markAllAsRead: mark_all_as_read,
      archiveNotification: archive_notification,
      unarchiveNotification: unarchive_notification,
    });
  }

  it("shows both 'order' and 'order_comment' notifications under the Orders filter tab", () => {
    mockNotifications([
      buildNotification({ id: 1, type: "order", message: "Order status changed." }),
      buildNotification({ id: 2, type: "order_comment", message: "A client posted a comment." }),
      buildNotification({ id: 3, type: "payment", message: "Payment received." }),
    ]);

    render(<AdminNotificationsContent />);

    fireEvent.click(screen.getByText("Orders"));

    expect(screen.getByText("Order status changed.")).toBeInTheDocument();
    expect(screen.getByText("A client posted a comment.")).toBeInTheDocument();
    expect(screen.queryByText("Payment received.")).not.toBeInTheDocument();
  });

  it("shows every notification under the All filter tab", () => {
    mockNotifications([
      buildNotification({ id: 1, type: "order", message: "Order status changed." }),
      buildNotification({ id: 2, type: "order_comment", message: "A client posted a comment." }),
      buildNotification({ id: 3, type: "payment", message: "Payment received." }),
    ]);

    render(<AdminNotificationsContent />);

    expect(screen.getByText("Order status changed.")).toBeInTheDocument();
    expect(screen.getByText("A client posted a comment.")).toBeInTheDocument();
    expect(screen.getByText("Payment received.")).toBeInTheDocument();
  });

  it("excludes order_comment notifications from the Payments filter tab", () => {
    mockNotifications([
      buildNotification({ id: 2, type: "order_comment", message: "A client posted a comment." }),
      buildNotification({ id: 3, type: "payment", message: "Payment received." }),
    ]);

    render(<AdminNotificationsContent />);

    fireEvent.click(screen.getByText("Payments"));

    expect(screen.queryByText("A client posted a comment.")).not.toBeInTheDocument();
    expect(screen.getByText("Payment received.")).toBeInTheDocument();
  });

  it("shows only ticket notifications under the Tickets filter tab", () => {
    mockNotifications([
      buildNotification({ id: 1, type: "ticket", message: "A client opened a new support ticket." }),
      buildNotification({ id: 2, type: "order", message: "Order status changed." }),
    ]);

    render(<AdminNotificationsContent />);

    fireEvent.click(screen.getByText("Tickets"));

    expect(screen.getByText("A client opened a new support ticket.")).toBeInTheDocument();
    expect(screen.queryByText("Order status changed.")).not.toBeInTheDocument();
  });

  it("marks a notification as read and navigates to its link when clicked", async () => {
    mockNotifications([
      buildNotification({ id: 2, type: "order_comment", message: "A client posted a comment.", link: "/admin/orders/abc?comment_id=5#comment-5" }),
    ]);

    render(<AdminNotificationsContent />);

    fireEvent.click(screen.getByText("A client posted a comment."));

    expect(mark_as_read).toHaveBeenCalledWith(2);
    await waitFor(() =>
      expect(push_mock).toHaveBeenCalledWith("/admin/orders/abc?comment_id=5#comment-5")
    );
  });
});
