import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import EmailNotificationSettingsContent from "@/components/admin/email-notifications/EmailNotificationSettingsContent";
import { listAdminUsers } from "@/services/admin/user.service";
import { emailNotificationSettingsService } from "@/services/admin/email-notification-settings.service";
import type { AdminUser } from "@/types/admin";

// This tab body predates the Email Interceptor feature; it is included here
// because its page-level header was removed in favor of a shared header
// owned by EmailNotificationSettingsTabs, so this guards against that
// refactor having broken the section's own render.

jest.mock("@/services/admin/user.service", () => ({
  listAdminUsers: jest.fn(),
}));

jest.mock("@/services/admin/email-notification-settings.service", () => ({
  emailNotificationSettingsService: {
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
  },
}));

const mockListAdminUsers = listAdminUsers as jest.MockedFunction<typeof listAdminUsers>;
const mockGetSettings = emailNotificationSettingsService.getSettings as jest.MockedFunction<
  typeof emailNotificationSettingsService.getSettings
>;

function makeAdminUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 1,
    first_name: "Jane",
    last_name: "Doe",
    email: "jane@agency.com",
    is_active: true,
    roles: ["admin"],
    ...overrides,
  } as AdminUser;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockListAdminUsers.mockResolvedValue({
    data: [makeAdminUser()],
    current_page: 1,
    last_page: 1,
    total: 1,
    per_page: 25,
  } as never);
  mockGetSettings.mockResolvedValue({
    notify_all_admins: true,
    enabled_user_ids: [],
    custom_emails: [],
  });
});

describe("EmailNotificationSettingsContent", () => {
  it("renders the section heading without the old page-level header", async () => {
    render(<EmailNotificationSettingsContent />);

    await waitFor(() => {
      expect(screen.getByText("Order Comment Notifications")).toBeInTheDocument();
    });

    expect(screen.queryByText("Email Notification Settings")).not.toBeInTheDocument();
  });

  it("shows the active admin recipients once loaded", async () => {
    render(<EmailNotificationSettingsContent />);

    await waitFor(() => {
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    });
  });
});
