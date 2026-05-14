import type { Metadata } from "next";
import DiscountFormPage from "@/components/admin/discounts/DiscountFormPage";

export const metadata: Metadata = {
  title: "Edit Discount | Admin Portal",
  description: "Edit an existing automatic bulk discount rule.",
};

interface EditDiscountPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDiscountPage({ params }: EditDiscountPageProps) {
  const { id } = await params;
  return <DiscountFormPage mode="edit" discount_id={id} />;
}
