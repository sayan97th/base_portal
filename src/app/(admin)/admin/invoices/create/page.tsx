import type { Metadata } from "next";
import React from "react";
import CreateInvoiceContent from "@/components/admin/invoices/CreateInvoiceContent";

export const metadata: Metadata = {
  title: "Create Invoice | BASE Admin Portal",
  description: "Generate a new invoice for a client",
};

export default function CreateInvoicePage() {
  return <CreateInvoiceContent />;
}
