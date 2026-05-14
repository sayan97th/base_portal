import type { Metadata } from "next";
import AdminCreditPurchasesContent from "@/components/admin/credits/AdminCreditPurchasesContent";

export const metadata: Metadata = {
  title: "Credit Purchases | BASE Admin Portal",
  description: "View all credit package purchases made by clients",
};

export default function AdminCreditPurchasesPage() {
  return <AdminCreditPurchasesContent />;
}
