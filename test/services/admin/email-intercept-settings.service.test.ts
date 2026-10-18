/**
 * Unit tests for the email interceptor settings service.
 *
 * These verify each method targets the correct endpoint/method and forwards
 * or unwraps the response shape the backend controller actually returns.
 */

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn(),
    put: jest.fn(),
  },
}));

import { apiClient } from "@/lib/api-client";
import {
  emailInterceptSettingsService,
  type EmailInterceptSettings,
  type EmailInterceptLogEntry,
} from "@/services/admin/email-intercept-settings.service";

const mocked = apiClient as jest.Mocked<typeof apiClient>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("emailInterceptSettingsService.getSettings", () => {
  it("requests the intercept settings endpoint", async () => {
    const settings: EmailInterceptSettings = {
      intercept_admin_emails: true,
      intercept_client_emails: false,
      recipient_emails: ["auditor@agency.com"],
    };
    mocked.get.mockResolvedValueOnce(settings);

    const result = await emailInterceptSettingsService.getSettings();

    expect(mocked.get).toHaveBeenCalledWith("/api/admin/email-intercept-settings");
    expect(result).toEqual(settings);
  });
});

describe("emailInterceptSettingsService.updateSettings", () => {
  it("PUTs the payload verbatim to the intercept settings endpoint", async () => {
    mocked.put.mockResolvedValueOnce({ message: "ok" });

    await emailInterceptSettingsService.updateSettings({
      intercept_admin_emails: true,
      intercept_client_emails: true,
      recipient_emails: ["a@agency.com", "b@agency.com"],
    });

    expect(mocked.put).toHaveBeenCalledWith("/api/admin/email-intercept-settings", {
      intercept_admin_emails: true,
      intercept_client_emails: true,
      recipient_emails: ["a@agency.com", "b@agency.com"],
    });
  });
});

describe("emailInterceptSettingsService.getRecentLogs", () => {
  it("requests the logs endpoint and unwraps the logs array", async () => {
    const logs: EmailInterceptLogEntry[] = [
      {
        mailable_class: "App\\Mail\\OrderStatusChangeMail",
        audience: "client",
        original_recipient_email: "client@example.com",
        subject: "Order Status Update",
        copied_to_emails: ["auditor@agency.com"],
        intercepted_at: "2026-08-20T10:00:00Z",
      },
    ];
    mocked.get.mockResolvedValueOnce({ logs });

    const result = await emailInterceptSettingsService.getRecentLogs();

    expect(mocked.get).toHaveBeenCalledWith("/api/admin/email-intercept-settings/logs");
    expect(result).toEqual(logs);
  });

  it("returns an empty array when the backend reports no logs", async () => {
    mocked.get.mockResolvedValueOnce({ logs: [] });

    const result = await emailInterceptSettingsService.getRecentLogs();

    expect(result).toEqual([]);
  });
});
