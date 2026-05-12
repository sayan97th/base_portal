import { redirect } from "next/navigation";

interface OrderDetailParams {
  params: Promise<{ order_id: string }>;
}

export default async function AdminContentOptimizationOrderDetailPage({ params }: OrderDetailParams) {
  const { order_id } = await params;
  redirect(`/admin/content-optimization/orders/${order_id}/intake`);
}
