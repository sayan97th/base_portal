import type { Metadata } from "next";
import { Suspense } from "react";
import GenericOrderTrackingPage from "@/components/orders/GenericOrderTrackingPage";

interface TrackingPageParams {
  params: Promise<{ order_id: string }>;
}

export async function generateMetadata({
  params,
}: TrackingPageParams): Promise<Metadata> {
  const { order_id } = await params;
  return {
    title: `Order Tracking · ${order_id.slice(0, 8).toUpperCase()} | BASE Search Marketing`,
    description: "Track the real-time progress of your order.",
  };
}

export default async function OrderTrackingRoute({
  params,
}: TrackingPageParams) {
  const { order_id } = await params;
  return (
    <Suspense>
      <GenericOrderTrackingPage order_id={order_id} />
    </Suspense>
  );
}
