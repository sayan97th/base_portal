import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
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

  it("loads a muted user in the No emails mode", async () => {
    mocked_service.getUserPreferences.mockResolvedValue(
      makeResponse([{ ...abby, mute_all_emails: true }, kennedy])
    );

    await renderAndWaitForLoad();

    expect(screen.getByRole("radio", { name: /No emails/ })).toHaveAttribute("aria-checked", "true");
    expect(
      within(screen.getByRole("button", { name: /Abby Admin/ })).getByText("Muted")
    ).toBeInTheDocument();
  });

  it("filters the user list by name or email", async () => {
    const user = userEvent.setup();
    await renderAndWaitForLoad();

    await user.type(screen.getByRole("searchbox", { name: "Search users" }), "kennedy@");

    expect(screen.getByRole("button", { name: /Kennedy Staff/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Abby Admin/ })).not.toBeInTheDocument();

    await user.clear(screen.getByRole("searchbox", { name: "Search users" }));
    await user.type(screen.getByRole("searchbox", { name: "Search users" }), "nobody");
    expect(screen.getByText("No users found")).toBeInTheDocument();
  });

  it("asks before discarding unsaved changes when switching users", async () => {
    const user = userEvent.setup();
    const confirm_spy = jest.spyOn(window, "confirm").mockReturnValue(false);
    await renderAndWaitForLoad();

    await user.click(screen.getByRole("radio", { name: /No emails/ }));
    await user.click(screen.getByRole("button", { name: /Kennedy Staff/ }));

    expect(confirm_spy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("heading", { name: /Abby Admin/ })).toBeInTheDocument();

    confirm_spy.mockReturnValue(true);
    await user.click(screen.getByRole("button", { name: /Kennedy Staff/ }));

    expect(screen.getByRole("heading", { name: /Kennedy Staff/ })).toBeInTheDocument();
    confirm_spy.mockRestore();
  });

  it("switches users without asking when nothing changed", async () => {
    const user = userEvent.setup();
    const confirm_spy = jest.spyOn(window, "confirm");
    await renderAndWaitForLoad();

    await user.click(screen.getByRole("button", { name: /Kennedy Staff/ }));

    expect(confirm_spy).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: /Kennedy Staff/ })).toBeInTheDocument();
    confirm_spy.mockRestore();
  });

  it("keeps the custom selection while muted so un-muting restores it", async () => {
    const user = userEvent.setup();
    await renderAndWaitForLoad();

    await user.click(screen.getByRole("radio", { name: /Only selected emails/ }));
    await user.click(screen.getByRole("switch", { name: "Receive Client credit purchase" }));
    await user.click(screen.getByRole("radio", { name: /No emails/ }));
    await user.click(screen.getByRole("button", { name: "Save Preferences" }));

    await waitFor(() => {
      expect(mocked_service.updateUserPreference).toHaveBeenCalledWith(abby.id, {
        mute_all_emails: true,
        disabled_email_types: ["admin_credit_purchase"],
      });
    });
  });

  it("discards unsaved changes", async () => {
    const user = userEvent.setup();
    await renderAndWaitForLoad();

    await user.click(screen.getByRole("radio", { name: /No emails/ }));
    await user.click(screen.getByRole("button", { name: "Discard Changes" }));

    expect(screen.getByRole("radio", { name: /All emails/ })).toHaveAttribute("aria-checked", "true");
  });

  it("shows the API error when saving fails", async () => {
    const user = userEvent.setup();
    mocked_service.updateUserPreference.mockRejectedValue({ message: "Forbidden" });
    await renderAndWaitForLoad();

    await user.click(screen.getByRole("radio", { name: /No emails/ }));
    await user.click(screen.getByRole("button", { name: "Save Preferences" }));

    expect(await screen.findByText("Forbidden")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Preferences" })).toBeEnabled();
  });

  it("shows an error when preferences fail to load", async () => {
    mocked_service.getUserPreferences.mockRejectedValue({ message: "Server error" });

    render(<UserEmailPreferencesContent />);

    expect(await screen.findByText("Server error")).toBeInTheDocument();
    expect(screen.getByText("Select a user to manage their email preferences")).toBeInTheDocument();
  });
});
