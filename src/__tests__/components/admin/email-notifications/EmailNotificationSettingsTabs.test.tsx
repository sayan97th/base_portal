import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import EmailNotificationSettingsTabs from "@/components/admin/email-notifications/EmailNotificationSettingsTabs";

// The tab-switching behavior is what this component owns; the tab bodies are
// fully covered by their own test files, so they are stubbed out here to keep
// this suite focused and independent of their internal service calls.
jest.mock("@/components/admin/email-notifications/EmailNotificationSettingsContent", () => ({
  __esModule: true,
  default: () => <div data-testid="comment-notifications-panel">Comment notifications panel</div>,
}));

jest.mock("@/components/admin/email-notifications/EmailInterceptorContent", () => ({
  __esModule: true,
  default: () => <div data-testid="email-interceptor-panel">Email interceptor panel</div>,
}));

describe("EmailNotificationSettingsTabs", () => {
  it("shows the System Notifications tab as active by default", () => {
    render(<EmailNotificationSettingsTabs />);

    expect(screen.getByRole("button", { name: /System Notifications/ })).toHaveClass(
      "border-brand-500"
    );
    expect(screen.getByTestId("comment-notifications-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("email-interceptor-panel")).not.toBeInTheDocument();
  });

  it("switches to the Email Interceptor panel when its tab is clicked", async () => {
    const user = userEvent.setup();
    render(<EmailNotificationSettingsTabs />);

    await user.click(screen.getByRole("button", { name: /Email Interceptor/ }));

    expect(screen.getByTestId("email-interceptor-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("comment-notifications-panel")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Email Interceptor/ })).toHaveClass(
      "border-brand-500"
    );
  });

  it("switches back to System Notifications after visiting the interceptor tab", async () => {
    const user = userEvent.setup();
    render(<EmailNotificationSettingsTabs />);

    await user.click(screen.getByRole("button", { name: /Email Interceptor/ }));
    await user.click(screen.getByRole("button", { name: /System Notifications/ }));

    expect(screen.getByTestId("comment-notifications-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("email-interceptor-panel")).not.toBeInTheDocument();
  });
});
