/**
 * Tests for the SEO subscription create and edit page
 * (src/components/admin/seo-packages-subscriptions/SubscriptionForm.tsx).
 *
 * Covers the simplified, subscription style billing schedule (first payment
 * plus advanced options), custom pricing, the optional reminder email, the
 * first month planner (bill on schedule, charge now, already paid outside the
 * portal), the paid month guard in edit mode, the live preview and the exact
 * payload sent to the API (including the browser timezone).
 *
 * Only Date is faked ("today" is Sunday, November 22, 2026) so React Testing
 * Library's waitFor keeps working with real timers.
 */

import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import SubscriptionForm from "@/components/admin/seo-packages-subscriptions/SubscriptionForm";
import type {
  AdminClientPaymentProfile,
  AdminSeoSubscription,
  AdminUserSearchResult,
} from "@/services/admin/seo-packages-subscription.service";
import type { AdminSeoPackage } from "@/types/admin/seo-packages";

const mock_push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mock_push }),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

jest.mock("@/services/admin/seo-packages-subscription.service", () => ({
  ...jest.requireActual("@/services/admin/seo-packages-subscription.service"),
  adminSeoSubscriptionService: {
    listAllClients: jest.fn(),
    listClientPaymentProfiles: jest.fn(),
    activateSubscription: jest.fn(),
    updateSubscription: jest.fn(),
  },
}));

jest.mock("@/services/admin/seo-packages.service", () => ({
  listAdminSeoPackages: jest.fn(),
}));

import { adminSeoSubscriptionService } from "@/services/admin/seo-packages-subscription.service";
import { listAdminSeoPackages } from "@/services/admin/seo-packages.service";

const BROWSER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

const service = adminSeoSubscriptionService as jest.Mocked<typeof adminSeoSubscriptionService>;
const mock_list_packages = listAdminSeoPackages as jest.MockedFunction<typeof listAdminSeoPackages>;

const CLIENT: AdminUserSearchResult = {
  id: 4,
  first_name: "Cathleen",
  last_name: "Siech",
  email: "cathleen@example.com",
  company: "Printed Image",
};

const CARD: AdminClientPaymentProfile = {
  id: "card-1",
  card_brand: "visa",
  last_four: "4242",
  expiry_month: "12",
  expiry_year: "2030",
  cardholder_name: "Cathleen Siech",
  is_default: true,
  is_expired: false,
};

const PACKAGES = [
  { id: "starter", name: "Starter", price_per_month: 999, is_active: true },
  { id: "growth", name: "Growth", price_per_month: 1499, is_active: true },
  { id: "legacy", name: "Legacy", price_per_month: 500, is_active: false },
] as AdminSeoPackage[];

