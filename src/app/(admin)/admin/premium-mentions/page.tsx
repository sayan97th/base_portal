import type { Metadata } from "next";
import AdminPremiumMentionsContent from "@/components/admin/premium-mentions/AdminPremiumMentionsContent";

export const metadata: Metadata = {
  title: "Premium Mentions | Admin Portal",
  description: "Manage Premium Mentions plans and pricing.",
};

export default function AdminPremiumMentionsPage() {
  return <AdminPremiumMentionsContent />;
}
