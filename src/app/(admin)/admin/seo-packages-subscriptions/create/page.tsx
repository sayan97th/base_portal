import type { Metadata } from "next";
import SubscriptionForm from "@/components/admin/seo-packages-subscriptions/SubscriptionForm";

export const metadata: Metadata = {
  title: "Activate SEO Subscription | Admin",
};

export default function AdminSeoSubscriptionCreatePage() {
  return <SubscriptionForm mode="create" />;
}
