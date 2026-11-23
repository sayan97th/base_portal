/**
 * Tests for the shared SEO subscription billing controls
 * (src/components/admin/seo-packages-subscriptions/SubscriptionBillingControls.tsx):
 * the auto renew switch, the saved card picker and the optional renewal
 * reminder email.
 */

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import {
  AutoRenewSwitch,
  DEFAULT_REMINDER_DAYS,
  PaymentCardPicker,
  ReminderControl,
} from "@/components/admin/seo-packages-subscriptions/SubscriptionBillingControls";
import type { AdminClientPaymentProfile } from "@/services/admin/seo-packages-subscription.service";

function makeCard(overrides: Partial<AdminClientPaymentProfile> = {}): AdminClientPaymentProfile {
  return {
    id: "card-1",
    card_brand: "visa",
    last_four: "4242",
    expiry_month: "12",
    expiry_year: "2030",
    cardholder_name: "Cathleen Siech",
    is_default: true,
    is_expired: false,
    ...overrides,
  };
}

describe("AutoRenewSwitch", () => {
  it("exposes its state as a switch and toggles", () => {
    const on_toggle = jest.fn();
    render(<AutoRenewSwitch is_on description="Charged every month." onToggle={on_toggle} />);

    const control = screen.getByRole("switch", { name: /auto renew every month/i });
    expect(control).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Charged every month.")).toBeInTheDocument();

    fireEvent.click(control);
    expect(on_toggle).toHaveBeenCalledTimes(1);
  });

  it("does not toggle when disabled", () => {
    const on_toggle = jest.fn();
    render(<AutoRenewSwitch is_on={false} disabled description="Off" onToggle={on_toggle} />);

    fireEvent.click(screen.getByRole("switch"));
    expect(on_toggle).not.toHaveBeenCalled();
  });
});

describe("PaymentCardPicker", () => {
  it("shows a skeleton while loading", () => {
    const { container } = render(<PaymentCardPicker cards={[]} selected_id={null} is_loading onSelect={jest.fn()} />);

    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(2);
    expect(screen.queryByText(/no card on file/i)).not.toBeInTheDocument();
  });

  it("explains what to do when the client has no card", () => {
    render(<PaymentCardPicker cards={[]} selected_id={null} is_loading={false} onSelect={jest.fn()} />);

    expect(screen.getByText(/has no card on file yet/i)).toBeInTheDocument();
  });

  it("selects a card and can go back to the default card", () => {
    const on_select = jest.fn();
    render(
      <PaymentCardPicker
        cards={[makeCard(), makeCard({ id: "card-2", last_four: "1111", is_default: false, card_brand: "mastercard" })]}
        selected_id="card-1"
        is_loading={false}
        onSelect={on_select}
      />
    );

    expect(screen.getByRole("button", { name: /Visa.*4242/ })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: /Mastercard.*1111/ }));
    expect(on_select).toHaveBeenLastCalledWith("card-2");

    fireEvent.click(screen.getByRole("button", { name: /default card/i }));
    expect(on_select).toHaveBeenLastCalledWith(null);
  });

  it("disables expired cards", () => {
    const on_select = jest.fn();
    render(
      <PaymentCardPicker
        cards={[makeCard({ is_expired: true, expiry_year: "2020" })]}
        selected_id={null}
        is_loading={false}
        allow_default_option={false}
        onSelect={on_select}
      />
    );

    const card = screen.getByRole("button", { name: /Visa.*4242.*Expired/ });
    expect(card).toBeDisabled();
    expect(screen.queryByRole("button", { name: /default card/i })).not.toBeInTheDocument();
  });
});

describe("ReminderControl", () => {
  it("is on with the chosen number of days", () => {
    render(<ReminderControl value={3} is_auto_renew onChange={jest.fn()} />);

    expect(screen.getByRole("switch", { name: "Send renewal reminder email" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("The client is emailed 3 days before each charge.")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "3 days before" })).toHaveAttribute("aria-checked", "true");
  });

  it("turns the reminder off, which means no reminder email at all", () => {
    const on_change = jest.fn();
    render(<ReminderControl value={3} is_auto_renew onChange={on_change} />);

    fireEvent.click(screen.getByRole("switch", { name: "Send renewal reminder email" }));

    expect(on_change).toHaveBeenCalledWith(null);
  });

  it("turns the reminder back on with the default of three days", () => {
    const on_change = jest.fn();
    render(<ReminderControl value={null} is_auto_renew onChange={on_change} />);

    expect(screen.getByText(/Off\. The client only gets the receipt/)).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("switch", { name: "Send renewal reminder email" }));
    expect(on_change).toHaveBeenCalledWith(DEFAULT_REMINDER_DAYS);
    expect(DEFAULT_REMINDER_DAYS).toBe(3);
  });

  it("changes how many days before the charge it is sent", () => {
    const on_change = jest.fn();
    render(<ReminderControl value={3} is_auto_renew onChange={on_change} />);

    fireEvent.click(screen.getByRole("radio", { name: "1 day before" }));
    fireEvent.click(screen.getByRole("radio", { name: "7 days before" }));

    expect(on_change).toHaveBeenNthCalledWith(1, 1);
    expect(on_change).toHaveBeenNthCalledWith(2, 7);
  });

  it("is locked and off for subscriptions billed manually", () => {
    const on_change = jest.fn();
    render(<ReminderControl value={3} is_auto_renew={false} onChange={on_change} />);

    const control = screen.getByRole("switch", { name: "Send renewal reminder email" });
    expect(control).toBeDisabled();
    expect(control).toHaveAttribute("aria-checked", "false");
    expect(screen.getByText("Only sent for subscriptions that renew automatically.")).toBeInTheDocument();
    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
  });
});
