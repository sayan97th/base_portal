import type { ActiveSeoSubscription } from "@/types/client/seo-packages";

export function isSubscriptionExpired(subscription: ActiveSeoSubscription): boolean {
  if (subscription.status === "expired" || subscription.status === "cancelled") return true;
  if (!subscription.ends_at) return false;
  return new Date(subscription.ends_at) <= new Date();
}

export function getDaysUntilExpiry(subscription: ActiveSeoSubscription): number | null {
  if (!subscription.ends_at) return null;
  const diff_ms = new Date(subscription.ends_at).getTime() - Date.now();
  return Math.ceil(diff_ms / (1000 * 60 * 60 * 24));
}
