import type { Metadata } from "next";
import AdminContentOptimizationContent from "@/components/admin/content-optimization/AdminContentOptimizationContent";

export const metadata: Metadata = {
  title: "Content Optimization | Admin Portal",
  description: "Manage Content Optimization service tiers, pricing, and availability.",
};

export default function AdminContentOptimizationPage() {
  return <AdminContentOptimizationContent />;
}
