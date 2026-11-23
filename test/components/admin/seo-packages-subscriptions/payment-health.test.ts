/**
 * Tests for the payment health copy and helpers
 * (src/components/admin/seo-packages-subscriptions/payment-health.ts).
 */

import {
  ATTENTION_STATES,
  HEALTH_STATE_LABELS,
  cardIssueLabel,
  describeHealth,
  needsAttention,
  pluralAttempts,
  pluralDaysShort,
  pluralPeriods,
} from "@/components/admin/seo-packages-subscriptions/payment-health";
import type { SeoSubscriptionHealthState } from "@/services/admin/seo-packages-subscription.service";
import { makeHealth, makeSubscription } from "./fixtures";

const FAILURE = {
  charge_id: 1,
  period_label: "December 2026",
  period_start: "2026-12-01",
  amount: 2000,
  code: "insufficient_funds",
  message: "Your card has insufficient funds.",
  client_reason: "Your bank declined the payment due to insufficient funds.",
  attempt_count: 2,
  max_attempts: 4,
  last_attempt_at: "2026-12-04T15:00:00Z",
  next_retry_at: "2026-12-09T15:00:00Z",
  is_retryable: true,
  card_label: "Visa ending in 4242",
};

describe("needsAttention", () => {
  it.each<[SeoSubscriptionHealthState, boolean]>([
    ["healthy", false],
    ["inactive", false],
    ["no_payment_method", true],
    ["retrying", true],
    ["payment_pending", true],
    ["payment_failed", true],
  ])("%s needs attention: %s", (state, expected) => {
    expect(needsAttention(makeHealth({ state }))).toBe(expected);
  });

  it("is false without a health payload", () => {
    expect(needsAttention(undefined)).toBe(false);
    expect(needsAttention(null)).toBe(false);
  });

  it("lists exactly the four attention states", () => {
    expect([...ATTENTION_STATES].sort()).toEqual(["no_payment_method", "payment_failed", "payment_pending", "retrying"]);
  });

  it("has a label for every state", () => {
    const states: SeoSubscriptionHealthState[] = [
      "healthy",
      "no_payment_method",
      "retrying",
      "payment_pending",
      "payment_failed",
      "inactive",
    ];
    states.forEach((state) => expect(HEALTH_STATE_LABELS[state]).toBeTruthy());
  });
});

describe("plural helpers", () => {
  it("pluralizes months, periods, attempts and days", () => {
    expect(pluralPeriods(1)).toBe("1 month");
    expect(pluralPeriods(3)).toBe("3 months");
    expect(pluralPeriods(1, "period")).toBe("1 period");
    expect(pluralPeriods(2, "period")).toBe("2 periods");
    expect(pluralAttempts(1)).toBe("1 attempt");
    expect(pluralAttempts(4)).toBe("4 attempts");
    expect(pluralDaysShort(1)).toBe("1 day");
    expect(pluralDaysShort(61)).toBe("61 days");
  });
});

describe("cardIssueLabel", () => {
  it("describes a missing or expired card and nothing otherwise", () => {
    expect(cardIssueLabel(makeHealth({ card_issue: "missing" }))).toBe("No card on file");
    expect(cardIssueLabel(makeHealth({ card_issue: "expired" }))).toBe("Every saved card has expired");
    expect(cardIssueLabel(makeHealth())).toBeNull();
  });
});

describe("describeHealth", () => {
  it("explains a scheduled retry with its date", () => {
    const copy = describeHealth(makeSubscription(), makeHealth({ state: "retrying", failure: FAILURE }));

    expect(copy.title).toBe("The December 2026 renewal was declined");
    expect(copy.lead).toContain("December 9");
    expect(copy.lead).toContain("a new card triggers a retry right away");
  });

  it("explains a renewal that failed for good with the number of attempts", () => {
    const copy = describeHealth(
      makeSubscription(),
      makeHealth({ state: "payment_failed", failure: { ...FAILURE, attempt_count: 4, next_retry_at: null } })
    );

    expect(copy.title).toBe("Automatic renewal failed, action needed");
    expect(copy.lead).toContain("after 4 attempts");
  });

  it("uses one attempt in the singular", () => {
    const copy = describeHealth(
      makeSubscription(),
      makeHealth({ state: "payment_failed", failure: { ...FAILURE, attempt_count: 1, next_retry_at: null } })
    );

    expect(copy.lead).toContain("after 1 attempt.");
  });

  it("says when a renewal failed because the client has no card", () => {
    const copy = describeHealth(
      makeSubscription(),
      makeHealth({ state: "payment_failed", failure: { ...FAILURE, code: "no_payment_method", next_retry_at: null } })
    );

    expect(copy.title).toBe("Renewal failed, the client has no card on file");
    expect(copy.lead).toContain("Saving a new card retries the payment");
  });

  it("explains a pending payment for manual billing", () => {
    const copy = describeHealth(
      makeSubscription({ auto_renew: false }),
      makeHealth({ state: "payment_pending", overdue_periods: 2, oldest_due_date: "2026-10-01" })
    );

    expect(copy.title).toBe("Payment pending for 2 months");
    expect(copy.lead).toContain("Billing is manual and no charge was made since October 1, 2026");
  });

  it("explains a pending payment for an auto renewing subscription", () => {
    const copy = describeHealth(
      makeSubscription({ auto_renew: true }),
      makeHealth({ state: "payment_pending", overdue_periods: 1, oldest_due_date: "2026-11-01" })
    );

    expect(copy.title).toBe("Payment pending for 1 month");
    expect(copy.lead).toContain("nothing has been collected since November 1, 2026");
  });

  it("warns about a missing or expired card before the renewal", () => {
    const subscription = makeSubscription({ next_billing_date: "2026-12-20" });

    const missing = describeHealth(subscription, makeHealth({ state: "no_payment_method", card_issue: "missing" }));
    expect(missing.title).toBe("The client has no card on file");
    expect(missing.lead).toContain("December 20");

    const expired = describeHealth(subscription, makeHealth({ state: "no_payment_method", card_issue: "expired" }));
    expect(expired.title).toBe("The client's saved cards have expired");
  });

  it("never uses an em dash in any copy", () => {
    const states: SeoSubscriptionHealthState[] = ["retrying", "payment_failed", "payment_pending", "no_payment_method", "healthy"];
    states.forEach((state) => {
      const copy = describeHealth(
        makeSubscription(),
        makeHealth({ state, failure: FAILURE, overdue_periods: 2, oldest_due_date: "2026-10-01" })
      );
      expect(`${copy.title} ${copy.lead}`).not.toContain("—");
    });
  });
});
