/**
 * Tests for the first month planner on the activate subscription form
 * (src/components/admin/seo-packages-subscriptions/FirstPaymentPlanner.tsx).
 *
 * The planner decides how the first month is handled: billed on schedule,
 * charged right away, or recorded as already paid outside the portal. It
 * also shows a short ledger of the next months and the "billed once per
 * month" guard. PaidMonthNotice is the edit mode warning for a paid month.
 */

import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import FirstPaymentPlanner, {
  PaidMonthNotice,
  type FirstPaymentChoice,
} from "@/components/admin/seo-packages-subscriptions/FirstPaymentPlanner";

const TODAY = "2026-11-22";
const SCHEDULE_FROM_TODAY = ["2026-11-22", "2026-12-22", "2027-01-22", "2027-02-22"];
const SCHEDULE_FROM_DEC = ["2026-12-01", "2027-01-01", "2027-02-01", "2027-03-01"];

type PlannerProps = React.ComponentProps<typeof FirstPaymentPlanner>;

function renderPlanner(overrides: Partial<PlannerProps> = {}) {
  const props: PlannerProps = {
    choice: "schedule",
    onChoiceChange: jest.fn(),
    schedule: SCHEDULE_FROM_TODAY,
    today: TODAY,
    monthly_price: 999,
    is_auto_renew: true,
    has_usable_card: true,
    outside_reference: "",
    onOutsideReferenceChange: jest.fn(),
    ...overrides,
  };
  render(<FirstPaymentPlanner {...props} />);
  return props;
}

function option(name: RegExp) {
  return screen.getByRole("radio", { name });
}

function ledgerItems() {
  return within(screen.getByRole("list", { name: "Upcoming months" })).getAllByRole("listitem");
}

