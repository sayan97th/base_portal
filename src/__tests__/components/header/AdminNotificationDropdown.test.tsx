import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminNotificationDropdown from "@/components/header/AdminNotificationDropdown";
import { useAdminNotifications } from "@/context/AdminNotificationsContext";
import type { AdminNotification } from "@/services/admin/notifications.service";

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

jest.mock("@/context/AdminNotificationsContext", () => ({
  useAdminNotifications: jest.fn(),
}));

const mocked_use_admin_notifications = useAdminNotifications as jest.Mock;

function buildNotification(overrides: Partial<AdminNotification> = {}): AdminNotification {
  return {
    id: 1,
    user_id: 10,
    type: "order_comment",
    message: "Rachael LeBert posted a comment on an order.",
    preview_text: null,
    link: "/admin/orders/abc-123?comment_id=5#comment-5",
    is_read: false,
    is_archived: false,
    date: "Jan 1st '26 at 9:00 am",
    relative_time: "6 hours ago",
    created_at: "2026-01-01T09:00:00Z",
    updated_at: "2026-01-01T09:00:00Z",
    user: { id: 20, first_name: "Rachael", last_name: "LeBert", email: "rachael@example.com" },
    ...overrides,
  };
}

function openDropdown(container: HTMLElement) {
  const toggle = container.querySelector(".dropdown-toggle");
  if (!toggle) throw new Error("dropdown toggle button not found");
  fireEvent.click(toggle);
}

describe("AdminNotificationDropdown", () => {
  const mark_as_read = jest.fn();
  const archive_notification = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockNotifications(notifications: AdminNotification[]) {
    mocked_use_admin_notifications.mockReturnValue({
      notifications,
      unread_count: notifications.filter((n) => !n.is_read).length,
      markAsRead: mark_as_read,
      archiveNotification: archive_notification,
    });
  }

  it("navigates to an order_comment notification's deep link and marks it as read", async () => {
    const notification = buildNotification();
    mockNotifications([notification]);

    const { container } = render(<AdminNotificationDropdown />);
    openDropdown(container);

    fireEvent.click(screen.getByText(notification.message));

    expect(mark_as_read).toHaveBeenCalledWith(1);
    await waitFor(() =>
      expect(push_mock).toHaveBeenCalledWith("/admin/orders/abc-123?comment_id=5#comment-5")
    );
  });

  it("does not navigate when the notification has no link", () => {
    const notification = buildNotification({ link: null });
    mockNotifications([notification]);

    const { container } = render(<AdminNotificationDropdown />);
    openDropdown(container);

    fireEvent.click(screen.getByText(notification.message));

    expect(push_mock).not.toHaveBeenCalled();
  });

  it("normalizes a legacy plural admin session link before navigating", async () => {
    const notification = buildNotification({
      link: "/admin/orders/sessions/sess-1?comment_id=9#comment-9",
    });
    mockNotifications([notification]);

    const { container } = render(<AdminNotificationDropdown />);
    openDropdown(container);

    fireEvent.click(screen.getByText(notification.message));

    await waitFor(() =>
      expect(push_mock).toHaveBeenCalledWith("/admin/orders/session/sess-1?comment_id=9#comment-9")
    );
  });

  it("does not navigate when only the kebab menu's archive action is clicked", () => {
    const notification = buildNotification();
    mockNotifications([notification]);

    const { container } = render(<AdminNotificationDropdown />);
    openDropdown(container);

    fireEvent.click(screen.getByLabelText("Notification actions"));
    fireEvent.click(screen.getByText("Archive"));

    expect(archive_notification).toHaveBeenCalledWith(1);
    expect(push_mock).not.toHaveBeenCalled();
  });

  it("shows an empty state and does not crash when there are no notifications", () => {
    mockNotifications([]);

    const { container } = render(<AdminNotificationDropdown />);
    openDropdown(container);

    expect(screen.getByText("No notifications")).toBeInTheDocument();
  });
});
