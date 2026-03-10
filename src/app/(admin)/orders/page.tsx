import type { Metadata } from "next";
import MyOrdersPage from "@/components/orders/MyOrdersPage";

export const metadata: Metadata = {
  title: "My Orders | BASE Search Marketing",
  description: "View all your link building orders and their current status.",
};

export default function OrdersPage() {
  return <MyOrdersPage />;
}
