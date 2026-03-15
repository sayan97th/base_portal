import type { Metadata } from "next";
import CouponFormPage from "@/components/admin/coupons/CouponFormPage";

export const metadata: Metadata = {
  title: "Edit Coupon | Admin Portal",
  description: "Edit an existing discount coupon.",
};

interface EditCouponPageProps {
  params: { id: string };
}

export default function EditCouponPage({ params }: EditCouponPageProps) {
  return <CouponFormPage mode="edit" coupon_id={params.id} />;
}
