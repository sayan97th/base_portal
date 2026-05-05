import type { Metadata } from "next";
import ContentOptimizationIntakeDataContent from "@/components/content-optimizations/orders/ContentOptimizationIntakeDataContent";

interface IntakePageParams {
  params: Promise<{ order_id: string }>;
}

export async function generateMetadata({ params }: IntakePageParams): Promise<Metadata> {
  const { order_id } = await params;
  return {
    title: `My Keywords – Order ${order_id.slice(0, 8).toUpperCase()} | Content Optimization`,
    description: "View the keyword intake data submitted for this content optimization order.",
  };
}

export default async function ContentOptimizationIntakePage({ params }: IntakePageParams) {
  const { order_id } = await params;
  return <ContentOptimizationIntakeDataContent order_id={order_id} />;
}
