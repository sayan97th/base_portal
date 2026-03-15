import type { Metadata } from "next";
import CouponFormPage from "@/components/admin/coupons/CouponFormPage";

export const metadata: Metadata = {
  title: "Edit Coupon | Admin Portal",
  description: "Edit an existing discount coupon.",
};

interface EditCouponPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCouponPage({ params }: EditCouponPageProps) {
  const { id } = await params;
  return <CouponFormPage mode="edit" coupon_id={id} />;
}
