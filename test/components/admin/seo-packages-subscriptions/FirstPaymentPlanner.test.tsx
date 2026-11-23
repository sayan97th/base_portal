/**
 * Tests for the first month planner on the activate subscription form
 * (src/components/admin/seo-packages-subscriptions/FirstPaymentPlanner.tsx).
 *
 * The planner decides how the first payment is handled: charged on schedule,
 * charged right away, or recorded as already paid outside the portal.
 * PaidMonthNotice is the edit mode warning for a paid month.
 */

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
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

describe("FirstPaymentPlanner", () => {
  it("names the first month and the monthly amount", () => {
    renderPlanner();

    expect(screen.getByText("First payment (November)")).toBeInTheDocument();
    expect(screen.getByText("$999")).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "First payment" })).toBeInTheDocument();
  });

  it("offers the three choices with the selected one checked", () => {
    renderPlanner({ choice: "schedule" });

    expect(option(/Charge on schedule/)).toHaveAttribute("aria-checked", "true");
    expect(option(/Charge now/)).toHaveAttribute("aria-checked", "false");
    expect(option(/November already paid/)).toHaveAttribute("aria-checked", "false");
  });

  it.each<[RegExp, FirstPaymentChoice]>([
    [/Charge on schedule/, "schedule"],
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
      expect(option(/Charge now/)).toHaveTextContent("Charge $999 to the card on file as soon as you activate");
    });

    it.each([
      ["the first payment is later", { schedule: SCHEDULE_FROM_DEC }, "Only available when the first payment is today."],
      ["the client has no valid card", { has_usable_card: false }, "No valid card on file."],
      ["no client is selected yet", { has_usable_card: null }, "Select a client first."],
    ])("is disabled when %s", (_case, overrides, reason) => {
      const props = renderPlanner(overrides as Partial<PlannerProps>);

      expect(option(/Charge now/)).toBeDisabled();
      expect(option(/Charge now/)).toHaveAttribute("aria-disabled", "true");
      expect(option(/Charge now/)).toHaveTextContent(reason);

      fireEvent.click(option(/Charge now/));
      expect(props.onChoiceChange).not.toHaveBeenCalled();
    });
  });

  describe("charge on schedule", () => {
    it("explains the billing run charges it later today", () => {
      renderPlanner();

      expect(option(/Charge on schedule/)).toHaveTextContent(
        "Charged to the card on file later today, by the automatic billing run."
      );
    });

    it("names the date when the first payment is later", () => {
      renderPlanner({ schedule: SCHEDULE_FROM_DEC });

      expect(option(/Charge on Dec 1/)).toHaveTextContent("Charged to the card on file automatically on Dec 1.");
      expect(screen.getByText("First payment (December)")).toBeInTheDocument();
    });

    it("says the admin charges it by hand when auto renew is off", () => {
      renderPlanner({ is_auto_renew: false });

      expect(option(/Charge on schedule/)).toHaveTextContent(
        "Nothing is charged automatically. You charge it from the subscription page."
      );
    });
  });

  describe("already paid outside the portal", () => {
    it("says when the first charge happens", () => {
      renderPlanner();

      expect(option(/November already paid/)).toHaveTextContent(
        "The client paid another way. Nothing is charged until Dec 22."
      );
    });

    it("asks for an optional note", () => {
      const props = renderPlanner({ choice: "paid_outside", outside_reference: "Check 1042" });

      const note = screen.getByLabelText(/Note/);
      expect(note).toHaveValue("Check 1042");
      expect(note).toHaveAttribute("maxLength", "120");
      expect(screen.getByText(/November is marked as paid on the client's invoice and in Transactions/)).toBeInTheDocument();

      fireEvent.change(note, { target: { value: "Bank transfer" } });
      expect(props.onOutsideReferenceChange).toHaveBeenCalledWith("Bank transfer");
    });

    it("hides the note field for the other choices", () => {
      renderPlanner({ choice: "schedule" });

      expect(screen.queryByLabelText(/Note/)).not.toBeInTheDocument();
    });
  });

  it("no longer shows a month ledger", () => {
    renderPlanner();

    expect(screen.queryByRole("list", { name: "Upcoming months" })).not.toBeInTheDocument();
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
