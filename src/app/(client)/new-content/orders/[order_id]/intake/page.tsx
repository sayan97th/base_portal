import type { Metadata } from "next";
import NewContentIntakeDataContent from "@/components/new-content/orders/NewContentIntakeDataContent";

interface IntakePageParams {
  params: Promise<{ order_id: string }>;
}

export async function generateMetadata({ params }: IntakePageParams): Promise<Metadata> {
  const { order_id } = await params;
  return {
    title: `Intake Data – Order ${order_id.slice(0, 8).toUpperCase()} | New Content`,
    description: "View the keyword intake form data submitted for this new content order.",
  };
}

export default async function NewContentIntakeDataPage({ params }: IntakePageParams) {
  const { order_id } = await params;
  return <NewContentIntakeDataContent order_id={order_id} />;
}
