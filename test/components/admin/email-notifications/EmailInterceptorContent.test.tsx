import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmailInterceptorContent from "@/components/admin/email-notifications/EmailInterceptorContent";
import {
  emailInterceptSettingsService,
  type EmailInterceptSettings,
  type EmailInterceptLogEntry,
} from "@/services/admin/email-intercept-settings.service";

// ─── Module mocks ────────────────────────────────────────────────────────────

jest.mock("@/services/admin/email-intercept-settings.service", () => ({
  emailInterceptSettingsService: {
    getSettings: jest.fn(),
    updateSettings: jest.fn(),
    getRecentLogs: jest.fn(),
  },
}));

const mockGetSettings = emailInterceptSettingsService.getSettings as jest.MockedFunction<
  typeof emailInterceptSettingsService.getSettings
>;
const mockUpdateSettings = emailInterceptSettingsService.updateSettings as jest.MockedFunction<
  typeof emailInterceptSettingsService.updateSettings
>;
const mockGetRecentLogs = emailInterceptSettingsService.getRecentLogs as jest.MockedFunction<
  typeof emailInterceptSettingsService.getRecentLogs
>;

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeSettings(overrides: Partial<EmailInterceptSettings> = {}): EmailInterceptSettings {
  return {
    intercept_admin_emails: false,
    intercept_client_emails: false,
    recipient_emails: [],
    ...overrides,
  };
}

function makeLogEntry(overrides: Partial<EmailInterceptLogEntry> = {}): EmailInterceptLogEntry {
  return {
    mailable_class: "App\\Mail\\OrderStatusChangeMail",
    audience: "client",
    original_recipient_email: "client@example.com",
    subject: "Order Status Update",
    copied_to_emails: ["auditor@agency.com"],
    intercepted_at: "2026-08-20T10:00:00Z",
    ...overrides,
  };
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockGetSettings.mockResolvedValue(makeSettings());
  mockUpdateSettings.mockResolvedValue({ message: "ok" });
  mockGetRecentLogs.mockResolvedValue([]);
});

async function renderAndWaitForLoad() {
  render(<EmailInterceptorContent />);
  await waitFor(() => {
    expect(screen.getByText("Copy destination")).toBeInTheDocument();
  });
}

// ─── Test suite ──────────────────────────────────────────────────────────────

