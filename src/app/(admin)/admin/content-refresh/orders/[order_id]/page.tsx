import { redirect } from "next/navigation";

interface OrderDetailParams {
  params: Promise<{ order_id: string }>;
}

export default async function AdminContentRefreshOrderDetailPage({ params }: OrderDetailParams) {
  const { order_id } = await params;
  redirect(`/admin/content-refresh/orders`);
}
