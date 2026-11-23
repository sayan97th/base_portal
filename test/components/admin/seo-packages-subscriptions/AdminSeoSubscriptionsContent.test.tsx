/**
 * Tests for the SEO subscriptions list page
 * (src/components/admin/seo-packages-subscriptions/AdminSeoSubscriptionsContent.tsx).
 */

import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import AdminSeoSubscriptionsContent from "@/components/admin/seo-packages-subscriptions/AdminSeoSubscriptionsContent";
import { freezeToday, makeCharge, makeStats, makeSubscription } from "./fixtures";

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
    fetchSubscriptions: jest.fn(),
    fetchStats: jest.fn(),
  },
}));

import { adminSeoSubscriptionService } from "@/services/admin/seo-packages-subscription.service";

const service = adminSeoSubscriptionService as jest.Mocked<typeof adminSeoSubscriptionService>;

const SUBSCRIPTIONS = [
  makeSubscription({ last_charge: makeCharge() }),
  makeSubscription({
    id: 8,
    user: { id: 5, first_name: "Kevin", last_name: "Martinez", email: "kevin@example.com", company: "Acme" },
    plan_name: "Growth",
    pricing_type: "package",
    monthly_price: 1499,
    package: { id: "growth", name: "Growth", slug: "growth", price_per_month: 1499 },
    payment_status: "past_due",
    last_charge: makeCharge({ status: "failed", next_retry_at: "2026-12-04T15:00:00+00:00", period_label: "December 2026" }),
  }),
  makeSubscription({
    id: 9,
    user: { id: 6, first_name: "Ana", last_name: "Lopez", email: "ana@example.com", company: null },
    status: "cancelled",
    auto_renew: false,
  }),
];

function listResponse(data = SUBSCRIPTIONS, overrides = {}) {
  return { data, total: data.length, last_page: 1, current_page: 1, per_page: 20, ...overrides };
}

function rowOf(text: string) {
  return screen.getByText(text).closest("tr") as HTMLElement;
}

beforeEach(() => {
  jest.clearAllMocks();
  freezeToday(new Date(2026, 10, 22, 10, 0));
  service.fetchSubscriptions.mockResolvedValue(listResponse());
  service.fetchStats.mockResolvedValue(makeStats());
});

afterEach(() => {
  jest.useRealTimers();
});

