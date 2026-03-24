import type { Metadata } from "next";
import ClientOrderReportContent from "@/components/link-building/orders/report/ClientOrderReportContent";

interface OrderReportPageParams {
  params: Promise<{ order_id: string }>;
}

export async function generateMetadata({
  params,
}: OrderReportPageParams): Promise<Metadata> {
  const { order_id } = await params;
  return {
    title: `Order Report · ${order_id.slice(0, 8).toUpperCase()} | BASE Search Marketing`,
    description: "View the full delivery report for your link building order, including live links and placement status.",
  };
}

export default async function OrderReportPage({ params }: OrderReportPageParams) {
  const { order_id } = await params;
  return <ClientOrderReportContent order_id={order_id} />;
}
