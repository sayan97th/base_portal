import type { Metadata } from "next";
import AdminNewContentOrdersContent from "@/components/admin/new-content/orders/AdminNewContentOrdersContent";

export const metadata: Metadata = {
  title: "New Content Orders | Admin Portal",
  description: "Review and manage new content orders including keyword intake data.",
};

export default function AdminNewContentOrdersPage() {
  return <AdminNewContentOrdersContent />;
}
