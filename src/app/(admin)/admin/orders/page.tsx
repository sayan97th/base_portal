import type { Metadata } from "next";
import React from "react";
import AdminOrdersContent from "@/components/admin/AdminOrdersContent";

export const metadata: Metadata = {
  title: "Orders | BASE Admin Portal",
  description: "Manage all platform orders",
};

export default function AdminOrdersPage() {
  return <AdminOrdersContent />;
}