describe("FirstPaymentPlanner", () => {
  it("names the first month and the monthly amount", () => {
    renderPlanner();

    expect(screen.getByText("How is November handled?")).toBeInTheDocument();
    expect(screen.getByText("$999 / month")).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "First payment" })).toBeInTheDocument();
  });

  it("offers the three choices with the selected one checked", () => {
    renderPlanner({ choice: "schedule" });

    expect(option(/Bill on schedule/)).toHaveAttribute("aria-checked", "true");
    expect(option(/Charge now/)).toHaveAttribute("aria-checked", "false");
    expect(option(/November already paid/)).toHaveAttribute("aria-checked", "false");
  });

  it.each<[RegExp, FirstPaymentChoice]>([
    [/Bill on schedule/, "schedule"],
    [/Charge now/, "charge_now"],
    [/November already paid/, "paid_outside"],
  ])("reports %s as %s", (name, value) => {
    const props = renderPlanner({ choice: value === "schedule" ? "paid_outside" : "schedule" });

    fireEvent.click(option(name));

    expect(props.onChoiceChange).toHaveBeenCalledWith(value);
  });

  describe("charge now", () => {
    it("collects the amount right away when the first payment is today", () => {
      renderPlanner();

      expect(option(/Charge now/)).toBeEnabled();
      expect(option(/Charge now/)).toHaveTextContent("Collect $999 right away when you activate.");
    });

    it.each([
      ["the first payment is later", { schedule: SCHEDULE_FROM_DEC }, "Only when the first payment is today"],
      ["the client has no valid card", { has_usable_card: false }, "No valid card on file"],
      ["no client is selected yet", { has_usable_card: null }, "Select a client first"],
    ])("is disabled when %s", (_case, overrides, reason) => {
      const props = renderPlanner(overrides as Partial<PlannerProps>);

      expect(option(/Charge now/)).toBeDisabled();
      expect(option(/Charge now/)).toHaveAttribute("aria-disabled", "true");
      expect(option(/Charge now/)).toHaveTextContent(reason);

      fireEvent.click(option(/Charge now/));
      expect(props.onChoiceChange).not.toHaveBeenCalled();
    });
  });

  describe("bill on schedule", () => {
    it("explains the billing run charges it later today", () => {
      renderPlanner();

      expect(option(/Bill on schedule/)).toHaveTextContent("The billing run charges the card on file later today.");
    });

    it("names the date when the first payment is later", () => {
      renderPlanner({ schedule: SCHEDULE_FROM_DEC });

      expect(option(/Bill on Dec 1/)).toHaveTextContent("The card on file is charged automatically on that day.");
      expect(screen.getByText("How is December handled?")).toBeInTheDocument();
    });

    it("says the admin charges it by hand when auto renew is off", () => {
      renderPlanner({ is_auto_renew: false });

      expect(option(/Bill on schedule/)).toHaveTextContent("You charge it from the subscription page when ready.");
    });
  });

  describe("already paid outside the portal", () => {
    it("asks for an optional payment reference and says when the first charge happens", () => {
      const props = renderPlanner({ choice: "paid_outside", outside_reference: "Check 1042" });

      const reference = screen.getByLabelText(/Payment reference/);
      expect(reference).toHaveValue("Check 1042");
      expect(reference).toHaveAttribute("maxLength", "120");
      expect(screen.getByText(/A paid invoice is added to the client's portal and the payment is listed in Transactions/)).toBeInTheDocument();
      expect(screen.getByText("Dec 22, 2026")).toBeInTheDocument();

      fireEvent.change(reference, { target: { value: "Bank transfer" } });
      expect(props.onOutsideReferenceChange).toHaveBeenCalledWith("Bank transfer");
    });

    it("hides the reference field for the other choices", () => {
      renderPlanner({ choice: "schedule" });

      expect(screen.queryByLabelText(/Payment reference/)).not.toBeInTheDocument();
    });
  });

  describe("month ledger", () => {
    it("shows the next four months with what happens on each", () => {
      renderPlanner();

      const items = ledgerItems();
      expect(items).toHaveLength(4);
      expect(items[0]).toHaveTextContent("Nov22Billing run today");
      expect(items[0]).toHaveAttribute("data-tone", "due");
      expect(items[1]).toHaveTextContent("Dec22Auto charge");
      expect(items[1]).toHaveAttribute("data-tone", "upcoming");
    });

    it("marks the first month as paid when it was paid outside", () => {
      renderPlanner({ choice: "paid_outside" });

      expect(ledgerItems()[0]).toHaveTextContent("Paid, not charged");
      expect(ledgerItems()[0]).toHaveAttribute("data-tone", "paid");
      expect(ledgerItems()[1]).toHaveTextContent("Auto charge");
    });

    it("marks the first month as charged now", () => {
      renderPlanner({ choice: "charge_now" });

      expect(ledgerItems()[0]).toHaveTextContent("Charged now");
      expect(ledgerItems()[0]).toHaveAttribute("data-tone", "now");
    });

    it("shows manual charges when auto renew is off", () => {
      renderPlanner({ is_auto_renew: false, schedule: SCHEDULE_FROM_DEC });

      expect(ledgerItems()[0]).toHaveTextContent("Charge by hand");
      expect(ledgerItems()[1]).toHaveTextContent("Charge by hand");
    });

    it("only lists the months left before the end date", () => {
      renderPlanner({ schedule: ["2026-11-22", "2026-12-22"] });

      expect(ledgerItems()).toHaveLength(2);
    });
  });

  it("always explains that a month is billed only once", () => {
    renderPlanner();

    expect(screen.getByText("Billed once per month.")).toBeInTheDocument();
    expect(screen.getByText(/renewals skip it automatically/)).toBeInTheDocument();
  });
});

describe("PaidMonthNotice", () => {
  it("warns that the month is already paid", () => {
    render(<PaidMonthNotice period_label="November 2026" />);

    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent("November 2026 is already paid.");
    expect(notice).toHaveTextContent("Pick a date in a later month so the client is not charged twice");
  });
});
