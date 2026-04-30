import type { Metadata } from "next";
import AdminSeoSubscriptionsContent from "@/components/admin/seo-packages-subscriptions/AdminSeoSubscriptionsContent";

export const metadata: Metadata = {
  title: "SEO Subscriptions | Admin",
};

export default function AdminSeoPackagesSubscriptionsPage() {
  return <AdminSeoSubscriptionsContent />;
}
