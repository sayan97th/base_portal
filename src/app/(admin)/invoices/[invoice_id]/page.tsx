import type { Metadata } from "next";
import InvoiceDetailPage from "@/components/invoices/InvoiceDetailPage";
import { getInvoiceDetail } from "@/components/invoices/invoiceData";

interface InvoiceDetailParams {
  params: Promise<{ invoice_id: string }>;
}

export async function generateMetadata({
  params,
}: InvoiceDetailParams): Promise<Metadata> {
  const { invoice_id } = await params;
  const invoice = getInvoiceDetail(invoice_id);

  return {
    title: invoice
      ? `Invoice #${invoice.invoice_number} | BASE Search Marketing`
      : "Invoice Not Found | BASE Search Marketing",
    description: invoice
      ? `Invoice ${invoice.invoice_number} - ${invoice.total}`
      : "Invoice not found.",
  };
}

export default async function InvoiceDetail({ params }: InvoiceDetailParams) {
  const { invoice_id } = await params;
  return <InvoiceDetailPage invoice_id={invoice_id} />;
}