describe("AdminSeoSubscriptionsContent", () => {
  it("shows the recurring revenue and billing health", async () => {
    render(<AdminSeoSubscriptionsContent />);

    expect(await screen.findByText("Monthly recurring")).toBeInTheDocument();
    expect(screen.getByText("$4,498")).toBeInTheDocument();
    expect(screen.getByText("3 active subscriptions")).toBeInTheDocument();
    expect(screen.getByText("$2,999")).toBeInTheDocument();
    expect(screen.getByText("Need attention")).toBeInTheDocument();
    expect(screen.getByText("1 renewing in 7 days")).toBeInTheDocument();
  });

  it("links the main action to the create page", async () => {
    render(<AdminSeoSubscriptionsContent />);

    expect(await screen.findByRole("link", { name: /Activate Subscription/ })).toHaveAttribute(
      "href",
      "/admin/seo-packages-subscriptions/create"
    );
  });

  it("lists plan, price, billing state and last payment for each client", async () => {
    render(<AdminSeoSubscriptionsContent />);
    await screen.findByText("Cathleen Siech");

    const custom_row = rowOf("Cathleen Siech");
    expect(within(custom_row).getByText("Printed Image")).toBeInTheDocument();
    expect(within(custom_row).getByText("Custom")).toBeInTheDocument();
    expect(within(custom_row).getByText("$2,000/mo")).toBeInTheDocument();
    expect(within(custom_row).getByText("Dec 1, 2026")).toBeInTheDocument();
    expect(within(custom_row).getByText("Auto renew")).toBeInTheDocument();
    expect(within(custom_row).getByText("Paid · $2,000.00")).toBeInTheDocument();

    const past_due_row = rowOf("Kevin Martinez");
    expect(within(past_due_row).getByText("Past due")).toBeInTheDocument();
    expect(within(past_due_row).getByText("Retry Dec 4")).toBeInTheDocument();
    expect(within(past_due_row).getByText("Failed · $2,000.00")).toBeInTheDocument();
    expect(within(past_due_row).queryByText("Custom")).not.toBeInTheDocument();

    const cancelled_row = rowOf("Ana Lopez");
    expect(within(cancelled_row).getByText("No upcoming charges")).toBeInTheDocument();
    expect(within(cancelled_row).getByText("Cancelled")).toBeInTheDocument();
  });

  it("offers Edit only on active subscriptions", async () => {
    render(<AdminSeoSubscriptionsContent />);
    await screen.findByText("Cathleen Siech");

    expect(screen.getByRole("link", { name: "Edit subscription for Cathleen Siech" })).toHaveAttribute(
      "href",
      "/admin/seo-packages-subscriptions/7/edit"
    );
    expect(screen.queryByRole("link", { name: "Edit subscription for Ana Lopez" })).not.toBeInTheDocument();
    expect(within(rowOf("Ana Lopez")).getByRole("link", { name: /Manage/ })).toHaveAttribute(
      "href",
      "/admin/seo-packages-subscriptions/9"
    );
  });

  it("opens a subscription when its row is clicked", async () => {
    render(<AdminSeoSubscriptionsContent />);
    await screen.findByText("Cathleen Siech");

    fireEvent.click(rowOf("Cathleen Siech"));

    expect(mock_push).toHaveBeenCalledWith("/admin/seo-packages-subscriptions/7");
  });

  it("filters past due payments and can clear the filters", async () => {
    render(<AdminSeoSubscriptionsContent />);
    await screen.findByText("Cathleen Siech");

    fireEvent.change(screen.getByDisplayValue("All Payments"), { target: { value: "past_due" } });

    await waitFor(() =>
      expect(service.fetchSubscriptions).toHaveBeenLastCalledWith(expect.objectContaining({ payment_status: "past_due", page: 1 }))
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    await waitFor(() =>
      expect(service.fetchSubscriptions).toHaveBeenLastCalledWith(expect.objectContaining({ payment_status: undefined }))
    );
  });

  it("searches after the user stops typing", async () => {
    render(<AdminSeoSubscriptionsContent />);
    await screen.findByText("Cathleen Siech");
    const calls_before = service.fetchSubscriptions.mock.calls.length;

    fireEvent.change(screen.getByPlaceholderText("Search by client, company, email, or plan…"), { target: { value: "Printed" } });

    await waitFor(
      () => expect(service.fetchSubscriptions).toHaveBeenLastCalledWith(expect.objectContaining({ search: "Printed" })),
      { timeout: 2000 }
    );
    expect(service.fetchSubscriptions.mock.calls.length).toBe(calls_before + 1);
  });

  it("sorts by next charge, soonest first", async () => {
    render(<AdminSeoSubscriptionsContent />);
    await screen.findByText("Cathleen Siech");

    fireEvent.click(screen.getByRole("button", { name: /Next charge/ }));

    await waitFor(() =>
      expect(service.fetchSubscriptions).toHaveBeenLastCalledWith(
        expect.objectContaining({ sort_field: "next_billing_date", sort_direction: "asc" })
      )
    );
  });

  it("shows an empty state that leads to the create page", async () => {
    service.fetchSubscriptions.mockResolvedValue(listResponse([]));
    render(<AdminSeoSubscriptionsContent />);

    expect(await screen.findByText("No subscriptions yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Activate the first subscription" })).toHaveAttribute(
      "href",
      "/admin/seo-packages-subscriptions/create"
    );
  });

  it("shows an error when the list cannot be loaded", async () => {
    service.fetchSubscriptions.mockRejectedValue(new Error("Network"));
    render(<AdminSeoSubscriptionsContent />);

    expect(await screen.findByText("Failed to load subscriptions. Please try again.")).toBeInTheDocument();
  });

  it("paginates", async () => {
    service.fetchSubscriptions.mockResolvedValue(listResponse(SUBSCRIPTIONS, { total: 45, last_page: 3 }));
    render(<AdminSeoSubscriptionsContent />);

    expect(await screen.findByText("Page 1 of 3 · 45 subscriptions")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(service.fetchSubscriptions).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
  });
});
