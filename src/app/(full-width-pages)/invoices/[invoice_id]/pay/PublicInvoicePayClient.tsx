"use client";

import PublicInvoicePayView from "@/components/invoices/PublicInvoicePayView";

interface PublicInvoicePayClientProps {
  invoice_id: string;
  token: string;
}

export default function PublicInvoicePayClient({
  invoice_id,
  token,
}: PublicInvoicePayClientProps) {
  return <PublicInvoicePayView invoice_id={invoice_id} token={token} />;
}
