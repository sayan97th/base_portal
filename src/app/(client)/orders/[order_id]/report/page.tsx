import type { Metadata } from "next";
import { Suspense } from "react";
import GenericOrderReportPage from "@/components/orders/GenericOrderReportPage";

interface ReportPageParams {
  params: Promise<{ order_id: string }>;
}

export async function generateMetadata({
  params,
}: ReportPageParams): Promise<Metadata> {
  const { order_id } = await params;
  return {
    title: `Delivery Report · ${order_id.slice(0, 8).toUpperCase()} | BASE Search Marketing`,
    description: "View the full delivery report for your order.",
  };
}

export default async function OrderReportRoute({ params }: ReportPageParams) {
  const { order_id } = await params;
  return (
    <Suspense>
      <GenericOrderReportPage order_id={order_id} />
    </Suspense>
  );
}
