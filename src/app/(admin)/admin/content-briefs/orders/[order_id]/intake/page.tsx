import type { Metadata } from "next";
import AdminContentBriefIntakeDataContent from "@/components/admin/content-briefs/orders/AdminContentBriefIntakeDataContent";

interface IntakePageParams {
  params: Promise<{ order_id: string }>;
}

export async function generateMetadata({ params }: IntakePageParams): Promise<Metadata> {
  const { order_id } = await params;
  return {
    title: `Intake Data ${order_id.slice(0, 8).toUpperCase()} | Content Briefs | Admin Portal`,
    description: "View content brief intake form data submitted by the client.",
  };
}

export default async function AdminContentBriefIntakePage({ params }: IntakePageParams) {
  const { order_id } = await params;
  return <AdminContentBriefIntakeDataContent order_id={order_id} />;
}