describe("EmailInterceptorContent", () => {
  describe("initial load", () => {
    it("fetches settings and recent logs on mount", async () => {
      await renderAndWaitForLoad();

      expect(mockGetSettings).toHaveBeenCalledTimes(1);
      expect(mockGetRecentLogs).toHaveBeenCalledTimes(1);
    });

    it("renders both audience toggles off by default", async () => {
      await renderAndWaitForLoad();

      const switches = screen.getAllByRole("switch");
      expect(switches).toHaveLength(2);
      switches.forEach((toggle) => expect(toggle).toHaveAttribute("aria-checked", "false"));
    });

    it("reflects settings already enabled on the backend", async () => {
      mockGetSettings.mockResolvedValue(
        makeSettings({ intercept_admin_emails: true, recipient_emails: ["auditor@agency.com"] })
      );

      await renderAndWaitForLoad();

      const switches = screen.getAllByRole("switch");
      expect(switches[0]).toHaveAttribute("aria-checked", "true");
      expect(switches[1]).toHaveAttribute("aria-checked", "false");
      expect(screen.getByText("auditor@agency.com")).toBeInTheDocument();
    });
  });

  describe("automated email catalog", () => {
    it("lists known automated emails with their audience", async () => {
      await renderAndWaitForLoad();

      expect(screen.getByText("New order comment")).toBeInTheDocument();
      expect(screen.getByText("Link building / order status update")).toBeInTheDocument();
    });

    it("filters the catalog down to admin-side emails only", async () => {
      const user = userEvent.setup();
      await renderAndWaitForLoad();

      expect(screen.getByText("Link building / order status update")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Admin side" }));

      expect(screen.getByText("New order comment")).toBeInTheDocument();
      expect(screen.queryByText("Link building / order status update")).not.toBeInTheDocument();
    });

    it("filters the catalog down to client-side emails only", async () => {
      const user = userEvent.setup();
      await renderAndWaitForLoad();

      await user.click(screen.getByRole("button", { name: "Client side" }));

      expect(screen.getByText("Link building / order status update")).toBeInTheDocument();
      expect(screen.queryByText("New order comment")).not.toBeInTheDocument();
    });
  });

  describe("recipient management", () => {
    it("adds a valid email to the copy destination list", async () => {
      const user = userEvent.setup();
      await renderAndWaitForLoad();

      await user.type(screen.getByPlaceholderText("Enter email address"), "new@agency.com");
      await user.click(screen.getByRole("button", { name: "Add" }));

      expect(screen.getByText("new@agency.com")).toBeInTheDocument();
    });

    it("rejects an invalid email address", async () => {
      const user = userEvent.setup();
      await renderAndWaitForLoad();

      await user.type(screen.getByPlaceholderText("Enter email address"), "not-an-email");
      await user.click(screen.getByRole("button", { name: "Add" }));

      expect(screen.getByText("Please enter a valid email address")).toBeInTheDocument();
    });

    it("rejects a duplicate email address", async () => {
      mockGetSettings.mockResolvedValue(makeSettings({ recipient_emails: ["dup@agency.com"] }));
      const user = userEvent.setup();
      await renderAndWaitForLoad();

      await user.type(screen.getByPlaceholderText("Enter email address"), "dup@agency.com");
      await user.click(screen.getByRole("button", { name: "Add" }));

      expect(screen.getByText("This email address has already been added")).toBeInTheDocument();
    });

    it("removes an email from the list", async () => {
      mockGetSettings.mockResolvedValue(makeSettings({ recipient_emails: ["remove-me@agency.com"] }));
      const user = userEvent.setup();
      await renderAndWaitForLoad();

      expect(screen.getByText("remove-me@agency.com")).toBeInTheDocument();

      await user.click(screen.getByLabelText("Remove remove-me@agency.com"));

      expect(screen.queryByText("remove-me@agency.com")).not.toBeInTheDocument();
    });
  });

  describe("saving", () => {
    it("blocks saving when a toggle is enabled with no recipients configured", async () => {
      const user = userEvent.setup();
      await renderAndWaitForLoad();

      const [admin_toggle] = screen.getAllByRole("switch");
      await user.click(admin_toggle);
      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      expect(
        screen.getByText("Add at least one recipient email before turning on interception")
      ).toBeInTheDocument();
      expect(mockUpdateSettings).not.toHaveBeenCalled();
    });

    it("saves the toggles and recipient list together", async () => {
      const user = userEvent.setup();
      await renderAndWaitForLoad();

      const [admin_toggle] = screen.getAllByRole("switch");
      await user.click(admin_toggle);

      await user.type(screen.getByPlaceholderText("Enter email address"), "auditor@agency.com");
      await user.click(screen.getByRole("button", { name: "Add" }));

      await user.click(screen.getByRole("button", { name: "Save Changes" }));

      await waitFor(() => {
        expect(mockUpdateSettings).toHaveBeenCalledWith({
          intercept_admin_emails: true,
          intercept_client_emails: false,
          recipient_emails: ["auditor@agency.com"],
        });
      });

      expect(await screen.findByText("Email interceptor settings saved successfully")).toBeInTheDocument();
    });

    it("discards unsaved changes back to the last loaded state", async () => {
      const user = userEvent.setup();
      await renderAndWaitForLoad();

      const discard_button = screen.getByRole("button", { name: "Discard Changes" });
      expect(discard_button).toBeDisabled();

      const [admin_toggle] = screen.getAllByRole("switch");
      await user.click(admin_toggle);
      expect(discard_button).toBeEnabled();

      await user.click(discard_button);

      expect(screen.getAllByRole("switch")[0]).toHaveAttribute("aria-checked", "false");
      expect(discard_button).toBeDisabled();
    });
  });

  describe("recent intercepted copies", () => {
    it("shows an empty state when nothing has been intercepted yet", async () => {
      await renderAndWaitForLoad();

      expect(screen.getByText("No copies have gone out yet")).toBeInTheDocument();
    });

    it("lists recent intercepted copies returned by the backend", async () => {
      mockGetRecentLogs.mockResolvedValue([makeLogEntry()]);

      await renderAndWaitForLoad();

      await waitFor(() => {
        expect(screen.getByText("client@example.com")).toBeInTheDocument();
      });

      const row = screen.getByText("client@example.com").closest("tr");
      expect(row).not.toBeNull();
      expect(within(row as HTMLElement).getByText("auditor@agency.com")).toBeInTheDocument();
    });
  });
});
