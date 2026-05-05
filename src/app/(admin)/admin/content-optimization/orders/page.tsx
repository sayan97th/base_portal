import type { Metadata } from "next";
import AdminContentOptimizationOrdersContent from "@/components/admin/content-optimization/orders/AdminContentOptimizationOrdersContent";

export const metadata: Metadata = {
  title: "Content Optimization Orders | Admin Portal",
  description: "Review and manage content optimization orders including intake form data.",
};

export default function AdminContentOptimizationOrdersPage() {
  return <AdminContentOptimizationOrdersContent />;
}
