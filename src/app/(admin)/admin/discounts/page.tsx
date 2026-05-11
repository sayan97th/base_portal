import type { Metadata } from "next";
import AdminDiscountsContent from "@/components/admin/discounts/AdminDiscountsContent";

export const metadata: Metadata = {
  title: "Discounts | Admin Portal",
  description: "Manage automatic bulk discounts applied at checkout.",
};

export default function AdminDiscountsPage() {
  return <AdminDiscountsContent />;
}
