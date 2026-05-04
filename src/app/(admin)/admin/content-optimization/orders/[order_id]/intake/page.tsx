import type { Metadata } from "next";
import AdminContentOptimizationIntakeDataContent from "@/components/admin/content-optimization/orders/AdminContentOptimizationIntakeDataContent";

interface IntakePageParams {
  params: Promise<{ order_id: string }>;
}

export async function generateMetadata({ params }: IntakePageParams): Promise<Metadata> {
  const { order_id } = await params;
  return {
    title: `Intake Data ${order_id.slice(0, 8).toUpperCase()} | Content Optimization | Admin Portal`,
    description: "View content optimization intake form data submitted by the client.",
  };
}

export default async function AdminContentOptimizationIntakePage({ params }: IntakePageParams) {
  const { order_id } = await params;
  return <AdminContentOptimizationIntakeDataContent order_id={order_id} />;
}
