import type { Metadata } from "next";
import ContentBriefIntakeDataContent from "@/components/content-briefs/orders/ContentBriefIntakeDataContent";

interface IntakePageParams {
  params: Promise<{ order_id: string }>;
}

export async function generateMetadata({ params }: IntakePageParams): Promise<Metadata> {
  const { order_id } = await params;
  return {
    title: `My Keywords – Order ${order_id.slice(0, 8).toUpperCase()} | Content Brief`,
    description: "View the keyword intake data submitted for this content brief order.",
  };
}

export default async function ContentBriefIntakePage({ params }: IntakePageParams) {
  const { order_id } = await params;
  return <ContentBriefIntakeDataContent order_id={order_id} />;
}
