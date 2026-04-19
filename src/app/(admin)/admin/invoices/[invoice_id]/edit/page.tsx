import type { Metadata } from "next";
import React from "react";
import EditInvoiceContent from "@/components/admin/invoices/EditInvoiceContent";

export const metadata: Metadata = {
  title: "Edit Invoice | BASE Admin Portal",
  description: "Edit invoice details",
};

interface EditInvoicePageProps {
  params: Promise<{ invoice_id: string }>;
}

export default async function EditInvoicePage({ params }: EditInvoicePageProps) {
  const { invoice_id } = await params;
  return <EditInvoiceContent invoice_id={invoice_id} />;
}
