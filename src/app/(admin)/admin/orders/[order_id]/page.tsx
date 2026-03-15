import type { Metadata } from "next";
import AdminOrderDetailContent from "@/components/admin/orders/AdminOrderDetailContent";

interface OrderDetailParams {
  params: Promise<{ order_id: string }>;
}

export async function generateMetadata({ params }: OrderDetailParams): Promise<Metadata> {
  const { order_id } = await params;
  return {
    title: `Order ${order_id.slice(0, 8).toUpperCase()} | BASE Admin Portal`,
    description: "View the details of a platform order.",
  };
}

export default async function AdminOrderDetailPage({ params }: OrderDetailParams) {
  const { order_id } = await params;
  return <AdminOrderDetailContent order_id={order_id} />;
}
