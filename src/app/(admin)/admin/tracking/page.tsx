import type { Metadata } from "next";
import AdminTrackingDashboard from "@/components/admin/orders/AdminTrackingDashboard";

export const metadata: Metadata = {
  title: "Order Tracking | BASE Admin Portal",
  description: "Send updates and track the progress of all active orders.",
};

export default function AdminTrackingPage() {
  return <AdminTrackingDashboard />;
}
