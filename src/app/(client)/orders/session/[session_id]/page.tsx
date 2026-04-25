import type { Metadata } from "next";
import OrderSessionPage from "@/components/orders/OrderSessionPage";

interface SessionPageParams {
  params: Promise<{ session_id: string }>;
}

export async function generateMetadata({
  params,
}: SessionPageParams): Promise<Metadata> {
  const { session_id } = await params;
  return {
    title: `Order Receipt ${session_id.slice(0, 8).toUpperCase()} | BASE Search Marketing`,
    description: "View the details of your order, including all products purchased.",
  };
}

export default async function OrderSessionDetailPage({
  params,
}: SessionPageParams) {
  const { session_id } = await params;
  return <OrderSessionPage session_id={session_id} />;
}
