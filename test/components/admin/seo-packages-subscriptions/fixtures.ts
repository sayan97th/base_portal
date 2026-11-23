/**
 * Shared fixtures for the SEO subscription admin tests. Not a test file
 * itself (jest only runs *.test.ts[x]).
 */

import type {
  AdminClientPaymentProfile,
  AdminSeoSubscription,
  AdminSeoSubscriptionCharge,
  AdminSeoSubscriptionDetail,
  SeoSubscriptionStats,
} from "@/services/admin/seo-packages-subscription.service";

export function makeSubscription(overrides: Partial<AdminSeoSubscription> = {}): AdminSeoSubscription {
  return {
    id: 7,
    user: { id: 4, first_name: "Cathleen", last_name: "Siech", email: "cathleen@example.com", company: "Printed Image" },
    package: null,
    status: "active",
    starts_at: "2026-11-01T00:00:00+00:00",
    ends_at: null,
    cancelled_at: null,
    notes: null,
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
    reminder_days_before: 3,
    payment_status: "current",
    payment_profile_id: "card-1",
    payment_profile: { id: "card-1", card_brand: "visa", last_four: "4242", expiry_month: "12", expiry_year: "2030" },
    last_charge: null,
    charges: [],
    ...overrides,
  };
}

export function makeCharge(overrides: Partial<AdminSeoSubscriptionCharge> = {}): AdminSeoSubscriptionCharge {
  return {
    id: 1,
    period_start: "2026-11-01",
    period_end: "2026-11-30",
    period_label: "November 2026",
    amount: 2000,
    status: "succeeded",
    trigger: "automatic",
    attempt_count: 1,
    last_attempt_at: "2026-11-01T15:00:00+00:00",
    next_retry_at: null,
    paid_at: "2026-11-01T15:00:00+00:00",
    card_label: "Visa ending in 4242",
    failure_code: null,
    failure_message: null,
    payment_intent_id: "pi_1",
    charged_by: null,
    invoice: { id: "inv-1", unique_id: "ABC123", invoice_number: "BSM-1042", status: "paid", total_amount: 2000 },
    created_at: "2026-11-01T15:00:00+00:00",
    ...overrides,
  };
}

export function makeDetail(
  subscription: Partial<AdminSeoSubscription> = {},
  summary: Partial<AdminSeoSubscriptionDetail["summary"]> = {}
): AdminSeoSubscriptionDetail {
  return {
    data: makeSubscription(subscription),
    summary: {
      total_collected: 2000,
      successful_count: 1,
      failed_count: 0,
      upcoming: [
        { date: "2026-12-01", period_label: "December 2026", amount: 2000 },
        { date: "2027-01-01", period_label: "January 2027", amount: 2000 },
      ],
      card_on_file: true,
      ...summary,
    },
  };
}

export function makeCard(overrides: Partial<AdminClientPaymentProfile> = {}): AdminClientPaymentProfile {
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

export function makeStats(overrides: Partial<SeoSubscriptionStats> = {}): SeoSubscriptionStats {
  return {
    total: 5,
    active: 3,
    cancelled: 1,
    expired: 1,
    past_due: 1,
    auto_renew: 2,
    monthly_recurring: 4498,
    renewing_next_7_days: 1,
    collected_this_month: 2999,
    ...overrides,
  };
}

/** Fakes only Date, so waitFor and other timers keep running for real. */
export function freezeToday(date: Date): void {
  jest.useFakeTimers({
    now: date,
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
}
