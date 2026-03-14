import type { Metadata } from "next";
import LinkBuildingOrderDetailPage from "@/components/link-building/orders/LinkBuildingOrderDetailPage";

interface OrderDetailParams {
  params: Promise<{ order_id: string }>;
}

export async function generateMetadata({
  params,
}: OrderDetailParams): Promise<Metadata> {
  const { order_id } = await params;
  return {
    title: `Order ${order_id.slice(0, 8).toUpperCase()} | Link Building | BASE Search Marketing`,
    description: "View the details of your link building order.",
  };
}

export default async function LinkBuildingOrderDetail({
  params,
}: OrderDetailParams) {
  const { order_id } = await params;
  return <LinkBuildingOrderDetailPage order_id={order_id} />;
}
