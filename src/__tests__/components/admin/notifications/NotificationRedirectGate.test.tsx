import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import NotificationRedirectGate from "@/components/admin/notifications/NotificationRedirectGate";
import { notificationRedirectService } from "@/services/admin/notification-redirect.service";
import { impersonationService } from "@/services/admin/impersonation.service";
import { getSafeRedirectPath } from "@/lib/safe-redirect";
import type { NotificationRedirectContext } from "@/types/admin";

const push_mock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: push_mock }),
}));

jest.mock("@/services/admin/notification-redirect.service", () => ({
  notificationRedirectService: {
    getContext: jest.fn(),
    impersonate: jest.fn(),
  },
}));

jest.mock("@/services/admin/impersonation.service", () => ({
  impersonationService: {
    applyImpersonationResponse: jest.fn(),
  },
}));

const mocked_get_context = notificationRedirectService.getContext as jest.Mock;
const mocked_impersonate = notificationRedirectService.impersonate as jest.Mock;

function buildContext(overrides: Partial<NotificationRedirectContext> = {}): NotificationRedirectContext {
  return {
    notification_id: 42,
    belongs_to_client: true,
    redirect_path: "/invoices/abc-123",
    can_impersonate: true,
    target_user: {
      id: 7,
      first_name: "Jane",
      last_name: "Doe",
      email: "jane@example.com",
      is_active: true,
    },
    ...overrides,
  };
}

describe("NotificationRedirectGate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows an invalid-link message and never calls the API when notification_id is missing", () => {
    render(<NotificationRedirectGate notification_id={null} />);

    expect(screen.getByText(/missing or malformed/i)).toBeInTheDocument();
    expect(mocked_get_context).not.toHaveBeenCalled();
  });

  it("rejects a non-numeric notification_id without calling the API", () => {
    render(<NotificationRedirectGate notification_id="not-a-number" />);

    expect(screen.getByText(/missing or malformed/i)).toBeInTheDocument();
    expect(mocked_get_context).not.toHaveBeenCalled();
  });

  it("shows the client account and both actions when impersonation is allowed", async () => {
    mocked_get_context.mockResolvedValue(buildContext());

    render(<NotificationRedirectGate notification_id="42" />);

    await waitFor(() => expect(mocked_get_context).toHaveBeenCalledWith("42"));
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /impersonate & view/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /return to admin side/i })).toBeInTheDocument();
  });

  it("only shows the return-to-admin action when the caller lacks permission", async () => {
    mocked_get_context.mockResolvedValue(buildContext({ can_impersonate: false }));

    render(<NotificationRedirectGate notification_id="42" />);

    expect(await screen.findByText(/insufficient permissions/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /impersonate & view/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /return to admin side/i })).toBeInTheDocument();
  });

  it("shows a generic error and only the return action when the API rejects the notification", async () => {
    mocked_get_context.mockRejectedValue({ message: "This notification does not belong to a client account." });

    render(<NotificationRedirectGate notification_id="99" />);

    expect(
      await screen.findByText("This notification does not belong to a client account.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /return to admin side/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /impersonate & view/i })).not.toBeInTheDocument();
  });

  // jsdom does not implement real pathname navigation (only hash changes), so
  // these assert on the safe path that was *computed* rather than on
  // `window.location.href` actually changing, see getSafeRedirectPath's own
  // unit tests (safe-redirect.test.ts) for coverage of the validation itself.
  it("starts impersonation and persists the session before navigating", async () => {
    mocked_get_context.mockResolvedValue(buildContext());
    const impersonation_response = { impersonation_token: "tok", token_type: "bearer", expires_in: 3600 };
    mocked_impersonate.mockResolvedValue(impersonation_response);

    render(<NotificationRedirectGate notification_id="42" />);

    const impersonate_button = await screen.findByRole("button", { name: /impersonate & view/i });
    fireEvent.click(impersonate_button);

    await waitFor(() => expect(mocked_impersonate).toHaveBeenCalledWith(42));
    await waitFor(() =>
      expect(impersonationService.applyImpersonationResponse).toHaveBeenCalledWith(impersonation_response)
    );
  });

  it("does not trust an unsafe redirect_path even if it somehow made it past backend validation", () => {
    const context = buildContext({ redirect_path: "//evil-external-host.example" });
    expect(getSafeRedirectPath(context.redirect_path, "/")).toBe("/");
  });

  it("shows an error and re-enables the button when impersonation fails", async () => {
    mocked_get_context.mockResolvedValue(buildContext());
    mocked_impersonate.mockRejectedValue({ message: "You have insufficient permissions to use the impersonation feature." });

    render(<NotificationRedirectGate notification_id="42" />);

    const impersonate_button = await screen.findByRole("button", { name: /impersonate & view/i });
    fireEvent.click(impersonate_button);

    expect(
      await screen.findByText("You have insufficient permissions to use the impersonation feature.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /impersonate & view/i })).not.toBeDisabled();
  });

  it("navigates to the admin dashboard when returning to the admin side", async () => {
    mocked_get_context.mockResolvedValue(buildContext());

    render(<NotificationRedirectGate notification_id="42" />);

    const return_button = await screen.findByRole("button", { name: /return to admin side/i });
    fireEvent.click(return_button);

    expect(push_mock).toHaveBeenCalledWith("/admin/dashboard");
  });
});
