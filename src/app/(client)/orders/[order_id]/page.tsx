import type { Metadata } from "next";
import { Suspense } from "react";
import OrderDetailPage from "@/components/orders/OrderDetailPage";

interface OrderDetailParams {
  params: Promise<{ order_id: string }>;
}

export async function generateMetadata({
  params,
}: OrderDetailParams): Promise<Metadata> {
  const { order_id } = await params;
  return {
    title: `Order ${order_id.slice(0, 8).toUpperCase()} | BASE Search Marketing`,
    description: "View the details of your order.",
  };
}

export default async function OrderDetailRoute({
  params,
}: OrderDetailParams) {
  const { order_id } = await params;
  return (
    <Suspense>
      <OrderDetailPage order_id={order_id} />
    </Suspense>
  );
}