function makeSubscription(overrides: Partial<AdminSeoSubscription> = {}): AdminSeoSubscription {
  return {
    id: 7,
    user: { id: 4, first_name: "Cathleen", last_name: "Siech", email: "cathleen@example.com", company: "Printed Image" },
    package: null,
    status: "active",
    starts_at: "2026-11-01T00:00:00+00:00",
    ends_at: null,
    cancelled_at: null,
    notes: "Agreed on the call",
    created_at: "2026-11-01T00:00:00+00:00",
    plan_name: "Custom SEO Package",
    pricing_type: "custom",
    monthly_price: 2000,
    invoice_item_label: "SEO Services",
    invoice_item_description: null,
    auto_renew: true,
    auto_renew_disabled_at: null,
    billing_anchor_day: 1,
    next_billing_date: "2026-12-01",
    reminder_days_before: null,
    payment_status: "current",
    payment_profile_id: "card-1",
    ...overrides,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function submitButton() {
  return screen.getByRole("button", { name: /^(Activate|Save changes)/ });
}

async function pickClient() {
  const search = await screen.findByPlaceholderText("Search by name, email or company…");
  fireEvent.focus(search);
  fireEvent.change(search, { target: { value: "printed" } });
  fireEvent.click(screen.getByRole("button", { name: /Cathleen Siech/ }));
  await waitFor(() => expect(service.listClientPaymentProfiles).toHaveBeenCalledWith(4));
  await screen.findByRole("button", { name: /Visa.*4242/ });
}

async function pickPackage(name: string) {
  const select = await screen.findByLabelText(/SEO package|Based on package/);
  const option = within(select as HTMLSelectElement).getByRole("option", { name: new RegExp(`^${name},`) });
  fireEvent.change(select, { target: { value: (option as HTMLOptionElement).value } });
}

function pickDate(field_label: RegExp, day_label: string, next_months = 0) {
  fireEvent.click(screen.getByRole("button", { name: field_label }));
  const dialog = screen.getByRole("dialog", { name: "Choose a date" });
  for (let i = 0; i < next_months; i++) {
    fireEvent.click(within(dialog).getByRole("button", { name: "Next month" }));
  }
  fireEvent.click(within(dialog).getByRole("gridcell", { name: day_label }));
}

function lastActivatePayload() {
  return service.activateSubscription.mock.calls.at(-1)?.[0];
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers({
    now: new Date(2026, 10, 22, 10, 0),
    doNotFake: [
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "setImmediate",
      "clearImmediate",
      "queueMicrotask",
      "nextTick",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "requestIdleCallback",
      "cancelIdleCallback",
      "performance",
      "hrtime",
    ],
  });
  mock_list_packages.mockResolvedValue(PACKAGES);
  service.listAllClients.mockResolvedValue([CLIENT, { id: 5, first_name: "Kevin", last_name: "Martinez", email: "kevin@example.com", company: "Acme" }]);
  service.listClientPaymentProfiles.mockResolvedValue([CARD]);
  service.activateSubscription.mockResolvedValue({ data: makeSubscription({ id: 9 }), charge_result: null });
  service.updateSubscription.mockResolvedValue({ data: makeSubscription(), summary: {} as never });
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Create ─────────────────────────────────────────────────────────────────────

describe("SubscriptionForm in create mode", () => {
  it("asks for a client first and keeps the submit button disabled", async () => {
    render(<SubscriptionForm mode="create" />);

    expect(await screen.findByRole("heading", { name: "Activate SEO Subscription" })).toBeInTheDocument();
    expect(screen.getByText("Select a client.")).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
    expect(screen.getByText("Select a client to see their cards on file.")).toBeInTheDocument();
  });

  it("only offers active packages", async () => {
    render(<SubscriptionForm mode="create" />);

    const select = await screen.findByLabelText("SEO package");
    await waitFor(() => expect(within(select).getAllByRole("option")).toHaveLength(3));
    expect(within(select).queryByRole("option", { name: /Legacy/ })).not.toBeInTheDocument();
  });

  it("searches clients by company", async () => {
    render(<SubscriptionForm mode="create" />);

    const search = await screen.findByPlaceholderText("Search by name, email or company…");
    fireEvent.focus(search);
    fireEvent.change(search, { target: { value: "acme" } });

    expect(screen.getByRole("button", { name: /Kevin Martinez/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cathleen Siech/ })).not.toBeInTheDocument();
  });

  it("activates a package priced subscription that starts today, like any subscription app", async () => {
    render(<SubscriptionForm mode="create" />);
    await pickClient();
    await pickPackage("Growth");

    // Default schedule: first payment today, monthly on that day, until cancelled.
    expect(screen.getByText(/today/, { selector: "strong" })).toBeInTheDocument();
    expect(screen.getByText("on the 22nd of every month")).toBeInTheDocument();
    expect(screen.getByText(/until cancelled\./)).toBeInTheDocument();

    fireEvent.click(submitButton());

    await waitFor(() => expect(service.activateSubscription).toHaveBeenCalledTimes(1));
    expect(lastActivatePayload()).toEqual({
      user_id: 4,
      pricing_type: "package",
      package_id: "growth",
      custom_price: null,
      custom_plan_name: null,
      invoice_item_label: "SEO Services",
      invoice_item_description: null,
      starts_at: "2026-11-22",
      first_billing_date: "2026-11-22",
      ends_at: null,
      auto_renew: true,
      payment_profile_id: "card-1",
      reminder_days_before: 3,
      charge_now: false,
      first_period_paid_outside: false,
      outside_payment_reference: null,
      timezone: BROWSER_TIMEZONE,
      notes: undefined,
    });
    expect(mock_push).toHaveBeenCalledWith("/admin/seo-packages-subscriptions/9?notice=activated");
  });

  it("sends a custom monthly amount and plan name", async () => {
    render(<SubscriptionForm mode="create" />);
    await pickClient();
    await pickPackage("Growth");

    fireEvent.click(screen.getByRole("radio", { name: /Custom price/ }));
    // Switching to custom pre-fills the listed price as a starting point.
    expect(screen.getByLabelText("Monthly amount")).toHaveValue(1499);

    fireEvent.change(screen.getByLabelText("Monthly amount"), { target: { value: "2000" } });
    fireEvent.change(screen.getByLabelText(/Plan name/), { target: { value: "Custom Growth Plus" } });

    expect(screen.getByText("$501 above the listed Growth price.")).toBeInTheDocument();
    expect(screen.getByText("Custom Growth Plus")).toBeInTheDocument();

    fireEvent.click(submitButton());
    await waitFor(() => expect(service.activateSubscription).toHaveBeenCalled());

    expect(lastActivatePayload()).toMatchObject({
      pricing_type: "custom",
      package_id: "growth",
      custom_price: 2000,
      custom_plan_name: "Custom Growth Plus",
    });
  });

  it("rejects a custom amount below the card minimum", async () => {
    render(<SubscriptionForm mode="create" />);
    await pickClient();

    fireEvent.click(screen.getByRole("radio", { name: /Custom price/ }));
    fireEvent.change(screen.getByLabelText("Monthly amount"), { target: { value: "0.2" } });

    expect(screen.getByText("Enter a monthly amount of at least $0.50.")).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
  });

  it("starts billing next month when the client already paid this one", async () => {
    render(<SubscriptionForm mode="create" />);
    await pickClient();
    await pickPackage("Starter");

    pickDate(/First payment/, "Tuesday, December 1, 2026", 1);

    expect(screen.getByText("on Dec 1")).toBeInTheDocument();
    expect(screen.getByText("on the 1st of every month")).toBeInTheDocument();
    // The preview follows the choice instead of listing fixed dates.
    const timeline = screen.getByRole("list", { name: "Billing timeline" });
    expect(within(timeline).getByText(/Tue, Dec 1/)).toBeInTheDocument();
    expect(within(timeline).getByText("Every month on the 1st", { exact: false })).toBeInTheDocument();
    expect(within(timeline).getByText("When you cancel it")).toBeInTheDocument();

    fireEvent.click(submitButton());
    await waitFor(() => expect(service.activateSubscription).toHaveBeenCalled());
    expect(lastActivatePayload()).toMatchObject({ starts_at: "2026-12-01", first_billing_date: "2026-12-01", ends_at: null });
  });

  it("keeps advanced options hidden until asked and counts what is set", async () => {
    render(<SubscriptionForm mode="create" />);
    await pickClient();
    await pickPackage("Starter");

    expect(screen.queryByText("Service start date")).not.toBeInTheDocument();

    const toggle = screen.getByRole("button", { name: /Advanced options/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    // End date two months out: Nov 22 and Dec 22 fall inside, Jan 22 does not.
    pickDate(/End date/, "Monday, January 18, 2027", 2);

    expect(screen.getByText("2 payments, then it stops by itself.")).toBeInTheDocument();
    expect(screen.getByText("After 2 payments")).toBeInTheDocument();
    expect(within(toggle).getByText("1")).toBeInTheDocument();

    fireEvent.click(submitButton());
    await waitFor(() => expect(service.activateSubscription).toHaveBeenCalled());
    expect(lastActivatePayload()).toMatchObject({ ends_at: "2027-01-18" });
  });

  it("records an earlier service start date without changing the billing day", async () => {
    render(<SubscriptionForm mode="create" />);
    await pickClient();
    await pickPackage("Starter");

    fireEvent.click(screen.getByRole("button", { name: /Advanced options/ }));
    fireEvent.click(screen.getByRole("button", { name: /Service start date/ }));
    const dialog = screen.getByRole("dialog", { name: "Choose a date" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Previous month" }));
    fireEvent.click(within(dialog).getByRole("gridcell", { name: "Sunday, October 25, 2026" }));

    fireEvent.click(submitButton());
    await waitFor(() => expect(service.activateSubscription).toHaveBeenCalled());
    expect(lastActivatePayload()).toMatchObject({ starts_at: "2026-10-25", first_billing_date: "2026-11-22" });
  });

  it("does not send a reminder when it is switched off", async () => {
    render(<SubscriptionForm mode="create" />);
    await pickClient();
    await pickPackage("Starter");

    fireEvent.click(screen.getByRole("switch", { name: "Send renewal reminder email" }));
    expect(screen.getByText("Off", { selector: "dd" })).toBeInTheDocument();

    fireEvent.click(submitButton());
    await waitFor(() => expect(service.activateSubscription).toHaveBeenCalled());
    expect(lastActivatePayload()).toMatchObject({ auto_renew: true, reminder_days_before: null });
  });

  it("switches to manual billing, which also turns the reminder off", async () => {
    render(<SubscriptionForm mode="create" />);
    await pickClient();
    await pickPackage("Starter");

    fireEvent.click(screen.getByRole("switch", { name: /Auto renew every month/ }));

    expect(screen.getByText(/Each payment is charged manually\./)).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Send renewal reminder email" })).toBeDisabled();

    fireEvent.click(submitButton());
    await waitFor(() => expect(service.activateSubscription).toHaveBeenCalled());
    expect(lastActivatePayload()).toMatchObject({ auto_renew: false, reminder_days_before: null });
  });

  it("needs a card for auto renew, or manual billing", async () => {
    service.listClientPaymentProfiles.mockResolvedValue([]);
    render(<SubscriptionForm mode="create" />);

    const search = await screen.findByPlaceholderText("Search by name, email or company…");
    fireEvent.focus(search);
    fireEvent.click(screen.getByRole("button", { name: /Cathleen Siech/ }));
    await pickPackage("Starter");

    expect(await screen.findByText("Auto renew needs a card on file. Turn it off to bill manually.")).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();

    fireEvent.click(screen.getByRole("switch", { name: /Auto renew every month/ }));
    expect(submitButton()).toBeEnabled();
  });

  it("can charge the first payment right away when it is due today", async () => {
    service.activateSubscription.mockResolvedValue({
      data: makeSubscription({ id: 9 }),
      charge_result: { success: true, message: "Charged $999.00 for November 2026." },
    });
    render(<SubscriptionForm mode="create" />);
    await pickClient();
    await pickPackage("Starter");

    fireEvent.click(screen.getByRole("radio", { name: /Charge now/ }));
    expect(screen.getByRole("radio", { name: /Charge now/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("button", { name: "Activate and charge $999" })).toBeInTheDocument();

    fireEvent.click(submitButton());
    await waitFor(() => expect(mock_push).toHaveBeenCalledWith("/admin/seo-packages-subscriptions/9?notice=activated_charged"));
    expect(lastActivatePayload()).toMatchObject({ charge_now: true, first_period_paid_outside: false });
  });

  it("only allows charging now when the first payment is today", async () => {
    render(<SubscriptionForm mode="create" />);
    await pickClient();
    await pickPackage("Starter");

    pickDate(/First payment/, "Tuesday, December 1, 2026", 1);

    const charge_now = screen.getByRole("radio", { name: /Charge now/ });
    expect(charge_now).toBeDisabled();
    expect(charge_now).toHaveTextContent("Only when the first payment is today");
    expect(screen.getByRole("radio", { name: /Bill on Dec 1/ })).toHaveAttribute("aria-checked", "true");
  });

  it("falls back to the schedule when the date moves off today after choosing charge now", async () => {
    render(<SubscriptionForm mode="create" />);
    await pickClient();
    await pickPackage("Starter");

    fireEvent.click(screen.getByRole("radio", { name: /Charge now/ }));
    pickDate(/First payment/, "Tuesday, December 1, 2026", 1);

    expect(screen.getByRole("button", { name: "Activate subscription" })).toBeInTheDocument();
    fireEvent.click(submitButton());
    await waitFor(() => expect(service.activateSubscription).toHaveBeenCalled());
    expect(lastActivatePayload()).toMatchObject({ first_billing_date: "2026-12-01", charge_now: false });
  });

  it("cannot charge now without a valid card", async () => {
    service.listClientPaymentProfiles.mockResolvedValue([{ ...CARD, is_expired: true }]);
    render(<SubscriptionForm mode="create" />);

    const search = await screen.findByPlaceholderText("Search by name, email or company…");
    fireEvent.focus(search);
    fireEvent.click(screen.getByRole("button", { name: /Cathleen Siech/ }));
    await screen.findByRole("button", { name: /Visa.*4242.*Expired/ });

    expect(screen.getByRole("radio", { name: /Charge now/ })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /Charge now/ })).toHaveTextContent("No valid card on file");
  });

  it("asks for a client before charging now", async () => {
    render(<SubscriptionForm mode="create" />);

    const charge_now = await screen.findByRole("radio", { name: /Charge now/ });
    expect(charge_now).toBeDisabled();
    expect(charge_now).toHaveTextContent("Select a client first");
  });

  it("records the first month as paid outside the portal instead of charging it", async () => {
    service.activateSubscription.mockResolvedValue({
      data: makeSubscription({ id: 9 }),
      charge_result: { success: true, message: "November 2026 was recorded as paid.", paid_outside: true },
    });
    render(<SubscriptionForm mode="create" />);
    await pickClient();
    await pickPackage("Starter");

    fireEvent.click(screen.getByRole("radio", { name: /November already paid/ }));
    fireEvent.change(screen.getByLabelText(/Payment reference/), { target: { value: "  Bank transfer 8812  " } });

    // Nothing is charged this month: the summary, ledger and preview follow.
    expect(screen.getByText("November is paid")).toBeInTheDocument();
    expect(screen.getByText("on Dec 22")).toBeInTheDocument();
    const ledger = screen.getByRole("list", { name: "Upcoming months" });
    expect(within(ledger).getByText("Paid, not charged")).toBeInTheDocument();
    const timeline = screen.getByRole("list", { name: "Billing timeline" });
    expect(within(timeline).getByText(/Already paid/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Activate, November paid" })).toBeInTheDocument();

    fireEvent.click(submitButton());

    await waitFor(() => expect(service.activateSubscription).toHaveBeenCalled());
    expect(lastActivatePayload()).toMatchObject({
      first_billing_date: "2026-11-22",
      charge_now: false,
      first_period_paid_outside: true,
      outside_payment_reference: "Bank transfer 8812",
      timezone: BROWSER_TIMEZONE,
    });
    expect(mock_push).toHaveBeenCalledWith("/admin/seo-packages-subscriptions/9?notice=activated_paid_outside");
  });

  it("does not send the payment reference when the month is billed on schedule", async () => {
    render(<SubscriptionForm mode="create" />);
    await pickClient();
    await pickPackage("Starter");

    fireEvent.click(screen.getByRole("radio", { name: /November already paid/ }));
    fireEvent.change(screen.getByLabelText(/Payment reference/), { target: { value: "Check 1042" } });
    fireEvent.click(screen.getByRole("radio", { name: /Bill on schedule/ }));

    expect(screen.queryByLabelText(/Payment reference/)).not.toBeInTheDocument();
    fireEvent.click(submitButton());
    await waitFor(() => expect(service.activateSubscription).toHaveBeenCalled());
    expect(lastActivatePayload()).toMatchObject({ first_period_paid_outside: false, outside_payment_reference: null });
  });

  it("falls back to the plain notice if recording the outside payment fails", async () => {
    service.activateSubscription.mockResolvedValue({
      data: makeSubscription({ id: 9 }),
      charge_result: { success: false, message: "A charge for this subscription is already in progress.", paid_outside: true },
    });
    render(<SubscriptionForm mode="create" />);
    await pickClient();
    await pickPackage("Starter");

    fireEvent.click(screen.getByRole("radio", { name: /November already paid/ }));
    fireEvent.click(submitButton());

    await waitFor(() => expect(mock_push).toHaveBeenCalledWith("/admin/seo-packages-subscriptions/9?notice=activated"));
  });

  it("allows today as the first payment date", async () => {
    render(<SubscriptionForm mode="create" />);
    await pickClient();
    await pickPackage("Starter");

    expect(screen.queryByText(/cannot be in the past/)).not.toBeInTheDocument();
    expect(submitButton()).toBeEnabled();
  });

  it("still opens the subscription when the first charge is declined", async () => {
    service.activateSubscription.mockResolvedValue({
      data: makeSubscription({ id: 9 }),
      charge_result: { success: false, message: "The card was declined." },
    });
    render(<SubscriptionForm mode="create" />);
    await pickClient();
    await pickPackage("Starter");
    fireEvent.click(screen.getByRole("radio", { name: /Charge now/ }));

    fireEvent.click(submitButton());

    await waitFor(() => expect(mock_push).toHaveBeenCalledWith("/admin/seo-packages-subscriptions/9?notice=activated_charge_failed"));
  });

  it("shows the API validation message and lets the admin try again", async () => {
    service.activateSubscription.mockRejectedValue({
      message: "The given data was invalid.",
      errors: { payment_profile_id: ["The selected card does not belong to this client."] },
    });
    render(<SubscriptionForm mode="create" />);
    await pickClient();
    await pickPackage("Starter");

    fireEvent.click(submitButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("The selected card does not belong to this client.");
    expect(submitButton()).toBeEnabled();
    expect(mock_push).not.toHaveBeenCalled();
  });

  it("previews the invoice line the client will see", async () => {
    render(<SubscriptionForm mode="create" />);
    await pickClient();
    await pickPackage("Starter");

    fireEvent.change(screen.getByLabelText("Invoice item name"), { target: { value: "SEO Retainer" } });

    expect(screen.getByText("November - SEO Retainer · $999.00")).toBeInTheDocument();
  });
});

// ── Edit ───────────────────────────────────────────────────────────────────────

describe("SubscriptionForm in edit mode", () => {
  it("shows the fixed client and the current settings", async () => {
    render(<SubscriptionForm mode="edit" subscription={makeSubscription()} />);

    expect(screen.getByRole("heading", { name: "Edit SEO Subscription" })).toBeInTheDocument();
    expect(screen.getByText("Printed Image")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Change" })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Search by name, email or company…")).not.toBeInTheDocument();
    expect(service.listAllClients).not.toHaveBeenCalled();

    expect(screen.getByLabelText("Monthly amount")).toHaveValue(2000);
    expect(screen.getByRole("button", { name: /Next payment/ })).toHaveTextContent("Tue, Dec 1, 2026");
    // The reminder was off for this client and stays off.
    expect(screen.getByRole("switch", { name: "Send renewal reminder email" })).toHaveAttribute("aria-checked", "false");
    await waitFor(() => expect(service.listClientPaymentProfiles).toHaveBeenCalledWith(4));
  });

  it("saves without moving the billing date when it was not changed", async () => {
    render(<SubscriptionForm mode="edit" subscription={makeSubscription()} />);
    await screen.findByRole("button", { name: /Visa.*4242/ });

    fireEvent.change(screen.getByLabelText("Monthly amount"), { target: { value: "2250" } });
    fireEvent.change(screen.getByPlaceholderText(/Custom rate agreed/), { target: { value: "" } });
    fireEvent.click(submitButton());

    await waitFor(() => expect(service.updateSubscription).toHaveBeenCalledTimes(1));
    const [id, payload] = service.updateSubscription.mock.calls[0];
    expect(id).toBe(7);
    expect(payload).toMatchObject({
      pricing_type: "custom",
      custom_price: 2250,
      auto_renew: true,
      payment_profile_id: "card-1",
      reminder_days_before: null,
      ends_at: null,
      notes: null,
    });
    expect(payload).not.toHaveProperty("next_billing_date");
    expect(mock_push).toHaveBeenCalledWith("/admin/seo-packages-subscriptions/7?notice=updated");
  });

  it("sends the new billing date when it is moved", async () => {
    render(<SubscriptionForm mode="edit" subscription={makeSubscription()} />);
    await screen.findByRole("button", { name: /Visa.*4242/ });

    // The calendar opens on the month of the current value (December).
    pickDate(/Next payment/, "Tuesday, December 15, 2026");
    fireEvent.click(submitButton());

    await waitFor(() => expect(service.updateSubscription).toHaveBeenCalled());
    expect(service.updateSubscription.mock.calls[0][1]).toMatchObject({
      next_billing_date: "2026-12-15",
      timezone: BROWSER_TIMEZONE,
    });
  });

  it("does not show the first month planner", async () => {
    render(<SubscriptionForm mode="edit" subscription={makeSubscription()} />);
    await screen.findByRole("button", { name: /Visa.*4242/ });

    expect(screen.queryByRole("radiogroup", { name: "First payment" })).not.toBeInTheDocument();
  });

  it("blocks moving the next payment into a month that is already paid", async () => {
    const paid_november = {
      id: 1,
      period_start: "2026-11-01",
      period_end: "2026-11-30",
      period_label: "November 2026",
      amount: 2000,
      status: "succeeded" as const,
      trigger: "automatic" as const,
      attempt_count: 1,
      last_attempt_at: null,
      next_retry_at: null,
      paid_at: "2026-11-01T15:00:00+00:00",
      card_label: null,
      failure_code: null,
      failure_message: null,
      payment_intent_id: null,
      created_at: "2026-11-01T15:00:00+00:00",
    };
    render(<SubscriptionForm mode="edit" subscription={makeSubscription({ charges: [paid_november] })} />);
    await screen.findByRole("button", { name: /Visa.*4242/ });

    // From Dec 1 back to Nov 28: November was already paid.
    fireEvent.click(screen.getByRole("button", { name: /Next payment/ }));
    const dialog = screen.getByRole("dialog", { name: "Choose a date" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Previous month" }));
    fireEvent.click(within(dialog).getByRole("gridcell", { name: "Saturday, November 28, 2026" }));

    expect(screen.getByRole("status")).toHaveTextContent("November 2026 is already paid.");
    expect(screen.getByText("November 2026 is already paid. Pick a date in a later month.")).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();

    // A later month is fine again.
    pickDate(/Next payment/, "Saturday, December 5, 2026");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(submitButton()).toBeEnabled();
  });

  it("opens the advanced options when the subscription has an end date", async () => {
    render(<SubscriptionForm mode="edit" subscription={makeSubscription({ ends_at: "2027-05-31T00:00:00+00:00" })} />);

    expect(screen.getByRole("button", { name: /Advanced options/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /End date/ })).toHaveTextContent("Mon, May 31, 2027");
    expect(screen.getByText("Service started")).toBeInTheDocument();
    await screen.findByRole("button", { name: /Visa.*4242/ });
  });

  it("shows the save error from the API", async () => {
    service.updateSubscription.mockRejectedValue({ message: "Only active subscriptions can be edited." });
    render(<SubscriptionForm mode="edit" subscription={makeSubscription()} />);
    await screen.findByRole("button", { name: /Visa.*4242/ });

    fireEvent.click(submitButton());

    expect(await screen.findByRole("alert")).toHaveTextContent("Only active subscriptions can be edited.");
  });
});
