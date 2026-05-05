import type { Metadata } from "next";
import AdminContentRefreshOrdersContent from "@/components/admin/content-briefs/orders/AdminContentRefreshOrdersContent";

export const metadata: Metadata = {
  title: "Content Refresh Orders | Admin Portal",
  description: "Review and manage content refresh orders.",
};

export default function AdminContentRefreshOrdersPage() {
  return <AdminContentRefreshOrdersContent />;
}
