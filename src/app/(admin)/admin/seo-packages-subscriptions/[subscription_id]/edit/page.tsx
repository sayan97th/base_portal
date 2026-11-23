import type { Metadata } from "next";
import SubscriptionEditContent from "@/components/admin/seo-packages-subscriptions/SubscriptionEditContent";

interface PageProps {
  params: Promise<{ subscription_id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { subscription_id } = await params;
  return {
    title: `Edit SEO Subscription #${subscription_id} | Admin`,
  };
}

export default async function AdminSeoSubscriptionEditPage({ params }: PageProps) {
  const { subscription_id } = await params;
  return <SubscriptionEditContent subscription_id={Number(subscription_id)} />;
}
