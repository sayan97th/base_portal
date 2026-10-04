import type { Metadata } from "next";
import React from "react";
import AdminAutopayContent from "@/components/admin/autopay/AdminAutopayContent";

export const metadata: Metadata = {
  title: "Autopay | BASE Admin Portal",
  description: "Automatic and card-on-file charge activity and autopay enrollments",
};

export default function AdminAutopayPage() {
  return <AdminAutopayContent />;
}
