import type { Metadata } from "next";
import AdminNewContentIntakeDataContent from "@/components/admin/new-content/orders/AdminNewContentIntakeDataContent";

interface IntakePageParams {
  params: Promise<{ order_id: string }>;
}

export async function generateMetadata({ params }: IntakePageParams): Promise<Metadata> {
  const { order_id } = await params;
  return {
    title: `Intake Data – Order ${order_id.slice(0, 8).toUpperCase()} | New Content | Admin Portal`,
    description: "View keyword intake form data for this new content order.",
  };
}

export default async function AdminNewContentIntakeDataPage({ params }: IntakePageParams) {
  const { order_id } = await params;
  return <AdminNewContentIntakeDataContent order_id={order_id} />;
}
