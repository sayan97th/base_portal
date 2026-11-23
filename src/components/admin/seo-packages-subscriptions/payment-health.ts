import type {
  AdminSeoSubscription,
  AdminSeoSubscriptionPaymentHealth,
  SeoSubscriptionHealthState,
} from "@/services/admin/seo-packages-subscription.service";
import { formatDate } from "./subscription-format";

/** States that need an admin to look at the subscription. */
export const ATTENTION_STATES: SeoSubscriptionHealthState[] = [
  "no_payment_method",
  "retrying",
  "payment_pending",
  "payment_failed",
];

export const HEALTH_STATE_LABELS: Record<SeoSubscriptionHealthState, string> = {
  healthy: "Paid up",
  no_payment_method: "No card on file",
  retrying: "Retry scheduled",
  payment_pending: "Payment pending",
  payment_failed: "Payment failed",
  inactive: "Not billing",
};

export function needsAttention(health: AdminSeoSubscriptionPaymentHealth | null | undefined): boolean {
  return Boolean(health && ATTENTION_STATES.includes(health.state));
}

export function pluralPeriods(count: number, unit: "month" | "period" = "month"): string {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}

export function pluralAttempts(count: number): string {
  return `${count} attempt${count === 1 ? "" : "s"}`;
}

export function pluralDaysShort(count: number): string {
  return `${count} day${count === 1 ? "" : "s"}`;
}

/** "Visa ending in 4242" style label for the card a failure used, or the card issue. */
export function cardIssueLabel(health: AdminSeoSubscriptionPaymentHealth): string | null {
  if (health.card_issue === "missing") return "No card on file";
  if (health.card_issue === "expired") return "Every saved card has expired";
  return null;
}

/**
 * Headline and supporting copy for the payment health card. Written for the
 * admin: what happened, what the system already did, and what is left to do.
 */
export function describeHealth(
  subscription: AdminSeoSubscription,
  health: AdminSeoSubscriptionPaymentHealth
): { title: string; lead: string } {
  const failure = health.failure;
  const next_charge = formatDate(subscription.next_billing_date, { month: "long", day: "numeric" });
  const since = formatDate(health.oldest_due_date, { month: "long", day: "numeric", year: "numeric" });

  switch (health.state) {
    case "retrying":
      return {
        title: `The ${failure?.period_label ?? "latest"} renewal was declined`,
        lead: `We will retry the card automatically on ${formatDate(failure?.next_retry_at, {
          month: "long",
          day: "numeric",
        })}. The client was emailed a link to pay the invoice and update their card, and a new card triggers a retry right away.`,
      };

    case "payment_failed":
      if (failure?.code === "no_payment_method") {
        return {
          title: "Renewal failed, the client has no card on file",
          lead: "Nothing was charged and automatic retries are paused until the client adds a card. Saving a new card retries the payment on the next billing run.",
        };
      }
      return {
        title: "Automatic renewal failed, action needed",
        lead: `Automatic retries stopped after ${pluralAttempts(failure?.attempt_count ?? 1)}. Charge a valid card, ask the client to pay the open invoice, or cancel the subscription.`,
      };

    case "payment_pending":
      return {
        title: `Payment pending for ${pluralPeriods(health.overdue_periods)}`,
        lead: subscription.auto_renew
          ? `The subscription is still active, but nothing has been collected since ${since}.`
          : `Billing is manual and no charge was made since ${since}. Charge the client now, or cancel if the work has stopped.`,
      };

    case "no_payment_method":
      return {
        title: health.card_issue === "expired" ? "The client's saved cards have expired" : "The client has no card on file",
        lead: `The automatic renewal on ${next_charge} will fail unless the client adds a valid card from their billing page.`,
      };

    default:
      return { title: "Payments are up to date", lead: "" };
  }
}
