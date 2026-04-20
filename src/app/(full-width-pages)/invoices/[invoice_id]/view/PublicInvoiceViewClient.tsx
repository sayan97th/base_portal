"use client";

import PublicInvoiceView from "@/components/invoices/PublicInvoiceView";

interface PublicInvoiceViewClientProps {
  invoice_id: string;
  token: string;
}

export default function PublicInvoiceViewClient({
  invoice_id,
  token,
}: PublicInvoiceViewClientProps) {
  return <PublicInvoiceView invoice_id={invoice_id} token={token} />;
}
