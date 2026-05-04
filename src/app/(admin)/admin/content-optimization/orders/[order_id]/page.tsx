import type { Metadata } from "next";
import AdminContentOptimizationOrderDetailContent from "@/components/admin/content-optimization/orders/AdminContentOptimizationOrderDetailContent";

interface OrderDetailParams {
  params: Promise<{ order_id: string }>;
}

export async function generateMetadata({ params }: OrderDetailParams): Promise<Metadata> {
  const { order_id } = await params;
  return {
    title: `Order ${order_id.slice(0, 8).toUpperCase()} | Content Optimization | Admin Portal`,
    description: "View content optimization order details and intake form data.",
  };
}

export default async function AdminContentOptimizationOrderDetailPage({ params }: OrderDetailParams) {
  const { order_id } = await params;
  return <AdminContentOptimizationOrderDetailContent order_id={order_id} />;
}
