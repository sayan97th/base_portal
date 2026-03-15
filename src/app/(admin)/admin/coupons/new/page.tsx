import type { Metadata } from "next";
import CouponFormPage from "@/components/admin/coupons/CouponFormPage";

export const metadata: Metadata = {
  title: "New Coupon | Admin Portal",
  description: "Create a new discount coupon.",
};

export default function NewCouponPage() {
  return <CouponFormPage mode="create" />;
}
