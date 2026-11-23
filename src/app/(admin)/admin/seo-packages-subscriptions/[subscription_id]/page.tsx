import type { Metadata } from "next";
import AdminSeoSubscriptionDetail from "@/components/admin/seo-packages-subscriptions/AdminSeoSubscriptionDetail";

interface PageProps {
  params: Promise<{ subscription_id: string }>;
  searchParams: Promise<{ notice?: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { subscription_id } = await params;
  return {
    title: `SEO Subscription #${subscription_id} | Admin`,
  };
}

export default async function AdminSeoSubscriptionDetailPage({ params, searchParams }: PageProps) {
  const { subscription_id } = await params;
  const { notice } = await searchParams;
  return <AdminSeoSubscriptionDetail subscription_id={Number(subscription_id)} notice={notice} />;
}
