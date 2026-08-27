import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NotificationsPage from "@/components/notifications/NotificationsPage";
import { useNotifications } from "@/context/NotificationsContext";
import type { Notification } from "@/services/client/notifications.service";

const push_mock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: push_mock }),
}));

jest.mock("next/link", () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = "Link";
  return Link;
});

jest.mock("@/context/NotificationsContext", () => ({
  useNotifications: jest.fn(),
}));

const mocked_use_notifications = useNotifications as jest.Mock;

function buildNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 1,
    user_id: 10,
    type: "order_comment",
    message: "Rachael LeBert posted a comment on an order.",
    preview_text: null,
    link: "/orders/abc-123?comment_id=5#comment-5",
    is_read: false,
    is_archived: false,
    is_snoozed: false,
    snoozed_until: null,
    date: "Jan 1st '26 at 9:00 am",
    relative_time: "6 hours ago",
    created_at: "2026-01-01T09:00:00Z",
    updated_at: "2026-01-01T09:00:00Z",
    ...overrides,
  };
}

describe("NotificationsPage", () => {
  const mark_as_read = jest.fn();
  const mark_all_as_read = jest.fn();
  const archive_notification = jest.fn();
  const unarchive_notification = jest.fn();
  const snooze_notification = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockNotifications(notifications: Notification[]) {
    mocked_use_notifications.mockReturnValue({
      notifications,
      is_loading: false,
      unread_count: notifications.filter((n) => !n.is_read && !n.is_archived).length,
      markAsRead: mark_as_read,
      markAllAsRead: mark_all_as_read,
      archiveNotification: archive_notification,
      unarchiveNotification: unarchive_notification,
      snoozeNotification: snooze_notification,
    });
  }

  it("marks an unread notification as read and navigates to its link when clicked", async () => {
    mockNotifications([buildNotification()]);

    render(<NotificationsPage />);

    fireEvent.click(screen.getByText("Rachael LeBert posted a comment on an order."));

    expect(mark_as_read).toHaveBeenCalledWith(1);
    await waitFor(() =>
      expect(push_mock).toHaveBeenCalledWith("/orders/abc-123?comment_id=5#comment-5")
    );
  });

  it("does not re-mark an already-read notification as read, but still navigates", async () => {
    mockNotifications([buildNotification({ is_read: true })]);

    render(<NotificationsPage />);

    fireEvent.click(screen.getByText("Rachael LeBert posted a comment on an order."));

    expect(mark_as_read).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(push_mock).toHaveBeenCalledWith("/orders/abc-123?comment_id=5#comment-5")
    );
  });

  it("does not navigate for a notification without a link", () => {
    mockNotifications([buildNotification({ link: null })]);

    render(<NotificationsPage />);

    fireEvent.click(screen.getByText("Rachael LeBert posted a comment on an order."));

    expect(push_mock).not.toHaveBeenCalled();
  });
});
