/**
 * Unit tests for the email delivery settings service.
 *
 * These verify each method targets the correct endpoint/method and forwards
 * or unwraps the response shape the backend controllers actually return.
 */

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    put: jest.fn(),
  },
}));

import { apiClient } from "@/lib/api-client";
import {
  emailDeliverySettingsService,
  type EmailSuppressionLogEntry,
  type EmailTypeSettingsResponse,
  type UserEmailPreferencesResponse,
} from "@/services/admin/email-delivery-settings.service";

const mocked = apiClient as jest.Mocked<typeof apiClient>;

const email_types_response: EmailTypeSettingsResponse = {
  categories: [{ key: "purchases", label: "Purchases and payments" }],
  email_types: [
    {
      key: "admin_invoice_paid",
      label: "Invoice paid",
      description: "Sent to admins when a client pays an invoice.",
      audience: "admin",
      category: "purchases",
      is_mandatory: false,
      is_enabled: true,
    },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("emailDeliverySettingsService.getEmailTypes", () => {
  it("requests the email type settings endpoint", async () => {
    mocked.get.mockResolvedValueOnce(email_types_response);

    const result = await emailDeliverySettingsService.getEmailTypes();

    expect(mocked.get).toHaveBeenCalledWith("/api/admin/email-type-settings");
    expect(result).toEqual(email_types_response);
  });
});

describe("emailDeliverySettingsService.updateEmailTypes", () => {
  it("PUTs the changed email types", async () => {
    mocked.put.mockResolvedValueOnce({ message: "ok" });
    const payload = { email_types: [{ key: "admin_invoice_paid", is_enabled: false }] };

    const result = await emailDeliverySettingsService.updateEmailTypes(payload);

    expect(mocked.put).toHaveBeenCalledWith("/api/admin/email-type-settings", payload);
    expect(result).toEqual({ message: "ok" });
  });

  it("propagates API errors to the caller", async () => {
    mocked.put.mockRejectedValueOnce({ message: "Forbidden" });

    await expect(
      emailDeliverySettingsService.updateEmailTypes({ email_types: [] })
    ).rejects.toEqual({ message: "Forbidden" });
  });
});

describe("emailDeliverySettingsService.getSuppressionLogs", () => {
  it("unwraps the logs array from the response", async () => {
    const logs: EmailSuppressionLogEntry[] = [
      {
        mailable_class: "App\\Mail\\AdminInvoicePaidNotification",
        email_type: "admin_invoice_paid",
        recipient_email: "kennedy@example.com",
        subject: "Payment Received",
        reason: "recipient_muted_all",
        suppressed_at: "2026-10-18T10:00:00Z",
      },
    ];
    mocked.get.mockResolvedValueOnce({ logs });

    const result = await emailDeliverySettingsService.getSuppressionLogs();

    expect(mocked.get).toHaveBeenCalledWith("/api/admin/email-type-settings/suppression-logs");
    expect(result).toEqual(logs);
  });
});

describe("emailDeliverySettingsService.getUserPreferences", () => {
  it("requests the user email preferences endpoint", async () => {
    const response: UserEmailPreferencesResponse = { ...email_types_response, users: [] };
    mocked.get.mockResolvedValueOnce(response);

    const result = await emailDeliverySettingsService.getUserPreferences();

    expect(mocked.get).toHaveBeenCalledWith("/api/admin/user-email-preferences");
    expect(result).toEqual(response);
  });
});

describe("emailDeliverySettingsService.updateUserPreference", () => {
  it("PUTs the preference to the user specific endpoint", async () => {
    const preference = { mute_all_emails: false, disabled_email_types: ["admin_credit_purchase"] };
    mocked.put.mockResolvedValueOnce({ message: "ok", preference });

    const result = await emailDeliverySettingsService.updateUserPreference(42, preference);

    expect(mocked.put).toHaveBeenCalledWith("/api/admin/user-email-preferences/42", preference);
    expect(result.preference).toEqual(preference);
  });
});
