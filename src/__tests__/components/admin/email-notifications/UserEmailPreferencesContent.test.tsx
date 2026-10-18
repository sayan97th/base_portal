import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserEmailPreferencesContent from "@/components/admin/email-notifications/UserEmailPreferencesContent";
import { useAuth } from "@/context/AuthContext";
import {
  emailDeliverySettingsService,
  type AdminUserEmailPreference,
  type UserEmailPreferencesResponse,
} from "@/services/admin/email-delivery-settings.service";

// ─── Module mocks ────────────────────────────────────────────────────────────

jest.mock("@/context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/services/admin/email-delivery-settings.service", () => ({
  emailDeliverySettingsService: {
    getUserPreferences: jest.fn(),
    updateUserPreference: jest.fn(),
  },
}));

const mocked_use_auth = useAuth as jest.Mock;
const mocked_service = emailDeliverySettingsService as jest.Mocked<typeof emailDeliverySettingsService>;

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<AdminUserEmailPreference> = {}): AdminUserEmailPreference {
  return {
    id: 1,
    first_name: "Abby",
    last_name: "Admin",
    email: "abby@example.com",
    role_display: "Admin",
    mute_all_emails: false,
    disabled_email_types: [],
    ...overrides,
  };
}

function makeResponse(users: AdminUserEmailPreference[]): UserEmailPreferencesResponse {
  return {
    categories: [
      { key: "purchases", label: "Purchases and payments" },
      { key: "account", label: "Account and access" },
    ],
    email_types: [
      {
        key: "admin_credit_purchase",
        label: "Client credit purchase",
        description: "Sent to admins when a client buys credits.",
        audience: "admin",
        category: "purchases",
        is_mandatory: false,
        is_enabled: true,
      },
      {
        key: "admin_invoice_paid",
        label: "Invoice paid",
        description: "Sent to admins when a client pays an invoice.",
        audience: "admin",
        category: "purchases",
        is_mandatory: false,
        is_enabled: false,
      },
      {
        key: "password_reset",
        label: "Password reset",
        description: "Sent when someone requests a password reset link.",
        audience: "any",
        category: "account",
        is_mandatory: true,
        is_enabled: true,
      },
    ],
    users,
  };
}

const abby = makeUser();
const kennedy = makeUser({
  id: 2,
  first_name: "Kennedy",
  last_name: "Staff",
  email: "kennedy@example.com",
  role_display: "Staff",
});

function mockAuth(user_id: number, ...role_names: string[]) {
  mocked_use_auth.mockReturnValue({
    user: { id: user_id },
    hasRole: (...roles: string[]) => roles.every((role) => role_names.includes(role)),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth(abby.id, "admin");
  mocked_service.getUserPreferences.mockResolvedValue(makeResponse([abby, kennedy]));
  mocked_service.updateUserPreference.mockImplementation(async (_user_id, payload) => ({
    message: "ok",
    preference: payload,
  }));
});

async function renderAndWaitForLoad() {
  render(<UserEmailPreferencesContent />);
  await waitFor(() => {
    expect(screen.getByRole("heading", { name: /Abby Admin/ })).toBeInTheDocument();
  });
}

// ─── Test suite ──────────────────────────────────────────────────────────────

describe("UserEmailPreferencesContent", () => {
  it("opens the signed in user's own preferences first", async () => {
    await renderAndWaitForLoad();

    expect(screen.getByRole("radio", { name: /All emails/ })).toHaveAttribute("aria-checked", "true");
  });

  it("lets an admin turn off purchase emails for another user", async () => {
    const user = userEvent.setup();
    await renderAndWaitForLoad();

    await user.click(screen.getByRole("button", { name: /Kennedy Staff/ }));
    await user.click(screen.getByRole("radio", { name: /Only selected emails/ }));
    await user.click(screen.getByRole("switch", { name: "Receive Client credit purchase" }));
    await user.click(screen.getByRole("button", { name: "Save Preferences" }));

    await waitFor(() => {
      expect(mocked_service.updateUserPreference).toHaveBeenCalledWith(kennedy.id, {
        mute_all_emails: false,
        disabled_email_types: ["admin_credit_purchase"],
      });
    });
    expect(await screen.findByText("Email preferences saved for Kennedy")).toBeInTheDocument();
    expect(screen.getByText("1 email off")).toBeInTheDocument();
  });

  it("mutes every email for a user", async () => {
    const user = userEvent.setup();
    await renderAndWaitForLoad();

    await user.click(screen.getByRole("radio", { name: /No emails/ }));
    await user.click(screen.getByRole("button", { name: "Save Preferences" }));

    await waitFor(() => {
      expect(mocked_service.updateUserPreference).toHaveBeenCalledWith(abby.id, {
        mute_all_emails: true,
        disabled_email_types: [],
      });
    });
  });

  it("toggles a whole category at once", async () => {
    const user = userEvent.setup();
    await renderAndWaitForLoad();

    await user.click(screen.getByRole("radio", { name: /Only selected emails/ }));
    await user.click(
      screen.getByRole("switch", { name: "Toggle every email in Purchases and payments" })
    );

    expect(screen.getByRole("switch", { name: "Receive Client credit purchase" })).toHaveAttribute(
      "aria-checked",
      "false"
    );
    expect(screen.getByRole("switch", { name: "Receive Invoice paid" })).toHaveAttribute(
      "aria-checked",
      "false"
    );
  });

  it("marks globally disabled and mandatory email types", async () => {
    const user = userEvent.setup();
    await renderAndWaitForLoad();

    await user.click(screen.getByRole("radio", { name: /Only selected emails/ }));

    expect(screen.getByText("Off for everyone")).toBeInTheDocument();
    expect(screen.getByText("Always sent")).toBeInTheDocument();
  });

  it("does not count a mode round trip as an unsaved change", async () => {
    const user = userEvent.setup();
    await renderAndWaitForLoad();

    await user.click(screen.getByRole("radio", { name: /Only selected emails/ }));
    await user.click(screen.getByRole("switch", { name: "Receive Client credit purchase" }));
    await user.click(screen.getByRole("radio", { name: /All emails/ }));

    expect(screen.getByRole("button", { name: "Save Preferences" })).toBeDisabled();
  });

  it("lets staff edit only their own preferences", async () => {
    mockAuth(kennedy.id, "staff");
    const user = userEvent.setup();
    render(<UserEmailPreferencesContent />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Kennedy Staff/ })).toBeInTheDocument();
    });
    expect(screen.getByRole("radio", { name: /No emails/ })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: /Abby Admin/ }));

    expect(screen.getByRole("radio", { name: /No emails/ })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save Preferences" })).not.toBeInTheDocument();
  });
});
