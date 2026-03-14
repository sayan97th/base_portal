import type { Metadata } from "next";
import React from "react";
import AdminInvoiceDetailContent from "@/components/admin/AdminInvoiceDetailContent";

export const metadata: Metadata = {
  title: "Invoice Details | BASE Admin Portal",
  description: "View invoice details",
};

interface AdminInvoiceDetailPageProps {
  params: Promise<{ invoice_id: string }>;
}

export default async function AdminInvoiceDetailPage({ params }: AdminInvoiceDetailPageProps) {
  const { invoice_id } = await params;
  return <AdminInvoiceDetailContent invoice_id={invoice_id} />;
}
