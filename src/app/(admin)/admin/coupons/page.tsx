import type { Metadata } from "next";
import AdminCouponsContent from "@/components/admin/coupons/AdminCouponsContent";

export const metadata: Metadata = {
  title: "Coupons | Admin Portal",
  description: "Manage discount coupons for the platform.",
};

export default function AdminCouponsPage() {
  return <AdminCouponsContent />;
}
