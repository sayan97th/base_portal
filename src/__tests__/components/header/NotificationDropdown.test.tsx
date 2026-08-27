import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NotificationDropdown from "@/components/header/NotificationDropdown";
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

function openDropdown(container: HTMLElement) {
  const toggle = container.querySelector(".dropdown-toggle");
  if (!toggle) throw new Error("dropdown toggle button not found");
  fireEvent.click(toggle);
}

describe("NotificationDropdown", () => {
  const mark_as_read = jest.fn();
  const snooze_notification = jest.fn();
  const archive_notification = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockNotifications(notifications: Notification[]) {
    mocked_use_notifications.mockReturnValue({
      notifications,
      unread_count: notifications.filter((n) => !n.is_read).length,
      markAsRead: mark_as_read,
      snoozeNotification: snooze_notification,
      archiveNotification: archive_notification,
    });
  }

  it("navigates to the notification's link and marks it as read when an unread linked notification is clicked", async () => {
    const notification = buildNotification();
    mockNotifications([notification]);

    const { container } = render(<NotificationDropdown />);
    openDropdown(container);

    fireEvent.click(screen.getByText(notification.message));

    expect(mark_as_read).toHaveBeenCalledWith(1);
    await waitFor(() =>
      expect(push_mock).toHaveBeenCalledWith("/orders/abc-123?comment_id=5#comment-5")
    );
  });

  it("navigates without marking as read again when the notification is already read", async () => {
    const notification = buildNotification({ is_read: true });
    mockNotifications([notification]);

    const { container } = render(<NotificationDropdown />);
    openDropdown(container);

    fireEvent.click(screen.getByText(notification.message));

    expect(mark_as_read).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(push_mock).toHaveBeenCalledWith("/orders/abc-123?comment_id=5#comment-5")
    );
  });

  it("does not navigate when the notification has no link", () => {
    const notification = buildNotification({ link: null });
    mockNotifications([notification]);

    const { container } = render(<NotificationDropdown />);
    openDropdown(container);

    fireEvent.click(screen.getByText(notification.message));

    expect(push_mock).not.toHaveBeenCalled();
    expect(mark_as_read).not.toHaveBeenCalled();
  });

  it("normalizes a legacy plural session link before navigating", async () => {
    const notification = buildNotification({
      link: "/orders/sessions/sess-1?comment_id=9#comment-9",
    });
    mockNotifications([notification]);

    const { container } = render(<NotificationDropdown />);
    openDropdown(container);

    fireEvent.click(screen.getByText(notification.message));

    await waitFor(() =>
      expect(push_mock).toHaveBeenCalledWith("/orders/session/sess-1?comment_id=9#comment-9")
    );
  });

  it("does not navigate when only the kebab menu's mark-as-read action is clicked", () => {
    const notification = buildNotification();
    mockNotifications([notification]);

    const { container } = render(<NotificationDropdown />);
    openDropdown(container);

    fireEvent.click(screen.getByLabelText("Notification actions"));
    fireEvent.click(screen.getByText("Mark as read"));

    expect(mark_as_read).toHaveBeenCalledWith(1);
    expect(push_mock).not.toHaveBeenCalled();
  });
});
