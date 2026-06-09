import type { Metadata } from "next";
import AdminOrderTrackingDetail from "@/components/admin/tracking/AdminOrderTrackingDetail";

export const metadata: Metadata = {
  title: "Order Detail | BASE Admin Portal",
  description: "View and post tracking updates for a single order.",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminOrderTrackingDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <AdminOrderTrackingDetail order_id={id} />;
}
