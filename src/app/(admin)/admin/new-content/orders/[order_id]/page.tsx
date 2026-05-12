import { redirect } from "next/navigation";

interface OrderDetailParams {
  params: Promise<{ order_id: string }>;
}

export default async function AdminNewContentOrderDetailPage({ params }: OrderDetailParams) {
  const { order_id } = await params;
  redirect(`/admin/new-content/orders/${order_id}/intake`);
}
