"use client";

import InvoicePaymentView from "@/components/invoices/payment/InvoicePaymentView";

interface PublicInvoicePayClientProps {
  invoice_id: string;
  token: string;
}

export default function PublicInvoicePayClient({
  invoice_id,
  token,
}: PublicInvoicePayClientProps) {
  return <InvoicePaymentView invoice_id={invoice_id} token={token} />;
}
