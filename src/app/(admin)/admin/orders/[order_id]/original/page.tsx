import type { Metadata } from "next";
import AdminOriginalOrderContent from "@/components/admin/orders/AdminOriginalOrderContent";

interface OriginalOrderPageParams {
  params: Promise<{ order_id: string }>;
}

export async function generateMetadata({ params }: OriginalOrderPageParams): Promise<Metadata> {
  const { order_id } = await params;
  return {
    title: `Original Order ${order_id.slice(0, 8).toUpperCase()} | BASE Admin Portal`,
    description: "Read only copy of the order as the client submitted it.",
  };
}

export default async function AdminOriginalOrderPage({ params }: OriginalOrderPageParams) {
  const { order_id } = await params;
  return <AdminOriginalOrderContent order_id={order_id} />;
}
