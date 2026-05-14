import type { Metadata } from "next";
import DiscountFormPage from "@/components/admin/discounts/DiscountFormPage";

export const metadata: Metadata = {
  title: "New Discount | Admin Portal",
  description: "Create a new automatic bulk discount rule.",
};

export default function NewDiscountPage() {
  return <DiscountFormPage mode="create" />;
}
