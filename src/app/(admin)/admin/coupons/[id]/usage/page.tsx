import type { Metadata } from "next";
import CouponUsageContent from "@/components/admin/coupons/usage/CouponUsageContent";

export const metadata: Metadata = {
  title: "Coupon Usage | Admin Portal",
  description: "See every order a coupon was applied to, the clients who used it and the discount it produced.",
};

interface CouponUsagePageProps {
  params: Promise<{ id: string }>;
}

export default async function CouponUsagePage({ params }: CouponUsagePageProps) {
  const { id } = await params;
  return <CouponUsageContent coupon_id={id} />;
}
