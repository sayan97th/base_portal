import type { Metadata } from "next";
import AdminOrderReportContent from "@/components/admin/orders/report/AdminOrderReportContent";

interface ReportPageParams {
  params: Promise<{ order_id: string }>;
}

export async function generateMetadata({ params }: ReportPageParams): Promise<Metadata> {
  const { order_id } = await params;
  return {
    title: `Report – Order ${order_id.slice(0, 8).toUpperCase()} | BASE Admin Portal`,
    description: "Build and send the deliverables report for this order.",
  };
}

export default async function AdminOrderReportPage({ params }: ReportPageParams) {
  const { order_id } = await params;
  return <AdminOrderReportContent order_id={order_id} />;
}
