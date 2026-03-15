import type { Metadata } from "next";
import AdminOrderTrackingContent from "@/components/admin/orders/AdminOrderTrackingContent";

interface TrackingPageParams {
  params: Promise<{ order_id: string }>;
}

export async function generateMetadata({ params }: TrackingPageParams): Promise<Metadata> {
  const { order_id } = await params;
  return {
    title: `Tracking · Order ${order_id.slice(0, 8).toUpperCase()} | BASE Admin Portal`,
    description: "Manage and post updates for this order.",
  };
}

export default async function AdminOrderTrackingPage({ params }: TrackingPageParams) {
  const { order_id } = await params;
  return <AdminOrderTrackingContent order_id={order_id} />;
}
