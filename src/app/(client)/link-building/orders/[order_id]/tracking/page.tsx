import type { Metadata } from "next";
import OrderTrackingPage from "@/components/link-building/orders/OrderTrackingPage";

interface TrackingPageParams {
  params: Promise<{ order_id: string }>;
}

export async function generateMetadata({ params }: TrackingPageParams): Promise<Metadata> {
  const { order_id } = await params;
  return {
    title: `Order Tracking · ${order_id.slice(0, 8).toUpperCase()} | BASE Search Marketing`,
    description: "Track the progress of your link building order in real time.",
  };
}

export default async function LinkBuildingOrderTrackingPage({ params }: TrackingPageParams) {
  const { order_id } = await params;
  return <OrderTrackingPage order_id={order_id} />;
}
