import type { Metadata } from "next";
import AdminNewContentContent from "@/components/admin/new-content/AdminNewContentContent";

export const metadata: Metadata = {
  title: "New Content | Admin Portal",
  description: "Manage New Content SME service tiers, pricing, and availability.",
};

export default function AdminNewContentPage() {
  return <AdminNewContentContent />;
}
