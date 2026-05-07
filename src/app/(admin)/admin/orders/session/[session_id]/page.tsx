import type { Metadata } from "next";
import AdminOrderDetailContent from "@/components/admin/orders/AdminOrderDetailContent";

interface SessionDetailParams {
  params: Promise<{ session_id: string }>;
}

export async function generateMetadata({ params }: SessionDetailParams): Promise<Metadata> {
  const { session_id } = await params;
  return {
    title: `Session ${session_id.slice(0, 8).toUpperCase()} | BASE Admin Portal`,
    description: "View the details of a multi-product purchase session.",
  };
}

export default async function AdminOrderSessionDetailPage({ params }: SessionDetailParams) {
  const { session_id } = await params;
  return <AdminOrderDetailContent initial_session_id={session_id} />;
}
