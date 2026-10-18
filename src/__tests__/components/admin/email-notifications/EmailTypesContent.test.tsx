import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmailTypesContent from "@/components/admin/email-notifications/EmailTypesContent";
import { useAuth } from "@/context/AuthContext";
import {
  emailDeliverySettingsService,
  type EmailTypeDefinition,
  type EmailTypeSettingsResponse,
} from "@/services/admin/email-delivery-settings.service";

// ─── Module mocks ────────────────────────────────────────────────────────────

jest.mock("@/context/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/services/admin/email-delivery-settings.service", () => ({
  emailDeliverySettingsService: {
    getEmailTypes: jest.fn(),
    updateEmailTypes: jest.fn(),
    getSuppressionLogs: jest.fn(),
  },
}));

const mocked_use_auth = useAuth as jest.Mock;
const mocked_service = emailDeliverySettingsService as jest.Mocked<typeof emailDeliverySettingsService>;

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeEmailType(overrides: Partial<EmailTypeDefinition> = {}): EmailTypeDefinition {
  return {
    key: "admin_invoice_paid",
    label: "Invoice paid",
    description: "Sent to admins when a client pays an invoice.",
    audience: "admin",
    category: "purchases",
    is_mandatory: false,
    is_enabled: true,
    ...overrides,
  };
}

function makeResponse(): EmailTypeSettingsResponse {
  return {
    categories: [
      { key: "purchases", label: "Purchases and payments" },
      { key: "orders", label: "Orders and comments" },
      { key: "account", label: "Account and access" },
    ],
    email_types: [
      makeEmailType(),
      makeEmailType({
        key: "order_report",
        label: "Order report delivered",
        audience: "client",
        category: "orders",
        is_mandatory: true,
      }),
      makeEmailType({
        key: "password_reset",
        label: "Password reset",
        audience: "any",
        category: "account",
        is_mandatory: true,
      }),
    ],
  };
}

function mockRoles(...role_names: string[]) {
  mocked_use_auth.mockReturnValue({
    hasRole: (...roles: string[]) => roles.every((role) => role_names.includes(role)),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRoles("admin");
  mocked_service.getEmailTypes.mockResolvedValue(makeResponse());
  mocked_service.updateEmailTypes.mockResolvedValue({ message: "ok" });
  mocked_service.getSuppressionLogs.mockResolvedValue([]);
});

async function renderAndWaitForLoad() {
  render(<EmailTypesContent />);
  await waitFor(() => {
    expect(screen.getByRole("switch", { name: "Send Invoice paid" })).toBeInTheDocument();
  });
}

// ─── Test suite ──────────────────────────────────────────────────────────────

describe("EmailTypesContent", () => {
  it("renders email types grouped by category, with mandatory types locked", async () => {
    await renderAndWaitForLoad();

    expect(screen.getByText("Purchases and payments")).toBeInTheDocument();
    expect(screen.getByText("Order report delivered")).toBeInTheDocument();
    expect(screen.getAllByText("Always sent")).toHaveLength(2);
    expect(screen.queryByRole("switch", { name: "Send Password reset" })).not.toBeInTheDocument();
  });

  it("locks client side emails so clients always receive them", async () => {
    await renderAndWaitForLoad();

    expect(
      screen.queryByRole("switch", { name: "Send Order report delivered" })
    ).not.toBeInTheDocument();
    expect(screen.getByTitle("Client side users always receive their emails")).toBeInTheDocument();
  });

  it("only sends the email types that changed when saving", async () => {
    const user = userEvent.setup();
    await renderAndWaitForLoad();

    await user.click(screen.getByRole("switch", { name: "Send Invoice paid" }));
    await user.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(mocked_service.updateEmailTypes).toHaveBeenCalledWith({
        email_types: [{ key: "admin_invoice_paid", is_enabled: false }],
      });
    });
    expect(await screen.findByText("Email types saved successfully")).toBeInTheDocument();
  });

  it("restores the loaded state when discarding changes", async () => {
    const user = userEvent.setup();
    await renderAndWaitForLoad();

    const toggle = screen.getByRole("switch", { name: "Send Invoice paid" });
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");

    await user.click(screen.getByRole("button", { name: "Discard Changes" }));

    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("filters the list by audience", async () => {
    const user = userEvent.setup();
    await renderAndWaitForLoad();

    await user.click(screen.getByRole("button", { name: "Admin side" }));

    expect(screen.getByText("Invoice paid")).toBeInTheDocument();
    expect(screen.queryByText("Order report delivered")).not.toBeInTheDocument();
    // "any" audience types appear under every filter.
    expect(screen.getByText("Password reset")).toBeInTheDocument();
  });

  it("is read only for staff users", async () => {
    mockRoles("staff");
    await renderAndWaitForLoad();

    expect(screen.getByRole("switch", { name: "Send Invoice paid" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save Changes" })).not.toBeInTheDocument();
  });

  it("lists recently blocked emails with a readable reason", async () => {
    mocked_service.getSuppressionLogs.mockResolvedValue([
      {
        mailable_class: "App\\Mail\\AdminInvoicePaidNotification",
        email_type: "admin_invoice_paid",
        recipient_email: "kennedy@example.com",
        subject: "Payment Received",
        reason: "recipient_opted_out",
        suppressed_at: "2026-10-18T10:00:00Z",
      },
    ]);

    await renderAndWaitForLoad();

    expect(await screen.findByText("kennedy@example.com")).toBeInTheDocument();
    expect(screen.getByText("Recipient opted out of this email")).toBeInTheDocument();
  });

  it("shows an error when the email types fail to load", async () => {
    mocked_service.getEmailTypes.mockRejectedValue({ message: "Server error" });

    render(<EmailTypesContent />);

    expect(await screen.findByText("Server error")).toBeInTheDocument();
  });
});
