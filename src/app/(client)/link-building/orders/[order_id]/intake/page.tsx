import type { Metadata } from "next";
import LinkBuildingIntakeDataContent from "@/components/link-building/orders/LinkBuildingIntakeDataContent";

interface IntakePageParams {
  params: Promise<{ order_id: string }>;
}

export async function generateMetadata({ params }: IntakePageParams): Promise<Metadata> {
  const { order_id } = await params;
  return {
    title: `Link Details – Order ${order_id.slice(0, 8).toUpperCase()} | Link Building`,
    description: "Add the keyword and landing page details for this link building order.",
  };
}

export default async function LinkBuildingIntakePage({ params }: IntakePageParams) {
  const { order_id } = await params;
  return <LinkBuildingIntakeDataContent order_id={order_id} />;
}
