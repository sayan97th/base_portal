import type { Metadata } from "next";
import React from "react";
import AdminInvoicesContent from "@/components/admin/AdminInvoicesContent";

export const metadata: Metadata = {
  title: "Invoices | BASE Admin Portal",
  description: "Manage all platform invoices",
};

export default function AdminInvoicesPage() {
  return <AdminInvoicesContent />;
}
