import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  MAX_REMINDER_DAYS,
  ReminderControl,
  describeNextReminder,
  isPresetReminder,
  pluralDays,
} from "@/components/admin/seo-packages-subscriptions/SubscriptionBillingControls";

describe("reminder helpers", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 10, 22, 10));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it("formats day counts", () => {
    expect(pluralDays(1)).toBe("1 day");
    expect(pluralDays(10)).toBe("10 days");
  });

  it("recognises preset values", () => {
    expect(isPresetReminder(3)).toBe(true);
    expect(isPresetReminder(10)).toBe(false);
    expect(isPresetReminder(null)).toBe(false);
  });

  it("says when the next reminder goes out", () => {
    expect(describeNextReminder("2026-12-10", 10)).toBe("Next reminder goes out on Mon, Nov 30.");
  });

  it("says the reminder goes out on the next run when the window is already open", () => {
    expect(describeNextReminder("2026-11-26", 10)).toBe(
      "Goes out with the next daily billing run, ahead of the Nov 26 charge."
    );
  });

  it("says the reminder was already sent for this charge", () => {
    expect(describeNextReminder("2026-11-26", 3, "2026-11-26")).toBe("Already sent for the Nov 26 charge.");
  });

  it("stays quiet without a future charge date", () => {
    expect(describeNextReminder(null, 3)).toBeNull();
    expect(describeNextReminder("2026-11-22", 3)).toBeNull();
  });
});

describe("ReminderControl custom days", () => {
  const renderControl = (value: number | null, on_change = jest.fn()) => {
    render(<ReminderControl value={value} is_auto_renew onChange={on_change} />);
    return on_change;
  };

  it("applies a custom number of days", () => {
    const on_change = renderControl(3);

    fireEvent.click(screen.getByRole("radio", { name: /custom/i }));
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "12" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(on_change).toHaveBeenCalledWith(12);
    expect(screen.queryByRole("group", { name: "Custom reminder days" })).not.toBeInTheDocument();
  });

  it("applies with the Enter key and steps with the buttons", () => {
    const on_change = renderControl(3);

    fireEvent.click(screen.getByRole("radio", { name: /custom/i }));
    fireEvent.click(screen.getByRole("button", { name: "One day more" }));
    fireEvent.click(screen.getByRole("button", { name: "One day more" }));
    fireEvent.keyDown(screen.getByRole("spinbutton"), { key: "Enter" });

    expect(on_change).toHaveBeenCalledWith(5);
  });

  it("blocks values above the limit", () => {
    const on_change = renderControl(3);

    fireEvent.click(screen.getByRole("radio", { name: /custom/i }));
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: String(MAX_REMINDER_DAYS + 1) } });

    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    expect(screen.getByText(`Enter a whole number between 1 and ${MAX_REMINDER_DAYS}.`)).toBeInTheDocument();
    expect(on_change).not.toHaveBeenCalled();
  });

  it("shows a saved custom value on the custom chip", () => {
    renderControl(12);

    expect(screen.getByRole("radio", { name: /custom, 12 days/i })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("The client is emailed 12 days before each charge.")).toBeInTheDocument();
  });

  it("cancels without saving", () => {
    const on_change = renderControl(3);

    fireEvent.click(screen.getByRole("radio", { name: /custom/i }));
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "9" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(on_change).not.toHaveBeenCalled();
  });
});
