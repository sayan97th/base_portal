import type { Metadata } from "next";
import AdminLinkBuildingIntakeDataContent from "@/components/admin/link-building/orders/AdminLinkBuildingIntakeDataContent";

interface IntakePageParams {
  params: Promise<{ order_id: string }>;
}

export async function generateMetadata({ params }: IntakePageParams): Promise<Metadata> {
  const { order_id } = await params;
  return {
    title: `Link Details – Order ${order_id.slice(0, 8).toUpperCase()} | Admin`,
    description: "Fill in the keyword and landing page details for this link building order.",
  };
}

export default async function AdminLinkBuildingIntakePage({ params }: IntakePageParams) {
  const { order_id } = await params;
  return <AdminLinkBuildingIntakeDataContent order_id={order_id} />;
}
