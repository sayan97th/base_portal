import type { Metadata } from "next";
import AdminContentRefreshOrderDetailContent from "@/components/admin/content-briefs/orders/AdminContentRefreshOrderDetailContent";

interface OrderDetailParams {
  params: Promise<{ order_id: string }>;
}

export async function generateMetadata({ params }: OrderDetailParams): Promise<Metadata> {
  const { order_id } = await params;
  return {
    title: `Order ${order_id.slice(0, 8).toUpperCase()} | Content Refresh | Admin Portal`,
    description: "View content refresh order details.",
  };
}

export default async function AdminContentRefreshOrderDetailPage({ params }: OrderDetailParams) {
  const { order_id } = await params;
  return <AdminContentRefreshOrderDetailContent order_id={order_id} />;
}
