"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  adminSeoSubscriptionService,
  extractApiError,
} from "@/services/admin/seo-packages-subscription.service";
import type { AdminSeoSubscription } from "@/services/admin/seo-packages-subscription.service";
import SubscriptionForm from "./SubscriptionForm";

/**
 * Loads the subscription, then renders the shared form in edit mode. Only
 * active subscriptions can be edited.
 */
export default function SubscriptionEditContent({ subscription_id }: { subscription_id: number }) {
  const [subscription, setSubscription] = useState<AdminSeoSubscription | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let is_current = true;
    adminSeoSubscriptionService
      .fetchSubscriptionDetail(subscription_id)
      .then((detail) => is_current && setSubscription(detail.data))
      .catch((err) => is_current && setError(extractApiError(err, "Failed to load this subscription.")));
    return () => {
      is_current = false;
    };
  }, [subscription_id]);

  if (error || (subscription && subscription.status !== "active")) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-10 text-center dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {error ?? `This subscription is ${subscription?.status} and can no longer be edited.`}
        </p>
        <Link
          href={`/admin/seo-packages-subscriptions/${subscription_id}`}
          className="mt-3 inline-block text-sm font-medium text-brand-500 hover:underline"
        >
          Back to subscription
        </Link>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="space-y-6">
        <div className="h-5 w-40 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-8 w-72 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            {[180, 320, 280].map((height) => (
              <div key={height} className="animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" style={{ height }} />
            ))}
          </div>
          <div className="h-[460px] animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
    );
  }

  return <SubscriptionForm mode="edit" subscription={subscription} />;
}
