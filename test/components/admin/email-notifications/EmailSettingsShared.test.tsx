import React from "react";
import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  AlwaysSentBadge,
  EmailTypeAudienceBadge,
  StatusAlert,
  SUPPRESSION_REASON_LABELS,
  ToggleSwitch,
  formatTimestamp,
  getErrorMessage,
  useStatusAlert,
} from "@/components/admin/email-notifications/EmailSettingsShared";

describe("ToggleSwitch", () => {
  it("exposes its state as an accessible switch and reports clicks", async () => {
    const user = userEvent.setup();
    const on_change = jest.fn();

    render(<ToggleSwitch enabled={true} onChange={on_change} label="Send Invoice paid" />);

    const toggle = screen.getByRole("switch", { name: "Send Invoice paid" });
    expect(toggle).toHaveAttribute("aria-checked", "true");

    await user.click(toggle);
    expect(on_change).toHaveBeenCalledTimes(1);
  });

  it("ignores clicks while disabled", async () => {
    const user = userEvent.setup();
    const on_change = jest.fn();

    render(<ToggleSwitch enabled={false} onChange={on_change} disabled label="Locked" />);

    await user.click(screen.getByRole("switch", { name: "Locked" }));
    expect(on_change).not.toHaveBeenCalled();
  });
});

describe("useStatusAlert and StatusAlert", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("hides the alert automatically after a few seconds", () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useStatusAlert());

    act(() => result.current.showAlert("success", "Saved"));
    expect(result.current.alert).toEqual({ type: "success", message: "Saved" });

    act(() => {
      jest.advanceTimersByTime(4500);
    });
    expect(result.current.alert).toBeNull();
  });

  it("restarts the timer when a new alert replaces the previous one", () => {
    jest.useFakeTimers();
    const { result } = renderHook(() => useStatusAlert());

    act(() => result.current.showAlert("success", "First"));
    act(() => {
      jest.advanceTimersByTime(4000);
    });
    act(() => result.current.showAlert("error", "Second"));
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.alert).toEqual({ type: "error", message: "Second" });
  });

  it("renders success and error alerts with the right role and dismisses on click", async () => {
    const user = userEvent.setup();
    const on_dismiss = jest.fn();

    const { rerender } = render(
      <StatusAlert alert={{ type: "success", message: "Saved" }} onDismiss={on_dismiss} />
    );
    expect(screen.getByRole("status")).toHaveTextContent("Saved");

    rerender(<StatusAlert alert={{ type: "error", message: "Failed" }} onDismiss={on_dismiss} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Failed");

    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(on_dismiss).toHaveBeenCalledTimes(1);
  });
});

describe("badges", () => {
  it.each([
    ["admin", "Admin side"],
    ["client", "Client side"],
    ["any", "Admin and client"],
  ] as const)("labels the %s audience", (audience, label) => {
    render(<EmailTypeAudienceBadge audience={audience} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("explains why an email is always sent based on its audience", () => {
    const { rerender } = render(<AlwaysSentBadge audience="client" />);
    expect(screen.getByTitle("Client side users always receive their emails")).toBeInTheDocument();

    rerender(<AlwaysSentBadge audience="any" />);
    expect(screen.getByTitle("Account and security emails are always delivered")).toBeInTheDocument();
  });
});

describe("formatting helpers", () => {
  it("has a readable label for every suppression reason", () => {
    expect(Object.keys(SUPPRESSION_REASON_LABELS).sort()).toEqual(
      ["email_type_disabled", "recipient_muted_all", "recipient_opted_out"].sort()
    );
  });

  it("formats ISO timestamps for display", () => {
    expect(formatTimestamp("2026-10-18T10:00:00Z")).toMatch(/Oct 18, 2026/);
  });

  it("reads the message from an API error or falls back", () => {
    expect(getErrorMessage({ message: "Server error" }, "Fallback")).toBe("Server error");
    expect(getErrorMessage(null, "Fallback")).toBe("Fallback");
    expect(getErrorMessage({}, "Fallback")).toBe("Fallback");
  });
});
