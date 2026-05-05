import type { Metadata } from "next";
import AdminNewContentOrderDetailContent from "@/components/admin/new-content/orders/AdminNewContentOrderDetailContent";

interface OrderDetailParams {
  params: Promise<{ order_id: string }>;
}

export async function generateMetadata({ params }: OrderDetailParams): Promise<Metadata> {
  const { order_id } = await params;
  return {
    title: `Order ${order_id.slice(0, 8).toUpperCase()} | New Content | Admin Portal`,
    description: "View new content order details and keyword intake form data.",
  };
}

export default async function AdminNewContentOrderDetailPage({ params }: OrderDetailParams) {
  const { order_id } = await params;
  return <AdminNewContentOrderDetailContent order_id={order_id} />;
}
