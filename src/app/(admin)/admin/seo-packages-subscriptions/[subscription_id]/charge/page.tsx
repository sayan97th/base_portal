import type { Metadata } from "next";
import SubscriptionCheckout from "@/components/admin/seo-packages-subscriptions/SubscriptionCheckout";

interface PageProps {
  params: Promise<{ subscription_id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { subscription_id } = await params;
  return {
    title: `Charge SEO Subscription #${subscription_id} | Admin`,
  };
}

export default async function AdminSeoSubscriptionChargePage({ params }: PageProps) {
  const { subscription_id } = await params;
  // Keyed by id: a fresh mount per subscription, so no card or result carries over between clients.
  return <SubscriptionCheckout key={subscription_id} subscription_id={Number(subscription_id)} />;
}
